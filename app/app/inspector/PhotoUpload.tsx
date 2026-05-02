'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'

interface PhotoUploadProps {
  leadId: string
  signedUrls: string[]
  disabled: boolean
}

export default function PhotoUpload({ leadId, signedUrls, disabled }: PhotoUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleUpload() {
    const files = inputRef.current?.files
    if (!files || files.length === 0) return

    setUploading(true)
    setError(null)

    const formData = new FormData()
    formData.set('lead_id', leadId)
    for (const file of Array.from(files)) {
      formData.append('files', file)
    }

    try {
      const res = await fetch('/api/upload-photos', {
        method: 'POST',
        body: formData,
      })

      const json = await res.json()

      if (!res.ok) {
        setError(json.error || 'Upload failed')
        return
      }

      window.location.reload()
    } catch {
      setError('Network error -- try again')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-warm-gray mb-4">
        Photos{signedUrls.length > 0 ? ` (${signedUrls.length})` : ''}
      </p>

      {signedUrls.length > 0 && (
        <div className="grid grid-cols-3 gap-2 mb-4">
          {signedUrls.map((url, i) => (
            <a key={i} href={url} target="_blank" rel="noopener noreferrer"
              className="aspect-square rounded-lg overflow-hidden border border-[var(--card-border)] block relative hover:opacity-80 transition-opacity"
            >
              <Image
                src={url}
                alt={`Photo ${i + 1}`}
                fill
                className="object-cover"
                unoptimized
              />
            </a>
          ))}
        </div>
      )}

      {signedUrls.length === 0 && !disabled && (
        <p className="text-sm text-warm-gray/60 mb-4">No photos uploaded yet.</p>
      )}

      {signedUrls.length === 0 && disabled && (
        <p className="text-sm text-warm-gray/60">No photos were uploaded for this inspection.</p>
      )}

      {!disabled && (
        <div className="space-y-3">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="block w-full text-sm text-foreground/60 file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--surface-warm)] file:px-3 file:py-2 file:text-sm file:font-medium file:text-foreground hover:file:bg-gold/10 hover:file:text-gold transition-colors"
          />
          <button
            type="button"
            onClick={handleUpload}
            disabled={uploading}
            className="rounded-lg gradient-gold px-4 py-2 text-sm font-bold text-white transition-colors disabled:opacity-50"
          >
            {uploading ? 'Uploading...' : 'Upload Photos'}
          </button>
          <p className="text-[11px] text-warm-gray/50">Max 10 files, 5MB each. JPEG, PNG, or WebP.</p>
        </div>
      )}

      {error && (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-400/30 dark:bg-red-400/10 dark:text-red-100">
          {error}
        </div>
      )}
    </div>
  )
}
