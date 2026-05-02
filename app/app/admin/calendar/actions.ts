'use server'

import { revalidatePath } from 'next/cache'
import { requireAdminMutationContext } from '@/lib/adminAuth'
import {
  bulkDeleteAppointments,
  bulkUpdateAppointmentStatus,
  isAppointmentStatus,
  type MutationResult,
} from '@/lib/adminDbMutations'

function invalidAction(message: string): MutationResult {
  return {
    success: false,
    message,
    affectedCount: 0,
    affectedIds: [],
    skippedIds: [],
    failures: [{ id: 'request', code: 'invalid_request', message }],
  }
}

export async function bulkUpdateAppointmentsAction(ids: string[], status: string): Promise<MutationResult> {
  if (!isAppointmentStatus(status)) return invalidAction('Invalid appointment status.')
  const { actor, serviceClient } = await requireAdminMutationContext()
  const result = await bulkUpdateAppointmentStatus(serviceClient, actor, ids, status)
  revalidatePath('/admin/calendar')
  revalidatePath('/admin/leads')
  return result
}

export async function bulkDeleteAppointmentsAction(ids: string[]): Promise<MutationResult> {
  const { actor, serviceClient } = await requireAdminMutationContext()
  const result = await bulkDeleteAppointments(serviceClient, actor, ids)
  revalidatePath('/admin/calendar')
  revalidatePath('/admin/leads')
  return result
}