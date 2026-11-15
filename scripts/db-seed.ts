import 'dotenv/config'
import { db, pool } from '../lib/db'
import { machineTypes, machinery, projects } from '../lib/db/schema'

async function seed() {
  await db.insert(machineTypes).values([
    { typeCode: 'machine', name: 'Maquinaria', description: 'Equipo pesado medido por consumo' },
    { typeCode: 'truck', name: 'Camión', description: 'Vehículo medido por turno' },
  ]).onConflictDoNothing()
  await db.insert(projects).values({ projectName: 'DEFAULT' }).onConflictDoNothing()

  if (process.env.SEED_DEMO_DATA === 'true') {
    await db.insert(machinery).values([
      { externalCode: 'DEMO-EXC-01', machineryFullName: 'Excavadora A', machineryName: 'Excavadora A', machineType: 'machine' },
      { externalCode: 'DEMO-RET-01', machineryFullName: 'Retroexcavadora B', machineryName: 'Retroexcavadora B', machineType: 'machine' },
      { externalCode: 'DEMO-COM-01', machineryFullName: 'Compactadora C', machineryName: 'Compactadora C', machineType: 'machine' },
    ]).onConflictDoNothing()
  }
}

seed().then(() => pool.end()).catch(async (error) => { console.error(error); await pool.end(); process.exitCode = 1 })
