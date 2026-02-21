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
  Loader2,
  CalendarDays
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

  // Estados do Formulário
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

  // Cálculo automático da idade cronológica
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
        description: "É necessário o consentimento LGPD para prosseguir com o cadastro.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const patientData = {
        ...formData,
        chronoAge: chronoAgeCalculated,
        bioAge: Number(formData.bioAge) || chronoAgeCalculated,
        status: "active",
        lastConsultation: new Date().toLocaleDateString('pt-BR'),
        consentDate: new Date().toISOString(),
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, "patients"), patientData);
      await logAction("CRIAR_PACIENTE", "NOVO", { nome: formData.name });

      toast({
        title: "Paciente Cadastrado",
        description: `${formData.name} foi adicionado à base clínica com sucesso.`,
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
      console.error(error);
      toast({
        title: "Erro no Cadastro",
        description: "Não foi possível salvar os dados. Verifique sua conexão.",
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
              <ShieldCheck className="h-3 w-3" /> LGPD Ativa
            </Badge>
          </div>
          <p className="text-muted-foreground">Histórico clínico centralizado com criptografia e trilha de auditoria.</p>
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
                  Insira os dados clínicos. A idade cronológica será calculada automaticamente.
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
                    placeholder="Ex: Ana Silva"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="email">E-mail</Label>
                    <Input 
                      id="email" 
                      type="email" 
                      value={formData.email} 
                      onChange={(e) => setFormData({...formData, email: e.target.value})} 
                      required 
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="cpf">CPF</Label>
                    <Input 
                      id="cpf" 
                      value={formData.cpf} 
                      onChange={(e) => setFormData({...formData, cpf: e.target.value})} 
                      required 
                      placeholder="000.000.000-00"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="phone">Telefone</Label>
                    <Input 
                      id="phone" 
                      value={formData.phone} 
                      onChange={(e) => setFormData({...formData, phone: e.target.value})} 
                      required 
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="birthDate">Data de Nascimento</Label>
                    <div className="relative">
                      <Input 
                        id="birthDate" 
                        type="date" 
                        value={formData.birthDate} 
                        onChange={(e) => setFormData({...formData, birthDate: e.target.value})} 
                        required 
                      />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 items-end">
                  <div className="grid gap-2">
                    <div className="flex items-center justify-between">
                      <Label>Idade Cronológica</Label>
                      <Badge variant="secondary" className="text-[10px]">{chronoAgeCalculated} anos</Badge>
                    </div>
                    <Input 
                      value={`${chronoAgeCalculated} anos`} 
                      disabled 
                      className="bg-secondary/20 border-none font-bold"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="bioAge">Bio-Idade (Avaliação)</Label>
                    <Input 
                      id="bioAge" 
                      type="number" 
                      placeholder={chronoAgeCalculated.toString()}
                      value={formData.bioAge} 
                      onChange={(e) => setFormData({...formData, bioAge: e.target.value})} 
                      required 
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="gender">Gênero</Label>
                  <Select value={formData.gender} onValueChange={(val) => setFormData({...formData, gender: val})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Masculino">Masculino</SelectItem>
                      <SelectItem value="Feminino">Feminino</SelectItem>
                      <SelectItem value="Outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-start space-x-2 p-3 bg-secondary/20 rounded-lg">
                  <Checkbox 
                    id="consent" 
                    checked={formData.lgpdConsent} 
                    onCheckedChange={(checked) => setFormData({...formData, lgpdConsent: !!checked})} 
                  />
                  <div className="grid gap-1.5 leading-none">
                    <label htmlFor="consent" className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Declaro que coletei o consentimento livre e esclarecido do paciente para tratamento de dados sensíveis conforme LGPD.
                    </label>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" className="bg-primary text-white w-full" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                  Salvar Registro Clínico
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </header>

      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-border">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar por nome, e-mail ou CPF..." 
            className="pl-10 border-none shadow-none bg-secondary/20"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRevealSensitive}
            className={cn(
              "flex-1 md:flex-none border-primary/20 transition-all",
              showSensitive ? "bg-primary text-white" : "text-primary hover:bg-primary/5"
            )}
          >
            {showSensitive ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
            {showSensitive ? "Ocultar Dados" : "Revelar Dados (Log)"}
          </Button>
          <Button variant="outline" size="sm" className="flex-1 md:flex-none border-primary/20 text-primary">
            <Filter className="h-4 w-4 mr-2" /> Filtros Avançados
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-md overflow-hidden border border-border">
        <Table>
          <TableHeader className="bg-secondary/10">
            <TableRow>
              <TableHead className="font-bold text-primary uppercase text-[11px] tracking-wider">Paciente</TableHead>
              <TableHead className="font-bold text-primary uppercase text-[11px] tracking-wider">CPF (Rastreável)</TableHead>
              <TableHead className="font-bold text-primary uppercase text-[11px] tracking-wider">Status Bio-Idade</TableHead>
              <TableHead className="font-bold text-primary uppercase text-[11px] tracking-wider">Último Contato</TableHead>
              <TableHead className="font-bold text-primary uppercase text-[11px] tracking-wider">Estado</TableHead>
              <TableHead className="text-right font-bold text-primary uppercase text-[11px] tracking-wider">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPatients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-20 text-muted-foreground italic">
                  Nenhum registro encontrado na base auditada.
                </TableCell>
              </TableRow>
            ) : (
              filteredPatients.map((patient) => (
                <TableRow key={patient.id} className="hover:bg-primary/5 transition-colors cursor-pointer group">
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                      <span className="text-foreground font-bold">{patient.name}</span>
                      <span className="text-xs text-muted-foreground">{patient.email}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs font-semibold tracking-tighter">
                    {maskCPF(patient.cpf)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{patient.chronoAge}</span>
                      <ArrowRightLeft className="h-3 w-3 text-muted-foreground" />
                      <span className={cn(
                        "text-sm font-bold px-2 py-0.5 rounded-md",
                        patient.bioAge < patient.chronoAge ? "text-emerald-700 bg-emerald-50" : "text-red-700 bg-red-50"
                      )}>{patient.bioAge}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm font-medium">{patient.lastConsultation}</TableCell>
                  <TableCell>
                    <Badge variant={patient.status === 'active' ? 'default' : 'secondary'} className={cn(
                      "capitalize px-3 py-1 border-none font-bold text-[10px] uppercase",
                      patient.status === 'active' ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                    )}>
                      {patient.status === 'active' ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0 group-hover:bg-primary group-hover:text-white transition-colors">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuLabel>Gestão Clínica</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => logAction("ACESSAR_PERFIL", patient.id)}>Ver Perfil Completo</DropdownMenuItem>
                        <DropdownMenuItem>Iniciar Anamnese</DropdownMenuItem>
                        <DropdownMenuItem>Nova Prescrição</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-600 font-bold">Solicitar Exclusão (LGPD)</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <footer className="flex items-center justify-center gap-4 py-4 text-[10px] text-muted-foreground uppercase font-bold tracking-widest border-t border-border">
        <span>© 2026 PharmaZen Intel</span>
        <span className="h-1 w-1 bg-muted-foreground rounded-full"></span>
        <span>Norma ABNT NBR ISO/IEC 27001</span>
      </footer>
    </div>
  );
}