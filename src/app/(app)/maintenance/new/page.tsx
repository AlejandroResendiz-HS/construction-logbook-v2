import { requireRole } from '@/lib/authorization'
import { getMachinery, getProjects } from '@/lib/queries'
import { getDictionary } from '@/lib/i18n'
import { redirect } from 'next/navigation'
import MaintenanceRequestForm from '@/components/MaintenanceRequestForm'

export default async function NewMaintenancePage() {
  const dict = getDictionary('es')
  await requireRole('admin', 'resident').catch(() => redirect('/login'))
  const [machinery, projects] = await Promise.all([getMachinery(), getProjects()])

  return (
    <main className="p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{dict.maintenance.new_request}</h1>
          <p className="text-gray-500">Registrar un nuevo servicio de mantenimiento para maquinaria.</p>
        </header>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <MaintenanceRequestForm 
            machinery={machinery || []} 
            projects={projects || []}
            dict={dict} 
          />
        </div>
      </div>
    </main>
  )
}
