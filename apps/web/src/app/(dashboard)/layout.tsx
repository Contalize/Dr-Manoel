import { DashboardSidebar } from '@/components/layout/DashboardSidebar';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <div className="flex h-screen w-full">
        <DashboardSidebar />
        <main className="flex-1 overflow-y-auto p-4 md:p-8 relative">
          {children}
        </main>
      </div>
    </ProtectedRoute>
  );
}
