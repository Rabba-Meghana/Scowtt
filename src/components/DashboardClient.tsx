"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { signOut } from "next-auth/react";
import { updateMovie, getFact, getCachedFact, setCachedFact, invalidateFactCache, type FactResponse } from "@/lib/api";

interface User { id: string; name: string | null; email: string; image: string | null; favoriteMovie: string | null; }

export default function DashboardClient({ user }: { user: User }) {
  const [movie, setMovie]             = useState(user.favoriteMovie ?? "");
  const [editValue, setEditValue]     = useState("");
  const [isEditing, setIsEditing]     = useState(false);
  const [isSaving, setIsSaving]       = useState(false);
  const [movieError, setMovieError]   = useState<string | null>(null);
  const [fact, setFact]               = useState<FactResponse | null>(null);
  const [factLoading, setFactLoading] = useState(true);
  const [factError, setFactError]     = useState<string | null>(null);
  const [factHistory, setFactHistory] = useState<FactResponse[]>([]);
  const [dark, setDark]               = useState(false);
  const [mounted, setMounted]         = useState(false);
  const editRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
    if (localStorage.getItem("mm-dark") === "true") {
      setDark(true);
      document.documentElement.classList.add("dark");
    }
  }, []);

  const toggleDark = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("mm-dark", String(next));
  };

  const loadFact = useCallback(async (force = false) => {
    if (!movie) return;
    if (!force) {
      const c = getCachedFact(movie);
      if (c) { setFact(c); setFactLoading(false); return; }
    }
    setFactLoading(true); setFactError(null);
    const r = await getFact();
    if (r.ok) { setCachedFact(movie, r.data); setFact(r.data); setFactHistory(h => [r.data, ...h.filter(f => f.generatedAt !== r.data.generatedAt)].slice(0, 5)); }
    else setFactError(r.error.message);
    setFactLoading(false);
  }, [movie]);

  useEffect(() => { loadFact(); }, [loadFact]);
  useEffect(() => { if (isEditing) editRef.current?.focus(); }, [isEditing]);

  function startEdit()  { setEditValue(movie); setMovieError(null); setIsEditing(true); }
  function cancelEdit() { setIsEditing(false); setMovieError(null); }

  async function saveEdit() {
    const t = editValue.trim();
    if (!t)       { setMovieError("Movie name cannot be empty."); return; }
    if (t.length > 200) { setMovieError("Max 200 characters."); return; }
    setIsSaving(true); setMovieError(null);
    const prev = movie;
    setMovie(t); setIsEditing(false);
    const r = await updateMovie(t);
    if (!r.ok) { setMovie(prev); setIsEditing(true); setEditValue(t); setMovieError(r.error.message); }
    else { invalidateFactCache(); setFact(null); loadFact(); }
    setIsSaving(false);
  }

  const initials = (user.name ?? user.email).split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
  const firstName = user.name?.split(" ")[0] ?? "there";

  function timeAgo(iso: string) {
    const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (s < 60) return "just now";
    if (s < 3600) return `${Math.floor(s/60)}m ago`;
    if (s < 86400) return `${Math.floor(s/3600)}h ago`;
    return `${Math.floor(s/86400)}d ago`;
  }

  if (!mounted) return null;

  /* ─── Shared style tokens ─── */
  const G = "var(--gold)";
  const T = "var(--text)";
  const T2 = "var(--text-2)";
  const T3 = "var(--text-3)";
  const BG = "var(--cream)";
  const BG2 = "var(--cream-2)";
  const BG3 = "var(--cream-3)";
  const BD = "var(--border)";
  const BDS = "var(--border-strong)";
  const SH = "var(--shadow)";
  const SHL = "var(--shadow-lg)";
  const FF = "var(--font-dm-sans)";
  const FP = "var(--font-playfair)";

  const glassCard: React.CSSProperties = {
    background: dark ? "rgba(22,16,4,0.75)" : "rgba(255,253,247,0.78)",
    backdropFilter: "blur(32px)",
    WebkitBackdropFilter: "blur(32px)",
    border: `1px solid ${BD}`,
    borderRadius: 24,
    boxShadow: SHL,
  };

  const btn = (primary = false): React.CSSProperties => ({
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7,
    padding: primary ? "10px 22px" : "9px 18px",
    borderRadius: 12, cursor: "pointer", fontFamily: FF,
    fontSize: 13, fontWeight: 600, transition: "all 0.18s",
    background: primary ? G : "transparent",
    border: primary ? "none" : `1px solid ${BDS}`,
    color: primary ? "#fff" : T3,
    boxShadow: primary ? "0 4px 16px rgba(200,146,10,0.3)" : "none",
  });

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: BG, fontFamily: FF, position: "relative", overflow: "hidden" }}>

      {/* ── BG ambient glow ── */}
      <div style={{ position: "fixed", top: -200, right: -200, width: 700, height: 700, borderRadius: "50%", background: "radial-gradient(circle, rgba(200,146,10,0.06) 0%, transparent 65%)", pointerEvents: "none", zIndex: 0 }} />
      <div style={{ position: "fixed", bottom: -200, left: -200, width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle, rgba(200,146,10,0.04) 0%, transparent 65%)", pointerEvents: "none", zIndex: 0 }} />

      {/* ══════════════════════════════════════════════
          NAVBAR
      ══════════════════════════════════════════════ */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 200,
        background: dark ? "rgba(14,10,2,0.88)" : "rgba(255,253,247,0.88)",
        backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
        borderBottom: `1px solid ${BD}`,
        height: 64, display: "flex", alignItems: "center",
        padding: "0 clamp(1rem, 4vw, 2.5rem)", gap: 14,
      }}>
        {/* Logo — real href link */}
        <a href="/dashboard" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", flexShrink: 0 }}>
          <div style={{ width: 38, height: 38, borderRadius: 11, background: BG2, border: `1px solid ${BDS}`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: SH }}>
            <svg width="22" height="22" viewBox="0 0 40 40" fill="none">
              <circle cx="20" cy="20" r="16" stroke={G} strokeWidth="1.6"/>
              <circle cx="20" cy="20" r="3" fill={G} opacity="0.25"/>
              <circle cx="20" cy="20" r="1.8" fill={G}/>
              <circle cx="20" cy="9"  r="2.4" fill={G} opacity="0.65"/>
              <circle cx="20" cy="31" r="2.4" fill={G} opacity="0.65"/>
              <circle cx="9"  cy="20" r="2.4" fill={G} opacity="0.65"/>
              <circle cx="31" cy="20" r="2.4" fill={G} opacity="0.65"/>
            </svg>
          </div>
          <span style={{ fontFamily: FP, fontSize: 20, fontWeight: 700, color: G, letterSpacing: "-0.01em" }}>Movie Memory</span>
        </a>

        <div style={{ flex: 1 }} />

        {/* Theme toggle */}
        <button onClick={toggleDark} title="Toggle dark mode" style={{ width: 40, height: 40, borderRadius: 11, background: BG2, border: `1px solid ${BD}`, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.18s" }}>
          {dark
            ? <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="5" stroke={G} strokeWidth="2"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" stroke={G} strokeWidth="2" strokeLinecap="round"/></svg>
            : <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke={T3} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          }
        </button>

        {/* User pill */}
        <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "6px 14px 6px 6px", borderRadius: 50, background: BG2, border: `1px solid ${BD}`, boxShadow: SH }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", overflow: "hidden", background: BG3, border: `1.5px solid ${BDS}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: G, flexShrink: 0 }}>
            {user.image
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={user.image + "?sz=64"} alt="av" referrerPolicy="no-referrer" style={{ width: 32, height: 32, objectFit: "cover", display: "block" }} onError={(e) => { e.currentTarget.style.display = "none"; }} />
              : initials}
          </div>
          <span style={{ fontSize: 13, fontWeight: 500, color: T, maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.name ?? user.email}</span>
        </div>

        {/* Logout */}
        <button onClick={() => signOut({ callbackUrl: "/" })} style={btn(true)}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Logout
        </button>
      </nav>

      {/* ══════════════════════════════════════════════
          HERO BANNER
      ══════════════════════════════════════════════ */}
      <div style={{
        background: dark
          ? "linear-gradient(160deg, rgba(200,146,10,0.1) 0%, rgba(14,10,2,0) 60%)"
          : "linear-gradient(160deg, rgba(200,146,10,0.08) 0%, rgba(255,253,247,0) 60%)",
        borderBottom: `1px solid ${BD}`,
        padding: "clamp(2rem,5vw,4rem) clamp(1rem,4vw,2.5rem) clamp(1.5rem,4vw,3rem)",
        position: "relative", zIndex: 1,
      }}>
        <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", alignItems: "center", gap: "clamp(1.5rem,4vw,3rem)", flexWrap: "wrap" }}>
          {/* Big avatar with pulse ring */}
          <div style={{ position: "relative", flexShrink: 0 }}>
            <div style={{ position: "absolute", inset: -6, borderRadius: "50%", border: `2px solid ${G}`, opacity: 0.3, animation: "pulse-ring 2.5s ease-out infinite" }} />
            <div style={{ width: 90, height: 90, borderRadius: "50%", overflow: "hidden", background: BG3, border: `3px solid ${BDS}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30, fontWeight: 800, color: G, boxShadow: `0 0 0 5px ${dark ? "rgba(200,146,10,0.1)" : "rgba(200,146,10,0.08)"}` }}>
              {user.image
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={user.image + "?sz=180"} alt="profile" referrerPolicy="no-referrer" style={{ width: 90, height: 90, objectFit: "cover", display: "block" }} onError={(e) => { e.currentTarget.style.display = "none"; }} />
                : initials}
            </div>
          </div>
          {/* Hero text */}
          <div className="fade-up">
            <p style={{ fontSize: 11, fontWeight: 600, color: G, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 8 }}>Your personal cinema</p>
            <h1 style={{ fontFamily: FP, fontSize: "clamp(28px,5vw,48px)", fontWeight: 700, color: T, lineHeight: 1.12, marginBottom: 8 }}>
              Welcome back, <span style={{ color: G, fontStyle: "italic" }}>{firstName}!</span>
            </h1>
            <p style={{ fontSize: 14, color: T3, maxWidth: 460 }}>
              {user.email} · Your movie, your facts, your memory.
            </p>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          MAIN CONTENT
      ══════════════════════════════════════════════ */}
      <main style={{ flex: 1, maxWidth: 960, width: "100%", margin: "0 auto", padding: "clamp(1.5rem,4vw,2.5rem) clamp(1rem,4vw,1.5rem)", display: "grid", gridTemplateColumns: "minmax(0,1fr) 300px", gap: "1.5rem", alignItems: "stretch", position: "relative", zIndex: 1 }}>

        {/* ── LEFT COLUMN ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

          {/* MOVIE CARD */}
          <div className="fade-up" style={{ ...glassCard, padding: "clamp(1.25rem,4vw,2rem)" }}>
            {/* Card header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 32, height: 32, borderRadius: 9, background: dark ? "rgba(200,146,10,0.15)" : "rgba(200,146,10,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" stroke={G} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: G, letterSpacing: "0.1em", textTransform: "uppercase" }}>Favourite Movie</span>
              </div>
              {!isEditing && (
                <button onClick={startEdit} style={{ ...btn(false), padding: "7px 14px", fontSize: 12 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  Edit
                </button>
              )}
            </div>

            {isEditing ? (
              <div>
                <input
                  ref={editRef} type="text" value={editValue}
                  onChange={e => setEditValue(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") cancelEdit(); }}
                  placeholder="e.g. The Shawshank Redemption"
                  maxLength={200}
                  style={{
                    width: "100%", padding: "12px 16px", borderRadius: 12, marginBottom: 12,
                    background: dark ? "rgba(30,22,4,0.8)" : "rgba(255,253,247,0.9)",
                    border: `1.5px solid ${G}`,
                    color: T, fontSize: 16, outline: "none", fontFamily: FF,
                    boxShadow: "0 0 0 4px rgba(200,146,10,0.1)",
                  }}
                />
                {movieError && <p style={{ fontSize: 12, color: G, marginBottom: 10 }}>{movieError}</p>}
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={saveEdit} disabled={isSaving || !editValue.trim()} style={{ ...btn(true), opacity: (isSaving || !editValue.trim()) ? 0.5 : 1 }}>
                    {isSaving ? <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" style={{ animation: "spin 0.8s linear infinite" }}><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="30 60"/></svg> Saving…</> : "Save changes"}
                  </button>
                  <button onClick={cancelEdit} style={btn(false)}>Cancel</button>
                </div>
              </div>
            ) : (
              <h2 style={{ fontFamily: FP, fontSize: "clamp(26px,4vw,40px)", fontWeight: 700, color: T, lineHeight: 1.15, marginBottom: 4 }}>
                {movie || <span style={{ color: T3, fontStyle: "italic" }}>No movie set yet</span>}
              </h2>
            )}

            {!isEditing && movie && (
              <p style={{ fontSize: 13, color: T3, marginTop: 8 }}>
                Fact powered by <span style={{ color: G, fontWeight: 600 }}>OpenAI GPT-4o mini</span>
              </p>
            )}

            {/* Divider */}
            <div style={{ height: 1, background: BD, margin: "20px 0" }} />

            {/* FACT SECTION */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke={G} strokeWidth="1.8"/><path d="M12 16v-4M12 8h.01" stroke={G} strokeWidth="2" strokeLinecap="round"/></svg>
              <span style={{ fontSize: 13, fontWeight: 600, color: T2 }}>Recent Fact</span>
              <span style={{ fontSize: 11, padding: "2px 9px", borderRadius: 20, background: dark ? "rgba(200,146,10,0.15)" : "rgba(200,146,10,0.1)", color: G, fontWeight: 500, border: `1px solid ${BD}` }}>OpenAI</span>
              {fact?.cached && <span style={{ fontSize: 11, color: T3, padding: "2px 8px", borderRadius: 20, border: `1px solid ${BD}` }}>cached</span>}
              {fact && <span style={{ fontSize: 12, color: T3, marginLeft: "auto" }}>{timeAgo(fact.generatedAt)}</span>}
            </div>

            {factLoading ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[100, 90, 76, 55].map((w, i) => (
                  <div key={i} className="skel" style={{ height: 15, width: `${w}%`, animationDelay: `${i * 0.1}s` }} />
                ))}
              </div>
            ) : factError ? (
              <div style={{ padding: "16px 18px", borderRadius: 14, background: dark ? "rgba(200,146,10,0.06)" : "rgba(200,146,10,0.04)", border: `1px solid ${BD}`, fontSize: 13, color: T3 }}>
                ⚠️ {factError}
              </div>
            ) : fact ? (
              <div style={{ padding: "18px 20px", borderRadius: 16, background: dark ? "rgba(200,146,10,0.06)" : "rgba(200,146,10,0.04)", border: `1px solid ${BD}`, position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: 0, left: 0, width: 4, height: "100%", background: G, borderRadius: "4px 0 0 4px" }} />
                <p style={{ fontSize: 15, lineHeight: 1.8, color: T, fontFamily: FF, paddingLeft: 4 }}>{fact.factText}</p>
              </div>
            ) : null}

            {!factLoading && movie && (
              <button onClick={() => loadFact(true)} style={{ ...btn(false), marginTop: 14, fontSize: 13 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M23 4v6h-6M1 20v-6h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Generate new fact
              </button>
            )}
          </div>
        </div>

        {/* ── RIGHT COLUMN ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

          {/* PROFILE CARD */}
          <div className="fade-up-2" style={{ ...glassCard, padding: "1.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: dark ? "rgba(200,146,10,0.15)" : "rgba(200,146,10,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" stroke={G} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: G, letterSpacing: "0.1em", textTransform: "uppercase" }}>Profile</span>
            </div>

            {/* Avatar center */}
            <div style={{ textAlign: "center", marginBottom: 20, paddingBottom: 20, borderBottom: `1px solid ${BD}` }}>
              <div style={{ width: 64, height: 64, borderRadius: "50%", overflow: "hidden", background: BG3, border: `2px solid ${BDS}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 800, color: G, margin: "0 auto 12px", boxShadow: `0 4px 16px rgba(200,146,10,0.2)` }}>
                {user.image
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={user.image + "?sz=128"} alt="profile" referrerPolicy="no-referrer" crossOrigin="anonymous" style={{ width: 64, height: 64, objectFit: "cover", display: "block" }} onError={(e) => { e.currentTarget.style.display = "none"; }} />
                  : initials}
              </div>
              <p style={{ fontFamily: FP, fontSize: 17, fontWeight: 700, color: T, marginBottom: 3 }}>{user.name ?? "—"}</p>
              <p style={{ fontSize: 12, color: T3 }}>{user.email}</p>
            </div>

            {[
              { label: "Name",  value: user.name ?? "—" },
              { label: "Email", value: user.email },
              { label: "Movie", value: movie || "—" },
            ].map((r, i, a) => (
              <div key={r.label}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 0" }}>
                  <span style={{ fontSize: 12, color: T3, fontWeight: 500 }}>{r.label}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: T, maxWidth: 150, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "right" }}>{r.value}</span>
                </div>
                {i < a.length - 1 && <div style={{ height: 1, background: BD }} />}
              </div>
            ))}
          </div>

          {/* STATS CARD */}
          <div className="fade-up-3" style={{ ...glassCard, padding: "1.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: dark ? "rgba(200,146,10,0.15)" : "rgba(200,146,10,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="2" y="3" width="20" height="14" rx="2" stroke={G} strokeWidth="2"/><path d="M8 21h8M12 17v4" stroke={G} strokeWidth="2" strokeLinecap="round"/></svg>
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: G, letterSpacing: "0.1em", textTransform: "uppercase" }}>Tech stack</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {[
                { label: "AI", value: "GPT-4o mini", icon: "🤖" },
                { label: "Auth", value: "Google OAuth", icon: "🔐" },
                { label: "Database", value: "PostgreSQL", icon: "🗄️" },
                { label: "Cache", value: fact?.cached ? "Hit ✓" : "Live ↻", icon: "⚡" },
              ].map(s => (
                <div key={s.label} style={{ background: dark ? "rgba(200,146,10,0.06)" : "rgba(200,146,10,0.04)", border: `1px solid ${BD}`, borderRadius: 14, padding: "12px 14px" }}>
                  <p style={{ fontSize: 18, marginBottom: 5 }}>{s.icon}</p>
                  <p style={{ fontSize: 10, color: T3, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>{s.label}</p>
                  <p style={{ fontSize: 12, fontWeight: 600, color: T }}>{s.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* ══════════════════════════════════════════════
          FULL-WIDTH BOTTOM SECTIONS
      ══════════════════════════════════════════════ */}
      <div style={{ maxWidth: 960, width: "100%", margin: "0 auto", padding: "0 clamp(1rem,4vw,1.5rem) clamp(2rem,4vw,3rem)", display: "flex", flexDirection: "column", gap: "1.5rem", position: "relative", zIndex: 1 }}>

        {/* HOW IT WORKS */}
        <div style={{ ...glassCard, padding: "clamp(1.25rem,3vw,2rem)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: dark ? "rgba(200,146,10,0.15)" : "rgba(200,146,10,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke={G} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: G, letterSpacing: "0.1em", textTransform: "uppercase" }}>How it works</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1.5rem" }}>
            {[
              { step: "01", title: "Sign in with Google", desc: "Your identity is securely authenticated via Google OAuth. We only store your name, email, and photo.", icon: "🔐" },
              { step: "02", title: "Save your movie", desc: "Tell us your all-time favourite film. You can edit it anytime — your fact cache updates automatically.", icon: "🎬" },
              { step: "03", title: "Get AI facts", desc: "OpenAI GPT-4o mini generates fascinating facts about your movie. Results are cached for 30 seconds.", icon: "✨" },
            ].map(s => (
              <div key={s.step} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 26 }}>{s.icon}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: G, opacity: 0.6, letterSpacing: "0.1em" }}>{s.step}</span>
                </div>
                <h3 style={{ fontFamily: FP, fontSize: 17, fontWeight: 700, color: T, lineHeight: 1.2 }}>{s.title}</h3>
                <p style={{ fontSize: 13, color: T3, lineHeight: 1.7 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* FACT HISTORY — only show when we have history */}
        {factHistory.length > 1 && (
          <div style={{ ...glassCard, padding: "clamp(1.25rem,3vw,2rem)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: dark ? "rgba(200,146,10,0.15)" : "rgba(200,146,10,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke={G} strokeWidth="2"/><path d="M12 6v6l4 2" stroke={G} strokeWidth="2" strokeLinecap="round"/></svg>
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: G, letterSpacing: "0.1em", textTransform: "uppercase" }}>Fact history this session</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {factHistory.slice(1).map((f, i) => (
                <div key={i} style={{ display: "flex", gap: 14, padding: "14px 16px", borderRadius: 12, background: dark ? "rgba(200,146,10,0.04)" : "rgba(200,146,10,0.03)", border: `1px solid ${BD}` }}>
                  <div style={{ width: 3, borderRadius: 3, background: G, opacity: 0.4, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 14, color: T, lineHeight: 1.7 }}>{f.factText}</p>
                    <p style={{ fontSize: 11, color: T3, marginTop: 6 }}>{timeAgo(f.generatedAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════
          FOOTER
      ══════════════════════════════════════════════ */}
      <footer style={{
        position: "relative", zIndex: 1,
        background: dark ? "rgba(14,10,2,0.9)" : "rgba(255,253,247,0.9)",
        backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
        borderTop: `1px solid ${BD}`,
        padding: "1.5rem clamp(1rem,4vw,2.5rem)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexWrap: "wrap", gap: 12,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <svg width="18" height="18" viewBox="0 0 40 40" fill="none">
            <circle cx="20" cy="20" r="15" stroke={G} strokeWidth="1.5" opacity="0.7"/>
            <circle cx="20" cy="20" r="2" fill={G} opacity="0.7"/>
          </svg>
          <span style={{ fontSize: 13, color: T2, fontWeight: 600, fontFamily: FP }}>Movie Memory</span>
        </div>
        <span style={{ fontSize: 12, color: T3 }}>Next.js · Prisma · Postgres · OpenAI · NextAuth</span>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#22C55E", boxShadow: "0 0 6px rgba(34,197,94,0.5)" }} />
          <span style={{ fontSize: 12, color: T3, fontWeight: 500 }}>All systems operational</span>
        </div>
      </footer>
    </div>
  );
}
