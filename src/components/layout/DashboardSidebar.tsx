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
  Leaf
} from "lucide-react"
import { cn } from "@/lib/utils"

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Patients', href: '/patients', icon: Users },
  { name: 'Calendar', href: '/calendar', icon: Calendar },
  { name: 'Anamnesis', href: '/anamnesis', icon: Stethoscope },
  { name: 'Protocols', href: '/planner', icon: ClipboardList },
  { name: 'Financial', href: '/finance', icon: Wallet },
]

export function DashboardSidebar() {
  const pathname = usePathname()

  return (
    <div className="flex flex-col h-full bg-primary text-primary-foreground w-64 shadow-xl">
      <div className="p-6 flex items-center gap-3">
        <div className="bg-accent rounded-lg p-2">
          <Leaf className="h-6 w-6 text-primary" />
        </div>
        <h1 className="text-xl font-headline font-bold tracking-tight text-accent">PharmaZen</h1>
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
                  ? "bg-accent text-primary" 
                  : "text-primary-foreground/80 hover:bg-white/10 hover:text-white"
              )}
            >
              <item.icon className={cn(
                "mr-3 h-5 w-5",
                isActive ? "text-primary" : "text-primary-foreground/60 group-hover:text-white"
              )} />
              {item.name}
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-white/10">
        <Link
          href="/settings"
          className="flex items-center px-3 py-3 text-sm font-medium rounded-md text-primary-foreground/80 hover:bg-white/10 hover:text-white transition-all"
        >
          <Settings className="mr-3 h-5 w-5 text-primary-foreground/60" />
          Settings
        </Link>
        <div className="mt-4 px-3 py-4 bg-white/5 rounded-lg border border-white/10">
          <p className="text-xs text-primary-foreground/60 uppercase tracking-widest font-semibold mb-2">Logged in as</p>
          <p className="text-sm font-medium text-accent">Dr. Jean Dupont</p>
          <p className="text-xs text-primary-foreground/40">Integrative Pharmacist</p>
        </div>
      </div>
    </div>
  )
}