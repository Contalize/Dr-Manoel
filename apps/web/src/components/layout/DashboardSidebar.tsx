"use client"

import { useState, useEffect, useRef, useMemo } from "react"
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
  Home,
  Cake,
  ChevronRight
} from "lucide-react"
import { cn } from "@/lib/utils"
import { auth, db } from "@/firebase/config"
import { signOut } from "firebase/auth"
import { collection, query, where, getDocs, limit, doc, getDoc, onSnapshot } from "firebase/firestore"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { getMonth, getDate, parseISO } from "date-fns"

interface NavItem {
  name: string
  href: string
  icon: React.ElementType
  badge?: number
}

interface NavSection {
  label: string
  items: NavItem[]
}

// Bottom navigation mobile (5 itens para o polegar)
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
  const [userRole, setUserRole] = useState("")
  const [birthdayTodayCount, setBirthdayTodayCount] = useState(0)

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
          where("name", "<=", globalSearch + ""),
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

  // ── Contagem de aniversariantes de hoje ───────────────────────
  useEffect(() => {
    if (!user?.uid) return
    const q = query(
      collection(db, "patients"),
      where("professionalId", "==", user.uid),
      where("status", "==", "active")
    )
    const unsub = onSnapshot(q, (snap) => {
      const today = new Date()
      const todayM = today.getMonth()
      const todayD = today.getDate()
      let count = 0
      snap.docs.forEach(d => {
        const birthDate = d.data().birthDate
        if (!birthDate) return
        try {
          const bd = typeof birthDate === "string" ? parseISO(birthDate) : birthDate.toDate?.()
          if (bd && getMonth(bd) === todayM && getDate(bd) === todayD) count++
        } catch {}
      })
      setBirthdayTodayCount(count)
    })
    return () => unsub()
  }, [user?.uid])
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
        } catch {
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

  const navSections: NavSection[] = useMemo(() => [
    {
      label: "Clínica",
      items: [
        { name: "Painel Geral",   href: "/",          icon: LayoutDashboard },
        { name: "Pacientes",      href: "/patients",  icon: Users           },
        { name: "Agenda",         href: "/calendar",  icon: Calendar        },
        { name: "Anamnese",       href: "/anamnesis", icon: Stethoscope     },
      ],
    },
    {
      label: "Gestão",
      items: [
        { name: "Protocolos",     href: "/planner",   icon: ClipboardList   },
        { name: "Financeiro",     href: "/finance",   icon: Wallet          },
        {
          name: "Aniversariantes",
          href: "/birthday",
          icon: Cake,
          badge: birthdayTodayCount > 0 ? birthdayTodayCount : undefined,
        },
      ],
    },
    {
      label: "Sistema",
      items: [
        { name: "Configurações",  href: "/settings",  icon: Settings        },
      ],
    },
  ], [birthdayTodayCount])

  const SidebarLink = ({ item }: { item: NavItem }) => {
    const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))
    return (
      <Link
        href={item.href}
        prefetch={true}
        onClick={() => setOpen(false)}
        className={cn(
          "group flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-150",
          isActive
            ? "bg-white/20 text-white shadow-sm"
            : "text-white/65 hover:bg-white/10 hover:text-white"
        )}
      >
        <item.icon className={cn(
          "h-4.5 w-4.5 shrink-0 transition-colors",
          isActive ? "text-white" : "text-white/50 group-hover:text-white/80"
        )} style={{ height: "1.125rem", width: "1.125rem" }} />
        <span className="flex-1 truncate">{item.name}</span>
        {item.badge ? (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-400 text-[10px] font-bold text-white px-1 shadow-sm">
            {item.badge}
          </span>
        ) : isActive ? (
          <span className="h-1.5 w-1.5 rounded-full bg-white/60" />
        ) : null}
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
    <div className="flex flex-col h-full bg-primary text-primary-foreground shadow-xl">
      {/* Logo */}
      <div className="px-5 py-5 flex items-center gap-3 border-b border-white/10">
        <div className="bg-white/15 rounded-xl p-2 shrink-0 backdrop-blur-sm">
          <Leaf className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-base font-headline font-bold tracking-tight text-white leading-none">PharmaZen</h1>
          <p className="text-[10px] text-white/40 mt-0.5 font-medium uppercase tracking-widest">Gestão Clínica</p>
        </div>
      </div>

      {/* Busca Global */}
      <div className="px-4 py-3 relative" ref={searchRef}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/40" />
          <input
            type="text"
            placeholder="Buscar paciente..."
            value={globalSearch}
            onChange={(e) => setGlobalSearch(e.target.value)}
            className="w-full h-9 bg-white/10 border border-white/15 rounded-xl pl-8 pr-8 text-xs text-white placeholder:text-white/40 focus:outline-none focus:border-white/30 focus:bg-white/15 transition-all"
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

      {/* Navegação por seções */}
      <nav className="flex-1 px-3 pb-3 space-y-4 overflow-y-auto">
        {navSections.map((section) => (
          <div key={section.label}>
            <p className="px-3 mb-1.5 text-[9px] font-bold uppercase tracking-widest text-white/30">
              {section.label}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <SidebarLink key={item.href} item={item} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Rodapé */}
      <div className="px-3 pb-4 pt-2 border-t border-white/10 space-y-0.5">
        <Link
          href="/privacy"
          prefetch={true}
          onClick={() => setOpen(false)}
          className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl text-white/50 hover:bg-white/10 hover:text-white/80 transition-all"
        >
          <ShieldCheck className="h-4 w-4 shrink-0" style={{ height: "1.125rem", width: "1.125rem" }} />
          <span className="truncate text-sm">Privacidade</span>
        </Link>

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl text-red-300/70 hover:bg-red-900/20 hover:text-red-200 transition-all"
        >
          <LogOut className="h-4 w-4 shrink-0" style={{ height: "1.125rem", width: "1.125rem" }} />
          <span>Sair</span>
        </button>

        {/* Perfil do usuário */}
        <div className="mt-3 mx-1 px-3 py-3 bg-white/8 rounded-xl border border-white/8 hidden md:flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
            <span className="text-xs font-bold text-white">
              {userName.substring(0, 2).toUpperCase()}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-white/80 truncate">{userName}</p>
            <p className="text-[10px] text-white/40 truncate">{userRole}</p>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile: Hambúrguer no canto superior direito */}
      <div className="md:hidden fixed top-4 right-4 z-50">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="bg-white border-primary/20 text-primary shadow-md relative">
              <Menu className="h-6 w-6" />
              {birthdayTodayCount > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-amber-400 flex items-center justify-center text-[9px] font-bold text-white">
                  {birthdayTodayCount}
                </span>
              )}
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
