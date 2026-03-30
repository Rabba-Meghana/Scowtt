"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { signOut } from "next-auth/react";
import {
  updateMovie,
  getFact,
  getCachedFact,
  setCachedFact,
  invalidateFactCache,
  type FactResponse,
} from "@/lib/api";

interface User {
  id:            string;
  name:          string | null;
  email:         string;
  image:         string | null;
  favoriteMovie: string | null;
}

export default function DashboardClient({ user }: { user: User }) {
  const [movie,       setMovie]       = useState(user.favoriteMovie ?? "");
  const [editValue,   setEditValue]   = useState("");
  const [isEditing,   setIsEditing]   = useState(false);
  const [isSaving,    setIsSaving]    = useState(false);
  const [movieError,  setMovieError]  = useState<string | null>(null);
  const [fact,        setFact]        = useState<FactResponse | null>(null);
  const [factLoading, setFactLoading] = useState(true);
  const [factError,   setFactError]   = useState<string | null>(null);
  const [dark,        setDark]        = useState(false);
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem("mm-dark");
    if (saved === "true") { setDark(true); document.documentElement.classList.add("dark"); }
  }, []);

  function toggleDark() {
    setDark(d => {
      const next = !d;
      if (next) document.documentElement.classList.add("dark");
      else      document.documentElement.classList.remove("dark");
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
    const previous = movie;
    setMovie(trimmed); setIsEditing(false);
    const result = await updateMovie(trimmed);
    if (!result.ok) {
      setMovie(previous); setIsEditing(true); setEditValue(trimmed);
      setMovieError(result.error.message);
    } else {
      invalidateFactCache(); setFact(null); loadFact();
    }
    setIsSaving(false);
  }

  const initials = (user.name ?? user.email).split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
  const firstName = user.name?.split(" ")[0] ?? "there";

  function relativeTime(iso: string) {
    const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (s < 60) return "just now";
    if (s < 3600) return `${Math.floor(s/60)}m ago`;
    if (s < 86400) return `${Math.floor(s/3600)}h ago`;
    return `${Math.floor(s/86400)}d ago`;
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-page)", fontFamily: "var(--font-dm-sans)" }}>

      {/* ── NAV ── */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "var(--bg-card)", borderBottom: "1px solid var(--border-base)",
        height: 60, display: "flex", alignItems: "center",
        padding: "0 2rem", gap: 14,
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginRight: 8 }}>
          <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
            <circle cx="16" cy="16" r="13" stroke="var(--gold-accent)" strokeWidth="1.5"/>
            <circle cx="16" cy="16" r="4" fill="var(--gold-accent)" opacity="0.2"/>
            <circle cx="16" cy="16" r="2" fill="var(--gold-accent)"/>
            <circle cx="16" cy="7"  r="2.2" fill="var(--gold-accent)" opacity="0.7"/>
            <circle cx="16" cy="25" r="2.2" fill="var(--gold-accent)" opacity="0.7"/>
            <circle cx="7"  cy="16" r="2.2" fill="var(--gold-accent)" opacity="0.7"/>
            <circle cx="25" cy="16" r="2.2" fill="var(--gold-accent)" opacity="0.7"/>
            <circle cx="9.5"  cy="9.5"  r="1.8" fill="var(--gold-accent)" opacity="0.4"/>
            <circle cx="22.5" cy="9.5"  r="1.8" fill="var(--gold-accent)" opacity="0.4"/>
            <circle cx="9.5"  cy="22.5" r="1.8" fill="var(--gold-accent)" opacity="0.4"/>
            <circle cx="22.5" cy="22.5" r="1.8" fill="var(--gold-accent)" opacity="0.4"/>
          </svg>
          <span style={{ fontFamily: "var(--font-playfair)", fontSize: 17, fontWeight: 700, color: "var(--gold-accent)" }}>
            Movie Memory
          </span>
        </div>

        <div style={{ flex: 1 }} />

        {/* Dark mode toggle */}
        <button onClick={toggleDark} style={{
          width: 38, height: 38, borderRadius: "50%", border: "1px solid var(--border-base)",
          background: "var(--bg-surface)", cursor: "pointer", display: "flex",
          alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          {dark ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="5" stroke="var(--gold-accent)" strokeWidth="1.5"/>
              <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" stroke="var(--gold-accent)" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </button>

        {/* Avatar + name */}
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "5px 12px 5px 6px", borderRadius: 10,
          background: "var(--bg-surface)", border: "1px solid var(--border-base)",
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: "50%", overflow: "hidden",
            background: "var(--gold-light)", border: "1px solid var(--border-base)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 11, fontWeight: 600, color: "var(--gold-accent)", flexShrink: 0,
          }}>
            {user.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.image} alt={user.name ?? "avatar"} style={{ width: 28, height: 28, objectFit: "cover" }} referrerPolicy="no-referrer" />
            ) : initials}
          </div>
          <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>
            {user.name ?? user.email}
          </span>
        </div>

        {/* Logout */}
        <button onClick={() => signOut({ callbackUrl: "/" })} className="btn-primary" style={{ padding: "7px 16px", fontSize: 13 }}>
          Logout
        </button>
      </nav>

      {/* ── HERO GREETING ── */}
      <div style={{
        background: "linear-gradient(180deg, var(--bg-surface-2) 0%, var(--bg-page) 100%)",
        borderBottom: "1px solid var(--border-subtle)",
        padding: "3rem 2rem 2.5rem",
        textAlign: "center",
      }}>
        <p style={{ fontSize: 13, fontWeight: 500, color: "var(--text-accent)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>
          Your personal cinema
        </p>
        <h1 style={{ fontFamily: "var(--font-playfair)", fontSize: "clamp(28px, 5vw, 42px)", fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.15, marginBottom: 10 }}>
          Welcome back, <span style={{ color: "var(--gold-accent)" }}>{firstName}!</span>
        </h1>
        <p style={{ fontSize: 14, color: "var(--text-muted)", maxWidth: 400, margin: "0 auto" }}>
          Discover fascinating facts about the films you love
        </p>
      </div>

      {/* ── MAIN GRID ── */}
      <main style={{ maxWidth: 1000, margin: "0 auto", padding: "2.5rem 1.5rem", display: "grid", gridTemplateColumns: "1fr 340px", gap: "1.5rem", alignItems: "start" }}>

        {/* LEFT — Movie + Fact */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

          {/* Movie card */}
          <div className="card animate-slide-up" style={{ padding: "1.75rem" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 20 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p className="label-gold" style={{ marginBottom: 8 }}>Favourite Movie</p>
                {isEditing ? (
                  <div>
                    <input
                      ref={editInputRef}
                      type="text"
                      value={editValue}
                      onChange={e => setEditValue(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") cancelEdit(); }}
                      className="input-field"
                      maxLength={200}
                      placeholder="Enter movie name…"
                      style={{ marginBottom: 10, fontSize: 15 }}
                    />
                    {movieError && <p style={{ fontSize: 12, color: "var(--gold-accent)", marginBottom: 10 }}>{movieError}</p>}
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={saveEdit} disabled={isSaving || editValue.trim().length === 0} className="btn-primary" style={{ fontSize: 13, padding: "7px 16px" }}>
                        {isSaving ? "Saving…" : "Save"}
                      </button>
                      <button onClick={cancelEdit} className="btn-ghost" style={{ fontSize: 13, padding: "7px 16px" }}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <h2 style={{ fontFamily: "var(--font-playfair)", fontSize: "clamp(24px, 4vw, 34px)", fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.2 }}>
                    {movie || "No movie set"}
                  </h2>
                )}
              </div>
              {!isEditing && (
                <button onClick={startEdit} style={{
                  display: "flex", alignItems: "center", gap: 5,
                  padding: "7px 14px", borderRadius: 8,
                  background: "var(--bg-surface)", border: "1px solid var(--border-base)",
                  color: "var(--text-muted)", fontSize: 12, fontWeight: 500,
                  cursor: "pointer", flexShrink: 0, fontFamily: "var(--font-dm-sans)",
                  transition: "all 0.15s",
                }}>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M8.5 1.5L10.5 3.5L4 10H2V8L8.5 1.5Z" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Edit
                </button>
              )}
            </div>

            {/* Divider */}
            <div style={{ height: 1, background: "var(--border-subtle)", margin: "0 0 20px" }} />

            {/* Fact */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <circle cx="7" cy="7" r="6" stroke="var(--gold-accent)" strokeWidth="1"/>
                  <path d="M7 6v4M7 4.5v.5" stroke="var(--gold-accent)" strokeWidth="1.2" strokeLinecap="round"/>
                </svg>
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)" }}>Recent Fact</span>
                <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 5, background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", color: "var(--text-muted)" }}>OpenAI</span>
                {fact?.cached && <span style={{ fontSize: 11, color: "var(--text-muted)" }}>· cached</span>}
                {fact && <span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: "auto" }}>{relativeTime(fact.generatedAt)}</span>}
              </div>

              {factLoading ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {[100, 92, 78].map((w, i) => (
                    <div key={i} className="skeleton" style={{ height: 14, width: `${w}%`, borderRadius: 6 }} />
                  ))}
                </div>
              ) : factError ? (
                <div style={{ padding: "14px 16px", borderRadius: 10, background: "var(--bg-surface)", border: "1px solid var(--border-base)", fontSize: 13, color: "var(--text-muted)" }}>
                  {factError}
                </div>
              ) : fact ? (
                <p style={{ fontSize: 15, lineHeight: 1.75, color: "var(--text-primary)", padding: "16px 18px", borderRadius: 10, background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}>
                  {fact.factText}
                </p>
              ) : null}

              {!factLoading && movie && (
                <button onClick={() => loadFact(true)} className="btn-ghost" style={{ marginTop: 14, fontSize: 13, padding: "7px 16px" }}>
                  <svg width="13" height="13" viewBox="0 0 12 12" fill="none" style={{ marginRight: 4 }}>
                    <path d="M10.5 6A4.5 4.5 0 1 1 6 1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                    <path d="M10.5 1.5V4.5H7.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  New fact
                </button>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT — Profile card */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

          {/* Profile card */}
          <div className="card animate-slide-up" style={{ padding: "1.5rem" }}>
            {/* Avatar large */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingBottom: 20, marginBottom: 20, borderBottom: "1px solid var(--border-subtle)" }}>
              <div style={{
                width: 72, height: 72, borderRadius: "50%", overflow: "hidden",
                background: "var(--gold-light)", border: "2px solid var(--border-base)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 24, fontWeight: 700, color: "var(--gold-accent)",
                marginBottom: 12,
              }}>
                {user.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.image} alt={user.name ?? "avatar"} style={{ width: 72, height: 72, objectFit: "cover" }} referrerPolicy="no-referrer" />
                ) : initials}
              </div>
              <p style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", marginBottom: 3 }}>{user.name ?? "—"}</p>
              <p style={{ fontSize: 12, color: "var(--text-muted)" }}>{user.email}</p>
            </div>

            <p className="label-gold" style={{ marginBottom: 14 }}>Profile</p>

            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {[
                { label: "Name",           value: user.name ?? "—" },
                { label: "Email",          value: user.email },
                { label: "Favourite movie", value: movie || "—" },
              ].map((row, i, arr) => (
                <div key={row.label}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 0" }}>
                    <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{row.label}</span>
                    <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)", maxWidth: 160, textAlign: "right", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.value}</span>
                  </div>
                  {i < arr.length - 1 && <div style={{ height: 1, background: "var(--border-subtle)" }} />}
                </div>
              ))}
            </div>
          </div>

          {/* Stats card */}
          <div className="card animate-slide-up" style={{ padding: "1.5rem" }}>
            <p className="label-gold" style={{ marginBottom: 14 }}>Quick stats</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {[
                { label: "Facts generated", value: fact ? "1+" : "0" },
                { label: "Cache status",    value: fact?.cached ? "Cached" : "Live" },
                { label: "AI model",        value: "GPT-4o mini" },
                { label: "Auth",            value: "Google" },
              ].map(s => (
                <div key={s.label} style={{ background: "var(--bg-surface)", borderRadius: 8, padding: "10px 12px" }}>
                  <p style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>{s.label}</p>
                  <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>{s.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop: "1px solid var(--border-subtle)", padding: "1.5rem 2rem", textAlign: "center" }}>
        <p style={{ fontSize: 12, color: "var(--text-muted)", opacity: 0.6 }}>
          Movie Memory · Powered by OpenAI & Next.js
        </p>
      </footer>
    </div>
  );
}
