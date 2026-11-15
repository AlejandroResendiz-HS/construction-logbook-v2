'use client'
import { useState } from 'react'
import { approveMaintenanceByToken } from '@/app/(app)/maintenance/actions'

export default function ConfirmForm({ token, action }: { token: string; action: 'approve' | 'reject' }) {
  const [message, setMessage] = useState('')
  const [pending, setPending] = useState(false)
  async function submit() {
    setPending(true)
    const result = await approveMaintenanceByToken(token, action)
    setMessage(result.error || `La solicitud fue ${result.status === 'approved' ? 'autorizada' : 'rechazada'}.`)
    setPending(false)
  }
  return <div className="space-y-4"><p>¿Deseás {action === 'approve' ? 'autorizar' : 'rechazar'} esta solicitud?</p>{message ? <p className="font-medium">{message}</p> : <button type="button" disabled={pending} onClick={submit} className="bg-blue-600 text-white px-5 py-2 rounded-lg disabled:bg-gray-400">{pending ? 'Procesando…' : 'Confirmar'}</button>}</div>
}
