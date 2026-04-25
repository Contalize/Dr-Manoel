
"use client"

import { useState, useEffect } from "react";
import { db, auth } from "@/firebase/config";
import { getCurrentUser } from "@/lib/auth-utils";
import { 
  collection, 
  addDoc, 
  serverTimestamp, 
  query, 
  getDocs, 
  where,
  limit 
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
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { logAction } from "@/lib/audit";
import { getCurrentUser } from "@/lib/auth-utils";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-utils";

interface Patient {
  id: string;
  name: string;
  cpf: string;
}

export default function AnamnesisPage() {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
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
  const [prescriptions, setPrescriptions] = useState([{ med: "", dose: "", route: "Oral", freq: "", duration: "" }]);

  const totalSteps = 4;
  const progress = (step / totalSteps) * 100;

  // Busca de Pacientes
  useEffect(() => {
    const search = async () => {
      if (searchTerm.length > 2) {
        setIsSearching(true);
        const q = query(
          collection(db, "patients"),
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
  }, [searchTerm]);

  const addProcedure = () => setProcedures([...procedures, { type: "Soro", description: "", obs: "" }]);
  const removeProcedure = (index: number) => setProcedures(procedures.filter((_, i) => i !== index));

  const addPrescription = () => setPrescriptions([...prescriptions, { med: "", dose: "", route: "Oral", freq: "", duration: "" }]);
  const removePrescription = (index: number) => setPrescriptions(prescriptions.filter((_, i) => i !== index));

  const handleSaveAtendimento = async () => {
    if (!selectedPatient) {
      toast({ title: "Paciente não selecionado", variant: "destructive" });
      setStep(1);
      return;
    }

    setIsSubmitting(true);
    try {
      const user = await getCurrentUser().catch(() => null);

      const consultationData = {
        patientId: selectedPatient.id,
        patientName: selectedPatient.name,
        userId: user?.uid || "system",
        date: serverTimestamp(),
        professionalName: user?.email || "Profissional",
        soap: {
          subjective: { complaint, painIntensity, stressLevel },
          objective: { vitalSigns, physicalExam },
        },
        procedures,
        prescriptions,
        status: "Finalizado"
      };

      await addDoc(collection(db, "consultations"), consultationData);
      
      // Também registramos na evolução e prescrição para manter compatibilidade com o prontuário antigo
      await addDoc(collection(db, "evolutions"), {
        patientId: selectedPatient.id,
        userId: user?.uid || "system",
        date: serverTimestamp(),
        type: "Atendimento",
        description: `Consulta Completa. Queixa: ${complaint}. Procedimentos: ${procedures.length}.`,
        professionalName: user?.email || "Profissional"
      });

      await logAction("FINALIZAR_ATENDIMENTO_COMPLETO", selectedPatient.id, { paciente: selectedPatient.name });

      toast({ 
        title: "Atendimento Finalizado", 
        description: "Todos os dados foram sincronizados com o prontuário do paciente." 
      });
      
      router.push(`/patients/${selectedPatient.id}`);
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
          <h1 className="text-3xl font-bold text-primary font-headline">Atendimento Integrativo</h1>
          <p className="text-muted-foreground">Avaliação SOAP, Conduta Clínica e Prescrição em uma única jornada.</p>
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
            <TabsList className="grid grid-cols-4 bg-transparent w-full">
              <TabsTrigger value="step-1" className="data-[state=active]:bg-white data-[state=active]:text-primary font-bold">1. Avaliação</TabsTrigger>
              <TabsTrigger value="step-2" className="data-[state=active]:bg-white data-[state=active]:text-primary font-bold">2. Procedimentos</TabsTrigger>
              <TabsTrigger value="step-3" className="data-[state=active]:bg-white data-[state=active]:text-primary font-bold">3. Prescrição</TabsTrigger>
              <TabsTrigger value="step-4" className="data-[state=active]:bg-white data-[state=active]:text-primary font-bold">4. Finalizar</TabsTrigger>
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
              </div>
            </TabsContent>

            {/* PASSO 3: PRESCRIÇÃO PARA CASA */}
            <TabsContent value="step-3" className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-primary flex items-center gap-2">
                    <Pill className="h-5 w-5" /> Prescrição Farmacêutica (Para Casa)
                  </h3>
                  <p className="text-xs text-muted-foreground">Defina o suporte terapêutico pós-consulta.</p>
                </div>
                <Button onClick={addPrescription} variant="outline" size="sm" className="border-accent text-accent font-bold hover:bg-accent/5">
                  <Plus className="h-4 w-4 mr-2" /> Adicionar Medicamento
                </Button>
              </div>

              <div className="space-y-4">
                {prescriptions.map((presc, idx) => (
                  <div key={idx} className="p-6 bg-accent/5 rounded-xl border border-accent/10 shadow-sm space-y-4 relative group">
                    <Button 
                      variant="ghost" size="icon" 
                      onClick={() => removePrescription(idx)}
                      className="absolute top-2 right-2 text-red-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label className="text-[10px] uppercase font-bold text-accent">Medicamento / Ativo</Label>
                        <Input 
                          placeholder="Ex: Vitamina D3 10.000 UI" 
                          value={presc.med}
                          onChange={e => {
                            const newP = [...prescriptions];
                            newP[idx].med = e.target.value;
                            setPrescriptions(newP);
                          }}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-[10px] uppercase font-bold text-accent">Dose</Label>
                          <Input placeholder="Ex: 1 cápsula" value={presc.dose} onChange={e => {
                            const newP = [...prescriptions];
                            newP[idx].dose = e.target.value;
                            setPrescriptions(newP);
                          }} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] uppercase font-bold text-accent">Via</Label>
                          <Input placeholder="Oral, Sublingual..." value={presc.route} onChange={e => {
                            const newP = [...prescriptions];
                            newP[idx].route = e.target.value;
                            setPrescriptions(newP);
                          }} />
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label className="text-[10px] uppercase font-bold text-accent">Frequência (Intervalo)</Label>
                        <Input placeholder="Ex: De 12 em 12 horas" value={presc.freq} onChange={e => {
                            const newP = [...prescriptions];
                            newP[idx].freq = e.target.value;
                            setPrescriptions(newP);
                          }} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] uppercase font-bold text-accent">Duração do Tratamento</Label>
                        <Input placeholder="Ex: 30 dias" value={presc.duration} onChange={e => {
                            const newP = [...prescriptions];
                            newP[idx].duration = e.target.value;
                            setPrescriptions(newP);
                          }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* PASSO 4: FINALIZAR ATENDIMENTO */}
            <TabsContent value="step-4" className="space-y-8 animate-in zoom-in-95">
              <div className="text-center space-y-4 py-10">
                <div className="bg-primary/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto text-primary">
                  <ClipboardList className="h-10 w-10" />
                </div>
                <h3 className="text-2xl font-bold text-primary font-headline">Resumo do Atendimento</h3>
                <p className="text-muted-foreground max-w-md mx-auto">Confira se todas as informações clínicas foram registradas antes de finalizar o prontuário.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-4 bg-secondary/5 rounded-xl border space-y-2">
                  <h4 className="text-xs font-bold uppercase text-primary">Avaliação</h4>
                  <p className="text-sm font-medium">{selectedPatient?.name || "Paciente não selecionado"}</p>
                  <p className="text-xs text-muted-foreground truncate">{complaint || "Sem queixa principal"}</p>
                </div>
                <div className="p-4 bg-secondary/5 rounded-xl border space-y-2">
                  <h4 className="text-xs font-bold uppercase text-primary">Procedimentos</h4>
                  <p className="text-sm font-bold text-primary">{procedures.length} registro(s)</p>
                  <p className="text-xs text-muted-foreground">Realizados no consultório</p>
                </div>
                <div className="p-4 bg-secondary/5 rounded-xl border space-y-2">
                  <h4 className="text-xs font-bold uppercase text-primary">Prescrição</h4>
                  <p className="text-sm font-bold text-accent">{prescriptions.length} item(ns)</p>
                  <p className="text-xs text-muted-foreground">Para suporte domiciliar</p>
                </div>
              </div>

              <div className="p-6 bg-amber-50 rounded-xl border border-amber-200 flex gap-3">
                <CheckCircle2 className="h-5 w-5 text-amber-600 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-amber-900">Finalização Segura</h4>
                  <p className="text-xs text-amber-800 leading-relaxed">Ao salvar, os logs de auditoria serão gerados e os dados serão criptografados conforme LGPD. Este registro será imutável na linha do tempo do paciente.</p>
                </div>
              </div>
            </TabsContent>
          </CardContent>

          <CardFooter className="p-6 md:p-10 border-t bg-secondary/5 flex justify-between">
            <Button 
              variant="outline" 
              onClick={() => setStep(prev => Math.max(1, prev - 1))}
              disabled={step === 1 || isSubmitting}
              className="border-primary/20 text-primary font-bold"
            >
              <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
            </Button>
            
            {step < totalSteps ? (
              <Button 
                onClick={() => setStep(prev => Math.min(totalSteps, prev + 1))} 
                className="bg-primary text-white px-8 font-bold shadow-lg"
              >
                Próximo Passo <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button 
                onClick={handleSaveAtendimento}
                disabled={isSubmitting}
                className="bg-accent text-white hover:bg-accent/90 px-12 shadow-xl font-bold text-lg"
              >
                {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Save className="h-5 w-5 mr-2" />}
                Finalizar Atendimento
              </Button>
            )}
          </CardFooter>
        </Tabs>
      </Card>
    </div>
  );
}
