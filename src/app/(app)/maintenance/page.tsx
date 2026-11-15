import { requireRole } from '@/lib/authorization'
import { getMachinery, getProjects, getMaintenanceRequests } from '@/lib/queries'
import { getDictionary } from '@/lib/i18n'
import { redirect } from 'next/navigation'
import MaintenanceList from '@/components/MaintenanceList'
import Link from 'next/link'
import { Plus } from 'lucide-react'

export default async function MaintenancePage() {
  const dict = getDictionary('es')
  const session = await requireRole('admin', 'resident').catch(() => null)
  if (!session) redirect('/login')
  const role = session.user.role
  const [machinery, projects, requests] = await Promise.all([getMachinery(), getProjects(), getMaintenanceRequests()])

  // Process requests to attribute project_name and total_paid
  const processedRequests = (requests || []).map(req => {
    const resolvedProject = (req.projects as any)?.project_name || 'Sin proyecto'
    const sparePartsTotal = (req.spare_parts || []).reduce((acc: number, p: any) => acc + (Number(p.amount) || 0), 0)
    const totalPaid = (Number(req.cost) || 0) + sparePartsTotal

    return {
      ...req,
      project_name: resolvedProject,
      total_paid: totalPaid
    }
  })

  return (
    <main className="p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{dict.maintenance.title}</h1>
            <p className="text-gray-500 text-sm">Historial y seguimiento de servicios de mantenimiento.</p>
          </div>
          <Link 
            href="/maintenance/new"
            className="flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-sm"
          >
            <Plus size={20} />
            {dict.maintenance.new_request}
          </Link>
        </header>

        <MaintenanceList 
          initialRequests={processedRequests} 
          machinery={machinery || []}
          projects={projects || []}
          dict={dict}
          role={role}
        />
      </div>
    </main>
  )
}
