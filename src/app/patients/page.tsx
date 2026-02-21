
"use client"

import { useState, useEffect, useMemo } from "react";
import { db } from "@/firebase/config";
import { collection, onSnapshot, query, addDoc, serverTimestamp } from "firebase/firestore";
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
  Mail,
  Fingerprint
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { differenceInYears, parseISO } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";

interface Patient {
  id: string;
  name: string;
  email: string;
  cpf: string;
  chronoAge: number;
  bioAge: number;
  lastConsultation: string;
  status: 'active' | 'inactive';
}

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showSensitive, setShowSensitive] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
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
    setMounted(true);
    const q = query(collection(db, "patients"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const patientList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Patient[];
      setPatients(patientList);
    });
    return () => unsubscribe();
  }, []);

  const handleRevealSensitive = async () => {
    const newState = !showSensitive;
    setShowSensitive(newState);
    if (newState) {
      await logAction("VISUALIZACAO_DADOS_SENSIVEIS", "TODOS", { tela: "CRM_PACIENTES" });
    }
  };

  const handleCreatePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.lgpdConsent) {
      toast({
        title: "Consentimento Obrigatório",
        description: "O consentimento LGPD é necessário para o cadastro.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    try {
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
        lastConsultation: new Date().toLocaleDateString('pt-BR'),
        consentDate: new Date().toISOString(),
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, "patients"), patientData);
      await logAction("CRIAR_PACIENTE", "NOVO", { nome: formData.name });

      toast({
        title: "Paciente Cadastrado",
        description: `${formData.name} foi adicionado com sucesso.`,
      });

      setIsDialogOpen(false);
      setFormData({
        name: "",
        email: "",
        cpf: "",
        phone: "",
        birthDate: "",
        bioAge: "",
        gender: "Feminino",
        lgpdConsent: false
      });
    } catch (error) {
      toast({
        title: "Erro no Cadastro",
        description: "Não foi possível salvar os dados.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredPatients = patients.filter(p => 
    p.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.cpf?.includes(searchTerm)
  );

  const maskCPF = (cpf: string) => {
    if (!cpf) return "N/D";
    if (showSensitive) return cpf;
    return cpf.replace(/\d(?=\d{4})/g, "*");
  };

  if (!mounted) return null;

  return (
    <div className="space-y-6 md:space-y-8 pb-12">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="mt-12 md:mt-0">
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl md:text-3xl font-bold text-primary font-headline">CRM de Pacientes</h1>
            <Badge variant="outline" className="hidden sm:flex bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] uppercase font-bold h-5 items-center gap-1">
              <ShieldCheck className="h-3 w-3" /> LGPD Ativo
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">Gestão clínica com rastreabilidade total.</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full md:w-auto bg-accent text-white hover:bg-accent/90 shadow-lg py-6 md:py-2">
              <Plus className="h-5 w-5 mr-2" /> Novo Paciente
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleCreatePatient}>
              <DialogHeader>
                <DialogTitle className="text-primary font-headline text-2xl">Cadastro Clínico</DialogTitle>
                <DialogDescription>
                  Dados protegidos por criptografia de ponta a ponta.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Nome Completo</Label>
                  <Input 
                    id="name" 
                    value={formData.name} 
                    onChange={(e) => setFormData({...formData, name: e.target.value})} 
                    required 
                    className="h-12 md:h-10"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="email">E-mail</Label>
                    <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} required className="h-12 md:h-10" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="cpf">CPF</Label>
                    <Input id="cpf" value={formData.cpf} onChange={(e) => setFormData({...formData, cpf: e.target.value})} required className="h-12 md:h-10" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="phone">Telefone</Label>
                    <Input id="phone" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} required className="h-12 md:h-10" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="birthDate">Nascimento</Label>
                    <Input id="birthDate" type="date" value={formData.birthDate} onChange={(e) => setFormData({...formData, birthDate: e.target.value})} required className="h-12 md:h-10" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 items-end">
                  <div className="grid gap-2">
                    <Label>Idade</Label>
                    <Input value={`${chronoAgeCalculated}a`} disabled className="bg-secondary/10 h-12 md:h-10" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="bioAge">Bio-Idade</Label>
                    <Input id="bioAge" type="number" placeholder={chronoAgeCalculated.toString()} value={formData.bioAge} onChange={(e) => setFormData({...formData, bioAge: e.target.value})} className="h-12 md:h-10" />
                  </div>
                </div>
                <div className="flex items-start space-x-2 p-3 bg-secondary/5 rounded-lg border">
                  <Checkbox id="consent" checked={formData.lgpdConsent} onCheckedChange={(checked) => setFormData({...formData, lgpdConsent: !!checked})} className="mt-1" />
                  <label htmlFor="consent" className="text-xs font-medium leading-tight cursor-pointer">
                    Paciente consente com o tratamento de dados de saúde sensíveis (LGPD).
                  </label>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" className="bg-primary text-white w-full py-6 md:py-2" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                  Salvar Registro
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </header>

      <div className="flex flex-col sm:flex-row gap-3 justify-between items-center bg-white p-4 rounded-xl shadow-sm border">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar por nome ou CPF..." 
            className="pl-10 border-none bg-secondary/10 h-11"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleRevealSensitive}
          className={cn(
            "w-full sm:w-auto border-primary/20 h-11 sm:h-9",
            showSensitive ? "bg-primary text-white" : "text-primary"
          )}
        >
          {showSensitive ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
          {showSensitive ? "Ocultar Dados" : "Revelar Dados"}
        </Button>
      </div>

      {/* Desktop View */}
      <div className="hidden md:block bg-white rounded-2xl shadow-md overflow-hidden border">
        <Table>
          <TableHeader className="bg-secondary/5">
            <TableRow>
              <TableHead className="font-bold text-primary text-[11px] uppercase py-4">Paciente</TableHead>
              <TableHead className="font-bold text-primary text-[11px] uppercase">CPF Auditado</TableHead>
              <TableHead className="font-bold text-primary text-[11px] uppercase text-center">Idade / Bio</TableHead>
              <TableHead className="font-bold text-primary text-[11px] uppercase">Última Consulta</TableHead>
              <TableHead className="text-right py-4 pr-6"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPatients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-muted-foreground italic">
                  Nenhum registro encontrado.
                </TableCell>
              </TableRow>
            ) : (
              filteredPatients.map((patient) => (
                <TableRow key={patient.id} className="hover:bg-primary/5 transition-colors">
                  <TableCell className="py-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-900">{patient.name}</span>
                      <span className="text-xs text-muted-foreground">{patient.email}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{maskCPF(patient.cpf)}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-slate-600 font-medium">{patient.chronoAge}</span>
                      <ArrowRightLeft className="h-3 w-3 text-muted-foreground" />
                      <span className={cn(
                        "font-bold",
                        patient.bioAge < patient.chronoAge ? "text-emerald-600" : 
                        patient.bioAge > patient.chronoAge ? "text-red-600" : "text-slate-900"
                      )}>{patient.bioAge}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm font-medium text-slate-600">{patient.lastConsultation}</TableCell>
                  <TableCell className="text-right pr-6">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuLabel>Ações Clínicas</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="cursor-pointer">Abrir Prontuário</DropdownMenuItem>
                        <DropdownMenuItem className="cursor-pointer">Nova Anamnese</DropdownMenuItem>
                        <DropdownMenuItem className="cursor-pointer text-red-600 font-medium">Arquivar Registro</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile View (Cards) */}
      <div className="md:hidden space-y-4">
        {filteredPatients.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-dashed text-muted-foreground">
            Nenhum paciente encontrado.
          </div>
        ) : (
          filteredPatients.map((patient) => (
            <Card key={patient.id} className="border-none shadow-sm bg-white overflow-hidden active:scale-[0.98] transition-transform">
              <CardContent className="p-5 space-y-4">
                <div className="flex justify-between items-start">
                  <div className="flex gap-3">
                    <div className="bg-primary/10 p-2 rounded-lg">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 leading-tight">{patient.name}</h3>
                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5">
                        <Mail className="h-3 w-3" /> {patient.email}
                      </div>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 -mt-1 -mr-2"><MoreHorizontal className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuItem className="py-3">Abrir Prontuário</DropdownMenuItem>
                      <DropdownMenuItem className="py-3">Nova Anamnese</DropdownMenuItem>
                      <DropdownMenuItem className="py-3 text-red-600 font-medium">Arquivar Registro</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-50">
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Identificação</p>
                    <p className="text-xs font-mono flex items-center gap-1.5">
                      <Fingerprint className="h-3 w-3 text-slate-300" />
                      {maskCPF(patient.cpf)}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Idade / Bio</p>
                    <div className="flex items-center gap-2 text-xs font-bold">
                      <span className="text-slate-600">{patient.chronoAge}</span>
                      <ArrowRightLeft className="h-3 w-3 text-slate-300" />
                      <span className={cn(
                        patient.bioAge < patient.chronoAge ? "text-emerald-600" : 
                        patient.bioAge > patient.chronoAge ? "text-red-600" : "text-slate-900"
                      )}>{patient.bioAge}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                   <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="bg-slate-100 text-slate-600 text-[10px] py-0 h-5">Ativo</Badge>
                   </div>
                   <span className="text-[10px] text-muted-foreground font-medium italic">
                    Última visita: {patient.lastConsultation}
                   </span>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
