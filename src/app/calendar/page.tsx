"use client"

import { useState, useEffect } from "react";
import { db } from "@/firebase/config";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Clock, 
  User, 
  Plus, 
  ChevronRight,
  Filter,
  Calendar as CalendarIcon,
  Search,
  CheckCircle2,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Input } from "@/components/ui/input";

interface Appointment {
  id: string;
  patientName: string;
  time: string;
  date: string;
  status: 'Scheduled' | 'Confirmed' | 'Completed' | 'No-show';
  type: string;
}

export default function CalendarPage() {
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [mounted, setMounted] = useState(false);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    setMounted(true);
    setDate(new Date());

    const q = query(collection(db, "appointments"), orderBy("time"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setAppointments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment)));
    });
    return () => unsubscribe();
  }, []);

  const selectedDateStr = date ? format(date, "yyyy-MM-dd") : "";
  const filteredAppointments = appointments.filter(app => {
    const matchesDate = app.date === selectedDateStr;
    const matchesSearch = app.patientName.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesDate && matchesSearch;
  });

  const getStatusBadge = (status: Appointment['status']) => {
    const styles = {
      'Scheduled': 'bg-blue-100 text-blue-700',
      'Confirmed': 'bg-emerald-100 text-emerald-700',
      'Completed': 'bg-slate-100 text-slate-700',
      'No-show': 'bg-rose-100 text-rose-700'
    };
    const labels = {
      'Scheduled': 'Agendado',
      'Confirmed': 'Confirmado',
      'Completed': 'Finalizado',
      'No-show': 'Faltou'
    };
    return (
      <Badge variant="outline" className={cn("border-none text-[10px] font-bold uppercase py-0 h-5", styles[status])}>
        {labels[status]}
      </Badge>
    );
  };

  if (!mounted) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-12 md:mt-0">
        <div>
          <h1 className="text-3xl font-bold text-primary font-headline tracking-tight">Agenda Clínica Profissional</h1>
          <p className="text-muted-foreground">Gestão estratégica de consultas e fluxos de atendimento.</p>
        </div>
        <Button className="bg-accent text-white hover:bg-accent/90 shadow-lg px-6">
          <Plus className="h-4 w-4 mr-2" /> Novo Agendamento
        </Button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Lado Esquerdo: Calendário */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="border-none shadow-xl bg-white overflow-hidden">
            <CardHeader className="bg-primary/5 border-b">
              <CardTitle className="text-lg text-primary font-bold flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 text-accent" />
                Seletor de Data
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                className="rounded-md border-none w-full"
                locale={ptBR}
              />
            </CardContent>
          </Card>

          <Card className="border-none shadow-md bg-emerald-50/50">
            <CardContent className="p-6">
              <h4 className="text-xs font-bold text-primary uppercase tracking-widest mb-4">Resumo do Dia</h4>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Total Previsto</span>
                  <span className="font-bold text-primary">{filteredAppointments.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Confirmados</span>
                  <span className="font-bold text-emerald-600">
                    {filteredAppointments.filter(a => a.status === 'Confirmed').length}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lado Direito: Lista de Compromissos */}
        <div className="lg:col-span-8 space-y-6">
          <Card className="border-none shadow-xl bg-white overflow-hidden flex flex-col min-h-[500px]">
            <CardHeader className="bg-white border-b sticky top-0 z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 p-6">
              <div>
                <CardTitle className="text-primary font-headline text-2xl">
                  {date ? format(date, "EEEE, dd 'de' MMMM", { locale: ptBR }) : "Selecione uma data"}
                </CardTitle>
                <CardDescription className="font-medium text-slate-500">
                  {filteredAppointments.length} registros encontrados para esta data.
                </CardDescription>
              </div>
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Buscar por paciente..." 
                  className="pl-10 bg-secondary/10 border-none h-10 text-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </CardHeader>

            <CardContent className="p-0 flex-1">
              {filteredAppointments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                  <div className="bg-primary/5 p-6 rounded-full mb-4 animate-pulse">
                    <CalendarIcon className="h-12 w-12 text-primary/20" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800">Agenda livre</h3>
                  <p className="text-sm text-muted-foreground max-w-xs mx-auto mt-2">
                    Não há consultas agendadas para o dia {date ? format(date, "dd/MM/yyyy") : ""}.
                  </p>
                  <Button variant="outline" className="mt-6 border-primary/20 text-primary hover:bg-primary/5">
                    <Plus className="h-4 w-4 mr-2" /> Agendar Agora
                  </Button>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {filteredAppointments.map((app) => (
                    <div key={app.id} className="p-5 flex items-center justify-between hover:bg-slate-50 transition-all group border-l-4 border-transparent hover:border-accent">
                      <div className="flex items-center gap-8">
                        <div className="flex flex-col items-center justify-center min-w-[70px] bg-secondary/5 p-3 rounded-xl border border-secondary/10 group-hover:bg-white transition-colors">
                          <Clock className="h-4 w-4 text-primary mb-1" />
                          <p className="text-lg font-bold text-primary tracking-tight leading-none">{app.time}</p>
                        </div>
                        
                        <div>
                          <h4 className="font-bold text-slate-900 text-base flex items-center gap-2">
                            {app.patientName}
                            {app.status === 'Confirmed' && <CheckCircle2 className="h-3 w-3 text-emerald-500" />}
                          </h4>
                          <div className="flex items-center gap-3 mt-1">
                            <Badge variant="secondary" className="bg-slate-100 text-slate-600 text-[9px] uppercase font-bold tracking-tight h-4 px-1.5">
                              {app.type}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <User className="h-2.5 w-2.5" /> Prontuário Ativo
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        {getStatusBadge(app.status)}
                        <Button variant="ghost" size="icon" className="h-10 w-10 opacity-40 group-hover:opacity-100 hover:bg-white hover:shadow-sm">
                          <ChevronRight className="h-5 w-5 text-primary" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
