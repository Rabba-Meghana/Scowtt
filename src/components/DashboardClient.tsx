"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { signOut } from "next-auth/react";
import Image from "next/image";
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
  // ── Movie editing state ────────────────────────────────────────────────────
  const [movie,       setMovie]       = useState(user.favoriteMovie ?? "");
  const [editValue,   setEditValue]   = useState("");
  const [isEditing,   setIsEditing]   = useState(false);
  const [isSaving,    setIsSaving]    = useState(false);
  const [movieError,  setMovieError]  = useState<string | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  // ── Fact state ─────────────────────────────────────────────────────────────
  const [fact,        setFact]        = useState<FactResponse | null>(null);
  const [factLoading, setFactLoading] = useState(true);
  const [factError,   setFactError]   = useState<string | null>(null);

  // ── Load fact on mount ─────────────────────────────────────────────────────
  const loadFact = useCallback(async (forceRefresh = false) => {
    if (!movie) return;

    // Check client-side 30-second cache first
    if (!forceRefresh) {
      const cached = getCachedFact(movie);
      if (cached) {
        setFact(cached);
        setFactLoading(false);
        return;
      }
    }

    setFactLoading(true);
    setFactError(null);

    const result = await getFact();

    if (result.ok) {
      setCachedFact(movie, result.data);
      setFact(result.data);
    } else {
      setFactError(result.error.message);
    }

    setFactLoading(false);
  }, [movie]);

  useEffect(() => {
    loadFact();
  }, [loadFact]);

  // Focus edit input when editing starts
  useEffect(() => {
    if (isEditing) editInputRef.current?.focus();
  }, [isEditing]);

  // ── Movie edit handlers ────────────────────────────────────────────────────
  function startEdit() {
    setEditValue(movie);
    setMovieError(null);
    setIsEditing(true);
  }

  function cancelEdit() {
    setIsEditing(false);
    setMovieError(null);
  }

  async function saveEdit() {
    const trimmed = editValue.trim();
    if (!trimmed) {
      setMovieError("Movie name cannot be empty.");
      return;
    }
    if (trimmed.length > 200) {
      setMovieError("Movie name must be 200 characters or fewer.");
      return;
    }

    setIsSaving(true);
    setMovieError(null);

    // Optimistic update
    const previous = movie;
    setMovie(trimmed);
    setIsEditing(false);

    const result = await updateMovie(trimmed);

    if (!result.ok) {
      // Revert on failure
      setMovie(previous);
      setIsEditing(true);
      setEditValue(trimmed);
      setMovieError(result.error.message);
    } else {
      // Invalidate fact cache — movie changed
      invalidateFactCache();
      setFact(null);
      loadFact();
    }

    setIsSaving(false);
  }

  // ── Avatar helper ──────────────────────────────────────────────────────────
  const initials = (user.name ?? user.email)
    .split(" ")
    .map(w => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const firstName = user.name?.split(" ")[0] ?? "there";

  // ── Relative time ──────────────────────────────────────────────────────────
  function relativeTime(iso: string) {
    const diffMs = Date.now() - new Date(iso).getTime();
    const secs   = Math.floor(diffMs / 1000);
    if (secs < 60)  return "just now";
    const mins = Math.floor(secs / 60);
    if (mins < 60)  return `${mins}m ago`;
    const hrs  = Math.floor(mins / 60);
    if (hrs  < 24)  return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  return (
    <div className="page-bg min-h-screen">
      {/* ── Top nav ── */}
      <header
        style={{
          background:    "var(--bg-card)",
          borderBottom:  "1px solid var(--border-base)",
          padding:       "0 1.5rem",
          height:        "58px",
          display:       "flex",
          alignItems:    "center",
          gap:           "12px",
          position:      "sticky",
          top:           0,
          zIndex:        10,
        }}
      >
        {/* Avatar */}
        <div className="avatar" style={{ width: 34, height: 34 }}>
          {user.image ? (
            <Image
              src={user.image}
              alt={user.name ?? "Profile"}
              width={34}
              height={34}
              style={{ borderRadius: "50%", objectFit: "cover" }}
            />
          ) : (
            <span style={{ fontSize: 12 }}>{initials}</span>
          )}
        </div>

        {/* Greeting */}
        <span style={{ flex: 1, fontWeight: 500, fontSize: 15, color: "var(--text-primary)" }}>
          Welcome back,{" "}
          <span style={{ color: "var(--gold-accent)" }}>{firstName}!</span>
        </span>

        {/* User pill */}
        <div
          style={{
            display:      "flex",
            alignItems:   "center",
            gap:          "6px",
            padding:      "4px 12px",
            borderRadius: "8px",
            background:   "var(--bg-surface)",
            border:       "1px solid var(--border-base)",
            fontSize:     "12px",
            color:        "var(--text-muted)",
          }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <circle cx="6" cy="4" r="2.5" stroke="var(--text-muted)" strokeWidth="1"/>
            <path d="M1 11c0-2.76 2.24-5 5-5s5 2.24 5 5" stroke="var(--text-muted)" strokeWidth="1" strokeLinecap="round"/>
          </svg>
          {user.name ?? user.email}
        </div>

        {/* Logout */}
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="btn-primary"
          style={{ padding: "6px 14px", fontSize: "12px" }}
        >
          Logout
        </button>
      </header>

      {/* ── Main content ── */}
      <main className="max-w-2xl mx-auto px-4 py-8 stagger">

        {/* ── Movie card ── */}
        <div className="card animate-slide-up mb-5">
          {/* Movie header */}
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1 min-w-0">
              <p className="label-gold mb-1">Favourite Movie</p>

              {isEditing ? (
                /* ── Edit mode ── */
                <div>
                  <input
                    ref={editInputRef}
                    type="text"
                    value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter")  saveEdit();
                      if (e.key === "Escape") cancelEdit();
                    }}
                    className="input-field mb-2"
                    maxLength={200}
                    placeholder="Enter movie name…"
                  />
                  {movieError && (
                    <p style={{ fontSize: 12, color: "var(--gold-accent)", marginBottom: 8 }}>
                      {movieError}
                    </p>
                  )}
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={saveEdit}
                      disabled={isSaving || editValue.trim().length === 0}
                      className="btn-primary"
                      style={{ fontSize: "12px", padding: "6px 14px" }}
                    >
                      {isSaving ? "Saving…" : "Save"}
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="btn-ghost"
                      style={{ fontSize: "12px", padding: "6px 14px" }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                /* ── Display mode ── */
                <h2
                  className="font-display"
                  style={{
                    fontSize:   "clamp(22px, 4vw, 28px)",
                    fontWeight: 700,
                    color:      "var(--text-primary)",
                    lineHeight: 1.2,
                  }}
                >
                  {movie || "No movie set"}
                </h2>
              )}
            </div>

            {/* Edit button — only in display mode */}
            {!isEditing && (
              <button
                onClick={startEdit}
                style={{
                  display:      "flex",
                  alignItems:   "center",
                  gap:          "5px",
                  padding:      "6px 12px",
                  borderRadius: "8px",
                  background:   "var(--bg-surface)",
                  border:       "1px solid var(--border-base)",
                  color:        "var(--text-muted)",
                  fontSize:     "12px",
                  fontWeight:   500,
                  cursor:       "pointer",
                  flexShrink:   0,
                  fontFamily:   "var(--font-dm-sans)",
                }}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M8.5 1.5L10.5 3.5L4 10H2V8L8.5 1.5Z" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Edit
              </button>
            )}
          </div>

          <div className="divider" />

          {/* ── Fact section ── */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="7" r="6" stroke="var(--gold-accent)" strokeWidth="1"/>
                <path d="M7 6v4M7 4.5v.5" stroke="var(--gold-accent)" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)" }}>
                Recent Fact
              </span>
              <span
                style={{
                  fontSize:   11,
                  color:      "var(--text-muted)",
                  padding:    "1px 7px",
                  borderRadius: 4,
                  background: "var(--bg-surface)",
                  border:     "1px solid var(--border-subtle)",
                }}
              >
                OpenAI
              </span>
              {fact?.cached && (
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>· cached</span>
              )}
              {fact && (
                <span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: "auto" }}>
                  {relativeTime(fact.generatedAt)}
                </span>
              )}
            </div>

            {/* Fact body */}
            {factLoading ? (
              /* Skeleton */
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div className="skeleton" style={{ height: 14, width: "100%", borderRadius: 6 }} />
                <div className="skeleton" style={{ height: 14, width: "90%",  borderRadius: 6 }} />
                <div className="skeleton" style={{ height: 14, width: "70%",  borderRadius: 6 }} />
              </div>
            ) : factError ? (
              <div
                style={{
                  padding:      "12px 14px",
                  borderRadius: "10px",
                  background:   "var(--bg-surface)",
                  border:       "1px solid var(--border-base)",
                  fontSize:     "13px",
                  color:        "var(--text-muted)",
                }}
              >
                {factError}
              </div>
            ) : fact ? (
              <p
                style={{
                  fontSize:   "14px",
                  lineHeight: 1.7,
                  color:      "var(--text-primary)",
                  padding:    "12px 14px",
                  borderRadius: "10px",
                  background: "var(--bg-surface)",
                  border:     "1px solid var(--border-subtle)",
                }}
              >
                {fact.factText}
              </p>
            ) : null}

            {/* Refresh button */}
            {!factLoading && movie && (
              <button
                onClick={() => loadFact(true)}
                className="btn-ghost mt-3"
                style={{ fontSize: "12px", padding: "6px 14px" }}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M10.5 6A4.5 4.5 0 1 1 6 1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                  <path d="M10.5 1.5V4.5H7.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                New fact
              </button>
            )}
          </div>
        </div>

        {/* ── Profile info card ── */}
        <div className="card animate-slide-up">
          <p className="label-gold mb-4">Profile</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {/* Name */}
            {user.name && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 13, color: "var(--text-muted)" }}>Name</span>
                <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>
                  {user.name}
                </span>
              </div>
            )}
            <div className="divider" style={{ margin: 0 }} />
            {/* Email */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 13, color: "var(--text-muted)" }}>Email</span>
              <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{user.email}</span>
            </div>
            <div className="divider" style={{ margin: 0 }} />
            {/* Movie */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 13, color: "var(--text-muted)" }}>Favourite movie</span>
              <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>
                {movie || "—"}
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
