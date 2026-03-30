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
  const [mounted, setMounted]         = useState(false);
  const editRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setMounted(true); }, []);

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

  if (!mounted) return null;

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "var(--black)", color: "var(--text)", fontFamily: "var(--ff)", position: "relative", overflow: "hidden" }}>

      {/* ── AMBIENT BG ── */}
      <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }}>
        <div style={{ position: "absolute", top: "-30%", left: "50%", transform: "translateX(-50%)", width: 900, height: 700, borderRadius: "50%", background: "radial-gradient(ellipse, rgba(200,146,10,0.07) 0%, transparent 65%)" }} />
        <div style={{ position: "absolute", bottom: "-20%", left: "-10%", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle, rgba(200,100,5,0.05) 0%, transparent 65%)" }} />
        <div style={{ position: "absolute", top: "40%", right: "-10%", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(200,146,10,0.04) 0%, transparent 65%)" }} />
        {/* Grid lines */}
        <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(200,146,10,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(200,146,10,0.03) 1px, transparent 1px)", backgroundSize: "60px 60px", opacity: 0.6 }} />
      </div>

      {/* ══════ NAVBAR ══════ */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 200,
        background: "rgba(8,6,4,0.92)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
        borderBottom: "1px solid rgba(200,146,10,0.12)",
        height: 64, display: "flex", alignItems: "center",
        padding: "0 clamp(1.25rem,4vw,2.5rem)", gap: 16,
      }}>
        <a href="/dashboard" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", flexShrink: 0 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(200,146,10,0.12)", border: "1px solid rgba(200,146,10,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }} className="float">
            <svg width="20" height="20" viewBox="0 0 40 40" fill="none">
              <circle cx="20" cy="20" r="16" stroke="var(--gold)" strokeWidth="1.5"/>
              <circle cx="20" cy="20" r="3" fill="var(--gold)" opacity="0.3"/>
              <circle cx="20" cy="20" r="1.6" fill="var(--gold)"/>
              <circle cx="20" cy="9"  r="2.2" fill="var(--gold)" opacity="0.7"/>
              <circle cx="20" cy="31" r="2.2" fill="var(--gold)" opacity="0.7"/>
              <circle cx="9"  cy="20" r="2.2" fill="var(--gold)" opacity="0.7"/>
              <circle cx="31" cy="20" r="2.2" fill="var(--gold)" opacity="0.7"/>
            </svg>
          </div>
          <span style={{ fontFamily: "var(--fp)", fontSize: 20, fontWeight: 700, letterSpacing: "-0.01em" }} className="gold-shimmer">Movie Memory</span>
        </a>
        <div style={{ flex: 1 }} />
        {/* Nav pill */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 16px 6px 7px", borderRadius: 50, background: "rgba(200,146,10,0.08)", border: "1px solid rgba(200,146,10,0.2)" }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", overflow: "hidden", background: "var(--black-4)", border: "1.5px solid rgba(200,146,10,0.4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "var(--gold)", flexShrink: 0 }}>
            {user.image ? <img src={user.image + "?sz=64"} alt="av" referrerPolicy="no-referrer" style={{ width: 32, height: 32, objectFit: "cover", display: "block" }} /> : initials}
          </div>
          <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-2)", maxWidth: 130, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.name ?? user.email}</span>
        </div>
        <button onClick={() => signOut({ callbackUrl: "/" })} className="btn-gold" style={{ padding: "9px 20px", fontSize: 13, animation: "none" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Logout
        </button>
      </nav>

      {/* ══════ HERO ══════ */}
      <div style={{ position: "relative", zIndex: 1, padding: "clamp(3rem,8vw,6rem) clamp(1.25rem,4vw,2.5rem) clamp(2rem,5vw,4rem)", textAlign: "center", borderBottom: "1px solid rgba(200,146,10,0.08)" }}>
        {/* Floating avatar with rings */}
        <div style={{ position: "relative", display: "inline-block", marginBottom: 32 }} className="float">
          <div style={{ position: "absolute", inset: -16, borderRadius: "50%", border: "1px solid rgba(200,146,10,0.15)", animation: "glow-pulse 3s ease-in-out infinite" }} />
          <div style={{ position: "absolute", inset: -8, borderRadius: "50%", border: "1px solid rgba(200,146,10,0.25)" }} />
          <div style={{ width: 100, height: 100, borderRadius: "50%", overflow: "hidden", background: "var(--black-4)", border: "2px solid rgba(200,146,10,0.5)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, fontWeight: 900, color: "var(--gold)", boxShadow: "0 0 40px rgba(200,146,10,0.3), inset 0 0 20px rgba(200,146,10,0.05)" }}>
            {user.image ? <img src={user.image + "?sz=200"} alt="profile" referrerPolicy="no-referrer" style={{ width: 100, height: 100, objectFit: "cover", display: "block" }} /> : initials}
          </div>
        </div>
        <div className="fade-up">
          <p style={{ fontSize: 11, fontWeight: 600, color: "var(--gold-dim)", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 16 }}>✦ Your personal cinema ✦</p>
          <h1 style={{ fontFamily: "var(--fp)", fontSize: "clamp(40px,8vw,80px)", fontWeight: 900, lineHeight: 1.0, marginBottom: 16, letterSpacing: "-0.02em" }}>
            <span style={{ display: "block", color: "var(--text)" }}>Welcome back,</span>
            <span className="gold-shimmer" style={{ display: "block" }}>{firstName}!</span>
          </h1>
          <p style={{ fontSize: 15, color: "var(--text-3)", maxWidth: 500, margin: "0 auto" }}>{user.email}</p>
        </div>

        {/* Floating particles */}
        {[...Array(6)].map((_, i) => (
          <div key={i} style={{
            position: "absolute", width: 4, height: 4, borderRadius: "50%", background: "var(--gold)",
            top: `${20 + Math.random() * 60}%`, left: `${10 + i * 15}%`,
            opacity: 0.4, animation: `particle ${3 + i * 0.5}s ${i * 0.3}s ease-out infinite`,
          }} />
        ))}
      </div>

      {/* ══════ MAIN GRID ══════ */}
      <main style={{ flex: 1, maxWidth: 1040, width: "100%", margin: "0 auto", padding: "clamp(2rem,4vw,3rem) clamp(1.25rem,4vw,1.5rem)", display: "grid", gridTemplateColumns: "minmax(0,1fr) 310px", gap: "1.5rem", alignItems: "start", position: "relative", zIndex: 1 }}>

        {/* ── LEFT ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

          {/* MOVIE CARD */}
          <div className="glass fade-up" style={{ padding: "clamp(1.5rem,4vw,2.25rem)" }}>
            {/* Label row */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: "rgba(200,146,10,0.12)", border: "1px solid rgba(200,146,10,0.25)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" stroke="var(--gold)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", letterSpacing: "0.14em", textTransform: "uppercase" }}>Favourite Movie</span>
              </div>
              {!isEditing && (
                <button onClick={startEdit} className="btn-ghost" style={{ padding: "7px 16px", fontSize: 12 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  Edit
                </button>
              )}
            </div>

            {isEditing ? (
              <div>
                <input ref={editRef} type="text" value={editValue} onChange={e => setEditValue(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") cancelEdit(); }}
                  placeholder="e.g. The Shawshank Redemption" maxLength={200}
                  style={{ width: "100%", padding: "14px 18px", borderRadius: 14, marginBottom: 12, background: "rgba(200,146,10,0.06)", border: "1.5px solid var(--gold)", color: "var(--text)", fontSize: 16, outline: "none", fontFamily: "var(--ff)", boxShadow: "0 0 0 4px rgba(200,146,10,0.08)" }}
                />
                {movieError && <p style={{ fontSize: 12, color: "var(--gold-light)", marginBottom: 12 }}>{movieError}</p>}
                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={saveEdit} disabled={isSaving || !editValue.trim()} className="btn-gold" style={{ opacity: (isSaving || !editValue.trim()) ? 0.5 : 1 }}>
                    {isSaving ? <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ animation: "spin 0.7s linear infinite" }}><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="30 60"/></svg>Saving…</> : "Save changes"}
                  </button>
                  <button onClick={cancelEdit} className="btn-ghost">Cancel</button>
                </div>
              </div>
            ) : (
              <div>
                <h2 style={{ fontFamily: "var(--fp)", fontSize: "clamp(28px,5vw,52px)", fontWeight: 900, lineHeight: 1.1, marginBottom: 8, letterSpacing: "-0.01em" }} className="gold-shimmer">
                  {movie || "No movie set yet"}
                </h2>
                {movie && <p style={{ fontSize: 13, color: "var(--text-3)" }}>AI facts powered by <span style={{ color: "var(--gold)", fontWeight: 600 }}>OpenAI GPT-4o mini</span></p>}
              </div>
            )}

            <div style={{ height: 1, background: "linear-gradient(90deg, transparent, rgba(200,146,10,0.3), transparent)", margin: "24px 0" }} />

            {/* FACT */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="var(--gold)" strokeWidth="1.8"/><path d="M12 16v-4M12 8h.01" stroke="var(--gold)" strokeWidth="2.2" strokeLinecap="round"/></svg>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-2)" }}>Recent Fact</span>
              <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, background: "rgba(200,146,10,0.12)", color: "var(--gold)", fontWeight: 600, border: "1px solid rgba(200,146,10,0.25)", letterSpacing: "0.03em" }}>OpenAI</span>
              {fact?.cached && <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, border: "1px solid rgba(200,146,10,0.15)", color: "var(--text-3)" }}>cached</span>}
              {fact && <span style={{ fontSize: 12, color: "var(--text-3)", marginLeft: "auto" }}>{timeAgo(fact.generatedAt)}</span>}
            </div>

            {factLoading ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {[100, 90, 78, 55].map((w, i) => <div key={i} className="skel" style={{ height: 16, width: `${w}%`, animationDelay: `${i * 0.12}s` }} />)}
              </div>
            ) : factError ? (
              <div style={{ padding: "16px 20px", borderRadius: 14, background: "rgba(200,146,10,0.05)", border: "1px solid rgba(200,146,10,0.2)", color: "var(--text-3)", fontSize: 14 }}>⚠ {factError}</div>
            ) : fact ? (
              <div style={{ padding: "20px 22px", borderRadius: 16, background: "rgba(200,146,10,0.05)", border: "1px solid rgba(200,146,10,0.15)", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: 0, left: 0, width: 3, height: "100%", background: "linear-gradient(180deg, var(--gold-bright), var(--gold-dim))", borderRadius: "3px 0 0 3px" }} />
                <p style={{ fontSize: 15, lineHeight: 1.85, color: "var(--text)", paddingLeft: 6, fontWeight: 300 }}>{fact.factText}</p>
              </div>
            ) : null}

            {!factLoading && movie && (
              <button onClick={() => loadFact(true)} className="btn-ghost" style={{ marginTop: 18 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M23 4v6h-6M1 20v-6h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Generate new fact
              </button>
            )}
          </div>

          {/* FACT HISTORY */}
          {factHistory.length > 1 && (
            <div className="glass fade-up-2" style={{ padding: "1.75rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                <div style={{ width: 30, height: 30, borderRadius: 9, background: "rgba(200,146,10,0.1)", border: "1px solid rgba(200,146,10,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="var(--gold)" strokeWidth="1.8"/><path d="M12 6v6l4 2" stroke="var(--gold)" strokeWidth="2" strokeLinecap="round"/></svg>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", letterSpacing: "0.14em", textTransform: "uppercase" }}>Fact history this session</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {factHistory.slice(1).map((f, i) => (
                  <div key={i} style={{ padding: "14px 18px", borderRadius: 14, background: "rgba(200,146,10,0.04)", border: "1px solid rgba(200,146,10,0.1)", display: "flex", gap: 14 }}>
                    <div style={{ width: 2, borderRadius: 2, background: "var(--gold-dim)", flexShrink: 0, opacity: 0.6 }} />
                    <div>
                      <p style={{ fontSize: 14, color: "var(--text)", lineHeight: 1.7, fontWeight: 300 }}>{f.factText}</p>
                      <p style={{ fontSize: 11, color: "var(--text-3)", marginTop: 6 }}>{timeAgo(f.generatedAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

          {/* PROFILE CARD */}
          <div className="glass fade-up-2" style={{ padding: "1.75rem", textAlign: "center" }}>
            <div style={{ position: "relative", display: "inline-block", marginBottom: 16 }}>
              <div style={{ position: "absolute", inset: -6, borderRadius: "50%", border: "1px solid rgba(200,146,10,0.2)", animation: "glow-pulse 4s ease-in-out infinite" }} />
              <div style={{ width: 72, height: 72, borderRadius: "50%", overflow: "hidden", background: "var(--black-4)", border: "2px solid rgba(200,146,10,0.4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 800, color: "var(--gold)", boxShadow: "0 0 24px rgba(200,146,10,0.2)" }}>
                {user.image ? <img src={user.image + "?sz=144"} alt="pf" referrerPolicy="no-referrer" style={{ width: 72, height: 72, objectFit: "cover", display: "block" }} /> : initials}
              </div>
            </div>
            <p style={{ fontFamily: "var(--fp)", fontSize: 18, fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>{user.name ?? "—"}</p>
            <p style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 20 }}>{user.email}</p>
            <div style={{ height: 1, background: "linear-gradient(90deg, transparent, rgba(200,146,10,0.2), transparent)", marginBottom: 20 }} />
            <div style={{ textAlign: "left" }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 14 }}>Profile</p>
              {[{ l: "Name", v: user.name ?? "—" }, { l: "Email", v: user.email }, { l: "Movie", v: movie || "—" }].map((r, i, a) => (
                <div key={r.l}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 0" }}>
                    <span style={{ fontSize: 12, color: "var(--text-3)" }}>{r.l}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "right" }}>{r.v}</span>
                  </div>
                  {i < a.length - 1 && <div style={{ height: 1, background: "rgba(200,146,10,0.08)" }} />}
                </div>
              ))}
            </div>
          </div>

          {/* STATS */}
          <div className="glass fade-up-3" style={{ padding: "1.5rem" }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 16 }}>Tech stack</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {[
                { l: "AI", v: "GPT-4o mini", e: "🤖" },
                { l: "Auth", v: "Google", e: "🔐" },
                { l: "Database", v: "PostgreSQL", e: "🗄️" },
                { l: "Cache", v: fact?.cached ? "Hit ✓" : "Live ↻", e: "⚡" },
              ].map(s => (
                <div key={s.l} style={{ background: "rgba(200,146,10,0.05)", border: "1px solid rgba(200,146,10,0.1)", borderRadius: 14, padding: "14px" }}>
                  <div style={{ fontSize: 22, marginBottom: 8 }}>{s.e}</div>
                  <p style={{ fontSize: 10, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 3 }}>{s.l}</p>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{s.v}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* ══════ HOW IT WORKS ══════ */}
      <div style={{ position: "relative", zIndex: 1, borderTop: "1px solid rgba(200,146,10,0.08)", padding: "clamp(3rem,6vw,5rem) clamp(1.25rem,4vw,2.5rem)" }}>
        <div style={{ maxWidth: 1040, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "clamp(2rem,4vw,3.5rem)" }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 12 }}>✦ The Process ✦</p>
            <h2 style={{ fontFamily: "var(--fp)", fontSize: "clamp(28px,5vw,48px)", fontWeight: 900 }} className="gold-shimmer">How it works</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "1.5rem" }}>
            {[
              { n: "01", icon: "🔐", t: "Sign in securely", d: "Google OAuth authenticates your identity. We only access your name, email, and profile photo — nothing else." },
              { n: "02", icon: "🎬", t: "Pick your film", d: "Save your all-time favourite movie. Edit it anytime — your fact cache invalidates automatically when you change it." },
              { n: "03", icon: "✨", t: "Discover AI facts", d: "GPT-4o mini generates a fascinating, little-known fact about your movie. Results cache for 30 seconds server-side." },
            ].map((s, i) => (
              <div key={s.n} className="glass" style={{ padding: "2rem", display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 32 }}>{s.icon}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "rgba(200,146,10,0.4)", letterSpacing: "0.1em" }}>{s.n}</span>
                </div>
                <h3 style={{ fontFamily: "var(--fp)", fontSize: 20, fontWeight: 700, color: "var(--text)", lineHeight: 1.25 }}>{s.t}</h3>
                <p style={{ fontSize: 13, color: "var(--text-3)", lineHeight: 1.75, fontWeight: 300 }}>{s.d}</p>
                <div style={{ height: 1, background: `linear-gradient(90deg, rgba(200,146,10,0.3), transparent)` }} />
                <span style={{ fontSize: 11, color: "var(--gold)", fontWeight: 600, letterSpacing: "0.05em" }}>Step {i + 1} of 3 →</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══════ FOOTER ══════ */}
      <footer style={{ position: "relative", zIndex: 1, background: "rgba(8,6,4,0.95)", backdropFilter: "blur(20px)", borderTop: "1px solid rgba(200,146,10,0.12)", padding: "2rem clamp(1.25rem,4vw,2.5rem)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <svg width="20" height="20" viewBox="0 0 40 40" fill="none"><circle cx="20" cy="20" r="14" stroke="var(--gold)" strokeWidth="1.5" opacity="0.6"/><circle cx="20" cy="20" r="2.2" fill="var(--gold)" opacity="0.8"/></svg>
          <span style={{ fontFamily: "var(--fp)", fontSize: 15, fontWeight: 700, color: "var(--text-2)" }}>Movie Memory</span>
        </div>
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
          {["Next.js 15", "Prisma", "PostgreSQL", "OpenAI", "NextAuth v5"].map(t => (
            <span key={t} style={{ fontSize: 12, color: "var(--text-3)", fontWeight: 400 }}>{t}</span>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#22C55E", boxShadow: "0 0 8px rgba(34,197,94,0.6)" }} />
          <span style={{ fontSize: 12, color: "var(--text-3)", fontWeight: 500 }}>All systems operational</span>
        </div>
      </footer>
    </div>
  );
}
