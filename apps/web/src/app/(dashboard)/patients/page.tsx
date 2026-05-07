
"use client"

import { useState, useEffect, useMemo } from "react";
import { db, auth } from "@/firebase/config";
import {
  collection,
  onSnapshot,
  query,
  updateDoc,
  addDoc,
  doc,
  where,
  limit,
  orderBy,
  getDoc,
  serverTimestamp
} from "firebase/firestore";
import Link from "next/link";
import BirthdayAlerts from "@/components/BirthdayAlerts";
import { Input } from "@/components/ui/input";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Search, 
  Eye, 
  EyeOff, 
  MoreHorizontal, 
  Plus, 
  ShieldCheck, 
  Loader2,
  ArrowRightLeft,
  User,
  Pencil,
  Archive,
  UserCircle,
  History as HistoryIcon,
  Pill,
  MessageCircle,
  CheckCircle2,
  Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { logAction } from "@/lib/audit";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { differenceInYears, parseISO } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Patient {
  id: string;
  name: string;
  email: string;
  cpf: string;
  phone: string;
  birthDate: string;
  chronoAge: number;
  bioAge: number;
  gender: string;
  lastConsultation: string;
  status: 'active' | 'inactive';
}

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showSensitive, setShowSensitive] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'today' | 'active'>('all');
  const [editingPatientId, setEditingPatientId] = useState<string | null>(null);
  
  const { user } = useAuth();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    cpf: "",
    phone: "",
    birthDate: "",
    bioAge: "",
    gender: "Feminino",
    lgpdConsent: false
  });

  const chronoAgeCalculated = useMemo(() => {
    if (!formData.birthDate) return 0;
    try {
      return differenceInYears(new Date(), parseISO(formData.birthDate));
    } catch (e) {
      return 0;
    }
  }, [formData.birthDate]);

  useEffect(() => {
    if (chronoAgeCalculated > 0 && !formData.bioAge) {
      setFormData(prev => ({ ...prev, bioAge: chronoAgeCalculated.toString() }));
    }
  }, [chronoAgeCalculated]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !user) return;
    
    setIsInitialLoading(true);
    
    const q = query(
      collection(db, "patients"), 
      where("status", "==", "active"),
      where("professionalId", "==", user.uid),
      orderBy("name"),
      limit(100)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const patientList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Patient[];
      setPatients(patientList);
      setIsInitialLoading(false);
    }, (error) => {
      console.error("Erro ao carregar pacientes:", error);
      setIsInitialLoading(false);
    });

    return () => unsubscribe();
  }, [mounted, user?.uid]);

  const handleRevealSensitive = async () => {
    const newState = !showSensitive;
    setShowSensitive(newState);
    if (newState) {
      await logAction("VISUALIZACAO_DADOS_SENSIVEIS", "TODOS", { tela: "CRM_PACIENTES" });
    }
  };

  const handleOpenEdit = (patient: Patient) => {
    setEditingPatientId(patient.id);
    setFormData({
      name: patient.name,
      email: patient.email,
      cpf: patient.cpf,
      phone: patient.phone || "",
      birthDate: patient.birthDate,
      bioAge: patient.bioAge.toString(),
      gender: patient.gender || "Feminino",
      lgpdConsent: true
    });
    setIsDialogOpen(true);
  };

  const handleArchivePatient = async (patientId: string, patientName: string) => {
    try {
      const patientRef = doc(db, "patients", patientId);
      await updateDoc(patientRef, { status: 'inactive' });
      await logAction("ARQUIVAR_PACIENTE", patientId, { nome: patientName });
      toast({ title: "Registro Arquivado", description: `${patientName} movido para inativos.` });
    } catch (error) {
      toast({ variant: "destructive", title: "Erro ao Arquivar" });
    }
  };

  const handleWhatsAppPatient = async (patient: Patient) => {
    if (!patient.phone) {
      toast({ title: "Paciente sem telefone cadastrado.", variant: "destructive" });
      return;
    }
    try {
      const waDoc = await getDoc(doc(db, "clinic_settings", "whatsapp"));
      if (!waDoc.exists()) {
        toast({ title: "WhatsApp não configurado. Acesse Configurações → WhatsApp.", variant: "destructive" });
        return;
      }
      const wa = waDoc.data() as { instanceId: string; token: string };
      const message = `Olá, *${patient.name}*! 👋\n\nEquipe Dr. Manoel da Farmácia entrando em contato. Como podemos te ajudar? 💚`;
      const response = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: patient.phone, message, instanceId: wa.instanceId, token: wa.token })
      });
      if (!response.ok) throw new Error();
      await logAction("WHATSAPP_MENSAGEM_PACIENTE", patient.id, { nome: patient.name });
      toast({ title: `Mensagem enviada para ${patient.name}` });
    } catch {
      toast({ title: "Erro ao enviar WhatsApp", variant: "destructive" });
    }
  };

  const handleSavePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.lgpdConsent) {
      toast({ title: "Consentimento LGPD necessário", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      await auth.authStateReady();
      const currentUserId = auth.currentUser?.uid;

      if (!currentUserId) {
        throw new Error("Usuário precisa estar autenticado para gerenciar pacientes.");
      }

      const finalBioAge = Number(formData.bioAge) || chronoAgeCalculated;

      const patientData = {
        name: formData.name,
        email: formData.email,
        cpf: formData.cpf,
        phone: formData.phone,
        birthDate: formData.birthDate,
        gender: formData.gender,
        lgpdConsent: formData.lgpdConsent,
        chronoAge: chronoAgeCalculated,
        bioAge: finalBioAge,
        status: "active",
        professionalId: currentUserId,
      };

      if (editingPatientId) {
        await updateDoc(doc(db, "patients", editingPatientId), patientData);
        await logAction("EDITAR_PACIENTE", editingPatientId, { nome: formData.name });
      } else {
        const newDoc = await addDoc(collection(db, "patients"), {
          ...patientData,
          lastConsultation: new Date().toLocaleDateString('pt-BR'),
          createdAt: serverTimestamp(),
        });
        await logAction("CRIAR_PACIENTE", newDoc.id, { nome: formData.name });
      }

      setIsDialogOpen(false);
      resetForm();
      toast({ title: "Sucesso", description: "Paciente salvo com sucesso." });
    } catch (error) {
      console.error("Erro no savePatient:", error);
      toast({ title: "Erro de Conexão", description: "Não foi possível salvar os dados na API.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setEditingPatientId(null);
    setFormData({ name: "", email: "", cpf: "", phone: "", birthDate: "", bioAge: "", gender: "Feminino", lgpdConsent: false });
  };

  const todayStr = new Date().toLocaleDateString('pt-BR');

  const filteredPatients = useMemo(() => {
    return patients.filter(p => {
      const matchesSearch = p.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           p.cpf?.includes(searchTerm);
      
      if (!matchesSearch) return false;
      if (activeFilter === 'today') return p.lastConsultation === todayStr;
      return true;
    }).slice(0, 20);
  }, [patients, searchTerm, activeFilter, todayStr]);

  if (!mounted) return null;

  return (
    <div className="space-y-4 pb-12">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="mt-8 md:mt-0">
          <h1 className="text-xl font-bold text-primary font-headline flex items-center gap-2">
            CRM Clínico & Prontuários
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-none text-[10px] font-bold">
              <ShieldCheck className="h-3 w-3 mr-1" /> LGPD ATIVA
            </Badge>
          </h1>
          <p className="text-xs text-muted-foreground">Gestão de alta densidade para profissionais de saúde.</p>
        </div>

        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRevealSensitive}
            className={cn("h-9 font-bold text-xs", showSensitive ? "bg-primary text-white" : "text-primary border-primary/20")}
          >
            {showSensitive ? <EyeOff className="h-3 w-3 mr-2" /> : <Eye className="h-3 w-3 mr-2" />}
            {showSensitive ? "Ocultar Dados" : "Revelar Dados"}
          </Button>
          
          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-accent text-white hover:bg-accent/90 shadow-md font-bold">
                <Plus className="h-4 w-4 mr-2" /> Novo Paciente
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <form onSubmit={handleSavePatient}>
                <DialogHeader>
                  <DialogTitle className="text-primary font-headline">Cadastro Clínico</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-1">
                    <Label htmlFor="name" className="text-xs">Nome Completo *</Label>
                    <Input id="name" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required className="h-9" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-1">
                      <Label htmlFor="email" className="text-xs">E-mail *</Label>
                      <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} required className="h-9" />
                    </div>
                    <div className="grid gap-1">
                      <Label htmlFor="cpf" className="text-xs">CPF *</Label>
                      <Input id="cpf" value={formData.cpf} onChange={(e) => setFormData({...formData, cpf: e.target.value})} required className="h-9" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-1">
                      <Label htmlFor="phone" className="text-xs">Telefone</Label>
                      <Input id="phone" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="h-9" />
                    </div>
                    <div className="grid gap-1">
                      <Label htmlFor="birthDate" className="text-xs">Nascimento *</Label>
                      <Input id="birthDate" type="date" value={formData.birthDate} onChange={(e) => setFormData({...formData, birthDate: e.target.value})} required className="h-9" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-secondary/5 p-2 rounded-md border text-center">
                      <p className="text-[10px] uppercase font-bold text-muted-foreground">Cronológica</p>
                      <p className="text-lg font-bold text-primary">{chronoAgeCalculated}a</p>
                    </div>
                    <div className="grid gap-1">
                      <Label htmlFor="bioAge" className="text-xs">Bio-Idade</Label>
                      <Input id="bioAge" type="number" value={formData.bioAge} onChange={(e) => setFormData({...formData, bioAge: e.target.value})} className="h-9" />
                    </div>
                  </div>
                  <div className="flex items-start space-x-2 p-2 bg-primary/5 rounded-md border border-primary/10">
                    <Checkbox id="consent" checked={formData.lgpdConsent} onCheckedChange={(checked) => setFormData({...formData, lgpdConsent: !!checked})} className="mt-1" />
                    <label htmlFor="consent" className="text-[10px] font-medium leading-tight text-slate-600">
                      Autorizo o tratamento de dados sensíveis para fins de diagnóstico e prescrição farmacêutica conforme LGPD.
                    </label>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" className="bg-primary text-white w-full font-bold" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : editingPatientId ? <Pencil className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                    {editingPatientId ? "Atualizar Prontuário" : "Finalizar Cadastro"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <BirthdayAlerts />

      <div className="flex flex-col sm:flex-row gap-2 justify-between items-center bg-white p-2 rounded-lg shadow-sm border border-slate-100">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input 
              placeholder="Pesquisar..." 
              className="pl-8 border-none bg-secondary/10 h-8 text-xs focus:ring-1"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="h-4 w-px bg-slate-200 hidden sm:block" />
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
            <Button 
              variant={activeFilter === 'all' ? 'secondary' : 'ghost'} 
              size="sm" 
              className="h-7 text-[10px] font-bold px-2"
              onClick={() => setActiveFilter('all')}
            >
              TODOS
            </Button>
            <Button 
              variant={activeFilter === 'today' ? 'secondary' : 'ghost'} 
              size="sm" 
              className="h-7 text-[10px] font-bold px-2"
              onClick={() => setActiveFilter('today')}
            >
              <Clock className="h-3 w-3 mr-1" /> ATENDIDOS HOJE
            </Button>
            <Button 
              variant={activeFilter === 'active' ? 'secondary' : 'ghost'} 
              size="sm" 
              className="h-7 text-[10px] font-bold px-2"
              onClick={() => setActiveFilter('active')}
            >
              <CheckCircle2 className="h-3 w-3 mr-1" /> BASE ATIVA
            </Button>
          </div>
        </div>
      </div>

      <div className="hidden md:block bg-white rounded-lg shadow-sm overflow-hidden border border-slate-100">
        <Table>
          <TableHeader className="bg-secondary/5">
            <TableRow className="hover:bg-transparent h-10">
              <TableHead className="font-bold text-primary text-[10px] uppercase py-2">Paciente / Identificação</TableHead>
              <TableHead className="font-bold text-primary text-[10px] uppercase">CPF (Auditado)</TableHead>
              <TableHead className="font-bold text-primary text-[10px] uppercase text-center">Idade (Real/Bio)</TableHead>
              <TableHead className="font-bold text-primary text-[10px] uppercase">Última Visita</TableHead>
              <TableHead className="font-bold text-primary text-[10px] uppercase">Status / Tags</TableHead>
              <TableHead className="text-right py-2 pr-4 font-bold text-primary text-[10px] uppercase">Ações Clínicas</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isInitialLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12">
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <span className="text-xs font-bold text-primary uppercase tracking-widest">Sincronizando Base de Dados...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredPatients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground italic text-xs">
                  Nenhum registro localizado no critério selecionado.
                </TableCell>
              </TableRow>
            ) : (
              filteredPatients.map((p) => (
                <TableRow key={p.id} className="hover:bg-primary/5 transition-colors h-12 border-b">
                  <TableCell className="py-2">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-900 text-xs">{p.name}</span>
                      <span className="text-[10px] text-muted-foreground truncate max-w-[150px]">{p.email}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-[11px] text-slate-600">
                    {showSensitive ? p.cpf : p.cpf?.replace(/\d(?=\d{4})/g, "*")}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-2 text-xs">
                      <span className="font-medium text-slate-500">{p.chronoAge}</span>
                      <ArrowRightLeft className="h-3 w-3 text-slate-300" />
                      <span className={cn(
                        "font-bold",
                        p.bioAge < p.chronoAge ? "text-emerald-600" : 
                        p.bioAge > p.chronoAge ? "text-rose-600" : "text-slate-900"
                      )}>{p.bioAge}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-[11px] font-bold text-slate-600">
                    {(() => {
                      let strVal = p.lastConsultation;
                      if (p.lastConsultation && typeof p.lastConsultation === 'object' && 'seconds' in p.lastConsultation) {
                        strVal = new Date((p.lastConsultation as any).seconds * 1000).toLocaleDateString('pt-BR');
                      }
                      if (strVal === todayStr) {
                        return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-none text-[9px] h-4 font-bold">HOJE</Badge>;
                      }
                      return strVal;
                    })()}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Badge className="bg-emerald-100 text-emerald-800 border-none text-[8px] h-4 py-0 uppercase font-bold">Ativo</Badge>
                      {p.bioAge < p.chronoAge && (
                        <Badge className="bg-blue-50 text-blue-700 border-none text-[8px] h-4 py-0 uppercase font-bold">Longevidade</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right pr-4">
                    <div className="flex items-center justify-end gap-1.5">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Link href={`/patients/detail?id=${p.id}`} prefetch={true}>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-primary hover:bg-primary/10">
                                <UserCircle className="h-4 w-4" />
                              </Button>
                            </Link>
                          </TooltipTrigger>
                          <TooltipContent><p className="text-[10px]">Prontuário</p></TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Link href={`/patients/detail?id=${p.id}&tab=evolution`} prefetch={true}>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-600 hover:bg-emerald-50">
                                <HistoryIcon className="h-4 w-4" />
                              </Button>
                            </Link>
                          </TooltipTrigger>
                          <TooltipContent><p className="text-[10px]">Evolução</p></TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Link href={`/patients/detail?id=${p.id}&tab=prescriptions`} prefetch={true}>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-accent hover:bg-accent/10">
                                <Pill className="h-4 w-4" />
                              </Button>
                            </Link>
                          </TooltipTrigger>
                          <TooltipContent><p className="text-[10px]">Receita</p></TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-green-600 hover:bg-green-50"
                              onClick={() => handleWhatsAppPatient(p)}
                              title="Enviar WhatsApp"
                            >
                              <MessageCircle className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent><p className="text-[10px]">WhatsApp</p></TooltipContent>
                        </Tooltip>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuLabel className="text-[10px] uppercase text-muted-foreground">Admin</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => handleOpenEdit(p)} className="text-xs">
                              <Pencil className="h-3 w-3 mr-2" /> Editar Cadastro
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleArchivePatient(p.id, p.name)} className="text-xs text-red-600">
                              <Archive className="h-3 w-3 mr-2" /> Arquivar Registro
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TooltipProvider>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
