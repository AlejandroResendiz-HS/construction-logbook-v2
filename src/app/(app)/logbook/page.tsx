import { requireRole } from '@/lib/authorization'
import { getMachinery, getProjects } from '@/lib/queries'
import { getDictionary } from '@/lib/i18n'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import AppDashboardWrapper from '@/components/AppDashboardWrapper'
import LogoutButton from '@/components/LogoutButton'

export default async function LogbookPage() {
  const dict = getDictionary('es')
  await requireRole('admin', 'resident').catch(() => redirect('/login'))
  const [machinery, projects] = await Promise.all([getMachinery(), getProjects()])

  return (
    <main className="p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{dict.admin.dashboard_title}</h1>
            <Link href="/log/correct" className="text-sm text-blue-600 hover:underline">
              {dict.admin.correction.title}
            </Link>
          </div>
        </header>

      {/* This wrapper is a Client Component that uses dynamic(..., { ssr: false }) */}
      <AppDashboardWrapper 
        machinery={machinery || []} 
        projects={projects || []}
        dict={dict.admin}
        common={dict.common}
      />
    </div>
  </main>
)
}

