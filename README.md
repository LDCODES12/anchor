# Anchor

Anchor is a science-based, gamified accountability app for small groups of friends.
Track daily habits and weekly targets, keep streaks alive, and stay motivated together.

## Tech stack

- Next.js App Router + TypeScript
- TailwindCSS + shadcn/ui
- Prisma + PostgreSQL
- NextAuth (Credentials + OAuth-ready)
- Zod validation
- Vitest + Playwright tests

## Local setup

1) Copy environment variables

```bash
cp env.example .env
```

Update `NEXTAUTH_SECRET` with a long random string.

2) Start the database

```bash
docker compose up -d
```

3) Run migrations and seed demo data

```bash
npm run db:migrate
npm run db:seed
```

4) Start the app

```bash
npm run dev
```

Visit `http://localhost:3000`.

## Demo accounts

- `alice@anchor.app` / `password123`
- `ben@anchor.app` / `password123`

## Tests

```bash
npm run test
npm run test:e2e
```

## Deploy (Vercel + Neon/Supabase)

1) Create a free Postgres database (Neon or Supabase) and copy the connection string.
2) Push this repo to GitHub.
3) Create a Vercel project from the repo and set these environment variables:
   - `DATABASE_URL` = your hosted Postgres URL
   - `NEXTAUTH_URL` = your Vercel URL
   - `NEXTAUTH_SECRET` = a long random string
4) Deploy. Then run migrations against production:

```bash
npx prisma migrate deploy
npx prisma db seed
```

## Notes

- OAuth is wired but optional. Add `GITHUB_ID` and `GITHUB_SECRET` to enable.
- Check-ins are protected against duplicates and future dates.
