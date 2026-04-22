"use client"

import { useEffect, useState } from "react"
import { db } from "@/firebase/config"
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore"
import { useAuth } from "@/contexts/AuthContext"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Stethoscope, Pill, UserPlus, Users, Activity, FileText, Loader2, Calendar } from "lucide-react"
import Link from "next/link"
import { NewPrescriptionDialog } from "@/components/prescriptions/NewPrescriptionDialog"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

export default function DashboardPage() {
  const { user } = useAuth()
  const [userName, setUserName] = useState("Profissional")
  const [isLoading, setIsLoading] = useState(true)
  
  const [todayConsultations, setTodayConsultations] = useState(0)
  const [recentPrescriptions, setRecentPrescriptions] = useState<any[]>([])

  useEffect(() => {
    if (!user?.uid) return;
    
    const fetchDashboardData = async () => {
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid))
        if (userDoc.exists()) {
          setUserName(userDoc.data().nome_exibicao || userDoc.data().name || "Profissional")
        }

        const consQ = query(collection(db, "consultations"), where("professionalId", "==", user.uid))
        const consSnap = await getDocs(consQ)
        const todayStr = new Date().toDateString()
        let tCount = 0;
        consSnap.docs.forEach(d => {
          const dt = d.data().date?.toDate()
          if (dt && dt.toDateString() === todayStr) tCount++;
        })
        setTodayConsultations(tCount)

        const rxQ = query(collection(db, "prescriptions"), where("professionalId", "==", user.uid))
        const rxSnap = await getDocs(rxQ)
        const allRx = rxSnap.docs.map(d => ({ id: d.id, ...d.data() }))
        // Ordenação manual em JS para evitar erro de índice composto pendente no Firestore
        allRx.sort((a: any, b: any) => {
          const dA = a.date?.toDate()?.getTime() || 0;
          const dB = b.date?.toDate()?.getTime() || 0;
          return dB - dA;
        })
        setRecentPrescriptions(allRx.slice(0, 5))

      } catch (e) {
        console.error("Dashboard error:", e)
      } finally {
        setIsLoading(false)
      }
    }

    fetchDashboardData()
  }, [user])

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
  }

  return (
    <div className="space-y-8 pb-12 animate-in fade-in zoom-in-95 duration-500 max-w-6xl mx-auto">
      {/* Header Saudação Dinâmica */}
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-8 rounded-3xl border border-primary/10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-4xl font-bold font-headline text-primary mb-2">
              {greeting()}, <br className="md:hidden"/> <span className="text-secondary">{userName}</span>
            </h1>
            <p className="text-muted-foreground max-w-lg leading-relaxed">
              Resumo rápido do seu dia clínico. Hoje é {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}.
            </p>
          </div>
          {isLoading ? (
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          ) : (
            <div className="bg-white/60 p-4 rounded-xl border border-white/40 shadow-sm flex items-center gap-4">
              <div className="bg-emerald-100/50 p-3 rounded-lg text-emerald-600">
                <Activity className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400">Atendimentos Hoje</p>
                <p className="text-2xl font-bold text-slate-800">{todayConsultations}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Ações Rápidas */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Stethoscope className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold text-slate-800">Ações Rápidas</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link href="/anamnesis" className="group">
            <Card className="border border-slate-100 hover:border-primary/30 hover:shadow-xl transition-all h-full bg-white group-hover:-translate-y-1 duration-300">
              <CardContent className="p-5 flex flex-col items-center text-center gap-3">
                <div className="bg-primary/5 p-3 rounded-xl text-primary group-hover:scale-110 transition-transform">
                  <Activity className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 group-hover:text-primary transition-colors">Nova Anamnese</h3>
                  <p className="text-[11px] text-muted-foreground mt-1">Iniciar consulta SOAP</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <NewPrescriptionDialog trigger={
              <Card className="border border-slate-100 hover:border-accent/30 hover:shadow-xl transition-all h-full bg-white group-hover:-translate-y-1 duration-300 cursor-pointer">
                <CardContent className="p-5 flex flex-col items-center text-center gap-3">
                  <div className="bg-accent/5 p-3 rounded-xl text-accent group-hover:scale-110 transition-transform">
                    <Pill className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 group-hover:text-accent transition-colors">Emitir Receita</h3>
                    <p className="text-[11px] text-muted-foreground mt-1">Prescrição Avulsa</p>
                  </div>
                </CardContent>
              </Card>
            } 
          />

          <Link href="/patients/new" className="group">
            <Card className="border border-slate-100 hover:border-emerald-500/30 hover:shadow-xl transition-all h-full bg-white group-hover:-translate-y-1 duration-300">
              <CardContent className="p-5 flex flex-col items-center text-center gap-3">
                <div className="bg-emerald-50 p-3 rounded-xl text-emerald-600 group-hover:scale-110 transition-transform">
                  <UserPlus className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 group-hover:text-emerald-600 transition-colors">Novo Paciente</h3>
                  <p className="text-[11px] text-muted-foreground mt-1">Cadastrar no sistema</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/patients" className="group">
            <Card className="border border-slate-100 hover:border-slate-300 hover:shadow-xl transition-all h-full bg-white group-hover:-translate-y-1 duration-300">
              <CardContent className="p-5 flex flex-col items-center text-center gap-3">
                <div className="bg-slate-50 p-3 rounded-xl text-slate-600 group-hover:scale-110 transition-transform">
                  <Users className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 group-hover:text-slate-900 transition-colors">Prontuários</h3>
                  <p className="text-[11px] text-muted-foreground mt-1">Ver todos os pacientes</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>

      {/* Resumo e Estatísticas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="shadow-lg border-none bg-white">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-800">
              <Pill className="h-4 w-4 text-accent" /> Últimas Prescrições Emitidas
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : recentPrescriptions.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 border-dashed border">
                <p className="text-sm text-muted-foreground">Nenhuma prescrição recente.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {recentPrescriptions.map(rx => (
                  <div key={rx.id} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between">
                    <div>
                      <p className="font-bold text-sm text-slate-800">{rx.patientName}</p>
                      <p className="text-[11px] text-muted-foreground gap-1 flex items-center mt-1">
                        <Calendar className="h-3 w-3" /> {rx.date?.toDate() ? format(rx.date.toDate(), "dd/MM/yyyy • HH:mm") : "Recente"}
                      </p>
                    </div>
                    <Badge variant="outline" className="bg-accent/5 text-accent border-none">{rx.medications?.length} iten(s)</Badge>
                  </div>
                ))}
              </div>
            )}
            <div className="p-3 border-t border-slate-100 bg-slate-50/50 text-center">
              <Link href="/patients" className="text-[11px] font-bold text-primary hover:underline uppercase tracking-wider">Ver histórico completo</Link>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-none bg-primary/5 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <FileText className="w-32 h-32" />
          </div>
          <CardHeader className="relative z-10">
            <CardTitle className="text-lg font-bold text-primary">Agenda e Conformidade</CardTitle>
            <CardDescription className="text-primary/70">Aviso sobre sistema</CardDescription>
          </CardHeader>
          <CardContent className="relative z-10 space-y-4">
            <div className="bg-white/60 p-4 rounded-xl border border-white/50 backdrop-blur-sm">
              <p className="text-sm font-medium text-slate-800">Auditoria LGPD ativada.</p>
              <p className="text-xs text-muted-foreground mt-1">Todos os registros são gravados de forma permanente, com assinatura e logs imutáveis.</p>
            </div>
            <div className="bg-white/60 p-4 rounded-xl border border-white/50 backdrop-blur-sm">
              <p className="text-sm font-medium text-slate-800">Backup em Nuvem</p>
              <p className="text-xs flex items-center gap-2 text-emerald-600 font-bold mt-1">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span> Sincronizado
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
