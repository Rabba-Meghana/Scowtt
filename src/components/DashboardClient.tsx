"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { signOut } from "next-auth/react";
import {
  updateMovie as apiUpdateMovie,
  getFact as apiGetFact,
  invalidateFactCache,
} from "@/lib/api";

interface DashboardProps {
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
    favoriteMovie: string | null;
    onboarded: boolean;
  };
}

interface Palette { dark: string; mid: string; accent: string; label?: string; }
const DEFAULT_PALETTE: Palette = { dark: "#06060A", mid: "#12121E", accent: "#C9A84C", label: "Cinema" };

async function fetchPalette(posterUrl: string): Promise<Palette> {
  try {
    console.log(`[client] Fetching palette for: ${posterUrl}`);
    const res = await fetch(`/api/palette?url=${encodeURIComponent(posterUrl)}`);
    if (!res.ok) return DEFAULT_PALETTE;
    const data = await res.json() as Partial<Palette>;
    console.log(`[client] Palette response:`, data);
    if (data.dark && data.mid && data.accent) return data as Palette;
    return DEFAULT_PALETTE;
  } catch (err) { 
    console.error("[client] Palette fetch error:", err);
    return DEFAULT_PALETTE; 
  }
}

interface FactEntry { text: string; movie: string; time: Date; }

function Avatar({ src, name, size = 48, accent }: { src: string | null; name: string | null; size?: number; accent: string }) {
  const [failed, setFailed] = useState(false);
  const initial = (name ?? "?")[0].toUpperCase();
  if (!src || failed) return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: `linear-gradient(135deg,${accent}55,${accent}22)`,
      border: `2px solid ${accent}66`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.38, fontWeight: 700, color: accent, flexShrink: 0,
    }}>
      {initial}
    </div>
  );
  return (
    <img
      src={`/api/avatar?url=${encodeURIComponent(src)}`}
      alt={name ?? "avatar"}
      width={size} height={size}
      onError={() => setFailed(true)}
      referrerPolicy="no-referrer"
      style={{ width: size, height: size, borderRadius: "50%", border: `2px solid ${accent}66`, objectFit: "cover", flexShrink: 0, display: "block" }}
    />
  );
}

export default function DashboardClient({ user }: DashboardProps) {
  const safeMovie = user?.favoriteMovie ?? "";

  const [movie,     setMovie]     = useState(safeMovie);
  const [editMovie, setEditMovie] = useState(safeMovie);
  const [editing,   setEditing]   = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [factHistory, setFactHistory] = useState<FactEntry[]>(
    []
  );
  const [factLoading, setFactLoading] = useState(false);

  const [tab,       setTab]       = useState<"dashboard" | "api" | "poster">("dashboard");
  const [posterUrl, setPosterUrl] = useState<string | null>(null);
  const [palette,   setPalette]   = useState<Palette>(DEFAULT_PALETTE);

  const paletteLockRef = useRef<string>("");
  const A  = palette.accent;
  const AM = A + "22";

  // Fetch poster + derive palette whenever movie changes
  useEffect(() => {
    if (!movie) return;
    let cancelled = false;
    
    setPosterUrl(null);
    
    if (paletteLockRef.current !== movie) {
      paletteLockRef.current = "";
    }
    
    (async () => {
      try {
        console.log(`[client] Fetching poster for: ${movie}`);
        const res = await fetch(`/api/poster?movie=${encodeURIComponent(movie)}`);
        if (!res.ok || cancelled) return;
        const data = await res.json() as { posterUrl?: string };
        if (cancelled || !data.posterUrl) return;
        console.log(`[client] Got poster URL: ${data.posterUrl}`);
        setPosterUrl(data.posterUrl);
        if (paletteLockRef.current !== movie) {
          const p = await fetchPalette(data.posterUrl);
          if (!cancelled && p.accent !== DEFAULT_PALETTE.accent) {
            console.log(`[client] Setting palette to:`, p);
            setPalette(p);
            paletteLockRef.current = movie;
          }
        }
      } catch (err) { 
        console.error("[client] Error:", err);
      }
    })();
    return () => { cancelled = true; };
  }, [movie]);

  // Load current fact + history from DB on mount
  useEffect(() => {
    if (!movie) return;
    let cancelled = false;
    setFactLoading(true);

    // Load history from DB in parallel with current fact
    Promise.all([
      apiGetFact(),
      fetch("/api/facts").then(r => r.ok ? r.json() : { facts: [] }).catch(() => ({ facts: [] })),
    ]).then(([factResult, historyData]) => {
      if (cancelled) return;
      const dbFacts = (historyData.facts ?? []).map((f: { factText: string; generatedAt: string; movie: string }) => ({
        text: f.factText,
        movie: f.movie,
        time: new Date(f.generatedAt),
      }));
      if (factResult.ok && factResult.data) {
        const latest = { text: factResult.data.factText, movie, time: new Date(factResult.data.generatedAt) };
        // Merge latest with DB history, deduplicate
        const seen = new Set<string>();
        const merged = [latest, ...dbFacts].filter(f => {
          if (seen.has(f.text)) return false;
          seen.add(f.text);
          return true;
        }).slice(0, 8);
        setFactHistory(merged);
      } else {
        setFactHistory(dbFacts.slice(0, 8));
      }
      setFactLoading(false);
    });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rel = (d: Date) => {
    const s = Math.floor((Date.now() - d.getTime()) / 1000);
    if (s < 10) return "just now";
    if (s < 60) return `${s}s ago`;
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const saveMovie = useCallback(async () => {
    const trimmed = editMovie.trim();
    if (!trimmed || trimmed === movie) { setEditing(false); return; }
    setSaving(true); setEditError(null);
    const prev = movie;
    setMovie(trimmed); 
    setEditing(false);
    paletteLockRef.current = "";
    invalidateFactCache();
    const result = await apiUpdateMovie(trimmed);
    if (!result.ok) { 
      setMovie(prev); 
      setEditing(true); 
      setEditError(result.error?.message ?? "Failed to save"); 
    } else {
      // Auto-generate a new fact for the new movie + load its history
      setFactLoading(true);
      setFactHistory([]);
      const [factResult, historyData] = await Promise.all([
        apiGetFact(),
        fetch("/api/facts").then(r => r.ok ? r.json() : { facts: [] }).catch(() => ({ facts: [] })),
      ]);
      const dbFacts = (historyData.facts ?? []).map((f: { factText: string; generatedAt: string; movie: string }) => ({
        text: f.factText, movie: f.movie, time: new Date(f.generatedAt),
      }));
      if (factResult.ok && factResult.data) {
        const latest = { text: factResult.data.factText, movie: trimmed, time: new Date(factResult.data.generatedAt) };
        const seen = new Set<string>();
        const merged = [latest, ...dbFacts].filter(f => { if (seen.has(f.text)) return false; seen.add(f.text); return true; }).slice(0, 8);
        setFactHistory(merged);
      } else {
        setFactHistory(dbFacts.slice(0, 8));
      }
      setFactLoading(false);
    }
    setSaving(false);
  }, [editMovie, movie]);

  const generateFact = useCallback(async () => {
    setFactLoading(true);
    const result = await apiGetFact();
    if (result.ok && result.data) {
      setFactHistory(h => [{ text: result.data!.factText, movie, time: new Date() }, ...h]);
    }
    setFactLoading(false);
  }, [movie]);

  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  const currentFact = factHistory[0] ?? null;

  const card = (extra?: React.CSSProperties): React.CSSProperties => ({
    background: `${palette.mid}60`,
    border: `1px solid ${A}20`,
    borderRadius: 16,
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    position: "relative",
    overflow: "hidden",
    ...extra,
  });

  const accentBar: React.CSSProperties = {
    position: "absolute", top: 0, left: 0, right: 0, height: 2,
    background: `linear-gradient(90deg, ${A}, transparent)`,
    transition: "background 1.2s ease",
  };

  const Nav = () => (
    <nav style={{
      position: "sticky", top: 0, zIndex: 50,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0 2rem", height: 60,
      background: `${palette.dark}EE`,
      backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
      borderBottom: `1px solid ${A}18`,
      transition: "background 1.2s ease, border-color 1.2s ease",
    }}>
      <a href="/dashboard" style={{ fontSize: 15, fontWeight: 700, letterSpacing: "0.06em", color: A, textDecoration: "none", display: "flex", alignItems: "center", gap: 8, transition: "color 1.2s ease" }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/>
        </svg>
        Movie Memory
      </a>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {(["dashboard", "api", "poster"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: "5px 14px", borderRadius: 7, fontSize: 13, fontWeight: 500, cursor: "pointer",
            border: tab === t ? `1px solid ${A}55` : "1px solid rgba(255,255,255,0.07)",
            background: tab === t ? AM : "transparent",
            color: tab === t ? A : "#7A7060", transition: "all 0.25s",
          }}>
            {t === "dashboard" ? "Dashboard" : t === "api" ? "API" : "Poster"}
          </button>
        ))}
        <button onClick={() => signOut({ callbackUrl: "/" })} style={{ padding: "5px 14px", borderRadius: 7, fontSize: 13, border: `1px solid ${A}44`, background: AM, color: A, cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s" }}>Logout</button>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, paddingLeft: 14, borderLeft: `1px solid ${A}18` }}>
          <Avatar src={user.image} name={user.name} size={30} accent={A} />
          <span style={{ fontSize: 9, fontWeight: 600, color: "#C8C0B0", maxWidth: 80, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", lineHeight: 1 }}>
            {user.name?.split(" ")[0]}
          </span>
        </div>
      </div>
    </nav>
  );

  if (tab === "poster") return (
    <div style={{
      minHeight: "100vh",
      background: palette.dark,
      fontFamily: "var(--ff, 'DM Sans', system-ui, sans-serif)",
      color: "#E8E0D0",
      display: "flex", flexDirection: "column",
      transition: "background 1.2s ease",
    }}>
      <Nav />
      <div style={{ flex: 1, display: "flex", alignItems: "stretch" }}>
        {posterUrl ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "2.5rem", position: "relative", overflow: "hidden" }}>
            {/* Blurred background */}
            <div style={{
              position: "absolute", inset: 0,
              backgroundImage: `url(${posterUrl})`,
              backgroundSize: "cover", backgroundPosition: "center",
              filter: "blur(40px) brightness(0.25) saturate(1.5)",
              transform: "scale(1.1)",
            }} />
            {/* Full poster — contained, no crop */}
            <div style={{ position: "relative", zIndex: 1, display: "flex", gap: "3rem", alignItems: "flex-start", maxWidth: 900, width: "100%" }}>
              <img
                src={posterUrl}
                alt={movie}
                style={{
                  height: "min(75vh, 600px)",
                  width: "auto",
                  borderRadius: 16,
                  boxShadow: `0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px ${A}22`,
                  flexShrink: 0,
                  display: "block",
                  objectFit: "contain",
                }}
              />
              {/* Info panel beside poster */}
              <div style={{ flex: 1, paddingTop: "1rem" }}>
                <p style={{ fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", color: A, fontWeight: 700, marginBottom: 14, opacity: 0.7 }}>Now Watching</p>
                <h2 style={{ fontFamily: "var(--fp, 'Playfair Display', serif)", fontSize: "clamp(28px,4vw,52px)", fontWeight: 900, color: "#fff", lineHeight: 1.05, letterSpacing: "-0.02em", marginBottom: 20, textTransform: "uppercase" }}>{movie}</h2>
                <div style={{ width: 40, height: 2, background: A, borderRadius: 2, marginBottom: 24, boxShadow: `0 0 12px ${A}88` }} />
                <p style={{ fontSize: 13, color: "#9A9080", lineHeight: 1.7, marginBottom: 28, fontWeight: 300 }}>
                  All UI colors derived from your poster.
                  <br />All UI colors are derived algorithmically from this poster.
                </p>
                <button onClick={() => setTab("dashboard")} style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "10px 22px", borderRadius: 10, cursor: "pointer",
                  background: A, border: "none", color: palette.dark,
                  fontSize: 14, fontWeight: 700, fontFamily: "inherit",
                  boxShadow: `0 4px 20px ${A}44`,
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M19 12H5M12 5l-7 7 7 7"/>
                  </svg>
                  Back to dashboard
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20 }}>
            <p style={{ fontSize: 14, color: "#7A7060" }}>No poster available for this film.</p>
            <button onClick={() => setTab("dashboard")} style={{ padding: "8px 20px", borderRadius: 8, background: A, border: "none", color: palette.dark, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
              Back to dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );

  if (tab === "api") return (
    <div style={{ minHeight: "100vh", backgroundColor: palette.dark, background: `radial-gradient(ellipse at 20% 0%, ${palette.mid}BB 0%, ${palette.dark} 55%)`, fontFamily: "var(--ff, 'DM Sans', system-ui, sans-serif)", color: "#E8E0D0", transition: "all 1.2s ease" }}>
      <style>{`@keyframes pulse{0%,100%{opacity:.3}50%{opacity:.7}}`}</style>
      <Nav />
      <div style={{ padding: "2.5rem", maxWidth: 860 }}>
        <p style={{ fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", color: A, fontWeight: 700, opacity: 0.5, marginBottom: 6 }}>API Reference</p>
        <h2 style={{ fontSize: 28, fontWeight: 800, color: "#FFF", marginBottom: 28 }}>Endpoints</h2>
        {[
          { method: "GET", path: "/api/me", desc: "Returns the authenticated user profile including name, email, image URL and favoriteMovie.", req: "Cookie: session (auto)", res: `{ "id":"cuid...", "name":"Meghana",\n  "favoriteMovie":"The Dark Knight" }` },
          { method: "PUT", path: "/api/me/movie", desc: "Updates the user's favourite movie. Validates: non-empty string, 1-100 chars.", req: `{ "movie": "Dune" }`, res: `{ "favoriteMovie":"Dune" }  // 200\n{ "error":"..." }           // 400/401` },
          { method: "GET", path: "/api/fact", desc: "Returns a movie fact. 60-second server cache per user+movie. Uses isGenerating flag to prevent burst duplicates. Falls back to last cached fact if OpenAI fails.", req: "Cookie: session (auto)", res: `{ "factText":"...", "generatedAt":"2026-...", "cached": false }` },
        ].map(({ method, path, desc, req, res }) => (
          <div key={path} style={card({ padding: "1.5rem", marginBottom: "1.25rem" })}>
            <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 5, marginRight: 12, background: method === "GET" ? "#0D3B27" : "#2D1B00", color: method === "GET" ? "#2ECC71" : "#E67E22", fontFamily: "monospace" }}>{method}</span>
              <span style={{ fontFamily: "monospace", fontSize: 15, color: A }}>{path}</span>
            </div>
            <p style={{ fontSize: 14, color: "#9A9080", lineHeight: 1.65, marginBottom: 14 }}>{desc}</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {[["REQUEST", req], ["RESPONSE", res]].map(([label, code]) => (
                <div key={label}>
                  <p style={{ fontSize: 10, color: A, opacity: 0.45, marginBottom: 5, letterSpacing: "0.12em", textTransform: "uppercase" }}>{label}</p>
                  <pre style={{ background: "#040404", borderRadius: 8, padding: "0.875rem 1rem", fontFamily: "monospace", fontSize: 12, color: "#7A9A6A", margin: 0, whiteSpace: "pre", overflowX: "auto" }}>{code}</pre>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div style={{
      minHeight: "100vh", backgroundColor: palette.dark,
      display: "flex", flexDirection: "column", position: "relative",
      fontFamily: "var(--ff, 'DM Sans', system-ui, sans-serif)", color: "#E8E0D0",
    }}>
      <style>{`
        @keyframes pulse  { 0%,100%{opacity:.3} 50%{opacity:.7} }
        @keyframes spin   { to{transform:rotate(360deg)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      {/* FULL-SCREEN BLURRED POSTER BACKGROUND */}
      {posterUrl && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 0, overflow: "hidden", pointerEvents: "none",
        }}>
          <img
            src={posterUrl}
            alt=""
            style={{
              position: "absolute", inset: 0,
              width: "100%", height: "100%",
              objectFit: "cover", objectPosition: "center top",
              filter: "blur(60px) brightness(0.18) saturate(1.8)",
              transform: "scale(1.08)",
              transition: "opacity 1s ease",
            }}
          />
          {/* Dark overlay so content stays readable */}
          <div style={{
            position: "absolute", inset: 0,
            background: `linear-gradient(135deg, ${palette.dark}CC 0%, ${palette.dark}88 50%, ${palette.dark}BB 100%)`,
          }} />
        </div>
      )}
      {/* Fallback radial gradient when no poster */}
      {!posterUrl && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
          background: `radial-gradient(ellipse at 20% 0%, ${palette.mid}BB 0%, ${palette.dark} 55%)`,
          transition: "background 1.2s ease",
        }} />
      )}

      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", flex: 1 }}>
      <Nav />

      <div style={{ display: "flex", flex: 1, alignItems: "stretch" }}>

        {/* POSTER — fixed left column, full height, centered card */}
        <div style={{
          width: 260, flexShrink: 0,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          padding: "2rem 1rem 2rem 1.75rem",
          gap: 14,
          borderRight: `1px solid ${A}10`,
        }}>
          {posterUrl ? (
            <div
              onClick={() => setTab("poster")}
              title="Click for full view"
              style={{
                width: "100%",
                borderRadius: 18,
                overflow: "hidden",
                boxShadow: `0 32px 80px rgba(0,0,0,0.75), 0 0 0 1px ${A}30`,
                cursor: "pointer",
                transition: "transform 0.2s, box-shadow 0.2s",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLDivElement).style.transform = "scale(1.02)";
                (e.currentTarget as HTMLDivElement).style.boxShadow = `0 40px 100px rgba(0,0,0,0.85), 0 0 0 2px ${A}55`;
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLDivElement).style.transform = "scale(1)";
                (e.currentTarget as HTMLDivElement).style.boxShadow = `0 32px 80px rgba(0,0,0,0.75), 0 0 0 1px ${A}30`;
              }}
            >
              <img
                src={posterUrl}
                alt={movie}
                style={{ width: "100%", height: "auto", display: "block" }}
              />
            </div>
          ) : (
            <div style={{
              width: "100%", aspectRatio: "2/3",
              borderRadius: 18,
              background: `linear-gradient(160deg, ${A}18 0%, ${palette.dark} 100%)`,
              border: `1px solid ${A}22`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <p style={{ fontSize: 11, color: A, opacity: 0.4, textAlign: "center", padding: "0 1rem" }}>
                Set a film to see its poster
              </p>
            </div>
          )}
          <div style={{ width: "100%", paddingLeft: 4 }}>
            <p style={{ fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: A, fontWeight: 700, marginBottom: 5, opacity: 0.65 }}>Now Watching</p>
            <p style={{ fontSize: 14, fontWeight: 700, color: "#FFF", lineHeight: 1.3 }}>{movie || "No film set"}</p>
            {posterUrl && <p style={{ fontSize: 10, color: A, opacity: 0.5, marginTop: 6, cursor: "pointer" }} onClick={() => setTab("poster")}>View full poster →</p>}
          </div>
        </div>

        {/* MAIN */}
        <main style={{ flex: 1, padding: "2.5rem 2rem 3rem", minWidth: 0, overflow: "hidden" }}>
          <div style={{ marginBottom: "2rem" }}>
            <p style={{ fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", color: A, opacity: 0.45, fontWeight: 600, marginBottom: 10 }}>{today}</p>
            <h1 style={{ fontSize: "clamp(1.9rem, 3vw, 3rem)", fontWeight: 800, lineHeight: 1.1, color: "#FFF", margin: 0 }}>
              Welcome back,{" "}
              <span style={{ color: A, fontStyle: "italic", transition: "color 1.2s ease" }}>{user.name ?? "there"}.</span>
            </h1>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 272px", gap: "1.5rem", alignItems: "start" }}>

            {/* LEFT */}
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

              {/* Now Watching */}
              <div style={card({ padding: "1.75rem" })}>
                <div style={accentBar} />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <p style={{ fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: A, fontWeight: 700, margin: 0, opacity: 0.6 }}>Now Watching</p>
                  {!editing && (
                    <button onClick={() => { setEditMovie(movie); setEditing(true); setEditError(null); }}
                      style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 7, border: `1px solid ${A}30`, background: AM, color: A, fontSize: 12, cursor: "pointer" }}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                      Change
                    </button>
                  )}
                </div>
                {editing ? (
                  <>
                    <input value={editMovie} onChange={e => setEditMovie(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") saveMovie(); if (e.key === "Escape") setEditing(false); }}
                      placeholder="Movie title..." autoFocus
                      style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: `1px solid ${A}44`, borderRadius: 9, padding: "10px 14px", color: "#E8E0D0", fontSize: 15, outline: "none", boxSizing: "border-box", marginBottom: 10 }} />
                    {editError && <p style={{ fontSize: 13, color: "#E74C3C", marginBottom: 10 }}>{editError}</p>}
                    <div style={{ display: "flex", gap: 10 }}>
                      <button onClick={saveMovie} disabled={saving} style={{ padding: "7px 20px", borderRadius: 7, border: "none", background: A, color: palette.dark, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>{saving ? "Saving..." : "Save"}</button>
                      <button onClick={() => { setEditing(false); setEditError(null); }} style={{ padding: "7px 20px", borderRadius: 7, border: `1px solid ${A}30`, background: "transparent", color: A, fontSize: 14, cursor: "pointer" }}>Cancel</button>
                    </div>
                  </>
                ) : (
                  <>
                    <p style={{ fontSize: "clamp(1.4rem, 2vw, 1.9rem)", fontWeight: 800, color: A, textTransform: "uppercase", letterSpacing: "0.04em", lineHeight: 1.1, wordBreak: "break-word", transition: "color 1.2s ease", margin: 0 }}>{movie}</p>
                    <p style={{ fontSize: 12, color: A, opacity: 0.38, marginTop: 5, marginBottom: 0 }}>via GPT-4o-mini</p>
                  </>
                )}
              </div>

              {/* Cinema Fact */}
              {!editing && (
                <div style={card({ padding: "1.75rem" })}>
                  <div style={accentBar} />
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <span style={{ fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: A, fontWeight: 700, opacity: 0.6 }}>Cinema Fact</span>
                    {currentFact?.time && <span style={{ fontSize: 11, color: A, opacity: 0.32 }}>{rel(currentFact.time)}</span>}
                  </div>

                  {factLoading ? (
                    <div style={{ padding: "0.25rem 0" }}>
                      {[100, 88, 72, 55].map(w => (
                        <div key={w} style={{ height: 13, borderRadius: 4, background: `${A}18`, marginBottom: 10, animation: "pulse 1.6s ease-in-out infinite", width: `${w}%` }} />
                      ))}
                    </div>
                  ) : currentFact ? (
                    <blockquote style={{ margin: 0, padding: "0 0 0 1rem", borderLeft: `3px solid ${A}`, transition: "border-color 1.2s ease" }}>
                      <p style={{ fontSize: 15, lineHeight: 1.85, color: "#D8D0C0", animation: "fadeUp 0.4s ease", margin: 0 }}>{currentFact.text}</p>
                    </blockquote>
                  ) : (
                    <p style={{ fontSize: 15, color: A, opacity: 0.28, fontStyle: "italic", margin: 0 }}>Generating your first fact...</p>
                  )}

                  <button onClick={generateFact} disabled={factLoading} style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "9px 18px", borderRadius: 9, border: `1px solid ${A}35`, background: AM, color: A, fontSize: 13, fontWeight: 500, cursor: "pointer", marginTop: 18, opacity: factLoading ? 0.45 : 1, transition: "all 0.2s" }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={factLoading ? { animation: "spin 1s linear infinite" } : {}}>
                      <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.51"/>
                    </svg>
                    {factLoading ? "Generating..." : "Generate new fact"}
                  </button>
                </div>
              )}

              {/* Previous facts */}
              {factHistory.length > 1 && !editing && (
                <div style={card({ padding: "1.5rem" })}>
                  <div style={accentBar} />
                  <p style={{ fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", color: A, opacity: 0.45, fontWeight: 700, marginBottom: 14 }}>Previous Facts</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 220, overflowY: "auto" }}>
                    {factHistory.slice(1).map((f, i) => (
                      <div key={i} style={{ padding: "12px 14px", borderRadius: 10, background: `${A}0C`, border: `1px solid ${A}16`, animation: "fadeUp 0.3s ease" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                          <span style={{ fontSize: 10, color: A, opacity: 0.55, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>{f.movie}</span>
                          <span style={{ fontSize: 10, color: A, opacity: 0.28 }}>{rel(f.time)}</span>
                        </div>
                        <p style={{ fontSize: 13, color: "#A0988A", lineHeight: 1.65, margin: 0, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{f.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT */}
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

              {/* Profile */}
              <div style={card({ padding: "1.5rem" })}>
                <div style={accentBar} />
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 6, marginBottom: 18 }}>
                  <Avatar src={user.image} name={user.name} size={68} accent={A} />
                  <p style={{ fontSize: 15, fontWeight: 700, color: "#E8E0D0", margin: "12px 0 3px", textAlign: "center", wordBreak: "break-word", lineHeight: 1.3, maxWidth: "100%" }}>{user.name}</p>
                  <p style={{ fontSize: 11, color: A, opacity: 0.42, textAlign: "center", wordBreak: "break-all", lineHeight: 1.3, margin: 0 }}>{user.email}</p>
                </div>
                <div style={{ borderTop: `1px solid ${A}18`, paddingTop: 14 }}>
                  {[{ label: "Film", value: movie }, { label: "Auth", value: "Google" }].map(({ label, value }) => (
                    <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "8px 0", borderBottom: `1px solid ${A}12`, gap: 8 }}>
                      <span style={{ fontSize: 11, color: A, opacity: 0.48, fontWeight: 600, letterSpacing: "0.06em", flexShrink: 0 }}>{label}</span>
                      <span style={{ fontSize: 12, color: "#C8C0B0", textAlign: "right", wordBreak: "break-word", maxWidth: "65%" }}>{value}</span>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 16 }}>
                  <p style={{ fontSize: 10, color: A, opacity: 0.38, marginBottom: 7, letterSpacing: "0.1em", textTransform: "uppercase" }}>Poster Palette</p>
                  <div style={{ display: "flex", height: 8, borderRadius: 6, overflow: "hidden", border: `1px solid ${A}18` }}>
                    {[palette.dark, palette.mid, A + "55", A].map((c, i) => (
                      <div key={i} style={{ flex: 1, background: c, transition: "background 1.2s ease" }} />
                    ))}
                  </div>
                </div>
              </div>

              {/* Tech stack */}
              <div style={card({ padding: "1.5rem" })}>
                <div style={accentBar} />
                <p style={{ fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", color: A, fontWeight: 700, marginBottom: 14, opacity: 0.6 }}>Tech Stack</p>
                {[
                  { label: "AI",        value: "GPT-4o-mini",  dot: A },
                  { label: "Auth",      value: "Google OAuth", dot: "#3A7BD5" },
                  { label: "Database",  value: "PostgreSQL",   dot: "#2ECC71" },
                  { label: "Framework", value: "Next.js 15",   dot: "#C0B8A8" },
                  { label: "Cache",     value: "No cache",     dot: "#2ECC71" },
                ].map(({ label, value, dot }) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${A}0E` }}>
                    <span style={{ fontSize: 12, color: A, opacity: 0.48, display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: dot, flexShrink: 0 }} />{label}
                    </span>
                    <span style={{ fontSize: 11, color: "#B8B0A0", fontFamily: "monospace" }}>{value}</span>
                  </div>
                ))}
              </div>

              {/* How it works */}
              <div style={card({ padding: "1.5rem" })}>
                <div style={accentBar} />
                <p style={{ fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", color: A, fontWeight: 700, marginBottom: 14, opacity: 0.6 }}>How it works</p>
                {[
                  { n: "01", title: "Sign in",    body: "Google OAuth via NextAuth." },
                  { n: "02", title: "Save film",  body: "Stored in PostgreSQL, tied to your account." },
                  { n: "03", title: "Get a fact", body: "GPT-4o-mini - fresh fact every click." },
                ].map(({ n, title, body }) => (
                  <div key={n} style={{ display: "flex", gap: 12, padding: "10px 0", borderBottom: `1px solid ${A}0E` }}>
                    <span style={{ fontSize: 13, fontWeight: 900, color: A, opacity: 0.22, fontFamily: "monospace", flexShrink: 0, minWidth: 22 }}>{n}</span>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 700, color: "#E8E0D0", margin: "0 0 3px" }}>{title}</p>
                      <p style={{ fontSize: 12, color: A, opacity: 0.42, lineHeight: 1.5, margin: 0 }}>{body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>

      <footer style={{ padding: "1rem 2rem", borderTop: `1px solid ${A}15`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 12, color: A, opacity: 0.26, display: "flex", alignItems: "center", gap: 8 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>
          Movie Memory
        </div>
        <div style={{ fontSize: 12, color: A, opacity: 0.26, display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#2ECC71", boxShadow: "0 0 5px #2ECC71" }} />
          All systems operational
        </div>
      </footer>
      </div>
    </div>
  );
}