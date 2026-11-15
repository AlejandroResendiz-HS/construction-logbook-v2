import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { files } from '@/lib/db/schema'
import { getSession } from '@/lib/authorization'

export const runtime = 'nodejs'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return new Response('Unauthorized', { status: 401 })
  const { id } = await params
  const [file] = await db.select().from(files).where(eq(files.fileId, id)).limit(1)
  if (!file) return new Response('Not found', { status: 404 })
  const role = session.user.role
  if (file.ownerUserId !== session.user.id && !(file.purpose === 'maintenance_attachment' && (role === 'admin' || role === 'resident'))) {
    return new Response('Forbidden', { status: 403 })
  }
  const inline = file.purpose === 'avatar' || file.mimeType.startsWith('image/')
  return new Response(new Uint8Array(file.content), { headers: {
    'Content-Type': file.mimeType, 'Content-Length': String(file.sizeBytes),
    'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(file.originalFilename)}`,
    'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff',
  } })
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return new Response('Unauthorized', { status: 401 })
  const { id } = await params
  const ownerCondition = session.user.role === 'admin' ? eq(files.fileId, id) : and(eq(files.fileId, id), eq(files.ownerUserId, session.user.id))
  const deleted = await db.delete(files).where(ownerCondition).returning({ id: files.fileId })
  return deleted.length ? new Response(null, { status: 204 }) : new Response('Not found', { status: 404 })
}
