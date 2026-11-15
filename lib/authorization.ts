import 'server-only'
import { headers } from 'next/headers'
import { auth, type AppSession } from './auth'

export type AppRole = 'admin' | 'resident'

export async function getSession(): Promise<AppSession | null> {
  return auth.api.getSession({ headers: await headers() })
}

export async function requireSession(): Promise<AppSession> {
  const session = await getSession()
  if (!session) throw new Error('Unauthorized')
  return session
}

export async function requireRole(...roles: AppRole[]): Promise<AppSession> {
  const session = await requireSession()
  const role = session.user.role as AppRole | undefined
  if (!role || !roles.includes(role)) throw new Error('Forbidden')
  return session
}
