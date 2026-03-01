import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import { checkOtpRateLimit } from '@/lib/rateLimit'

const MAX_FILES = 10
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Magic byte signatures for allowed image types
const MAGIC_BYTES: Record<string, number[][]> = {
  'image/jpeg': [[0xFF, 0xD8, 0xFF]],
  'image/png': [[0x89, 0x50, 0x4E, 0x47]],
  'image/webp': [[0x52, 0x49, 0x46, 0x46]], // RIFF
}

function matchesMagicBytes(buffer: Buffer, type: string): boolean {
  const sigs = MAGIC_BYTES[type]
  if (!sigs) return false
  return sigs.some(sig => sig.every((byte, i) => buffer[i] === byte))
}

// Derive safe extension from validated MIME type (not user filename)
const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

export async function POST(request: NextRequest) {
  try {
    // 1. Auth check
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Rate limit: 20 uploads per hour per user
    const rl = await checkOtpRateLimit(`photo-upload:${user.id}`, 20, 3600)
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many uploads. Please wait before uploading more.' }, { status: 429 })
    }

    // 2. Parse form data
    const formData = await request.formData()
    const leadId = formData.get('lead_id') as string
    const files = formData.getAll('files') as File[]

    if (!leadId || !UUID_RE.test(leadId)) {
      return NextResponse.json({ error: 'Invalid lead ID' }, { status: 400 })
    }

    if (!files.length) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 })
    }

    if (files.length > MAX_FILES) {
      return NextResponse.json(
        { error: `Max ${MAX_FILES} files per upload` },
        { status: 400 }
      )
    }

    // 3. Validate files
    for (const file of files) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        return NextResponse.json(
          { error: `Invalid file type: ${file.type}. Allowed: JPEG, PNG, WebP` },
          { status: 400 }
        )
      }
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `File too large: ${file.name}. Max 5MB.` },
          { status: 400 }
        )
      }
    }

    // 4. Verify inspector + lead assignment (via session client — respects RLS)
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('id, assigned_inspector_id')
      .eq('id', leadId)
      .eq('assigned_inspector_id', user.id)
      .single()

    if (leadError || !lead) {
      return NextResponse.json(
        { error: 'Lead not found or not assigned to you' },
        { status: 403 }
      )
    }

    // 5. Check inspection doesn't already exist (locked after submit)
    const serviceClient = createServiceClient()

    const { data: existingInspection } = await serviceClient
      .from('inspections')
      .select('id, submitted_at')
      .eq('lead_id', leadId)
      .maybeSingle()

    if (existingInspection?.submitted_at) {
      return NextResponse.json(
        { error: 'Inspection already submitted. Uploads are locked.' },
        { status: 409 }
      )
    }

    // 6. Upload files to Supabase Storage via service client
    const uploadedUrls: string[] = []
    const timestamp = Date.now()

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const ext = MIME_TO_EXT[file.type] || 'jpg'
      const storagePath = `${leadId}/inspection/${timestamp}-${i}.${ext}`

      const buffer = Buffer.from(await file.arrayBuffer())

      // Validate magic bytes (content-based, not trust user MIME type)
      if (!matchesMagicBytes(buffer, file.type)) {
        return NextResponse.json(
          { error: 'File content does not match declared type. Please upload a valid image.' },
          { status: 400 }
        )
      }

      const { error: uploadError } = await serviceClient.storage
        .from('inspection-photos')
        .upload(storagePath, buffer, {
          contentType: file.type,
          upsert: false,
        })

      if (uploadError) {
        console.error('Upload error:', uploadError)
        return NextResponse.json(
          { error: 'Failed to upload file. Please try again.' },
          { status: 500 }
        )
      }

      uploadedUrls.push(storagePath)
    }

    // 7. Append to leads.pending_photo_urls
    const { data: currentLead } = await serviceClient
      .from('leads')
      .select('pending_photo_urls')
      .eq('id', leadId)
      .single()

    const existingUrls: string[] = currentLead?.pending_photo_urls ?? []
    const allUrls = [...existingUrls, ...uploadedUrls]
    // Dedupe
    const uniqueUrls = [...new Set(allUrls)]

    await serviceClient
      .from('leads')
      .update({ pending_photo_urls: uniqueUrls })
      .eq('id', leadId)

    // 8. Audit log
    await serviceClient.from('audit_log').insert({
      lead_id: leadId,
      action: 'photos_uploaded',
      actor_user_id: user.id,
      new_value: { count: files.length, paths: uploadedUrls },
    })

    return NextResponse.json({
      success: true,
      uploaded: uploadedUrls.length,
      total: uniqueUrls.length,
    })
  } catch (err) {
    console.error('Upload handler error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
