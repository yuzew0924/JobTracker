'use server'

import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import type { DocumentType } from '@/lib/types/document'

const BUCKET = 'job-documents'

type StoredDocument = {
  id: string
  user_id: string
  job_id: string
  document_type: DocumentType
  file_name: string
  storage_path: string
  file_size: number | null
  mime_type: string | null
  created_at: string
  updated_at: string
}

type DocumentBackup = {
  document: StoredDocument
  contents: Blob
}

export async function deleteJobWithDocuments(jobId: string): Promise<void> {
  const client = await createClient()
  const { data: { user }, error: authError } = await client.auth.getUser()
  if (authError || !user) throw new Error('You must be logged in to delete a job.')

  const { data: job, error: jobError } = await client
    .from('jobs')
    .select('id')
    .eq('id', jobId)
    .eq('user_id', user.id)
    .maybeSingle()
  if (jobError) throw new Error(`Unable to verify job access: ${jobError.message}`)
  if (!job) throw new Error('Job not found or you do not have access to it.')

  const { data, error: documentsError } = await client
    .from('job_documents')
    .select('*')
    .eq('job_id', jobId)
    .eq('user_id', user.id)
  if (documentsError) throw new Error(`Unable to load job documents: ${documentsError.message}`)

  const documents = data as StoredDocument[]
  const backups = await backupDocuments(client, documents)
  const paths = documents.map(document => document.storage_path)

  if (paths.length) {
    const { error: storageError } = await client.storage.from(BUCKET).remove(paths)
    if (storageError) {
      const restoreErrors = await restoreDocuments(client, backups)
      throw cleanupError('Unable to remove job files', storageError.message, restoreErrors)
    }
  }

  // The RPC deletes job_documents and the job in one database transaction.
  // If either statement fails, PostgreSQL rolls both back before we restore Storage.
  const { data: deleted, error: deleteError } = await client.rpc('delete_job_with_documents', {
    target_job_id: jobId,
  })

  if (deleteError || deleted !== true) {
    const restoreErrors = await restoreDocuments(client, backups)
    const reason = deleteError?.message ?? 'The job no longer exists or access was denied.'
    throw cleanupError('Unable to delete job', reason, restoreErrors)
  }
}

async function backupDocuments(
  client: SupabaseClient,
  documents: StoredDocument[],
): Promise<DocumentBackup[]> {
  const backups: DocumentBackup[] = []

  for (const document of documents) {
    const { data, error } = await client.storage.from(BUCKET).download(document.storage_path)
    if (error || !data) {
      throw new Error(`Unable to prepare ${document.file_name} for safe deletion: ${error?.message ?? 'Download failed.'}`)
    }
    backups.push({ document, contents: data })
  }

  return backups
}

async function restoreDocuments(
  client: SupabaseClient,
  backups: DocumentBackup[],
): Promise<string[]> {
  const errors: string[] = []

  for (const { document, contents } of backups) {
    const { error } = await client.storage.from(BUCKET).upload(document.storage_path, contents, {
      contentType: document.mime_type ?? undefined,
      upsert: true,
    })
    if (error) errors.push(`${document.file_name}: ${error.message}`)
  }

  return errors
}

function cleanupError(prefix: string, reason: string, restoreErrors: string[]): Error {
  return new Error(restoreErrors.length
    ? `${prefix}: ${reason}. Some files could not be restored: ${restoreErrors.join('; ')}`
    : `${prefix}: ${reason}. The original job and files were kept.`)
}
