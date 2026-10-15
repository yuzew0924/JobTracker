'use client'

import { useEffect, useRef, useState } from 'react'
import type { DocumentPreview } from '@/lib/types/document'

export function DocumentPreviewModal({ preview, onClose }: { preview: DocumentPreview; onClose: () => void }) {
  const isDocx = preview.fileName.toLowerCase().endsWith('.docx')
  const docxContainer = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(isDocx)
  const [error, setError] = useState('')

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  useEffect(() => {
    if (!isDocx || !docxContainer.current) return
    const controller = new AbortController()
    const container = docxContainer.current

    async function renderDocument() {
      try {
        const response = await fetch(preview.url, { signal: controller.signal })
        if (!response.ok) throw new Error('The preview link could not be loaded.')
        const documentBlob = await response.blob()
        const { renderAsync } = await import('docx-preview')
        if (controller.signal.aborted) return
        await renderAsync(documentBlob, container, undefined, {
          breakPages: true,
          ignoreLastRenderedPageBreak: false,
          useBase64URL: true,
        })
        setLoading(false)
      } catch (caught) {
        if (controller.signal.aborted) return
        setError(caught instanceof Error ? caught.message : 'Unable to preview this document.')
        setLoading(false)
      }
    }

    void renderDocument()
    return () => {
      controller.abort()
      container.replaceChildren()
    }
  }, [isDocx, preview.url])

  return <div className="document-preview-backdrop" role="presentation" onMouseDown={event => {
    if (event.target === event.currentTarget) onClose()
  }}>
    <section className="document-preview-dialog" role="dialog" aria-modal="true" aria-labelledby="document-preview-title">
      <header className="document-preview-header">
        <div>
          <span>Document preview</span>
          <h2 id="document-preview-title" title={preview.fileName}>{preview.fileName}</h2>
        </div>
        <button className="document-preview-close" type="button" onClick={onClose} aria-label="Close preview">×</button>
      </header>
      <div className={`document-preview-body${isDocx ? ' is-docx' : ' is-pdf'}`}>
        {isDocx ? <>
          {loading && <div className="document-preview-message" role="status"><span className="spinner" />Rendering document…</div>}
          {error && <div className="document-preview-message is-error" role="alert">{error}</div>}
          <div ref={docxContainer} className="document-preview-docx" hidden={loading || Boolean(error)} />
        </> : <iframe src={preview.url} title={`Preview of ${preview.fileName}`} />}
      </div>
      <footer className="document-preview-footer">
        <span>This private preview expires in {Math.round(preview.expiresIn / 60)} minutes.</span>
        <button className="outline-button" type="button" onClick={onClose}>Close</button>
      </footer>
    </section>
  </div>
}
