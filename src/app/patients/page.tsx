
"use client"

import { useState, useEffect } from "react";
import { db } from "@/firebase/config";
import { collection, onSnapshot, query } from "firebase/firestore";
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
  ShieldCheck
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
import { cn } from "@/lib/utils";
import { logAction } from "@/lib/audit";

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
      // Log de Auditoria LGPD para visualização de dados sensíveis
      await logAction("VISUALIZACAO_DADOS_SENSIVEIS", "TODOS", { screen: "CRM_PACIENTES" });
    }
  };

  const filteredPatients = patients.filter(p => 
    p.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.email?.toLowerCase().includes(searchTerm.toLowerCase())
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
        <Button className="bg-accent text-white hover:bg-accent/90 shadow-lg">
          <Plus className="h-4 w-4 mr-2" /> Novo Registro Clínico
        </Button>
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
