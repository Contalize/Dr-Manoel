import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { ClinicProvider } from '@/contexts/ClinicContext';
import { AuthProvider } from '@/contexts/AuthContext';

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
      <body className="font-body antialiased h-screen bg-background overflow-hidden">
        <AuthProvider>
          <ClinicProvider>
            {children}
            <Toaster />
          </ClinicProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
