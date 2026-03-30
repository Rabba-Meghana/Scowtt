"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { signOut } from "next-auth/react";
import { updateMovie, getFact, getCachedFact, setCachedFact, invalidateFactCache, type FactResponse } from "@/lib/api";
import { getMovieTheme, POSTER_FILMS, POSTER_COLORS, type MovieTheme } from "@/lib/movieThemes";

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
  const [theme, setTheme]             = useState<MovieTheme>(getMovieTheme(""));
  const [activeTab, setActiveTab]     = useState<"dashboard"|"api">("dashboard");
  const [mounted, setMounted]         = useState(false);
  const editRef = useRef<HTMLInputElement>(null);

  // Apply theme to CSS variables
  const applyTheme = useCallback((t: MovieTheme) => {
    const r = document.documentElement.style;
    r.setProperty("--theme-bg-1",   t.bg1);
    r.setProperty("--theme-bg-2",   t.bg2);
    r.setProperty("--theme-accent", t.accent);
    r.setProperty("--theme-glow",   t.glow);
    r.setProperty("--theme-text",   t.text);
    r.setProperty("--theme-muted",  t.muted);
    r.setProperty("--theme-border", t.border);
    r.setProperty("--theme-card",   t.card);
    document.body.style.background = t.bg1;
    document.body.style.color = t.text;
  }, []);

  useEffect(() => {
    setMounted(true);
    const t = getMovieTheme(user.favoriteMovie ?? "");
    setTheme(t);
    applyTheme(t);
  }, [user.favoriteMovie, applyTheme]);

  // Update theme when movie changes
  useEffect(() => {
    const t = getMovieTheme(movie);
    setTheme(t);
    applyTheme(t);
  }, [movie, applyTheme]);

  const loadFact = useCallback(async (force = false) => {
    if (!movie) return;
    if (!force) { const c = getCachedFact(movie); if (c) { setFact(c); setFactLoading(false); return; } }
    setFactLoading(true); setFactError(null);
    const r = await getFact();
    if (r.ok) { setCachedFact(movie, r.data); setFact(r.data); setFactHistory(h => [r.data, ...h].slice(0, 8)); }
    else setFactError(r.error.message);
    setFactLoading(false);
  }, [movie]);

  useEffect(() => { loadFact(); }, [loadFact]);
  useEffect(() => { if (isEditing) editRef.current?.focus(); }, [isEditing]);

  function startEdit()  { setEditValue(movie); setMovieError(null); setIsEditing(true); }
  function cancelEdit() { setIsEditing(false); setMovieError(null); }

  async function saveEdit() {
    const t = editValue.trim();
    if (!t) { setMovieError("Cannot be empty."); return; }
    if (t.length > 200) { setMovieError("Max 200 characters."); return; }
    setIsSaving(true); setMovieError(null);
    const prev = movie;
    setMovie(t); setIsEditing(false);
    const r = await updateMovie(t);
    if (!r.ok) { setMovie(prev); setIsEditing(true); setEditValue(t); setMovieError(r.error.message); }
    else { invalidateFactCache(); setFact(null); setFactHistory([]); loadFact(); }
    setIsSaving(false);
  }

  const firstName = user.name?.split(" ")[0] ?? "there";

  function timeAgo(iso: string) {
    const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (s < 60) return "just now"; if (s < 3600) return `${Math.floor(s/60)}m ago`;
    if (s < 86400) return `${Math.floor(s/3600)}h ago`; return `${Math.floor(s/86400)}d ago`;
  }

  // Poster tile component
  const PosterTile = ({ film, idx }: { film: string; idx: number }) => {
    const colors = POSTER_COLORS[idx % POSTER_COLORS.length];
    return (
      <div style={{
        width: 130, height: 195, borderRadius: 12, flexShrink: 0,
        background: `linear-gradient(160deg, ${colors[0]} 0%, ${colors[1]} 100%)`,
        border: "1px solid rgba(255,255,255,0.06)",
        display: "flex", flexDirection: "column", justifyContent: "flex-end",
        padding: "12px 10px", position: "relative", overflow: "hidden",
      }}>
        {/* Film grain overlay */}
        <div style={{ position: "absolute", inset: 0, backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.08'/%3E%3C/svg%3E\")", opacity: 0.4 }} />
        {/* Gradient overlay */}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 60%)" }} />
        {/* Title */}
        <p style={{ position: "relative", fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.7)", lineHeight: 1.3, fontFamily: "var(--fp)" }}>{film}</p>
      </div>
    );
  };

  if (!mounted) return null;

  const acc = theme.accent;
  const glow = theme.glow;

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: theme.bg1, color: theme.text, fontFamily: "var(--ff)", position: "relative", overflow: "hidden", transition: "background 1.2s ease, color 0.6s ease" }}>

      {/* ══ SCROLLING FILM BACKGROUND ══ */}
      <div style={{ position: "fixed", inset: 0, zIndex: 0, overflow: "hidden", pointerEvents: "none" }}>
        {/* Row 1 */}
        <div style={{ position: "absolute", top: "5%", left: 0, display: "flex", gap: 16, opacity: 0.18 }} className="film-strip">
          {[...POSTER_FILMS, ...POSTER_FILMS].map((f, i) => <PosterTile key={i} film={f} idx={i} />)}
        </div>
        {/* Row 2 — reverse direction */}
        <div style={{ position: "absolute", top: "36%", left: 0, display: "flex", gap: 16, opacity: 0.13, animation: "scroll-bg 55s linear infinite reverse" }}>
          {[...POSTER_FILMS, ...POSTER_FILMS].map((f, i) => <PosterTile key={i} film={f} idx={i + 5} />)}
        </div>
        {/* Row 3 */}
        <div style={{ position: "absolute", top: "65%", left: 0, display: "flex", gap: 16, opacity: 0.1, animation: "scroll-bg 70s linear infinite" }}>
          {[...POSTER_FILMS, ...POSTER_FILMS].map((f, i) => <PosterTile key={i} film={f} idx={i + 10} />)}
        </div>
        {/* Dark overlay to keep content readable */}
        <div style={{ position: "absolute", inset: 0, background: `linear-gradient(to bottom, ${theme.bg1}CC 0%, ${theme.bg1}99 40%, ${theme.bg1}99 60%, ${theme.bg1}CC 100%)` }} />
        {/* Radial accent glow */}
        <div style={{ position: "absolute", top: "-10%", left: "50%", transform: "translateX(-50%)", width: 900, height: 600, borderRadius: "50%", background: `radial-gradient(ellipse, ${glow.replace("0.2","0.12")} 0%, transparent 65%)` }} />
        {/* Vignette */}
        <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at center, transparent 35%, ${theme.bg1}BB 100%)` }} />
      </div>

      {/* ══ NAVBAR ══ */}
      <nav style={{ position: "sticky", top: 0, zIndex: 200, background: `${theme.bg1}E8`, backdropFilter: "blur(32px)", WebkitBackdropFilter: "blur(32px)", borderBottom: `1px solid ${theme.border}`, height: 62, display: "flex", alignItems: "center", padding: "0 clamp(1.25rem,4vw,2.5rem)", gap: 12 }}>

        {/* Brand */}
        <a href="/dashboard" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", flexShrink: 0 }}>
          <svg width="28" height="28" viewBox="0 0 40 40" fill="none">
            <circle cx="20" cy="20" r="17" stroke={acc} strokeWidth="1.2"/>
            <circle cx="20" cy="20" r="2.5" fill={acc}/>
            <circle cx="20" cy="9"  r="2.8" fill={acc} opacity="0.7"/>
            <circle cx="20" cy="31" r="2.8" fill={acc} opacity="0.7"/>
            <circle cx="9"  cy="20" r="2.8" fill={acc} opacity="0.7"/>
            <circle cx="31" cy="20" r="2.8" fill={acc} opacity="0.7"/>
          </svg>
          <span style={{ fontFamily: "var(--fp)", fontSize: 19, fontWeight: 700, letterSpacing: "-0.01em" }} className="accent-text">Movie Memory</span>
        </a>

        {/* Genre badge */}
        {theme.label && (
          <div style={{ padding: "3px 10px", borderRadius: 20, background: glow, border: `1px solid ${acc}44`, fontSize: 11, fontWeight: 600, color: acc, letterSpacing: "0.08em", textTransform: "uppercase", transition: "all 0.6s ease" }}>
            {theme.label}
          </div>
        )}

        <div style={{ flex: 1 }} />

        {/* Tab nav */}
        <div style={{ display: "flex", gap: 4, background: `${theme.bg2}CC`, borderRadius: 12, padding: 4, border: `1px solid ${theme.border}` }}>
          {(["dashboard","api"] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              padding: "6px 16px", borderRadius: 9, fontSize: 12, fontWeight: 600,
              cursor: "pointer", fontFamily: "var(--ff)", letterSpacing: "0.04em",
              textTransform: "capitalize", transition: "all 0.2s", border: "none",
              background: activeTab === tab ? acc : "transparent",
              color: activeTab === tab ? "#000" : theme.muted,
            }}>{tab}</button>
          ))}
        </div>

        {/* User mini */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 12px 5px 6px", borderRadius: 50, background: glow, border: `1px solid ${acc}33` }}>
          <div style={{ width: 28, height: 28, borderRadius: "50%", overflow: "hidden", background: theme.bg2, border: `1.5px solid ${acc}66`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: acc, flexShrink: 0 }}>
            {user.image ? <img src={user.image + "?sz=56"} alt="av" referrerPolicy="no-referrer" style={{ width: 28, height: 28, objectFit: "cover", display: "block" }} /> : (user.name?.[0] ?? "?")}
          </div>
          <span style={{ fontSize: 12, fontWeight: 500, color: theme.text, maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.name?.split(" ")[0] ?? user.email}</span>
        </div>

        <button onClick={() => signOut({ callbackUrl: "/" })} className="btn-primary" style={{ padding: "8px 18px", fontSize: 12 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Logout
        </button>
      </nav>

      {/* ══ DASHBOARD TAB ══ */}
      {activeTab === "dashboard" && (
        <div style={{ position: "relative", zIndex: 1, flex: 1 }}>

          {/* HERO — editorial style, left-aligned */}
          <section style={{ padding: "clamp(3rem,7vw,5.5rem) clamp(1.5rem,5vw,3rem)", borderBottom: `1px solid ${theme.border}`, maxWidth: 1200, margin: "0 auto", width: "100%" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "2rem", alignItems: "center" }}>
              <div className="fade-up">
                <p style={{ fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", color: acc, marginBottom: 16, fontWeight: 700, opacity: 0.8 }}>
                  Your personal cinema — {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                </p>
                <h1 style={{ fontFamily: "var(--fp)", fontSize: "clamp(42px,7vw,82px)", fontWeight: 900, lineHeight: 0.93, letterSpacing: "-0.025em", marginBottom: 20 }}>
                  <span style={{ display: "block", color: theme.text, opacity: 0.85 }}>Welcome</span>
                  <span style={{ display: "block", color: theme.text, opacity: 0.85 }}>back,</span>
                  <span className="accent-text" style={{ display: "block", fontStyle: "italic" }}>{firstName}.</span>
                </h1>
                <p style={{ fontSize: 15, color: theme.muted, fontWeight: 300, maxWidth: 420, lineHeight: 1.7 }}>
                  {movie
                    ? <>Currently obsessed with <span style={{ color: acc, fontWeight: 600 }}>"{movie}"</span>. The theme adapts to your film.</>
                    : "Set your favourite film below and watch the entire theme transform."}
                </p>
              </div>

              {/* Right — profile snapshot (NOT circular, editorial card) */}
              <div className="fade-up-2" style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10 }}>
                {user.image && (
                  <div style={{ width: 80, height: 80, borderRadius: 16, overflow: "hidden", border: `2px solid ${acc}50`, boxShadow: `0 0 32px ${glow}` }}>
                    <img src={user.image + "?sz=160"} alt="profile" referrerPolicy="no-referrer" style={{ width: 80, height: 80, objectFit: "cover", display: "block" }} />
                  </div>
                )}
                <p style={{ fontFamily: "var(--fp)", fontSize: 15, fontWeight: 700, color: theme.text }}>{user.name}</p>
                <p style={{ fontSize: 11, color: theme.muted }}>{user.email}</p>
              </div>
            </div>
          </section>

          {/* MAIN CONTENT — asymmetric layout */}
          <div style={{ maxWidth: 1200, margin: "0 auto", padding: "clamp(2rem,4vw,3rem) clamp(1.5rem,5vw,3rem)", display: "grid", gridTemplateColumns: "minmax(0,1.6fr) minmax(0,1fr)", gap: "2rem" }}>

            {/* ── LEFT — Movie + Fact (big) ── */}
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

              {/* MOVIE BLOCK — not a card, raw editorial */}
              <div className="fade-up">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: theme.muted, letterSpacing: "0.18em", textTransform: "uppercase" }}>Now watching</span>
                  <button onClick={startEdit} className="btn-ghost" style={{ padding: "6px 14px", fontSize: 11 }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    Change film
                  </button>
                </div>

                {isEditing ? (
                  <div style={{ padding: "1.5rem", background: theme.card, backdropFilter: "blur(32px)", border: `1px solid ${acc}44`, borderRadius: 20, marginBottom: 16 }}>
                    <input ref={editRef} type="text" value={editValue}
                      onChange={e => setEditValue(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") cancelEdit(); }}
                      placeholder="e.g. The Shawshank Redemption"
                      maxLength={200}
                      style={{ width: "100%", padding: "14px 18px", borderRadius: 12, marginBottom: 10, background: "rgba(255,255,255,0.04)", border: `1.5px solid ${acc}`, color: theme.text, fontSize: 18, outline: "none", fontFamily: "var(--fp)", fontWeight: 700 }}
                    />
                    {movieError && <p style={{ fontSize: 12, color: acc, marginBottom: 12 }}>{movieError}</p>}
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={saveEdit} disabled={isSaving || !editValue.trim()} className="btn-primary">
                        {isSaving ? "Saving…" : "Save & update theme"}
                      </button>
                      <button onClick={cancelEdit} className="btn-ghost">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <h2 style={{ fontFamily: "var(--fp)", fontSize: "clamp(36px,5.5vw,64px)", fontWeight: 900, lineHeight: 0.95, letterSpacing: "-0.02em", marginBottom: 6, transition: "color 0.8s" }} className="accent-text">
                    {movie || <span style={{ opacity: 0.3, fontStyle: "italic", fontSize: "clamp(24px,4vw,40px)" }}>Set your favourite film</span>}
                  </h2>
                )}
                {movie && !isEditing && (
                  <p style={{ fontSize: 12, color: theme.muted, marginTop: 8 }}>
                    Theme: <span style={{ color: acc, fontWeight: 600 }}>{theme.label}</span> · AI facts by <span style={{ color: acc, fontWeight: 600 }}>GPT-4o mini</span>
                  </p>
                )}
              </div>

              {/* FACT CARD */}
              <div className="glass fade-up-2" style={{ padding: "clamp(1.5rem,3vw,2rem)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                  <div style={{ width: 4, height: 36, borderRadius: 4, background: `linear-gradient(to bottom, ${acc}, ${acc}40)`, flexShrink: 0 }} />
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: theme.text, marginBottom: 2 }}>Cinema Fact</p>
                    <p style={{ fontSize: 11, color: theme.muted }}>Powered by OpenAI GPT-4o mini</p>
                  </div>
                  <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
                    {fact?.cached && <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, border: `1px solid ${theme.border}`, color: theme.muted, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>cached</span>}
                    {fact && <span style={{ fontSize: 11, color: theme.muted }}>{timeAgo(fact.generatedAt)}</span>}
                  </div>
                </div>

                {factLoading ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {[100,92,80,60].map((w,i) => <div key={i} className="skel" style={{ height: 16, width: `${w}%`, animationDelay: `${i*0.1}s` }} />)}
                  </div>
                ) : factError ? (
                  <p style={{ fontSize: 14, color: theme.muted, lineHeight: 1.7, padding: "14px 18px", borderRadius: 14, background: "rgba(255,255,255,0.03)", border: `1px solid ${theme.border}` }}>{factError}</p>
                ) : fact ? (
                  <p style={{ fontSize: 16, lineHeight: 1.85, color: theme.text, fontWeight: 300, letterSpacing: "0.01em" }}>{fact.factText}</p>
                ) : null}

                {!factLoading && movie && (
                  <button onClick={() => loadFact(true)} className="btn-ghost" style={{ marginTop: 20, fontSize: 13 }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M23 4v6h-6M1 20v-6h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    Generate new fact
                  </button>
                )}
              </div>

              {/* FACT HISTORY */}
              {factHistory.length > 1 && (
                <div className="glass fade-up-3" style={{ padding: "1.5rem" }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: theme.muted, letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 16 }}>Session history</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {factHistory.slice(1).map((f, i) => (
                      <div key={i} style={{ display: "flex", gap: 14, padding: "12px 16px", borderRadius: 14, background: "rgba(255,255,255,0.03)", border: `1px solid ${theme.border}` }}>
                        <div style={{ width: 2, borderRadius: 2, background: acc, opacity: 0.3, flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 13, color: theme.text, lineHeight: 1.7, fontWeight: 300 }}>{f.factText}</p>
                          <p style={{ fontSize: 10, color: theme.muted, marginTop: 4 }}>{timeAgo(f.generatedAt)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ── RIGHT — Profile + Stats ── */}
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

              {/* PROFILE — not a card, editorial list */}
              <div className="glass fade-up-2" style={{ padding: "1.75rem" }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: theme.muted, letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 18 }}>Your profile</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                  {[
                    { l: "Name",  v: user.name ?? "—" },
                    { l: "Email", v: user.email },
                    { l: "Film",  v: movie || "—" },
                    { l: "Theme", v: theme.label },
                  ].map((r, i, a) => (
                    <div key={r.l}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 0" }}>
                        <span style={{ fontSize: 12, color: theme.muted, fontWeight: 500 }}>{r.l}</span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: r.l === "Theme" ? acc : theme.text, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "right" }}>{r.v}</span>
                      </div>
                      {i < a.length - 1 && <div style={{ height: 1, background: theme.border }} />}
                    </div>
                  ))}
                </div>
              </div>

              {/* DYNAMIC THEME PALETTE — shows what changed */}
              <div className="glass fade-up-3" style={{ padding: "1.5rem" }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: theme.muted, letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 16 }}>Active theme</p>
                <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                  {[theme.bg1, theme.bg2, theme.accent, theme.text, theme.muted].map((c, i) => (
                    <div key={i} style={{ width: 32, height: 32, borderRadius: 8, background: c, border: `1px solid ${theme.border}`, flexShrink: 0, boxShadow: i === 2 ? `0 0 12px ${glow}` : "none" }} />
                  ))}
                </div>
                <p style={{ fontSize: 13, color: theme.muted, lineHeight: 1.6, fontWeight: 300 }}>
                  Theme changes based on your movie genre. Try changing to a sci-fi film like <span style={{ color: acc }}>"Interstellar"</span> or a thriller like <span style={{ color: acc }}>"The Dark Knight"</span>.
                </p>
              </div>

              {/* STACK */}
              <div className="glass fade-up-4" style={{ padding: "1.5rem" }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: theme.muted, letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 16 }}>Tech stack</p>
                {[
                  { l: "AI",        v: "GPT-4o mini",  dot: acc },
                  { l: "Auth",      v: "Google OAuth", dot: "#4285F4" },
                  { l: "Database",  v: "PostgreSQL",   dot: "#336791" },
                  { l: "Framework", v: "Next.js 15",   dot: "#E8E8E8" },
                  { l: "Cache",     v: fact?.cached ? "Hit ✓" : "Live", dot: "#22C55E" },
                ].map(s => (
                  <div key={s.l} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${theme.border}` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                      <div style={{ width: 7, height: 7, borderRadius: "50%", background: s.dot, boxShadow: `0 0 8px ${s.dot}80`, flexShrink: 0 }} />
                      <span style={{ fontSize: 12, color: theme.muted }}>{s.l}</span>
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 600, color: theme.text }}>{s.v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* HOW IT WORKS */}
          <section style={{ borderTop: `1px solid ${theme.border}`, padding: "clamp(3rem,6vw,5rem) clamp(1.5rem,5vw,3rem)" }}>
            <div style={{ maxWidth: 1200, margin: "0 auto" }}>
              <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: "clamp(2rem,4vw,3.5rem)", flexWrap: "wrap", gap: 16 }}>
                <div>
                  <p style={{ fontSize: 10, fontWeight: 700, color: theme.muted, letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 10 }}>The process</p>
                  <h2 style={{ fontFamily: "var(--fp)", fontSize: "clamp(28px,4vw,44px)", fontWeight: 900, letterSpacing: "-0.02em" }} className="accent-text">How it works</h2>
                </div>
                <p style={{ fontSize: 13, color: theme.muted, maxWidth: 300, lineHeight: 1.6, fontWeight: 300 }}>Three steps from sign-in to discovering your next fascinating film fact.</p>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "1.25rem" }}>
                {[
                  { n: "01", t: "Sign in securely", d: "Google OAuth authenticates your identity. We only access your name, email and profile photo.", icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="3" y="11" width="18" height="11" rx="2" stroke={acc} strokeWidth="1.5"/><path d="M7 11V7a5 5 0 0 1 10 0v4" stroke={acc} strokeWidth="1.5" strokeLinecap="round"/></svg> },
                  { n: "02", t: "Save your film",   d: "Enter your all-time favourite. The entire app theme transforms based on your film's genre.",   icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M7 4v16M17 4v16M3 8h4m10 0h4M3 16h4m10 0h4M4 20h16a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1z" stroke={acc} strokeWidth="1.5" strokeLinecap="round"/></svg> },
                  { n: "03", t: "Discover AI facts", d: "GPT-4o mini generates little-known cinematic facts. Cached for 30s server-side, 30s client-side.", icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 3v1m0 16v1M4.22 4.22l.7.7m12.16 12.16.7.7M3 12h1m16 0h1M4.92 19.08l.7-.7M18.36 5.64l.7-.7M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" stroke={acc} strokeWidth="1.5" strokeLinecap="round"/></svg> },
                ].map((s, i) => (
                  <div key={s.n} className="glass" style={{ padding: "2rem" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                      <div style={{ width: 48, height: 48, borderRadius: 14, background: glow, border: `1px solid ${acc}33`, display: "flex", alignItems: "center", justifyContent: "center" }}>{s.icon}</div>
                      <span style={{ fontFamily: "var(--fp)", fontSize: 52, fontWeight: 900, color: theme.border, lineHeight: 1, letterSpacing: "-0.03em" }}>{s.n}</span>
                    </div>
                    <h3 style={{ fontFamily: "var(--fp)", fontSize: 18, fontWeight: 700, color: theme.text, marginBottom: 10, lineHeight: 1.2 }}>{s.t}</h3>
                    <p style={{ fontSize: 13, color: theme.muted, lineHeight: 1.8, fontWeight: 300 }}>{s.d}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      )}

      {/* ══ API TAB ══ */}
      {activeTab === "api" && (
        <div style={{ position: "relative", zIndex: 1, flex: 1, padding: "clamp(2rem,5vw,3.5rem) clamp(1.5rem,5vw,3rem)", maxWidth: 1200, margin: "0 auto", width: "100%" }}>
          <div className="fade-up" style={{ marginBottom: "2.5rem" }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: theme.muted, letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 12 }}>API Reference</p>
            <h2 style={{ fontFamily: "var(--fp)", fontSize: "clamp(28px,4vw,44px)", fontWeight: 900, letterSpacing: "-0.02em", marginBottom: 10 }} className="accent-text">Endpoints</h2>
            <p style={{ fontSize: 14, color: theme.muted, fontWeight: 300, lineHeight: 1.7, maxWidth: 540 }}>
              All endpoints require an active session. Unauthorized requests return <code style={{ background: "rgba(255,255,255,0.06)", padding: "2px 7px", borderRadius: 6, fontSize: 12, color: acc }}>401</code>.
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {[
              {
                method: "GET", path: "/api/me", status: 200,
                desc: "Returns the current authenticated user's profile from the database.",
                response: `{\n  "id": "cuid...",\n  "name": "Meghana Rabba",\n  "email": "meghana@gmail.com",\n  "image": "https://...",\n  "favoriteMovie": "Bridgerton",\n  "onboarded": true\n}`,
                auth: true, cache: false,
              },
              {
                method: "PUT", path: "/api/me/movie", status: 200,
                desc: "Updates the user's favourite movie. Server-side validated with Zod (min 1, max 200 chars). Triggers fact cache invalidation on the client.",
                body: `{ "movie": "The Dark Knight" }`,
                response: `{ "favoriteMovie": "The Dark Knight" }`,
                auth: true, cache: false,
              },
              {
                method: "GET", path: "/api/fact", status: 200,
                desc: "Returns a movie fact. Checks 60-second server cache first. Uses isGenerating flag to prevent burst duplicate generation. Falls back to last cached fact if OpenAI fails.",
                response: `{\n  "factText": "The Joker's makeup...",\n  "generatedAt": "2026-03-30T...",\n  "cached": false\n}`,
                auth: true, cache: true,
              },
            ].map((ep, i) => (
              <div key={i} className="glass fade-up" style={{ padding: "1.75rem 2rem", animationDelay: `${i * 0.1}s` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
                  <span style={{ padding: "4px 12px", borderRadius: 8, background: ep.method === "GET" ? "rgba(22,163,90,0.15)" : "rgba(201,148,12,0.15)", color: ep.method === "GET" ? "#22C55E" : acc, fontSize: 12, fontWeight: 800, letterSpacing: "0.08em", border: `1px solid ${ep.method === "GET" ? "rgba(22,163,90,0.3)" : acc + "44"}` }}>
                    {ep.method}
                  </span>
                  <code style={{ fontFamily: "monospace", fontSize: 15, fontWeight: 700, color: theme.text, letterSpacing: "0.02em" }}>{ep.path}</code>
                  <span style={{ padding: "3px 10px", borderRadius: 8, background: "rgba(22,163,90,0.1)", color: "#22C55E", fontSize: 11, fontWeight: 600, border: "1px solid rgba(22,163,90,0.25)", marginLeft: "auto" }}>
                    {ep.status} OK
                  </span>
                  {ep.auth && <span style={{ padding: "3px 10px", borderRadius: 8, background: "rgba(255,255,255,0.04)", color: theme.muted, fontSize: 11, fontWeight: 600, border: `1px solid ${theme.border}` }}>Auth required</span>}
                  {ep.cache && <span style={{ padding: "3px 10px", borderRadius: 8, background: `${glow}`, color: acc, fontSize: 11, fontWeight: 600, border: `1px solid ${acc}33` }}>60s cached</span>}
                </div>
                <p style={{ fontSize: 14, color: theme.muted, lineHeight: 1.7, marginBottom: ep.body || ep.response ? 16 : 0, fontWeight: 300 }}>{ep.desc}</p>
                <div style={{ display: "grid", gridTemplateColumns: ep.body ? "1fr 1fr" : "1fr", gap: 12 }}>
                  {ep.body && (
                    <div>
                      <p style={{ fontSize: 10, fontWeight: 700, color: theme.muted, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8 }}>Request body</p>
                      <pre style={{ fontSize: 12, color: theme.text, background: "rgba(255,255,255,0.03)", border: `1px solid ${theme.border}`, borderRadius: 12, padding: "14px 16px", overflow: "auto", lineHeight: 1.6, fontFamily: "monospace" }}>{ep.body}</pre>
                    </div>
                  )}
                  {ep.response && (
                    <div>
                      <p style={{ fontSize: 10, fontWeight: 700, color: theme.muted, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8 }}>Response</p>
                      <pre style={{ fontSize: 12, color: acc, background: "rgba(255,255,255,0.03)", border: `1px solid ${acc}33`, borderRadius: 12, padding: "14px 16px", overflow: "auto", lineHeight: 1.6, fontFamily: "monospace" }}>{ep.response}</pre>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Error responses */}
            <div className="glass fade-up-4" style={{ padding: "1.75rem 2rem" }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: theme.muted, letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 16 }}>Error responses</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px,1fr))", gap: 10 }}>
                {[
                  { code: "401", msg: "Unauthorized", desc: "No active session" },
                  { code: "422", msg: "Unprocessable", desc: "Validation failed" },
                  { code: "503", msg: "Service Error", desc: "OpenAI unavailable, no cached fallback" },
                  { code: "202", msg: "Accepted", desc: "Generation in progress, retry shortly" },
                ].map(e => (
                  <div key={e.code} style={{ padding: "14px 16px", borderRadius: 14, background: "rgba(255,255,255,0.03)", border: `1px solid ${theme.border}` }}>
                    <p style={{ fontSize: 18, fontWeight: 800, color: "#EF4444", fontFamily: "monospace", marginBottom: 4 }}>{e.code}</p>
                    <p style={{ fontSize: 12, fontWeight: 700, color: theme.text, marginBottom: 4 }}>{e.msg}</p>
                    <p style={{ fontSize: 11, color: theme.muted, lineHeight: 1.5 }}>{e.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ FOOTER ══ */}
      <footer style={{ position: "relative", zIndex: 1, background: `${theme.bg1}F5`, backdropFilter: "blur(24px)", borderTop: `1px solid ${theme.border}`, padding: "1.75rem clamp(1.5rem,5vw,3rem)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <svg width="22" height="22" viewBox="0 0 40 40" fill="none"><circle cx="20" cy="20" r="16" stroke={acc} strokeWidth="1.2" opacity="0.7"/><circle cx="20" cy="20" r="2" fill={acc} opacity="0.8"/></svg>
          <span style={{ fontFamily: "var(--fp)", fontSize: 15, fontWeight: 700, color: acc }}>Movie Memory</span>
        </div>
        <span style={{ fontSize: 11, color: theme.muted, letterSpacing: "0.04em" }}>Next.js 15 · Prisma ORM · PostgreSQL · OpenAI API · NextAuth v5</span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#22C55E", boxShadow: "0 0 10px rgba(34,197,94,0.7)", animation: "glow-pulse 2s ease-in-out infinite" }} />
          <span style={{ fontSize: 11, color: theme.muted, fontWeight: 500 }}>All systems operational</span>
        </div>
      </footer>
    </div>
  );
}
