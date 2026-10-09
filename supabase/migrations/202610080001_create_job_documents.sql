-- JobTracker Week 2: one private resume and cover letter per job.
-- The composite foreign key guarantees a document can only reference a job
-- owned by the same user, independently of application-layer validation.
create unique index if not exists jobs_id_user_id_idx
  on public.jobs (id, user_id);

create table if not exists public.job_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid not null,
  document_type text not null
    check (document_type in ('resume', 'cover_letter')),
  file_name text not null
    check (length(trim(file_name)) > 0),
  storage_path text not null
    check (length(trim(storage_path)) > 0),
  file_size bigint
    check (file_size is null or (file_size >= 0 and file_size <= 10485760)),
  mime_type text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint job_documents_job_owner_fkey
    foreign key (job_id, user_id)
    references public.jobs (id, user_id)
    on delete cascade,
  constraint job_documents_job_type_key
    unique (job_id, document_type)
);

create index if not exists job_documents_user_id_idx
  on public.job_documents (user_id);

create index if not exists job_documents_job_id_idx
  on public.job_documents (job_id);

create or replace function public.set_job_documents_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists job_documents_set_updated_at on public.job_documents;
create trigger job_documents_set_updated_at
before update on public.job_documents
for each row execute function public.set_job_documents_updated_at();

alter table public.job_documents enable row level security;

revoke all on table public.job_documents from anon, authenticated;
grant select, insert, update, delete on public.job_documents to authenticated;

drop policy if exists "Users can read their own job documents" on public.job_documents;
create policy "Users can read their own job documents"
  on public.job_documents
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can create their own job documents" on public.job_documents;
create policy "Users can create their own job documents"
  on public.job_documents
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own job documents" on public.job_documents;
create policy "Users can update their own job documents"
  on public.job_documents
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own job documents" on public.job_documents;
create policy "Users can delete their own job documents"
  on public.job_documents
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);
