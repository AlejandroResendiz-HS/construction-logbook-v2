'use server'

import { and, eq, gte, lte } from 'drizzle-orm'
import { requireRole } from '@/lib/authorization'
import { db } from '@/lib/db'
import { machineryDepreciation, machineryLogs, maintenanceRequests, projects } from '@/lib/db/schema'
import { getMachinery, getProjects } from '@/lib/queries'

export async function getMachineryCostData(dateFrom?: string, dateTo?: string, projectId?: number) {
  await requireRole('admin', 'resident')
  const allProjects = await getProjects()
  const baseMachines = await getMachinery()
  const depreciation = await db.select().from(machineryDepreciation)
  const machines = baseMachines.map((m) => ({ ...m, machinery_depreciation: depreciation.filter((d) => d.machineryId === m.machinery_id).map((d) => ({ optimal_fuel_consumption: d.optimalFuelConsumption, service_life: d.serviceLife, purchase_value: d.purchaseValue, rescue_value: d.rescueValue, estimated_depreciation_rate: d.estimatedDepreciationRate })) }))
  const logConditions = [eq(machineryLogs.isCompleted, true)]
  if (dateFrom) logConditions.push(gte(machineryLogs.date, dateFrom)); if (dateTo) logConditions.push(lte(machineryLogs.date, dateTo)); if (projectId) logConditions.push(eq(machineryLogs.projectId, projectId))
  const logRows = await db.select({ machine_id: machineryLogs.machineId, project_id: machineryLogs.projectId, start_time: machineryLogs.startTime, end_time: machineryLogs.endTime, fuel_liters: machineryLogs.fuelLiters, fuel_price: machineryLogs.fuelPrice, effective_hours: machineryLogs.effectiveHours, project_name: projects.projectName }).from(machineryLogs).innerJoin(projects, eq(machineryLogs.projectId, projects.projectId)).where(and(...logConditions))
  const logs = logRows.map(({ project_name, ...row }) => ({ ...row, projects: { project_name } }))
  const maintenanceConditions = [eq(maintenanceRequests.status, 'approved' as const)]
  if (dateFrom) maintenanceConditions.push(gte(maintenanceRequests.date, dateFrom)); if (dateTo) maintenanceConditions.push(lte(maintenanceRequests.date, dateTo)); if (projectId) maintenanceConditions.push(eq(maintenanceRequests.projectId, projectId))
  const maintenance = await db.select({ machine_id: maintenanceRequests.machineId, cost: maintenanceRequests.cost, project_id: maintenanceRequests.projectId }).from(maintenanceRequests).where(and(...maintenanceConditions))

  // Helper function to calculate hours between two TIME strings (HH:mm:ss)
  const calculateHours = (start: string | null, end: string | null) => {
    if (!start || !end) return 0
    const [sH, sM] = start.split(':').map(Number)
    const [eH, eM] = end.split(':').map(Number)
    
    let hours = eH - sH
    const mins = eM - sM
    
    // Handle cases where end time is the next day (unlikely but possible if it crosses midnight)
    if (hours < 0) hours += 24
    
    return hours + (mins / 60)
  }

  // If projectId is specified, only include machines that had logs or maintenance on that project
  const targetMachines = projectId 
    ? machines.filter(m => logs?.some(l => l.machine_id === m.machinery_id) || maintenance?.some(mr => mr.machine_id === m.machinery_id))
    : machines

  // Aggregate data by machine_id
  const costData = targetMachines.map(m => {
    const machineLogs = logs?.filter(l => l.machine_id === m.machinery_id) || []
    const machineMaint = maintenance?.filter(mr => mr.machine_id === m.machinery_id) || []
    
    const worked_hours = machineLogs.reduce((acc, l) => {
      if (l.effective_hours != null) {
        return acc + Number(l.effective_hours)
      }
      const isMachine = m.machine_type !== 'truck'
      if (isMachine && Number(m.expected_consumption_rate) > 0 && Number(l.fuel_liters) > 0) {
        return acc + (Number(l.fuel_liters) / Number(m.expected_consumption_rate))
      }
      return acc + calculateHours(l.start_time, l.end_time)
    }, 0)
    const diesel_consumption = machineLogs.reduce((acc, l) => acc + (Number(l.fuel_liters) || 0), 0)
    
    const fuelPrices = machineLogs.filter(l => l.fuel_price).map(l => Number(l.fuel_price))
    const diesel_price = fuelPrices.length > 0 ? fuelPrices.reduce((acc, p) => acc + p, 0) / fuelPrices.length : 0
    
    const maintenance_cost = machineMaint.reduce((acc, mr) => acc + (Number(mr.cost) || 0), 0)
    
    const depr = m.machinery_depreciation?.[0] || null

    return {
      machinery_id: m.machinery_id,
      machinery_full_name: m.machinery_full_name,
      external_code: m.external_code,
      is_rented: m.is_rented,
      machine_type: m.machine_type || 'machine',
      worked_hours,
      diesel_consumption,
      diesel_price,
      maintenance_cost,
      // Depreciation info
      optimal_fuel_consumption: depr?.optimal_fuel_consumption || 0,
      service_life: depr?.service_life || 0,
      purchase_value: depr?.purchase_value || 0,
      rescue_value_percent: (depr?.rescue_value || 0),
      estimated_depreciation_rate: depr?.estimated_depreciation_rate || 0,
    }
  })

  // Aggregate data by project for "costo por proyecto"
  const projectsMap: Record<number, { name: string, worked_hours: number, diesel_cost: number }> = {}
  
  logs?.forEach(l => {
    if (!l.project_id) return
    if (!projectsMap[l.project_id]) {
      projectsMap[l.project_id] = { 
        name: (l.projects as any)?.project_name || 'Desconocido', 
        worked_hours: 0, 
        diesel_cost: 0 
      }
    }
    const machine = machines.find(m => m.machinery_id === l.machine_id)
    const isMachine = machine?.machine_type !== 'truck'
    const hours = l.effective_hours != null
      ? Number(l.effective_hours)
      : (isMachine && Number(machine?.expected_consumption_rate) > 0 && Number(l.fuel_liters) > 0)
        ? (Number(l.fuel_liters) / Number(machine?.expected_consumption_rate))
        : calculateHours(l.start_time, l.end_time)
    projectsMap[l.project_id].worked_hours += hours
    projectsMap[l.project_id].diesel_cost += (Number(l.fuel_liters) || 0) * (Number(l.fuel_price) || 0)
  })

  const projectData = Object.entries(projectsMap).map(([id, data]) => ({
    project_id: Number(id),
    ...data
  }))

  return { data: costData, projectData, logs, projects: allProjects || [] }
}
