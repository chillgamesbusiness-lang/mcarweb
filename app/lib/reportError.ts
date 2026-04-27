export type ErrorSeverity = 'info' | 'warning' | 'error' | 'critical'

export interface ErrorReportContext {
  severity: ErrorSeverity
  area: string
  operation: string
  leadId?: string | null
  requestId?: string | null
  provider?: string | null
  metadata?: Record<string, unknown>
}

const REDACTED = '[redacted]'
const SECRET_KEY_RE = /(secret|token|password|otp|code|auth|api.?key|service_role|sid|cookie)/i

function normaliseError(error: unknown): { name: string; message: string; stack?: string } {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    }
  }

  return { name: 'NonError', message: String(error) }
}

function sanitise(value: unknown, key = ''): unknown {
  if (SECRET_KEY_RE.test(key)) return REDACTED
  if (value === null || value === undefined) return value
  if (typeof value === 'string') return value.length > 500 ? `${value.slice(0, 500)}...` : value
  if (typeof value === 'number' || typeof value === 'boolean') return value
  if (Array.isArray(value)) return value.slice(0, 20).map((item) => sanitise(item))
  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .slice(0, 50)
        .map(([entryKey, entryValue]) => [entryKey, sanitise(entryValue, entryKey)])
    )
  }
  return String(value)
}

export async function reportError(error: unknown, context: ErrorReportContext): Promise<void> {
  const normalised = normaliseError(error)
  const event = {
    timestamp: new Date().toISOString(),
    severity: context.severity,
    area: context.area,
    operation: context.operation,
    lead_id: context.leadId ?? undefined,
    request_id: context.requestId ?? undefined,
    provider: context.provider ?? undefined,
    error: normalised,
    metadata: sanitise(context.metadata ?? {}),
  }

  const line = JSON.stringify(event)
  if (context.severity === 'critical' || context.severity === 'error') {
    console.error('[reportError]', line)
  } else {
    console.warn('[reportError]', line)
  }

  const webhookUrl = process.env.ERROR_REPORT_WEBHOOK_URL || process.env.ALERT_WEBHOOK_URL
  if (!webhookUrl || process.env.NODE_ENV !== 'production') return

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 3000)
  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
      signal: controller.signal,
    })
  } catch (sendError) {
    console.error('[reportError] webhook delivery failed:', sendError)
  } finally {
    clearTimeout(timeout)
  }
}

export function createRequestId(prefix = 'req'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}