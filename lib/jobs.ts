import type { SupabaseClient } from '@supabase/supabase-js'
import type { Job, JobInput } from '@/lib/types/job'

export async function listJobs(client: SupabaseClient): Promise<Job[]> {
  const { data, error } = await client.from('jobs').select('*').order('updated_at', { ascending: false })
  if (error) throw error
  return data as Job[]
}

export async function getJob(client: SupabaseClient, id: string): Promise<Job | null> {
  const { data, error } = await client.from('jobs').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data as Job | null
}

export async function createJob(client: SupabaseClient, input: JobInput): Promise<Job> {
  const { data: { user }, error: userError } = await client.auth.getUser()
  if (userError) throw userError
  if (!user) throw new Error('Your session expired. Please log in again.')
  const { data, error } = await client.from('jobs').insert({ ...input, user_id: user.id }).select('*').single()
  if (error) throw error
  return data as Job
}

export async function updateJob(client: SupabaseClient, id: string, input: JobInput): Promise<Job> {
  const { data, error } = await client.from('jobs').update(input).eq('id', id).select('*').single()
  if (error) throw error
  return data as Job
}

export async function deleteJob(client: SupabaseClient, id: string): Promise<void> {
  const { error } = await client.from('jobs').delete().eq('id', id)
  if (error) throw error
}
