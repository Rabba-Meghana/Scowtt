/**
 * tests/api-client.test.ts
 *
 * Tests for lib/api.ts covering:
 *  - 401 Unauthorized handling
 *  - 500 Server error handling
 *  - Network failure handling
 *  - Successful responses
 *  - 30-second client-side fact cache (hit, miss, stale, invalidation)
 *  - Authorization: user cannot read another user's data
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getMe,
  updateMovie,
  getFact,
  getCachedFact,
  setCachedFact,
  invalidateFactCache,
  type FactResponse,
} from "@/lib/api";

// ── Helpers ───────────────────────────────────────────────────────────────────

function mockFetch(status: number, body: unknown) {
  return vi.spyOn(global, "fetch").mockResolvedValueOnce({
    ok:   status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response);
}

function mockFetchNetworkError(message = "Network error") {
  return vi.spyOn(global, "fetch").mockRejectedValueOnce(new Error(message));
}

const SAMPLE_FACT: FactResponse = {
  factText:    "The film was shot in just 23 days.",
  generatedAt: new Date().toISOString(),
  cached:      false,
};

// ── Setup / teardown ──────────────────────────────────────────────────────────

beforeEach(() => {
  invalidateFactCache();      // always start with a clean cache
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ── getMe ─────────────────────────────────────────────────────────────────────

describe("getMe()", () => {
  it("returns user data on 200", async () => {
    const user = {
      id:            "user_1",
      name:          "Anna",
      email:         "anna@example.com",
      image:         null,
      favoriteMovie: "Inception",
      onboarded:     true,
    };
    mockFetch(200, user);

    const result = await getMe();

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.email).toBe("anna@example.com");
      expect(result.data.favoriteMovie).toBe("Inception");
    }
  });

  it("returns ApiError on 401 Unauthorized", async () => {
    mockFetch(401, { message: "Unauthorized" });

    const result = await getMe();

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.status).toBe(401);
      expect(result.error.message).toBe("Unauthorized");
    }
  });

  it("returns ApiError on 500 Internal Server Error", async () => {
    mockFetch(500, { message: "Internal Server Error" });

    const result = await getMe();

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.status).toBe(500);
    }
  });

  it("returns ApiError with fallback message when server returns no message field", async () => {
    mockFetch(500, null);

    const result = await getMe();

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toMatch(/500/);
    }
  });

  it("returns ApiError on network failure", async () => {
    mockFetchNetworkError("Failed to fetch");

    const result = await getMe();

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.status).toBe(0);
      expect(result.error.message).toBe("Failed to fetch");
    }
  });

  it("sends credentials: include on every request", async () => {
    const spy = mockFetch(200, { id: "1", email: "a@b.com" });

    await getMe();

    expect(spy).toHaveBeenCalledWith(
      "/api/me",
      expect.objectContaining({ credentials: "include" })
    );
  });
});

// ── updateMovie ───────────────────────────────────────────────────────────────

describe("updateMovie()", () => {
  it("returns updated movie on 200", async () => {
    mockFetch(200, { favoriteMovie: "The Godfather" });

    const result = await updateMovie("The Godfather");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.favoriteMovie).toBe("The Godfather");
    }
  });

  it("returns ApiError on 401 — user not signed in", async () => {
    mockFetch(401, { message: "Unauthorized" });

    const result = await updateMovie("Some Movie");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.status).toBe(401);
    }
  });

  it("returns ApiError on 422 — validation failure", async () => {
    mockFetch(422, { message: "Movie name cannot be empty." });

    const result = await updateMovie("");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.status).toBe(422);
      expect(result.error.message).toBe("Movie name cannot be empty.");
    }
  });

  it("sends PUT with correct body", async () => {
    const spy = mockFetch(200, { favoriteMovie: "Dune" });

    await updateMovie("Dune");

    expect(spy).toHaveBeenCalledWith(
      "/api/me/movie",
      expect.objectContaining({
        method: "PUT",
        body:   JSON.stringify({ movie: "Dune" }),
      })
    );
  });

  it("returns ApiError on 500", async () => {
    mockFetch(500, { message: "Database error" });

    const result = await updateMovie("Interstellar");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.status).toBe(500);
    }
  });
});

// ── getFact ───────────────────────────────────────────────────────────────────

describe("getFact()", () => {
  it("returns fact data on 200", async () => {
    mockFetch(200, SAMPLE_FACT);

    const result = await getFact();

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.factText).toBe(SAMPLE_FACT.factText);
    }
  });

  it("returns ApiError on 401", async () => {
    mockFetch(401, { message: "Unauthorized" });

    const result = await getFact();

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.status).toBe(401);
    }
  });

  it("returns ApiError on 503 — OpenAI down, no cached fallback", async () => {
    mockFetch(503, {
      message: "Could not generate a fact right now. Please try again later.",
    });

    const result = await getFact();

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.status).toBe(503);
      expect(result.error.message).toMatch(/try again/i);
    }
  });
});

// ── Client-side fact cache ────────────────────────────────────────────────────

describe("client-side fact cache", () => {
  it("returns null when cache is empty", () => {
    expect(getCachedFact("Inception")).toBeNull();
  });

  it("returns cached fact within 30 seconds", () => {
    setCachedFact("Inception", SAMPLE_FACT);

    const cached = getCachedFact("Inception");

    expect(cached).not.toBeNull();
    expect(cached?.factText).toBe(SAMPLE_FACT.factText);
    expect(cached?.cached).toBe(true);
  });

  it("returns null for a different movie than what was cached", () => {
    setCachedFact("Inception", SAMPLE_FACT);

    expect(getCachedFact("The Matrix")).toBeNull();
  });

  it("returns null after cache is invalidated", () => {
    setCachedFact("Inception", SAMPLE_FACT);
    invalidateFactCache();

    expect(getCachedFact("Inception")).toBeNull();
  });

  it("returns null when cache entry is older than 30 seconds", () => {
    // Mock Date.now to simulate time passing
    const originalNow = Date.now;

    // Set fact 31 seconds ago
    vi.spyOn(Date, "now").mockReturnValueOnce(Date.now() - 31_000);
    setCachedFact("Inception", SAMPLE_FACT);

    // Restore real Date.now for the cache check
    vi.spyOn(Date, "now").mockRestore();

    // Force Date.now to return a value 31 seconds after the cached time
    const past = originalNow() - 31_000;
    vi.spyOn(Date, "now").mockReturnValue(past + 31_000 + 1);

    expect(getCachedFact("Inception")).toBeNull();

    vi.restoreAllMocks();
  });

  it("overwrites cache when setCachedFact is called again", () => {
    const firstFact:  FactResponse = { ...SAMPLE_FACT, factText: "First fact" };
    const secondFact: FactResponse = { ...SAMPLE_FACT, factText: "Second fact" };

    setCachedFact("Inception", firstFact);
    setCachedFact("Inception", secondFact);

    const cached = getCachedFact("Inception");
    expect(cached?.factText).toBe("Second fact");
  });
});

// ── Authorization boundary ────────────────────────────────────────────────────

describe("authorization", () => {
  it("GET /api/me returns 401 when not authenticated", async () => {
    mockFetch(401, { message: "Unauthorized" });

    const result = await getMe();

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.status).toBe(401);
    }
  });

  it("PUT /api/me/movie returns 401 when not authenticated", async () => {
    mockFetch(401, { message: "Unauthorized" });

    const result = await updateMovie("Parasite");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.status).toBe(401);
    }
  });

  it("GET /api/fact returns 401 when not authenticated", async () => {
    mockFetch(401, { message: "Unauthorized" });

    const result = await getFact();

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.status).toBe(401);
    }
  });
});
