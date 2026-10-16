# Jobfolio

Jobfolio is a private, multi-user job application tracker. Each user can manage their own applications and keep the resume and cover letter prepared for each job in one place.

**Production:** [jobfolio-tracker.vercel.app](https://jobfolio-tracker.vercel.app)

## Current MVP

### Accounts

- Email/password registration, email confirmation, login, password reset, and logout
- Cookie-based Supabase sessions with automatic refresh
- Protected job routes and redirects for authenticated users
- A private profile created automatically for every Supabase Auth user

### Job tracking

- Create, view, edit, and delete job applications
- Search jobs and filter them by application status
- Track company, role, location, URL, status, dates, description, and notes
- New jobs default to `Applied` with today's application date
- Job data is isolated by user with PostgreSQL Row Level Security (RLS)

### Resume and cover letter management

- Attach one resume and one cover letter to each job
- Upload, download, replace, and delete PDF or DOCX files up to 10 MB
- Preview PDFs and DOCX files inside the app
- Store files in the private `job-documents` Supabase Storage bucket
- Generate short-lived signed URLs instead of public file URLs
- Clean up database records and Storage objects when a job is deleted
- Isolate document records and files by both user and job ownership

## Tech stack

- Next.js 16 App Router
- React 19 and TypeScript 6
- Tailwind CSS 4 plus application CSS
- Supabase Auth, PostgreSQL, Row Level Security, and Storage
- `docx-preview` for client-side DOCX rendering
- Vercel for deployment
- Oxlint for static analysis

## Local setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy the example file:

```bash
cp .env.example .env.local
```

Add your Supabase project values to `.env.local`:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
```

Do not commit `.env.local`, service-role keys, database passwords, or access tokens.

### 3. Connect Supabase and apply migrations

After logging in to the Supabase CLI, link the repository to the intended project and push the migrations:

```bash
npx supabase@latest login
npx supabase@latest link --project-ref YOUR_PROJECT_REF
npx supabase@latest db push
```

The migrations are applied chronologically:

1. `202610020001_create_jobs.sql` — jobs table, indexes, and job RLS
2. `202610040001_create_profiles.sql` — private profiles and Auth trigger
3. `202610080001_create_job_documents.sql` — document metadata and document RLS
4. `202610090001_create_job_documents_storage.sql` — private bucket and Storage policies
5. `202610130001_delete_job_with_documents.sql` — ownership-safe job deletion function

The Storage migration creates and configures the bucket automatically. It should not be made public in the Supabase Dashboard.

### 4. Configure Supabase Auth URLs

For local development, allow:

```text
Site URL: http://localhost:3000
Redirect URL: http://localhost:3000/auth/confirm
```

For deployment, add the production `/auth/confirm` URL and any authorized Vercel preview pattern. The repository's `supabase/config.toml` contains the current project URL configuration.

### 5. Start the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

```bash
npm run dev      # Start the development server
npm run lint     # Run Oxlint
npm run build    # Create a production build
npm run start    # Run the production build locally
```

## Routes

| Route | Access | Purpose |
| --- | --- | --- |
| `/` | Public | Marketing page |
| `/register` | Public | Account registration |
| `/login` | Public | Account login and password reset request |
| `/auth/confirm` | Public callback | Email confirmation and Auth redirect handling |
| `/jobs` | Authenticated | Current user's job list |
| `/jobs/new` | Authenticated | Create a job |
| `/jobs/[jobId]` | Authenticated owner | Job details and document management |
| `/jobs/[jobId]/edit` | Authenticated owner | Edit a job |

## Document security model

Document access is enforced in multiple layers:

1. Server actions require a valid Supabase user session.
2. The `job_documents` composite foreign key prevents a document from being attached to another user's job.
3. Database RLS limits every document operation to its owner.
4. Storage policies validate both the user's top-level folder and ownership of the job in the path.
5. The bucket is private; downloads and previews use expiring signed URLs.
6. Upload validation checks the extension, MIME type, size, and file signature.

Expected Storage paths:

```text
{user_id}/{job_id}/resume/{generated-name}
{user_id}/{job_id}/cover-letter/{generated-name}
```

## Deployment

Configure these environment variables for Preview and Production in Vercel:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Before promoting a deployment, verify registration and email confirmation, session persistence, two-user RLS isolation, private document upload/download/preview, and document cleanup after deleting a job.
