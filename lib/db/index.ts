import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as appSchema from './schema'
import * as authTables from './auth-schema'

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required')

const globalForDb = globalThis as unknown as { postgresPool?: Pool }
export const pool = globalForDb.postgresPool ?? new Pool({ connectionString: process.env.DATABASE_URL, max: 10 })
if (process.env.NODE_ENV !== 'production') globalForDb.postgresPool = pool

export const db = drizzle(pool, { schema: { ...appSchema, ...authTables } })
