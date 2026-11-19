import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { getDictionary } from "@/lib/i18n";
import { Toaster } from 'sonner';
import { getSession } from '@/lib/authorization';

export const metadata: Metadata = {
  title: "HIV Logbook",
  description: "SIGMA Machinery Logbook",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const dict = getDictionary('es');
  const session = await getSession();

  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-gray-50 text-gray-900">
        <Toaster richColors position="top-right" />
        <Navbar dict={dict} initialUser={session ? { id: session.user.id } : null} initialRole={session?.user.role ?? null} />
        <div className="flex-1">
          {children}
        </div>
      </body>
    </html>
  );
}
