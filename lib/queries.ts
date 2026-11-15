import 'server-only'
import { asc, desc, eq, sql } from 'drizzle-orm'
import { db } from './db'
import { files, machinery, maintenanceRequests, projects } from './db/schema'

export const machineryView = { machinery_id: machinery.machineryId, external_code: machinery.externalCode, machinery_full_name: machinery.machineryFullName, machinery_name: machinery.machineryName, machinery_model: machinery.machineryModel, machinery_serial_code: machinery.machinerySerialCode, observations: machinery.observations, is_rented: machinery.isRented, machine_type: machinery.machineType, expected_consumption_rate: machinery.expectedConsumptionRate, created_at: machinery.createdAt }
export async function getMachinery() { return db.select(machineryView).from(machinery).orderBy(asc(machinery.machineryFullName)) }
export async function getProjects() { return db.select({ project_id: projects.projectId, project_name: projects.projectName, created_at: projects.createdAt }).from(projects).orderBy(asc(projects.projectName)) }

export async function getMaintenanceRequests() {
  const rows = await db.select({
    maintenance_request_id: maintenanceRequests.maintenanceRequestId, machine_id: maintenanceRequests.machineId, project_id: maintenanceRequests.projectId,
    maintenance_type: maintenanceRequests.maintenanceType, type: maintenanceRequests.type, date: maintenanceRequests.date,
    last_maintenance_date: maintenanceRequests.lastMaintenanceDate, next_maintenance_date: maintenanceRequests.nextMaintenanceDate,
    description: maintenanceRequests.description, spare_parts: maintenanceRequests.spareParts, status: maintenanceRequests.status,
    is_external: maintenanceRequests.isExternal, cost: maintenanceRequests.cost, worked_time: maintenanceRequests.workedTime,
    downtime: maintenanceRequests.downtime, observations: maintenanceRequests.observations, hash_id: maintenanceRequests.hashId,
    created_at: maintenanceRequests.createdAt, updated_at: maintenanceRequests.updatedAt,
    machinery_name: machinery.machineryName, machinery_full_name: machinery.machineryFullName, external_code: machinery.externalCode,
    project_name: projects.projectName,
    attachments: sql<string[]>`coalesce(array_agg('/api/files/' || ${files.fileId}::text) filter (where ${files.fileId} is not null), '{}')`,
  }).from(maintenanceRequests).innerJoin(machinery, eq(maintenanceRequests.machineId, machinery.machineryId))
    .leftJoin(projects, eq(maintenanceRequests.projectId, projects.projectId)).leftJoin(files, eq(files.maintenanceRequestId, maintenanceRequests.maintenanceRequestId))
    .groupBy(maintenanceRequests.maintenanceRequestId, machinery.machineryId, projects.projectId).orderBy(desc(maintenanceRequests.date))
  return rows.map(({ machinery_name, machinery_full_name, external_code, project_name, ...row }) => ({ ...row, machinery: { machinery_name, machinery_full_name, external_code }, projects: project_name ? { project_name } : null }))
}

export async function getMaintenanceRequest(id: number) { return (await getMaintenanceRequests()).find((row) => row.maintenance_request_id === id) ?? null }
