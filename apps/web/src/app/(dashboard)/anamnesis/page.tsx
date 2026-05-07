"use client"

import { useState, useEffect, useMemo } from "react";
import { db } from "@/firebase/config";
import {
  collection,
  writeBatch,
  serverTimestamp,
  query,
  getDocs,
  where,
  limit,
  doc,
  getDoc
} from "firebase/firestore";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Stethoscope, Activity, Save, ArrowRight, ArrowLeft, CheckCircle2,
  Plus, Trash2, Pill, Droplets, Search, User, Loader2, ClipboardList,
  CircleDollarSign, Heart, Brain, Leaf, FlaskConical, AlertTriangle,
  ThermometerSun, Scale, Ruler, Wind, Percent, Clock, BookOpen
} from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { logAction } from "@/lib/audit";
import { NewPrescriptionDialog } from "@/components/prescriptions/NewPrescriptionDialog";

interface Patient {
  id: string;
  name: string;
  cpf: string;
  birthDate?: string;
  gender?: string;
}

interface Medication {
  nome: string;
  dose: string;
  frequencia: string;
}

interface Procedure {
  type: string;
  description: string;
  obs: string;
}

const STEP_TITLES = [
  "Paciente & Queixa",
  "Antecedentes & Hábitos",
  "Sinais Vitais",
  "Procedimentos & Conduta",
  "Faturamento",
];

export default function AnamnesisPage() {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  const urlPatientId = searchParams.get("patientId");
  const urlPatientName = searchParams.get("patientName");
  const urlAppointmentId = searchParams.get("appointmentId");

  // ── Step 1: Paciente ─────────────────────────────────────────
  const [searchTerm, setSearchTerm] = useState("");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // ── Step 1: Queixa Principal ─────────────────────────────────
  const [complaint, setComplaint] = useState("");
  const [symptomDuration, setSymptomDuration] = useState("");
  const [hma, setHma] = useState("");
  const [associatedSymptoms, setAssociatedSymptoms] = useState("");

  // ── Step 2: Antecedentes Pessoais & Familiares ───────────────
  const [pastMedicalHistory, setPastMedicalHistory] = useState("");
  const [familyHistory, setFamilyHistory] = useState("");

  // ── Step 2: Medicamentos em Uso ──────────────────────────────
  const [currentMedications, setCurrentMedications] = useState<Medication[]>([]);
  const [allergyInput, setAllergyInput] = useState("");
  const [allergies, setAllergies] = useState<string[]>([]);

  // ── Step 2: Hábitos de Vida ──────────────────────────────────
  const [smoking, setSmoking] = useState("Não fuma");
  const [smokingDetails, setSmokingDetails] = useState("");
  const [alcohol, setAlcohol] = useState("Não");
  const [exercise, setExercise] = useState("Sedentário");
  const [exerciseDetails, setExerciseDetails] = useState("");
  const [sleepQuality, setSleepQuality] = useState("Regular");
  const [sleepHours, setSleepHours] = useState("7");
  const [diet, setDiet] = useState("");

  // ── Step 3: Sinais Vitais ────────────────────────────────────
  const [bp, setBp] = useState("");
  const [hr, setHr] = useState("");
  const [rr, setRr] = useState("");
  const [spo2, setSpo2] = useState("");
  const [temperature, setTemperature] = useState("");
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [waistCircumference, setWaistCircumference] = useState("");
  const [generalCondition, setGeneralCondition] = useState("Bom estado geral");
  const [physicalExam, setPhysicalExam] = useState("");
  const [painIntensity, setPainIntensity] = useState(0);
  const [stressLevel, setStressLevel] = useState(5);

  // ── Step 4: Procedimentos & Avaliação ───────────────────────
  const [procedures, setProcedures] = useState<Procedure[]>([{ type: "Soroterapia", description: "", obs: "" }]);
  const [hypotheses, setHypotheses] = useState("");
  const [cid10, setCid10] = useState("");
  const [conduct, setConduct] = useState("");

  // ── Step 5: Faturamento ──────────────────────────────────────
  const [billValue, setBillValue] = useState("");
  const [tipoCliente, setTipoCliente] = useState<"PF" | "PJ">("PF");
  const [categoriaServico, setCategoriaServico] = useState("Consulta Clínica Integrativa");

  const [isPrescriptionOpen, setIsPrescriptionOpen] = useState(false);

  // IMC auto-calculado
  const calculatedBMI = useMemo(() => {
    const w = parseFloat(weight);
    const h = parseFloat(height) / 100;
    if (!w || !h || h === 0) return "";
    return (w / (h * h)).toFixed(1);
  }, [weight, height]);

  const totalSteps = 5;
  const progress = (step / totalSteps) * 100;

  // Pré-seleção via URL (fluxo Agenda → Iniciar Atendimento)
  useEffect(() => {
    if (!urlPatientId || !urlPatientName) return;
    const loadUrlPatient = async () => {
      try {
        setSelectedPatient({ id: urlPatientId, name: decodeURIComponent(urlPatientName), cpf: "" });
        setStep(2);
        const snap = await getDoc(doc(db, "patients", urlPatientId));
        if (snap.exists()) {
          const d = snap.data();
          setSelectedPatient({ id: snap.id, name: d.name, cpf: d.cpf || "", birthDate: d.birthDate, gender: d.gender });
        }
      } catch (e) {
        console.error("Erro ao carregar paciente da URL:", e);
      }
    };
    loadUrlPatient();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlPatientId, urlPatientName]);

  // Busca de pacientes com debounce
  useEffect(() => {
    const search = async () => {
      if (searchTerm.length > 2 && user?.uid) {
        setIsSearching(true);
        const q = query(
          collection(db, "patients"),
          where("professionalId", "==", user.uid),
          where("name", ">=", searchTerm),
          where("name", "<=", searchTerm + ""),
          limit(6)
        );
        const snap = await getDocs(q);
        setPatients(snap.docs.map(d => ({
          id: d.id,
          name: d.data().name as string,
          cpf: d.data().cpf as string,
          birthDate: d.data().birthDate as string,
          gender: d.data().gender as string,
        })));
        setIsSearching(false);
      } else {
        setPatients([]);
      }
    };
    const timer = setTimeout(search, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, user?.uid]);

  const addMedication = () => setCurrentMedications(prev => [...prev, { nome: "", dose: "", frequencia: "" }]);
  const removeMedication = (i: number) => setCurrentMedications(prev => prev.filter((_, idx) => idx !== i));
  const updateMedication = (i: number, field: keyof Medication, value: string) => {
    setCurrentMedications(prev => {
      const copy = [...prev];
      copy[i] = { ...copy[i], [field]: value };
      return copy;
    });
  };

  const addAllergy = () => {
    const trimmed = allergyInput.trim();
    if (trimmed && !allergies.includes(trimmed)) {
      setAllergies(prev => [...prev, trimmed]);
      setAllergyInput("");
    }
  };

  const addProcedure = () => setProcedures(prev => [...prev, { type: "Soroterapia", description: "", obs: "" }]);
  const removeProcedure = (i: number) => setProcedures(prev => prev.filter((_, idx) => idx !== i));
  const updateProcedure = (i: number, field: keyof Procedure, value: string) => {
    setProcedures(prev => {
      const copy = [...prev];
      copy[i] = { ...copy[i], [field]: value };
      return copy;
    });
  };

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
      const today = new Date().toISOString().split("T")[0];
      const amountInCents = billValue ? Math.round(Number(billValue.replace(",", ".")) * 100) : 0;

      const consultationRef = doc(collection(db, "consultations"));
      const evolutionRef = doc(collection(db, "evolutions"));
      const transactionRef = doc(collection(db, "transactions"));
      const patientRef = doc(db, "patients", selectedPatient.id);

      const batch = writeBatch(db);

      batch.set(consultationRef, {
        patientId: selectedPatient.id,
        patientName: selectedPatient.name,
        date: serverTimestamp(),
        professionalName,
        professionalId,
        soap: {
          subjective: {
            complaint,
            duration: symptomDuration,
            hma,
            associatedSymptoms,
            pastMedicalHistory,
            familyHistory,
            currentMedications,
            allergies,
            socialHabits: { smoking, smokingDetails, alcohol, exercise, exerciseDetails, sleepQuality, sleepHours, diet },
            painIntensity,
            stressLevel,
          },
          objective: {
            vitalSigns: { bp, hr, rr, spo2, temperature, weight, height, bmi: calculatedBMI, waistCircumference },
            generalCondition,
            physicalExam,
          },
          assessment: { hypotheses, cid10 },
          plan: { conduct },
        },
        procedures,
        status: "Finalizado",
        appointmentId: urlAppointmentId || null,
      });

      batch.update(patientRef, { lastConsultation: serverTimestamp() });

      batch.set(evolutionRef, {
        patientId: selectedPatient.id,
        date: serverTimestamp(),
        type: "Atendimento",
        description: `Consulta. Queixa: ${complaint || "Não informada"}. Hipótese: ${hypotheses || "Não informada"}. Procedimentos: ${procedures.length}.`,
        professionalName,
        professionalId,
      });

      if (amountInCents > 0) {
        batch.set(transactionRef, {
          pacienteId: selectedPatient.id,
          anamneseId: consultationRef.id,
          description: `${categoriaServico} — ${selectedPatient.name}`,
          patientName: selectedPatient.name,
          amount: amountInCents,
          type: "Receita",
          method: "Pendente",
          status: "Pending",
          date: today,
          tipoCliente,
          categoriaServico,
          origem: "anamnese_auto",
          createdAt: serverTimestamp(),
          createdBy: professionalName,
          createdByUid: professionalId,
        });
      }

      await batch.commit();

      await logAction("FINALIZAR_ATENDIMENTO_COMPLETO", selectedPatient.id, {
        paciente: selectedPatient.name,
        anamneseId: consultationRef.id,
        valorFaturadoCentavos: amountInCents,
        categoriaServico,
      });

      toast({ title: "Anamnese Finalizada", description: "Prontuário gravado com sucesso." });

      if (shouldPrescribe) {
        setIsPrescriptionOpen(true);
      } else {
        router.push(`/patients/detail?id=${selectedPatient.id}`);
      }
    } catch (e) {
      console.error("Erro ao salvar anamnese:", e);
      toast({ title: "Erro ao Salvar", description: "Nenhum dado foi gravado. Tente novamente.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Marcador visual de completude por step
  const stepHasData = [
    !!selectedPatient && !!complaint,
    true,
    !!bp || !!hr || !!weight,
    procedures.length > 0,
    true,
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary font-headline">Anamnese Clínica Integrativa</h1>
          <p className="text-muted-foreground">Registro completo SOAP para prontuário eletrônico.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden md:block text-right">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Progresso</p>
            <Progress value={progress} className="w-32 h-2 mt-1" />
          </div>
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-none font-bold py-1">
            Passo {step} de {totalSteps}
          </Badge>
        </div>
      </header>

      {/* Navegação dos passos */}
      <div className="flex items-center gap-1 overflow-x-auto pb-2">
        {STEP_TITLES.map((title, i) => {
          const stepNum = i + 1;
          return (
            <div key={stepNum} className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-default",
              step === stepNum ? "bg-primary text-white shadow-md" :
              stepNum < step ? "bg-emerald-100 text-emerald-700" :
              "bg-slate-100 text-slate-400"
            )}>
              {stepNum < step ? <CheckCircle2 className="h-3 w-3" /> : <span>{stepNum}</span>}
              {title}
            </div>
          );
        })}
      </div>

      <Card className="border-none shadow-2xl overflow-hidden bg-white">
        <Tabs value={`step-${step}`} className="w-full">
          <CardContent className="p-6 md:p-10 min-h-[500px]">

            {/* ════════════════════════════════════════════════════
                PASSO 1 — PACIENTE & QUEIXA PRINCIPAL
            ════════════════════════════════════════════════════ */}
            <TabsContent value="step-1" className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
              <SectionTitle icon={<User className="h-4 w-4" />} title="Identificação do Paciente" />

              {selectedPatient ? (
                <div className="flex items-center justify-between p-4 bg-primary/5 rounded-xl border border-primary/20">
                  <div>
                    <p className="font-bold text-primary">{selectedPatient.name}</p>
                    <p className="text-xs text-muted-foreground">
                      CPF: {selectedPatient.cpf}
                      {selectedPatient.gender && ` · ${selectedPatient.gender}`}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedPatient(null)} className="text-red-500">
                    Trocar
                  </Button>
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar paciente por nome..."
                    className="pl-10 h-12"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  {isSearching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-primary" />}
                  {patients.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white border rounded-xl shadow-xl overflow-hidden">
                      {patients.map(p => (
                        <button key={p.id} onClick={() => { setSelectedPatient(p); setSearchTerm(""); setPatients([]); }}
                          className="w-full text-left p-3 hover:bg-primary/5 border-b last:border-none flex flex-col">
                          <span className="font-bold text-sm">{p.name}</span>
                          <span className="text-[10px] text-muted-foreground">CPF: {p.cpf}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <SectionTitle icon={<ClipboardList className="h-4 w-4" />} title="Queixa Principal & HMA" />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-slate-500">Queixa Principal *</Label>
                  <Textarea
                    placeholder="Descreva a queixa principal do paciente..."
                    className="min-h-[120px] bg-secondary/10 border-none"
                    value={complaint}
                    onChange={(e) => setComplaint(e.target.value)}
                  />
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-slate-500">Tempo de Evolução</Label>
                    <Input
                      placeholder="Ex: 3 dias, 2 semanas, 1 mês..."
                      value={symptomDuration}
                      onChange={(e) => setSymptomDuration(e.target.value)}
                      className="bg-secondary/10 border-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-slate-500">Sintomas Associados</Label>
                    <Input
                      placeholder="Ex: febre, náuseas, tontura..."
                      value={associatedSymptoms}
                      onChange={(e) => setAssociatedSymptoms(e.target.value)}
                      className="bg-secondary/10 border-none"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-slate-500">
                  História da Moléstia Atual (HMA)
                </Label>
                <Textarea
                  placeholder="Detalhe o histórico completo: início, localização, intensidade, fatores de melhora/piora, tratamentos anteriores..."
                  className="min-h-[120px] bg-secondary/10 border-none"
                  value={hma}
                  onChange={(e) => setHma(e.target.value)}
                />
              </div>
            </TabsContent>

            {/* ════════════════════════════════════════════════════
                PASSO 2 — ANTECEDENTES & HÁBITOS
            ════════════════════════════════════════════════════ */}
            <TabsContent value="step-2" className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <SectionTitle icon={<BookOpen className="h-4 w-4" />} title="Antecedentes Pessoais (APP)" />
                  <Textarea
                    placeholder="Doenças prévias (HAS, DM, cardiopatias...), cirurgias, internações, transfusões, vacinas..."
                    className="min-h-[130px] bg-secondary/10 border-none"
                    value={pastMedicalHistory}
                    onChange={(e) => setPastMedicalHistory(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <SectionTitle icon={<Heart className="h-4 w-4" />} title="Antecedentes Familiares (APF)" />
                  <Textarea
                    placeholder="Doenças hereditárias na família: DM, HAS, neoplasias, cardiopatias, AVC..."
                    className="min-h-[130px] bg-secondary/10 border-none"
                    value={familyHistory}
                    onChange={(e) => setFamilyHistory(e.target.value)}
                  />
                </div>
              </div>

              {/* Medicamentos em Uso */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <SectionTitle icon={<Pill className="h-4 w-4" />} title="Medicamentos em Uso" />
                  <Button onClick={addMedication} variant="outline" size="sm" className="border-primary text-primary font-bold h-8">
                    <Plus className="h-3 w-3 mr-1" /> Adicionar
                  </Button>
                </div>
                {currentMedications.length === 0 ? (
                  <div className="text-center py-6 border-2 border-dashed rounded-xl border-slate-200 text-xs text-slate-400">
                    Nenhum medicamento em uso registrado.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {currentMedications.map((med, i) => (
                      <div key={i} className="grid grid-cols-10 gap-2 items-center">
                        <div className="col-span-4">
                          <Input placeholder="Nome do medicamento" value={med.nome} onChange={e => updateMedication(i, "nome", e.target.value)} className="h-9 text-sm" />
                        </div>
                        <div className="col-span-3">
                          <Input placeholder="Dose" value={med.dose} onChange={e => updateMedication(i, "dose", e.target.value)} className="h-9 text-sm" />
                        </div>
                        <div className="col-span-2">
                          <Input placeholder="Frequência" value={med.frequencia} onChange={e => updateMedication(i, "frequencia", e.target.value)} className="h-9 text-sm" />
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => removeMedication(i)} className="h-9 w-9 text-red-400 hover:text-red-600">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Alergias */}
              <div className="space-y-3">
                <SectionTitle icon={<AlertTriangle className="h-4 w-4 text-amber-500" />} title="Alergias" />
                <div className="flex gap-2">
                  <Input
                    placeholder="Digitar alergia e pressionar Enter..."
                    value={allergyInput}
                    onChange={(e) => setAllergyInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addAllergy()}
                    className="bg-amber-50/50 border-amber-200"
                  />
                  <Button onClick={addAllergy} variant="outline" size="sm" className="border-amber-300 text-amber-700 h-10 px-3 flex-shrink-0">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {allergies.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {allergies.map((a, i) => (
                      <Badge key={i} variant="outline" className="bg-amber-50 text-amber-800 border-amber-200 font-bold gap-1 py-1">
                        <AlertTriangle className="h-3 w-3" /> {a}
                        <button onClick={() => setAllergies(prev => prev.filter((_, idx) => idx !== i))} className="ml-1 hover:text-red-600">×</button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Hábitos de Vida */}
              <div className="space-y-4">
                <SectionTitle icon={<Leaf className="h-4 w-4 text-emerald-600" />} title="Hábitos de Vida" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-500">Tabagismo</Label>
                    <Select value={smoking} onValueChange={setSmoking}>
                      <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Não fuma">Não fuma</SelectItem>
                        <SelectItem value="Ex-fumante">Ex-fumante</SelectItem>
                        <SelectItem value="Fumante ativo">Fumante ativo</SelectItem>
                      </SelectContent>
                    </Select>
                    {smoking !== "Não fuma" && (
                      <Input placeholder="Detalhe: ex. 10 cigarros/dia por 5 anos" value={smokingDetails} onChange={e => setSmokingDetails(e.target.value)} className="mt-1 h-9 text-xs" />
                    )}
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-500">Etilismo</Label>
                    <Select value={alcohol} onValueChange={setAlcohol}>
                      <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Não">Não consome</SelectItem>
                        <SelectItem value="Social (esporádico)">Social (esporádico)</SelectItem>
                        <SelectItem value="Moderado (semanal)">Moderado (semanal)</SelectItem>
                        <SelectItem value="Frequente (diário)">Frequente (diário)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-500">Atividade Física</Label>
                    <Select value={exercise} onValueChange={setExercise}>
                      <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Sedentário">Sedentário</SelectItem>
                        <SelectItem value="Leve (1-2x/semana)">Leve (1–2×/semana)</SelectItem>
                        <SelectItem value="Moderado (3-4x/semana)">Moderado (3–4×/semana)</SelectItem>
                        <SelectItem value="Intenso (5+x/semana)">Intenso (5+×/semana)</SelectItem>
                      </SelectContent>
                    </Select>
                    {exercise !== "Sedentário" && (
                      <Input placeholder="Tipo: musculação, caminhada, natação..." value={exerciseDetails} onChange={e => setExerciseDetails(e.target.value)} className="mt-1 h-9 text-xs" />
                    )}
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-500">Qualidade do Sono</Label>
                    <Select value={sleepQuality} onValueChange={setSleepQuality}>
                      <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Boa">Boa</SelectItem>
                        <SelectItem value="Regular">Regular</SelectItem>
                        <SelectItem value="Ruim">Ruim</SelectItem>
                        <SelectItem value="Insônia">Insônia</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="flex items-center gap-2 mt-1">
                      <Input type="number" min="1" max="24" placeholder="Horas/noite" value={sleepHours} onChange={e => setSleepHours(e.target.value)} className="h-9 text-xs w-28" />
                      <span className="text-xs text-slate-400">horas por noite</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-500">Padrão Alimentar</Label>
                  <Input
                    placeholder="Ex: alimentação balanceada, restrição glúten, vegetariano, fast-food frequente..."
                    value={diet}
                    onChange={(e) => setDiet(e.target.value)}
                    className="bg-secondary/10 border-none"
                  />
                </div>
              </div>
            </TabsContent>

            {/* ════════════════════════════════════════════════════
                PASSO 3 — SINAIS VITAIS & EXAME FÍSICO
            ════════════════════════════════════════════════════ */}
            <TabsContent value="step-3" className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
              <SectionTitle icon={<Activity className="h-4 w-4" />} title="Sinais Vitais" />

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <VitalField icon={<Heart className="h-3.5 w-3.5 text-red-500" />} label="PA (mmHg)" placeholder="120/80" value={bp} onChange={setBp} />
                <VitalField icon={<Activity className="h-3.5 w-3.5 text-pink-500" />} label="FC (bpm)" placeholder="75" value={hr} onChange={setHr} type="number" />
                <VitalField icon={<Wind className="h-3.5 w-3.5 text-blue-500" />} label="FR (irpm)" placeholder="16" value={rr} onChange={setRr} type="number" />
                <VitalField icon={<Percent className="h-3.5 w-3.5 text-cyan-500" />} label="SpO₂ (%)" placeholder="98" value={spo2} onChange={setSpo2} type="number" />
                <VitalField icon={<ThermometerSun className="h-3.5 w-3.5 text-orange-500" />} label="Temperatura (°C)" placeholder="36.5" value={temperature} onChange={setTemperature} type="number" step="0.1" />
                <VitalField icon={<Scale className="h-3.5 w-3.5 text-emerald-500" />} label="Peso (kg)" placeholder="70" value={weight} onChange={setWeight} type="number" step="0.1" />
                <VitalField icon={<Ruler className="h-3.5 w-3.5 text-violet-500" />} label="Altura (cm)" placeholder="170" value={height} onChange={setHeight} type="number" />
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
                    <FlaskConical className="h-3.5 w-3.5 text-amber-500" /> IMC
                  </Label>
                  <div className={cn(
                    "h-10 px-3 rounded-md border text-sm font-bold flex items-center",
                    calculatedBMI
                      ? Number(calculatedBMI) < 18.5 ? "bg-blue-50 text-blue-700 border-blue-200"
                        : Number(calculatedBMI) < 25 ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : Number(calculatedBMI) < 30 ? "bg-amber-50 text-amber-700 border-amber-200"
                        : "bg-red-50 text-red-700 border-red-200"
                      : "bg-slate-50 text-slate-400 border-slate-200"
                  )}>
                    {calculatedBMI || "—"}
                    {calculatedBMI && (
                      <span className="text-[10px] ml-2 font-normal">
                        {Number(calculatedBMI) < 18.5 ? "Abaixo" : Number(calculatedBMI) < 25 ? "Ideal" : Number(calculatedBMI) < 30 ? "Sobrepeso" : "Obesidade"}
                      </span>
                    )}
                  </div>
                </div>
                <VitalField icon={<Ruler className="h-3.5 w-3.5 text-rose-500" />} label="Circ. Abdominal (cm)" placeholder="80" value={waistCircumference} onChange={setWaistCircumference} type="number" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label className="text-xs font-bold uppercase text-slate-500">Intensidade da Dor (0–10)</Label>
                    <span className={cn(
                      "text-lg font-bold",
                      painIntensity <= 3 ? "text-emerald-600" : painIntensity <= 6 ? "text-amber-600" : "text-red-600"
                    )}>{painIntensity}</span>
                  </div>
                  <Slider value={[painIntensity]} onValueChange={v => setPainIntensity(v[0])} max={10} step={1}
                    className="[&>span:first-child]:bg-gradient-to-r from-emerald-400 via-amber-400 to-red-500" />
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>Sem dor</span><span>Moderada</span><span>Insuportável</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label className="text-xs font-bold uppercase text-slate-500">Nível de Estresse (0–10)</Label>
                    <span className={cn(
                      "text-lg font-bold",
                      stressLevel <= 3 ? "text-emerald-600" : stressLevel <= 6 ? "text-amber-600" : "text-red-600"
                    )}>{stressLevel}</span>
                  </div>
                  <Slider value={[stressLevel]} onValueChange={v => setStressLevel(v[0])} max={10} step={1} />
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>Tranquilo</span><span>Moderado</span><span>Crítico</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-slate-500">Estado Geral</Label>
                  <Select value={generalCondition} onValueChange={setGeneralCondition}>
                    <SelectTrigger className="h-10 bg-secondary/10 border-none"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Bom estado geral">BEG — Bom estado geral</SelectItem>
                      <SelectItem value="Regular estado geral">REG — Regular estado geral</SelectItem>
                      <SelectItem value="Mal estado geral">MEG — Mal estado geral</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <SectionTitle icon={<Stethoscope className="h-4 w-4" />} title="Exame Físico" />
                <Textarea
                  placeholder="Descreva os achados do exame físico: inspeção, palpação, ausculta, percussão..."
                  className="min-h-[140px] bg-secondary/10 border-none"
                  value={physicalExam}
                  onChange={(e) => setPhysicalExam(e.target.value)}
                />
              </div>
            </TabsContent>

            {/* ════════════════════════════════════════════════════
                PASSO 4 — PROCEDIMENTOS & AVALIAÇÃO CLÍNICA
            ════════════════════════════════════════════════════ */}
            <TabsContent value="step-4" className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
              {/* Procedimentos */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <SectionTitle icon={<Droplets className="h-4 w-4" />} title="Procedimentos Realizados" />
                  <Button onClick={addProcedure} variant="outline" size="sm" className="border-primary text-primary font-bold h-8">
                    <Plus className="h-3 w-3 mr-1" /> Adicionar
                  </Button>
                </div>
                {procedures.map((proc, idx) => (
                  <div key={idx} className="p-5 bg-white rounded-xl border border-slate-100 shadow-sm space-y-3 relative group">
                    <Button variant="ghost" size="icon" onClick={() => removeProcedure(idx)}
                      className="absolute top-2 right-2 text-red-300 hover:text-red-500 opacity-0 group-hover:opacity-100 h-7 w-7">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label className="text-[10px] uppercase font-bold text-slate-400">Tipo de Procedimento</Label>
                        <Input placeholder="Ex: Soroterapia, Ozônio..." value={proc.type}
                          onChange={e => updateProcedure(idx, "type", e.target.value)} />
                      </div>
                      <div className="md:col-span-2 space-y-1">
                        <Label className="text-[10px] uppercase font-bold text-slate-400">Composição / Descrição</Label>
                        <Input placeholder="Ex: Vitamina C 7,5g + Complexo B em 500ml SF 0,9%" value={proc.description}
                          onChange={e => updateProcedure(idx, "description", e.target.value)} />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase font-bold text-slate-400">Observações / Resposta do Paciente</Label>
                      <Input placeholder="Ex: Tolerou bem, sem intercorrências." value={proc.obs}
                        onChange={e => updateProcedure(idx, "obs", e.target.value)} />
                    </div>
                  </div>
                ))}
                {procedures.length === 0 && (
                  <div className="text-center p-6 bg-slate-50 rounded-xl border-dashed border-2 border-slate-200">
                    <p className="text-slate-400 text-sm">Nenhum procedimento adicionado.</p>
                  </div>
                )}
              </div>

              {/* Hipótese Diagnóstica */}
              <div className="space-y-3">
                <SectionTitle icon={<Brain className="h-4 w-4" />} title="Avaliação / Hipótese Diagnóstica" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2 space-y-2">
                    <Label className="text-xs font-bold uppercase text-slate-500">Hipóteses Diagnósticas</Label>
                    <Textarea
                      placeholder="Ex: Fadiga crônica, Síndrome metabólica, Deficiência de Vitamina D..."
                      className="min-h-[100px] bg-secondary/10 border-none"
                      value={hypotheses}
                      onChange={(e) => setHypotheses(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-slate-500">CID-10</Label>
                    <Input
                      placeholder="Ex: Z13, E11.9, F48.0"
                      value={cid10}
                      onChange={(e) => setCid10(e.target.value)}
                      className="bg-secondary/10 border-none"
                    />
                    <p className="text-[10px] text-slate-400">Código principal. Múltiplos separados por vírgula.</p>
                  </div>
                </div>
              </div>

              {/* Conduta / Plano */}
              <div className="space-y-2">
                <SectionTitle icon={<ClipboardList className="h-4 w-4" />} title="Conduta Terapêutica / Plano" />
                <Textarea
                  placeholder="Orientações, encaminhamentos, retorno, exames solicitados, plano alimentar, suplementação prescrita..."
                  className="min-h-[120px] bg-secondary/10 border-none"
                  value={conduct}
                  onChange={(e) => setConduct(e.target.value)}
                />
              </div>
            </TabsContent>

            {/* ════════════════════════════════════════════════════
                PASSO 5 — FATURAMENTO & FINALIZAÇÃO
            ════════════════════════════════════════════════════ */}
            <TabsContent value="step-5" className="space-y-8 animate-in zoom-in-95">
              {/* Resumo */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <SummaryCard label="Paciente" value={selectedPatient?.name || "—"} />
                <SummaryCard label="Queixa Principal" value={complaint || "—"} truncate />
                <SummaryCard label="Hipótese" value={hypotheses || "—"} truncate />
                <SummaryCard label="Procedimentos" value={`${procedures.length} item(s)`} />
              </div>

              {allergies.length > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                  <p className="text-xs font-bold text-amber-800">
                    Alergias registradas: {allergies.join(", ")}
                  </p>
                </div>
              )}

              {/* Faturamento */}
              <div className="p-6 bg-white rounded-xl border border-slate-200 space-y-4">
                <div className="flex items-center gap-2 border-b pb-3">
                  <CircleDollarSign className="h-4 w-4 text-primary" />
                  <h4 className="text-sm font-bold text-primary uppercase tracking-wide">Dados de Faturamento</h4>
                  <span className="text-[10px] text-muted-foreground ml-1">— deixe em branco para não lançar</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase font-bold text-slate-500">Valor da Consulta (R$)</Label>
                    <Input type="number" min="0" step="0.01" placeholder="Ex: 350.00" value={billValue}
                      onChange={e => setBillValue(e.target.value)} className="h-10" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase font-bold text-slate-500">Tipo de Cliente</Label>
                    <Select value={tipoCliente} onValueChange={v => setTipoCliente(v as "PF" | "PJ")}>
                      <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PF">Pessoa Física (PF)</SelectItem>
                        <SelectItem value="PJ">Pessoa Jurídica (PJ)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase font-bold text-slate-500">Categoria do Serviço</Label>
                    <Select value={categoriaServico} onValueChange={setCategoriaServico}>
                      <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Consulta Clínica Integrativa">Consulta Clínica Integrativa</SelectItem>
                        <SelectItem value="Consulta de Retorno">Consulta de Retorno</SelectItem>
                        <SelectItem value="Procedimento Ambulatorial">Procedimento Ambulatorial</SelectItem>
                        <SelectItem value="Aplicação de Protocolo">Aplicação de Protocolo</SelectItem>
                        <SelectItem value="Soroterapia">Soroterapia</SelectItem>
                        <SelectItem value="Teleconsulta">Teleconsulta</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="p-5 bg-amber-50 rounded-xl border border-amber-200 flex gap-3">
                <CheckCircle2 className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-bold text-amber-900">Confirmação de Prontuário</p>
                  <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                    Ao salvar, todos os dados serão gravados de forma permanente e imutável no prontuário eletrônico (LGPD/CFM). O lançamento financeiro será criado como <strong>Pendente</strong> para confirmação no módulo financeiro.
                  </p>
                </div>
              </div>
            </TabsContent>
          </CardContent>

          <CardFooter className="p-6 md:p-10 border-t bg-slate-50 flex flex-col md:flex-row justify-between gap-4">
            <Button variant="outline" onClick={() => setStep(prev => Math.max(1, prev - 1))}
              disabled={step === 1 || isSubmitting}
              className="border-primary/20 text-primary font-bold md:w-auto w-full">
              <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
            </Button>

            {step < totalSteps ? (
              <Button onClick={() => setStep(prev => Math.min(totalSteps, prev + 1))}
                className="bg-primary text-white md:px-12 font-bold shadow-lg md:w-auto w-full">
                Próximo Passo <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
                <Button onClick={() => handleSaveAtendimento(false)} disabled={isSubmitting}
                  className="bg-white border text-primary border-primary hover:bg-slate-50 px-6 font-bold w-full md:w-auto">
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                  Finalizar (Sem Receita)
                </Button>
                <Button onClick={() => handleSaveAtendimento(true)} disabled={isSubmitting}
                  className="bg-accent text-white hover:bg-accent/90 shadow-xl px-8 font-bold text-md w-full md:w-auto">
                  {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Pill className="h-5 w-5 mr-2" />}
                  Salvar e Prescrever
                </Button>
              </div>
            )}
          </CardFooter>
        </Tabs>
      </Card>

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

function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-1">
      <span className="text-primary">{icon}</span>
      <h3 className="text-sm font-bold text-primary uppercase tracking-wide">{title}</h3>
    </div>
  );
}

function VitalField({
  icon, label, placeholder, value, onChange, type = "text", step
}: {
  icon: React.ReactNode; label: string; placeholder: string;
  value: string; onChange: (v: string) => void; type?: string; step?: string;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
        {icon} {label}
      </Label>
      <Input
        type={type}
        step={step}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 bg-secondary/10 border-none text-sm font-medium"
      />
    </div>
  );
}

function SummaryCard({ label, value, truncate }: { label: string; value: string; truncate?: boolean }) {
  return (
    <div className="p-4 bg-secondary/5 rounded-xl border space-y-1">
      <p className="text-[10px] font-bold uppercase text-primary tracking-wide">{label}</p>
      <p className={cn("text-sm font-medium text-slate-700", truncate && "line-clamp-2")}>{value}</p>
    </div>
  );
}
