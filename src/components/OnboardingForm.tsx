"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveMovie } from "@/lib/actions";

export default function OnboardingForm() {
  const [movie, setMovie]            = useState("");
  const [error, setError]            = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(null);
    startTransition(async () => {
      const r = await saveMovie(movie);
      if (r.error) setError(r.error);
      else router.push("/dashboard");
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--text-3)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 12 }}>
        Your favourite movie
      </label>
      <div style={{ position: "relative" }}>
        <input
          type="text" value={movie} onChange={e => setMovie(e.target.value)}
          placeholder="e.g. The Shawshank Redemption"
          maxLength={200} autoFocus autoComplete="off"
          onFocus={e => e.currentTarget.style.borderColor = "var(--gold)"}
          onBlur={e => e.currentTarget.style.borderColor = "var(--border-s)"}
          style={{ width: "100%", padding: "15px 18px", borderRadius: 14, background: "rgba(201,148,12,0.05)", border: "1px solid var(--border-s)", color: "var(--text)", fontSize: 16, outline: "none", fontFamily: "var(--ff)", fontWeight: 300, transition: "border-color 0.2s, box-shadow 0.2s", boxShadow: "none" }}
        />
        {movie.length > 0 && (
          <div style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", width: 20, height: 20, borderRadius: "50%", background: "var(--gold)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2 2 4-4" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
        )}
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8, marginBottom: 20 }}>
        <span style={{ fontSize: 11, color: "var(--text-3)" }}>{movie.length} / 200</span>
      </div>

      {error && (
        <div style={{ padding: "12px 16px", borderRadius: 12, background: "rgba(201,148,12,0.08)", border: "1px solid rgba(201,148,12,0.2)", color: "var(--text-2)", fontSize: 13, marginBottom: 18, lineHeight: 1.5 }}>
          {error}
        </div>
      )}

      <button type="submit" disabled={isPending || movie.trim().length === 0} className="btn-gold"
        style={{ width: "100%", fontSize: 15, padding: "15px", borderRadius: 14, opacity: (isPending || !movie.trim()) ? 0.45 : 1 }}>
        {isPending ? (
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ animation: "spin 0.7s linear infinite" }}>
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="30 60"/>
            </svg>
            Saving…
          </>
        ) : "Continue to dashboard"}
      </button>
    </form>
  );
}
