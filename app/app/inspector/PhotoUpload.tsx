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
    <div className="p-5 bg-white rounded-lg border border-gray-200">
      <h2 className="text-sm font-semibold text-gray-700 mb-4">
        Photos{signedUrls.length > 0 ? ` (${signedUrls.length})` : ''}
      </h2>

      {signedUrls.length > 0 && (
        <div className="grid grid-cols-3 gap-2 mb-4">
          {signedUrls.map((url, i) => (
            <a key={i} href={url} target="_blank" rel="noopener noreferrer"
              className="aspect-square rounded-md overflow-hidden border border-gray-200 bg-gray-100 block relative"
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
        <p className="text-sm text-gray-400 mb-4">No photos uploaded yet.</p>
      )}

      {signedUrls.length === 0 && disabled && (
        <p className="text-sm text-gray-400">No photos were uploaded for this inspection.</p>
      )}

      {!disabled && (
        <div className="space-y-3">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100"
          />
          <button
            type="button"
            onClick={handleUpload}
            disabled={uploading}
            className="rounded-md bg-gray-800 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-700 disabled:opacity-50 transition-colors"
          >
            {uploading ? 'Uploading...' : 'Upload Photos'}
          </button>
          <p className="text-xs text-gray-400">Max 10 files, 5MB each. JPEG, PNG, or WebP.</p>
        </div>
      )}

      {error && (
        <div className="mt-3 rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {error}
        </div>
      )}
    </div>
  )
}
