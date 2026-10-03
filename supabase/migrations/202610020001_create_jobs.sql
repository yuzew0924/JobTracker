-- JobTracker Week 1: jobs owned by the authenticated Supabase user.
create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company_name text not null check (length(trim(company_name)) > 0),
  position_title text not null check (length(trim(position_title)) > 0),
  job_url text,
  location text,
  status text not null default 'Interested'
    check (status in ('Interested', 'Preparing', 'Applied', 'Interview', 'Offer', 'Rejected')),
  job_description text,
  notes text,
  application_deadline date,
  applied_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists jobs_user_id_updated_at_idx on public.jobs (user_id, updated_at desc);
create index if not exists jobs_user_id_status_idx on public.jobs (user_id, status);

create or replace function public.set_jobs_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists jobs_set_updated_at on public.jobs;
create trigger jobs_set_updated_at
before update on public.jobs
for each row execute function public.set_jobs_updated_at();

alter table public.jobs enable row level security;

drop policy if exists "Users can read their own jobs" on public.jobs;
create policy "Users can read their own jobs"
  on public.jobs for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "Users can create their own jobs" on public.jobs;
create policy "Users can create their own jobs"
  on public.jobs for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own jobs" on public.jobs;
create policy "Users can update their own jobs"
  on public.jobs for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own jobs" on public.jobs;
create policy "Users can delete their own jobs"
  on public.jobs for delete to authenticated using ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.jobs to authenticated;
