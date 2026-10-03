# JobTracker

JobTracker is a lightweight job application tracker. The current Week 1 slice covers a user's job list and create, detail, edit, and delete flows.

## Job fields and status colors

Required: Company Name, Position Title, Status. Optional: Job URL, Location, Job Description, Notes, Application Deadline, Applied Date.

| Status | Color |
| --- | --- |
| Interested | Violet |
| Preparing | Amber |
| Applied | Blue |
| Interview | Purple |
| Offer | Green |
| Rejected | Red |

## Start locally

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env.local` and set the Supabase project URL and anon key.
3. Apply `supabase/migrations/202610020001_create_jobs.sql` in the Supabase SQL Editor (or with the Supabase CLI).
4. Start the Vite app with `npm run dev`.

The `/jobs` routes require an authenticated Supabase session. The registration and login screens/session setup are the responsibility of Member B and should send signed-in users to `/jobs`.

## Routes

- `/jobs` — current user's jobs and empty state
- `/jobs/new` — create a job
- `/jobs/:jobId` — details and delete confirmation
- `/jobs/:jobId/edit` — edit a job

The database migration enables row-level security and restricts every operation to rows whose `user_id` matches `auth.uid()`. New job inserts set `user_id` from the verified Supabase session; the database policy independently enforces ownership.

Resume and Cover Letter controls are placeholders for Week 2, when the document table and private storage bucket are introduced.
