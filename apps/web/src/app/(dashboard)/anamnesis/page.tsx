"use client"

import { useState, useEffect } from "react";
import { db, auth } from "@/firebase/config";
import { 
  collection, 
  addDoc, 
  serverTimestamp, 
  query, 
  getDocs, 
  where,
  limit,
  doc,
  updateDoc
} from "firebase/firestore";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Stethoscope, 
  Activity, 
  Save, 
  ArrowRight, 
  ArrowLeft,
  CheckCircle2,
  Plus,
  Trash2,
  Pill,
  Droplets,
  Search,
  User,
  Loader2,
  ClipboardList
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { logAction } from "@/lib/audit";
import { useRouter } from "next/navigation";
import { NewPrescriptionDialog } from "@/components/prescriptions/NewPrescriptionDialog";

interface Patient {
  id: string;
  name: string;
  cpf: string;
}

export default function AnamnesisPage() {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  // Estados de Busca de Paciente
  const [searchTerm, setSearchTerm] = useState("");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Estados da Consulta (SOAP)
  const [painIntensity, setPainIntensity] = useState(0);
  const [stressLevel, setStressLevel] = useState(5);
  const [complaint, setComplaint] = useState("");
  const [vitalSigns, setVitalSigns] = useState({ bp: "", hr: "", weight: "" });
  const [physicalExam, setPhysicalExam] = useState("");
  
  // Listas Dinâmicas
  const [procedures, setProcedures] = useState([{ type: "Soro", description: "", obs: "" }]);

  // Estado para abrir a prescrição ao final
  const [isPrescriptionOpen, setIsPrescriptionOpen] = useState(false);

  const totalSteps = 3;
  const progress = (step / totalSteps) * 100;

  // Busca de Pacientes
  useEffect(() => {
    const search = async () => {
      if (searchTerm.length > 2) {
        setIsSearching(true);
        const q = query(
          collection(db, "patients"),
          where("professionalId", "==", user?.uid),
          where("name", ">=", searchTerm),
          where("name", "<=", searchTerm + "\uf8ff"),
          limit(5)
        );
        const snap = await getDocs(q);
        setPatients(snap.docs.map(doc => ({ id: doc.id, name: doc.data().name, cpf: doc.data().cpf })));
        setIsSearching(false);
      } else {
        setPatients([]);
      }
    };
    const timer = setTimeout(search, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, user?.uid]);

  const addProcedure = () => setProcedures([...procedures, { type: "Soro", description: "", obs: "" }]);
  const removeProcedure = (index: number) => setProcedures(procedures.filter((_, i) => i !== index));

  const handleSaveAtendimento = async (shouldPrescribe: boolean) => {
    if (!selectedPatient) {
      toast({ title: "Paciente não selecionado", variant: "destructive" });
      setStep(1);
      return;
    }

    setIsSubmitting(true);
    try {
      const professionalId = user?.uid || "unknown";
      const professionalName = user?.email || "Profissional";

      const consultationData = {
        patientId: selectedPatient.id,
        patientName: selectedPatient.name,
        date: serverTimestamp(),
        professionalName,
        professionalId,
        soap: {
          subjective: { complaint, painIntensity, stressLevel },
          objective: { vitalSigns, physicalExam },
        },
        procedures,
        status: "Finalizado"
      };

      await addDoc(collection(db, "consultations"), consultationData);
      
      // Atualizar a data da última consulta no paciente
      await updateDoc(doc(db, "patients", selectedPatient.id), {
        lastConsultation: serverTimestamp()
      });
      
      // Registrar evolução
      await addDoc(collection(db, "evolutions"), {
        patientId: selectedPatient.id,
        date: serverTimestamp(),
        type: "Atendimento",
        description: `Consulta Clínica Integrativa. Queixa Base: ${complaint || "Não informada"}. Procedimentos: ${procedures.length}.`,
        professionalName,
        professionalId
      });

      await logAction("FINALIZAR_ATENDIMENTO_COMPLETO", selectedPatient.id, { paciente: selectedPatient.name });

      toast({ 
        title: "Anamnese Finalizada", 
        description: "Os dados clínicos foram sincronizados no prontuário." 
      });
      
      if (shouldPrescribe) {
        setIsPrescriptionOpen(true);
      } else {
        router.push(`/patients/detail?id=${selectedPatient.id}`);
      }
    } catch (e) {
      toast({ title: "Erro ao Salvar", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary font-headline">Atendimento Clínico Integrativo</h1>
          <p className="text-muted-foreground">Avaliação SOAP e Registro de Procedimentos em Consulta.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right hidden md:block">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Progresso</p>
            <Progress value={progress} className="w-32 h-2 mt-1" />
          </div>
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-none font-bold py-1">
            Passo {step} de {totalSteps}
          </Badge>
        </div>
      </header>

      <Card className="border-none shadow-2xl overflow-hidden bg-white/80 backdrop-blur-md">
        <Tabs value={`step-${step}`} className="w-full">
          <div className="bg-secondary/5 p-2 border-b">
            <TabsList className="grid grid-cols-3 bg-transparent w-full">
              <TabsTrigger value="step-1" className="data-[state=active]:bg-white data-[state=active]:text-primary font-bold">1. Avaliação Clínica</TabsTrigger>
              <TabsTrigger value="step-2" className="data-[state=active]:bg-white data-[state=active]:text-primary font-bold">2. Procedimentos</TabsTrigger>
              <TabsTrigger value="step-3" className="data-[state=active]:bg-white data-[state=active]:text-primary font-bold">3. Finalizar e Assinar</TabsTrigger>
            </TabsList>
          </div>

          <CardContent className="p-6 md:p-10 min-h-[400px]">
            {/* PASSO 1: SUBJETIVO & OBJETIVO */}
            <TabsContent value="step-1" className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
              <div className="space-y-4">
                <Label className="text-primary font-bold flex items-center gap-2">
                  <User className="h-4 w-4" /> Selecionar Paciente *
                </Label>
                {selectedPatient ? (
                  <div className="flex items-center justify-between p-4 bg-primary/5 rounded-xl border border-primary/20">
                    <div>
                      <p className="font-bold text-primary">{selectedPatient.name}</p>
                      <p className="text-xs text-muted-foreground">CPF: {selectedPatient.cpf}</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedPatient(null)} className="text-red-500 hover:text-red-600">Trocar</Button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      placeholder="Buscar por nome do paciente..." 
                      className="pl-10 h-12"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    {isSearching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-primary" />}
                    {patients.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-white border rounded-xl shadow-xl overflow-hidden">
                        {patients.map(p => (
                          <button key={p.id} onClick={() => setSelectedPatient(p)} className="w-full text-left p-3 hover:bg-primary/5 border-b last:border-none flex flex-col">
                            <span className="font-bold text-sm">{p.name}</span>
                            <span className="text-[10px] text-muted-foreground">CPF: {p.cpf}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <Label className="text-primary font-bold flex items-center gap-2">
                    <Stethoscope className="h-4 w-4" /> Queixa Principal & Histórico
                  </Label>
                  <Textarea 
                    placeholder="Descreva detalhadamente o relato do paciente..." 
                    className="min-h-[150px] bg-secondary/10 border-none"
                    value={complaint}
                    onChange={(e) => setComplaint(e.target.value)}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex justify-between"><Label className="text-xs font-bold">Dor (0-10)</Label><span className="text-xs font-bold">{painIntensity}</span></div>
                      <Slider value={[painIntensity]} onValueChange={v => setPainIntensity(v[0])} max={10} step={1} />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between"><Label className="text-xs font-bold">Estresse (0-10)</Label><span className="text-xs font-bold">{stressLevel}</span></div>
                      <Slider value={[stressLevel]} onValueChange={v => setStressLevel(v[0])} max={10} step={1} />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <Label className="text-primary font-bold flex items-center gap-2">
                    <Activity className="h-4 w-4" /> Dados Objetivos (Sinais Vitais)
                  </Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs">Pressão Arterial</Label>
                      <Input placeholder="120/80 mmHg" value={vitalSigns.bp} onChange={e => setVitalSigns({...vitalSigns, bp: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Frequência Cardíaca</Label>
                      <Input placeholder="75 bpm" value={vitalSigns.hr} onChange={e => setVitalSigns({...vitalSigns, hr: e.target.value})} />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Observações do Exame Físico</Label>
                    <Textarea 
                      placeholder="Sinais visíveis, palpação, etc..." 
                      className="min-h-[115px] bg-secondary/10 border-none"
                      value={physicalExam}
                      onChange={(e) => setPhysicalExam(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* PASSO 2: PROCEDIMENTOS NA CLÍNICA */}
            <TabsContent value="step-2" className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-primary flex items-center gap-2">
                    <Droplets className="h-5 w-5" /> Procedimentos Realizados (Na Clínica)
                  </h3>
                  <p className="text-xs text-muted-foreground">Registre o que foi aplicado ou realizado durante a consulta.</p>
                </div>
                <Button onClick={addProcedure} variant="outline" size="sm" className="border-primary text-primary font-bold">
                  <Plus className="h-4 w-4 mr-2" /> Adicionar Procedimento
                </Button>
              </div>

              <div className="space-y-4">
                {procedures.map((proc, idx) => (
                  <div key={idx} className="p-6 bg-white rounded-xl border border-slate-100 shadow-sm space-y-4 relative group">
                    <Button 
                      variant="ghost" size="icon" 
                      onClick={() => removeProcedure(idx)}
                      className="absolute top-2 right-2 text-red-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <Label className="text-[10px] uppercase font-bold text-slate-400">Tipo de Procedimento</Label>
                        <Input 
                          placeholder="Ex: Soroterapia, Ozônio..." 
                          value={proc.type} 
                          onChange={e => {
                            const newP = [...procedures];
                            newP[idx].type = e.target.value;
                            setProcedures(newP);
                          }}
                        />
                      </div>
                      <div className="md:col-span-2 space-y-1">
                        <Label className="text-[10px] uppercase font-bold text-slate-400">Descrição Técnica / Composição</Label>
                        <Input 
                          placeholder="Ex: Vitamina C + Complexo B em 250ml Soro Fisiológico" 
                          value={proc.description}
                          onChange={e => {
                            const newP = [...procedures];
                            newP[idx].description = e.target.value;
                            setProcedures(newP);
                          }}
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase font-bold text-slate-400">Observações de Resposta</Label>
                      <Input 
                        placeholder="Ex: Paciente tolerou bem, sem intercorrências." 
                        value={proc.obs}
                        onChange={e => {
                          const newP = [...procedures];
                          newP[idx].obs = e.target.value;
                          setProcedures(newP);
                        }}
                      />
                    </div>
                  </div>
                ))}
                {procedures.length === 0 && (
                  <div className="text-center p-8 bg-slate-50 rounded-xl border-dashed border-2 border-slate-200">
                    <p className="text-slate-500 text-sm">Nenhum procedimento registrado.</p>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* PASSO 3: FINALIZAR ATENDIMENTO */}
            <TabsContent value="step-3" className="space-y-8 animate-in zoom-in-95">
              <div className="text-center space-y-4 py-8">
                <div className="bg-primary/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto text-primary">
                  <ClipboardList className="h-10 w-10" />
                </div>
                <h3 className="text-2xl font-bold text-primary font-headline">Resumo do Atendimento</h3>
                <p className="text-muted-foreground max-w-md mx-auto">Confira se todas as informações clínicas foram registradas. Você poderá prescrever logo em seguida.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
                <div className="p-4 bg-secondary/5 rounded-xl border space-y-2">
                  <h4 className="text-xs font-bold uppercase text-primary">Diagnóstico Inicial / Subjetivo</h4>
                  <p className="text-sm font-medium">{selectedPatient?.name || "Paciente Pendente"}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2">{complaint || "Sem queixa relatada."}</p>
                </div>
                <div className="p-4 bg-secondary/5 rounded-xl border space-y-2">
                  <h4 className="text-xs font-bold uppercase text-primary">Procedimentos Local</h4>
                  <p className="text-lg font-bold text-primary">{procedures.length}</p>
                  <p className="text-xs text-muted-foreground">Realizados no consultório</p>
                </div>
              </div>

              <div className="p-6 bg-amber-50 rounded-xl border border-amber-200 flex gap-3 max-w-3xl mx-auto">
                <CheckCircle2 className="h-5 w-5 text-amber-600 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-amber-900">Finalização de Prontuário</h4>
                  <p className="text-xs text-amber-800 leading-relaxed mt-1">Ao salvar, os dados serão gravados de forma inalterável no histórico do paciente (LGPD). A prescrição médica/farmacêutica passará a ser uma etapa avulsa acessável no seu painel ou através da opção abaixo.</p>
                </div>
              </div>
            </TabsContent>
          </CardContent>

          <CardFooter className="p-6 md:p-10 border-t bg-slate-50 flex flex-col md:flex-row justify-between gap-4">
            <Button 
              variant="outline" 
              onClick={() => setStep(prev => Math.max(1, prev - 1))}
              disabled={step === 1 || isSubmitting}
              className="border-primary/20 text-primary font-bold md:w-auto w-full"
            >
              <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
            </Button>
            
            {step < totalSteps ? (
              <Button 
                onClick={() => setStep(prev => Math.min(totalSteps, prev + 1))} 
                className="bg-primary text-white md:px-12 font-bold shadow-lg md:w-auto w-full"
              >
                Próximo Passo <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
                <Button 
                  onClick={() => handleSaveAtendimento(false)}
                  disabled={isSubmitting}
                  className="bg-white border text-primary border-primary hover:bg-slate-50 px-6 font-bold w-full md:w-auto"
                >
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                  Finalizar (Sem Receita)
                </Button>
                <Button 
                  onClick={() => handleSaveAtendimento(true)}
                  disabled={isSubmitting}
                  className="bg-accent text-white hover:bg-accent/90 shadow-xl px-8 font-bold text-md w-full md:w-auto"
                >
                  {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Pill className="h-5 w-5 mr-2" />}
                  Salvar e Prescrever
                </Button>
              </div>
            )}
          </CardFooter>
        </Tabs>
      </Card>

      {/* Renderização Condicional do Diálogo para ser aberto no fluxo final */}
      {selectedPatient && (
        <NewPrescriptionDialog
          initialPatientId={selectedPatient.id}
          initialPatientName={selectedPatient.name}
          isOpen={isPrescriptionOpen}
          onClose={() => {
            setIsPrescriptionOpen(false);
            router.push(`/patients/detail?id=${selectedPatient.id}`);
          }}
        />
      )}
    </div>
  );
}
