'use server'
import { asc, eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { requireRole } from '@/lib/authorization'
import { db } from '@/lib/db'
import { projects } from '@/lib/db/schema'

export async function listProjects() {
  await requireRole('admin')
  return db.select({ project_id: projects.projectId, project_name: projects.projectName, created_at: projects.createdAt }).from(projects).orderBy(asc(projects.projectName))
}
export async function createProject(formData: FormData) {
  await requireRole('admin'); const projectName = String(formData.get('project_name') || '').trim()
  if (!projectName) return { error: 'GENERIC_ERROR' }
  try { const [project] = await db.insert(projects).values({ projectName }).returning(); revalidatePath('/projects'); return { success: true, project: { project_id: project.projectId, project_name: project.projectName, created_at: project.createdAt } } }
  catch (e) { return { error: (e as { code?: string }).code === '23505' ? 'DUPLICATE_PROJECT' : 'GENERIC_ERROR' } }
}
export async function updateProject(projectId: number, formData: FormData) {
  await requireRole('admin'); const projectName = String(formData.get('project_name') || '').trim()
  try { const [project] = await db.update(projects).set({ projectName }).where(eq(projects.projectId, projectId)).returning(); revalidatePath('/projects'); return { success: true, project: { project_id: project.projectId, project_name: project.projectName, created_at: project.createdAt } } }
  catch (e) { return { error: (e as { code?: string }).code === '23505' ? 'DUPLICATE_PROJECT' : 'GENERIC_ERROR' } }
}
export async function deleteProject(projectId: number) {
  await requireRole('admin'); try { await db.delete(projects).where(eq(projects.projectId, projectId)); revalidatePath('/projects'); return { success: true } } catch { return { error: 'GENERIC_ERROR' } }
}
