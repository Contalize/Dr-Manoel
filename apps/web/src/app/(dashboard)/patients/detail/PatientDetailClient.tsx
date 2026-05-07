"use client"

import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { db, auth, storage } from "@/firebase/config";
import { 
  doc, 
  getDoc, 
  collection, 
  onSnapshot, 
  query, 
  where, 
  addDoc, 
  updateDoc,
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
  ChevronRight,
  Database,
  FilePlus,
  UploadCloud,
  ClipboardList,
  FlaskConical,
  Mail,
  Phone,
  Cake,
  Activity,
  Upload,
  Image,
  ExternalLink,
  Trash2
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
import { useAuth } from "@/contexts/AuthContext";
import { logAction } from "@/lib/audit";
import { cn } from "@/lib/utils";
import { NewPrescriptionDialog } from "@/components/prescriptions/NewPrescriptionDialog";
import { PrescriptionPrintView } from "@/components/prescriptions/PrescriptionPrintView";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { useRef } from "react";

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

interface Consultation {
  id: string;
  date: any;
  professionalName: string;
  soap: {
    subjective: { complaint: string; painIntensity: number; stressLevel: number };
    objective: { vitalSigns: { bp: string; hr: string; weight: string }; physicalExam: string };
  };
  procedures: Array<{ type: string; description: string; obs: string }>;
  prescriptions: Array<{ med: string; dose: string; route: string; freq: string; duration: string }>;
  status: string;
}

interface Exam {
  id: string;
  patientId: string;
  fileName: string;
  fileType: string; // 'pdf' | 'image'
  fileSize: number; // em bytes
  storageUrl: string;
  uploadedAt: any; // Firestore Timestamp
  uploadedBy: string;
  description: string;
}

interface Protocol {
  id: string;
  protocolName: string;
  therapies: Array<{ nome: string; posologia: string; categoria: string }>;
  aiExplanation: string;
  createdAt: any;
  createdBy: string;
  status: string;
}

export function PatientDetailClient() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const [patient, setPatient] = useState<any>(null);
  const [evolutions, setEvolutions] = useState<Evolution[]>([]);
  const [consultations, setConsultations] = useState<any[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const [newEvolution, setNewEvolution] = useState({ type: "Medicação", description: "" });
  const [evolutionOpen, setEvolutionOpen] = useState(false);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [examDescription, setExamDescription] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estados para Dossiê
  const [activeTab, setActiveTab] = useState("history");
  const [addingMed, setAddingMed] = useState(false);
  const [newMed, setNewMed] = useState("");
  const [clinicalNotes, setClinicalNotes] = useState("");
  const [notesSaving, setNotesSaving] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);

  // Estado para impressão de receita em PDF
  const [printingPrescription, setPrintingPrescription] = useState<Prescription | null>(null);

  // Estado para receita rápida
  const [quickPrescriptionOpen, setQuickPrescriptionOpen] = useState(false);

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!id) return;

    const fetchPatient = async () => {
      if (!user) return;
      try {
        const docRef = doc(db, "patients", id);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          if (data.professionalId && data.professionalId !== user.uid) {
             setPatient(null);
             return;
          }
          setPatient({ id: snap.id, ...data });
          if (data.notes) setClinicalNotes(data.notes);
        }
      } catch (e) {
        console.error("Erro ao buscar paciente:", e);
      } finally {
        setIsLoading(false);
      }
    };

    const uid = user?.uid || "";

    const qEvol = query(collection(db, "evolutions"), where("patientId", "==", id), where("professionalId", "==", uid));
    const unsubEvol = onSnapshot(qEvol, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Evolution));
      data.sort((a, b) => (b.date?.toMillis?.() || 0) - (a.date?.toMillis?.() || 0));
      setEvolutions(data);
    });

    const qConsult = query(collection(db, "consultations"), where("patientId", "==", id), where("professionalId", "==", uid));
    const unsubConsult = onSnapshot(qConsult, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Consultation));
      data.sort((a, b) => (b.date?.toMillis?.() || 0) - (a.date?.toMillis?.() || 0));
      setConsultations(data);
    });

    const qPresc = query(collection(db, "prescriptions"), where("patientId", "==", id), where("professionalId", "==", uid));
    const unsubPresc = onSnapshot(qPresc, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Prescription));
      data.sort((a, b) => (b.date?.toMillis?.() || 0) - (a.date?.toMillis?.() || 0));
      setPrescriptions(data);
    });

    const qExams = query(collection(db, "exams"), where("patientId", "==", id), where("professionalId", "==", uid));
    const unsubExams = onSnapshot(qExams, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Exam));
      data.sort((a, b) => (b.uploadedAt?.toMillis?.() || 0) - (a.uploadedAt?.toMillis?.() || 0));
      setExams(data);
    });

    const qProtocols = query(collection(db, "protocols"), where("patientId", "==", id), where("professionalId", "==", uid));
    const unsubProtocols = onSnapshot(qProtocols, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Protocol));
      data.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
      setProtocols(data);
    });

    if (user) fetchPatient();
    return () => {
      unsubEvol();
      unsubConsult();
      unsubPresc();
      unsubExams();
      unsubProtocols();
    };
  }, [id, user]);

  const handleAddEvolution = async () => {
    if (!newEvolution.description) return;
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, "evolutions"), {
        patientId: id,
        date: serverTimestamp(),
        type: newEvolution.type,
        description: newEvolution.description,
        professionalName: user?.email || "Profissional",
        professionalId: user?.uid
      });
      await logAction("REGISTRO_EVOLUCAO_CLINICA", id ?? "unknown", { tipo: newEvolution.type });
      setNewEvolution({ type: "Medicação", description: "" });
      setEvolutionOpen(false);
      toast({ title: "Evolução Registrada" });
    } catch (e) {
      toast({ title: "Erro ao Salvar", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!file) return;

    // Validação de tipo
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast({ title: "Tipo de arquivo não permitido", description: "Envie apenas PDF, JPG ou PNG.", variant: "destructive" });
      return;
    }

    // Validação de tamanho (10MB máximo)
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      toast({ title: "Arquivo muito grande", description: "O limite é 10MB por arquivo.", variant: "destructive" });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Storage path organizado por paciente
      const timestamp = Date.now();
      const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `patients/${id}/exams/${timestamp}_${safeFileName}`;
      const storageRef = ref(storage, storagePath);

      const uploadTask = uploadBytesResumable(storageRef, file);

      await new Promise<void>((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
            setUploadProgress(progress);
          },
          (error) => {
            console.error('Upload error:', error);
            reject(error);
          },
          async () => {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);

            // Salvar metadados no Firestore
            await addDoc(collection(db, "exams"), {
              patientId: id,
              patientName: patient?.name || "",
              fileName: file.name,
              fileType: file.type.startsWith('image/') ? 'image' : 'pdf',
              fileSize: file.size,
              storageUrl: downloadURL,
              storagePath,
              description: examDescription || file.name,
              uploadedAt: serverTimestamp(),
              uploadedBy: auth.currentUser?.email || "Profissional",
              professionalId: auth.currentUser?.uid || user?.uid || "",
            });

            await logAction("UPLOAD_EXAME_PACIENTE", id as string, {
              arquivo: file.name,
              tamanho: file.size,
              tipo: file.type
            });

            resolve();
          }
        );
      });

      setExamDescription("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      toast({ title: "Exame enviado com sucesso", description: file.name });

    } catch (error) {
      console.error(error);
      toast({ title: "Erro no upload", description: "Não foi possível enviar o arquivo.", variant: "destructive" });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleSaveNotes = async () => {
    if (!patient || patient.notes === clinicalNotes) return;
    setNotesSaving(true);
    try {
      await updateDoc(doc(db, "patients", id ?? ""), { notes: clinicalNotes });
      setPatient({ ...patient, notes: clinicalNotes });
      setNotesSaved(true);
      setTimeout(() => setNotesSaved(false), 2000);
    } catch(e) {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    } finally {
      setNotesSaving(false);
    }
  };

  if (isLoading) return <div className="flex h-96 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!patient) return <div className="text-center py-20 font-bold text-red-500">Acesso negado.</div>;

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      <header className="flex flex-col md:flex-row md:items-start justify-between gap-6 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 mt-12 md:mt-0 relative overflow-hidden">
        <div className="flex items-start gap-5 relative z-10">
          <div className="bg-[#2D5A27] text-white h-16 w-16 rounded-full flex items-center justify-center text-xl font-bold shadow-md shrink-0">
            {patient.name?.substring(0, 2).toUpperCase()}
          </div>
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold text-primary font-headline leading-none">{patient.name}</h1>
              <Badge className="bg-emerald-100 text-emerald-700">{patient.status || "Ativo"}</Badge>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-medium text-slate-600">
              <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> {patient.chronoAge}a / {patient.bioAge}a</span>
              <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> {patient.phone}</span>
              <span className="flex items-center gap-1.5 font-bold text-primary">
                <Clock className="h-3.5 w-3.5" /> 
                {patient.lastConsultation ? `Última: ${patient.lastConsultation}` : "Nunca"}
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 relative z-10 w-full md:w-auto">
          <Button variant="outline"><Printer className="h-4 w-4 mr-2" /> Imprimir</Button>
          <Button
            variant="outline"
            className="border-accent text-accent hover:bg-accent/10 font-bold"
            onClick={() => setQuickPrescriptionOpen(true)}
          >
            <Pill className="h-4 w-4 mr-2" /> Receita Rápida
          </Button>
          <Link href={`/anamnesis?patientId=${patient.id}&patientName=${encodeURIComponent(patient.name)}`}>
            <Button className="bg-primary text-white"><Stethoscope className="h-4 w-4 mr-2" /> Atender</Button>
          </Link>
        </div>
      </header>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-2 md:grid-cols-7 bg-white shadow-sm rounded-xl border p-1 h-auto mb-6">
          <TabsTrigger value="history"><HistoryIcon className="h-4 w-4 mr-1.5" /> Linha do Tempo</TabsTrigger>
          <TabsTrigger value="consultations">Atendimentos</TabsTrigger>
          <TabsTrigger value="exams">
            <FileText className="h-4 w-4 mr-1.5" /> Exames
          </TabsTrigger>
          <TabsTrigger value="protocols">
            <FlaskConical className="h-4 w-4 mr-1.5" /> Protocolos
          </TabsTrigger>
          <TabsTrigger value="evolution">Evolução</TabsTrigger>
          <TabsTrigger value="prescriptions">Receituário</TabsTrigger>
          <TabsTrigger value="summary">Resumo</TabsTrigger>
        </TabsList>

        <TabsContent value="consultations" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-primary font-headline">Histórico de Atendimentos</h2>
              <p className="text-sm text-muted-foreground">Consultas completas registradas via anamnese SOAP.</p>
            </div>
            <Link href="/anamnesis">
              <Button className="bg-primary text-white hover:bg-primary/90">
                <Plus className="h-4 w-4 mr-2" /> Nova Consulta
              </Button>
            </Link>
          </div>

          {consultations.length === 0 ? (
            <Card className="border-none shadow-md bg-white">
              <CardContent className="py-12 text-center">
                <Stethoscope className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Nenhum atendimento SOAP registrado.</p>
                <Link href="/anamnesis" className="mt-4 inline-block">
                  <Button variant="outline" size="sm">Iniciar Primeiro Atendimento</Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            consultations.map((consult) => (
              <Card key={consult.id} className="border-none shadow-md bg-white">
                <CardHeader className="pb-3 border-b">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-bold text-primary flex items-center gap-2">
                      <Stethoscope className="h-4 w-4" />
                      Consulta — {consult.date?.toDate ? format(consult.date.toDate(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : "..."}
                    </CardTitle>
                    <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">{consult.status}</Badge>
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Prof: {consult.professionalName}</p>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {consult.soap?.subjective?.complaint && (
                      <div>
                        <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-1">Queixa Principal</p>
                        <p className="text-sm text-slate-700">{consult.soap.subjective.complaint}</p>
                        {consult.soap.subjective.duration && (
                          <p className="text-xs text-muted-foreground mt-0.5">Duração: {consult.soap.subjective.duration}</p>
                        )}
                      </div>
                    )}
                    {consult.soap?.assessment?.hypotheses && (
                      <div>
                        <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-1">
                          Hipótese Diagnóstica {consult.soap.assessment.cid10 && <span className="text-muted-foreground normal-case">({consult.soap.assessment.cid10})</span>}
                        </p>
                        <p className="text-sm text-slate-700">{consult.soap.assessment.hypotheses}</p>
                      </div>
                    )}
                  </div>

                  {/* Sinais vitais resumidos */}
                  {consult.soap?.objective?.vitalSigns && (() => {
                    const v = consult.soap.objective.vitalSigns;
                    const items = [
                      v.bp && `PA: ${v.bp}`,
                      v.hr && `FC: ${v.hr}bpm`,
                      v.weight && `Peso: ${v.weight}kg`,
                      v.bmi && `IMC: ${v.bmi}`,
                      v.spo2 && `SpO₂: ${v.spo2}%`,
                    ].filter(Boolean);
                    if (!items.length) return null;
                    return (
                      <div>
                        <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-1">Sinais Vitais</p>
                        <div className="flex flex-wrap gap-2">
                          {items.map((item, i) => (
                            <span key={i} className="text-[10px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-md">{item}</span>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Alergias registradas */}
                  {(consult.soap?.subjective?.allergies?.length ?? 0) > 0 && (
                    <div className="flex flex-wrap gap-1">
                      <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest w-full mb-1">⚠ Alergias</p>
                      {consult.soap.subjective.allergies.map((a: string, i: number) => (
                        <span key={i} className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-md">{a}</span>
                      ))}
                    </div>
                  )}

                  {consult.soap?.plan?.conduct && (
                    <div>
                      <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-1">Conduta</p>
                      <p className="text-xs text-slate-600 line-clamp-2">{consult.soap.plan.conduct}</p>
                    </div>
                  )}

                  {consult.procedures?.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-1">Procedimentos ({consult.procedures.length})</p>
                      <div className="space-y-1">
                        {consult.procedures.map((proc: any, i: number) => (
                          <p key={i} className="text-xs text-slate-600">• <strong>{proc.type}:</strong> {proc.description}</p>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          {(() => {
            type EventType = "consultation" | "prescription" | "evolution" | "exam" | "protocol";
            type TimelineEvent = { id: string; date: any; type: EventType; data: any };

            const events: TimelineEvent[] = [
              ...consultations.map(c => ({ id: c.id, date: c.date, type: "consultation" as const, data: c })),
              ...prescriptions.map(p => ({ id: p.id, date: p.date, type: "prescription" as const, data: p })),
              ...evolutions.map(e => ({ id: e.id, date: e.date, type: "evolution" as const, data: e })),
              ...exams.map(e => ({ id: e.id, date: e.uploadedAt, type: "exam" as const, data: e })),
              ...protocols.map(p => ({ id: p.id, date: p.createdAt, type: "protocol" as const, data: p })),
            ].sort((a, b) => (b.date?.toMillis?.() || 0) - (a.date?.toMillis?.() || 0));

            const META: Record<EventType, { label: string; icon: React.ReactNode; dot: string; border: string }> = {
              consultation: {
                label: "Atendimento SOAP",
                icon: <Stethoscope className="h-4 w-4 text-primary" />,
                dot: "bg-primary",
                border: "border-l-primary",
              },
              prescription: {
                label: "Receita Emitida",
                icon: <Pill className="h-4 w-4 text-accent" />,
                dot: "bg-accent",
                border: "border-l-accent",
              },
              evolution: {
                label: "Evolução Clínica",
                icon: <Activity className="h-4 w-4 text-blue-500" />,
                dot: "bg-blue-500",
                border: "border-l-blue-500",
              },
              exam: {
                label: "Exame / Documento",
                icon: <FileText className="h-4 w-4 text-orange-500" />,
                dot: "bg-orange-500",
                border: "border-l-orange-500",
              },
              protocol: {
                label: "Protocolo Terapêutico",
                icon: <FlaskConical className="h-4 w-4 text-purple-500" />,
                dot: "bg-purple-500",
                border: "border-l-purple-500",
              },
            };

            if (events.length === 0) {
              return (
                <Card className="border-none shadow-md bg-white">
                  <CardContent className="py-16 text-center">
                    <HistoryIcon className="h-12 w-12 text-slate-200 mx-auto mb-3" />
                    <p className="text-sm font-medium text-muted-foreground">Nenhum registro clínico ainda.</p>
                    <p className="text-xs text-muted-foreground mt-1">Consultas, receitas e evoluções aparecem aqui em ordem cronológica.</p>
                  </CardContent>
                </Card>
              );
            }

            return (
              <div className="relative pl-10">
                {/* Linha vertical da timeline */}
                <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-slate-100 rounded-full" />

                <div className="space-y-4">
                  {events.map((event) => {
                    const meta = META[event.type];
                    const dateStr = event.date?.toDate
                      ? format(event.date.toDate(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                      : "Data não registrada";

                    return (
                      <div key={`${event.type}-${event.id}`} className="relative flex items-start gap-4">
                        {/* Dot na linha */}
                        <div className={cn("absolute -left-6 mt-1 h-4 w-4 rounded-full border-2 border-white shadow-sm flex items-center justify-center", meta.dot)} />

                        <Card className={cn("flex-1 border-none shadow-sm bg-white border-l-4", meta.border)}>
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2">
                                {meta.icon}
                                <span className="text-xs font-bold uppercase tracking-wide text-slate-500">{meta.label}</span>
                              </div>
                              <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0">{dateStr}</span>
                            </div>

                            {/* Conteúdo específico por tipo */}
                            {event.type === "consultation" && (
                              <div className="mt-2 space-y-1">
                                {event.data.soap?.subjective?.complaint && (
                                  <p className="text-sm text-slate-700">
                                    <span className="font-bold text-primary">Queixa:</span> {event.data.soap.subjective.complaint}
                                  </p>
                                )}
                                {event.data.procedures?.length > 0 && (
                                  <p className="text-xs text-slate-500">{event.data.procedures.length} procedimento(s) realizado(s)</p>
                                )}
                                <Badge className="bg-emerald-50 text-emerald-700 text-[10px] mt-1">{event.data.status}</Badge>
                              </div>
                            )}

                            {event.type === "prescription" && (
                              <div className="mt-2 space-y-1">
                                {event.data.medications?.slice(0, 3).map((med: any, i: number) => (
                                  <p key={i} className="text-xs text-slate-700">
                                    <Pill className="h-3 w-3 inline mr-1 text-accent" />
                                    {med.nome || med.name || String(med)}
                                  </p>
                                ))}
                                {(event.data.medications?.length || 0) > 3 && (
                                  <p className="text-[10px] text-muted-foreground">+{event.data.medications.length - 3} item(s)</p>
                                )}
                                <button
                                  type="button"
                                  className="text-[10px] text-primary font-bold hover:underline mt-1"
                                  onClick={() => { setActiveTab("prescriptions"); }}
                                >
                                  Ver receita completa →
                                </button>
                              </div>
                            )}

                            {event.type === "evolution" && (
                              <div className="mt-2">
                                <span className="text-[10px] font-bold uppercase text-blue-500 mr-2">{event.data.type}</span>
                                <p className="text-sm text-slate-700 mt-1 line-clamp-2">{event.data.description}</p>
                              </div>
                            )}

                            {event.type === "exam" && (
                              <div className="mt-2 flex items-center justify-between">
                                <div>
                                  <p className="text-sm font-medium text-slate-700">{event.data.fileName}</p>
                                  {event.data.description && (
                                    <p className="text-xs text-muted-foreground">{event.data.description}</p>
                                  )}
                                </div>
                                <a href={event.data.storageUrl} target="_blank" rel="noopener noreferrer">
                                  <Button variant="ghost" size="sm" className="h-7 text-[10px] text-orange-600 hover:bg-orange-50">
                                    <ExternalLink className="h-3 w-3 mr-1" /> Abrir
                                  </Button>
                                </a>
                              </div>
                            )}

                            {event.type === "protocol" && (
                              <div className="mt-2">
                                <p className="text-sm font-bold text-purple-700">{event.data.protocolName}</p>
                                {event.data.therapies?.length > 0 && (
                                  <p className="text-xs text-muted-foreground mt-0.5">{event.data.therapies.length} terapia(s) prescrita(s)</p>
                                )}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </TabsContent>

        <TabsContent value="evolution" className="space-y-6">
           <div className="flex justify-between items-center">
             <h2 className="text-xl font-bold font-headline">Evolução</h2>
             <Button onClick={() => setEvolutionOpen(true)} className="bg-primary text-white">Nova Evolução</Button>
           </div>
           <div className="space-y-4">
             {evolutions.map(evol => (
               <Card key={evol.id} className="p-4 border-l-4 border-l-primary">
                 <div className="flex justify-between font-bold text-sm mb-2">
                   <span>{evol.type}</span>
                   <span>{evol.date?.toDate ? format(evol.date.toDate(), "dd/MM/yyyy HH:mm") : ""}</span>
                 </div>
                 <p className="text-sm">{evol.description}</p>
               </Card>
             ))}
           </div>
        </TabsContent>

        {/* Modal Simples de Evolução */}
        <Dialog open={evolutionOpen} onOpenChange={setEvolutionOpen}>
           <DialogContent>
             <DialogHeader><DialogTitle>Nova Evolução</DialogTitle></DialogHeader>
             <Textarea value={newEvolution.description} onChange={e => setNewEvolution({...newEvolution, description: e.target.value})} />
             <DialogFooter><Button onClick={handleAddEvolution}>Salvar</Button></DialogFooter>
           </DialogContent>
        </Dialog>

        <TabsContent value="exams" className="space-y-6">
          {/* Cabeçalho */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-primary font-headline">Exames & Documentos</h2>
              <p className="text-sm text-muted-foreground">PDFs de laudos, fotos de resultados e documentos clínicos.</p>
            </div>
          </div>

          {/* Área de upload */}
          <Card className="border-none shadow-md bg-white">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-sm font-bold text-primary flex items-center gap-2">
                <Upload className="h-4 w-4" /> Enviar Novo Arquivo
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-slate-400">Descrição do Exame</Label>
                <Input
                  placeholder="Ex: Hemograma completo — Jan/2025"
                  value={examDescription}
                  onChange={(e) => setExamDescription(e.target.value)}
                  className="bg-secondary/20 border-none h-11"
                />
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                }}
              />

              {isUploading ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Enviando...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-primary/20 rounded-xl p-8 text-center hover:border-primary/40 hover:bg-primary/5 transition-all cursor-pointer group"
                >
                  <Upload className="h-8 w-8 text-primary/40 mx-auto mb-2 group-hover:text-primary/60 transition-colors" />
                  <p className="text-sm font-bold text-slate-600">Clique para selecionar o arquivo</p>
                  <p className="text-xs text-muted-foreground mt-1">PDF, JPG ou PNG — máximo 10MB</p>
                </button>
              )}
            </CardContent>
          </Card>

          {/* Listagem de exames */}
          {exams.length === 0 ? (
            <Card className="border-none shadow-md bg-white">
              <CardContent className="py-12 text-center">
                <FileText className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Nenhum exame cadastrado ainda.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {exams.map((exam) => (
                <Card key={exam.id} className="border-none shadow-md bg-white group hover:-translate-y-0.5 transition-all">
                  <CardContent className="p-4 flex items-start gap-3">
                    <div className={cn(
                      "p-3 rounded-xl flex-shrink-0",
                      exam.fileType === 'pdf' ? "bg-red-50 text-red-500" : "bg-blue-50 text-blue-500"
                    )}>
                      {exam.fileType === 'pdf' ? <FileText className="h-5 w-5" /> : <Image className="h-5 w-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-800 truncate">{exam.description}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{exam.fileName}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {exam.uploadedAt?.toDate ? format(exam.uploadedAt.toDate(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : "..."}
                        {" · "}{(exam.fileSize / 1024).toFixed(0)}KB
                      </p>
                    </div>
                    <a
                      href={exam.storageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-shrink-0"
                    >
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:bg-primary/10">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </a>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="prescriptions" className="space-y-6">
          {prescriptions.length === 0 ? (
            <Card className="border-none shadow-md bg-white">
              <CardContent className="py-12 text-center">
                <Pill className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Nenhuma receita emitida ainda.</p>
              </CardContent>
            </Card>
          ) : (
            prescriptions.map(presc => (
              <Card key={presc.id} className="border-none shadow-md bg-white">
                <CardHeader className="pb-3 border-b">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-bold text-primary flex items-center gap-2">
                      <Pill className="h-4 w-4" />
                      Receita #{presc.id.substring(0, 6).toUpperCase()}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground">
                        {presc.date?.toDate ? format(presc.date.toDate(), "dd/MM/yyyy", { locale: ptBR }) : "..."}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-[10px] text-primary hover:bg-primary/10 gap-1.5"
                        onClick={() => setPrintingPrescription(presc)}
                      >
                        <Printer className="h-3 w-3" />
                        PDF
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-3">
                  {presc.medications?.length > 0 ? (
                    <div className="space-y-2">
                      {presc.medications.map((med: any, i: number) => (
                        <div key={i} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                          <Pill className="h-3 w-3 text-accent flex-shrink-0" />
                          <span className="text-xs font-medium text-slate-700">{med.nome || med.name || String(med)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">Sem medicamentos listados.</p>
                  )}
                  {presc.notes && (
                    <p className="text-xs text-slate-500 mt-3 italic border-t pt-2">{presc.notes}</p>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="protocols" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-primary font-headline">Protocolos Integrativos</h2>
              <p className="text-sm text-muted-foreground">Planos terapêuticos criados pelo Planejador IA.</p>
            </div>
            <Link href="/planner">
              <Button className="bg-accent text-white hover:bg-accent/90">
                <Plus className="h-4 w-4 mr-2" /> Novo Protocolo
              </Button>
            </Link>
          </div>

          {protocols.length === 0 ? (
            <Card className="border-none shadow-md bg-white">
              <CardContent className="py-12 text-center">
                <FlaskConical className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Nenhum protocolo criado ainda.</p>
                <Link href="/planner" className="mt-4 inline-block">
                  <Button variant="outline" size="sm">Criar Primeiro Protocolo</Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            protocols.map((proto) => (
              <Card key={proto.id} className="border-none shadow-md bg-white">
                <CardHeader className="pb-3 border-b">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-bold text-primary flex items-center gap-2">
                      <FlaskConical className="h-4 w-4" />
                      {proto.protocolName}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-emerald-100 text-emerald-700 text-[10px] border-none">{proto.status}</Badge>
                      <span className="text-[10px] text-muted-foreground">
                        {proto.createdAt?.toDate ? format(proto.createdAt.toDate(), "dd/MM/yyyy", { locale: ptBR }) : "..."}
                      </span>
                    </div>
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Por: {proto.createdBy}</p>
                </CardHeader>
                <CardContent className="pt-4 space-y-3">
                  {proto.therapies?.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-2">
                        Terapias ({proto.therapies.length})
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {proto.therapies.map((t, i) => (
                          <Badge
                            key={i}
                            variant="outline"
                            className="text-[10px] font-bold border-primary/20 text-primary"
                          >
                            {t.nome} · {t.posologia}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {proto.aiExplanation && (
                    <div className="p-3 bg-accent/5 border border-accent/20 rounded-xl">
                      <p className="text-[10px] font-bold text-accent uppercase tracking-widest mb-1">
                        Racional IA
                      </p>
                      <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
                        {proto.aiExplanation}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="summary" className="space-y-6">
           <Card className="p-6">
             <h3 className="font-bold mb-4">Anotações Clínicas Consolidadas</h3>
             <Textarea 
               value={clinicalNotes} 
               onChange={e => setClinicalNotes(e.target.value)} 
               onBlur={handleSaveNotes}
               className="min-h-[200px]"
             />
             {notesSaved && <span className="text-emerald-600 text-xs">Salvo!</span>}
           </Card>
        </TabsContent>
      </Tabs>

      {/* Receita em PDF — impressão nativa do browser */}
      {printingPrescription && patient && (
        <PrescriptionPrintView
          isOpen={!!printingPrescription}
          onClose={() => setPrintingPrescription(null)}
          patientName={patient.name}
          patientCpf={patient.cpf}
          medications={printingPrescription.medications || []}
          notes={printingPrescription.notes}
          professionalName={auth.currentUser?.email?.split('@')[0] || "Dr. Manoel"}
          professionalCrf="CRF/SP 000000"
          clinicName="Dr. Manoel — Farmácia Integrativa"
          prescriptionDate={printingPrescription.date?.toDate?.() || new Date()}
        />
      )}

      {/* Receita Rápida — acessível diretamente da ficha, sem passar pela anamnese */}
      <NewPrescriptionDialog
        isOpen={quickPrescriptionOpen}
        onClose={() => setQuickPrescriptionOpen(false)}
        initialPatientId={patient.id}
        initialPatientName={patient.name}
      />
    </div>
  );
}
