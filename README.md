# Movie Memory

A full-stack web application where you save your favourite film and get AI-powered facts about it. The entire UI theme adapts dynamically to your movie's genre, pulling colors directly from the real TMDB poster.

Video: https://drive.google.com/file/d/1z6f2XgxUrVHxlt-ho6S1FNyMxUcpQ9lO/view?usp=sharing

**Stack:** Next.js 15, TypeScript, Prisma, PostgreSQL, Google OAuth, OpenAI GPT-4o mini, TailwindCSS, TMDB API

---

## Quick start

```bash
git clone https://github.com/Rabba-Meghana/Scowtt.git
cd Scowtt
npm install
cp .env.example .env
# Fill in your keys (see Environment Variables below)
docker compose up -d
npm run db:push
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Environment Variables

| Variable | Description | Where to get it |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | Pre-filled for Docker Compose |
| `AUTH_SECRET` | NextAuth signing secret | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | App base URL | `http://localhost:3000` |
| `AUTH_GOOGLE_ID` | Google OAuth client ID | [console.cloud.google.com](https://console.cloud.google.com) |
| `AUTH_GOOGLE_SECRET` | Google OAuth client secret | Google Cloud Console |
| `OPENAI_API_KEY` | OpenAI API key | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) |
| `TMDB_API_KEY` | Movie poster API key (free) | [themoviedb.org/settings/api](https://www.themoviedb.org/settings/api) |
| `NEXT_PUBLIC_APP_URL` | Public app URL | `http://localhost:3000` |

### Google OAuth setup

1. Google Cloud Console, create a project called `movie-memory`
2. APIs and Services, OAuth consent screen, External
3. Credentials, Create OAuth 2.0 Client ID, Web application
4. Authorised redirect URI: `http://localhost:3000/api/auth/callback/google`
5. Copy Client ID and Client Secret into `.env`

---

## Database

Uses Docker Compose to run PostgreSQL locally, no local install needed.

```bash
docker compose up -d      # start postgres
npm run db:push           # sync schema, create tables
npm run db:studio         # optional: visual DB browser
```

---

## Tests

```bash
npm test              # run all tests once
npm run test:watch    # watch mode
npm run test:coverage # coverage report
```

Test files in `tests/`:
- `api-client.test.ts` - typed client: 401, 500, network errors, 30s cache, authorization
- `movie-edit.test.tsx` - edit flow: optimistic update, revert on failure, keyboard shortcuts

---

## Architecture

### Directory structure

```
src/
  app/
    api/
      auth/[...nextauth]/   NextAuth handler
      me/                   GET /api/me
      me/movie/             PUT /api/me/movie
      fact/                 GET /api/fact (60s cache + burst lock)
      poster/               GET /api/poster (TMDB proxy)
      palette/              GET /api/palette (color extraction)
      avatar/               GET /api/avatar (Google photo proxy)
    dashboard/              Protected dashboard page
    onboarding/             First-time setup
    page.tsx                Landing / sign-in
  auth.ts                   NextAuth v5 config
  components/
    DashboardClient.tsx     Full dashboard with poster, themes, facts
    OnboardingForm.tsx      Movie input form
    SignInButton.tsx        Google sign-in
  lib/
    api.ts                  Typed API client + 30s client cache
    actions.ts              Server actions
    movieThemes.ts          Genre theme engine
    prisma.ts               Prisma singleton
    validations.ts          Zod schemas
```

### Auth flow

```
/ (unauthenticated)  ->  Sign in with Google  ->  NextAuth callback
  First visit?  ->  /onboarding  ->  /dashboard
  Returning?    ->  /dashboard
```

Every protected page calls `auth()` server-side and redirects immediately if no session. No client-side route guards, no flash of unauthenticated content.

### Data model

**User** - name, email, image from Google, plus `favoriteMovie` and `onboarded` flag.

**MovieFact** - one row per generated fact, indexed on `(userId, movie, generatedAt DESC)`. The `isGenerating` boolean is a distributed lock preventing duplicate concurrent OpenAI calls.

**Account / Session / VerificationToken** - standard NextAuth Prisma adapter tables.

### API routes

| Method | Path | Description |
|---|---|---|
| GET | /api/me | Current user from DB |
| PUT | /api/me/movie | Update favourite movie, Zod validated |
| GET | /api/fact | Fact with 60s server cache + burst protection |
| GET | /api/poster | TMDB poster lookup, server proxied |
| GET | /api/palette | Dominant color extraction from poster |
| GET | /api/avatar | Google profile photo proxy |

All routes return 401 immediately if no session. Write routes use `session.user.id` so users can only modify their own data.

### Fact generation (GET /api/fact)

```
Check 60s server cache for this user + movie
  Hit  ->  return cached fact
  Miss ->  check isGenerating flag (burst protection)
             In flight  ->  return last good fact, or 202
             Free       ->  set isGenerating = true (the lock)
                            call OpenAI gpt-4o-mini
                            Success  ->  save fact, release lock
                            Failure  ->  delete lock row, return last fact or 503
```

### Dynamic theme system

When a user sets their movie, the app:

1. Fetches the TMDB poster via `/api/poster`
2. Sends that image to `/api/palette` which samples the dominant pixels and returns a dark base, a mid tone, and an accent color
3. The dashboard applies those three colors as CSS custom properties across the entire UI - background, cards, borders, text, glow effects all update in one transition
4. The poster itself displays as a blurred full-screen background with the clean card version on the left sidebar

This means every user genuinely has a different visual experience depending on their film.

---

## Variant B: Frontend / API-Focused

### Why Variant B

Variant B is more demonstrable. The typed API client, optimistic UI, and cache invalidation are all visible and interactive during a walkthrough. I also implemented the core Variant A features inside `/api/fact` anyway - the 60s server cache, isGenerating lock, and OpenAI fallback are all there - so both sets of concerns are covered.

### Typed API client (lib/api.ts)

Every request goes through `apiRequest<T>()` which sets credentials and Content-Type, parses JSON safely, and returns a discriminated union:

```typescript
{ ok: true;  data: T      }
{ ok: false; error: ApiError }
```

Callers never need try/catch and TypeScript enforces handling both branches.

### Optimistic movie edit

1. User clicks Change film, input pre-fills with current value
2. User saves - movie title updates immediately in UI before server responds
3. `PUT /api/me/movie` fires in background
4. Success - new title stays, poster and theme update
5. Failure - previous movie restored, edit form reopens with error

### Client-side fact cache

Module-level state in `lib/api.ts`, keyed on movie name. When the user changes their movie, `invalidateFactCache()` clears it so the new movie always gets a fresh fact. The 30s TTL prevents unnecessary OpenAI calls when the user revisits the page.

---

## Security

- No secrets exposed to the client. `OPENAI_API_KEY`, `DATABASE_URL`, `AUTH_SECRET`, `TMDB_API_KEY` are all server-only.
- Every API route checks `auth()` before doing anything.
- All inputs validated with Zod server-side before hitting the database.
- TMDB poster and Google avatar requests are proxied server-side so keys and referrer headers never reach the browser.
- Graceful fallback if Google photo or name is missing.

---

## Key Tradeoffs

| Decision | Chosen | Why |
|---|---|---|
| Auth | NextAuth v5 | Best Prisma adapter, most Next.js-native |
| ORM | Prisma | Schema clarity, auto-generated types |
| State | useState + module cache | Sufficient for one resource, no extra dependencies |
| Burst lock | isGenerating flag | Works across serverless instances, survives restarts |
| OpenAI model | gpt-4o-mini | Cost-efficient for short generations |
| Poster colors | Server-side pixel sampling | Key never reaches browser, works for any film |
| Theme | Derived algorithmically from poster | Every user has a genuinely unique visual experience |

---

## What I Would Improve With More Time

1. Persist fact history to the database so it survives page refreshes
2. Add rate limiting on `/api/fact` to guard against OpenAI cost spikes
3. Dark / light mode toggle using the existing CSS variable structure
4. Playwright end-to-end test covering the full sign-in to fact generation flow
5. Suspense boundaries with skeleton screens for instant perceived load

---

## AI Usage

The document permits AI tool usage. Here is exactly how I used it:

- Scaffolded the initial NextAuth v5 configuration because the v5 beta API changed significantly from v4 and documentation was sparse
- Drafted and refined the OpenAI system prompt for fact generation
- Looked up `@auth/prisma-adapter` type signatures which have limited official documentation
- All architecture decisions, the schema design, the caching strategy, the theme engine, the palette extraction approach, and every test case were my own work
- Every AI-generated snippet was read, understood, and modified before use
