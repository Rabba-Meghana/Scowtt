"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { signOut } from "next-auth/react";
import { updateMovie, getFact, getCachedFact, setCachedFact, invalidateFactCache, type FactResponse } from "@/lib/api";

interface User { id: string; name: string | null; email: string; image: string | null; favoriteMovie: string | null; }

/* ─── tiny reusable icon components ─── */
function IconStar() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" stroke="var(--gold)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>; }
function IconInfo() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="var(--gold)" strokeWidth="1.8"/><path d="M12 16v-4M12 8h.01" stroke="var(--gold)" strokeWidth="2.2" strokeLinecap="round"/></svg>; }
function IconEdit() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>; }
function IconRefresh() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M23 4v6h-6M1 20v-6h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>; }
function IconLogout() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>; }
function IconSun() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="5" stroke="var(--gold)" strokeWidth="2"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" stroke="var(--gold)" strokeWidth="2" strokeLinecap="round"/></svg>; }
function IconMoon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke="var(--text-3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>; }
function IconUser() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" stroke="var(--gold)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>; }
function IconClock() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="var(--text-3)" strokeWidth="1.8"/><path d="M12 6v6l4 2" stroke="var(--text-3)" strokeWidth="2" strokeLinecap="round"/></svg>; }
function IconFilm() { return <svg width="44" height="44" viewBox="0 0 48 48" fill="none"><circle cx="24" cy="24" r="19" stroke="var(--gold)" strokeWidth="1.2"/><circle cx="24" cy="24" r="5" fill="var(--gold)" opacity="0.15"/><circle cx="24" cy="24" r="2.2" fill="var(--gold)"/><circle cx="24" cy="10" r="3" fill="var(--gold)" opacity="0.7"/><circle cx="24" cy="38" r="3" fill="var(--gold)" opacity="0.7"/><circle cx="10" cy="24" r="3" fill="var(--gold)" opacity="0.7"/><circle cx="38" cy="24" r="3" fill="var(--gold)" opacity="0.7"/><circle cx="13.8" cy="13.8" r="2.3" fill="var(--gold)" opacity="0.38"/><circle cx="34.2" cy="13.8" r="2.3" fill="var(--gold)" opacity="0.38"/><circle cx="13.8" cy="34.2" r="2.3" fill="var(--gold)" opacity="0.38"/><circle cx="34.2" cy="34.2" r="2.3" fill="var(--gold)" opacity="0.38"/></svg>; }

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
  const [dark, setDark]               = useState(true);
  const [mounted, setMounted]         = useState(false);
  const editRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("mm-dark");
    const isDark = saved === null ? true : saved === "true";
    setDark(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  const toggleDark = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("mm-dark", String(next));
  };

  const loadFact = useCallback(async (force = false) => {
    if (!movie) return;
    if (!force) { const c = getCachedFact(movie); if (c) { setFact(c); setFactLoading(false); return; } }
    setFactLoading(true); setFactError(null);
    const r = await getFact();
    if (r.ok) { setCachedFact(movie, r.data); setFact(r.data); setFactHistory(h => [r.data, ...h].slice(0, 5)); }
    else setFactError(r.error.message);
    setFactLoading(false);
  }, [movie]);

  useEffect(() => { loadFact(); }, [loadFact]);
  useEffect(() => { if (isEditing) editRef.current?.focus(); }, [isEditing]);

  function startEdit()  { setEditValue(movie); setMovieError(null); setIsEditing(true); }
  function cancelEdit() { setIsEditing(false); setMovieError(null); }

  async function saveEdit() {
    const t = editValue.trim();
    if (!t) { setMovieError("Movie name cannot be empty."); return; }
    if (t.length > 200) { setMovieError("Max 200 characters."); return; }
    setIsSaving(true); setMovieError(null);
    const prev = movie;
    setMovie(t); setIsEditing(false);
    const r = await updateMovie(t);
    if (!r.ok) { setMovie(prev); setIsEditing(true); setEditValue(t); setMovieError(r.error.message); }
    else { invalidateFactCache(); setFact(null); setFactHistory([]); loadFact(); }
    setIsSaving(false);
  }

  const initials = (user.name ?? user.email).split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
  const firstName = user.name?.split(" ")[0] ?? "there";

  function timeAgo(iso: string) {
    const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (s < 60) return "just now"; if (s < 3600) return `${Math.floor(s/60)}m ago`;
    if (s < 86400) return `${Math.floor(s/3600)}h ago`; return `${Math.floor(s/86400)}d ago`;
  }

  /* ─── theme-aware colors ─── */
  const bg       = dark ? "var(--black)"   : "#F5EFE0";
  const bgCard   = dark ? "rgba(18,13,5,0.72)" : "rgba(255,252,242,0.85)";
  const borderC  = dark ? "var(--border)"  : "rgba(160,110,10,0.2)";
  const textC    = dark ? "var(--text)"    : "#1A1008";
  const text2    = dark ? "var(--text-2)"  : "#8B5E10";
  const text3    = dark ? "var(--text-3)"  : "#A07838";
  const surfBg   = dark ? "rgba(201,148,12,0.05)" : "rgba(201,148,12,0.06)";
  const navBg    = dark ? "rgba(7,5,3,0.92)" : "rgba(245,239,224,0.92)";
  const inputBg  = dark ? "rgba(201,148,12,0.05)" : "rgba(201,148,12,0.04)";

  const glassStyle: React.CSSProperties = {
    background: bgCard,
    backdropFilter: "blur(36px)",
    WebkitBackdropFilter: "blur(36px)",
    border: `1px solid ${borderC}`,
    borderRadius: 24,
    boxShadow: dark
      ? "0 0 0 1px rgba(0,0,0,0.4), 0 8px 40px rgba(0,0,0,0.55), inset 0 1px 0 rgba(201,148,12,0.1)"
      : "0 8px 40px rgba(180,130,10,0.1), 0 1px 0 rgba(255,255,255,0.8) inset",
    position: "relative",
    overflow: "hidden",
  };

  if (!mounted) return null;

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: bg, color: textC, fontFamily: "var(--ff)", position: "relative", overflow: "hidden", transition: "background 0.3s, color 0.3s" }}>

      {/* ── AMBIENT BACKGROUND ── */}
      <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }}>
        <div style={{ position: "absolute", top: "-25%", left: "50%", transform: "translateX(-50%)", width: 1000, height: 800, borderRadius: "50%", background: `radial-gradient(ellipse, ${dark ? "rgba(201,148,12,0.09)" : "rgba(201,148,12,0.07)"} 0%, transparent 60%)` }} />
        <div style={{ position: "absolute", bottom: "-20%", left: "-5%", width: 700, height: 700, borderRadius: "50%", background: `radial-gradient(circle, ${dark ? "rgba(140,80,5,0.08)" : "rgba(140,80,5,0.05)"} 0%, transparent 65%)` }} />
        <div style={{ position: "absolute", top: "30%", right: "-5%", width: 600, height: 600, borderRadius: "50%", background: `radial-gradient(circle, ${dark ? "rgba(201,148,12,0.05)" : "rgba(201,148,12,0.04)"} 0%, transparent 65%)` }} />
        {/* Subtle grid */}
        <div style={{ position: "absolute", inset: 0, backgroundImage: `linear-gradient(${dark ? "rgba(201,148,12,0.04)" : "rgba(201,148,12,0.06)"} 1px, transparent 1px), linear-gradient(90deg, ${dark ? "rgba(201,148,12,0.04)" : "rgba(201,148,12,0.06)"} 1px, transparent 1px)`, backgroundSize: "80px 80px" }} />
        {/* Vignette */}
        <div style={{ position: "absolute", inset: 0, background: dark ? "radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.5) 100%)" : "radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.08) 100%)" }} />
        {/* Twinkling stars */}
        {mounted && [
          {top:"8%",left:"12%",d:0},{top:"15%",left:"88%",d:0.5},{top:"72%",left:"6%",d:1},
          {top:"80%",left:"92%",d:1.5},{top:"45%",left:"3%",d:0.8},{top:"55%",left:"97%",d:0.3},
          {top:"22%",left:"45%",d:1.2},{top:"88%",left:"55%",d:0.6},{top:"35%",left:"95%",d:2},
        ].map((s,i) => (
          <div key={i} style={{ position: "absolute", width: 2, height: 2, borderRadius: "50%", background: "var(--gold)", top: s.top, left: s.left, animation: `twinkle ${2.5 + i * 0.4}s ${s.d}s ease-in-out infinite` }} />
        ))}
      </div>

      {/* ══ NAVBAR ══ */}
      <nav style={{ position: "sticky", top: 0, zIndex: 200, background: navBg, backdropFilter: "blur(28px)", WebkitBackdropFilter: "blur(28px)", borderBottom: `1px solid ${borderC}`, height: 64, display: "flex", alignItems: "center", padding: "0 clamp(1.25rem,4vw,2.5rem)", gap: 14 }}>

        <a href="/dashboard" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", flexShrink: 0 }}>
          <div className="float" style={{ width: 38, height: 38, borderRadius: 12, background: "rgba(201,148,12,0.1)", border: "1px solid rgba(201,148,12,0.28)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="22" height="22" viewBox="0 0 48 48" fill="none">
              <circle cx="24" cy="24" r="18" stroke="var(--gold)" strokeWidth="1.5"/>
              <circle cx="24" cy="24" r="2.5" fill="var(--gold)"/>
              <circle cx="24" cy="11" r="2.8" fill="var(--gold)" opacity="0.7"/>
              <circle cx="24" cy="37" r="2.8" fill="var(--gold)" opacity="0.7"/>
              <circle cx="11" cy="24" r="2.8" fill="var(--gold)" opacity="0.7"/>
              <circle cx="37" cy="24" r="2.8" fill="var(--gold)" opacity="0.7"/>
            </svg>
          </div>
          <span style={{ fontFamily: "var(--fp)", fontSize: 20, fontWeight: 700, letterSpacing: "-0.01em" }} className="gold-text">Movie Memory</span>
        </a>

        <div style={{ flex: 1 }} />

        {/* Theme toggle */}
        <button onClick={toggleDark} title={dark ? "Light mode" : "Dark mode"} style={{ width: 40, height: 40, borderRadius: 12, background: "rgba(201,148,12,0.08)", border: `1px solid ${borderC}`, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s", flexShrink: 0 }}>
          {dark ? <IconSun /> : <IconMoon />}
        </button>

        {/* User pill */}
        <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "5px 14px 5px 6px", borderRadius: 50, background: "rgba(201,148,12,0.08)", border: `1px solid ${borderC}` }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", overflow: "hidden", background: surfBg, border: "1.5px solid rgba(201,148,12,0.4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "var(--gold)", flexShrink: 0 }}>
            {user.image ? <img src={user.image + "?sz=64"} alt="av" referrerPolicy="no-referrer" style={{ width: 32, height: 32, objectFit: "cover", display: "block" }} /> : initials}
          </div>
          <span style={{ fontSize: 13, fontWeight: 500, color: textC, maxWidth: 130, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.name ?? user.email}</span>
        </div>

        <button onClick={() => signOut({ callbackUrl: "/" })} className="btn-gold" style={{ padding: "9px 20px", fontSize: 13 }}>
          <IconLogout />Logout
        </button>
      </nav>

      {/* ══ HERO ══ */}
      <section style={{ position: "relative", zIndex: 1, padding: "clamp(4rem,9vw,7rem) clamp(1.25rem,4vw,2.5rem) clamp(3rem,6vw,5rem)", textAlign: "center", borderBottom: `1px solid ${borderC}` }}>
        {/* Avatar with double ring */}
        <div style={{ position: "relative", display: "inline-block", marginBottom: 36 }} className="float">
          <div style={{ position: "absolute", inset: -18, borderRadius: "50%", border: "1px solid rgba(201,148,12,0.12)", animation: "ring-pulse 3s ease-out infinite" }} />
          <div style={{ position: "absolute", inset: -9, borderRadius: "50%", border: "1px solid rgba(201,148,12,0.22)" }} />
          <div style={{ width: 108, height: 108, borderRadius: "50%", overflow: "hidden", background: surfBg, border: "2.5px solid rgba(201,148,12,0.5)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36, fontWeight: 900, color: "var(--gold)", boxShadow: "0 0 50px rgba(201,148,12,0.25), inset 0 0 20px rgba(201,148,12,0.05)" }}>
            {user.image ? <img src={user.image + "?sz=216"} alt="profile" referrerPolicy="no-referrer" style={{ width: 108, height: 108, objectFit: "cover", display: "block" }} /> : initials}
          </div>
        </div>

        <div className="fade-up">
          <p style={{ fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", color: text3, marginBottom: 18, fontWeight: 600 }}>Your personal cinema</p>
          <h1 style={{ fontFamily: "var(--fp)", fontSize: "clamp(44px,9vw,88px)", fontWeight: 900, lineHeight: 0.92, letterSpacing: "-0.025em", marginBottom: 20 }}>
            <span style={{ display: "block", color: textC, opacity: 0.9 }}>Welcome back,</span>
            <span className="gold-text" style={{ display: "block" }}>{firstName}.</span>
          </h1>
          <p style={{ fontSize: 15, color: text3, fontWeight: 300, letterSpacing: "0.01em" }}>{user.email}</p>
        </div>
      </section>

      {/* ══ CONTENT GRID ══ */}
      <main style={{ flex: 1, maxWidth: 1060, width: "100%", margin: "0 auto", padding: "clamp(2rem,5vw,3rem) clamp(1.25rem,4vw,1.5rem)", display: "grid", gridTemplateColumns: "minmax(0,1fr) 314px", gap: "1.5rem", alignItems: "start", position: "relative", zIndex: 1 }}>

        {/* ── LEFT ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

          {/* MOVIE CARD */}
          <div className="fade-up" style={glassStyle}>
            {/* Top shimmer line */}
            <div style={{ position: "absolute", top: 0, left: "10%", right: "10%", height: 1, background: "linear-gradient(90deg, transparent, rgba(201,148,12,0.5), transparent)" }} />
            <div style={{ padding: "clamp(1.5rem,4vw,2.25rem)" }}>

              {/* Header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 10, background: "rgba(201,148,12,0.1)", border: "1px solid rgba(201,148,12,0.22)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <IconStar />
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: text3, letterSpacing: "0.14em", textTransform: "uppercase" }}>Favourite Movie</span>
                </div>
                {!isEditing && (
                  <button onClick={startEdit} className="btn-ghost" style={{ padding: "7px 16px", fontSize: 12 }}>
                    <IconEdit />Edit
                  </button>
                )}
              </div>

              {/* Movie title or edit form */}
              {isEditing ? (
                <div>
                  <input ref={editRef} type="text" value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") cancelEdit(); }}
                    placeholder="e.g. The Shawshank Redemption" maxLength={200}
                    style={{ width: "100%", padding: "14px 18px", borderRadius: 14, marginBottom: 12, background: inputBg, border: "1.5px solid var(--gold)", color: textC, fontSize: 17, outline: "none", fontFamily: "var(--ff)", fontWeight: 300, boxShadow: "0 0 0 4px rgba(201,148,12,0.08)", transition: "box-shadow 0.2s" }}
                  />
                  {movieError && <p style={{ fontSize: 13, color: "var(--gold-light)", marginBottom: 12, lineHeight: 1.5 }}>{movieError}</p>}
                  <div style={{ display: "flex", gap: 10 }}>
                    <button onClick={saveEdit} disabled={isSaving || !editValue.trim()} className="btn-gold" style={{ opacity: (isSaving || !editValue.trim()) ? 0.45 : 1 }}>
                      {isSaving ? <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ animation: "spin 0.7s linear infinite" }}><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="30 60"/></svg>Saving…</> : "Save changes"}
                    </button>
                    <button onClick={cancelEdit} className="btn-ghost">Cancel</button>
                  </div>
                </div>
              ) : (
                <div>
                  <h2 style={{ fontFamily: "var(--fp)", fontSize: "clamp(30px,5vw,56px)", fontWeight: 900, lineHeight: 1.05, marginBottom: 10, letterSpacing: "-0.015em" }} className="gold-text">
                    {movie || <span style={{ opacity: 0.4, fontSize: "clamp(22px,4vw,36px)" }}>No movie set yet</span>}
                  </h2>
                  {movie && <p style={{ fontSize: 12, color: text3, fontWeight: 400, letterSpacing: "0.02em" }}>Powered by <span style={{ color: "var(--gold)", fontWeight: 600 }}>OpenAI GPT-4o mini</span></p>}
                </div>
              )}

              {/* Divider */}
              <div style={{ height: 1, background: `linear-gradient(90deg, transparent, ${borderC}, transparent)`, margin: "24px 0" }} />

              {/* Fact section */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
                <IconInfo />
                <span style={{ fontSize: 13, fontWeight: 600, color: text2 }}>Recent Fact</span>
                <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, background: "rgba(201,148,12,0.1)", color: "var(--gold)", fontWeight: 600, border: "1px solid rgba(201,148,12,0.22)", letterSpacing: "0.04em" }}>OpenAI</span>
                {fact?.cached && <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, border: `1px solid ${borderC}`, color: text3 }}>cached</span>}
                {fact && <span style={{ fontSize: 12, color: text3, marginLeft: "auto", display: "flex", alignItems: "center", gap: 5 }}><IconClock />{timeAgo(fact.generatedAt)}</span>}
              </div>

              {factLoading ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {[100,90,78,55].map((w,i) => <div key={i} className="skel" style={{ height: 16, width: `${w}%`, animationDelay: `${i*0.12}s` }} />)}
                </div>
              ) : factError ? (
                <div style={{ padding: "16px 20px", borderRadius: 14, background: "rgba(201,148,12,0.05)", border: `1px solid ${borderC}`, color: text3, fontSize: 14, lineHeight: 1.6 }}>
                  {factError}
                </div>
              ) : fact ? (
                <div style={{ padding: "20px 24px", borderRadius: 18, background: surfBg, border: `1px solid ${borderC}`, position: "relative" }}>
                  {/* Gold left accent bar */}
                  <div style={{ position: "absolute", top: 0, left: 0, width: 3, height: "100%", background: "linear-gradient(180deg, var(--gold-bright), var(--gold-dim))", borderRadius: "18px 0 0 18px" }} />
                  <p style={{ fontSize: 15, lineHeight: 1.9, color: textC, fontWeight: 300, paddingLeft: 6 }}>{fact.factText}</p>
                </div>
              ) : null}

              {!factLoading && movie && (
                <button onClick={() => loadFact(true)} className="btn-ghost" style={{ marginTop: 18 }}>
                  <IconRefresh />Generate new fact
                </button>
              )}
            </div>
          </div>

          {/* FACT HISTORY */}
          {factHistory.length > 1 && (
            <div className="fade-up-2" style={glassStyle}>
              <div style={{ position: "absolute", top: 0, left: "10%", right: "10%", height: 1, background: "linear-gradient(90deg, transparent, rgba(201,148,12,0.3), transparent)" }} />
              <div style={{ padding: "1.75rem 2rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                  <div style={{ width: 30, height: 30, borderRadius: 9, background: "rgba(201,148,12,0.1)", border: "1px solid rgba(201,148,12,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <IconClock />
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: text3, letterSpacing: "0.14em", textTransform: "uppercase" }}>Previous facts this session</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {factHistory.slice(1).map((f, i) => (
                    <div key={i} style={{ padding: "14px 18px", borderRadius: 14, background: surfBg, border: `1px solid ${borderC}`, display: "flex", gap: 14 }}>
                      <div style={{ width: 2, borderRadius: 2, background: "var(--gold-dim)", flexShrink: 0, opacity: 0.5 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 14, color: textC, lineHeight: 1.7, fontWeight: 300 }}>{f.factText}</p>
                        <p style={{ fontSize: 11, color: text3, marginTop: 6 }}>{timeAgo(f.generatedAt)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

          {/* PROFILE CARD */}
          <div className="fade-up-2" style={glassStyle}>
            <div style={{ position: "absolute", top: 0, left: "10%", right: "10%", height: 1, background: "linear-gradient(90deg, transparent, rgba(201,148,12,0.4), transparent)" }} />
            <div style={{ padding: "1.75rem", textAlign: "center" }}>
              {/* Avatar */}
              <div style={{ position: "relative", display: "inline-block", marginBottom: 18 }}>
                <div style={{ position: "absolute", inset: -6, borderRadius: "50%", border: "1px solid rgba(201,148,12,0.2)", animation: "ring-pulse 4s ease-out infinite" }} />
                <div style={{ width: 76, height: 76, borderRadius: "50%", overflow: "hidden", background: surfBg, border: "2px solid rgba(201,148,12,0.45)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, fontWeight: 800, color: "var(--gold)", boxShadow: "0 0 28px rgba(201,148,12,0.18)" }}>
                  {user.image ? <img src={user.image + "?sz=152"} alt="pf" referrerPolicy="no-referrer" style={{ width: 76, height: 76, objectFit: "cover", display: "block" }} /> : initials}
                </div>
              </div>
              <p style={{ fontFamily: "var(--fp)", fontSize: 18, fontWeight: 700, color: textC, marginBottom: 4 }}>{user.name ?? "—"}</p>
              <p style={{ fontSize: 12, color: text3, marginBottom: 20 }}>{user.email}</p>
              <div style={{ height: 1, background: `linear-gradient(90deg, transparent, ${borderC}, transparent)`, marginBottom: 20 }} />

              {/* Fields */}
              <div style={{ textAlign: "left" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                  <IconUser />
                  <span style={{ fontSize: 11, fontWeight: 700, color: text3, letterSpacing: "0.14em", textTransform: "uppercase" }}>Profile</span>
                </div>
                {[{ l: "Name", v: user.name ?? "—" }, { l: "Email", v: user.email }, { l: "Favourite film", v: movie || "—" }].map((r, i, a) => (
                  <div key={r.l}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0" }}>
                      <span style={{ fontSize: 12, color: text3 }}>{r.l}</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: textC, maxWidth: 145, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "right" }}>{r.v}</span>
                    </div>
                    {i < a.length - 1 && <div style={{ height: 1, background: `rgba(201,148,12,0.08)` }} />}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* TECH CARD */}
          <div className="fade-up-3" style={glassStyle}>
            <div style={{ position: "absolute", top: 0, left: "10%", right: "10%", height: 1, background: "linear-gradient(90deg, transparent, rgba(201,148,12,0.3), transparent)" }} />
            <div style={{ padding: "1.5rem 1.75rem" }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: text3, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 18 }}>Built with</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  { label: "AI model",  val: "GPT-4o mini",   dot: "#C8920A" },
                  { label: "Auth",      val: "Google OAuth",  dot: "#4285F4" },
                  { label: "Database",  val: "PostgreSQL",    dot: "#336791" },
                  { label: "Framework", val: "Next.js 15",    dot: "#ffffff" },
                  { label: "Cache",     val: fact?.cached ? "Hit — 30s window" : "Live generation", dot: "#22C55E" },
                ].map(s => (
                  <div key={s.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 14px", borderRadius: 12, background: surfBg, border: `1px solid ${borderC}` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 7, height: 7, borderRadius: "50%", background: s.dot, boxShadow: `0 0 6px ${s.dot}60`, flexShrink: 0 }} />
                      <span style={{ fontSize: 12, color: text3 }}>{s.label}</span>
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 600, color: textC }}>{s.val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ══ HOW IT WORKS ══ */}
      <section style={{ position: "relative", zIndex: 1, padding: "clamp(4rem,7vw,6rem) clamp(1.25rem,4vw,2.5rem)", borderTop: `1px solid ${borderC}` }}>
        <div style={{ maxWidth: 1060, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "clamp(2.5rem,5vw,4rem)" }}>
            <p style={{ fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", color: text3, marginBottom: 16, fontWeight: 600 }}>The process</p>
            <h2 style={{ fontFamily: "var(--fp)", fontSize: "clamp(32px,5vw,52px)", fontWeight: 900, letterSpacing: "-0.02em", lineHeight: 1.1 }} className="gold-text">How it works</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "1.5rem" }}>
            {[
              { n: "01", icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><rect x="3" y="11" width="18" height="11" rx="2" stroke="var(--gold)" strokeWidth="1.5"/><path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="var(--gold)" strokeWidth="1.5" strokeLinecap="round"/></svg>, t: "Sign in securely", d: "Google OAuth handles authentication. We only access your name, email, and profile photo — nothing else is stored." },
              { n: "02", icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M7 4v16M17 4v16M3 8h4m10 0h4M3 16h4m10 0h4M4 20h16a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1z" stroke="var(--gold)" strokeWidth="1.5" strokeLinecap="round"/></svg>, t: "Save your film", d: "Enter your all-time favourite movie. Edit it anytime — the fact cache invalidates automatically when you make a change." },
              { n: "03", icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M12 3v1m0 16v1M4.22 4.22l.7.7m12.16 12.16.7.7M3 12h1m16 0h1M4.92 19.08l.7-.7M18.36 5.64l.7-.7M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" stroke="var(--gold)" strokeWidth="1.5" strokeLinecap="round"/></svg>, t: "Discover AI facts", d: "GPT-4o mini generates a fascinating, little-known fact about your film. Results are cached for 30 seconds server-side." },
            ].map((s, i) => (
              <div key={s.n} style={{ ...glassStyle, padding: "2rem 2.25rem" }}>
                <div style={{ position: "absolute", top: 0, left: "10%", right: "10%", height: 1, background: "linear-gradient(90deg, transparent, rgba(201,148,12,0.4), transparent)" }} />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                  <div style={{ width: 52, height: 52, borderRadius: 16, background: "rgba(201,148,12,0.08)", border: "1px solid rgba(201,148,12,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>{s.icon}</div>
                  <span style={{ fontFamily: "var(--fp)", fontSize: 48, fontWeight: 900, color: "rgba(201,148,12,0.1)", lineHeight: 1, letterSpacing: "-0.03em" }}>{s.n}</span>
                </div>
                <h3 style={{ fontFamily: "var(--fp)", fontSize: 20, fontWeight: 700, color: textC, marginBottom: 12, lineHeight: 1.2 }}>{s.t}</h3>
                <p style={{ fontSize: 13, color: text3, lineHeight: 1.8, fontWeight: 300 }}>{s.d}</p>
                <div style={{ height: 1, background: `linear-gradient(90deg, rgba(201,148,12,0.4), transparent)`, marginTop: 20 }} />
                <p style={{ fontSize: 11, color: "var(--gold)", fontWeight: 600, marginTop: 14, letterSpacing: "0.06em" }}>Step {i+1} of 3</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ FOOTER ══ */}
      <footer style={{ position: "relative", zIndex: 1, background: dark ? "rgba(7,5,3,0.96)" : "rgba(245,239,224,0.96)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", borderTop: `1px solid ${borderC}`, padding: "2rem clamp(1.25rem,4vw,2.5rem)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <IconFilm />
          <span style={{ fontFamily: "var(--fp)", fontSize: 16, fontWeight: 700, color: "var(--gold)" }}>Movie Memory</span>
        </div>
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          {["Next.js 15", "Prisma ORM", "PostgreSQL", "OpenAI API", "NextAuth v5"].map(t => (
            <span key={t} style={{ fontSize: 12, color: text3, fontWeight: 400, letterSpacing: "0.03em" }}>{t}</span>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#22C55E", boxShadow: "0 0 10px rgba(34,197,94,0.7)", animation: "glow 2s ease-in-out infinite" }} />
          <span style={{ fontSize: 12, color: text3, fontWeight: 500 }}>All systems operational</span>
        </div>
      </footer>
    </div>
  );
}
