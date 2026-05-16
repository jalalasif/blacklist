# Architecture — Blacklist

## Overview

Blacklist is a full-stack, single-repository web application built on **Next.js 16 (App Router)**. It provides a minimalist task manager that accepts free-form natural language input and automatically extracts scheduling information — dates, times, recurrence rules, tags, and priority — from the raw text before persisting structured records to a PostgreSQL database.

---

## Software Design Paradigm

The codebase follows a **layered, co-located architecture** informed by two complementary principles:

**1. Vertical co-location (Next.js App Router convention)**
Routes, pages, and their associated server-side logic live together under `app/`. Each route segment is self-contained; there are no separate `controllers/` or `services/` directories. Business logic that is shared across routes is extracted into `lib/`.

**2. Thin API, fat library**
Route handlers in `app/api/` are intentionally thin — they validate input with Zod, delegate to a library function, and return JSON. The work happens in `lib/` (`parseTask`, `webpush`, `prisma`). This separation means the NLP parser and push notification helper can be called from both server route handlers and client-side components without duplication.

**Design patterns in use:**

| Pattern | Where |
|---|---|
| Repository (via Prisma ORM) | `lib/prisma.ts` — single client singleton passed to all data access |
| Schema-first validation | `types/index.ts` — Zod schemas are the single source of truth for all API input/output shapes |
| Optimistic UI + SWR polling | `hooks/useTasks.ts` — 30 s refresh interval; `mutate()` called immediately after writes |
| Strategy pattern | `lib/nlp/parseTask.ts` — recurrence detection is a table of `{ re, toRrule }` strategies iterated in order |
| Denormalised scheduling state | `Task.nextOccurrence` — pre-computed next fire time stored in DB so the cron query is a simple range scan rather than re-evaluating RRULE strings at runtime |

---

## Repository Structure

```
blacklist/
│
├── app/                          # Next.js App Router root
│   ├── layout.tsx                # Root layout — font loading, header, footer
│   ├── page.tsx                  # Home — task input + task list
│   ├── globals.css               # Global styles (Tailwind v4 + CSS variables)
│   │
│   ├── tasks/[id]/page.tsx       # Task detail / edit (Server Component → client hydration)
│   ├── tags/page.tsx             # Tag management page
│   │
│   └── api/                      # Route handlers (Next.js Route Handlers)
│       ├── tasks/
│       │   ├── route.ts          # GET (list + filter), POST (create with NLP)
│       │   └── [id]/route.ts     # GET, PATCH, DELETE
│       ├── tags/
│       │   ├── route.ts          # GET, POST
│       │   └── [id]/route.ts     # PATCH, DELETE
│       ├── push/
│       │   ├── subscribe/route.ts
│       │   └── unsubscribe/route.ts
│       └── cron/
│           └── reminders/route.ts  # Reminder dispatch (secret-gated)
│
├── components/
│   ├── NotificationBell.tsx      # Push subscription toggle
│   ├── task/
│   │   ├── TaskInput.tsx         # NLP input + live parse preview
│   │   ├── TaskList.tsx          # Filter state owner, renders TaskCard[]
│   │   ├── TaskCard.tsx          # Single task row — inline complete / delete
│   │   ├── TaskFilters.tsx       # Search + status / priority / tag filter chips
│   │   └── TaskDetail.tsx        # Full edit form (client component)
│   ├── tag/
│   │   ├── TagBadge.tsx          # Stateless display component
│   │   └── TagManager.tsx        # Tag CRUD UI
│   └── ui/                       # shadcn/ui primitives (generated, do not edit)
│
├── hooks/
│   ├── useTasks.ts               # SWR wrapper for /api/tasks and /api/tags
│   └── usePushSubscription.ts    # Service worker registration + VAPID subscribe flow
│
├── lib/
│   ├── prisma.ts                 # Prisma client singleton (globalThis cache for HMR)
│   ├── utils.ts                  # cn() — Tailwind class merging helper
│   ├── nlp/
│   │   └── parseTask.ts          # NLP pipeline: priority → tags → recurrence → chrono-node → clean title
│   └── push/
│       └── webpush.ts            # web-push sendNotification wrapper
│
├── types/
│   └── index.ts                  # Zod schemas + TypeScript interfaces (shared server/client)
│
├── prisma/
│   ├── schema.prisma             # Data model
│   ├── migrations/               # Versioned SQL migrations (Prisma Migrate)
│   └── config.ts (prisma.config.ts)  # Datasource URL + migration path (Prisma 7)
│
├── public/
│   └── sw.js                     # Service worker — handles push events + notification clicks
│
└── scripts/
    ├── cron.mjs                  # node-cron process: polls /api/cron/reminders every minute
    ├── build-mac-app.sh          # Builds ~/Applications/B&W Tasks.app launcher bundle
    └── make-icons.py             # Generates .iconset PNGs (PIL or pure-Python fallback)
```

---

## Data Model

```
Task
  id             cuid         PK
  title          text         raw input as typed
  cleanTitle     text         title stripped of date / recurrence / tag tokens
  priority       HIGH|MEDIUM|LOW
  dueDate        timestamp?
  completed      bool
  completedAt    timestamp?
  recurrence     text?        RRULE string e.g. FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR
  nextOccurrence timestamp?   denormalised next fire time (updated by cron after each fire)
  reminderSentAt timestamp?   guards against duplicate notifications in the same cron tick

Tag
  id    cuid  PK
  name  text  UNIQUE
  color text  hex colour string

TaskTag                        ← explicit join table (many-to-many)
  taskId → Task (CASCADE DELETE)
  tagId  → Tag  (CASCADE DELETE)

Subscription                   ← Web Push endpoints
  id       cuid  PK
  endpoint text  UNIQUE
  p256dh   text
  auth     text
```

**Indexes:** `Task(dueDate)`, `Task(completed)`, `Task(priority)`, `Task(nextOccurrence)` — covering the four common query predicates.

---

## NLP Pipeline

`lib/nlp/parseTask.ts` processes raw input through five sequential stages, each consuming and removing tokens from a working copy of the string:

```
Raw input
  │
  ▼
1. Priority extraction     regex /priority:|!/i  → inlinePriority, stripped from working string
  │
  ▼
2. Tag extraction          regex /#(\w+)/g       → inlineTags[], stripped from working string
  │
  ▼
3. Recurrence detection    table of 8 regex patterns (daily / weekday / weekend / named day /
  │                        every N days|weeks / weekly / monthly)
  │                        Match → RRULE string via buildRrule()
  │                        chrono-node used to extract time component within recurrence phrase
  ▼
4. Date/time extraction    chrono-node (forwardDate: true) on remaining string
  │                        → dueDate, matched span stripped
  ▼
5. Clean title             remaining string, dangling prepositions trimmed (by / on / at / in…)
                           nextOccurrence computed via RRule.after(now)
```

The recurrence-before-chrono ordering is intentional: chrono-node misparses "every Monday" as a relative date expression unless the recurrence phrase is removed first.

---

## API Surface

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/tasks` | — | List tasks. Query params: `tag`, `priority`, `completed`, `search`, `dueBefore`, `dueAfter` |
| `POST` | `/api/tasks` | — | Create task from `rawInput`. NLP runs server-side. |
| `GET` | `/api/tasks/:id` | — | Fetch single task |
| `PATCH` | `/api/tasks/:id` | — | Partial update (title, priority, tags, completed, recurrence) |
| `DELETE` | `/api/tasks/:id` | — | Delete task (cascades TaskTag rows) |
| `GET` | `/api/tags` | — | List all tags with task count |
| `POST` | `/api/tags` | — | Create tag |
| `PATCH` | `/api/tags/:id` | — | Rename / recolor tag |
| `DELETE` | `/api/tags/:id` | — | Delete tag (cascades TaskTag rows) |
| `POST` | `/api/push/subscribe` | — | Upsert a Web Push subscription |
| `DELETE` | `/api/push/unsubscribe` | — | Remove subscription by endpoint |
| `GET` | `/api/cron/reminders` | `?secret=` | Fire push notifications for due tasks; advance `nextOccurrence` for recurring tasks |

All `POST`/`PATCH` bodies are validated with Zod schemas defined in `types/index.ts`. Invalid requests return `400` with a flattened error object.

---

## Push Notification Architecture

```
Browser                          Server                        DB
──────                           ──────                        ──
usePushSubscription.ts
  │
  ├─ register /sw.js
  ├─ pushManager.subscribe(VAPID)
  └─ POST /api/push/subscribe ──► upsert Subscription ───────► Subscription table

sw.js (service worker)
  ├─ push event → showNotification
  └─ notificationclick → clients.openWindow(/tasks/:id)

scripts/cron.mjs (separate process)
  └─ node-cron "* * * * *"
       └─ GET /api/cron/reminders?secret=…
            ├─ query tasks WHERE dueDate/nextOccurrence ≤ now+5min
            ├─ fetch all Subscription rows
            ├─ web-push.sendNotification() for each subscriber
            └─ UPDATE task: reminderSentAt, advance nextOccurrence (RRULE)
```

The 5-minute look-ahead window on the cron query means a task due at 14:00 will be caught by any cron tick between 13:55 and 14:00, tolerating up to 5 minutes of clock drift or startup delay.

---

## State Management

There is no global state store (no Redux, Zustand, or Context). State is managed at two levels:

**Server state** — owned by SWR (`hooks/useTasks.ts`). A 30-second polling interval keeps the list eventually consistent across browser tabs. `mutate()` is called immediately after any write to produce an optimistic update without waiting for the next poll.

**Local UI state** — co-located in the component that needs it (`useState` inside `TaskList`, `TaskInput`, `TaskDetail`). Filter state lives in `TaskList` and is passed down as props; it is not reflected in the URL (a known limitation).

---

## Rendering Strategy

| Route | Strategy | Reason |
|---|---|---|
| `/` | Client Component | Requires SWR, real-time filter state |
| `/tasks/[id]` | Server Component shell → Client Component (`TaskDetail`) | Initial data fetched on server (no loading flash); edit form is interactive |
| `/tags` | Client Component (`TagManager`) | Requires mutation state |
| `/api/*` | Node.js Route Handlers | Database access, VAPID signing |
| `/api/cron/reminders` | Node.js (`runtime = "nodejs"`) | Explicitly opted out of Edge runtime due to `web-push` dependency |

---

## Infrastructure & Runtime

| Concern | Solution |
|---|---|
| Database | PostgreSQL 16 (Docker Compose for local dev) |
| ORM | Prisma 7 with `@prisma/adapter-pg` (driver adapter pattern required by Prisma 7) |
| Migrations | Prisma Migrate — versioned SQL in `prisma/migrations/` |
| Background job | `scripts/cron.mjs` — standalone Node.js process using `node-cron`, separate from the Next.js server |
| Push notifications | VAPID keys + `web-push` npm package; keys stored in `.env.local` (not committed) |
| Font loading | `next/font/google` — DM Serif Display + Inter, subset to latin, self-hosted by Next.js |
| CSS | Tailwind CSS v4 (PostCSS plugin) + CSS custom properties for the B&W design token set |
| Mac launcher | `~/Applications/B&W Tasks.app` — shell script `.app` bundle that starts Docker, Next.js, and opens the browser |

---

## Testing Coverage

**Current state: no automated test suite exists.**

The application was built as a functional prototype. No unit, integration, or end-to-end tests have been written. The following surfaces are the highest-value candidates for coverage if tests are added:

### Where tests would add the most value

**Unit — `lib/nlp/parseTask.ts`**
This is the most logic-dense, purely functional module in the codebase. It has no I/O side effects and is trivially testable. Recommended cases:

```
parseTask("Submit report by next Friday at 3pm #work priority:high")
  → { priority: "HIGH", inlineTags: ["work"], dueDate: <next Friday 15:00> }

parseTask("Team standup every weekday at 9am")
  → { recurrence: "RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR;BYHOUR=9", dueDate: null }

parseTask("Call dentist tomorrow morning")
  → { dueDate: <tomorrow ~09:00>, recurrence: null }

parseTask("Pay rent in 3 days priority:low")
  → { priority: "LOW", dueDate: <now+3days> }
```

**Integration — API route handlers**
`POST /api/tasks` exercises the NLP pipeline, tag upsert, and Prisma write in one call. A test database (separate `DATABASE_URL`) and Prisma's `$transaction` rollback pattern would allow isolated, repeatable route tests.

**Integration — cron reminder logic**
`GET /api/cron/reminders` has a time-sensitive query (5-minute look-ahead window) and mutates `reminderSentAt` / `nextOccurrence`. This is the most failure-prone path in the system and the most important to cover with integration tests.

**End-to-end — Playwright**
The golden paths worth automating:
1. Create a task with natural language → verify parsed metadata appears in the card
2. Mark a task complete → verify it moves to the Done filter
3. Create a recurring task → verify `recurrence` field is populated

### Recommended test stack

| Layer | Tool |
|---|---|
| Unit | Vitest (zero-config with Next.js, fast) |
| Integration | Vitest + Prisma test DB + `supertest` or native `fetch` against route handlers |
| E2E | Playwright |

No mocking of the database is recommended for integration tests — the schema is simple enough that a real test database is more trustworthy and avoids the mock/production divergence that has historically caused production incidents.
