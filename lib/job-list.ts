'use server'

import { createClient } from '@/lib/supabase/server'
import type { JobListItem } from '@/lib/types/job'
import type { DocumentType } from '@/lib/types/document'

export async function listJobsWithDocumentStatus(): Promise<JobListItem[]> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError) throw authError
  if (!user) throw new Error('Your session expired. Please log in again.')

  const { data: jobs, error: jobsError } = await supabase
    .from('jobs')
    .select('*')
    .order('updated_at', { ascending: false })
  if (jobsError) throw new Error(`Unable to load jobs: ${jobsError.message}`)
  if (!jobs?.length) return []

  const { data: documents, error: documentsError } = await supabase
    .from('job_documents')
    .select('job_id, document_type')
    .in('job_id', jobs.map(job => job.id))
  if (documentsError) throw new Error(`Unable to load document status: ${documentsError.message}`)

  const statusByJob = new Map<string, Set<DocumentType>>()
  for (const document of documents ?? []) {
    const statuses = statusByJob.get(document.job_id) ?? new Set<DocumentType>()
    statuses.add(document.document_type as DocumentType)
    statusByJob.set(document.job_id, statuses)
  }

  return jobs.map(job => {
    const statuses = statusByJob.get(job.id)
    return {
      ...job,
      document_status: {
        resume: statuses?.has('resume') ?? false,
        cover_letter: statuses?.has('cover_letter') ?? false,
      },
    }
  }) as JobListItem[]
}
