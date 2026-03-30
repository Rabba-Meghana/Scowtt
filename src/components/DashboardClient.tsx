"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { signOut } from "next-auth/react";
import { updateMovie, getFact, getCachedFact, setCachedFact, invalidateFactCache, type FactResponse } from "@/lib/api";
import { getMovieTheme, type MovieTheme } from "@/lib/movieThemes";

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
    setTheme(t); applyTheme(t);
  }, [user.favoriteMovie, applyTheme]);

  useEffect(() => {
    const t = getMovieTheme(movie);
    setTheme(t); applyTheme(t);
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
    if (t.length > 200) { setMovieError("Max 200 chars."); return; }
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

  if (!mounted) return null;

  const acc = theme.accent;
  const gl  = theme.glow;
  const bd  = theme.border;
  const tx  = theme.text;
  const mu  = theme.muted;
  const [p1, p2, p3] = theme.poster;

  const glass: React.CSSProperties = {
    background: theme.card,
    backdropFilter: "blur(36px)",
    WebkitBackdropFilter: "blur(36px)",
    border: `1px solid ${bd}`,
    borderRadius: 20,
    boxShadow: `0 2px 48px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.04)`,
    position: "relative", overflow: "hidden",
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", background: theme.bg1, color: tx, fontFamily: "var(--ff)", transition: "background 1s, color 0.5s" }}>

      {/* ══════════════════════════════════════════
          POSTER PANEL — fixed left column
      ══════════════════════════════════════════ */}
      <div style={{
        position: "fixed", left: 0, top: 0, bottom: 0,
        width: 280, zIndex: 10, flexShrink: 0,
        background: `linear-gradient(175deg, ${p1} 0%, ${p2} 45%, ${p3} 100%)`,
        transition: "background 1.2s ease",
        display: "flex", flexDirection: "column",
      }}>
        {/* Scan lines */}
        <div style={{ position: "absolute", inset: 0, backgroundImage: "repeating-linear-gradient(0deg, rgba(0,0,0,0.07) 0px, rgba(0,0,0,0.07) 1px, transparent 1px, transparent 4px)", pointerEvents: "none" }} />
        {/* Diagonal texture */}
        <div style={{ position: "absolute", inset: 0, backgroundImage: "repeating-linear-gradient(135deg, rgba(255,255,255,0.02) 0px, rgba(255,255,255,0.02) 1px, transparent 1px, transparent 14px)", pointerEvents: "none" }} />
        {/* Top glow */}
        <div style={{ position: "absolute", top: "-5%", left: "50%", transform: "translateX(-50%)", width: "120%", height: "50%", background: `radial-gradient(ellipse, ${acc}22 0%, transparent 70%)`, pointerEvents: "none" }} />

        {/* Sprocket holes — left edge */}
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 22, display: "flex", flexDirection: "column", justifyContent: "space-evenly", alignItems: "center", padding: "16px 0", background: "rgba(0,0,0,0.55)", zIndex: 2 }}>
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} style={{ width: 12, height: 8, borderRadius: 2, background: "rgba(0,0,0,0.9)", border: "1px solid rgba(255,255,255,0.1)" }} />
          ))}
        </div>

        {/* App logo at top */}
        <div style={{ padding: "28px 16px 0 32px", position: "relative", zIndex: 2 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <svg width="18" height="18" viewBox="0 0 40 40" fill="none">
              <circle cx="20" cy="20" r="16" stroke={acc} strokeWidth="1.5"/>
              <circle cx="20" cy="20" r="2.2" fill={acc}/>
              <circle cx="20" cy="10" r="2.5" fill={acc} opacity="0.7"/>
              <circle cx="20" cy="30" r="2.5" fill={acc} opacity="0.7"/>
              <circle cx="10" cy="20" r="2.5" fill={acc} opacity="0.7"/>
              <circle cx="30" cy="20" r="2.5" fill={acc} opacity="0.7"/>
            </svg>
            <span style={{ fontFamily: "var(--fp)", fontSize: 13, fontWeight: 700, color: acc, letterSpacing: "0.02em" }}>Movie Memory</span>
          </div>
          <div style={{ width: 24, height: 1, background: `${acc}55`, marginLeft: 26 }} />
        </div>

        {/* Big ghost title */}
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px 28px 20px 32px", position: "relative", zIndex: 2 }}>
          <p style={{
            fontFamily: "var(--fp)", fontWeight: 900,
            fontSize: movie.length > 12 ? "clamp(28px,3.5vw,40px)" : "clamp(36px,4.5vw,52px)",
            lineHeight: 0.95, letterSpacing: "-0.025em",
            color: "rgba(255,255,255,0.12)", wordBreak: "break-word",
            textTransform: "uppercase", userSelect: "none",
            position: "absolute", inset: "20px 28px 120px 32px",
            display: "flex", alignItems: "center",
          }}>
            {(movie || "Cinema").toUpperCase()}
          </p>
        </div>

        {/* Bottom info */}
        <div style={{ padding: "60px 16px 32px 32px", background: "linear-gradient(to top, rgba(0,0,0,0.95) 0%, transparent 100%)", position: "relative", zIndex: 2 }}>
          <div style={{ width: 28, height: 2, background: acc, borderRadius: 2, marginBottom: 14, boxShadow: `0 0 14px ${gl}` }} />
          <p style={{ fontSize: 9, fontWeight: 800, color: acc, letterSpacing: "0.22em", textTransform: "uppercase", marginBottom: 8, opacity: 0.9 }}>Now Watching</p>
          <h3 style={{ fontFamily: "var(--fp)", fontSize: "clamp(16px,1.8vw,22px)", fontWeight: 900, color: "#fff", lineHeight: 1.15, letterSpacing: "-0.01em", marginBottom: 8 }}>
            {movie || "Set a film"}
          </h3>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: acc, boxShadow: `0 0 8px ${gl}` }} />
            <p style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", fontWeight: 500, letterSpacing: "0.06em" }}>{theme.label}</p>
          </div>
        </div>

        {/* Right edge fade */}
        <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: 60, background: `linear-gradient(to right, transparent, ${theme.bg1})`, pointerEvents: "none" }} />
      </div>

      {/* ══════════════════════════════════════════
          MAIN CONTENT — offset left by poster width
      ══════════════════════════════════════════ */}
      <div style={{ flex: 1, marginLeft: 280, display: "flex", flexDirection: "column", minWidth: 0 }}>

        {/* NAVBAR */}
        <nav style={{
          position: "sticky", top: 0, zIndex: 100,
          background: `${theme.bg1}F0`, backdropFilter: "blur(28px)", WebkitBackdropFilter: "blur(28px)",
          borderBottom: `1px solid ${bd}`,
          height: 60, display: "flex", alignItems: "center",
          padding: "0 2rem", gap: 12,
        }}>
          {/* Genre badge */}
          <div style={{ padding: "3px 12px", borderRadius: 20, background: gl, border: `1px solid ${acc}44`, fontSize: 11, fontWeight: 700, color: acc, letterSpacing: "0.08em", textTransform: "uppercase", transition: "all 0.6s" }}>
            {theme.label}
          </div>

          <div style={{ flex: 1 }} />

          {/* Tabs */}
          <div style={{ display: "flex", gap: 3, background: "rgba(255,255,255,0.04)", borderRadius: 12, padding: 3, border: `1px solid ${bd}` }}>
            {(["dashboard","api"] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} style={{
                padding: "6px 18px", borderRadius: 9, fontSize: 12, fontWeight: 600,
                cursor: "pointer", fontFamily: "var(--ff)", letterSpacing: "0.04em",
                textTransform: "capitalize", transition: "all 0.2s", border: "none",
                background: activeTab === tab ? acc : "transparent",
                color: activeTab === tab ? "#000" : mu,
              }}>{tab}</button>
            ))}
          </div>

          {/* User pill */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 14px 5px 6px", borderRadius: 50, background: gl, border: `1px solid ${acc}33` }}>
            <div style={{ width: 30, height: 30, borderRadius: "50%", overflow: "hidden", background: theme.bg2, border: `1.5px solid ${acc}55`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: acc, flexShrink: 0 }}>
              {user.image ? <img src={user.image + "?sz=60"} alt="av" referrerPolicy="no-referrer" style={{ width: 30, height: 30, objectFit: "cover", display: "block" }} /> : (user.name?.[0] ?? "?")}
            </div>
            <span style={{ fontSize: 13, fontWeight: 500, color: tx }}>{firstName}</span>
          </div>

          <button onClick={() => signOut({ callbackUrl: "/" })} className="btn-primary" style={{ padding: "8px 18px", fontSize: 12 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Logout
          </button>
        </nav>

        {/* ══ DASHBOARD TAB ══ */}
        {activeTab === "dashboard" && (
          <div style={{ flex: 1 }}>

            {/* HERO */}
            <section style={{ padding: "clamp(3rem,6vw,5rem) 2.5rem clamp(2.5rem,5vw,4rem)", borderBottom: `1px solid ${bd}`, position: "relative", overflow: "hidden" }}>
              {/* Ambient glow behind hero text */}
              <div style={{ position: "absolute", top: "-40%", right: "-10%", width: "60%", height: "200%", background: `radial-gradient(ellipse, ${gl.replace("0.2","0.08")} 0%, transparent 65%)`, pointerEvents: "none" }} />

              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "2rem" }}>
                <div className="fade-up">
                  <p style={{ fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", color: mu, marginBottom: 18, fontWeight: 700 }}>
                    {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                  </p>
                  <h1 style={{ fontFamily: "var(--fp)", fontSize: "clamp(44px,6vw,80px)", fontWeight: 900, lineHeight: 1.0, letterSpacing: "-0.025em", marginBottom: 16 }}>
                    <span style={{ display: "block", color: tx, opacity: 0.9 }}>Welcome</span>
                    <span style={{ display: "block", color: tx, opacity: 0.9 }}>back,</span>
                    <span className="accent-text" style={{ display: "block", fontStyle: "italic" }}>{firstName}.</span>
                  </h1>
                  <p style={{ fontSize: 15, color: mu, fontWeight: 300, maxWidth: 400, lineHeight: 1.7 }}>
                    {movie
                      ? <>Currently obsessed with <span style={{ color: acc, fontWeight: 600 }}>"{movie}"</span>. Theme adapts to your genre.</>
                      : "Set your favourite film and watch the entire theme transform."}
                  </p>
                </div>

                {/* Profile — top right, stacked, NOT circular */}
                <div className="fade-up-2" style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 12, minWidth: 180 }}>
                  {user.image && (
                    <div style={{ width: 72, height: 72, borderRadius: 16, overflow: "hidden", border: `2px solid ${acc}44`, boxShadow: `0 0 28px ${gl}` }}>
                      <img src={user.image + "?sz=144"} alt="profile" referrerPolicy="no-referrer" style={{ width: 72, height: 72, objectFit: "cover", display: "block" }} />
                    </div>
                  )}
                  <div style={{ textAlign: "right" }}>
                    <p style={{ fontFamily: "var(--fp)", fontSize: 16, fontWeight: 700, color: tx, marginBottom: 3 }}>{user.name}</p>
                    <p style={{ fontSize: 11, color: mu, letterSpacing: "0.01em" }}>{user.email}</p>
                  </div>
                </div>
              </div>
            </section>

            {/* GRID CONTENT */}
            <div style={{ padding: "2.5rem", display: "grid", gridTemplateColumns: "minmax(0,1.65fr) minmax(0,1fr)", gap: "1.5rem", alignItems: "start" }}>

              {/* LEFT */}
              <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

                {/* MOVIE + FACT CARD */}
                <div className="fade-up" style={glass}>
                  <div style={{ position: "absolute", top: 0, left: "8%", right: "8%", height: 1, background: `linear-gradient(90deg, transparent, ${acc}, transparent)`, opacity: 0.5 }} />
                  <div style={{ padding: "2rem" }}>

                    {/* Header */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                      <span style={{ fontSize: 10, fontWeight: 800, color: mu, letterSpacing: "0.18em", textTransform: "uppercase" }}>Now Watching</span>
                      {!isEditing && (
                        <button onClick={startEdit} className="btn-ghost" style={{ padding: "6px 14px", fontSize: 11 }}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          Change film
                        </button>
                      )}
                    </div>

                    {isEditing ? (
                      <div style={{ marginBottom: 20 }}>
                        <input ref={editRef} type="text" value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") cancelEdit(); }}
                          placeholder="e.g. The Shawshank Redemption" maxLength={200}
                          style={{ width: "100%", padding: "14px 18px", borderRadius: 12, marginBottom: 10, background: "rgba(255,255,255,0.05)", border: `1.5px solid ${acc}`, color: tx, fontSize: 17, outline: "none", fontFamily: "var(--fp)", fontWeight: 700, boxShadow: `0 0 0 4px ${gl}` }}
                        />
                        {movieError && <p style={{ fontSize: 12, color: acc, marginBottom: 10 }}>{movieError}</p>}
                        <div style={{ display: "flex", gap: 8 }}>
                          <button onClick={saveEdit} disabled={isSaving || !editValue.trim()} className="btn-primary">
                            {isSaving ? "Saving…" : "Save & apply theme"}
                          </button>
                          <button onClick={cancelEdit} className="btn-ghost">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ marginBottom: 8 }}>
                        <h2 style={{ fontFamily: "var(--fp)", fontSize: "clamp(32px,4.5vw,56px)", fontWeight: 900, lineHeight: 1.0, letterSpacing: "-0.02em", marginBottom: 8, transition: "all 0.8s" }} className="accent-text">
                          {movie || <span style={{ opacity: 0.3, fontStyle: "italic", fontSize: "clamp(22px,3vw,36px)" }}>Set your favourite film</span>}
                        </h2>
                        {movie && <p style={{ fontSize: 12, color: mu }}>Theme: <span style={{ color: acc, fontWeight: 600 }}>{theme.label}</span> · AI by <span style={{ color: acc, fontWeight: 600 }}>GPT-4o mini</span></p>}
                      </div>
                    )}

                    <div style={{ height: 1, background: `linear-gradient(90deg, transparent, ${bd}, transparent)`, margin: "20px 0" }} />

                    {/* Fact */}
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
                      <div style={{ width: 3, height: 32, borderRadius: 3, background: `linear-gradient(to bottom, ${acc}, ${acc}33)`, flexShrink: 0 }} />
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 700, color: tx }}>Cinema Fact</p>
                        <p style={{ fontSize: 10, color: mu }}>OpenAI GPT-4o mini</p>
                      </div>
                      {fact?.cached && <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, border: `1px solid ${bd}`, color: mu, fontWeight: 600, marginLeft: "auto" }}>CACHED</span>}
                      {fact && <span style={{ fontSize: 11, color: mu }}>{timeAgo(fact.generatedAt)}</span>}
                    </div>

                    {factLoading ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        {[100,92,80,62].map((w,i) => <div key={i} className="skel" style={{ height: 16, width: `${w}%`, animationDelay: `${i*0.1}s` }} />)}
                      </div>
                    ) : factError ? (
                      <p style={{ fontSize: 14, color: mu, lineHeight: 1.7, padding: "14px 18px", borderRadius: 14, background: "rgba(255,255,255,0.03)", border: `1px solid ${bd}` }}>{factError}</p>
                    ) : fact ? (
                      <p style={{ fontSize: 15, lineHeight: 1.9, color: tx, fontWeight: 300 }}>{fact.factText}</p>
                    ) : null}

                    {!factLoading && movie && (
                      <button onClick={() => loadFact(true)} className="btn-ghost" style={{ marginTop: 18 }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M23 4v6h-6M1 20v-6h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        Generate new fact
                      </button>
                    )}
                  </div>
                </div>

                {/* FACT HISTORY */}
                {factHistory.length > 1 && (
                  <div className="fade-up-2" style={glass}>
                    <div style={{ position: "absolute", top: 0, left: "8%", right: "8%", height: 1, background: `linear-gradient(90deg, transparent, ${acc}55, transparent)` }} />
                    <div style={{ padding: "1.5rem 2rem" }}>
                      <p style={{ fontSize: 10, fontWeight: 800, color: mu, letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 16 }}>Session history</p>
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        {factHistory.slice(1).map((f, i) => (
                          <div key={i} style={{ display: "flex", gap: 12, padding: "12px 14px", borderRadius: 12, background: "rgba(255,255,255,0.02)", border: `1px solid ${bd}` }}>
                            <div style={{ width: 2, borderRadius: 2, background: acc, opacity: 0.3, flexShrink: 0 }} />
                            <div>
                              <p style={{ fontSize: 13, color: tx, lineHeight: 1.7, fontWeight: 300 }}>{f.factText}</p>
                              <p style={{ fontSize: 10, color: mu, marginTop: 4 }}>{timeAgo(f.generatedAt)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* RIGHT */}
              <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

                {/* PROFILE */}
                <div className="fade-up-2" style={glass}>
                  <div style={{ position: "absolute", top: 0, left: "8%", right: "8%", height: 1, background: `linear-gradient(90deg, transparent, ${acc}44, transparent)` }} />
                  <div style={{ padding: "1.5rem 1.75rem" }}>
                    <p style={{ fontSize: 10, fontWeight: 800, color: mu, letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 16 }}>Your profile</p>
                    {[
                      { l: "Name",  v: user.name ?? "—" },
                      { l: "Email", v: user.email },
                      { l: "Film",  v: movie || "—" },
                      { l: "Theme", v: theme.label, highlight: true },
                    ].map((r, i, a) => (
                      <div key={r.l}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0" }}>
                          <span style={{ fontSize: 12, color: mu }}>{r.l}</span>
                          <span style={{ fontSize: 12, fontWeight: 600, color: r.highlight ? acc : tx, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "right" }}>{r.v}</span>
                        </div>
                        {i < a.length - 1 && <div style={{ height: 1, background: bd }} />}
                      </div>
                    ))}
                  </div>
                </div>

                {/* THEME PALETTE */}
                <div className="fade-up-3" style={glass}>
                  <div style={{ position: "absolute", top: 0, left: "8%", right: "8%", height: 1, background: `linear-gradient(90deg, transparent, ${acc}33, transparent)` }} />
                  <div style={{ padding: "1.5rem 1.75rem" }}>
                    <p style={{ fontSize: 10, fontWeight: 800, color: mu, letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 14 }}>Active theme palette</p>
                    <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
                      {[p1, p2, p3, acc, tx].map((c, i) => (
                        <div key={i} title={c} style={{ flex: 1, height: 36, borderRadius: 10, background: c, border: `1px solid ${bd}`, boxShadow: i === 3 ? `0 0 14px ${gl}` : "none", transition: "all 0.8s" }} />
                      ))}
                    </div>
                    <p style={{ fontSize: 12, color: mu, lineHeight: 1.65, fontWeight: 300 }}>
                      Try <span style={{ color: acc, fontWeight: 600 }}>"Dune"</span> for desert amber, <span style={{ color: acc, fontWeight: 600 }}>"The Matrix"</span> for electric blue, or <span style={{ color: acc, fontWeight: 600 }}>"The Dark Knight"</span> for deep crimson.
                    </p>
                  </div>
                </div>

                {/* TECH STACK */}
                <div className="fade-up-4" style={glass}>
                  <div style={{ position: "absolute", top: 0, left: "8%", right: "8%", height: 1, background: `linear-gradient(90deg, transparent, ${acc}33, transparent)` }} />
                  <div style={{ padding: "1.5rem 1.75rem" }}>
                    <p style={{ fontSize: 10, fontWeight: 800, color: mu, letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 14 }}>Tech stack</p>
                    {[
                      { l: "AI model",  v: "GPT-4o mini",  dot: acc },
                      { l: "Auth",      v: "Google OAuth", dot: "#4285F4" },
                      { l: "Database",  v: "PostgreSQL",   dot: "#336791" },
                      { l: "Framework", v: "Next.js 15",   dot: "#E8E8E8" },
                      { l: "Cache",     v: fact?.cached ? "Hit ✓" : "Live", dot: "#22C55E" },
                    ].map((s, i, a) => (
                      <div key={s.l}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 0" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ width: 6, height: 6, borderRadius: "50%", background: s.dot, boxShadow: `0 0 7px ${s.dot}88`, flexShrink: 0 }} />
                            <span style={{ fontSize: 12, color: mu }}>{s.l}</span>
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 600, color: tx }}>{s.v}</span>
                        </div>
                        {i < a.length - 1 && <div style={{ height: 1, background: bd }} />}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* HOW IT WORKS */}
            <section style={{ borderTop: `1px solid ${bd}`, padding: "clamp(3rem,5vw,4.5rem) 2.5rem" }}>
              <div style={{ marginBottom: "clamp(2rem,4vw,3rem)" }}>
                <p style={{ fontSize: 10, fontWeight: 800, color: mu, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 12 }}>The process</p>
                <h2 style={{ fontFamily: "var(--fp)", fontSize: "clamp(28px,4vw,44px)", fontWeight: 900, letterSpacing: "-0.02em" }} className="accent-text">How it works</h2>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "1.25rem" }}>
                {[
                  { n: "01", t: "Sign in securely", d: "Google OAuth handles authentication. We only access your name, email and profile photo." },
                  { n: "02", t: "Save your film", d: "Enter your favourite. The entire app theme transforms based on your film's genre — desert gold for Dune, electric blue for sci-fi." },
                  { n: "03", t: "AI-powered facts", d: "GPT-4o mini generates little-known cinematic facts. Cached 30s server-side and 30s client-side." },
                ].map((s, i) => (
                  <div key={s.n} style={glass}>
                    <div style={{ position: "absolute", top: 0, left: "8%", right: "8%", height: 1, background: `linear-gradient(90deg, transparent, ${acc}44, transparent)` }} />
                    <div style={{ padding: "1.75rem 2rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 12, background: gl, border: `1px solid ${acc}33`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                            {i === 0 && <><rect x="3" y="11" width="18" height="11" rx="2" stroke={acc} strokeWidth="1.5"/><path d="M7 11V7a5 5 0 0 1 10 0v4" stroke={acc} strokeWidth="1.5" strokeLinecap="round"/></>}
                            {i === 1 && <path d="M7 4v16M17 4v16M3 8h4m10 0h4M3 16h4m10 0h4M4 20h16a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1z" stroke={acc} strokeWidth="1.5" strokeLinecap="round"/>}
                            {i === 2 && <path d="M12 3v1m0 16v1M4.22 4.22l.7.7m12.16 12.16.7.7M3 12h1m16 0h1M4.92 19.08l.7-.7M18.36 5.64l.7-.7M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" stroke={acc} strokeWidth="1.5" strokeLinecap="round"/>}
                          </svg>
                        </div>
                        <span style={{ fontFamily: "var(--fp)", fontSize: 44, fontWeight: 900, color: bd, lineHeight: 1 }}>{s.n}</span>
                      </div>
                      <h3 style={{ fontFamily: "var(--fp)", fontSize: 18, fontWeight: 700, color: tx, marginBottom: 10 }}>{s.t}</h3>
                      <p style={{ fontSize: 13, color: mu, lineHeight: 1.8, fontWeight: 300 }}>{s.d}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* ══ API TAB ══ */}
        {activeTab === "api" && (
          <div style={{ flex: 1, padding: "3rem 2.5rem" }}>
            <div className="fade-up" style={{ marginBottom: "2.5rem" }}>
              <p style={{ fontSize: 10, fontWeight: 800, color: mu, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 12 }}>Documentation</p>
              <h2 style={{ fontFamily: "var(--fp)", fontSize: "clamp(28px,4vw,44px)", fontWeight: 900, letterSpacing: "-0.02em", marginBottom: 12 }} className="accent-text">API Endpoints</h2>
              <p style={{ fontSize: 14, color: mu, fontWeight: 300, lineHeight: 1.7, maxWidth: 520 }}>All endpoints require an active session cookie. Unauthorized requests return <code style={{ background: "rgba(255,255,255,0.06)", padding: "2px 7px", borderRadius: 5, fontSize: 12, color: acc }}>401</code>.</p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              {[
                { method: "GET", path: "/api/me", desc: "Returns the current authenticated user's profile from the database.", response: `{\n  "id": "cuid...",\n  "name": "Meghana Rabba",\n  "email": "meghana@gmail.com",\n  "image": "https://...",\n  "favoriteMovie": "Dune",\n  "onboarded": true\n}`, tags: ["Auth required"] },
                { method: "PUT", path: "/api/me/movie", desc: "Updates the user's favourite movie. Server-side Zod validation (min 1, max 200 chars). Triggers client fact cache invalidation.", body: `{ "movie": "Dune" }`, response: `{ "favoriteMovie": "Dune" }`, tags: ["Auth required", "Validated"] },
                { method: "GET", path: "/api/fact", desc: "Returns a movie fact. Checks 60s server cache first. Uses isGenerating flag to prevent burst duplicates. Falls back to last good fact if OpenAI fails.", response: `{\n  "factText": "Denis Villeneuve...",\n  "generatedAt": "2026-03-30T...",\n  "cached": false\n}`, tags: ["Auth required", "60s cached", "Burst protected"] },
              ].map((ep, i) => (
                <div key={i} className="fade-up" style={{ ...glass, animationDelay: `${i*0.1}s` }}>
                  <div style={{ position: "absolute", top: 0, left: "8%", right: "8%", height: 1, background: `linear-gradient(90deg, transparent, ${ep.method === "GET" ? "#22C55E" : acc}, transparent)`, opacity: 0.5 }} />
                  <div style={{ padding: "1.75rem 2rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
                      <span style={{ padding: "4px 12px", borderRadius: 8, background: ep.method === "GET" ? "rgba(34,197,94,0.12)" : `${gl}`, color: ep.method === "GET" ? "#22C55E" : acc, fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", border: `1px solid ${ep.method === "GET" ? "rgba(34,197,94,0.3)" : acc + "44"}` }}>{ep.method}</span>
                      <code style={{ fontFamily: "monospace", fontSize: 15, fontWeight: 700, color: tx }}>{ep.path}</code>
                      <span style={{ marginLeft: "auto", padding: "3px 10px", borderRadius: 8, background: "rgba(34,197,94,0.1)", color: "#22C55E", fontSize: 11, fontWeight: 600, border: "1px solid rgba(34,197,94,0.25)" }}>200 OK</span>
                      {ep.tags.map(t => <span key={t} style={{ padding: "3px 10px", borderRadius: 8, background: "rgba(255,255,255,0.04)", color: mu, fontSize: 10, fontWeight: 600, border: `1px solid ${bd}` }}>{t}</span>)}
                    </div>
                    <p style={{ fontSize: 14, color: mu, lineHeight: 1.7, marginBottom: 16, fontWeight: 300 }}>{ep.desc}</p>
                    <div style={{ display: "grid", gridTemplateColumns: ep.body ? "1fr 1fr" : "1fr", gap: 12 }}>
                      {ep.body && <div><p style={{ fontSize: 10, fontWeight: 700, color: mu, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8 }}>Request body</p><pre style={{ fontSize: 12, color: tx, background: "rgba(255,255,255,0.03)", border: `1px solid ${bd}`, borderRadius: 12, padding: "14px 16px", overflow: "auto", lineHeight: 1.6, fontFamily: "monospace" }}>{ep.body}</pre></div>}
                      <div><p style={{ fontSize: 10, fontWeight: 700, color: mu, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8 }}>Response</p><pre style={{ fontSize: 12, color: acc, background: "rgba(255,255,255,0.03)", border: `1px solid ${acc}33`, borderRadius: 12, padding: "14px 16px", overflow: "auto", lineHeight: 1.6, fontFamily: "monospace" }}>{ep.response}</pre></div>
                    </div>
                  </div>
                </div>
              ))}
              <div className="fade-up-4" style={glass}>
                <div style={{ position: "absolute", top: 0, left: "8%", right: "8%", height: 1, background: `linear-gradient(90deg, transparent, rgba(239,68,68,0.5), transparent)` }} />
                <div style={{ padding: "1.75rem 2rem" }}>
                  <p style={{ fontSize: 10, fontWeight: 800, color: mu, letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 16 }}>Error responses</p>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 10 }}>
                    {[
                      { code: "401", msg: "Unauthorized",   desc: "No active session" },
                      { code: "422", msg: "Unprocessable",  desc: "Zod validation failed" },
                      { code: "503", msg: "Service Error",  desc: "OpenAI down, no cached fallback" },
                      { code: "202", msg: "Accepted",       desc: "Generation in progress, retry" },
                    ].map(e => (
                      <div key={e.code} style={{ padding: "14px 16px", borderRadius: 14, background: "rgba(255,255,255,0.03)", border: `1px solid ${bd}` }}>
                        <p style={{ fontSize: 20, fontWeight: 900, color: "#EF4444", fontFamily: "monospace", marginBottom: 5 }}>{e.code}</p>
                        <p style={{ fontSize: 12, fontWeight: 700, color: tx, marginBottom: 4 }}>{e.msg}</p>
                        <p style={{ fontSize: 11, color: mu, lineHeight: 1.5 }}>{e.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* FOOTER */}
        <footer style={{ background: `${theme.bg1}F5`, backdropFilter: "blur(24px)", borderTop: `1px solid ${bd}`, padding: "1.5rem 2.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <span style={{ fontFamily: "var(--fp)", fontSize: 14, fontWeight: 700, color: acc }}>Movie Memory</span>
          <span style={{ fontSize: 11, color: mu, letterSpacing: "0.03em" }}>Next.js 15 · Prisma · PostgreSQL · OpenAI · NextAuth v5</span>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#22C55E", boxShadow: "0 0 8px rgba(34,197,94,0.7)", animation: "glow-pulse 2s infinite" }} />
            <span style={{ fontSize: 11, color: mu }}>All systems operational</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
