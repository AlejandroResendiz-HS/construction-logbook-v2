'use server'

import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { machinery, machineryLogs, projects } from '@/lib/db/schema'

export async function getLogByHashId(hashId: string) {
  const [log] = await db.select({ hash_id: machineryLogs.hashId, operator_name: machineryLogs.operatorName, date: machineryLogs.date, is_completed: machineryLogs.isCompleted, end_time: machineryLogs.endTime, observations: machineryLogs.observations, start_time: machineryLogs.startTime, fuel_liters: machineryLogs.fuelLiters, fuel_price: machineryLogs.fuelPrice, machinery_name: machinery.machineryName, project_name: projects.projectName }).from(machineryLogs).innerJoin(machinery, eq(machineryLogs.machineId, machinery.machineryId)).innerJoin(projects, eq(machineryLogs.projectId, projects.projectId)).where(eq(machineryLogs.hashId, hashId)).limit(1)
  if (!log) return { error: 'No se encontró el registro.' }
  return { log: { ...log, machinery: { machinery_name: log.machinery_name }, projects: { project_name: log.project_name } } }
}

export async function updateMachineryLog(hashId: string, formData: FormData) {
  const updated = await db.update(machineryLogs).set({ endTime: String(formData.get('end_time') || ''), observations: String(formData.get('observations') || ''), isCompleted: true, status: 'completed' }).where(and(eq(machineryLogs.hashId, hashId), eq(machineryLogs.isCompleted, false))).returning({ id: machineryLogs.machineryLogId })
  return updated.length ? { success: true } : { error: 'Ya está actualizado, contacta a tu administrador.' }
}
