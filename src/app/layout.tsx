import type { Metadata } from 'next';
import './globals.css';
import { DashboardSidebar } from '@/components/layout/DashboardSidebar';
import { Toaster } from '@/components/ui/toaster';

export const metadata: Metadata = {
  title: 'Manoel da Farmacia Platform | Clínica Integrativa',
  description: 'Gestão inteligente para clínicas farmacêuticas integrativas.',
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
      </head>
      <body className="font-body antialiased flex h-screen bg-background overflow-hidden">
        <DashboardSidebar />
        <main className="flex-1 overflow-y-auto p-8 relative">
          {children}
        </main>
        <Toaster />
      </body>
    </html>
  );
}
