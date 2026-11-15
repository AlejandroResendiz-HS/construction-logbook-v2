'use server'
import { eq } from 'drizzle-orm'
import { requireRole } from '@/lib/authorization'
import { db } from '@/lib/db'
import { machinery, machineryDepreciation } from '@/lib/db/schema'

const fields = { machinery_id: machineryDepreciation.machineryId, optimal_fuel_consumption: machineryDepreciation.optimalFuelConsumption, service_life: machineryDepreciation.serviceLife, purchase_value: machineryDepreciation.purchaseValue, rescue_value: machineryDepreciation.rescueValue, estimated_depreciation_rate: machineryDepreciation.estimatedDepreciationRate, machinery_full_name: machinery.machineryFullName, external_code: machinery.externalCode, is_rented: machinery.isRented }
export async function listDepreciations() { await requireRole('admin', 'resident'); const rows = await db.select(fields).from(machineryDepreciation).innerJoin(machinery, eq(machineryDepreciation.machineryId, machinery.machineryId)); return rows.map(({ machinery_full_name, external_code, is_rented, ...row }) => ({ ...row, machinery: { machinery_full_name, external_code, is_rented } })) }
export async function saveDepreciation(input: { machinery_id: number; optimal_fuel_consumption?: number; service_life?: number; purchase_value?: number; rescue_value?: number; estimated_depreciation_rate?: number }) {
  await requireRole('admin'); const values = { machineryId: input.machinery_id, optimalFuelConsumption: input.optimal_fuel_consumption === undefined ? null : String(input.optimal_fuel_consumption), serviceLife: input.service_life, purchaseValue: input.purchase_value === undefined ? null : String(input.purchase_value), rescueValue: input.rescue_value === undefined ? null : String(input.rescue_value), estimatedDepreciationRate: input.estimated_depreciation_rate === undefined ? null : String(input.estimated_depreciation_rate) }
  await db.insert(machineryDepreciation).values(values).onConflictDoUpdate({ target: machineryDepreciation.machineryId, set: values })
  const rows = await listDepreciations(); return rows.find((row) => row.machinery_id === input.machinery_id)
}
