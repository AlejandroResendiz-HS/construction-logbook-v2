'use server'

import { and, eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { requireSession } from '@/lib/authorization'
import { db } from '@/lib/db'
import { files, profiles } from '@/lib/db/schema'

const AVATAR_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp'])
const MAX_FILE_SIZE = Number(process.env.MAX_FILE_SIZE_BYTES || 4_000_000)

export async function uploadAvatar(file: File) {
  const session = await requireSession()
  if (!AVATAR_TYPES.has(file.type)) return { error: 'El archivo debe ser JPG, PNG, GIF o WebP.' }
  if (file.size < 1 || file.size > MAX_FILE_SIZE) return { error: 'La imagen supera el límite permitido.' }

  const content = Buffer.from(await file.arrayBuffer())
  const fileId = await db.transaction(async (tx) => {
    await tx.delete(files).where(and(eq(files.ownerUserId, session.user.id), eq(files.purpose, 'avatar')))
    const [stored] = await tx.insert(files).values({
      ownerUserId: session.user.id, purpose: 'avatar', originalFilename: file.name,
      mimeType: file.type, sizeBytes: file.size, content,
    }).returning({ fileId: files.fileId })
    await tx.insert(profiles).values({ userId: session.user.id, avatarFileId: stored.fileId })
      .onConflictDoUpdate({ target: profiles.userId, set: { avatarFileId: stored.fileId, updatedAt: new Date() } })
    return stored.fileId
  })
  return { success: true, url: `/api/files/${fileId}` }
}

export async function changePassword(currentPassword: string, newPassword: string) {
  await requireSession()
  if (newPassword.length < 8) return { error: 'La contraseña debe tener al menos 8 caracteres.' }
  try {
    await auth.api.changePassword({ body: { currentPassword, newPassword, revokeOtherSessions: true }, headers: await headers() })
    await auth.api.signOut({ headers: await headers() })
    return { success: true }
  } catch {
    return { error: 'La contraseña actual es incorrecta.' }
  }
}
