import { requireSession } from '@/lib/authorization'
import { getDictionary } from '@/lib/i18n'
import { redirect } from 'next/navigation'
import MachineryCostDashboard from '@/components/MachineryCostDashboard'

export default async function DashboardPage() {
  const dict = getDictionary('es')
  await requireSession().catch(() => redirect('/login'))

  return (
    <main className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <MachineryCostDashboard dict={dict} />
      </div>
    </main>
  )
}
