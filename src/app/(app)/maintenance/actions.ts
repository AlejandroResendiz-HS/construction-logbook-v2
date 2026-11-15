'use server'
import { and, desc, eq, gt, lte } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { requireRole } from '@/lib/authorization'
import { db } from '@/lib/db'
import { files, machinery, machineryLogs, maintenanceRequests } from '@/lib/db/schema'
import { sendMaintenanceAuthNotification } from '@/lib/notifications'
import { createOpaqueToken, hashOpaqueToken } from '@/lib/security'

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'application/pdf'])
const MAX_FILE_SIZE = Number(process.env.MAX_FILE_SIZE_BYTES || 4_000_000)
const fileId = (url: string) => url.match(/^\/api\/files\/([0-9a-f-]{36})$/i)?.[1]

export async function createMaintenanceRequest(formData: FormData, spareParts: Array<{ description: string; quantity: number; amount?: number | null }>, attachmentUrls: string[]): Promise<{ success?: boolean; error?: string; data?: unknown }> {
  const session = await requireRole('admin', 'resident')
  const approvalToken = createOpaqueToken()
  const approvalTokenHash = hashOpaqueToken(approvalToken)
  const hashId = createOpaqueToken(18)
  const machineId = Number(formData.get('machine_id')); const projectId = Number(formData.get('project_id')) || null
  const [created] = await db.transaction(async (tx) => {
    const rows = await tx.insert(maintenanceRequests).values({
      machineId, projectId, maintenanceType: String(formData.get('maintenance_type')) as 'preventive' | 'corrective',
      type: String(formData.get('maintenance_type')) as 'preventive' | 'corrective', date: String(formData.get('date')),
      lastMaintenanceDate: String(formData.get('last_maintenance_date') || '') || null, nextMaintenanceDate: String(formData.get('next_maintenance_date') || '') || null,
      description: String(formData.get('description') || ''), spareParts, cost: String(Number(formData.get('cost')) || 0),
      workedTime: String(Number(formData.get('worked_time')) || 0), downtime: String(Number(formData.get('downtime')) || 0),
      isExternal: formData.get('is_external') === 'true', observations: String(formData.get('observations') || '') || null,
      hashId, approvalTokenHash, approvalTokenExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    }).returning()
    const ids = attachmentUrls.map(fileId).filter((id): id is string => Boolean(id))
    for (const id of ids) await tx.update(files).set({ maintenanceRequestId: rows[0].maintenanceRequestId }).where(and(eq(files.fileId, id), eq(files.ownerUserId, session.user.id), eq(files.purpose, 'maintenance_attachment')))
    return rows
  })
  const [machine] = await db.select({ name: machinery.machineryName }).from(machinery).where(eq(machinery.machineryId, machineId)).limit(1)
  await sendMaintenanceAuthNotification({ hash_id: approvalToken, machineName: machine?.name || 'Maquinaria Desconocida', description: created.description })
  revalidatePath('/maintenance'); return { success: true, data: created }
}

export async function updateMaintenanceStatus(requestId: number, status: 'pending' | 'approved' | 'rejected'): Promise<{ success?: boolean; error?: string }> {
  await requireRole('admin'); await db.update(maintenanceRequests).set({ status }).where(eq(maintenanceRequests.maintenanceRequestId, requestId)); revalidatePath('/maintenance'); return { success: true }
}
export async function updateMaintenanceDetails(requestId: number, observations: string, attachments: string[], projectId?: number | null, date?: string | null, cost?: number | null): Promise<{ success?: boolean; error?: string }> {
  const session = await requireRole('admin', 'resident')
  await db.transaction(async (tx) => {
    await tx.update(maintenanceRequests).set({ observations, projectId: projectId === undefined ? undefined : projectId, date: date || undefined, cost: cost == null ? undefined : String(cost) }).where(eq(maintenanceRequests.maintenanceRequestId, requestId))
    const ids = attachments.map(fileId).filter((id): id is string => Boolean(id))
    await tx.update(files).set({ maintenanceRequestId: null }).where(eq(files.maintenanceRequestId, requestId))
    if (ids.length) for (const id of ids) await tx.update(files).set({ maintenanceRequestId: requestId }).where(and(eq(files.fileId, id), eq(files.ownerUserId, session.user.id)))
  })
  revalidatePath('/maintenance'); revalidatePath(`/maintenance/${requestId}`); return { success: true }
}
export async function getSuggestedProjectForMachine(machineId: number, date: string) { await requireRole('admin', 'resident'); const [row] = await db.select({ projectId: machineryLogs.projectId }).from(machineryLogs).where(and(eq(machineryLogs.machineId, machineId), lte(machineryLogs.date, date))).orderBy(desc(machineryLogs.date), desc(machineryLogs.machineryLogId)).limit(1); return row?.projectId || null }
export async function uploadMaintenanceAttachment(file: File) {
  const session = await requireRole('admin', 'resident')
  if (!ALLOWED_TYPES.has(file.type)) throw new Error('Tipo de archivo no permitido')
  if (file.size < 1 || file.size > MAX_FILE_SIZE) throw new Error('El archivo supera el límite permitido')
  const [stored] = await db.insert(files).values({ ownerUserId: session.user.id, purpose: 'maintenance_attachment', originalFilename: file.name, mimeType: file.type, sizeBytes: file.size, content: Buffer.from(await file.arrayBuffer()) }).returning({ id: files.fileId })
  return `/api/files/${stored.id}`
}
export async function deleteMaintenanceRequest(requestId: number): Promise<{ success?: boolean; error?: string }> { await requireRole('admin'); await db.delete(maintenanceRequests).where(eq(maintenanceRequests.maintenanceRequestId, requestId)); revalidatePath('/maintenance'); return { success: true } }

export async function approveMaintenanceByToken(token: string, action: 'approve' | 'reject') {
  const tokenHash = hashOpaqueToken(token)
  const status = action === 'approve' ? 'approved' : 'rejected'
  const updated = await db.update(maintenanceRequests).set({ status, approvalTokenHash: null, approvalTokenExpiresAt: null })
    .where(and(eq(maintenanceRequests.approvalTokenHash, tokenHash), eq(maintenanceRequests.status, 'pending'), gt(maintenanceRequests.approvalTokenExpiresAt, new Date()))).returning({ id: maintenanceRequests.maintenanceRequestId })
  return updated.length ? { success: true, status } : { error: 'El enlace es inválido, expiró o ya fue utilizado.' }
}
