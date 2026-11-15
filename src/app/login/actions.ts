'use server'

import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

export async function login(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  try {
    await auth.api.signInEmail({ body: { email, password }, headers: await headers() })
  } catch {
    return { error: 'Invalid email or password' }
  }

  redirect('/dashboard')
}

export async function logout() {
  await auth.api.signOut({ headers: await headers() })
  redirect('/')
}

export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get('email') || '').trim()
  if (email) {
    await auth.api.requestPasswordReset({ body: { email, redirectTo: `${process.env.BETTER_AUTH_URL || 'http://localhost:3000'}/reset-password` } }).catch(() => undefined)
  }
}

export async function resetPassword(token: string, formData: FormData) {
  const newPassword = String(formData.get('password') || '')
  if (newPassword.length < 8) return { error: 'La contraseña debe tener al menos 8 caracteres.' }
  try { await auth.api.resetPassword({ body: { token, newPassword } }); return { success: true } }
  catch { return { error: 'El enlace es inválido o expiró.' } }
}
