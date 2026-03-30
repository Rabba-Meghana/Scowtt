# Movie Memory

A full-stack web application where users save their favourite movie and receive AI-generated facts about it. The entire app theme adapts dynamically to the genre of the user's film.

Built with **Next.js 15, TypeScript, Prisma, PostgreSQL, Google OAuth, OpenAI, TailwindCSS, TMDB API**.

---

## Setup

```bash
git clone https://github.com/Rabba-Meghana/Scowtt.git
cd Scowtt
npm install
cp .env.example .env
```

Fill in your `.env` file (see Environment Variables below), then:

```bash
docker compose up -d
npm run db:push
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Environment Variables

Copy `.env.example` to `.env` and fill in the following:

| Variable | Description | How to get it |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | Pre-filled for Docker |
| `AUTH_SECRET` | NextAuth signing secret | Run: `openssl rand -base64 32` |
| `NEXTAUTH_URL` | App base URL | `http://localhost:3000` |
| `AUTH_GOOGLE_ID` | Google OAuth client ID | [console.cloud.google.com](https://console.cloud.google.com) |
| `AUTH_GOOGLE_SECRET` | Google OAuth client secret | Google Cloud Console |
| `OPENAI_API_KEY` | OpenAI API key | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) |
| `TMDB_API_KEY` | TMDB movie poster key | [themoviedb.org/settings/api](https://www.themoviedb.org/settings/api) (free) |
| `NEXT_PUBLIC_APP_URL` | Public app URL | `http://localhost:3000` |

### Google OAuth setup

1. Go to Google Cloud Console, create a project
2. APIs and Services, OAuth consent screen, External
3. Credentials, Create OAuth 2.0 Client ID, Web application
4. Add authorised redirect URI: `http://localhost:3000/api/auth/callback/google`
5. Copy the Client ID and Client Secret into `.env`

---

## Database

This project uses Docker Compose to run PostgreSQL locally. No local installation needed.

```bash
# Start the database
docker compose up -d

# Push schema (creates all tables)
npm run db:push

# Optional: open Prisma Studio
npm run db:studio
```

---

## Running Tests

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

Tests live in `tests/`:
- `api-client.test.ts`: typed API client error handling, cache logic, authorization
- `movie-edit.test.tsx`: optimistic UI, revert on failure, keyboard shortcuts, validation

---

## Architecture Overview

### Directory structure

```
src/
  app/
    api/
      auth/[...nextauth]/   NextAuth handler
      me/                   GET /api/me
      me/movie/             PUT /api/me/movie
      fact/                 GET /api/fact
      poster/               GET /api/poster (TMDB proxy)
    dashboard/              Protected dashboard page
    onboarding/             First-time setup page
    page.tsx                Landing / sign-in
    layout.tsx
    globals.css
  auth.ts                   NextAuth v5 config
  components/
    DashboardClient.tsx     Full dashboard UI
    OnboardingForm.tsx      Onboarding form
    SignInButton.tsx        Google sign-in button
  lib/
    api.ts                  Typed API client + 30s client cache
    actions.ts              Server actions
    movieThemes.ts          Genre theme engine
    prisma.ts               Prisma singleton
    validations.ts          Zod schemas
```

### Auth flow

```
/ (unauthenticated)
  Sign in with Google
  NextAuth callback
  First visit?   /onboarding   /dashboard
  Returning?     /dashboard
```

Route protection is enforced at the server component level. Each protected page calls `auth()` and redirects unauthenticated users. No client-side route guards, so there is no flash of unauthenticated content.

### Data model

**User**: Core identity. Stores `favoriteMovie` and `onboarded` alongside NextAuth fields.

**MovieFact**: One row per generated fact. Indexed on `(userId, movie, generatedAt DESC)` for fast cache lookups. The `isGenerating` boolean acts as a distributed lock to prevent burst duplicate generation.

**Account / Session / VerificationToken**: Standard NextAuth Prisma adapter tables.

### API routes

| Method | Path | Description |
|---|---|---|
| GET | /api/me | Returns the session user from the database |
| PUT | /api/me/movie | Updates favourite movie, Zod validated |
| GET | /api/fact | Returns a movie fact with 60s server cache |
| GET | /api/poster | Proxies TMDB poster lookup, 1h cache |
| * | /api/auth/[...nextauth] | NextAuth handler |

All routes check `auth()` and return 401 if no session exists. Write routes use `session.user.id` for all queries so a user cannot modify another user's data.

### Fact generation logic (GET /api/fact)

```
Request arrives
  Is there a fact less than 60 seconds old for this user + movie?
    Yes: return it (cached: true)
  Is isGenerating = true for this user + movie?
    Yes: return the last completed fact, or 202 if none exists
  Create placeholder row (isGenerating: true) -- the lock
  Call OpenAI gpt-4o-mini
    Success: update row (factText, isGenerating: false)
    Failure: delete placeholder, return last good fact or 503
```

### Dynamic theme engine (lib/movieThemes.ts)

Each theme is defined by three poster gradient stops: a deep shadow, a mid-tone, and an accent highlight. All UI tokens (background, card, glow, border, muted text) are algorithmically derived from those three stops. There are no hardcoded UI colors outside the poster stop definitions. The theme updates live whenever the user changes their movie.

---

## Variant B: Frontend/API-Focused

### Why Variant B

Variant B produces a more verifiable demo. The typed API contracts, optimistic UI, and cache invalidation logic are visible and interactive during a walkthrough. These patterns appear in every production frontend and demonstrate practical engineering judgment.

The core Variant A concerns are also implemented inside `/api/fact`: the 60-second server-side cache window and the `isGenerating` burst lock are both present and tested.

### Typed API client (lib/api.ts)

Every fetch call goes through `apiRequest<T>()`, which sets credentials and Content-Type on every request, parses JSON safely, and returns a discriminated union `{ ok: true; data: T } | { ok: false; error: ApiError }`. Callers are forced by TypeScript to handle both branches. Zero try/catch at the call site.

### Optimistic movie edit

The edit flow in `DashboardClient` works as follows:

1. User clicks Change film, input pre-filled with current movie
2. User clicks Save, movie title updates immediately in the UI
3. `PUT /api/me/movie` fires in the background
4. If the server succeeds, the new title stays and the theme updates
5. If the server fails, the previous movie is restored and the edit form reopens with the error message

### Client-side fact cache (30 seconds)

Implemented as module-level state in `lib/api.ts`. The cache is keyed on the movie name. When the user edits their movie, `invalidateFactCache()` is called before the next `loadFact()` so the new movie always gets a fresh fact. The 30-second TTL prevents unnecessary OpenAI calls on page revisits within the same tab.

### Dynamic theme system

Movie titles are matched against a keyword map. Each match returns a theme object with three poster gradient stops. All other UI colors are derived from those stops algorithmically. The poster sidebar fetches the real movie poster from TMDB via a server-side proxy route, keeping the API key server-only.

---

## Security

- No secrets are exposed to the client. `OPENAI_API_KEY`, `DATABASE_URL`, `AUTH_SECRET`, and `TMDB_API_KEY` are server-only. Only `NEXT_PUBLIC_APP_URL` uses the public prefix.
- Authorization is enforced at every API route. Each handler calls `auth()` and uses `session.user.id` for all database queries. A user cannot read or modify another user's data.
- Server-side validation on all inputs using Zod. `PUT /api/me/movie` returns 422 with a clear message on failure.
- The TMDB poster route proxies requests server-side so the API key never reaches the browser.
- Google profile photo handled gracefully with initials fallback if `user.image` is null.

---

## Key Tradeoffs

| Decision | Chosen | Alternative | Reason |
|---|---|---|---|
| Auth | NextAuth v5 | Lucia, Clerk | Best Prisma adapter, most Next.js-native |
| ORM | Prisma | Drizzle | Schema clarity and auto-generated types |
| State | useState + module cache | SWR, React Query | Sufficient for a single resource |
| Burst protection | isGenerating flag | DB unique constraint | Works across serverless instances |
| OpenAI model | gpt-4o-mini | gpt-4o | Cost-efficient for short fact generation |
| Poster | TMDB API proxy | Static images | Real posters, key stays server-side |
| Theme engine | Algorithmic from poster stops | Hardcoded palettes | No hardcoded UI colors, fully data-driven |
| Test runner | Vitest | Jest | Native ESM/TS support, faster |

---

## What I Would Improve With More Time

1. **Dark mode toggle**: The CSS variables are structured for dual themes. A toggle with localStorage persistence is straightforward to add.
2. **Fact history persistence**: The session history is currently in-memory. Persisting it to the database would surface it across devices.
3. **Rate limiting**: Per-user request throttling on `/api/fact` to prevent OpenAI cost spikes.
4. **Suspense boundaries**: Loading skeletons on initial navigation so the page feels instant on slow connections.
5. **E2E tests**: A Playwright smoke test covering the full sign-in, onboarding, edit, and fact generation flow.

---

## AI Usage

- Used AI assistance to scaffold the initial Prisma schema structure and NextAuth v5 configuration, since the v5 beta API differs significantly from v4 documentation.
- Used AI to help draft the OpenAI system prompt for fact generation and refine the tone.
- Cross-referenced the `@auth/prisma-adapter` types using AI, which have limited official documentation.
- All architecture decisions, tradeoff reasoning, caching strategy, theme engine design, and test cases were written and reviewed by hand.
- Every generated snippet was read, understood, and modified before inclusion.
