import 'dotenv/config'
import path from 'node:path'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { db, pool } from '../lib/db'

async function setup() {
  await migrate(db, { migrationsFolder: path.resolve(process.cwd(), 'drizzle') })
  const { default: runSeed } = await import('./seed-runner')
  await runSeed()
}

setup().then(() => pool.end()).catch(async (error) => { console.error(error); await pool.end(); process.exitCode = 1 })
