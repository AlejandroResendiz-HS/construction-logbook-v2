'use server'
import { asc, eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { requireRole } from '@/lib/authorization'
import { db } from '@/lib/db'
import { machinery } from '@/lib/db/schema'

const view = { machinery_id: machinery.machineryId, external_code: machinery.externalCode, machinery_full_name: machinery.machineryFullName, machinery_name: machinery.machineryName, machinery_model: machinery.machineryModel, machinery_serial_code: machinery.machinerySerialCode, observations: machinery.observations, is_rented: machinery.isRented, machine_type: machinery.machineType, expected_consumption_rate: machinery.expectedConsumptionRate, created_at: machinery.createdAt }
export async function listMachinery() { await requireRole('admin'); return db.select(view).from(machinery).orderBy(asc(machinery.machineryFullName)) }
function values(formData: FormData) { const rate = String(formData.get('expected_consumption_rate') || ''); return { externalCode: String(formData.get('external_code') || '').trim(), machineryFullName: String(formData.get('machinery_full_name') || '').trim(), machineryName: String(formData.get('machinery_name') || '') || null, machineryModel: String(formData.get('machinery_model') || '') || null, machinerySerialCode: String(formData.get('machinery_serial_code') || '') || null, observations: String(formData.get('observations') || '') || null, isRented: formData.get('is_rented') === 'true', machineType: String(formData.get('machine_type') || 'machine'), expectedConsumptionRate: rate && !Number.isNaN(Number(rate)) ? rate : null } }
function dbError(e: unknown) { const error = e as { code?: string; constraint?: string }; return error.code === '23505' ? (error.constraint?.includes('external') ? 'DUPLICATE_EXTERNAL_CODE' : 'DUPLICATE_IDENTITY') : 'GENERIC_ERROR' }
export async function createMachinery(formData: FormData) { await requireRole('admin'); try { const [row] = await db.insert(machinery).values(values(formData)).returning(view); revalidatePath('/machinery'); return { success: true, machine: row } } catch (e) { return { error: dbError(e) } } }
export async function updateMachinery(id: number, formData: FormData) { await requireRole('admin'); try { const [row] = await db.update(machinery).set(values(formData)).where(eq(machinery.machineryId, id)).returning(view); revalidatePath('/machinery'); return { success: true, machine: row } } catch (e) { return { error: dbError(e) } } }
export async function deleteMachinery(id: number) { await requireRole('admin'); try { await db.delete(machinery).where(eq(machinery.machineryId, id)); revalidatePath('/machinery'); return { success: true } } catch { return { error: 'GENERIC_ERROR' } } }
