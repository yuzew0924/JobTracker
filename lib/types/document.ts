export const DOCUMENT_TYPES = ['resume', 'cover_letter'] as const

export type DocumentType = (typeof DOCUMENT_TYPES)[number]

export type JobDocument = {
  id: string
  job_id: string
  document_type: DocumentType
  file_name: string
  file_size: number | null
  mime_type: string | null
  created_at: string
  updated_at: string
}

export type DocumentDownload = {
  url: string
  expiresIn: number
  fileName: string
}
