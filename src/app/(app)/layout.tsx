import { getSession } from '@/lib/authorization'
import { db } from '@/lib/db'
import { profiles } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { getDictionary } from '@/lib/i18n'
import AuthSidenav from '@/components/AuthSidenav'
import { redirect } from 'next/navigation'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const dict = getDictionary('es')
  const session = await getSession()
  if (!session) {
    redirect('/login')
  }

  const role = session.user.role || null

  // Fetch avatar path from profile and generate signed URL (safe when profile doesn't exist yet)
  let initialAvatarUrl: string | null = null
  const [profile] = await db.select({ avatarFileId: profiles.avatarFileId }).from(profiles).where(eq(profiles.userId, session.user.id)).limit(1)
  if (profile?.avatarFileId) initialAvatarUrl = `/api/files/${profile.avatarFileId}`

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col lg:flex-row">
      {/* Sidenav (contains mobile header internally) */}
      <AuthSidenav dict={dict} role={role} initialAvatarUrl={initialAvatarUrl} />
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-64">
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  )
}
