import { requireSession } from '@/lib/authorization'
import { db } from '@/lib/db'
import { profiles } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { getDictionary } from '@/lib/i18n'
import { redirect } from 'next/navigation'
import AccountSettingsClient from '@/components/AccountSettingsClient'

export default async function SettingsPage() {
  const dict = getDictionary('es')
  const session = await requireSession().catch(() => null)
  if (!session) redirect('/login')

  // Fetch the user's profile row (safe handling when user has no profile row yet)
  const [profile] = await db.select({ avatarFileId: profiles.avatarFileId }).from(profiles).where(eq(profiles.userId, session.user.id)).limit(1)
  const initialAvatarUrl = profile?.avatarFileId ? `/api/files/${profile.avatarFileId}` : null

  return (
    <AccountSettingsClient
      initialAvatarUrl={initialAvatarUrl}
      dict={dict}
    />
  )
}
