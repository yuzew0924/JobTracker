'use client'

import { useId, useRef, useState, type ChangeEvent } from 'react'

export type JobDocumentStatus = 'empty' | 'selected' | 'uploading' | 'uploaded' | 'replacing' | 'deleting' | 'error'

export type JobDocumentMetadata = {
  fileName: string
  fileSize: number
  uploadedAt: string
}

type DocumentAction =
  | { type: 'upload'; file: File }
  | { type: 'replace'; file: File; document: JobDocumentMetadata }
  | { type: 'download' | 'delete'; document: JobDocumentMetadata }

type ActionResult = JobDocumentMetadata | void

export type JobDocumentCardProps = {
  title: string
  status?: JobDocumentStatus
  document?: JobDocumentMetadata | null
  error?: string
  onUpload?: (file: File) => ActionResult | Promise<ActionResult>
  onReplace?: (file: File, document: JobDocumentMetadata) => ActionResult | Promise<ActionResult>
  onDownload?: (document: JobDocumentMetadata) => void | Promise<void>
  onDelete?: (document: JobDocumentMetadata) => void | Promise<void>
  onRetry?: () => void | Promise<void>
}

const MAX_FILE_SIZE = 10 * 1024 * 1024
const ACCEPTED_FILE_TYPES = '.pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document'

export function JobDocumentCard({ title, status: externalStatus, document, error, onUpload, onReplace, onDownload, onDelete, onRetry }: JobDocumentCardProps) {
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [localFile, setLocalFile] = useState<File | null>(null)
  const [localError, setLocalError] = useState('')
  const [operation, setOperation] = useState<'uploading' | 'replacing' | 'deleting' | null>(null)
  const [downloading, setDownloading] = useState(false)
  const [retryAction, setRetryAction] = useState<DocumentAction | null>(null)
  const [documentOverride, setDocumentOverride] = useState<{ source: JobDocumentMetadata | null | undefined; value: JobDocumentMetadata | null } | null>(null)

  const activeDocument = documentOverride && documentOverride.source === document ? documentOverride.value : document ?? null
  const status: JobDocumentStatus = operation
    ?? (localError || externalStatus === 'error' ? 'error' : undefined)
    ?? (localFile ? 'selected' : undefined)
    ?? externalStatus
    ?? (activeDocument ? 'uploaded' : 'empty')
  const statusLabels: Record<JobDocumentStatus, string> = {
    empty: 'Empty', selected: 'Selected', uploading: 'Uploading', uploaded: 'Uploaded', replacing: 'Replacing', deleting: 'Deleting', error: 'Error',
  }
  const isBusy = status === 'uploading' || status === 'replacing' || status === 'deleting' || downloading
  const message = localError || error || 'Something went wrong. Please try again.'

  function chooseFile() {
    inputRef.current?.click()
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ''
    if (!file) return

    const extension = file.name.toLowerCase().split('.').pop()
    if (extension !== 'pdf' && extension !== 'docx') {
      setLocalFile(null)
      setLocalError('Choose a PDF or DOCX file.')
      setRetryAction(null)
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      setLocalFile(null)
      setLocalError('The file must be 10 MB or smaller.')
      setRetryAction(null)
      return
    }

    setLocalError('')
    setRetryAction(null)
    setLocalFile(file)
  }

  async function runAction(action: DocumentAction) {
    setLocalError('')
    try {
      if (action.type === 'upload') {
        if (!onUpload) throw new Error('This document action is not connected yet.')
        setOperation('uploading')
        const result = await onUpload(action.file)
        if (result) setDocumentOverride({ source: document, value: result })
        setLocalFile(null)
      } else if (action.type === 'replace') {
        if (!onReplace) throw new Error('This document action is not connected yet.')
        setOperation('replacing')
        const result = await onReplace(action.file, action.document)
        if (result) setDocumentOverride({ source: document, value: result })
        setLocalFile(null)
      } else if (action.type === 'download') {
        if (!onDownload) throw new Error('This document action is not connected yet.')
        setDownloading(true)
        await onDownload(action.document)
      } else {
        if (!onDelete) throw new Error('This document action is not connected yet.')
        setOperation('deleting')
        await onDelete(action.document)
        setDocumentOverride({ source: document, value: null })
        setLocalFile(null)
      }
      setRetryAction(null)
    } catch (caught) {
      setLocalError(caught instanceof Error ? caught.message : 'Something went wrong. Please try again.')
      setRetryAction(action)
    } finally {
      setOperation(null)
      setDownloading(false)
    }
  }

  function submitSelectedFile() {
    if (!localFile) return
    if (activeDocument) void runAction({ type: 'replace', file: localFile, document: activeDocument })
    else void runAction({ type: 'upload', file: localFile })
  }

  function clearSelection() {
    setLocalFile(null)
    setLocalError('')
    setRetryAction(null)
  }

  async function retry() {
    if (retryAction) await runAction(retryAction)
    else if (onRetry) {
      setLocalError('')
      try {
        await onRetry()
      } catch (caught) {
        setLocalError(caught instanceof Error ? caught.message : 'Something went wrong. Please try again.')
      }
    }
    else chooseFile()
  }

  function renderDocumentActions(disabled = false) {
    if (!activeDocument) return null
    return <div className="document-card-actions">
      <button className="outline-button" type="button" disabled={disabled || downloading} onClick={() => void runAction({ type: 'download', document: activeDocument })}>{downloading ? 'Preparing download…' : 'Download'}</button>
      <button className="outline-button" type="button" disabled={disabled} onClick={chooseFile}>Replace</button>
      <button className="danger-button" type="button" disabled={disabled} onClick={() => void runAction({ type: 'delete', document: activeDocument })}>Delete</button>
    </div>
  }

  return <section className="detail-card document-card" aria-busy={isBusy}>
    <h3><span className="document-card-icon" aria-hidden="true">▤</span>{title}<span className={`document-status-badge is-${status}`} aria-live="polite">{statusLabels[status]}</span></h3>
    <input ref={inputRef} className="file-input-hidden" id={inputId} type="file" accept={ACCEPTED_FILE_TYPES} onChange={handleFileChange} />

    {status === 'empty' && <div className="document-empty-state">
      <span className="document-empty-icon" aria-hidden="true">▤</span>
      <strong>No {title.toLowerCase()} uploaded</strong>
      <p>Choose a file to attach it to this job.</p>
      <button className="primary-button" type="button" onClick={chooseFile}>Choose file</button>
      <small>PDF or DOCX, up to 10 MB</small>
    </div>}

    {status === 'selected' && <div className="document-state-content">
      {activeDocument && <DocumentDetails document={activeDocument} />}
      {localFile ? <SelectedFileDetails file={localFile} /> : <p className="document-help">Select a PDF or DOCX file up to 10 MB.</p>}
      <div className="document-card-actions">
        <button className="primary-button" type="button" disabled={!localFile} onClick={submitSelectedFile}>{activeDocument ? 'Replace document' : 'Upload document'}</button>
        <button className="outline-button" type="button" onClick={activeDocument ? clearSelection : chooseFile}>{activeDocument ? 'Cancel' : 'Choose file'}</button>
      </div>
      {activeDocument && renderDocumentActions()}
      <small className="document-help">PDF or DOCX, up to 10 MB</small>
    </div>}

    {status === 'uploading' && <div className="document-progress-state"><span className="spinner" /><div><strong>Uploading {localFile?.name || title.toLowerCase()}…</strong><small>Keep this page open until the upload finishes.</small></div></div>}

    {status === 'uploaded' && <div className="document-state-content">
      {activeDocument ? <DocumentDetails document={activeDocument} /> : <p className="document-help">The document has been uploaded.</p>}
      {renderDocumentActions()}
      <small className="document-help">PDF or DOCX, up to 10 MB</small>
    </div>}

    {status === 'replacing' && <div className="document-state-content">
      {activeDocument && <DocumentDetails document={activeDocument} />}
      {localFile && <SelectedFileDetails file={localFile} />}
      <div className="document-progress-state"><span className="spinner" /><div><strong>Replacing document…</strong><small>{localFile?.name || 'Your current file will remain until the replacement is ready.'}</small></div></div>
      {renderDocumentActions(true)}
    </div>}

    {status === 'deleting' && <div className="document-state-content">
      {activeDocument && <DocumentDetails document={activeDocument} />}
      <div className="document-progress-state"><span className="spinner" /><div><strong>Deleting document…</strong><small>Please wait while this file is removed.</small></div></div>
      {renderDocumentActions(true)}
    </div>}

    {status === 'error' && <div className="document-state-content">
      {activeDocument && <DocumentDetails document={activeDocument} />}
      {localFile && <SelectedFileDetails file={localFile} />}
      <p className="document-error" role="alert">{message}</p>
      <div className="document-card-actions">
        <button className="primary-button" type="button" onClick={() => void retry()}>{retryAction || onRetry ? 'Try again' : 'Choose another file'}</button>
      </div>
      {renderDocumentActions()}
      <small className="document-help">PDF or DOCX, up to 10 MB</small>
    </div>}
  </section>
}

function DocumentDetails({ document }: { document: JobDocumentMetadata }) {
  return <div className="document-file-summary">
    <span className="document-file-icon" aria-hidden="true">{getFileTypeLabel(document.fileName)}</span>
    <div className="document-file-info">
      <strong className="document-file-name" title={document.fileName}>{document.fileName}</strong>
      <span>{formatFileSize(document.fileSize)} · Uploaded {formatUploadedAt(document.uploadedAt)}</span>
    </div>
  </div>
}

function SelectedFileDetails({ file }: { file: File }) {
  return <div className="document-file-summary is-selected">
    <span className="document-file-icon" aria-hidden="true">{file.name.toLowerCase().endsWith('.docx') ? 'DOCX' : 'PDF'}</span>
    <div className="document-file-info">
      <strong className="document-file-name" title={file.name}>{file.name}</strong>
      <span>{formatFileSize(file.size)} · Ready to upload</span>
    </div>
  </div>
}

function getFileTypeLabel(fileName: string) {
  return fileName.toLowerCase().endsWith('.docx') ? 'DOCX' : 'PDF'
}

function formatFileSize(size: number) {
  return size < 1024 * 1024 ? `${Math.max(1, Math.round(size / 1024))} KB` : `${(size / (1024 * 1024)).toFixed(1)} MB`
}

function formatUploadedAt(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(date)
}
