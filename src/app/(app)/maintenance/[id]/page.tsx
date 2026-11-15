import { requireRole } from '@/lib/authorization'
import { getMaintenanceRequest, getProjects } from '@/lib/queries'
import { getDictionary } from '@/lib/i18n'
import { notFound, redirect } from 'next/navigation'
import MaintenanceEditForm from '@/components/MaintenanceEditForm'

export default async function EditMaintenancePage({ params }: { params: { id: string } }) {
  const { id } = await params
  const dict = getDictionary('es')
  await requireRole('admin', 'resident').catch(() => redirect('/login'))
  const request = await getMaintenanceRequest(Number(id))

  if (!request) {
    notFound()
  }

  const projects = await getProjects()

  return (
    <main className="p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{dict.maintenance.edit_request}</h1>
          <p className="text-gray-500">Actualizar observaciones y adjuntos del servicio.</p>
        </header>

        <MaintenanceEditForm 
          request={request} 
          projects={projects || []}
          dict={dict} 
        />
      </div>
    </main>
  )
}
