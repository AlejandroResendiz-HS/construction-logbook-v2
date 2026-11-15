import { betterAuth } from 'better-auth'
import { drizzleAdapter } from '@better-auth/drizzle-adapter'
import { nextCookies } from 'better-auth/next-js'
import { db } from './db'
import * as schema from './db/auth-schema'
import { sendPasswordResetEmail } from './notifications'

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  database: drizzleAdapter(db, { provider: 'pg', schema, schemaName: 'auth', transaction: true }),
  emailAndPassword: {
    enabled: true,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => sendPasswordResetEmail(user.email, url),
  },
  user: { additionalFields: { role: { type: 'string', defaultValue: 'resident', input: false } } },
  plugins: [nextCookies()],
})

export type AppSession = typeof auth.$Infer.Session
