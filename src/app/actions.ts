'use server'

import { and, eq, lt, sql } from 'drizzle-orm'
import { cookies } from 'next/headers'
import { db } from '@/lib/db'
import { machinery, machineryLogs } from '@/lib/db/schema'
import { createOpaqueToken } from '@/lib/security'
import { requireRole } from '@/lib/authorization'

const capabilityName = (id: number) => `shift_cap_${id}`

export async function createMachineryLog(formData: FormData) {
  const machineId = Number(formData.get('machine_id'))
  const projectId = Number(formData.get('project_id'))
  const date = String(formData.get('date') || new Date().toISOString().slice(0, 10))
  const operatorName = String(formData.get('operator_name') || '').trim()
  const rawStartTime = String(formData.get('start_time') || '')
  const fuelLiters = Number(formData.get('fuel_liters')) || 0
  const fuelPrice = Number(formData.get('fuel_price')) || null
  if (!machineId || !projectId || !operatorName || fuelLiters < 0) return { error: 'Datos inválidos.' }
  const [machine] = await db.select({ machineType: machinery.machineType, rate: machinery.expectedConsumptionRate }).from(machinery).where(eq(machinery.machineryId, machineId)).limit(1)
  if (!machine) return { error: 'Maquinaria no encontrada.' }
  const isMachine = machine.machineType !== 'truck'
  const rate = Number(machine.rate) || 0
  const hashId = createOpaqueToken(18)
  try {
    const [created] = await db.insert(machineryLogs).values({
      machineId, projectId, date, operatorName,
      startTime: isMachine ? null : (rawStartTime || new Date().toTimeString().slice(0, 5)),
      fuelLiters: String(fuelLiters), fuelPrice: fuelPrice === null ? null : String(fuelPrice),
      effectiveHours: isMachine && rate > 0 && fuelLiters ? String(Number((fuelLiters / rate).toFixed(2))) : null,
      isCompleted: isMachine, status: isMachine ? 'completed' : 'started', hashId,
    }).returning({ hashId: machineryLogs.hashId, logId: machineryLogs.machineryLogId, isCompleted: machineryLogs.isCompleted })
    if (!created.isCompleted) (await cookies()).set(capabilityName(created.logId), hashId, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 28800 })
    return { hash_id: created.hashId, log_id: created.logId, is_completed: created.isCompleted }
  } catch (error) {
    return { error: (error as { code?: string }).code === '23505' ? 'Esta máquina ya tiene un turno activo.' : 'No se pudo crear el registro.' }
  }
}

async function requireShiftCapability(logId: number) {
  const [shift] = await db.select().from(machineryLogs).where(eq(machineryLogs.machineryLogId, logId)).limit(1)
  const capability = (await cookies()).get(capabilityName(logId))?.value
  if (!shift || !capability || capability !== shift.hashId) throw new Error('Unauthorized')
  return shift
}

export async function getActiveShiftForMachine(machineId: number) {
  const [shift] = await db.select().from(machineryLogs).where(and(eq(machineryLogs.machineId, machineId), eq(machineryLogs.isCompleted, false))).limit(1)
  if (!shift) return { activeShift: null }
  if (shift.createdAt && Date.now() - shift.createdAt.getTime() >= 28800000) {
    await db.update(machineryLogs).set({ isCompleted: true, status: 'completed', autoClosed: true, observations: sql`trim(coalesce(${machineryLogs.observations}, '') || ' [Cierre automático: límite de 8 horas alcanzado]')` }).where(eq(machineryLogs.machineryLogId, shift.machineryLogId))
    return { activeShift: null, wasOrphanClosed: true }
  }
  const capability = (await cookies()).get(capabilityName(shift.machineryLogId))?.value
  return capability === shift.hashId ? { activeShift: shift } : { activeShift: null, occupied: true }
}

export async function pauseShift(logId: number, reason: string, notes?: string) {
  const shift = await requireShiftCapability(logId)
  if (shift.isCompleted || shift.status === 'paused') return { error: 'Turno no disponible para pausa.' }
  const events = Array.isArray(shift.pauseEvents) ? shift.pauseEvents : []
  await db.update(machineryLogs).set({ status: 'paused', pauseEvents: [...events, { paused_at: new Date().toISOString(), unpaused_at: null, reason, notes: notes || '' }] }).where(and(eq(machineryLogs.machineryLogId, logId), eq(machineryLogs.isCompleted, false)))
  return { success: true }
}

export async function resumeShift(logId: number) {
  const shift = await requireShiftCapability(logId)
  if (shift.isCompleted || shift.status !== 'paused') return { error: 'El turno no está pausado.' }
  const events = Array.isArray(shift.pauseEvents) ? [...shift.pauseEvents] as Array<Record<string, unknown>> : []
  const last = events.at(-1); let minutes = 0
  if (last && !last.unpaused_at) {
    minutes = Math.max(1, Math.round((Date.now() - new Date(String(last.paused_at)).getTime()) / 60000))
    events[events.length - 1] = { ...last, unpaused_at: new Date().toISOString(), duration_minutes: minutes }
  }
  await db.update(machineryLogs).set({ status: 'started', pauseEvents: events, totalPausedMinutes: shift.totalPausedMinutes + minutes }).where(and(eq(machineryLogs.machineryLogId, logId), eq(machineryLogs.status, 'paused')))
  return { success: true }
}

export async function completeShift(logId: number, endTime?: string, observations?: string) {
  const shift = await requireShiftCapability(logId)
  if (shift.isCompleted) return { error: 'El turno ya está completado.' }
  await db.update(machineryLogs).set({ status: 'completed', isCompleted: true, endTime: endTime || new Date().toTimeString().slice(0, 5), observations: observations ? [shift.observations, observations].filter(Boolean).join(' | ') : shift.observations }).where(and(eq(machineryLogs.machineryLogId, logId), eq(machineryLogs.isCompleted, false)))
  ;(await cookies()).delete(capabilityName(logId))
  return { success: true }
}

export async function closeOrphanShiftsManually() {
  await requireRole('admin')
  const closed = await db.update(machineryLogs).set({ isCompleted: true, status: 'completed', autoClosed: true, observations: '[Cierre automático: límite de 8 horas alcanzado]' }).where(and(eq(machineryLogs.isCompleted, false), lt(machineryLogs.createdAt, new Date(Date.now() - 28800000)))).returning({ id: machineryLogs.machineryLogId })
  return { closedCount: closed.length }
}
