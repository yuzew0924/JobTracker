-- JobTracker Week 2: private document storage for resumes and cover letters.
insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'job-documents',
  'job-documents',
  false,
  10485760,
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]::text[]
)
on conflict (id) do update
set
  name = excluded.name,
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Expected object name:
-- {user_id}/{job_id}/{resume|cover-letter}/{filename}
--
-- Every policy verifies both the authenticated user's top-level folder and
-- ownership of the job represented by the second path segment. The latter
-- prevents a user from binding an object path to another user's job.
drop policy if exists "Users can read their own job document objects"
  on storage.objects;
create policy "Users can read their own job document objects"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'job-documents'
    and array_length(storage.foldername(name), 1) = 3
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (storage.foldername(name))[3] in ('resume', 'cover-letter')
    and exists (
      select 1
      from public.jobs
      where jobs.id::text = (storage.foldername(name))[2]
        and jobs.user_id = (select auth.uid())
    )
  );

drop policy if exists "Users can upload their own job document objects"
  on storage.objects;
create policy "Users can upload their own job document objects"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'job-documents'
    and array_length(storage.foldername(name), 1) = 3
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (storage.foldername(name))[3] in ('resume', 'cover-letter')
    and exists (
      select 1
      from public.jobs
      where jobs.id::text = (storage.foldername(name))[2]
        and jobs.user_id = (select auth.uid())
    )
  );

drop policy if exists "Users can replace their own job document objects"
  on storage.objects;
create policy "Users can replace their own job document objects"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'job-documents'
    and array_length(storage.foldername(name), 1) = 3
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (storage.foldername(name))[3] in ('resume', 'cover-letter')
    and exists (
      select 1
      from public.jobs
      where jobs.id::text = (storage.foldername(name))[2]
        and jobs.user_id = (select auth.uid())
    )
  )
  with check (
    bucket_id = 'job-documents'
    and array_length(storage.foldername(name), 1) = 3
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (storage.foldername(name))[3] in ('resume', 'cover-letter')
    and exists (
      select 1
      from public.jobs
      where jobs.id::text = (storage.foldername(name))[2]
        and jobs.user_id = (select auth.uid())
    )
  );

drop policy if exists "Users can delete their own job document objects"
  on storage.objects;
create policy "Users can delete their own job document objects"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'job-documents'
    and array_length(storage.foldername(name), 1) = 3
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (storage.foldername(name))[3] in ('resume', 'cover-letter')
    and exists (
      select 1
      from public.jobs
      where jobs.id::text = (storage.foldername(name))[2]
        and jobs.user_id = (select auth.uid())
    )
  );
