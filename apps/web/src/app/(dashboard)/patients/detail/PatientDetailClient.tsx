"use client"

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { db, auth } from "@/firebase/config";
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
  Activity
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

export function PatientDetailClient() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const [patient, setPatient] = useState<any>(null);
  const [evolutions, setEvolutions] = useState<Evolution[]>([]);
  const [consultations, setConsultations] = useState<any[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const [newEvolution, setNewEvolution] = useState({ type: "Medicação", description: "" });
  const [evolutionOpen, setEvolutionOpen] = useState(false);

  const [newExam, setNewExam] = useState({ 
    examName: "", date: format(new Date(), "yyyy-MM-dd"), result: "", 
    unit: "", referenceRange: "", status: "normal", notes: "" 
  });
  const [examOpen, setExamOpen] = useState(false);

  // Estados para Dossiê
  const [activeTab, setActiveTab] = useState("history");
  const [addingMed, setAddingMed] = useState(false);
  const [newMed, setNewMed] = useState("");
  const [clinicalNotes, setClinicalNotes] = useState("");
  const [notesSaving, setNotesSaving] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);

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

    const qEvol = query(collection(db, "evolutions"), where("patientId", "==", id));
    const unsubEvol = onSnapshot(qEvol, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Evolution));
      data.sort((a, b) => (b.date?.toMillis?.() || 0) - (a.date?.toMillis?.() || 0));
      setEvolutions(data);
    });

    const qConsult = query(collection(db, "consultations"), where("patientId", "==", id));
    const unsubConsult = onSnapshot(qConsult, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      data.sort((a, b) => (b.date?.toMillis?.() || 0) - (a.date?.toMillis?.() || 0));
      setConsultations(data);
    });

    const qPresc = query(collection(db, "prescriptions"), where("patientId", "==", id));
    const unsubPresc = onSnapshot(qPresc, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Prescription));
      data.sort((a, b) => (b.date?.toMillis?.() || 0) - (a.date?.toMillis?.() || 0));
      setPrescriptions(data);
    });

    const qExams = query(collection(db, "exams"), where("patientId", "==", id));
    const unsubExams = onSnapshot(qExams, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      data.sort((a, b) => (b.date?.toMillis?.() || 0) - (a.date?.toMillis?.() || 0));
      setExams(data);
    });

    if (user) fetchPatient();
    return () => {
      unsubEvol();
      unsubConsult();
      unsubPresc();
      unsubExams();
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
      await logAction("REGISTRO_EVOLUCAO_CLINICA", id, { tipo: newEvolution.type });
      setNewEvolution({ type: "Medicação", description: "" });
      setEvolutionOpen(false);
      toast({ title: "Evolução Registrada" });
    } catch (e) {
      toast({ title: "Erro ao Salvar", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddExam = async () => {
    if (!newExam.examName || !newExam.date || !newExam.result) {
      toast({ title: "Preencha os campos obrigatórios", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, "exams"), {
        patientId: id,
        date: new Date(newExam.date),
        examName: newExam.examName,
        result: newExam.result,
        unit: newExam.unit || "",
        referenceRange: newExam.referenceRange || "",
        status: newExam.status,
        notes: newExam.notes || "",
        uploadedBy: user?.email || "Profissional",
        professionalId: user?.uid,
        createdAt: serverTimestamp()
      });
      await logAction("REGISTRAR_EXAME", id, { exame: newExam.examName });
      setNewExam({
        examName: "", date: format(new Date(), "yyyy-MM-dd"), result: "", 
        unit: "", referenceRange: "", status: "normal", notes: "" 
      });
      setExamOpen(false);
      toast({ title: "Exame Registrado" });
    } catch (e) {
      toast({ title: "Erro ao Salvar Exame", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!patient || patient.notes === clinicalNotes) return;
    setNotesSaving(true);
    try {
      await updateDoc(doc(db, "patients", id), { notes: clinicalNotes });
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
          <Link href={`/anamnesis?patientId=${patient.id}`}>
            <Button className="bg-primary text-white"><Stethoscope className="h-4 w-4 mr-2" /> Atender</Button>
          </Link>
        </div>
      </header>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-2 md:grid-cols-5 bg-white shadow-sm rounded-xl border p-1 h-auto mb-6">
          <TabsTrigger value="history">Histórico</TabsTrigger>
          <TabsTrigger value="exams">Exames</TabsTrigger>
          <TabsTrigger value="evolution">Evolução</TabsTrigger>
          <TabsTrigger value="prescriptions">Receituário</TabsTrigger>
          <TabsTrigger value="summary">Resumo</TabsTrigger>
        </TabsList>

        <TabsContent value="history" className="space-y-6">
          <div className="space-y-4">
            {consultations.length === 0 ? (
              <Card className="py-20 text-center"><ClipboardList className="h-12 w-12 mx-auto mb-4" /><h3>Sem histórico.</h3></Card>
            ) : (
              <Accordion type="multiple" className="space-y-4">
                {consultations.map((consult) => (
                  <AccordionItem key={consult.id} value={consult.id} className="bg-white border rounded-xl overflow-hidden">
                    <AccordionTrigger className="px-6 py-4">
                       <div className="flex justify-between w-full pr-4">
                         <span className="font-bold">{consult.date?.toDate ? format(consult.date.toDate(), "dd/MM/yyyy") : "Data Indefinida"}</span>
                         <Badge className="bg-emerald-100 text-emerald-700">{consult.status}</Badge>
                       </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-6 py-6 border-t bg-slate-50/50">
                       <div className="space-y-4">
                         <h4 className="font-bold uppercase text-xs">SOAP</h4>
                         <p className="text-sm">{consult.soap?.subjective?.complaint}</p>
                       </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </div>
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
           {exams.map(exam => (
             <Card key={exam.id} className="p-4">
               <h4 className="font-bold">{exam.examName}</h4>
               <p className="text-2xl font-bold">{exam.result} {exam.unit}</p>
             </Card>
           ))}
        </TabsContent>

        <TabsContent value="prescriptions" className="space-y-6">
           {prescriptions.map(presc => (
             <Card key={presc.id} className="p-4">
               <h4 className="font-bold">Receita {presc.id.substring(0,4)}</h4>
               <Link href={`/patients/detail?id=${id}&tab=prescriptions&print=${presc.id}`}><Button variant="link">Imprimir</Button></Link>
             </Card>
           ))}
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
    </div>
  );
}
