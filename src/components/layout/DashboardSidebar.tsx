"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Users, Calendar, FileText, Settings, DollarSign } from "lucide-react";

export function DashboardSidebar() {
  const pathname = usePathname();

  const menuItems = [
    { icon: Home, label: "Início", href: "/" },
    { icon: Calendar, label: "Agenda", href: "/calendar" },
    { icon: Users, label: "Pacientes", href: "/patients" },
    { icon: FileText, label: "Prontuários", href: "/anamnesis" },
    { icon: DollarSign, label: "Financeiro", href: "/finance" },
    { icon: Settings, label: "Configurações", href: "/settings" },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 min-h-screen p-4 hidden md:block">
      <div className="mb-8 mt-4 px-2">
        <h2 className="text-2xl font-bold text-white tracking-tight">PharmaZen</h2>
        <p className="text-xs text-slate-500 mt-1">Clínica Integrativa</p>
      </div>

      <nav className="space-y-2">
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={true} // Força o carregamento instantâneo da rota
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                isActive
                  ? "bg-indigo-600 text-white font-medium shadow-md"
                  : "hover:bg-slate-800 hover:text-white"
              }`}
            >
              <item.icon className={`h-5 w-5 ${isActive ? "text-indigo-200" : "text-slate-400"}`} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}