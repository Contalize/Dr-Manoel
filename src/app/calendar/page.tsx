
"use client"

import { useState, useEffect, useMemo } from "react";
import { db } from "@/firebase/config";
import { collection, onSnapshot, query, orderBy, where, limit } from "firebase/firestore";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Clock, 
  User, 
  Plus, 
  ChevronRight,
  Calendar as CalendarIcon,
  Search,
  CheckCircle2,
  Loader2,
  Stethoscope,
  Droplets,
  MessageCircle,
  PlayCircle,
  AlertCircle,
  MoreVertical
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, startOfDay, addHours, isSameHour, parse } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Input } from "@/components/ui/input";
import Link from "next/link";

interface Appointment {
  id: string;
  patientId?: string;
  patientName: string;
  time: string; // Formato "HH:mm"
  date: string; // Formato "yyyy-MM-dd"
  status: 'Scheduled' | 'Confirmed' | 'Completed' | 'No-show';
  type: 'Consulta' | 'Soroterapia' | 'Injetável' | 'Retorno' | string;
}

export default function CalendarPage() {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [mounted, setMounted] = useState(false);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setMounted(true);
  }, []);

  const selectedDateStr = date ? format(date, "yyyy-MM-dd") : "";

  // Busca Reativa Otimizada (Filtro de data no servidor + Limite de segurança)
  useEffect(() => {
    if (!mounted || !selectedDateStr) return;

    setIsLoading(true);
    
    // Consulta performática: busca apenas agendamentos do dia selecionado
    const q = query(
      collection(db, "appointments"), 
      where("date", "==", selectedDateStr),
      orderBy("time"),
      limit(50) // Limite generoso para um dia de clínica mas protetor para o servidor
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setAppointments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment)));
      setIsLoading(false);
    }, (error) => {
      console.error("Erro na busca da agenda:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [mounted, selectedDateStr]);

  // Slots de Atendimento fixos (não dependem de dados do Firebase)
  const timeSlots = useMemo(() => {
    const slots = [];
    for (let i = 8; i <= 19; i++) {
      slots.push(format(addHours(startOfDay(new Date()), i), "HH:00"));
    }
    return slots;
  }, []);
  
  const filteredAppointments = useMemo(() => {
    if (!searchTerm) return appointments;
    return appointments.filter(app => 
      app.patientName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [appointments, searchTerm]);

  const getStatusConfig = (status: Appointment['status']) => {
    const configs = {
      'Scheduled': { label: 'Aguardando', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: Clock },
      'Confirmed': { label: 'Em Atendimento', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: PlayCircle },
      'Completed': { label: 'Finalizado', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
      'No-show': { label: 'Faltou', color: 'bg-rose-100 text-rose-700 border-rose-200', icon: AlertCircle }
    };
    return configs[status] || configs['Scheduled'];
  };

  const getTypeStyle = (type: string) => {
    if (type.includes('Consulta')) return 'border-l-blue-500 bg-blue-50/30';
    if (type.includes('Soro') || type.includes('Injet')) return 'border-l-purple-500 bg-purple-50/30';
    if (type.includes('Retorno')) return 'border-l-emerald-500 bg-emerald-50/30';
    return 'border-l-slate-300 bg-slate-50/30';
  };

  if (!mounted) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-12 md:mt-0">
        <div>
          <h1 className="text-3xl font-bold text-primary font-headline tracking-tight">Agenda Clínica Profissional</h1>
          <p className="text-muted-foreground">Gestão de alta performance e fluxo de atendimento.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="border-primary/20 text-primary hidden md:flex">
            <CalendarIcon className="h-4 w-4 mr-2" /> Visão Mensal
          </Button>
          <Button className="bg-accent text-white hover:bg-accent/90 shadow-lg px-6 font-bold">
            <Plus className="h-4 w-4 mr-2" /> Novo Agendamento
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Lado Esquerdo: Controle e Mini Calendário */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="border-none shadow-xl bg-white overflow-hidden">
            <CardHeader className="bg-primary/5 border-b py-4">
              <CardTitle className="text-sm text-primary font-bold flex items-center gap-2 uppercase tracking-widest">
                <CalendarIcon className="h-4 w-4 text-accent" />
                Seletor de Data
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                className="rounded-md w-full"
                locale={ptBR}
              />
            </CardContent>
          </Card>

          <Card className="border-none shadow-md bg-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Resumo Operacional</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-secondary/5 rounded-xl border border-dashed">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-100 p-2 rounded-lg text-blue-600"><Stethoscope className="h-4 w-4" /></div>
                  <span className="text-sm font-medium text-slate-600">Consultas</span>
                </div>
                <span className="font-bold text-primary">{filteredAppointments.filter(a => a.type.includes('Consulta')).length}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-secondary/5 rounded-xl border border-dashed">
                <div className="flex items-center gap-3">
                  <div className="bg-purple-100 p-2 rounded-lg text-purple-600"><Droplets className="h-4 w-4" /></div>
                  <span className="text-sm font-medium text-slate-600">Terapias</span>
                </div>
                <span className="font-bold text-primary">{filteredAppointments.filter(a => a.type.includes('Soro') || a.type.includes('Injet')).length}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lado Direito: Linha do Tempo de Alta Performance */}
        <div className="lg:col-span-8">
          <Card className="border-none shadow-2xl bg-white overflow-hidden flex flex-col min-h-[700px]">
            <CardHeader className="bg-white border-b sticky top-0 z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 p-6">
              <div>
                <CardTitle className="text-primary font-headline text-2xl flex items-center gap-3">
                  {date ? format(date, "EEEE, dd 'de' MMMM", { locale: ptBR }) : "Selecione uma data"}
                  <Badge className="bg-emerald-50 text-emerald-700 border-none font-bold">Hoje</Badge>
                </CardTitle>
                <CardDescription className="font-medium text-slate-500">
                  {isLoading ? "Sincronizando agenda..." : `${filteredAppointments.length} atendimentos programados para este ciclo.`}
                </CardDescription>
              </div>
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Pesquisar paciente..." 
                  className="pl-10 bg-secondary/5 border-none h-11 text-sm rounded-xl focus:ring-primary"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <ScrollArea className="h-[600px] w-full">
                <div className="p-6 space-y-0">
                  {isLoading && (
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                      <Loader2 className="h-8 w-8 animate-spin text-primary opacity-20" />
                      <p className="text-[10px] font-bold text-primary/30 uppercase tracking-widest">Lendo Prontuários...</p>
                    </div>
                  )}
                  
                  {!isLoading && timeSlots.map((slot) => {
                    const appsInSlot = filteredAppointments.filter(app => {
                      const appHour = app.time.split(':')[0];
                      const slotHour = slot.split(':')[0];
                      return appHour === slotHour;
                    });

                    return (
                      <div key={slot} className="group flex gap-6 min-h-[100px] relative">
                        {/* Indicador de Horário */}
                        <div className="flex flex-col items-center w-16 shrink-0 pt-2">
                          <span className="text-sm font-bold text-primary tracking-tighter">{slot}</span>
                          <div className="w-px h-full bg-slate-100 mt-2 group-last:bg-transparent" />
                        </div>

                        {/* Conteúdo do Slot */}
                        <div className="flex-1 pb-6 space-y-3">
                          {appsInSlot.length === 0 ? (
                            <div className="h-full border-t border-slate-50 pt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button variant="ghost" size="sm" className="text-[10px] text-slate-400 font-bold uppercase tracking-widest hover:text-primary">
                                <Plus className="h-3 w-3 mr-1" /> Adicionar encaixe
                              </Button>
                            </div>
                          ) : (
                            appsInSlot.map((app) => {
                              const status = getStatusConfig(app.status);
                              return (
                                <div 
                                  key={app.id} 
                                  className={cn(
                                    "p-4 rounded-2xl border-l-4 shadow-sm transition-all hover:shadow-md animate-in fade-in slide-in-from-right-2",
                                    getTypeStyle(app.type)
                                  )}
                                >
                                  <div className="flex items-center justify-between gap-4">
                                    <div className="flex items-start gap-4">
                                      <div className="bg-white p-2 rounded-xl border shadow-sm">
                                        <User className="h-5 w-5 text-primary" />
                                      </div>
                                      <div>
                                        <div className="flex items-center gap-2">
                                          <h4 className="font-bold text-slate-900 text-lg leading-none">{app.patientName}</h4>
                                          <Badge variant="outline" className={cn("text-[9px] uppercase font-bold px-2 py-0 h-4 border-none", status.color)}>
                                            <status.icon className="h-2 w-2 mr-1" />
                                            {status.label}
                                          </Badge>
                                        </div>
                                        <div className="flex items-center gap-3 mt-2">
                                          <span className="text-xs font-bold text-primary flex items-center gap-1">
                                            <Clock className="h-3 w-3" /> {app.time}
                                          </span>
                                          <span className="text-xs text-slate-400 font-medium flex items-center gap-1 uppercase tracking-tighter">
                                            {app.type.includes('Consulta') ? <Stethoscope className="h-3 w-3" /> : <Droplets className="h-3 w-3" />}
                                            {app.type}
                                          </span>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Ações Rápidas */}
                                    <div className="flex items-center gap-2">
                                      <Button variant="outline" size="sm" className="h-9 w-9 p-0 border-emerald-200 text-emerald-600 hover:bg-emerald-50 rounded-lg">
                                        <MessageCircle className="h-4 w-4" />
                                      </Button>
                                      <Link href={app.patientId ? `/patients/${app.patientId}` : '#'}>
                                        <Button className="bg-primary hover:bg-primary/90 text-white font-bold text-xs px-4 h-9 rounded-lg shadow-md flex items-center gap-2">
                                          <PlayCircle className="h-4 w-4" />
                                          Atender
                                        </Button>
                                      </Link>
                                      <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-400">
                                        <MoreVertical className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
