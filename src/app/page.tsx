import { asc } from 'drizzle-orm'
import { db } from '@/lib/db'
import { machinery as machineryTable, projects as projectsTable } from '@/lib/db/schema'
import { getDictionary } from '@/lib/i18n'
import MachineryLogForm from '@/components/MachineryLogForm'

export default async function NewLogPage() {
  const dict = getDictionary('es')
  const [machineryRows, projects] = await Promise.all([
    db.select({ machinery_id: machineryTable.machineryId, machinery_full_name: machineryTable.machineryFullName, machinery_serial_code: machineryTable.machinerySerialCode, machine_type: machineryTable.machineType, expected_consumption_rate: machineryTable.expectedConsumptionRate }).from(machineryTable).orderBy(asc(machineryTable.machineryFullName)),
    db.select({ project_id: projectsTable.projectId, project_name: projectsTable.projectName }).from(projectsTable).orderBy(asc(projectsTable.projectName)),
  ])
  const machinery = machineryRows.map((machine) => ({
    ...machine,
    expected_consumption_rate: machine.expected_consumption_rate === null
      ? null
      : Number(machine.expected_consumption_rate),
  }))

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            {dict.new_log.title}
          </h1>
          <MachineryLogForm 
            machinery={machinery || []} 
            projects={projects || []} 
            dict={dict.new_log}
          />
        </div>
      </div>
    </main>
  )
}
