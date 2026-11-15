import Link from 'next/link'
import ConfirmForm from './ConfirmForm'

export default async function MaintenanceVerifyPage({ searchParams }: { searchParams: Promise<{ token?: string; action?: string }> }) {
  const { token, action } = await searchParams
  const validAction = action === 'approve' || action === 'reject' ? action : null
  if (!token || !validAction) return <Result title="Enlace inválido" message="Faltan parámetros de verificación." />
  return <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4"><div className="bg-white p-8 rounded-2xl shadow-xl max-w-md text-center space-y-4"><h1 className="text-xl font-bold">Confirmar decisión</h1><ConfirmForm token={token} action={validAction} /></div></main>
}
function Result({ title, message }: { title: string; message: string }) { return <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4"><div className="bg-white p-8 rounded-2xl shadow-xl max-w-md text-center space-y-4"><h1 className="text-xl font-bold">{title}</h1><p className="text-gray-500">{message}</p><Link className="text-blue-600 font-bold" href="/maintenance">Ir a mantenimiento</Link></div></main> }
