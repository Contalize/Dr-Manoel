"use client"

import { useState, useEffect } from "react";
import { db } from "@/firebase/config";
import { collection, onSnapshot, query, where, orderBy, getDocs, limit } from "firebase/firestore";
import { 
  Users, 
  CalendarCheck, 
  TrendingUp, 
  PlusCircle, 
  FileText, 
  Clock,
  ShieldCheck,
  Wifi,
  WifiOff,
  Stethoscope
} from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from "recharts";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const healthTrends = [
  { month: 'Jan', inflammatory: 6.2, sleep: 65 },
  { month: 'Fev', inflammatory: 5.8, sleep: 68 },
  { month: 'Mar', inflammatory: 4.5, sleep: 72 },
  { month: 'Abr', inflammatory: 4.1, sleep: 75 },
];

export default function Dashboard() {
  const [patientCount, setPatientCount] = useState(0);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [revenue, setRevenue] = useState(0);
  const [dbStatus, setDbStatus] = useState<'online' | 'offline' | 'checking'>('checking');
  const [currentDate, setCurrentDate] = useState<string>("");

  useEffect(() => {
    setCurrentDate(new Date().toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: 'long', 
      year: 'numeric' 
    }));

    const checkConn = async () => {
      try {
        const q = query(collection(db, "patients"), limit(1));
        await getDocs(q);
        setDbStatus('online');
      } catch (err) {
        console.error("Firebase connection error:", err);
        setDbStatus('offline');
      }
    };
    checkConn();

    const unsubscribePatients = onSnapshot(collection(db, "patients"), (snapshot) => {
      setPatientCount(snapshot.size);
    }, () => setDbStatus('offline'));

    // Simplificamos a query para evitar a necessidade de índice composto (date + time)
    // Filtramos por data no servidor e ordenaremos por hora no cliente.
    const todayStr = new Date().toISOString().split('T')[0];
    const qAppointments = query(
      collection(db, "appointments"), 
      where("date", "==", todayStr)
    );
    
    const unsubscribeApps = onSnapshot(qAppointments, (snapshot) => {
      const apps = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      
      // Ordenação em memória para garantir que os agendamentos apareçam em ordem cronológica
      apps.sort((a, b) => (a.time || "").localeCompare(b.time || ""));
      
      setAppointments(apps);
    }, (error) => {
      console.error("Erro ao buscar agendamentos (pode ser falta de índice):", error);
    });

    const unsubscribeFinance = onSnapshot(collection(db, "transactions"), (snapshot) => {
      const total = snapshot.docs.reduce((acc, doc) => acc + (doc.data().amount || 0), 0);
      setRevenue(total);
    });

    return () => {
      unsubscribePatients();
      unsubscribeApps();
      unsubscribeFinance();
    };
  }, []);

  return (
    <div className="space-y-8 pb-12">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-bold text-primary font-headline">Bem-vindo, Dr. Manoel</h1>
            <Badge 
              variant="outline" 
              className={cn(
                "flex items-center gap-1.5 px-2 py-0.5 text-[10px] uppercase font-bold tracking-tighter border-none",
                dbStatus === 'online' ? "bg-green-100 text-green-700" : 
                dbStatus === 'offline' ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-500"
              )}
            >
              {dbStatus === 'online' ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
              {dbStatus === 'online' ? "Sistema Online" : dbStatus === 'offline' ? "Erro de Conexão" : "Verificando..."}
            </Badge>
          </div>
          <p className="text-slate-500">
            Visão geral da clínica para hoje, {currentDate || "carregando data..."}.
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/calendar">
            <Button variant="outline" className="gap-2 border-primary/20 text-primary hover:bg-primary/5 transition-all">
              <Clock className="h-4 w-4" /> Ver Agenda
            </Button>
          </Link>
          <Link href="/patients">
            <Button className="gap-2 bg-primary text-white hover:bg-primary/90 shadow-lg">
              <PlusCircle className="h-4 w-4" /> Novo Paciente
            </Button>
          </Link>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Total de Pacientes" 
          value={patientCount} 
          icon={Users} 
          trend={{ value: "12%", positive: true }} 
        />
        <StatCard 
          title="Agendamentos Hoje" 
          value={appointments.length} 
          icon={CalendarCheck} 
        />
        <StatCard 
          title="Receita Mensal" 
          value={revenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} 
          icon={TrendingUp} 
          trend={{ value: "8%", positive: true }} 
        />
        <Card className="bg-primary text-white border-none shadow-md overflow-hidden flex flex-col justify-center">
          <CardContent className="p-6">
            <div className="flex flex-col items-center text-center gap-2">
              <ShieldCheck className="h-10 w-10 text-white mb-2" />
              <p className="text-[10px] uppercase font-bold tracking-widest text-white/70">Conformidade LGPD</p>
              <h3 className="text-lg font-bold leading-tight">Privacidade Ativa</h3>
              <Badge variant="secondary" className="mt-1 bg-white/20 text-white border-none hover:bg-white/30">Criptografado</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 border-none shadow-md">
          <CardHeader>
            <CardTitle className="text-primary font-headline">Evolução Clínica Média</CardTitle>
            <CardDescription>Comparativo entre marcadores inflamatórios e qualidade do sono (PT-BR).</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={healthTrends}>
                  <defs>
                    <linearGradient id="colorInflammatory" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#065F46" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#065F46" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorSleep" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#64748B" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#64748B" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="month" stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="inflammatory" 
                    stroke="#065F46" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorInflammatory)" 
                    name="PCR (Inflamatório)"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="sleep" 
                    stroke="#64748B" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorSleep)" 
                    name="Índice de Sono"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-primary font-headline">Agenda do Dia</CardTitle>
              <CardDescription>Pacientes confirmados.</CardDescription>
            </div>
            <Link href="/calendar">
              <Button variant="ghost" size="sm" className="text-primary hover:bg-primary/5">Ver Tudo</Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {appointments.length === 0 ? (
                <p className="text-sm text-center text-slate-400 py-10 italic">Nenhum agendamento para hoje.</p>
              ) : (
                appointments.map((appointment) => (
                  <div key={appointment.id} className="flex items-start gap-4 p-3 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer group">
                    <div className="bg-primary/5 p-3 rounded-lg text-primary font-bold text-center min-w-[60px] group-hover:bg-primary group-hover:text-white transition-colors">
                      <span className="text-[10px] uppercase block font-medium opacity-70">Hora</span>
                      {appointment.time}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-sm text-slate-800">{appointment.patientName}</h4>
                      <p className="text-[11px] text-slate-500 mb-2">{appointment.type}</p>
                      <Badge variant="outline" className={cn(
                        "text-[9px] uppercase font-bold px-2 py-0",
                        appointment.status === 'Confirmed' ? "text-emerald-600 border-emerald-600/20 bg-emerald-50" : "text-amber-600 border-amber-600/20 bg-amber-50"
                      )}>
                        {appointment.status === 'Confirmed' ? 'Confirmado' : appointment.status}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link href="/anamnesis" className="contents">
          <Card className="group cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all border-none bg-white">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="bg-primary/10 p-4 rounded-full group-hover:bg-primary transition-all">
                <Stethoscope className="h-6 w-6 text-primary group-hover:text-white" />
              </div>
              <div>
                <h3 className="font-bold text-primary">Nova Anamnese</h3>
                <p className="text-xs text-slate-500">Avaliação clínica integrada</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/planner" className="contents">
          <Card className="group cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all border-none bg-white">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="bg-secondary/10 p-4 rounded-full group-hover:bg-secondary transition-all">
                <FileText className="h-6 w-6 text-secondary group-hover:text-white" />
              </div>
              <div>
                <h3 className="font-bold text-primary">Prescrição Rápida</h3>
                <p className="text-xs text-slate-500">Documento ABNT/ANVISA</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/patients" className="contents">
          <Card className="group cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all border-none bg-white">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="bg-emerald-100 p-4 rounded-full group-hover:bg-emerald-600 transition-all">
                <Users className="h-6 w-6 text-emerald-700 group-hover:text-white" />
              </div>
              <div>
                <h3 className="font-bold text-primary">Gestão de Pacientes</h3>
                <p className="text-xs text-slate-500">Base LGPD Consolidada</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}