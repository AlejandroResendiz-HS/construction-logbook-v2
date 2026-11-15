'use client'

import { useState } from 'react'
import { changePassword, uploadAvatar } from '@/app/(app)/settings/actions'
import { User, Loader2, Upload } from 'lucide-react'

interface AccountSettingsClientProps {
  initialAvatarUrl: string | null
  dict: any
}

export default function AccountSettingsClient({
  initialAvatarUrl,
  dict,
}: AccountSettingsClientProps) {
  // ── Shared state ──────────────────────────────────────────────────────────
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialAvatarUrl)
  const [avatarCacheBuster, setAvatarCacheBuster] = useState(0)

  // ── Section A: Profile Picture ────────────────────────────────────────────
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarLoading, setAvatarLoading] = useState(false)
  const [avatarError, setAvatarError] = useState<string | null>(null)
  const [avatarSuccess, setAvatarSuccess] = useState(false)

  const handleAvatarUpload = async () => {
    setAvatarError(null)
    setAvatarSuccess(false)

    if (!avatarFile) {
      setAvatarError('Por favor seleccioná una imagen.')
      return
    }
    if (!avatarFile.type.startsWith('image/')) {
      setAvatarError('El archivo debe ser una imagen.')
      return
    }
    if (avatarFile.size > 5 * 1024 * 1024) {
      setAvatarError('La imagen no puede superar los 5 MB.')
      return
    }

    setAvatarLoading(true)

    const result = await uploadAvatar(avatarFile)
    if (result.error || !result.url) {
      setAvatarError(result.error || 'Error al guardar la imagen.')
      setAvatarLoading(false)
      return
    }
    const newSignedUrl = result.url
    setAvatarUrl(newSignedUrl)
    setAvatarCacheBuster(Date.now())
    setAvatarSuccess(true)
    setAvatarFile(null)
    setAvatarLoading(false)

    // Notify other components (e.g. sidebar) of the new avatar URL
    window.dispatchEvent(
      new CustomEvent('avatar-updated', { detail: { url: newSignedUrl } })
    )
  }

  // ── Section B: Change Password ────────────────────────────────────────────
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState(false)

  const handlePasswordChange = async () => {
    setPasswordError(null)
    setPasswordSuccess(false)

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('Por favor complete todos los campos.')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Las contraseñas no coinciden.')
      return
    }
    if (newPassword.length < 8) {
      setPasswordError('La contraseña debe tener al menos 8 caracteres.')
      return
    }

    setPasswordLoading(true)

    const result = await changePassword(currentPassword, newPassword)
    if (result.error) {
      setPasswordError(result.error)
      setPasswordLoading(false)
      return
    }

    // Clear fields before signOut
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setPasswordLoading(false)

    window.location.href = '/login'
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 lg:p-8 max-w-2xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Configuración de Cuenta</h1>

      {/* ── Section A: Profile Picture ── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
        <h2 className="text-lg font-bold text-gray-900">Foto de Perfil</h2>

        {/* Current avatar preview */}
        <div className="flex items-center gap-4">
          {avatarUrl ? (
            <img
              src={`${avatarUrl}&t=${avatarCacheBuster}`}
              alt="Avatar"
              className="h-20 w-20 rounded-full object-cover"
              onError={() => setAvatarUrl(null)}
            />
          ) : (
            <div className="h-20 w-20 rounded-full bg-blue-100 flex items-center justify-center">
              <User size={32} className="text-blue-600" />
            </div>
          )}
        </div>

        {/* File input */}
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Seleccioná una imagen
          </label>
          <input
            type="file"
            accept="image/*"
            className="block text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            onChange={(e) => {
              const file = e.target.files?.[0] ?? null
              setAvatarFile(file)
              setAvatarError(null)
              setAvatarSuccess(false)
            }}
          />
          {avatarFile && (
            <p className="text-xs text-gray-500 mt-1">{avatarFile.name}</p>
          )}
        </div>

        {/* Error / Success feedback */}
        {avatarError && (
          <div className="p-3 bg-red-100 text-red-700 rounded-lg text-sm">
            {avatarError}
          </div>
        )}
        {avatarSuccess && (
          <div className="p-3 bg-green-100 text-green-700 rounded-lg text-sm">
            Foto actualizada correctamente.
          </div>
        )}

        {/* Upload button */}
        <button
          type="button"
          onClick={handleAvatarUpload}
          disabled={avatarLoading || !avatarFile}
          className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-300 transition-all"
        >
          {avatarLoading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Upload size={16} />
          )}
          {avatarLoading ? 'Subiendo...' : 'Subir foto'}
        </button>
      </div>

      {/* ── Section B: Change Password ── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
        <h2 className="text-lg font-bold text-gray-900">Cambiar Contraseña</h2>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contraseña Actual
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nueva Contraseña
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirmar Nueva Contraseña
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
            />
          </div>
        </div>

        {/* Error feedback */}
        {passwordError && (
          <div className="p-3 bg-red-100 text-red-700 rounded-lg text-sm">
            {passwordError}
          </div>
        )}

        {/* Submit button */}
        <button
          type="button"
          onClick={handlePasswordChange}
          disabled={passwordLoading}
          className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-300 transition-all"
        >
          {passwordLoading && <Loader2 size={16} className="animate-spin" />}
          {passwordLoading ? 'Guardando...' : 'Cambiar contraseña'}
        </button>
      </div>
    </div>
  )
}
