
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
  ChevronLeft, 
  ChevronRight,
  Filter,
  Calendar as CalendarIcon
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Appointment {
  id: string;
  patientName: string;
  time: string;
  date: string;
  status: 'Scheduled' | 'Confirmed' | 'Completed' | 'No-show';
  type: string;
}

export default function CalendarPage() {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  useEffect(() => {
    const q = query(collection(db, "appointments"), orderBy("time"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setAppointments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment)));
    });
    return () => unsubscribe();
  }, []);

  const selectedDateStr = date ? format(date, "yyyy-MM-dd") : "";
  const filteredAppointments = appointments.filter(app => app.date === selectedDateStr);

  const getStatusBadge = (status: Appointment['status']) => {
    const styles = {
      'Scheduled': 'bg-blue-100 text-blue-700',
      'Confirmed': 'bg-green-100 text-green-700',
      'Completed': 'bg-slate-100 text-slate-700',
      'No-show': 'bg-red-100 text-red-700'
    };
    const labels = {
      'Scheduled': 'Agendado',
      'Confirmed': 'Confirmado',
      'Completed': 'Finalizado',
      'No-show': 'Faltou'
    };
    return (
      <Badge variant="outline" className={cn("border-none text-[10px] font-bold uppercase", styles[status])}>
        {labels[status]}
      </Badge>
    );
  };

  return (
    <div className="space-y-8 pb-12">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary font-headline">Agenda Clínica</h1>
          <p className="text-muted-foreground">Gestão proativa de consultas e acompanhamentos integrativos.</p>
        </div>
        <Button className="bg-accent text-white hover:bg-accent/90 shadow-lg">
          <Plus className="h-4 w-4 mr-2" /> Novo Agendamento
        </Button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <Card className="lg:col-span-4 border-none shadow-md bg-white">
          <CardHeader>
            <CardTitle className="text-lg text-primary font-headline">Calendário</CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              className="rounded-md border-none p-0"
              locale={ptBR}
            />
          </CardContent>
        </Card>

        <div className="lg:col-span-8 space-y-6">
          <Card className="border-none shadow-md bg-white overflow-hidden">
            <CardHeader className="bg-primary/5 border-b flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-primary font-headline">
                  {date ? format(date, "dd 'de' MMMM", { locale: ptBR }) : "Selecione uma data"}
                </CardTitle>
                <CardDescription>
                  {filteredAppointments.length} consultas agendadas para este dia.
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="h-8 border-primary/20 text-primary">
                  <Filter className="h-3 w-3 mr-2" /> Filtrar
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {filteredAppointments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="bg-secondary/10 p-4 rounded-full mb-4">
                    <CalendarIcon className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-bold text-slate-800">Sem agendamentos</h3>
                  <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                    Não há consultas registradas para o dia {date ? format(date, "dd/MM/yyyy") : ""}.
                  </p>
                </div>
              ) : (
                <div className="divide-y">
                  {filteredAppointments.map((app) => (
                    <div key={app.id} className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors group">
                      <div className="flex items-center gap-6">
                        <div className="text-center min-w-[60px]">
                          <p className="text-lg font-bold text-primary">{app.time}</p>
                          <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Horário</p>
                        </div>
                        <div className="h-10 w-px bg-slate-200" />
                        <div>
                          <h4 className="font-bold text-slate-900 flex items-center gap-2">
                            <User className="h-3 w-3 text-accent" />
                            {app.patientName}
                          </h4>
                          <p className="text-xs text-muted-foreground">{app.type}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {getStatusBadge(app.status)}
                        <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-4">
            <Card className="border-none shadow-sm bg-blue-50/50">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
                  <Clock className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-blue-800">Próxima Consulta</p>
                  <p className="text-sm font-bold text-blue-900">Em 15 minutos</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm bg-green-50/50">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="bg-green-100 p-2 rounded-lg text-green-600">
                  <CalendarIcon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-green-800">Taxa de Presença</p>
                  <p className="text-sm font-bold text-green-900">92% este mês</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
