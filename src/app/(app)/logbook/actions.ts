'use server'
import { and, asc, eq, gte, inArray, lte, SQL } from 'drizzle-orm'
import { requireRole } from '@/lib/authorization'
import { db } from '@/lib/db'
import { machinery, machineryLogs, projects } from '@/lib/db/schema'

export async function getDashboardLogs(filters: { machineIds: number[]; projectId?: number; dateFrom: string; dateTo: string }) {
  await requireRole('admin', 'resident')
  const conditions: SQL[] = [gte(machineryLogs.date, filters.dateFrom), lte(machineryLogs.date, filters.dateTo)]
  if (filters.machineIds.length) conditions.push(inArray(machineryLogs.machineId, filters.machineIds))
  if (filters.projectId) conditions.push(eq(machineryLogs.projectId, filters.projectId))
  const rows = await db.select({
    machinery_log_id: machineryLogs.machineryLogId, machine_id: machineryLogs.machineId, project_id: machineryLogs.projectId,
    date: machineryLogs.date, operator_name: machineryLogs.operatorName, start_time: machineryLogs.startTime, end_time: machineryLogs.endTime,
    fuel_liters: machineryLogs.fuelLiters, fuel_price: machineryLogs.fuelPrice, effective_hours: machineryLogs.effectiveHours,
    observations: machineryLogs.observations, is_completed: machineryLogs.isCompleted, is_corrected: machineryLogs.isCorrected,
    status: machineryLogs.status, pause_events: machineryLogs.pauseEvents, total_paused_minutes: machineryLogs.totalPausedMinutes,
    project_name: projects.projectName, machinery_name: machinery.machineryName, machinery_full_name: machinery.machineryFullName,
    external_code: machinery.externalCode, is_rented: machinery.isRented, machine_type: machinery.machineType,
    expected_consumption_rate: machinery.expectedConsumptionRate,
  }).from(machineryLogs).innerJoin(projects, eq(machineryLogs.projectId, projects.projectId)).innerJoin(machinery, eq(machineryLogs.machineId, machinery.machineryId)).where(and(...conditions)).orderBy(asc(machineryLogs.date))
  return rows.map(({ project_name, machinery_name, machinery_full_name, external_code, is_rented, machine_type, expected_consumption_rate, ...row }) => ({ ...row, projects: { project_name }, machinery: { machinery_name, machinery_full_name, external_code, is_rented, machine_type, expected_consumption_rate } }))
}
