'use server'

import type { SupabaseClient, User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import type { DocumentDownload, DocumentType, JobDocument } from '@/lib/types/document'

const BUCKET = 'job-documents'
const MAX_FILE_SIZE = 10 * 1024 * 1024
const SIGNED_URL_LIFETIME_SECONDS = 60
const MIME_TYPES = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
} as const

type AllowedExtension = keyof typeof MIME_TYPES
type StoredJobDocument = JobDocument & {
  user_id: string
  storage_path: string
}

export async function listJobDocuments(jobId: string): Promise<JobDocument[]> {
  const { client } = await authenticatedClient()
  await requireOwnedJob(client, jobId)

  const { data, error } = await client
    .from('job_documents')
    .select('*')
    .eq('job_id', jobId)
    .order('document_type')

  if (error) throw new Error(`Unable to load documents: ${error.message}`)
  return (data as StoredJobDocument[]).map(toPublicDocument)
}

export async function uploadJobDocument(
  jobId: string,
  documentType: DocumentType,
  file: File,
): Promise<JobDocument> {
  const validated = await validateFile(file)
  requireDocumentType(documentType)

  const { client, user } = await authenticatedClient()
  await requireOwnedJob(client, jobId)

  const storagePath = createStoragePath(user.id, jobId, documentType, validated.fileName)
  const { error: uploadError } = await client.storage
    .from(BUCKET)
    .upload(storagePath, file, { contentType: validated.mimeType, upsert: false })

  if (uploadError) throw new Error(`Unable to upload document: ${uploadError.message}`)

  const { data, error: insertError } = await client
    .from('job_documents')
    .insert({
      user_id: user.id,
      job_id: jobId,
      document_type: documentType,
      file_name: validated.fileName,
      storage_path: storagePath,
      file_size: file.size,
      mime_type: validated.mimeType,
    })
    .select('*')
    .single()

  if (insertError) {
    const cleanupError = await removeStorageObject(client, storagePath)
    throw consistencyError('Unable to save document', insertError.message, cleanupError)
  }

  return toPublicDocument(data as StoredJobDocument)
}

export async function createDocumentDownloadUrl(documentId: string): Promise<DocumentDownload> {
  const { client } = await authenticatedClient()
  const document = await requireOwnedDocument(client, documentId)
  const { data, error } = await client.storage
    .from(BUCKET)
    .createSignedUrl(document.storage_path, SIGNED_URL_LIFETIME_SECONDS, {
      download: document.file_name,
    })

  if (error) throw new Error(`Unable to prepare download: ${error.message}`)
  return {
    url: data.signedUrl,
    expiresIn: SIGNED_URL_LIFETIME_SECONDS,
    fileName: document.file_name,
  }
}

export async function replaceJobDocument(documentId: string, file: File): Promise<JobDocument> {
  const validated = await validateFile(file)
  const { client, user } = await authenticatedClient()
  const current = await requireOwnedDocument(client, documentId)
  const newPath = createStoragePath(
    user.id,
    current.job_id,
    current.document_type,
    validated.fileName,
  )

  const { error: uploadError } = await client.storage
    .from(BUCKET)
    .upload(newPath, file, { contentType: validated.mimeType, upsert: false })
  if (uploadError) throw new Error(`Unable to upload replacement: ${uploadError.message}`)

  const { data, error: updateError } = await client
    .from('job_documents')
    .update({
      file_name: validated.fileName,
      storage_path: newPath,
      file_size: file.size,
      mime_type: validated.mimeType,
    })
    .eq('id', documentId)
    .select('*')
    .single()

  if (updateError) {
    const cleanupError = await removeStorageObject(client, newPath)
    throw consistencyError('Unable to save replacement', updateError.message, cleanupError)
  }

  const oldFileRemovalError = await removeStorageObject(client, current.storage_path)
  if (!oldFileRemovalError) return toPublicDocument(data as StoredJobDocument)

  // Keep the operation atomic from the user's perspective: if the old object
  // cannot be removed, point the database back to it before removing the new one.
  const { error: rollbackError } = await client
    .from('job_documents')
    .update(documentMetadata(current))
    .eq('id', documentId)
    .select('id')
    .single()

  if (rollbackError) {
    throw new Error(
      `The replacement was saved, but the old file could not be removed and rollback failed: ${oldFileRemovalError}; ${rollbackError.message}`,
    )
  }

  const newFileCleanupError = await removeStorageObject(client, newPath)
  throw consistencyError(
    'Unable to replace document; the original document was kept',
    oldFileRemovalError,
    newFileCleanupError,
  )
}

export async function deleteJobDocument(documentId: string): Promise<void> {
  const { client } = await authenticatedClient()
  const document = await requireOwnedDocument(client, documentId)

  // Delete the row first so a failed object removal can be compensated by
  // restoring the complete row. This avoids leaving a visible row for a file
  // that has already disappeared.
  const { error: deleteError } = await client
    .from('job_documents')
    .delete()
    .eq('id', documentId)
  if (deleteError) throw new Error(`Unable to delete document: ${deleteError.message}`)

  const storageError = await removeStorageObject(client, document.storage_path)
  if (!storageError) return

  const { error: restoreError } = await client.from('job_documents').insert(document)
  if (restoreError) {
    throw new Error(
      `The database record was deleted, but the file could not be removed and the record could not be restored: ${storageError}; ${restoreError.message}`,
    )
  }

  throw new Error(`Unable to delete the stored file; the document record was restored: ${storageError}`)
}

async function authenticatedClient(): Promise<{ client: SupabaseClient; user: User }> {
  const client = await createClient()
  const { data: { user }, error } = await client.auth.getUser()

  if (error || !user) throw new Error('You must be logged in to manage documents.')
  return { client, user }
}

async function requireOwnedJob(client: SupabaseClient, jobId: string): Promise<void> {
  const { data, error } = await client
    .from('jobs')
    .select('id')
    .eq('id', jobId)
    .maybeSingle()

  if (error) throw new Error(`Unable to verify job access: ${error.message}`)
  if (!data) throw new Error('Job not found or you do not have access to it.')
}

async function requireOwnedDocument(client: SupabaseClient, documentId: string): Promise<StoredJobDocument> {
  const { data, error } = await client
    .from('job_documents')
    .select('*')
    .eq('id', documentId)
    .maybeSingle()

  if (error) throw new Error(`Unable to load document: ${error.message}`)
  if (!data) throw new Error('Document not found or you do not have access to it.')
  return data as StoredJobDocument
}

async function validateFile(file: File): Promise<{ fileName: string; mimeType: string }> {
  if (!file || typeof file.name !== 'string') throw new Error('Choose a file to upload.')
  if (file.size <= 0) throw new Error('The selected file is empty.')
  if (file.size > MAX_FILE_SIZE) throw new Error('The file must be 10 MB or smaller.')

  const fileName = sanitizeFileName(file.name)
  const extension = extensionOf(fileName)
  if (!extension) throw new Error('Only PDF and DOCX files are allowed.')

  const mimeType = MIME_TYPES[extension]
  if (file.type && file.type !== mimeType) {
    throw new Error(`The file content type does not match its .${extension} extension.`)
  }

  const signature = new Uint8Array(await file.slice(0, 5).arrayBuffer())
  const validSignature = extension === 'pdf'
    ? signature.length >= 5 && String.fromCharCode(...signature) === '%PDF-'
    : signature.length >= 4
      && signature[0] === 0x50
      && signature[1] === 0x4b
      && ((signature[2] === 0x03 && signature[3] === 0x04)
        || (signature[2] === 0x05 && signature[3] === 0x06)
        || (signature[2] === 0x07 && signature[3] === 0x08))
  if (!validSignature) throw new Error(`The selected file is not a valid ${extension.toUpperCase()} file.`)

  return { fileName, mimeType }
}

function sanitizeFileName(originalName: string): string {
  const baseName = originalName.normalize('NFKC').split(/[\\/]/).pop()?.trim() ?? ''
  const extension = extensionOf(baseName)
  if (!extension) throw new Error('Only PDF and DOCX files are allowed.')

  const stem = baseName.slice(0, -(extension.length + 1))
    .replace(/[^\p{L}\p{N}._ -]+/gu, '-')
    .replace(/\s+/g, ' ')
    .replace(/^[. -]+|[. -]+$/g, '')
    .slice(0, 100)
    .replace(/[. -]+$/g, '')

  return `${stem || 'document'}.${extension}`
}

function extensionOf(fileName: string): AllowedExtension | null {
  const extension = fileName.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1]
  return extension === 'pdf' || extension === 'docx' ? extension : null
}

function requireDocumentType(value: string): asserts value is DocumentType {
  if (value !== 'resume' && value !== 'cover_letter') {
    throw new Error('Document type must be resume or cover letter.')
  }
}

function createStoragePath(
  userId: string,
  jobId: string,
  documentType: DocumentType,
  fileName: string,
): string {
  const folder = documentType === 'cover_letter' ? 'cover-letter' : 'resume'
  return `${userId}/${jobId}/${folder}/${crypto.randomUUID()}-${fileName}`
}

function documentMetadata(document: StoredJobDocument) {
  return {
    file_name: document.file_name,
    storage_path: document.storage_path,
    file_size: document.file_size,
    mime_type: document.mime_type,
  }
}

function toPublicDocument(document: StoredJobDocument): JobDocument {
  return {
    id: document.id,
    job_id: document.job_id,
    document_type: document.document_type,
    file_name: document.file_name,
    file_size: document.file_size,
    mime_type: document.mime_type,
    created_at: document.created_at,
    updated_at: document.updated_at,
  }
}

async function removeStorageObject(client: SupabaseClient, path: string): Promise<string | null> {
  const { error } = await client.storage.from(BUCKET).remove([path])
  return error?.message ?? null
}

function consistencyError(prefix: string, operationError: string, cleanupError: string | null): Error {
  return new Error(cleanupError
    ? `${prefix}: ${operationError}. Automatic cleanup also failed: ${cleanupError}`
    : `${prefix}: ${operationError}`)
}
