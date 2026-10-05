# Jobfolio

A private job application tracker built with Next.js 16, TypeScript, Tailwind CSS 4, and Supabase.

## Features

- Email/password registration, login, password reset, and logout
- Cookie-based Supabase session refresh for browser and server rendering
- Server-protected `/jobs` routes and authenticated-page redirects
- Private user profiles created automatically from `auth.users`
- Job list, search, status filter, create, view, update, and delete flows
- Row Level Security for both `profiles` and `jobs`

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env.local` and replace both placeholder values:

   ```bash
   cp .env.example .env.local
   ```

3. Apply the SQL files in chronological order using the Supabase SQL Editor or CLI:

   - `supabase/migrations/202610020001_create_jobs.sql`
   - `supabase/migrations/202610040001_create_profiles.sql`

4. In Supabase Auth URL Configuration, set the site URL to `http://localhost:3000` for local development and add `/auth/confirm` as an allowed redirect path for each deployed domain.

5. Start the app:

   ```bash
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000).

## Verification

```bash
npm run lint
npm run build
```

## Environment variables

Only the public Supabase project URL and publishable key are used by this app. Never commit `.env.local`, service-role keys, database passwords, or access tokens. The repository ignores all `.env*` files except `.env.example`.

For Vercel, configure:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

## Routes

- `/` — public marketing page
- `/register` — account registration
- `/login` — account login
- `/auth/confirm` — email confirmation callback
- `/jobs` — current user's jobs (protected)
- `/jobs/new` — add a job (protected)
- `/jobs/[jobId]` — job details (protected)
- `/jobs/[jobId]/edit` — edit a job (protected)
