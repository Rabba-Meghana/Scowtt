# Movie Memory

A full-stack web application that lets users save their favourite movie and get AI-generated facts about it.

Built with **Next.js 15 · TypeScript · Prisma · PostgreSQL · Google OAuth · OpenAI · TailwindCSS**

---

## Quick start

```bash
# 1. Clone and install
git clone <your-repo-url>
cd movie-memory
npm install

# 2. Set up environment variables
cp .env.example .env
# Fill in AUTH_SECRET, AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET, OPENAI_API_KEY

# 3. Start the database
docker compose up -d

# 4. Run migrations and generate Prisma client
npm run db:migrate
npm run db:generate

# 5. Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Environment variables

Copy `.env.example` to `.env` and fill in:

| Variable | Description | Where to get it |
|---|---|---|
| `DATABASE_URL` | Postgres connection string | Pre-filled for Docker |
| `AUTH_SECRET` | NextAuth signing secret | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | App base URL | `http://localhost:3000` |
| `AUTH_GOOGLE_ID` | Google OAuth client ID | [Google Cloud Console](https://console.cloud.google.com/apis/credentials) |
| `AUTH_GOOGLE_SECRET` | Google OAuth client secret | Google Cloud Console |
| `OPENAI_API_KEY` | OpenAI API key | [platform.openai.com](https://platform.openai.com/api-keys) |

### Google OAuth setup
1. Go to Google Cloud Console → APIs & Services → Credentials
2. Create OAuth 2.0 Client ID (Web application)
3. Add authorised redirect URI: `http://localhost:3000/api/auth/callback/google`
4. Copy the client ID and secret into `.env`

---

## Database

This project uses **Docker Compose** to run Postgres locally — no local Postgres install needed.

```bash
# Start the database
docker compose up -d

# Run migrations
npm run db:migrate

# Open Prisma Studio (optional visual DB browser)
npm run db:studio

# Push schema changes without creating a migration file (dev only)
npm run db:push
```

---

## Running tests

```bash
# Run all tests once
npm test

# Watch mode
npm run test:watch

# With coverage report
npm run test:coverage
```

Tests are in `tests/`:
- `api-client.test.ts` — typed API client: 401, 500, network failure, cache logic, authorization boundaries
- `movie-edit.test.tsx` — movie edit flow: optimistic update, revert on failure, save/cancel, keyboard shortcuts, client validation

---

## Architecture overview

### Directory structure

```
src/
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts   # NextAuth handler
│   │   ├── me/route.ts                   # GET /api/me
│   │   ├── me/movie/route.ts             # PUT /api/me/movie
│   │   └── fact/route.ts                 # GET /api/fact
│   ├── dashboard/page.tsx                # Protected dashboard
│   ├── onboarding/page.tsx               # First-time setup
│   ├── page.tsx                          # Landing / sign-in
│   ├── layout.tsx
│   └── globals.css
├── auth.ts                               # NextAuth v5 config
├── components/
│   ├── DashboardClient.tsx               # Main dashboard UI
│   ├── OnboardingForm.tsx                # Onboarding form
│   └── SignInButton.tsx                  # Google sign-in
└── lib/
    ├── api.ts                            # Typed API client + fact cache
    ├── actions.ts                        # Server actions
    ├── prisma.ts                         # Prisma singleton
    └── validations.ts                    # Zod schemas
```

### Auth flow

```
/ (unauthenticated)
  → Sign in with Google
  → NextAuth callback
  → First time?  → /onboarding  → /dashboard
  → Returning?   → /dashboard
```

Route protection is handled at the **server component** level — each protected page calls `auth()` and redirects if no session exists. There is no client-side route guard, which means no flash of unauthenticated content.

### Data model

Three application tables plus the three NextAuth adapter tables:

**User** — core identity. Stores `favoriteMovie` and `onboarded` alongside the standard NextAuth fields (`name`, `email`, `image`).

**MovieFact** — one row per generated fact. Indexed on `(userId, movie, generatedAt DESC)` for fast cache lookups. The `isGenerating` boolean acts as a distributed lock to prevent burst duplicates.

**Account / Session / VerificationToken** — standard NextAuth Prisma adapter tables.

### API routes

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/me` | Returns the current session user from DB |
| `PUT` | `/api/me/movie` | Updates favourite movie (server-side validated) |
| `GET` | `/api/fact` | Returns a movie fact (cached or freshly generated) |
| `*` | `/api/auth/[...nextauth]` | NextAuth handler |

All routes check `auth()` and return `401` if no session exists. `PUT /api/me/movie` uses the user's own session ID when writing — it is impossible to update another user's movie through this endpoint.

### Fact generation logic (server-side, `/api/fact`)

```
Request arrives
  ↓
Is there a fact < 60 seconds old for this user+movie?
  → Yes: return it (cached: true)
  ↓
Is isGenerating = true for this user+movie?
  → Yes: return the last completed fact (or 202 if none exists)
  ↓
Create placeholder row (isGenerating: true)   ← the lock
  ↓
Call OpenAI gpt-4o-mini
  → Success: update row (factText, isGenerating: false)
  → Failure: delete placeholder, return last good fact or 503
```

---

## Variant B — Frontend/API-Focused

### Why Variant B?

Variant B was chosen because it produces a more visually verifiable demo and showcases the full surface area of the stack — typed API contracts, client-side state management, optimistic UI, and cache invalidation logic. These are patterns that appear in every real production frontend, so demonstrating them clearly shows day-to-day engineering judgement rather than just backend correctness.

Variant A's caching and idempotency logic is also implemented (the 60-second server-side window and `isGenerating` lock are present in `/api/fact`), so both sets of concerns are addressed.

### Typed API client (`lib/api.ts`)

Every fetch call goes through `apiRequest<T>()`, which:
- Sets `credentials: "include"` and `Content-Type: application/json` on every request
- Parses JSON safely (catches malformed responses)
- Returns a discriminated union `{ ok: true; data: T } | { ok: false; error: ApiError }` so callers are forced by TypeScript to handle both branches

This means zero try/catch at the call site and full type safety throughout the dashboard.

### Optimistic movie edit

The edit flow in `DashboardClient` works as follows:

1. User clicks Edit → input pre-filled with current movie
2. User clicks Save → movie title updates **immediately** in the UI (optimistic)
3. `PUT /api/me/movie` fires in the background
4. If the server succeeds → done
5. If the server fails → the previous movie is restored, the edit form re-opens with the attempted value, and the error message is displayed

This is implemented without any external state library — plain `useState` and `async/await`. The tradeoff is that it is less composable than SWR/React Query, but for a single resource with straightforward mutation it is simpler and easier to reason about.

### Client-side fact cache (30 seconds)

Implemented as module-level state in `lib/api.ts`:

```ts
getCachedFact(movie)   // returns cached FactResponse or null
setCachedFact(movie, fact)
invalidateFactCache()  // called when movie changes
```

The cache is keyed on the movie name. When the user edits their movie, `invalidateFactCache()` is called before the next `loadFact()` so the new movie always gets a fresh fact. The 30-second TTL means repeated visits within a tab do not fire unnecessary OpenAI calls.

**Why module-level state over React context or SWR?**  
The fact is a single value scoped to one component tree. Module state is simpler and survives re-renders without a provider wrapper. SWR would be the right choice if there were multiple components consuming facts, or if background revalidation were needed.

---

## Security

- **No secrets exposed to the client** — `OPENAI_API_KEY`, `DATABASE_URL`, and `AUTH_SECRET` are server-only. The `NEXT_PUBLIC_` prefix is only used for `APP_URL`.
- **Authorization enforced at every API route** — each handler calls `auth()` and uses `session.user.id` for all DB queries. A user cannot read or modify another user's data.
- **Server-side validation on all inputs** — `PUT /api/me/movie` validates with Zod and returns 422 with a clear message on failure. The onboarding server action does the same.
- **Google photo handled gracefully** — `DashboardClient` falls back to initials if `user.image` is null.

---

## Key tradeoffs

| Decision | Chosen | Alternative | Reason |
|---|---|---|---|
| Auth library | NextAuth v5 (beta) | Lucia, Clerk | Best Prisma adapter; most Next.js-native |
| ORM | Prisma | Drizzle, Kysely | Schema clarity + auto-generated types |
| State management | useState + module cache | SWR / React Query | Sufficient for a single resource; fewer dependencies |
| Burst protection | `isGenerating` flag | DB unique constraint, in-memory lock | Works across serverless instances; survives restarts |
| OpenAI model | gpt-4o-mini | gpt-4o | Cost-efficient for short fact generation |
| Test runner | Vitest | Jest | Native ESM/TS, faster, same API |

---

## What I would improve with 2 more hours

1. **Dark mode toggle** — the CSS variables are wired up for dark mode; adding a toggle with `localStorage` persistence is a one-hour addition
2. **Fact history** — show the last 5 generated facts in a collapsible list; `MovieFact` already stores all of them
3. **Rate limiting** — add per-user request throttling on `/api/fact` to prevent OpenAI cost spikes
4. **Loading states on navigation** — add a `<Suspense>` boundary with a skeleton dashboard so the page feels instant on slow connections
5. **E2E tests** — Playwright smoke test covering the full sign-in → onboarding → dashboard → edit flow

---

## AI usage

- Used Claude to scaffold the initial Prisma schema structure and NextAuth v5 configuration (the v5 beta API differs significantly from v4 documentation)
- Used Claude to draft the OpenAI system prompt for fact generation and iterate on the tone
- Used ChatGPT to cross-reference the `@auth/prisma-adapter` types, which have sparse official documentation
- All architecture decisions, tradeoff reasoning, caching strategy, and test cases were written by hand
- Every generated snippet was reviewed, understood, and modified before inclusion
