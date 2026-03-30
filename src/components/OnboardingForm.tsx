"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveMovie } from "@/lib/actions";

export default function OnboardingForm() {
  const [movie, setMovie]       = useState("");
  const [error, setError]       = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await saveMovie(movie);
      if (result.error) {
        setError(result.error);
      } else {
        router.push("/dashboard");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="mb-5">
        <label
          htmlFor="movie"
          className="block mb-2"
          style={{ fontSize: "13px", fontWeight: 500, color: "var(--text-secondary)" }}
        >
          Your favourite movie
        </label>
        <input
          id="movie"
          type="text"
          value={movie}
          onChange={e => setMovie(e.target.value)}
          placeholder="e.g. The Shawshank Redemption"
          className="input-field"
          maxLength={200}
          autoFocus
          autoComplete="off"
        />
        {/* Character counter */}
        <p
          className="text-right mt-1"
          style={{ fontSize: "11px", color: "var(--text-muted)" }}
        >
          {movie.length} / 200
        </p>
      </div>

      {/* Error */}
      {error && (
        <div
          className="mb-4 px-3 py-2 rounded-lg text-sm"
          style={{
            background:   "rgba(200,146,10,0.08)",
            border:       "1px solid var(--border-base)",
            color:        "var(--text-secondary)",
            fontSize:     "13px",
          }}
        >
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={isPending || movie.trim().length === 0}
        className="btn-primary w-full"
        style={{ padding: "10px 18px", fontSize: "14px" }}
      >
        {isPending ? (
          <>
            <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="30 60"/>
            </svg>
            Saving…
          </>
        ) : (
          "Save & continue"
        )}
      </button>
    </form>
  );
}
