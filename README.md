# NLP Todo

A full-stack to-do list app with natural language scheduling. Type tasks the way you think — dates, times, recurrence, tags, and priorities are extracted automatically.

## Features

- **NLP scheduling** — chrono-node parses phrases like "next Friday at 3pm", "in two weeks", "tomorrow morning"
- **Recurring tasks** — "every Monday at 9am", "daily", "every weekday", "every 2 weeks"
- **Priority levels** — `priority:high` / `!high` inline, or via the selector
- **Tags** — `#tagname` inline, or via the tag picker
- **Due date reminders** — browser push notifications via Web Push API
- **Filters** — filter by tag, priority, due date, completion status, and search

## Setup

### 1. Start the database

```bash
npm run db:up
```

### 2. Configure environment

Copy `.env.local` and update values (VAPID keys are already generated):

```bash
# The DATABASE_URL is pre-configured for the Docker Compose setup
# CRON_SECRET should be changed to a secure random string
```

### 3. Run migrations

```bash
npm run db:migrate
```

### 4. Start the app

```bash
npm run dev
```

### 5. (Optional) Start the reminder cron job

In a separate terminal:

```bash
npm run cron
```

## NLP Input Examples

| Input | Parsed |
|-------|--------|
| `Submit report by next Friday at 3pm #work priority:high` | Due Fri 3pm, HIGH, tag: work |
| `Team standup every weekday at 9am #meetings` | Recurring M-F 9am, tag: meetings |
| `Call dentist tomorrow morning priority:low` | Due tomorrow ~9am, LOW |
| `Review PRs every Monday #dev` | Recurring every Monday |
| `Pay rent in 3 days` | Due in 3 days |

## Architecture

```
app/
  api/tasks/          → GET (list+filter), POST (create with NLP)
  api/tasks/[id]/     → GET, PATCH, DELETE
  api/tags/           → Tag CRUD
  api/push/           → Web Push subscription management
  api/cron/reminders/ → Cron endpoint (fires push notifications)
lib/
  nlp/parseTask.ts    → chrono-node + recurrence regex + inline tags/priority
  push/webpush.ts     → web-push helper
  prisma.ts           → Prisma client singleton
scripts/
  cron.mjs            → node-cron runner (call /api/cron/reminders every minute)
```

## Tech Stack

- **Next.js 16** (App Router, TypeScript)
- **PostgreSQL** via Prisma 7 + `@prisma/adapter-pg`
- **chrono-node** for NLP date/time parsing
- **rrule** for RRULE generation and iteration
- **web-push** for browser push notifications
- **shadcn/ui** + Tailwind CSS
- **SWR** for client-side data fetching
