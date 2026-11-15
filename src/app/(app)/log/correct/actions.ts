'use server'
import { eq } from 'drizzle-orm'
import { requireRole } from '@/lib/authorization'
import { db } from '@/lib/db'
import { machinery, machineryLogs } from '@/lib/db/schema'

export async function adminUpdateLog(hashId: string, formData: FormData): Promise<{ success?: boolean; error?: string }> {
  await requireRole('admin', 'resident')
  const rawFuel = String(formData.get('fuel_liters') || '')
  const fuelLiters = rawFuel && !Number.isNaN(Number(rawFuel)) ? Number(rawFuel) : null
  let effectiveHours: string | undefined
  if (fuelLiters !== null) {
    const [row] = await db.select({ type: machinery.machineType, rate: machinery.expectedConsumptionRate }).from(machineryLogs).innerJoin(machinery, eq(machineryLogs.machineId, machinery.machineryId)).where(eq(machineryLogs.hashId, hashId)).limit(1)
    if (row?.type !== 'truck' && Number(row?.rate) > 0) effectiveHours = String(Number((fuelLiters / Number(row.rate)).toFixed(2)))
  }
  const rawDate = String(formData.get('date') || '').trim(); const rawEnd = String(formData.get('end_time') || '').trim()
  await db.update(machineryLogs).set({ date: rawDate || undefined, endTime: rawEnd || null, observations: String(formData.get('observations') || ''), fuelPrice: String(Number(formData.get('fuel_price')) || '') || null, fuelLiters: fuelLiters === null ? undefined : String(fuelLiters), effectiveHours, isCorrected: true, isCompleted: true, status: 'completed' }).where(eq(machineryLogs.hashId, hashId))
  return { success: true }
}
