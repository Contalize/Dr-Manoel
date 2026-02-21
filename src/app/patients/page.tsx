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
  ArrowRightLeft
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

  const filteredPatients = patients.filter(p => 
    p.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const maskCPF = (cpf: string) => {
    if (!cpf) return "";
    if (showSensitive) return cpf;
    return cpf.replace(/\d(?=\d{4})/g, "*");
  };

  if (!mounted) return null;

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary font-headline">CRM de Pacientes</h1>
          <p className="text-muted-foreground">Gerencie o histórico clínico com total conformidade à LGPD.</p>
        </div>
        <Button className="bg-accent text-white hover:bg-accent/90">
          <Plus className="h-4 w-4 mr-2" /> Novo Paciente
        </Button>
      </header>

      <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar por nome ou e-mail..." 
            className="pl-10 border-none shadow-sm bg-white"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowSensitive(!showSensitive)}
            className="flex-1 md:flex-none border-primary/20 text-primary"
          >
            {showSensitive ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
            {showSensitive ? "Ocultar Dados" : "Revelar Dados"}
          </Button>
          <Button variant="outline" size="sm" className="flex-1 md:flex-none border-primary/20 text-primary">
            <Filter className="h-4 w-4 mr-2" /> Filtrar
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-border">
        <Table>
          <TableHeader className="bg-secondary/50">
            <TableRow>
              <TableHead className="font-bold text-primary">Nome do Paciente</TableHead>
              <TableHead className="font-bold text-primary">CPF (Mascarado)</TableHead>
              <TableHead className="font-bold text-primary">Idade (Crono/Bio)</TableHead>
              <TableHead className="font-bold text-primary">Última Consulta</TableHead>
              <TableHead className="font-bold text-primary">Status</TableHead>
              <TableHead className="text-right font-bold text-primary">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPatients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                  Nenhum paciente encontrado.
                </TableCell>
              </TableRow>
            ) : (
              filteredPatients.map((patient) => (
                <TableRow key={patient.id} className="hover:bg-secondary/20 transition-colors">
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                      <span className="text-foreground">{patient.name}</span>
                      <span className="text-xs text-muted-foreground">{patient.email}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{maskCPF(patient.cpf)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{patient.chronoAge}</span>
                      <ArrowRightLeft className="h-3 w-3 text-muted-foreground" />
                      <span className={cn(
                        "text-sm font-bold",
                        patient.bioAge < patient.chronoAge ? "text-green-600" : "text-red-600"
                      )}>{patient.bioAge}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{patient.lastConsultation}</TableCell>
                  <TableCell>
                    <Badge variant={patient.status === 'active' ? 'default' : 'secondary'} className={cn(
                      "capitalize px-3 py-1 border-none",
                      patient.status === 'active' ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                    )}>
                      {patient.status === 'active' ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Ações</DropdownMenuLabel>
                        <DropdownMenuItem>Ver Perfil</DropdownMenuItem>
                        <DropdownMenuItem>Nova Anamnese</DropdownMenuItem>
                        <DropdownMenuItem>Nova Prescrição</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-600">Excluir Registro</DropdownMenuItem>
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