import { db } from '../lib/db'
import { machineTypes, machinery, projects } from '../lib/db/schema'

export default async function runSeed() {
  await db.insert(machineTypes).values([
    { typeCode: 'machine', name: 'Maquinaria', description: 'Equipo pesado medido por consumo' },
    { typeCode: 'truck', name: 'Camión', description: 'Vehículo medido por turno' },
  ]).onConflictDoNothing()
  await db.insert(projects).values({ projectName: 'DEFAULT' }).onConflictDoNothing()
  if (process.env.SEED_DEMO_DATA === 'true') {
    await db.insert(machinery).values({ externalCode: 'DEMO-EXC-01', machineryFullName: 'Excavadora A', machineryName: 'Excavadora A' }).onConflictDoNothing()
  }
}
