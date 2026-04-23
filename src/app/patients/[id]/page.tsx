"use client"

import { useState, useEffect, use } from "react";
import { db, auth } from "@/firebase/config";
import { getCurrentUser } from "@/lib/auth-utils";
import { 
  doc, 
  getDoc, 
  collection, 
  onSnapshot, 
  query, 
  where, 
  addDoc, 
  serverTimestamp 
} from "firebase/firestore";
import Link from "next/link";
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent, 
  CardDescription,
  CardFooter
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  User, 
  Calendar, 
  History as HistoryIcon, 
  FileText, 
  Plus, 
  ClipboardCheck, 
  Clock, 
  Stethoscope,
  Droplets,
  AlertCircle,
  Pill,
  Save,
  Loader2,
  Printer,
  ChevronRight
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { logAction } from "@/lib/audit";
import { cn } from "@/lib/utils";
import { NewPrescriptionDialog } from "@/components/prescriptions/NewPrescriptionDialog";

interface Evolution {
  id: string;
  type: string;
  description: string;
  date: any;
  professionalName: string;
}

interface Prescription {
  id: string;
  date: any;
  medications: any[];
  notes: string;
}

export default function PatientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [patient, setPatient] = useState<any>(null);
  const [evolutions, setEvolutions] = useState<Evolution[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const [newEvolution, setNewEvolution] = useState({ type: "Medicação", description: "" });
  const [evolutionOpen, setEvolutionOpen] = useState(false);

  useEffect(() => {
    if (!id) return;

    const fetchPatient = async () => {
      try {
        const docRef = doc(db, "patients", id);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          setPatient({ id: snap.id, ...snap.data() });
        }
      } catch (e) {
        console.error("Erro ao buscar paciente:", e);
      } finally {
        setIsLoading(false);
      }
    };

    const qEvol = query(
      collection(db, "evolutions"), 
      where("patientId", "==", id)
    );
    const unsubEvol = onSnapshot(qEvol, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Evolution));
      data.sort((a, b) => {
        const timeA = a.date?.toMillis?.() || 0;
        const timeB = b.date?.toMillis?.() || 0;
        return timeB - timeA;
      });
      setEvolutions(data);
    });

    const qPresc = query(
      collection(db, "prescriptions"), 
      where("patientId", "==", id)
    );
    const unsubPresc = onSnapshot(qPresc, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Prescription));
      data.sort((a, b) => {
        const timeA = a.date?.toMillis?.() || 0;
        const timeB = b.date?.toMillis?.() || 0;
        return timeB - timeA;
      });
      setPrescriptions(data);
    });

    fetchPatient();
    return () => {
      unsubEvol();
      unsubPresc();
    };
  }, [id]);

  const handleAddEvolution = async () => {
    if (!newEvolution.description) return;
    setIsSubmitting(true);
    try {
      const user = await getCurrentUser();
      await addDoc(collection(db, "evolutions"), {
        patientId: id,
        userId: user?.uid, // SECURITY: LGPD row-level access compliance
        date: serverTimestamp(),
        type: newEvolution.type,
        description: newEvolution.description,
        professionalName: user?.email || "Profissional"
      });
      await logAction("REGISTRO_EVOLUCAO_CLINICA", id, { tipo: newEvolution.type });
      setNewEvolution({ type: "Medicação", description: "" });
      setEvolutionOpen(false);
      toast({ title: "Evolução Registrada", description: "O log clínico foi salvo com sucesso." });
    } catch (e) {
      toast({ title: "Erro ao Salvar", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <div className="flex h-96 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!patient) return <div className="text-center py-20 font-bold text-red-500">Paciente não encontrado ou acesso negado.</div>;

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 mt-12 md:mt-0">
        <div className="flex items-center gap-4">
          <div className="bg-primary/10 p-4 rounded-2xl">
            <User className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 font-headline">{patient.name}</h1>
            <div className="flex flex-wrap items-center gap-3 mt-1">
              <Badge variant="outline" className="bg-slate-50 border-slate-200 text-slate-600 font-bold text-[10px] uppercase">
                CPF: {patient.cpf?.replace(/\d(?=\d{4})/g, "*")}
              </Badge>
              <Badge className="bg-emerald-100 text-emerald-700 border-none font-bold text-[10px] uppercase">
                {patient.chronoAge} Anos / {patient.bioAge} Bio-Idade
              </Badge>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Nasc: {patient.birthDate}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="border-primary/20 text-primary">
            <Printer className="h-4 w-4 mr-2" /> Imprimir Prontuário
          </Button>
          <Button className="bg-primary text-white hover:bg-primary/90 shadow-md">
            <ClipboardCheck className="h-4 w-4 mr-2" /> Alta Clínica
          </Button>
        </div>
      </header>

      <Tabs defaultValue="evolution" className="w-full">
        <TabsList className="grid grid-cols-4 bg-white shadow-sm rounded-xl border p-1 h-auto mb-6">
          <TabsTrigger value="evolution" className="py-3 font-bold gap-2 data-[state=active]:bg-primary data-[state=active]:text-white rounded-lg transition-all">
            <HistoryIcon className="h-4 w-4" /> Evolução Diária
          </TabsTrigger>
          <TabsTrigger value="prescriptions" className="py-3 font-bold gap-2 data-[state=active]:bg-primary data-[state=active]:text-white rounded-lg transition-all">
            <Pill className="h-4 w-4" /> Receituário
          </TabsTrigger>
          <TabsTrigger value="anamnesis" className="py-3 font-bold gap-2 data-[state=active]:bg-primary data-[state=active]:text-white rounded-lg transition-all">
            <Stethoscope className="h-4 w-4" /> Anamnese SOAP
          </TabsTrigger>
          <TabsTrigger value="summary" className="py-3 font-bold gap-2 data-[state=active]:bg-primary data-[state=active]:text-white rounded-lg transition-all">
            <FileText className="h-4 w-4" /> Resumo Clínico
          </TabsTrigger>
        </TabsList>

        <TabsContent value="evolution" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-primary font-headline">Linha do Tempo de Evolução</h2>
              <p className="text-sm text-muted-foreground">Procedimentos, queixas e aplicações registradas.</p>
            </div>
            <Dialog open={evolutionOpen} onOpenChange={setEvolutionOpen}>
              <DialogTrigger asChild>
                <Button className="bg-primary text-white shadow-lg">
                  <Plus className="h-4 w-4 mr-2" /> Nova Evolução
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Registrar Evolução Clínica</DialogTitle>
                  <DialogDescription>Descreva o que foi realizado ou relatado hoje.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Tipo de Ação</Label>
                    <Select value={newEvolution.type} onValueChange={(val) => setNewEvolution({...newEvolution, type: val})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Medicação">Medicação Administrada</SelectItem>
                        <SelectItem value="Soro">Aplicação de Soro / IV</SelectItem>
                        <SelectItem value="Queixa">Queixa do Paciente</SelectItem>
                        <SelectItem value="Procedimento">Procedimento Clínico</SelectItem>
                        <SelectItem value="Observação">Observação Geral</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Descrição Detalhada</Label>
                    <Textarea 
                      placeholder="Ex: Paciente relatou melhora na dor. Aplicado 500ml de soro com ativos..." 
                      className="min-h-[120px]"
                      value={newEvolution.description}
                      onChange={(e) => setNewEvolution({...newEvolution, description: e.target.value})}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setEvolutionOpen(false)}>Cancelar</Button>
                  <Button onClick={handleAddEvolution} disabled={isSubmitting} className="bg-primary">
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                    Salvar Evolução
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="space-y-4">
            {evolutions.length === 0 ? (
              <Card className="border-dashed py-20 text-center">
                <HistoryIcon className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-slate-400 italic">Sem evoluções registradas para este paciente.</h3>
              </Card>
            ) : (
              evolutions.map((evol) => (
                <Card key={evol.id} className="border-none shadow-sm bg-white hover:shadow-md transition-all border-l-4 border-l-primary">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex gap-4">
                        <div className={cn(
                          "p-3 rounded-xl",
                          evol.type === "Soro" ? "bg-blue-100 text-blue-700" :
                          evol.type === "Queixa" ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"
                        )}>
                          {evol.type === "Soro" ? <Droplets className="h-5 w-5" /> :
                           evol.type === "Queixa" ? <AlertCircle className="h-5 w-5" /> : <ClipboardCheck className="h-5 w-5" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-slate-900">{evol.type}</h4>
                            <span className="text-xs text-muted-foreground">•</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                              {evol.date?.toDate ? format(evol.date.toDate(), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "..."}
                            </span>
                          </div>
                          <p className="text-sm text-slate-600 mt-2 leading-relaxed whitespace-pre-wrap">{evol.description}</p>
                          <p className="text-[10px] font-bold text-primary mt-4 uppercase">Profissional: {evol.professionalName}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="prescriptions" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-primary font-headline">Receituário Clínico</h2>
              <p className="text-sm text-muted-foreground">Histórico de prescrições e novos receituários.</p>
            </div>
            <NewPrescriptionDialog 
              initialPatientId={patient.id} 
              initialPatientName={patient.name} 
              trigger={
                <Button className="bg-accent text-white hover:bg-accent/90">
                  <Plus className="h-4 w-4 mr-2" /> Novo Receituário
                </Button>
              }
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {prescriptions.map((presc) => (
              <Card key={presc.id} className="border-none shadow-md bg-white group hover:-translate-y-1 transition-all">
                <CardHeader className="bg-slate-50 border-b py-4">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-sm font-bold text-primary flex items-center gap-2">
                      <Pill className="h-4 w-4" /> Receita #{presc.id.substring(0, 4)}
                    </CardTitle>
                    <span className="text-[10px] font-bold text-slate-400">
                      {presc.date?.toDate ? format(presc.date.toDate(), "dd/MM/yyyy", { locale: ptBR }) : ""}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="p-5 space-y-4">
                  <div className="space-y-2">
                    {presc.medications?.map((m: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between p-2 bg-secondary/5 rounded-lg border border-slate-100">
                        <div>
                          <p className="text-xs font-bold text-slate-800">{m.nome}</p>
                          <p className="text-[10px] text-muted-foreground">{m.posologia}</p>
                        </div>
                        <Badge variant="outline" className="text-[8px] uppercase">{m.via}</Badge>
                      </div>
                    ))}
                  </div>
                  {presc.notes && (
                    <p className="text-xs text-slate-500 italic border-t pt-2">Obs: {presc.notes}</p>
                  )}
                </CardContent>
                <CardFooter className="pt-0 flex gap-2">
                  <Button variant="ghost" className="w-full text-xs font-bold text-primary hover:bg-primary/5">
                    <Printer className="h-3 w-3 mr-2" /> Imprimir
                  </Button>
                  <Button variant="ghost" className="w-full text-xs font-bold text-slate-400">
                    Ver Detalhes <ChevronRight className="h-3 w-3 ml-1" />
                  </Button>
                </CardFooter>
              </Card>
            ))}
            {prescriptions.length === 0 && (
              <div className="col-span-full py-20 bg-secondary/5 rounded-2xl border-2 border-dashed border-secondary/20 flex flex-col items-center justify-center">
                <Pill className="h-10 w-10 text-slate-300 mb-2" />
                <p className="text-slate-400 font-bold italic">Nenhuma receita emitida para este paciente.</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="anamnesis">
          <Card className="border-none shadow-md">
            <CardContent className="p-20 text-center space-y-4">
              <Stethoscope className="h-16 w-16 text-primary/20 mx-auto" />
              <h3 className="text-xl font-bold text-primary">Iniciar Avaliação Integrativa</h3>
              <p className="text-muted-foreground">O módulo de avaliação clínica SOAP está integrado.</p>
              <Link href="/anamnesis" prefetch={true}>
                <Button>Ir para Atendimento</Button>
              </Link>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="summary">
          <Card className="border-none shadow-md">
            <CardContent className="p-10 space-y-6">
              <h3 className="text-xl font-bold text-primary font-headline border-b pb-2">Diagnóstico Situacional</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Situação Atual</Label>
                    <p className="text-sm font-medium">Paciente em protocolo integrativo de desinflamação.</p>
                  </div>
                </div>
                <div className="p-4 bg-primary/5 rounded-xl border border-primary/10">
                  <h4 className="text-xs font-bold text-primary uppercase mb-2">Orientações Prioritárias</h4>
                  <ul className="text-xs space-y-1 list-disc list-inside text-slate-600">
                    <li>Manter hidratação adequada</li>
                    <li>Suplementação conforme prescrição</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
