'use server'

import { revalidatePath } from 'next/cache'
import { requireAdminMutationContext } from '@/lib/adminAuth'
import {
  bulkAssignInspector,
  bulkDeleteLeads,
  bulkUpdateLeadFinanceStatus,
  bulkUpdateLeadStatus,
  isFinanceStatus,
  isLeadStatus,
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

export async function bulkDeleteLeadsAction(ids: string[]): Promise<MutationResult> {
  const { actor, serviceClient } = await requireAdminMutationContext()
  const result = await bulkDeleteLeads(serviceClient, actor, ids)
  revalidatePath('/admin/leads')
  return result
}

export async function bulkUpdateLeadStatusAction(ids: string[], status: string): Promise<MutationResult> {
  if (!isLeadStatus(status)) return invalidAction('Invalid lead status.')
  const { actor, serviceClient } = await requireAdminMutationContext()
  const result = await bulkUpdateLeadStatus(serviceClient, actor, ids, status)
  revalidatePath('/admin/leads')
  return result
}

export async function bulkUpdateLeadFinanceAction(ids: string[], financeStatus: string): Promise<MutationResult> {
  if (!isFinanceStatus(financeStatus)) return invalidAction('Invalid finance status.')
  const { actor, serviceClient } = await requireAdminMutationContext()
  const result = await bulkUpdateLeadFinanceStatus(serviceClient, actor, ids, financeStatus)
  revalidatePath('/admin/leads')
  return result
}

export async function bulkAssignInspectorAction(ids: string[], inspectorId: string): Promise<MutationResult> {
  const { actor, serviceClient } = await requireAdminMutationContext()
  const result = await bulkAssignInspector(serviceClient, actor, ids, inspectorId || null)
  revalidatePath('/admin/leads')
  revalidatePath('/inspector')
  return result
}