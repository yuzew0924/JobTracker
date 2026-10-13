'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  createDocumentDownloadUrl,
  deleteJobDocument,
  listJobDocuments,
  replaceJobDocument,
  uploadJobDocument,
} from '@/lib/documents'
import type { DocumentType, JobDocument } from '@/lib/types/document'
import { JobDocumentCard, type JobDocumentMetadata } from '@/src/components/JobDocumentCard'

const DOCUMENTS: { type: DocumentType; title: string }[] = [
  { type: 'resume', title: 'Resume' },
  { type: 'cover_letter', title: 'Cover letter' },
]

function toCardDocument(document: JobDocument): JobDocumentMetadata {
  return {
    id: document.id,
    fileName: document.file_name,
    fileSize: document.file_size ?? 0,
    uploadedAt: document.created_at,
  }
}

export function JobDocumentsPanel({ jobId }: { jobId: string }) {
  const [documents, setDocuments] = useState<JobDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    try {
      const result = await listJobDocuments(jobId)
      setDocuments(result)
      setError('')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load job documents.')
      throw caught
    } finally {
      setLoading(false)
    }
  }, [jobId])

  useEffect(() => {
    let active = true
    listJobDocuments(jobId)
      .then(result => {
        if (!active) return
        setDocuments(result)
        setError('')
      })
      .catch(caught => {
        if (active) setError(caught instanceof Error ? caught.message : 'Unable to load job documents.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [jobId])

  function documentFor(type: DocumentType) {
    return documents.find(document => document.document_type === type)
  }

  async function upload(type: DocumentType, file: File) {
    const saved = await uploadJobDocument(jobId, type, file)
    setDocuments(current => [...current.filter(document => document.document_type !== type), saved])
    return toCardDocument(saved)
  }

  async function replace(id: string, file: File) {
    const saved = await replaceJobDocument(id, file)
    setDocuments(current => current.map(document => document.id === id ? saved : document))
    return toCardDocument(saved)
  }

  async function remove(id: string) {
    await deleteJobDocument(id)
    setDocuments(current => current.filter(document => document.id !== id))
  }

  async function download(id: string) {
    const result = await createDocumentDownloadUrl(id)
    window.location.assign(result.url)
  }

  return <div className="job-documents-panel" aria-busy={loading}>
    {loading && <p className="document-panel-message" role="status">Loading documents…</p>}
    {error && <div className="document-panel-error" role="alert"><p>{error}</p><button className="outline-button" type="button" onClick={() => void refresh().catch(() => {})}>Try again</button></div>}
    {!loading && !error && DOCUMENTS.map(({ type, title }) => {
      const document = documentFor(type)
      const metadata = document ? toCardDocument(document) : null
      return <JobDocumentCard
        key={type}
        title={title}
        document={metadata}
        onUpload={file => upload(type, file)}
        onReplace={(file, current) => replace(current.id, file)}
        onDownload={current => download(current.id)}
        onDelete={current => remove(current.id)}
        onRetry={refresh}
      />
    })}
  </div>
}
