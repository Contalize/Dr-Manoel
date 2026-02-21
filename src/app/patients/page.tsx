
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
  Filter,
  ArrowRightLeft,
  ShieldCheck,
  Loader2
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { logAction } from "@/lib/audit";
import { useToast } from "@/hooks/use-toast";
import { differenceInYears, parseISO } from "date-fns";

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
    <div className="space-y-8 pb-12">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-3xl font-bold text-primary font-headline">Gestão de Pacientes (CRM)</h1>
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] uppercase font-bold py-0 h-5 flex items-center gap-1">
              <ShieldCheck className="h-3 w-3" /> Conformidade LGPD
            </Badge>
          </div>
          <p className="text-muted-foreground">Histórico clínico centralizado com trilha de auditoria completa.</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-accent text-white hover:bg-accent/90 shadow-lg">
              <Plus className="h-4 w-4 mr-2" /> Novo Registro Clínico
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <form onSubmit={handleCreatePatient}>
              <DialogHeader>
                <DialogTitle className="text-primary font-headline text-2xl">Cadastro de Paciente</DialogTitle>
                <DialogDescription>
                  Preencha os dados clínicos. A idade cronológica e bio-idade são automáticas por padrão.
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
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="email">E-mail</Label>
                    <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="cpf">CPF</Label>
                    <Input id="cpf" value={formData.cpf} onChange={(e) => setFormData({...formData, cpf: e.target.value})} required placeholder="000.000.000-00" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="phone">Telefone</Label>
                    <Input id="phone" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="birthDate">Data de Nascimento</Label>
                    <Input id="birthDate" type="date" value={formData.birthDate} onChange={(e) => setFormData({...formData, birthDate: e.target.value})} required />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 items-end">
                  <div className="grid gap-2">
                    <Label>Idade Cronológica</Label>
                    <Input value={`${chronoAgeCalculated} anos`} disabled className="bg-secondary/20 font-bold" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="bioAge">Bio-Idade (Opcional)</Label>
                    <Input 
                      id="bioAge" 
                      type="number" 
                      placeholder={chronoAgeCalculated.toString()} 
                      value={formData.bioAge} 
                      onChange={(e) => setFormData({...formData, bioAge: e.target.value})} 
                    />
                  </div>
                </div>
                <div className="flex items-start space-x-2 p-3 bg-secondary/10 rounded-lg">
                  <Checkbox id="consent" checked={formData.lgpdConsent} onCheckedChange={(checked) => setFormData({...formData, lgpdConsent: !!checked})} />
                  <label htmlFor="consent" className="text-xs font-medium leading-none">
                    Confirmo o consentimento do paciente para tratamento de dados sensíveis (LGPD).
                  </label>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" className="bg-primary text-white w-full" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                  Finalizar Cadastro
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </header>

      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-2xl shadow-sm border">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar paciente..." 
            className="pl-10 border-none bg-secondary/20"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRevealSensitive}
            className={cn(
              "border-primary/20",
              showSensitive ? "bg-primary text-white" : "text-primary"
            )}
          >
            {showSensitive ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
            {showSensitive ? "Ocultar Dados" : "Revelar Dados"}
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-md overflow-hidden border">
        <Table>
          <TableHeader className="bg-secondary/5">
            <TableRow>
              <TableHead className="font-bold text-primary text-[11px] uppercase">Paciente</TableHead>
              <TableHead className="font-bold text-primary text-[11px] uppercase">CPF (Auditado)</TableHead>
              <TableHead className="font-bold text-primary text-[11px] uppercase">Idade/Bio-Idade</TableHead>
              <TableHead className="font-bold text-primary text-[11px] uppercase">Última Consulta</TableHead>
              <TableHead className="font-bold text-primary text-[11px] uppercase text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPatients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-muted-foreground italic">
                  Nenhum paciente encontrado.
                </TableCell>
              </TableRow>
            ) : (
              filteredPatients.map((patient) => (
                <TableRow key={patient.id} className="hover:bg-primary/5 cursor-pointer">
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-900">{patient.name}</span>
                      <span className="text-xs text-muted-foreground">{patient.email}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{maskCPF(patient.cpf)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
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
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Ações Clínicas</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>Ver Prontuário</DropdownMenuItem>
                        <DropdownMenuItem>Nova Anamnese</DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600">Remover Registro</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
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
