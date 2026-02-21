
import type { Metadata, Viewport } from 'next';
import './globals.css';
import { DashboardSidebar } from '@/components/layout/DashboardSidebar';
import { Toaster } from '@/components/ui/toaster';

export const metadata: Metadata = {
  title: 'PharmaZen | Clínica Integrativa Manoel da Farmácia',
  description: 'Gestão inteligente e humanizada para clínicas farmacêuticas integrativas.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'PharmaZen',
  },
};

export const viewport: Viewport = {
  themeColor: '#065F46',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className="font-body antialiased flex h-screen bg-background overflow-hidden">
        <DashboardSidebar />
        <main className="flex-1 overflow-y-auto p-4 md:p-8 relative">
          {children}
        </main>
        <Toaster />
      </body>
    </html>
  );
}
