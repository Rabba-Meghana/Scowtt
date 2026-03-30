/**
 * lib/api.ts - Typed client wrapper (Variant B)
 *
 * All fetch calls go through `apiRequest` which:
 *   1. Sets Content-Type and credentials
 *   2. Parses the JSON response
 *   3. Normalises errors into a typed ApiError
 *
 * Each exported function returns a discriminated union:
 *   { ok: true;  data: T }
 *   { ok: false; error: ApiError }
 *
 * This means callers never need try/catch and TypeScript
 * enforces handling of the error branch.
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ApiError {
  status:  number;
  message: string;
}

export type ApiResult<T> =
  | { ok: true;  data: T }
  | { ok: false; error: ApiError };

export interface MeResponse {
  id:            string;
  name:          string | null;
  email:         string;
  image:         string | null;
  favoriteMovie: string | null;
  onboarded:     boolean;
}

export interface UpdateMovieResponse {
  favoriteMovie: string;
}

export interface FactResponse {
  factText:    string;
  generatedAt: string;   // ISO timestamp
  cached:      boolean;  // true if served from the 30-second client cache
}

// ── Core request helper ───────────────────────────────────────────────────────

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? "";

async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<ApiResult<T>> {
  try {
    const res = await fetch(`${BASE}${path}`, {
      ...options,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(options.headers ?? {}),
      },
    });

    // Parse body - even errors may contain a message field
    let body: unknown;
    try {
      body = await res.json();
    } catch {
      body = null;
    }

    if (!res.ok) {
      const message =
        typeof body === "object" &&
        body !== null &&
        "message" in body &&
        typeof (body as Record<string, unknown>).message === "string"
          ? (body as { message: string }).message
          : `Request failed with status ${res.status}`;

      return { ok: false, error: { status: res.status, message } };
    }

    return { ok: true, data: body as T };
  } catch (err) {
    // Network error, CORS, etc.
    const message = err instanceof Error ? err.message : "Network error";
    return { ok: false, error: { status: 0, message } };
  }
}

// ── API functions ─────────────────────────────────────────────────────────────

/** GET /api/me - fetch the current session user */
export async function getMe(): Promise<ApiResult<MeResponse>> {
  return apiRequest<MeResponse>("/api/me");
}

/** PUT /api/me/movie - update the user's favourite movie */
export async function updateMovie(
  movie: string
): Promise<ApiResult<UpdateMovieResponse>> {
  return apiRequest<UpdateMovieResponse>("/api/me/movie", {
    method: "PUT",
    body:   JSON.stringify({ movie }),
  });
}

/** GET /api/fact - fetch (or generate) a movie fact */
export async function getFact(): Promise<ApiResult<FactResponse>> {
  return apiRequest<FactResponse>("/api/fact");
}

// ── Client-side fact cache (30-second window) ─────────────────────────────────
// Stored in module-level state so it survives re-renders within a session.
// Invalidated when the user's movie changes.

interface CacheEntry {
  fact:      FactResponse;
  movie:     string;
  fetchedAt: number;   // Date.now()
}

const CACHE_TTL_MS = 30_000; // 30 seconds

let _cache: CacheEntry | null = null;

/**
 * Returns the cached fact if it is:
 *   - for the given movie
 *   - less than 30 seconds old
 * Otherwise returns null and the caller should fetch a fresh one.
 */
export function getCachedFact(currentMovie: string): FactResponse | null {
  if (!_cache) return null;
  if (_cache.movie !== currentMovie) return null;
  if (Date.now() - _cache.fetchedAt > CACHE_TTL_MS) return null;
  return { ..._cache.fact, cached: true };
}

/** Store a fresh fact in the module-level cache */
export function setCachedFact(movie: string, fact: FactResponse): void {
  _cache = { fact, movie, fetchedAt: Date.now() };
}

/** Invalidate the cache - call this when the movie is updated */
export function invalidateFactCache(): void {
  _cache = null;
}
