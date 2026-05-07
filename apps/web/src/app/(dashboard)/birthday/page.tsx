"use client"

import { useState, useEffect, useMemo } from "react"
import { db } from "@/firebase/config"
import { collection, onSnapshot, query, where } from "firebase/firestore"
import { useAuth } from "@/contexts/AuthContext"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import {
  Cake, Phone, MessageCircle, Search, ChevronRight,
  PartyPopper, CalendarDays, Clock, Gift, Users
} from "lucide-react"
import { format, getMonth, getDate, differenceInYears, parseISO, addDays, isToday, isTomorrow } from "date-fns"
import { ptBR } from "date-fns/locale"
import { cn } from "@/lib/utils"

interface Patient {
  id: string
  name: string
  birthDate: string
  phone?: string
  chronoAge?: number
}

const MONTHS_PT = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"
]

export default function BirthdayPage() {
  const { user } = useAuth()
  const [patients, setPatients] = useState<Patient[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth())

  useEffect(() => {
    if (!user?.uid) return
    const q = query(
      collection(db, "patients"),
      where("professionalId", "==", user.uid),
      where("status", "==", "active")
    )
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as Patient))
        .filter(p => !!p.birthDate)
      setPatients(list)
    })
    return () => unsub()
  }, [user?.uid])

  const today = new Date()
  const todayNorm = new Date(today.getFullYear(), today.getMonth(), today.getDate())

  const enriched = useMemo(() => {
    return patients
      .map(p => {
        let birthDate: Date | null = null
        try { birthDate = typeof p.birthDate === "string" ? parseISO(p.birthDate) : null } catch { birthDate = null }
        if (!birthDate) return null
        const thisYear = new Date(today.getFullYear(), getMonth(birthDate), getDate(birthDate))
        const daysUntil = Math.round((thisYear.getTime() - todayNorm.getTime()) / 86400000)
        const age = differenceInYears(today, birthDate) + (daysUntil <= 0 ? 1 : 0)
        return { ...p, birthDate, thisYear, daysUntil, age }
      })
      .filter(Boolean) as (Patient & { birthDate: Date; thisYear: Date; daysUntil: number; age: number })[]
  }, [patients])

  const todayBirthdays = useMemo(() => enriched.filter(p => p.daysUntil === 0), [enriched])
  const next7 = useMemo(() => enriched.filter(p => p.daysUntil > 0 && p.daysUntil <= 7).sort((a,b) => a.daysUntil - b.daysUntil), [enriched])
  const next30 = useMemo(() => enriched.filter(p => p.daysUntil > 7 && p.daysUntil <= 30).sort((a,b) => a.daysUntil - b.daysUntil), [enriched])

  const byMonth = useMemo(() => {
    return enriched
      .filter(p => getMonth(p.birthDate) === selectedMonth)
      .filter(p => !searchTerm || p.name.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => getDate(a.birthDate) - getDate(b.birthDate))
  }, [enriched, selectedMonth, searchTerm])

  const countByMonth = useMemo(() => {
    const counts: Record<number, number> = {}
    enriched.forEach(p => {
      const m = getMonth(p.birthDate)
      counts[m] = (counts[m] || 0) + 1
    })
    return counts
  }, [enriched])

  const buildWhatsApp = (patient: Patient & { age: number }) => {
    const phone = patient.phone?.replace(/\D/g, "")
    if (!phone) return null
    const msg = encodeURIComponent(`Olá, *${patient.name}*! 🎂\n\nA equipe Dr. Manoel da Farmácia deseja a você um Feliz Aniversário! 🎉\n\nQue este novo ano seja repleto de saúde e conquistas! 💚`)
    return `https://wa.me/55${phone}?text=${msg}`
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-8 md:mt-0">
        <div>
          <h1 className="text-3xl font-bold text-primary font-headline flex items-center gap-3">
            <Cake className="h-8 w-8 text-amber-500" /> Aniversariantes
          </h1>
          <p className="text-muted-foreground mt-1">Acompanhe os aniversários da sua base de pacientes.</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge className="bg-amber-100 text-amber-800 border-none font-bold py-1.5 px-3 text-sm">
            <Gift className="h-3.5 w-3.5 mr-1.5" />
            {todayBirthdays.length} hoje · {next7.length} esta semana
          </Badge>
        </div>
      </header>

      {/* Destaques do dia */}
      {todayBirthdays.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-widest text-amber-600 flex items-center gap-2">
            <PartyPopper className="h-4 w-4" /> Aniversariantes Hoje
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {todayBirthdays.map(p => (
              <BirthdayCard key={p.id} patient={p} highlight waLink={buildWhatsApp(p)} />
            ))}
          </div>
        </div>
      )}

      {/* Próximos 7 dias */}
      {next7.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-widest text-primary flex items-center gap-2">
            <Clock className="h-4 w-4" /> Próximos 7 Dias
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {next7.map(p => (
              <BirthdayCard key={p.id} patient={p} waLink={buildWhatsApp(p)} />
            ))}
          </div>
        </div>
      )}

      {/* Próximos 30 dias */}
      {next30.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
            <CalendarDays className="h-4 w-4" /> Nos Próximos 30 Dias
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {next30.map(p => (
              <BirthdayCard key={p.id} patient={p} waLink={buildWhatsApp(p)} />
            ))}
          </div>
        </div>
      )}

      {/* Visão mensal */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <h2 className="text-sm font-bold uppercase tracking-widest text-slate-600 flex items-center gap-2">
            <Users className="h-4 w-4" /> Visão por Mês
          </h2>
          <div className="relative w-full md:w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar paciente..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>
        </div>

        {/* Seletor de mês */}
        <div className="grid grid-cols-6 md:grid-cols-12 gap-1.5">
          {MONTHS_PT.map((name, i) => (
            <button
              key={i}
              onClick={() => setSelectedMonth(i)}
              className={cn(
                "py-2 px-1 rounded-lg text-[10px] font-bold transition-all relative",
                selectedMonth === i
                  ? "bg-primary text-white shadow-md"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200"
              )}
            >
              {name.substring(0, 3)}
              {countByMonth[i] ? (
                <span className={cn(
                  "absolute -top-1 -right-1 h-4 w-4 rounded-full flex items-center justify-center text-[8px] font-bold",
                  selectedMonth === i ? "bg-amber-400 text-white" : "bg-amber-100 text-amber-700"
                )}>
                  {countByMonth[i]}
                </span>
              ) : null}
            </button>
          ))}
        </div>

        {/* Lista do mês selecionado */}
        {byMonth.length === 0 ? (
          <Card className="border-none shadow-sm">
            <CardContent className="py-12 text-center">
              <Cake className="h-10 w-10 text-slate-200 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                Nenhum aniversariante em {MONTHS_PT[selectedMonth]}.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {byMonth.map(p => (
              <BirthdayCard key={p.id} patient={p} waLink={buildWhatsApp(p)} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function BirthdayCard({
  patient, highlight, waLink
}: {
  patient: Patient & { birthDate: Date; thisYear: Date; daysUntil: number; age: number }
  highlight?: boolean
  waLink: string | null
}) {
  const dayLabel = patient.daysUntil === 0 ? "Hoje! 🎉"
    : patient.daysUntil === 1 ? "Amanhã"
    : `${format(patient.birthDate, "dd/MM")}`

  return (
    <Card className={cn(
      "border-none shadow-md transition-all hover:-translate-y-0.5",
      highlight ? "bg-gradient-to-br from-amber-50 to-orange-50 ring-2 ring-amber-300" : "bg-white"
    )}>
      <CardContent className="p-4 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className={cn(
            "h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 shadow-sm",
            highlight ? "bg-amber-500 text-white" : "bg-primary/10 text-primary"
          )}>
            {patient.name.substring(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="font-bold text-sm text-slate-800">{patient.name}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={cn(
                "text-[10px] font-bold px-1.5 py-0.5 rounded-md",
                highlight ? "bg-amber-200 text-amber-900" : "bg-slate-100 text-slate-600"
              )}>
                {dayLabel}
              </span>
              <span className="text-[10px] text-muted-foreground">{patient.age} anos</span>
            </div>
            {patient.phone && (
              <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                <Phone className="h-2.5 w-2.5" /> {patient.phone}
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-1.5 shrink-0">
          {waLink ? (
            <a href={waLink} target="_blank" rel="noopener noreferrer">
              <Button size="sm" variant="outline"
                className="h-7 w-7 p-0 border-green-200 text-green-600 hover:bg-green-50">
                <MessageCircle className="h-3.5 w-3.5" />
              </Button>
            </a>
          ) : null}
          <Link href={`/patients/detail?id=${patient.id}`}>
            <Button size="sm" variant="ghost"
              className="h-7 w-7 p-0 text-primary hover:bg-primary/10">
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
