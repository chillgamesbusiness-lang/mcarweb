import type { SupabaseClient } from '@supabase/supabase-js'
import { assertAuditLogReady, writeAuditLog } from '@/lib/auditLog'
import { validateUuid } from '@/lib/inputHardening'
import { VALID_STATUS_TRANSITIONS, type LeadStatus, type AppointmentStatus } from '@/lib/types'

export interface MutationFailure {
  id: string
  code: string
  message: string
}

export interface MutationResult {
  success: boolean
  message: string
  affectedCount: number
  affectedIds: string[]
  skippedIds: string[]
  failures: MutationFailure[]
}

export interface AdminActor {
  userId: string
}

const LEAD_STATUSES = new Set(Object.keys(VALID_STATUS_TRANSITIONS) as LeadStatus[])
const FINANCE_STATUSES = new Set(['not_checked', 'clear', 'finance_found'])
const APPOINTMENT_STATUSES = new Set<AppointmentStatus>(['booked', 'completed', 'cancelled', 'no_show'])

export function normaliseBulkIds(ids: string[]): { validIds: string[]; failures: MutationFailure[] } {
  const seen = new Set<string>()
  const validIds: string[] = []
  const failures: MutationFailure[] = []

  for (const rawId of ids) {
    const id = typeof rawId === 'string' ? rawId.trim() : ''
    if (!id || seen.has(id)) continue
    seen.add(id)

    const idCheck = validateUuid(id)
    if (!idCheck.valid) {
      failures.push({ id: id || '(empty)', code: 'invalid_id', message: 'Invalid record ID.' })
      continue
    }
    validIds.push(idCheck.uuid)
  }

  return { validIds, failures }
}

export function buildMutationResult(
  verb: string,
  affectedIds: string[],
  skippedIds: string[],
  failures: MutationFailure[]
): MutationResult {
  const affectedCount = affectedIds.length
  const success = failures.length === 0
  const parts = [`${verb}: ${affectedCount} changed`]
  if (skippedIds.length > 0) parts.push(`${skippedIds.length} unchanged`)
  if (failures.length > 0) parts.push(`${failures.length} failed`)

  return {
    success,
    message: parts.join(', '),
    affectedCount,
    affectedIds,
    skippedIds,
    failures,
  }
}

export function isLeadStatus(value: string): value is LeadStatus {
  return LEAD_STATUSES.has(value as LeadStatus)
}

export function isFinanceStatus(value: string): value is 'not_checked' | 'clear' | 'finance_found' {
  return FINANCE_STATUSES.has(value)
}

export function isAppointmentStatus(value: string): value is AppointmentStatus {
  return APPOINTMENT_STATUSES.has(value as AppointmentStatus)
}

function failure(id: string, code: string, message: string): MutationFailure {
  return { id, code, message }
}

async function auditLogReadinessFailure(client: SupabaseClient): Promise<MutationFailure | null> {
  try {
    await assertAuditLogReady(client)
    return null
  } catch (error) {
    return failure('audit_log', 'audit_log_unavailable', error instanceof Error ? error.message : 'Audit log schema is not ready.')
  }
}

export async function deleteLeadById(
  client: SupabaseClient,
  id: string,
  actor: AdminActor,
  options: { bulk?: boolean } = {}
): Promise<{ affectedId?: string; failure?: MutationFailure }> {
  try {
    const { data: targetLead, error: leadFetchError } = await client
      .from('leads')
      .select('id, reg, status, finance_status, assigned_inspector_id, pending_photo_urls')
      .eq('id', id)
      .maybeSingle()

    if (leadFetchError) return { failure: failure(id, 'fetch_failed', leadFetchError.message) }
    if (!targetLead) return { failure: failure(id, 'not_found', 'Record was not found.') }

    const { data: inspections, error: inspectionsError } = await client
      .from('inspections')
      .select('photo_urls')
      .eq('lead_id', id)

    if (inspectionsError) return { failure: failure(id, 'inspection_fetch_failed', inspectionsError.message) }

    await writeAuditLog(client, {
      leadId: id,
      action: 'lead_deleted',
      actorUserId: actor.userId,
      actorKind: 'admin',
      oldValue: {
        reg: (targetLead as Record<string, unknown>).reg,
        status: (targetLead as Record<string, unknown>).status,
        finance_status: (targetLead as Record<string, unknown>).finance_status,
        assigned_inspector_id: (targetLead as Record<string, unknown>).assigned_inspector_id,
      },
      newValue: { deleted: true, bulk: Boolean(options.bulk) },
    }, { area: 'admin_delete', blocking: true })

    const photoPaths = new Set<string>()
    ;((targetLead as Record<string, unknown>).pending_photo_urls as string[] | null | undefined)?.forEach((path) => photoPaths.add(path))
    ;(inspections ?? []).forEach((inspection) => {
      ((inspection as Record<string, unknown>).photo_urls as string[] | null | undefined)?.forEach((path) => photoPaths.add(path))
    })

    if (photoPaths.size > 0) {
      const { error: storageError } = await client.storage.from('inspection-photos').remove([...photoPaths])
      if (storageError) return { failure: failure(id, 'photo_delete_failed', storageError.message) }
    }

    const { data: deletedLead, error: deleteError } = await client
      .from('leads')
      .delete()
      .eq('id', id)
      .select('id')
      .maybeSingle()

    if (deleteError) return { failure: failure(id, 'delete_failed', deleteError.message) }
    if (!deletedLead) return { failure: failure(id, 'not_deleted', 'Database did not confirm deletion.') }

    return { affectedId: id }
  } catch (error) {
    return { failure: failure(id, 'unexpected_error', error instanceof Error ? error.message : 'Unexpected delete failure.') }
  }
}

export async function bulkDeleteLeads(
  client: SupabaseClient,
  actor: AdminActor,
  ids: string[]
): Promise<MutationResult> {
  const auditFailure = await auditLogReadinessFailure(client)
  if (auditFailure) return buildMutationResult('Bulk delete leads', [], [], [auditFailure])

  const { validIds, failures } = normaliseBulkIds(ids)
  const affectedIds: string[] = []

  for (const id of validIds) {
    const result = await deleteLeadById(client, id, actor, { bulk: true })
    if (result.affectedId) affectedIds.push(result.affectedId)
    if (result.failure) failures.push(result.failure)
  }

  return buildMutationResult('Bulk delete leads', affectedIds, [], failures)
}

export async function bulkUpdateLeadStatus(
  client: SupabaseClient,
  actor: AdminActor,
  ids: string[],
  newStatus: LeadStatus
): Promise<MutationResult> {
  if (!isLeadStatus(newStatus)) {
    return buildMutationResult('Bulk status update', [], [], [failure('status', 'invalid_status', 'Invalid lead status.')])
  }

  const auditFailure = await auditLogReadinessFailure(client)
  if (auditFailure) return buildMutationResult('Bulk status update', [], [], [auditFailure])

  const { validIds, failures } = normaliseBulkIds(ids)
  const affectedIds: string[] = []
  const skippedIds: string[] = []

  for (const id of validIds) {
    try {
      const { data: currentLead, error: fetchError } = await client
        .from('leads')
        .select('id, status')
        .eq('id', id)
        .maybeSingle()

      if (fetchError) {
        failures.push(failure(id, 'fetch_failed', fetchError.message))
        continue
      }
      if (!currentLead) {
        failures.push(failure(id, 'not_found', 'Record was not found.'))
        continue
      }

      const previousStatus = (currentLead as { status: LeadStatus }).status
      if (previousStatus === newStatus) {
        skippedIds.push(id)
        continue
      }

      const { data: updatedLead, error: updateError } = await client
        .from('leads')
        .update({ status: newStatus })
        .eq('id', id)
        .select('id, status')
        .maybeSingle()

      if (updateError) {
        failures.push(failure(id, 'update_failed', updateError.message))
        continue
      }
      if (!updatedLead || (updatedLead as { status: LeadStatus }).status !== newStatus) {
        failures.push(failure(id, 'not_updated', 'Database did not confirm the status update.'))
        continue
      }

      await writeAuditLog(client, {
        leadId: id,
        action: 'status_change',
        actorUserId: actor.userId,
        actorKind: 'admin',
        oldValue: { status: previousStatus },
        newValue: { status: newStatus, bulk: true },
      }, { area: 'admin_bulk', blocking: true })

      affectedIds.push(id)
    } catch (error) {
      failures.push(failure(id, 'unexpected_error', error instanceof Error ? error.message : 'Unexpected status update failure.'))
    }
  }

  return buildMutationResult('Bulk status update', affectedIds, skippedIds, failures)
}

export async function bulkUpdateLeadFinanceStatus(
  client: SupabaseClient,
  actor: AdminActor,
  ids: string[],
  newFinanceStatus: 'not_checked' | 'clear' | 'finance_found'
): Promise<MutationResult> {
  if (!isFinanceStatus(newFinanceStatus)) {
    return buildMutationResult('Bulk finance update', [], [], [failure('finance_status', 'invalid_status', 'Invalid finance status.')])
  }

  const auditFailure = await auditLogReadinessFailure(client)
  if (auditFailure) return buildMutationResult('Bulk finance update', [], [], [auditFailure])

  const { validIds, failures } = normaliseBulkIds(ids)
  const affectedIds: string[] = []
  const skippedIds: string[] = []

  for (const id of validIds) {
    try {
      const { data: currentLead, error: fetchError } = await client
        .from('leads')
        .select('id, finance_status')
        .eq('id', id)
        .maybeSingle()

      if (fetchError) {
        failures.push(failure(id, 'fetch_failed', fetchError.message))
        continue
      }
      if (!currentLead) {
        failures.push(failure(id, 'not_found', 'Record was not found.'))
        continue
      }

      const previousStatus = (currentLead as { finance_status: string | null }).finance_status ?? 'not_checked'
      if (previousStatus === newFinanceStatus) {
        skippedIds.push(id)
        continue
      }

      const { data: updatedLead, error: updateError } = await client
        .from('leads')
        .update({ finance_status: newFinanceStatus })
        .eq('id', id)
        .select('id, finance_status')
        .maybeSingle()

      if (updateError) {
        failures.push(failure(id, 'update_failed', updateError.message))
        continue
      }
      if (!updatedLead || (updatedLead as { finance_status: string }).finance_status !== newFinanceStatus) {
        failures.push(failure(id, 'not_updated', 'Database did not confirm the finance update.'))
        continue
      }

      await writeAuditLog(client, {
        leadId: id,
        action: 'finance_change',
        actorUserId: actor.userId,
        actorKind: 'admin',
        oldValue: { finance_status: previousStatus },
        newValue: { finance_status: newFinanceStatus, bulk: true },
      }, { area: 'admin_bulk', blocking: true })

      affectedIds.push(id)
    } catch (error) {
      failures.push(failure(id, 'unexpected_error', error instanceof Error ? error.message : 'Unexpected finance update failure.'))
    }
  }

  return buildMutationResult('Bulk finance update', affectedIds, skippedIds, failures)
}

export async function bulkAssignInspector(
  client: SupabaseClient,
  actor: AdminActor,
  ids: string[],
  inspectorId: string | null
): Promise<MutationResult> {
  const auditFailure = await auditLogReadinessFailure(client)
  if (auditFailure) return buildMutationResult('Bulk inspector assignment', [], [], [auditFailure])

  const newInspector = inspectorId?.trim() || null
  if (newInspector) {
    const idCheck = validateUuid(newInspector)
    if (!idCheck.valid) {
      return buildMutationResult('Bulk inspector assignment', [], [], [failure('inspector_id', 'invalid_inspector_id', 'Invalid inspector ID.')])
    }

    const { data: inspector, error: inspectorError } = await client
      .from('users')
      .select('id')
      .eq('id', idCheck.uuid)
      .eq('role', 'inspector')
      .eq('is_active', true)
      .maybeSingle()

    if (inspectorError || !inspector) {
      return buildMutationResult('Bulk inspector assignment', [], [], [failure('inspector_id', 'inspector_not_found', 'Inspector was not found or is inactive.')])
    }
  }

  const { validIds, failures } = normaliseBulkIds(ids)
  const affectedIds: string[] = []
  const skippedIds: string[] = []

  for (const id of validIds) {
    try {
      const { data: currentLead, error: fetchError } = await client
        .from('leads')
        .select('id, assigned_inspector_id, status')
        .eq('id', id)
        .maybeSingle()

      if (fetchError) {
        failures.push(failure(id, 'fetch_failed', fetchError.message))
        continue
      }
      if (!currentLead) {
        failures.push(failure(id, 'not_found', 'Record was not found.'))
        continue
      }

      const previousInspector = (currentLead as { assigned_inspector_id: string | null }).assigned_inspector_id ?? null
      const currentStatus = (currentLead as { status: LeadStatus }).status
      if (previousInspector === newInspector) {
        skippedIds.push(id)
        continue
      }

      const { data: updatedLead, error: updateError } = await client
        .from('leads')
        .update({ assigned_inspector_id: newInspector })
        .eq('id', id)
        .select('id, assigned_inspector_id')
        .maybeSingle()

      if (updateError) {
        failures.push(failure(id, 'assignment_failed', updateError.message))
        continue
      }
      if (!updatedLead || ((updatedLead as { assigned_inspector_id: string | null }).assigned_inspector_id ?? null) !== newInspector) {
        failures.push(failure(id, 'not_assigned', 'Database did not confirm inspector assignment.'))
        continue
      }

      await writeAuditLog(client, {
        leadId: id,
        action: 'assignment_change',
        actorUserId: actor.userId,
        actorKind: 'admin',
        oldValue: { assigned_inspector_id: previousInspector },
        newValue: {
          assigned_inspector_id: newInspector,
          inspector_queue_visible: Boolean(newInspector && !['won', 'lost', 'expired'].includes(currentStatus)),
          bulk: true,
        },
      }, { area: 'admin_bulk', blocking: true })

      affectedIds.push(id)
    } catch (error) {
      failures.push(failure(id, 'unexpected_error', error instanceof Error ? error.message : 'Unexpected assignment failure.'))
    }
  }

  return buildMutationResult('Bulk inspector assignment', affectedIds, skippedIds, failures)
}

export async function bulkUpdateAppointmentStatus(
  client: SupabaseClient,
  actor: AdminActor,
  ids: string[],
  newStatus: AppointmentStatus
): Promise<MutationResult> {
  if (!isAppointmentStatus(newStatus)) {
    return buildMutationResult('Bulk appointment update', [], [], [failure('status', 'invalid_status', 'Invalid appointment status.')])
  }

  const auditFailure = await auditLogReadinessFailure(client)
  if (auditFailure) return buildMutationResult('Bulk appointment update', [], [], [auditFailure])

  const { validIds, failures } = normaliseBulkIds(ids)
  const affectedIds: string[] = []
  const skippedIds: string[] = []

  for (const id of validIds) {
    try {
      const { data: appointment, error: appointmentError } = await client
        .from('appointments')
        .select('id, lead_id, status')
        .eq('id', id)
        .maybeSingle()

      if (appointmentError) {
        failures.push(failure(id, 'fetch_failed', appointmentError.message))
        continue
      }
      if (!appointment) {
        failures.push(failure(id, 'not_found', 'Appointment was not found.'))
        continue
      }

      const leadId = (appointment as { lead_id: string }).lead_id
      const previousAppointmentStatus = (appointment as { status: AppointmentStatus }).status
      if (previousAppointmentStatus === newStatus) {
        skippedIds.push(id)
        continue
      }

      const { data: lead } = await client
        .from('leads')
        .select('status')
        .eq('id', leadId)
        .maybeSingle()

      const previousLeadStatus = (lead as { status?: LeadStatus } | null)?.status ?? null
      let nextLeadStatus: LeadStatus | null = null
      if (newStatus === 'cancelled' && previousLeadStatus === 'appointment_booked') nextLeadStatus = 'contacted'
      if (newStatus === 'no_show' && previousLeadStatus === 'appointment_booked') nextLeadStatus = 'no_response'

      const { data: updatedAppointment, error: updateError } = await client
        .from('appointments')
        .update({ status: newStatus })
        .eq('id', id)
        .select('id, status')
        .maybeSingle()

      if (updateError) {
        failures.push(failure(id, 'update_failed', updateError.message))
        continue
      }
      if (!updatedAppointment || (updatedAppointment as { status: AppointmentStatus }).status !== newStatus) {
        failures.push(failure(id, 'not_updated', 'Database did not confirm appointment update.'))
        continue
      }

      if (nextLeadStatus) {
        const { error: leadUpdateError } = await client
          .from('leads')
          .update({ status: nextLeadStatus })
          .eq('id', leadId)
        if (leadUpdateError) {
          failures.push(failure(id, 'lead_status_update_failed', leadUpdateError.message))
          continue
        }
      }

      await writeAuditLog(client, {
        leadId,
        action: 'status_change',
        actorUserId: actor.userId,
        actorKind: 'admin',
        oldValue: { appointment_status: previousAppointmentStatus, lead_status: previousLeadStatus },
        newValue: { appointment_status: newStatus, lead_status: nextLeadStatus ?? previousLeadStatus, bulk: true },
      }, { area: 'admin_bulk', blocking: true })

      affectedIds.push(id)
    } catch (error) {
      failures.push(failure(id, 'unexpected_error', error instanceof Error ? error.message : 'Unexpected appointment update failure.'))
    }
  }

  return buildMutationResult('Bulk appointment update', affectedIds, skippedIds, failures)
}

export async function bulkDeleteAppointments(
  client: SupabaseClient,
  actor: AdminActor,
  ids: string[]
): Promise<MutationResult> {
  const auditFailure = await auditLogReadinessFailure(client)
  if (auditFailure) return buildMutationResult('Bulk delete appointments', [], [], [auditFailure])

  const { validIds, failures } = normaliseBulkIds(ids)
  const affectedIds: string[] = []

  for (const id of validIds) {
    try {
      const { data: appointment, error: appointmentError } = await client
        .from('appointments')
        .select('id, lead_id, status')
        .eq('id', id)
        .maybeSingle()

      if (appointmentError) {
        failures.push(failure(id, 'fetch_failed', appointmentError.message))
        continue
      }
      if (!appointment) {
        failures.push(failure(id, 'not_found', 'Appointment was not found.'))
        continue
      }

      const leadId = (appointment as { lead_id: string }).lead_id
      const previousAppointmentStatus = (appointment as { status: AppointmentStatus }).status
      const { data: lead } = await client.from('leads').select('status').eq('id', leadId).maybeSingle()
      const previousLeadStatus = (lead as { status?: LeadStatus } | null)?.status ?? null

      const { data: deletedAppointment, error: deleteError } = await client
        .from('appointments')
        .delete()
        .eq('id', id)
        .select('id')
        .maybeSingle()

      if (deleteError) {
        failures.push(failure(id, 'delete_failed', deleteError.message))
        continue
      }
      if (!deletedAppointment) {
        failures.push(failure(id, 'not_deleted', 'Database did not confirm appointment deletion.'))
        continue
      }

      let nextLeadStatus: LeadStatus | null = null
      if (previousAppointmentStatus === 'booked' && previousLeadStatus === 'appointment_booked') {
        nextLeadStatus = 'contacted'
        const { error: leadUpdateError } = await client
          .from('leads')
          .update({ status: nextLeadStatus })
          .eq('id', leadId)
        if (leadUpdateError) {
          failures.push(failure(id, 'lead_status_update_failed', leadUpdateError.message))
          continue
        }
      }

      await writeAuditLog(client, {
        leadId,
        action: 'status_change',
        actorUserId: actor.userId,
        actorKind: 'admin',
        oldValue: { appointment_id: id, appointment_status: previousAppointmentStatus, lead_status: previousLeadStatus },
        newValue: { appointment_deleted: true, lead_status: nextLeadStatus ?? previousLeadStatus, bulk: true },
      }, { area: 'admin_bulk', blocking: true })

      affectedIds.push(id)
    } catch (error) {
      failures.push(failure(id, 'unexpected_error', error instanceof Error ? error.message : 'Unexpected appointment delete failure.'))
    }
  }

  return buildMutationResult('Bulk delete appointments', affectedIds, [], failures)
}