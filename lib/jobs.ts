import { createClient } from '@/lib/supabase/client'
import type { Job, JobInput } from '@/lib/types/job'

export async function listJobs(): Promise<Job[]> { const { data, error } = await createClient().from('jobs').select('*').order('updated_at', { ascending: false }); if (error) throw error; return data as Job[] }
export async function getJob(id: string): Promise<Job | null> { const { data, error } = await createClient().from('jobs').select('*').eq('id', id).maybeSingle(); if (error) throw error; return data as Job | null }
export async function createJob(input: JobInput): Promise<Job> { const client = createClient(); const { data: { user }, error: userError } = await client.auth.getUser(); if (userError) throw userError; if (!user) throw new Error('Your session expired. Please log in again.'); const { data, error } = await client.from('jobs').insert({ ...input, user_id: user.id }).select('*').single(); if (error) throw error; return data as Job }
export async function updateJob(id: string, input: JobInput): Promise<Job> { const { data, error } = await createClient().from('jobs').update(input).eq('id', id).select('*').single(); if (error) throw error; return data as Job }
export async function deleteJob(id: string): Promise<void> { const { error } = await createClient().from('jobs').delete().eq('id', id); if (error) throw error }
