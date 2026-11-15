import ResetPasswordForm from './ResetPasswordForm'
export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) { const { token } = await searchParams; return <main className="min-h-screen flex items-center justify-center p-4">{token ? <ResetPasswordForm token={token} /> : <p>El enlace es inválido.</p>}</main> }
