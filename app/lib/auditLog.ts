import type { SupabaseClient } from '@supabase/supabase-js'
import { reportError } from '@/lib/reportError'

export type AuditActorKind = 'system' | 'public_user' | 'admin' | 'inspector'

export interface AuditLogInput {
  leadId: string
  action: string
  actorUserId?: string | null
  actorKind: AuditActorKind
  oldValue?: Record<string, unknown> | null
  newValue?: Record<string, unknown> | null
  requestId?: string | null
}

export async function writeAuditLog(
  client: SupabaseClient,
  input: AuditLogInput,
  options: { blocking?: boolean; area?: string } = {}
): Promise<boolean> {
  const { error } = await client.from('audit_log').insert({
    lead_id: input.leadId,
    action: input.action,
    actor_user_id: input.actorUserId ?? null,
    actor_kind: input.actorKind,
    old_value: input.oldValue ?? null,
    new_value: input.newValue ?? null,
  })

  if (!error) return true

  await reportError(error, {
    severity: options.blocking ? 'critical' : 'error',
    area: options.area ?? 'audit_log',
    operation: 'insert',
    leadId: input.leadId,
    requestId: input.requestId,
    metadata: {
      action: input.action,
      actor_kind: input.actorKind,
      blocking: options.blocking === true,
    },
  })

  if (options.blocking) {
    throw new Error('Audit log write failed')
  }

  return false
}