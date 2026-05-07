
"use client"

import { useState, useEffect, useMemo } from "react";
import { auth, db } from "@/firebase/config";
import { collection, onSnapshot, query, where, limit, addDoc, serverTimestamp, updateDoc, doc, deleteDoc, getDoc, getDocs } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { logAction } from "@/lib/audit";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Clock, 
  User, 
  Plus, 
  Calendar as CalendarIcon,
  Search,
  CheckCircle2,
  Loader2,
  Stethoscope,
  Droplets,
  MessageCircle,
  PlayCircle,
  AlertCircle,
  MoreVertical,
  Pencil,
  Trash2,
  Save
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, startOfDay, addHours, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Input } from "@/components/ui/input";
import Link from "next/link";

interface Appointment {
  id: string;
  patientId?: string;
  patientName: string;
  time: string;
  date: string;
  notes?: string;
  status: 'Scheduled' | 'Confirmed' | 'Completed' | 'No-show';
  type: 'Consulta' | 'Soroterapia' | 'Injetável' | 'Retorno' | string;
}

export default function CalendarPage() {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [mounted, setMounted] = useState(false);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const { toast } = useToast();
  const { user } = useAuth();

  // ── Busca de pacientes no dialog ─────────────────────────────
  const [patientSearch, setPatientSearch] = useState("");
  const [patientResults, setPatientResults] = useState<Array<{ id: string; name: string; phone: string }>>([]);
  const [isSearchingPatient, setIsSearchingPatient] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<{ id: string; name: string } | null>(null);
  // ─────────────────────────────────────────────────────────────

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newAppointment, setNewAppointment] = useState({
    time: "09:00",
    type: "Consulta",
    notes: ""
  });

  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [sendingWhatsApp, setSendingWhatsApp] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Busca de pacientes com debounce
  useEffect(() => {
    if (patientSearch.length < 2) {
      setPatientResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      if (!user?.uid) return;
      setIsSearchingPatient(true);
      try {
        const q = query(
          collection(db, "patients"),
          where("professionalId", "==", user.uid),
          where("name", ">=", patientSearch),
          where("name", "<=", patientSearch + "\uf8ff"),
          limit(6)
        );
        const snap = await getDocs(q);
        setPatientResults(snap.docs.map(d => ({
          id: d.id,
          name: d.data().name as string,
          phone: (d.data().phone as string) || ""
        })));
      } catch (e) {
        console.error("Erro na busca de pacientes:", e);
      } finally {
        setIsSearchingPatient(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [patientSearch, user?.uid]);

  const selectedDateStr = date ? format(date, "yyyy-MM-dd") : "";

  useEffect(() => {
    if (!mounted || !selectedDateStr) return;

    setIsLoading(true);

    if (!user?.uid) { setIsLoading(false); return; }

    const q = query(
      collection(db, "appointments"),
      where("professionalId", "==", user.uid),
      where("date", "==", selectedDateStr),
      limit(100)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment));
      data.sort((a, b) => a.time.localeCompare(b.time));
      
      setAppointments(data);
      setIsLoading(false);
    }, (error) => {
      console.error("Erro na busca da agenda:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [mounted, selectedDateStr, user?.uid]);

  const handleCreateAppointment = async () => {
    if (!selectedPatient || !newAppointment.time || !date) {
      toast({ title: "Selecione um paciente e informe o horário", variant: "destructive" });
      return;
    }

    setIsCreating(true);
    try {
      await addDoc(collection(db, "appointments"), {
        patientName: selectedPatient.name,
        patientId: selectedPatient.id,
        time: newAppointment.time,
        date: selectedDateStr,
        type: newAppointment.type,
        notes: newAppointment.notes,
        status: "Scheduled",
        createdAt: serverTimestamp(),
        reminderSent: false,
        professionalId: user?.uid || "",
        professionalName: user?.email || "Profissional"
      });

      await logAction("CRIAR_AGENDAMENTO", selectedPatient.id, {
        paciente: selectedPatient.name,
        data: selectedDateStr,
        horario: newAppointment.time
      });

      toast({ title: "Agendamento criado", description: `${selectedPatient.name} — ${newAppointment.time}` });
      setNewAppointment({ time: "09:00", type: "Consulta", notes: "" });
      setSelectedPatient(null);
      setPatientSearch("");
      setIsDialogOpen(false);
    } catch (error) {
      console.error(error);
      toast({ title: "Erro ao criar agendamento", variant: "destructive" });
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateStatus = async (appId: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, "appointments", appId), { status: newStatus });
      await logAction("ATUALIZAR_STATUS_AGENDAMENTO", appId, { status: newStatus });
      toast({ title: "Status atualizado" });
    } catch (error) {
      toast({ title: "Erro ao atualizar status", variant: "destructive" });
    }
  };

  const STATUS_FLOW: Record<string, Appointment['status']> = {
    'Scheduled': 'Confirmed',
    'Confirmed': 'Completed',
    'Completed': 'Completed', // já finalizado
  };

  const STATUS_LABELS: Record<string, string> = {
    'Scheduled': 'Aguardando',
    'Confirmed': 'Em Atendimento',
    'Completed': 'Finalizado',
    'No-show': 'Faltou',
  };

  const handleProgressStatus = async (appointment: Appointment) => {
    const nextStatus = STATUS_FLOW[appointment.status];
    if (!nextStatus || nextStatus === appointment.status) return;

    try {
      await updateDoc(doc(db, "appointments", appointment.id), { status: nextStatus });
      await logAction("ATUALIZAR_STATUS_AGENDAMENTO", appointment.id, {
        paciente: appointment.patientName,
        de: appointment.status,
        para: nextStatus
      });
      toast({ title: `Status atualizado → ${STATUS_LABELS[nextStatus]}` });
    } catch (error) {
      toast({ title: "Erro ao atualizar status", variant: "destructive" });
    }
  };

  const handleNoShow = async (appointment: Appointment) => {
    try {
      await updateDoc(doc(db, "appointments", appointment.id), { status: 'No-show' });
      await logAction("MARCAR_FALTA_AGENDAMENTO", appointment.id, { paciente: appointment.patientName });
      toast({ title: `${appointment.patientName} marcado como faltou` });
    } catch (error) {
      toast({ title: "Erro", variant: "destructive" });
    }
  };

  const handleDeleteAppointment = async (appointmentId: string, patientName: string) => {
    setDeletingId(appointmentId);
    try {
      await deleteDoc(doc(db, "appointments", appointmentId));
      await logAction("EXCLUIR_AGENDAMENTO", appointmentId, { paciente: patientName });
      toast({ title: "Agendamento removido" });
    } catch (error) {
      toast({ title: "Erro ao remover", variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  const handleSendWhatsAppManual = async (appointment: Appointment) => {
    setSendingWhatsApp(appointment.id);
    try {
      const waDoc = await getDoc(doc(db, "clinic_settings", "whatsapp"));
      if (!waDoc.exists()) {
        toast({ title: "WhatsApp não configurado. Acesse Configurações → WhatsApp.", variant: "destructive" });
        return;
      }
      const wa = waDoc.data() as { instanceId: string; token: string };

      let phone = "";
      if (appointment.patientId) {
        const patDoc = await getDoc(doc(db, "patients", appointment.patientId));
        if (patDoc.exists()) phone = (patDoc.data().phone as string) || "";
      }

      if (!phone) {
        toast({ title: "Paciente sem telefone cadastrado.", variant: "destructive" });
        return;
      }

      const formattedDate = format(parseISO(appointment.date), "dd/MM/yyyy", { locale: ptBR });
      const message = `Olá, *${appointment.patientName}*! 👋\n\nLembramos da sua consulta:\n\n📅 *${formattedDate}*\n⏰ *${appointment.time}*\n🏥 *Dr. Manoel da Farmácia*\n\nPara confirmar ou reagendar, responda esta mensagem. 💚`;

      const response = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, message, instanceId: wa.instanceId, token: wa.token })
      });

      if (!response.ok) throw new Error("Falha no envio");

      await logAction("WHATSAPP_LEMBRETE_MANUAL", appointment.id, { paciente: appointment.patientName });
      toast({ title: `Mensagem enviada para ${appointment.patientName}` });
    } catch {
      toast({ title: "Erro ao enviar WhatsApp", variant: "destructive" });
    } finally {
      setSendingWhatsApp(null);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingAppointment) return;
    setIsUpdating(true);
    try {
      await updateDoc(doc(db, "appointments", editingAppointment.id), {
        patientName: editingAppointment.patientName,
        time: editingAppointment.time,
        type: editingAppointment.type,
        notes: editingAppointment.notes || "",
      });
      await logAction("EDITAR_AGENDAMENTO", editingAppointment.id, { paciente: editingAppointment.patientName });
      toast({ title: "Agendamento atualizado" });
      setIsEditDialogOpen(false);
      setEditingAppointment(null);
    } catch (error) {
      toast({ title: "Erro ao salvar edição", variant: "destructive" });
    } finally {
      setIsUpdating(false);
    }
  };

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
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-8">
        <div>
          <h1 className="text-3xl font-bold text-primary font-headline tracking-tight">Agenda Clínica</h1>
          <p className="text-muted-foreground">Gestão de atendimentos para {date ? format(date, "dd 'de' MMMM", { locale: ptBR }) : ""}.</p>
        </div>
        <div className="flex items-center gap-3">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary text-white hover:bg-primary/90 shadow-md">
                <Plus className="h-4 w-4 mr-2" /> Novo Agendamento
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[460px] border-none shadow-2xl">
              <DialogHeader>
                <DialogTitle className="text-primary font-headline text-2xl">Novo Agendamento</DialogTitle>
                <DialogDescription>
                  Agendando para {date ? format(date, "EEEE, dd 'de' MMMM", { locale: ptBR }) : "data selecionada"}.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-5 py-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-slate-400">Paciente *</Label>
                  {selectedPatient ? (
                    <div className="flex items-center justify-between p-3 bg-primary/5 rounded-xl border border-primary/20">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-primary" />
                        <span className="font-bold text-sm text-primary">{selectedPatient.name}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => { setSelectedPatient(null); setPatientSearch(""); }}
                        className="text-xs text-slate-400 hover:text-red-500 font-bold"
                      >
                        Trocar
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        value={patientSearch}
                        onChange={(e) => setPatientSearch(e.target.value)}
                        placeholder="Buscar paciente cadastrado..."
                        className="h-11 pl-10"
                        autoFocus
                      />
                      {isSearchingPatient && (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-primary" />
                      )}
                      {patientResults.length > 0 && (
                        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-100 rounded-xl shadow-xl overflow-hidden">
                          {patientResults.map(p => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => { setSelectedPatient({ id: p.id, name: p.name }); setPatientSearch(""); setPatientResults([]); }}
                              className="w-full text-left px-4 py-3 hover:bg-primary/5 border-b border-slate-50 last:border-0 flex items-center gap-3"
                            >
                              <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <span className="font-bold text-sm text-slate-800">{p.name}</span>
                            </button>
                          ))}
                        </div>
                      )}
                      {patientSearch.length >= 2 && patientResults.length === 0 && !isSearchingPatient && (
                        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-100 rounded-xl shadow-md overflow-hidden p-4 text-center">
                          <p className="text-xs text-slate-400">Nenhum paciente encontrado.</p>
                          <a href="/patients" className="text-xs font-bold text-primary hover:underline mt-1 block">Cadastrar novo paciente →</a>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-slate-400">Horário *</Label>
                    <Input
                      type="time"
                      value={newAppointment.time}
                      onChange={(e) => setNewAppointment(prev => ({ ...prev, time: e.target.value }))}
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-slate-400">Tipo</Label>
                    <Select
                      value={newAppointment.type}
                      onValueChange={(value) => setNewAppointment(prev => ({ ...prev, type: value }))}
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Consulta">Consulta</SelectItem>
                        <SelectItem value="Retorno">Retorno</SelectItem>
                        <SelectItem value="Soroterapia">Soroterapia</SelectItem>
                        <SelectItem value="Injetável">Injetável</SelectItem>
                        <SelectItem value="Avaliação">Avaliação</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-slate-400">Observações</Label>
                  <Input
                    value={newAppointment.notes}
                    onChange={(e) => setNewAppointment(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Ex: Paciente solicitou manhã..."
                    className="h-11"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                <Button
                  onClick={handleCreateAppointment}
                  disabled={isCreating}
                  className="bg-primary text-white hover:bg-primary/90"
                >
                  {isCreating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                  Confirmar Agendamento
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="sm:max-w-[460px] border-none shadow-2xl">
              <DialogHeader>
                <DialogTitle className="text-primary font-headline text-2xl">Editar Agendamento</DialogTitle>
                <DialogDescription>Atualize os dados do agendamento.</DialogDescription>
              </DialogHeader>
              {editingAppointment && (
                <div className="grid gap-5 py-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-slate-400">Nome do Paciente</Label>
                    <Input
                      value={editingAppointment.patientName}
                      onChange={(e) => setEditingAppointment(prev => prev ? { ...prev, patientName: e.target.value } : null)}
                      className="h-11"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase text-slate-400">Horário</Label>
                      <Input
                        type="time"
                        value={editingAppointment.time}
                        onChange={(e) => setEditingAppointment(prev => prev ? { ...prev, time: e.target.value } : null)}
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase text-slate-400">Tipo</Label>
                      <Select
                        value={editingAppointment.type}
                        onValueChange={(value) => setEditingAppointment(prev => prev ? { ...prev, type: value } : null)}
                      >
                        <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Consulta">Consulta</SelectItem>
                          <SelectItem value="Retorno">Retorno</SelectItem>
                          <SelectItem value="Soroterapia">Soroterapia</SelectItem>
                          <SelectItem value="Injetável">Injetável</SelectItem>
                          <SelectItem value="Avaliação">Avaliação</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-slate-400">Observações</Label>
                    <Input
                      value={editingAppointment.notes || ""}
                      onChange={(e) => setEditingAppointment(prev => prev ? { ...prev, notes: e.target.value } : null)}
                      className="h-11"
                    />
                  </div>
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handleSaveEdit} disabled={isUpdating} className="bg-primary text-white hover:bg-primary/90">
                  {isUpdating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                  Salvar Alterações
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
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
              <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Resumo do Dia</CardTitle>
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
              <div className="flex justify-between items-center p-3 bg-secondary/5 rounded-xl border border-dashed">
                <div className="flex items-center gap-3">
                  <div className="bg-green-100 p-2 rounded-lg text-green-600"><CheckCircle2 className="h-4 w-4" /></div>
                  <span className="text-sm font-medium text-slate-600">Finalizados</span>
                </div>
                <span className="font-bold text-primary">
                  {filteredAppointments.filter(a => a.status === 'Completed').length}
                  <span className="text-xs text-muted-foreground font-normal"> / {filteredAppointments.length}</span>
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-8">
          <Card className="border-none shadow-2xl bg-white overflow-hidden flex flex-col min-h-[700px]">
            <CardHeader className="bg-white border-b sticky top-0 z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 p-6">
              <div>
                <CardTitle className="text-primary font-headline text-2xl flex items-center gap-3">
                  {date ? format(date, "EEEE, dd 'de' MMMM", { locale: ptBR }) : "Selecione uma data"}
                </CardTitle>
                <CardDescription className="font-medium text-slate-500">
                  {isLoading ? "Sincronizando agenda..." : `${filteredAppointments.length} atendimentos programados.`}
                </CardDescription>
              </div>
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Pesquisar paciente..." 
                  className="pl-10 bg-secondary/5 border-none h-11 text-sm rounded-xl"
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
                      <p className="text-[10px] font-bold text-primary/30 uppercase tracking-widest">Lendo Agenda...</p>
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
                        <div className="flex flex-col items-center w-16 shrink-0 pt-2">
                          <span className="text-sm font-bold text-primary tracking-tighter">{slot}</span>
                          <div className="w-px h-full bg-slate-100 mt-2 group-last:bg-transparent" />
                        </div>

                        <div className="flex-1 pb-6 space-y-3">
                          {appsInSlot.length === 0 ? (
                            <div className="h-full border-t border-slate-50 pt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-[10px] text-slate-400 font-bold uppercase tracking-widest hover:text-primary"
                                onClick={() => {
                                  setNewAppointment(prev => ({ ...prev, time: slot }))
                                  setIsDialogOpen(true)
                                }}
                              >
                                <Plus className="h-3 w-3 mr-1" /> Encaixe
                              </Button>
                            </div>
                          ) : (
                            appsInSlot.map((app) => {
                              const status = getStatusConfig(app.status);
                              return (
                                <div 
                                  key={app.id} 
                                  className={cn(
                                    "relative p-4 rounded-xl border-l-4 bg-white shadow-sm",
                                    getTypeStyle(app.type)
                                  )}
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    {/* Coluna esquerda: info */}
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-bold text-sm text-slate-800">{app.patientName}</span>
                                        <Badge className={cn("text-[10px] border", getStatusConfig(app.status).color)}>
                                          {getStatusConfig(app.status).label}
                                        </Badge>
                                      </div>
                                      <p className="text-xs text-muted-foreground mt-0.5">{app.time} · {app.type}</p>
                                      {app.notes && <p className="text-xs text-slate-500 mt-1 italic">{app.notes}</p>}
                                    </div>

                                    {/* Coluna direita: ações */}
                                    <div className="flex items-center gap-1 flex-shrink-0">
                                      {/* Botão Iniciar Atendimento */}
                                      {(app.status === 'Scheduled' || app.status === 'Confirmed') && (
                                        <Link
                                          href={`/anamnesis?patientId=${app.patientId || ''}&patientName=${encodeURIComponent(app.patientName)}&appointmentId=${app.id}`}
                                          className="flex-shrink-0"
                                        >
                                          <Button
                                            size="sm"
                                            className="h-8 text-[11px] font-bold bg-primary text-white hover:bg-primary/90 shadow-sm"
                                          >
                                            <Stethoscope className="h-3 w-3 mr-1.5" />
                                            Iniciar
                                          </Button>
                                        </Link>
                                      )}

                                      {/* Botão de progressão rápida */}
                                      {app.status !== 'Completed' && app.status !== 'No-show' && (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => handleProgressStatus(app)}
                                          className="h-7 text-[10px] font-bold px-2 border-primary/20 text-primary hover:bg-primary hover:text-white transition-all"
                                        >
                                          {app.status === 'Scheduled' ? '▶ Status' : '✓ Finalizar'}
                                        </Button>
                                      )}

                                      {/* Menu de opções */}
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <Button variant="ghost" size="icon" className="h-7 w-7">
                                            <MoreVertical className="h-4 w-4" />
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-48">
                                          <DropdownMenuLabel className="text-[10px] uppercase text-muted-foreground">Ações</DropdownMenuLabel>
                                          <DropdownMenuItem
                                            onClick={() => { setEditingAppointment({ ...app }); setIsEditDialogOpen(true); }}
                                            className="text-xs"
                                          >
                                            <Pencil className="h-3 w-3 mr-2" /> Editar
                                          </DropdownMenuItem>
                                          <DropdownMenuItem
                                            onClick={() => handleSendWhatsAppManual(app)}
                                            className="text-xs text-green-700"
                                            disabled={sendingWhatsApp === app.id}
                                          >
                                            {sendingWhatsApp === app.id
                                              ? <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                                              : <MessageCircle className="h-3 w-3 mr-2" />}
                                            Enviar lembrete WhatsApp
                                          </DropdownMenuItem>
                                          {app.status !== 'No-show' && (
                                            <DropdownMenuItem onClick={() => handleNoShow(app)} className="text-xs text-amber-600">
                                              <AlertCircle className="h-3 w-3 mr-2" /> Marcar como Faltou
                                            </DropdownMenuItem>
                                          )}
                                          <DropdownMenuSeparator />
                                          <DropdownMenuItem
                                            onClick={() => handleDeleteAppointment(app.id, app.patientName)}
                                            className="text-xs text-red-600"
                                            disabled={deletingId === app.id}
                                          >
                                            {deletingId === app.id
                                              ? <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                                              : <Trash2 className="h-3 w-3 mr-2" />}
                                            Excluir
                                          </DropdownMenuItem>
                                        </DropdownMenuContent>
                                      </DropdownMenu>
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
