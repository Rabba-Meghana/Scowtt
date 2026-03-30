"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { signOut } from "next-auth/react";
import {
  updateMovie, getFact, getCachedFact, setCachedFact,
  invalidateFactCache, type FactResponse,
} from "@/lib/api";

interface User {
  id: string; name: string | null; email: string;
  image: string | null; favoriteMovie: string | null;
}

export default function DashboardClient({ user }: { user: User }) {
  const [movie, setMovie]           = useState(user.favoriteMovie ?? "");
  const [editValue, setEditValue]   = useState("");
  const [isEditing, setIsEditing]   = useState(false);
  const [isSaving, setIsSaving]     = useState(false);
  const [movieError, setMovieError] = useState<string | null>(null);
  const [fact, setFact]             = useState<FactResponse | null>(null);
  const [factLoading, setFactLoading] = useState(true);
  const [factError, setFactError]   = useState<string | null>(null);
  const [dark, setDark]             = useState(false);
  const [mounted, setMounted]       = useState(false);
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("mm-dark");
    if (saved === "true") { setDark(true); document.documentElement.classList.add("dark"); }
  }, []);

  function toggleDark() {
    setDark(d => {
      const next = !d;
      document.documentElement.classList.toggle("dark", next);
      localStorage.setItem("mm-dark", String(next));
      return next;
    });
  }

  const loadFact = useCallback(async (forceRefresh = false) => {
    if (!movie) return;
    if (!forceRefresh) {
      const cached = getCachedFact(movie);
      if (cached) { setFact(cached); setFactLoading(false); return; }
    }
    setFactLoading(true); setFactError(null);
    const result = await getFact();
    if (result.ok) { setCachedFact(movie, result.data); setFact(result.data); }
    else setFactError(result.error.message);
    setFactLoading(false);
  }, [movie]);

  useEffect(() => { loadFact(); }, [loadFact]);
  useEffect(() => { if (isEditing) editInputRef.current?.focus(); }, [isEditing]);

  function startEdit() { setEditValue(movie); setMovieError(null); setIsEditing(true); }
  function cancelEdit() { setIsEditing(false); setMovieError(null); }

  async function saveEdit() {
    const trimmed = editValue.trim();
    if (!trimmed) { setMovieError("Movie name cannot be empty."); return; }
    if (trimmed.length > 200) { setMovieError("Max 200 characters."); return; }
    setIsSaving(true); setMovieError(null);
    const prev = movie;
    setMovie(trimmed); setIsEditing(false);
    const result = await updateMovie(trimmed);
    if (!result.ok) {
      setMovie(prev); setIsEditing(true);
      setEditValue(trimmed); setMovieError(result.error.message);
    } else { invalidateFactCache(); setFact(null); loadFact(); }
    setIsSaving(false);
  }

  const initials = (user.name ?? user.email).split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
  const firstName = user.name?.split(" ")[0] ?? "there";

  function relativeTime(iso: string) {
    const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (s < 60) return "just now";
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
  }

  const isDark = dark;

  // ── THEME TOKENS ──────────────────────────────────────────────────────────
  const t = isDark ? {
    pageBg:     "#0E0B04",
    pageGrad:   "radial-gradient(ellipse at 20% 10%, rgba(200,146,10,0.12) 0%, transparent 55%), radial-gradient(ellipse at 80% 80%, rgba(180,100,5,0.08) 0%, transparent 50%)",
    heroBg:     "linear-gradient(180deg, rgba(200,146,10,0.08) 0%, transparent 100%)",
    glass:      "rgba(30,22,6,0.75)",
    glassBorder:"rgba(200,146,10,0.18)",
    glassShadow:"0 8px 40px rgba(0,0,0,0.45), inset 0 1px 0 rgba(200,146,10,0.12)",
    surfaceBg:  "rgba(40,30,8,0.6)",
    surfaceBorder:"rgba(200,146,10,0.12)",
    inputBg:    "rgba(30,22,6,0.8)",
    inputBorder:"rgba(200,146,10,0.25)",
    textPrimary:"#F5ECD8",
    textSecond: "#C8920A",
    textMuted:  "#8A7040",
    gold:       "#C8920A",
    goldHover:  "#D4A82A",
    pillBg:     "rgba(200,146,10,0.12)",
    pillBorder: "rgba(200,146,10,0.25)",
    navBg:      "rgba(14,11,4,0.85)",
    navBorder:  "rgba(200,146,10,0.15)",
    footerBg:   "rgba(14,11,4,0.9)",
    statBg:     "rgba(40,30,8,0.8)",
    divider:    "rgba(200,146,10,0.1)",
    badgeBg:    "rgba(200,146,10,0.15)",
    badgeText:  "#C8920A",
  } : {
    pageBg:     "#FFFDF7",
    pageGrad:   "radial-gradient(ellipse at 20% 10%, rgba(200,146,10,0.07) 0%, transparent 55%), radial-gradient(ellipse at 80% 80%, rgba(212,168,42,0.05) 0%, transparent 50%)",
    heroBg:     "linear-gradient(180deg, rgba(200,146,10,0.06) 0%, transparent 100%)",
    glass:      "rgba(255,253,247,0.82)",
    glassBorder:"rgba(200,146,10,0.18)",
    glassShadow:"0 8px 40px rgba(180,130,10,0.08), inset 0 1px 0 rgba(255,255,255,0.9)",
    surfaceBg:  "rgba(253,246,232,0.7)",
    surfaceBorder:"rgba(200,146,10,0.12)",
    inputBg:    "rgba(255,253,247,0.9)",
    inputBorder:"rgba(200,146,10,0.3)",
    textPrimary:"#1A1612",
    textSecond: "#9A6B1A",
    textMuted:  "#A08040",
    gold:       "#C8920A",
    goldHover:  "#B07D2E",
    pillBg:     "rgba(200,146,10,0.08)",
    pillBorder: "rgba(200,146,10,0.2)",
    navBg:      "rgba(255,253,247,0.85)",
    navBorder:  "rgba(200,146,10,0.15)",
    footerBg:   "rgba(255,253,247,0.9)",
    statBg:     "rgba(253,246,232,0.8)",
    divider:    "rgba(200,146,10,0.1)",
    badgeBg:    "rgba(200,146,10,0.1)",
    badgeText:  "#9A6B1A",
  };

  if (!mounted) return null;

  return (
    <div style={{
      minHeight: "100vh", display: "flex", flexDirection: "column",
      background: t.pageBg, backgroundImage: t.pageGrad,
      fontFamily: "var(--font-dm-sans)", transition: "background 0.3s ease",
    }}>

      {/* ── NAVBAR ── */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 100,
        background: t.navBg,
        backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
        borderBottom: `1px solid ${t.navBorder}`,
        height: 62, display: "flex", alignItems: "center",
        padding: "0 2rem", gap: 12,
      }}>
        {/* Logo — navigates to dashboard */}
        <a href="/dashboard" style={{ display: "flex", alignItems: "center", gap: 9, textDecoration: "none", flexShrink: 0 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            background: t.pillBg, border: `1px solid ${t.glassBorder}`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="20" height="20" viewBox="0 0 32 32" fill="none">
              <circle cx="16" cy="16" r="12" stroke={t.gold} strokeWidth="1.5"/>
              <circle cx="16" cy="16" r="3" fill={t.gold} opacity="0.3"/>
              <circle cx="16" cy="16" r="1.5" fill={t.gold}/>
              <circle cx="16" cy="7.5" r="2" fill={t.gold} opacity="0.65"/>
              <circle cx="16" cy="24.5" r="2" fill={t.gold} opacity="0.65"/>
              <circle cx="7.5" cy="16" r="2" fill={t.gold} opacity="0.65"/>
              <circle cx="24.5" cy="16" r="2" fill={t.gold} opacity="0.65"/>
            </svg>
          </div>
          <span style={{ fontFamily: "var(--font-playfair)", fontSize: 18, fontWeight: 700, color: t.gold, letterSpacing: "-0.01em" }}>
            Movie Memory
          </span>
        </a>

        <div style={{ flex: 1 }} />

        {/* Dark toggle */}
        <button onClick={toggleDark} aria-label="Toggle dark mode" style={{
          width: 40, height: 40, borderRadius: 10,
          background: t.pillBg, border: `1px solid ${t.pillBorder}`,
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          transition: "all 0.2s",
        }}>
          {isDark
            ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="5" stroke={t.gold} strokeWidth="1.8"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" stroke={t.gold} strokeWidth="1.8" strokeLinecap="round"/></svg>
            : <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke={t.textMuted} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
          }
        </button>

        {/* User pill */}
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "6px 14px 6px 7px", borderRadius: 10,
          background: t.pillBg, border: `1px solid ${t.pillBorder}`,
        }}>
          <div style={{
            width: 30, height: 30, borderRadius: "50%", overflow: "hidden",
            background: t.surfaceBg, border: `1.5px solid ${t.glassBorder}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 11, fontWeight: 700, color: t.gold, flexShrink: 0,
          }}>
            {user.image
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={user.image} alt="avatar" referrerPolicy="no-referrer" style={{ width: 30, height: 30, objectFit: "cover" }} />
              : initials}
          </div>
          <span style={{ fontSize: 13, fontWeight: 500, color: t.textPrimary, maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {user.name ?? user.email}
          </span>
        </div>

        {/* Logout */}
        <button onClick={() => signOut({ callbackUrl: "/" })} style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "8px 18px", borderRadius: 10,
          background: t.gold, border: "none",
          color: "#fff", fontSize: 13, fontWeight: 600,
          cursor: "pointer", fontFamily: "var(--font-dm-sans)",
          transition: "all 0.15s",
        }}
          onMouseEnter={e => (e.currentTarget.style.background = t.goldHover)}
          onMouseLeave={e => (e.currentTarget.style.background = t.gold)}
        >
          Logout
        </button>
      </nav>

      {/* ── HERO ── */}
      <div style={{
        background: t.heroBg,
        borderBottom: `1px solid ${t.divider}`,
        padding: "3.5rem 2rem 3rem",
        textAlign: "center",
      }}>
        {/* Big avatar */}
        <div style={{
          width: 80, height: 80, borderRadius: "50%", overflow: "hidden",
          background: t.surfaceBg, border: `2px solid ${t.glassBorder}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 26, fontWeight: 800, color: t.gold,
          margin: "0 auto 18px",
          boxShadow: `0 0 0 6px ${t.pillBg}`,
        }}>
          {user.image
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={user.image} alt="avatar" referrerPolicy="no-referrer" style={{ width: 80, height: 80, objectFit: "cover" }} />
            : initials}
        </div>
        <p style={{ fontSize: 12, fontWeight: 600, color: t.gold, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>
          Your personal cinema
        </p>
        <h1 style={{
          fontFamily: "var(--font-playfair)", fontSize: "clamp(28px, 5vw, 44px)",
          fontWeight: 700, color: t.textPrimary, lineHeight: 1.15, marginBottom: 8,
        }}>
          Welcome back, <span style={{ color: t.gold }}>{firstName}!</span>
        </h1>
        <p style={{ fontSize: 14, color: t.textMuted, maxWidth: 380, margin: "0 auto" }}>
          {user.email}
        </p>
      </div>

      {/* ── CONTENT ── */}
      <main style={{ flex: 1, maxWidth: 1040, width: "100%", margin: "0 auto", padding: "2.5rem 1.5rem", display: "grid", gridTemplateColumns: "1fr 320px", gap: "1.5rem", alignItems: "start" }}>

        {/* LEFT */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

          {/* Movie glass card */}
          <div style={{
            background: t.glass, backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
            border: `1px solid ${t.glassBorder}`, borderRadius: 20,
            boxShadow: t.glassShadow, padding: "1.75rem",
            animation: "slideUp 0.45s ease-out forwards",
          }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 20 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: t.gold, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>
                  Favourite Movie
                </p>
                {isEditing ? (
                  <div>
                    <input
                      ref={editInputRef}
                      type="text" value={editValue}
                      onChange={e => setEditValue(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") cancelEdit(); }}
                      placeholder="Enter movie name…"
                      maxLength={200}
                      style={{
                        width: "100%", padding: "10px 14px", borderRadius: 10, marginBottom: 10,
                        background: t.inputBg, border: `1.5px solid ${t.inputBorder}`,
                        color: t.textPrimary, fontSize: 15, outline: "none",
                        fontFamily: "var(--font-dm-sans)",
                      }}
                    />
                    {movieError && <p style={{ fontSize: 12, color: t.gold, marginBottom: 10 }}>{movieError}</p>}
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={saveEdit} disabled={isSaving || !editValue.trim()} style={{
                        padding: "8px 18px", borderRadius: 9, background: t.gold,
                        border: "none", color: "#fff", fontSize: 13, fontWeight: 600,
                        cursor: "pointer", fontFamily: "var(--font-dm-sans)", opacity: (isSaving || !editValue.trim()) ? 0.5 : 1,
                      }}>{isSaving ? "Saving…" : "Save"}</button>
                      <button onClick={cancelEdit} style={{
                        padding: "8px 18px", borderRadius: 9, background: "transparent",
                        border: `1px solid ${t.glassBorder}`, color: t.textMuted,
                        fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "var(--font-dm-sans)",
                      }}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <h2 style={{
                    fontFamily: "var(--font-playfair)", fontSize: "clamp(22px, 3.5vw, 32px)",
                    fontWeight: 700, color: t.textPrimary, lineHeight: 1.2,
                  }}>
                    {movie || "No movie set"}
                  </h2>
                )}
              </div>
              {!isEditing && (
                <button onClick={startEdit} style={{
                  display: "flex", alignItems: "center", gap: 5,
                  padding: "7px 14px", borderRadius: 9,
                  background: t.surfaceBg, border: `1px solid ${t.glassBorder}`,
                  color: t.textMuted, fontSize: 12, fontWeight: 500,
                  cursor: "pointer", flexShrink: 0, fontFamily: "var(--font-dm-sans)",
                  transition: "all 0.15s",
                }}>
                  <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                    <path d="M8.5 1.5L10.5 3.5L4 10H2V8L8.5 1.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Edit
                </button>
              )}
            </div>

            <div style={{ height: 1, background: t.divider, margin: "0 0 20px" }} />

            {/* Fact section */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="7" r="6" stroke={t.gold} strokeWidth="1.2"/>
                <path d="M7 6v4M7 4.5v.5" stroke={t.gold} strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
              <span style={{ fontSize: 13, fontWeight: 600, color: t.textSecond }}>Recent Fact</span>
              <span style={{
                fontSize: 11, padding: "2px 8px", borderRadius: 6,
                background: t.badgeBg, color: t.badgeText,
                border: `1px solid ${t.pillBorder}`,
              }}>OpenAI</span>
              {fact?.cached && <span style={{ fontSize: 11, color: t.textMuted }}>· cached</span>}
              {fact && <span style={{ fontSize: 11, color: t.textMuted, marginLeft: "auto" }}>{relativeTime(fact.generatedAt)}</span>}
            </div>

            {factLoading ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[100, 88, 72].map((w, i) => (
                  <div key={i} style={{
                    height: 14, width: `${w}%`, borderRadius: 6,
                    background: t.surfaceBg, animation: "shimmer 1.6s ease-in-out infinite",
                    animationDelay: `${i * 0.15}s`,
                  }} />
                ))}
              </div>
            ) : factError ? (
              <div style={{ padding: "14px 16px", borderRadius: 12, background: t.surfaceBg, border: `1px solid ${t.glassBorder}`, fontSize: 13, color: t.textMuted }}>
                {factError}
              </div>
            ) : fact ? (
              <p style={{
                fontSize: 15, lineHeight: 1.8, color: t.textPrimary,
                padding: "18px 20px", borderRadius: 14,
                background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}`,
              }}>
                {fact.factText}
              </p>
            ) : null}

            {!factLoading && movie && (
              <button onClick={() => loadFact(true)} style={{
                display: "flex", alignItems: "center", gap: 6,
                marginTop: 14, padding: "8px 16px", borderRadius: 9,
                background: "transparent", border: `1px solid ${t.glassBorder}`,
                color: t.textMuted, fontSize: 13, fontWeight: 500,
                cursor: "pointer", fontFamily: "var(--font-dm-sans)", transition: "all 0.15s",
              }}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M10.5 6A4.5 4.5 0 1 1 6 1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                  <path d="M10.5 1.5V4.5H7.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                New fact
              </button>
            )}
          </div>
        </div>

        {/* RIGHT */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

          {/* Profile glass card */}
          <div style={{
            background: t.glass, backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
            border: `1px solid ${t.glassBorder}`, borderRadius: 20,
            boxShadow: t.glassShadow, padding: "1.5rem",
            animation: "slideUp 0.5s ease-out forwards",
          }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: t.gold, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 16 }}>Profile</p>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {[
                { label: "Name", value: user.name ?? "—" },
                { label: "Email", value: user.email },
                { label: "Favourite movie", value: movie || "—" },
              ].map((row, i, arr) => (
                <div key={row.label}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0" }}>
                    <span style={{ fontSize: 12, color: t.textMuted }}>{row.label}</span>
                    <span style={{ fontSize: 13, fontWeight: 500, color: t.textPrimary, maxWidth: 160, textAlign: "right", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.value}</span>
                  </div>
                  {i < arr.length - 1 && <div style={{ height: 1, background: t.divider }} />}
                </div>
              ))}
            </div>
          </div>

          {/* Stats glass card */}
          <div style={{
            background: t.glass, backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
            border: `1px solid ${t.glassBorder}`, borderRadius: 20,
            boxShadow: t.glassShadow, padding: "1.5rem",
            animation: "slideUp 0.55s ease-out forwards",
          }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: t.gold, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 16 }}>At a glance</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {[
                { label: "AI model",     value: "GPT-4o mini" },
                { label: "Cache",        value: fact?.cached ? "Cached" : "Live" },
                { label: "Auth",         value: "Google" },
                { label: "DB",           value: "Postgres" },
              ].map(s => (
                <div key={s.label} style={{ background: t.statBg, borderRadius: 12, padding: "12px 14px", border: `1px solid ${t.surfaceBorder}` }}>
                  <p style={{ fontSize: 10, color: t.textMuted, marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.07em" }}>{s.label}</p>
                  <p style={{ fontSize: 14, fontWeight: 600, color: t.textPrimary }}>{s.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* ── FOOTER ── */}
      <footer style={{
        marginTop: "auto",
        background: t.footerBg,
        backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
        borderTop: `1px solid ${t.divider}`,
        padding: "1.5rem 2rem",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexWrap: "wrap", gap: 12,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <svg width="16" height="16" viewBox="0 0 32 32" fill="none">
            <circle cx="16" cy="16" r="12" stroke={t.gold} strokeWidth="1.5" opacity="0.6"/>
            <circle cx="16" cy="16" r="1.5" fill={t.gold} opacity="0.6"/>
          </svg>
          <span style={{ fontSize: 12, color: t.textMuted, fontWeight: 500 }}>Movie Memory</span>
        </div>
        <span style={{ fontSize: 12, color: t.textMuted, opacity: 0.6 }}>Powered by OpenAI · Next.js · Prisma · Postgres</span>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#22C55E" }} />
          <span style={{ fontSize: 12, color: t.textMuted }}>All systems operational</span>
        </div>
      </footer>
    </div>
  );
}
