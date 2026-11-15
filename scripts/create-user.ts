import 'dotenv/config'
import { eq } from 'drizzle-orm'
import { auth } from '../lib/auth'
import { db, pool } from '../lib/db'
import { user } from '../lib/db/auth-schema'

async function main() {
  const [email, password, role = 'resident', name = email] = process.argv.slice(2)
  if (!email || !password || !['admin', 'resident'].includes(role)) throw new Error('Usage: npm run auth:create-user -- email password [admin|resident] [name]')
  const result = await auth.api.signUpEmail({ body: { email, password, name } })
  await db.update(user).set({ role }).where(eq(user.id, result.user.id))
  console.log(`Created ${email} with role ${role}`)
}
main().then(() => pool.end()).catch(async (error) => { console.error(error); await pool.end(); process.exitCode = 1 })
