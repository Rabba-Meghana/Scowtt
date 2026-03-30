"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveMovie } from "@/lib/actions";

export default function OnboardingForm() {
  const [movie, setMovie]             = useState("");
  const [error, setError]             = useState<string | null>(null);
  const [isPending, startTransition]  = useTransition();
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(null);
    startTransition(async () => {
      const result = await saveMovie(movie);
      if (result.error) setError(result.error);
      else router.push("/dashboard");
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-3)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>Your favourite movie</label>
      <input type="text" value={movie} onChange={e => setMovie(e.target.value)}
        placeholder="e.g. The Shawshank Redemption"
        style={{ width: "100%", padding: "14px 18px", borderRadius: 14, marginBottom: 8, background: "rgba(200,146,10,0.06)", border: "1.5px solid rgba(200,146,10,0.25)", color: "var(--text)", fontSize: 16, outline: "none", fontFamily: "var(--ff)", transition: "border-color 0.2s" }}
        onFocus={e => e.currentTarget.style.borderColor = "var(--gold)"}
        onBlur={e => e.currentTarget.style.borderColor = "rgba(200,146,10,0.25)"}
        maxLength={200} autoFocus autoComplete="off"
      />
      <p style={{ fontSize: 11, color: "var(--text-3)", textAlign: "right", marginBottom: 16 }}>{movie.length} / 200</p>
      {error && <div style={{ padding: "12px 16px", borderRadius: 10, background: "rgba(200,146,10,0.08)", border: "1px solid rgba(200,146,10,0.2)", color: "var(--text-2)", fontSize: 13, marginBottom: 16 }}>{error}</div>}
      <button type="submit" disabled={isPending || movie.trim().length === 0} className="btn-gold" style={{ width: "100%", padding: "14px", fontSize: 15, opacity: (isPending || movie.trim().length === 0) ? 0.5 : 1 }}>
        {isPending ? "Saving…" : "Let's go →"}
      </button>
    </form>
  );
}
