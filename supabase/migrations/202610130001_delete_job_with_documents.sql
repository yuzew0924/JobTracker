-- Delete a user's job_documents and job atomically after Storage cleanup.
-- Storage objects cannot be removed by a database cascade, so the application
-- backs them up and deletes them before calling this function.
create or replace function public.delete_job_with_documents(target_job_id uuid)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  owned_job_id uuid;
begin
  select jobs.id
    into owned_job_id
    from public.jobs
    where jobs.id = target_job_id
      and jobs.user_id = (select auth.uid())
    for update;

  if owned_job_id is null then
    return false;
  end if;

  delete from public.job_documents
    where job_documents.job_id = owned_job_id
      and job_documents.user_id = (select auth.uid());

  delete from public.jobs
    where jobs.id = owned_job_id
      and jobs.user_id = (select auth.uid());

  return found;
end;
$$;

revoke all on function public.delete_job_with_documents(uuid) from public, anon;
grant execute on function public.delete_job_with_documents(uuid) to authenticated;
