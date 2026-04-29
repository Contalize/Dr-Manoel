"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
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
  LogOut,
  Menu,
  Search,
  X,
  Loader2,
  PlusCircle,
  Home
} from "lucide-react"
import { cn } from "@/lib/utils"
import { auth, db } from "@/firebase/config"
import { signOut } from "firebase/auth"
import { collection, query, where, getDocs, limit, doc, getDoc } from "firebase/firestore"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"

const navigation = [
  { name: 'Painel Geral', href: '/', icon: LayoutDashboard },
  { name: 'Pacientes', href: '/patients', icon: Users },
  { name: 'Agenda', href: '/calendar', icon: Calendar },
  { name: 'Anamnese', href: '/anamnesis', icon: Stethoscope },
  { name: 'Protocolos', href: '/planner', icon: ClipboardList },
  { name: 'Financeiro', href: '/finance', icon: Wallet },
  { name: 'Configurações', href: '/settings', icon: Settings },
]

// Itens da bottom navigation mobile (5 itens para o polegar)
const bottomNavItems = [
  { href: "/",          icon: LayoutDashboard, label: "Início"     },
  { href: "/patients",  icon: Users,           label: "Pacientes"  },
  { href: "/anamnesis", icon: PlusCircle,      label: "Consulta",  highlight: true },
  { href: "/calendar",  icon: Calendar,        label: "Agenda"     },
  { href: "/finance",   icon: Wallet,          label: "Financeiro" },
]

export function DashboardSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  
  const { user } = useAuth()
  const [userName, setUserName] = useState("Carregando...")
  const [userRole, setUserRole] = useState("Buscando dados...")

  // ── Busca Global ─────────────────────────────────────────────
  const [globalSearch, setGlobalSearch] = useState("")
  const [searchResults, setSearchResults] = useState<Array<{ id: string; name: string; cpf: string }>>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  useEffect(() => {
    const search = async () => {
      if (globalSearch.length < 2) {
        setSearchResults([])
        setShowResults(false)
        return
      }
      setIsSearching(true)
      try {
        const q = query(
          collection(db, "patients"),
          where("professionalId", "==", user?.uid),
          where("name", ">=", globalSearch),
          where("name", "<=", globalSearch + "\uf8ff"),
          limit(6)
        )
        const snap = await getDocs(q)
        setSearchResults(snap.docs.map(d => ({
          id: d.id,
          name: d.data().name as string,
          cpf: d.data().cpf as string
        })))
        setShowResults(true)
      } catch (e) {
        console.error("Erro na busca global:", e)
      } finally {
        setIsSearching(false)
      }
    }
    const timer = setTimeout(search, 300)
    return () => clearTimeout(timer)
  }, [globalSearch])

  const handleSelectPatient = (patientId: string) => {
    setGlobalSearch("")
    setShowResults(false)
    setSearchResults([])
    setOpen(false)
    router.push(`/patients/detail?id=${patientId}`)
  }
  // ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (user?.uid) {
      const fetchUser = async () => {
        try {
          const docSnap = await getDoc(doc(db, "users", user.uid))
          if (docSnap.exists()) {
            const data = docSnap.data()
            setUserName(data.nome_exibicao || user.email?.split("@")[0] || "Usuário")
            setUserRole(data.type === "pj" ? "Clínica de Saúde" : "Profissional Integrativo")
          } else {
            setUserName(user.email?.split("@")[0] || "Usuário")
            setUserRole("Membro")
          }
        } catch (e) {
          setUserName(user.email?.split("@")[0] || "Usuário")
        }
      }
      fetchUser()
    }
  }, [user])

  const handleLogout = async () => {
    await signOut(auth)
    router.push("/login")
  }

  const SidebarLink = ({ item }: { item: typeof navigation[0] }) => {
    const isActive = pathname === item.href
    return (
      <Link
        key={item.name}
        href={item.href}
        prefetch={true}
        onClick={() => setOpen(false)}
        className={cn(
          "group flex items-center px-3 py-3 text-sm font-medium rounded-md transition-all duration-200",
          isActive 
            ? "bg-white/15 text-white border-l-4 border-accent" 
            : "text-white/70 hover:bg-white/10 hover:text-white"
        )}
      >
        <item.icon className={cn(
          "mr-3 h-5 w-5 shrink-0",
          isActive ? "text-white" : "text-white/60 group-hover:text-white"
        )} />
        {item.name}
      </Link>
    )
  }

  // ── Bottom Navigation Mobile ──────────────────────────────────
  const BottomNav = () => {
    const currentPath = usePathname()

    return (
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-100 shadow-[0_-2px_12px_rgba(0,0,0,0.06)]"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="grid grid-cols-5 h-16">
          {bottomNavItems.map((item) => {
            const isActive = currentPath === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={true}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 transition-colors relative",
                  item.highlight
                    ? "text-white"
                    : isActive
                    ? "text-primary"
                    : "text-slate-400 hover:text-slate-600"
                )}
              >
                {item.highlight && (
                  <span className="absolute inset-x-3 inset-y-2 bg-primary rounded-xl" />
                )}
                <item.icon className="relative z-10 h-5 w-5" />
                <span className={cn(
                  "relative z-10 text-[10px] font-medium leading-none",
                  item.highlight && "text-white"
                )}>
                  {item.label}
                </span>
                {isActive && !item.highlight && (
                  <span className="absolute top-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
                )}
              </Link>
            )
          })}
        </div>
      </nav>
    )
  }
  // ─────────────────────────────────────────────────────────────

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-primary text-primary-foreground shadow-xl border-r border-primary/10">
      {/* Logo */}
      <div className="p-6 flex items-center gap-3">
        <div className="bg-white rounded-lg p-2 shrink-0">
          <Leaf className="h-6 w-6 text-primary" />
        </div>
        <h1 className="text-xl font-headline font-bold tracking-tight text-white truncate">PharmaZen</h1>
      </div>

      {/* Busca Global */}
      <div className="px-4 pb-3 relative" ref={searchRef}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/40" />
          <input
            type="text"
            placeholder="Buscar paciente..."
            value={globalSearch}
            onChange={(e) => setGlobalSearch(e.target.value)}
            className="w-full h-9 bg-white/10 border border-white/15 rounded-lg pl-8 pr-8 text-xs text-white placeholder:text-white/40 focus:outline-none focus:border-white/30 focus:bg-white/15 transition-all"
          />
          {(globalSearch || isSearching) && (
            <button
              onClick={() => { setGlobalSearch(""); setShowResults(false) }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70"
            >
              {isSearching
                ? <Loader2 className="h-3 w-3 animate-spin" />
                : <X className="h-3 w-3" />}
            </button>
          )}
        </div>

        {showResults && searchResults.length > 0 && (
          <div className="absolute left-4 right-4 top-full mt-1 bg-white rounded-xl shadow-2xl overflow-hidden z-50 border border-slate-100">
            {searchResults.map((p) => (
              <button
                key={p.id}
                onClick={() => handleSelectPatient(p.id)}
                className="w-full text-left px-3 py-2.5 hover:bg-primary/5 border-b border-slate-50 last:border-0 transition-colors"
              >
                <p className="text-xs font-bold text-slate-800">{p.name}</p>
                <p className="text-[10px] text-slate-400">CPF: {p.cpf}</p>
              </button>
            ))}
          </div>
        )}

        {showResults && globalSearch.length >= 2 && searchResults.length === 0 && !isSearching && (
          <div className="absolute left-4 right-4 top-full mt-1 bg-white rounded-xl shadow-xl overflow-hidden z-50 border border-slate-100">
            <p className="text-xs text-slate-400 text-center py-3">Nenhum paciente encontrado</p>
          </div>
        )}
      </div>
      
      <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
        {navigation.map((item) => (
          <SidebarLink key={item.name} item={item} />
        ))}
      </nav>

      <div className="p-4 border-t border-white/10 space-y-2">
        <Link
          href="/privacy"
          prefetch={true}
          onClick={() => setOpen(false)}
          className="flex items-center px-3 py-2 text-sm font-medium rounded-md text-white/70 hover:bg-white/10 hover:text-white transition-all"
        >
          <ShieldCheck className="mr-3 h-5 w-5 text-white/60 shrink-0" />
          <span className="truncate">Privacidade</span>
        </Link>
        
        <button
          onClick={handleLogout}
          className="w-full flex items-center px-3 py-2 text-sm font-medium rounded-md text-red-200 hover:bg-red-900/20 hover:text-red-100 transition-all"
        >
          <LogOut className="mr-3 h-5 w-5 text-red-300 shrink-0" />
          <span>Sair</span>
        </button>

        <div className="mt-4 px-3 py-4 bg-black/20 rounded-lg border border-white/5 hidden md:block">
          <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold mb-1">{userName}</p>
          <p className="text-[11px] text-white/50 truncate">{userRole}</p>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile: Hambúrguer no canto superior direito (acessa Settings e Logout) */}
      <div className="md:hidden fixed top-4 right-4 z-50">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="bg-white border-primary/20 text-primary shadow-md">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64 border-none">
            <SidebarContent />
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden md:flex flex-col w-64 h-full">
        <SidebarContent />
      </div>

      {/* Mobile Bottom Navigation */}
      <BottomNav />
    </>
  )
}
