"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  Stethoscope, 
  ClipboardList, 
  Wallet, 
  Settings,
  Leaf,
  ShieldCheck,
  LogOut
} from "lucide-react"
import { cn } from "@/lib/utils"
import { auth } from "@/firebase/config"
import { signOut } from "firebase/auth"
import { useRouter } from "next/navigation"

const navigation = [
  { name: 'Painel Geral', href: '/', icon: LayoutDashboard },
  { name: 'Pacientes', href: '/patients', icon: Users },
  { name: 'Agenda', href: '/calendar', icon: Calendar },
  { name: 'Anamnese', href: '/anamnesis', icon: Stethoscope },
  { name: 'Protocolos', href: '/planner', icon: ClipboardList },
  { name: 'Financeiro', href: '/finance', icon: Wallet },
]

export function DashboardSidebar() {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async () => {
    await signOut(auth)
    router.push("/login")
  }

  // Não mostrar sidebar na tela de login
  if (pathname === "/login") return null

  return (
    <div className="flex flex-col h-full bg-primary text-primary-foreground w-64 shadow-xl border-r border-primary/10">
      <div className="p-6 flex items-center gap-3">
        <div className="bg-white rounded-lg p-2">
          <Leaf className="h-6 w-6 text-primary" />
        </div>
        <h1 className="text-xl font-headline font-bold tracking-tight text-white">PharmaZen</h1>
      </div>
      
      <nav className="flex-1 px-4 space-y-1 mt-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "group flex items-center px-3 py-3 text-sm font-medium rounded-md transition-all duration-200",
                isActive 
                  ? "bg-white/15 text-white border-l-4 border-accent" 
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              )}
            >
              <item.icon className={cn(
                "mr-3 h-5 w-5",
                isActive ? "text-white" : "text-white/60 group-hover:text-white"
              )} />
              {item.name}
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-white/10 space-y-2">
        <Link
          href="/privacy"
          className="flex items-center px-3 py-2 text-sm font-medium rounded-md text-white/70 hover:bg-white/10 hover:text-white transition-all"
        >
          <ShieldCheck className="mr-3 h-5 w-5 text-white/60" />
          Privacidade LGPD
        </Link>
        <Link
          href="/settings"
          className="flex items-center px-3 py-2 text-sm font-medium rounded-md text-white/70 hover:bg-white/10 hover:text-white transition-all"
        >
          <Settings className="mr-3 h-5 w-5 text-white/60" />
          Configurações
        </Link>
        
        <button
          onClick={handleLogout}
          className="w-full flex items-center px-3 py-2 text-sm font-medium rounded-md text-red-200 hover:bg-red-900/20 hover:text-red-100 transition-all"
        >
          <LogOut className="mr-3 h-5 w-5 text-red-300" />
          Sair do Sistema
        </button>

        <div className="mt-4 px-3 py-4 bg-black/20 rounded-lg border border-white/5">
          <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold mb-1">Acesso Clínico</p>
          <p className="text-sm font-medium text-white">Dr. Jean Dupont</p>
          <p className="text-[11px] text-white/50">Farmacêutico Integrativo</p>
        </div>
      </div>
    </div>
  )
}