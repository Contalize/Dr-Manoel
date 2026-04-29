"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useFieldArray } from "react-hook-form"
import * as z from "zod"
import { Check, ChevronsUpDown, Loader2, Plus, Trash2, Pill, Save, Search, UserCheck, Beaker } from "lucide-react"
import { db } from "@/firebase/config"
import { collection, addDoc, serverTimestamp, getDocs, query, where } from "firebase/firestore"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { logAction } from "@/lib/audit"
import { useClinic } from "@/contexts/ClinicContext"
import { useAuth } from "@/contexts/AuthContext"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"

const ADMINISTRATION_ROUTES = [
  { value: "VO", label: "Via Oral (VO)" },
  { value: "SL", label: "Via Sublingual (SL)" },
  { value: "IV", label: "Via Intravenosa / EV" },
  { value: "IM", label: "Via Intramuscular (IM)" },
  { value: "SC", label: "Via Subcutânea (SC)" },
  { value: "VR", label: "Via Retal (VR)" },
  { value: "TOP", label: "Via Tópica (Local)" },
  { value: "INALA", label: "Via Inalatória" },
  { value: "VAG", label: "Via Vaginal" },
  { value: "OFT", label: "Via Oftálmica" },
  { value: "OTO", label: "Via Otológica" },
];

const medicationSchema = z.object({
  tipo: z.enum(["industrial", "manipulada"]).default("industrial"),
  nome: z.string().optional(),
  composicao: z.string().optional(),
  posologia: z.string().min(1, "A posologia é obrigatória"),
  via: z.string().min(1, "A via é obrigatória"),
  orientacoes: z.string().optional(),
})

const prescriptionFormSchema = z.object({
  patientId: z.string({ required_error: "Selecione um paciente." }),
  professionalId: z.string({ required_error: "Selecione o prescritor." }),
  notes: z.string().optional(),
  medications: z.array(medicationSchema).min(1, "Adicione pelo menos um medicamento"),
})

type PrescriptionFormValues = z.infer<typeof prescriptionFormSchema>

interface Patient { id: string; name: string; cpf: string }

interface NewPrescriptionDialogProps {
  initialPatientId?: string
  initialPatientName?: string
  trigger?: React.ReactNode
  isOpen?: boolean
  onClose?: () => void
}

const FAKE_API_MEDS = [
  { id: "1", nome_comercial: "Ivermectina", principio_ativo: "Ivermectina", concentracao: "6mg", categoria: "Antiparasitário" },
  { id: "2", nome_comercial: "Amoxicilina", principio_ativo: "Amoxicilina", concentracao: "500mg", categoria: "Antibiótico" },
  { id: "3", nome_comercial: "Amoxicilina + Clavulanato", principio_ativo: "Amoxicilina/Clavulanato", concentracao: "875mg/125mg", categoria: "Antibiótico" },
  { id: "4", nome_comercial: "Dipirona", principio_ativo: "Dipirona Sódica", concentracao: "500mg", categoria: "Analgésico" },
  { id: "5", nome_comercial: "Glifage XR", principio_ativo: "Cloridrato de Metformina", concentracao: "500mg", categoria: "Antidiabético" },
  { id: "6", nome_comercial: "Vitamina D3", principio_ativo: "Colecalciferol", concentracao: "10.000 UI", categoria: "Suplemento" },
  { id: "7", nome_comercial: "Complexo B", principio_ativo: "Vitaminas B1, B2, B6, B12", concentracao: "Variada", categoria: "Suplemento" },
  { id: "8", nome_comercial: "Atenolol", principio_ativo: "Atenolol", concentracao: "50mg", categoria: "Anti-hipertensivo" },
  { id: "9", nome_comercial: "Ozempic", principio_ativo: "Semaglutida", concentracao: "1mg", categoria: "Antidiabético" },
]

export function NewPrescriptionDialog({ initialPatientId, initialPatientName, trigger, isOpen, onClose }: NewPrescriptionDialogProps) {
  const [open, setOpen] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [patients, setPatients] = React.useState<Patient[]>([])
  const [isSearchingPatients, setIsSearchingPatients] = React.useState(false)
  const [openMedicationIndex, setOpenMedicationIndex] = React.useState<number | null>(null)
  
  const [apiSearchTerm, setApiSearchTerm] = React.useState("")
  const [apiResults, setApiResults] = React.useState<typeof FAKE_API_MEDS>([])
  const [isSearchingMeds, setIsSearchingMeds] = React.useState(false)

  const { toast } = useToast()
  const { professionals } = useClinic()
  const { user } = useAuth()

  const isControlled = isOpen !== undefined;
  const currentOpen = isControlled ? isOpen : open;

  const form = useForm<PrescriptionFormValues>({
    resolver: zodResolver(prescriptionFormSchema),
    defaultValues: {
      patientId: initialPatientId || "",
      professionalId: "",
      notes: "",
      medications: [{ tipo: "industrial", nome: "", composicao: "", posologia: "", via: "VO", orientacoes: "" }],
    },
  })

  React.useEffect(() => {
    if (initialPatientId && currentOpen) {
      form.setValue("patientId", initialPatientId);
    }
  }, [initialPatientId, currentOpen, form]);

  // Auto-seleciona o profissional logado
  React.useEffect(() => {
    if (currentOpen && professionals.length > 0 && user?.uid) {
      const myProf = professionals.find(p => p.id === user.uid);
      if (myProf && !form.getValues("professionalId")) {
        form.setValue("professionalId", myProf.id);
      }
    }
  }, [currentOpen, professionals, user?.uid, form]);

  const { fields, append, remove } = useFieldArray({
    name: "medications",
    control: form.control,
  })

  React.useEffect(() => {
    const fetchPatients = async () => {
      if (!user?.uid) return;
      setIsSearchingPatients(true)
      try {
        const q = query(
          collection(db, "patients"),
          where("professionalId", "==", user.uid),
          where("status", "==", "active")
        )
        const querySnapshot = await getDocs(q)
        setPatients(querySnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name, cpf: doc.data().cpf })))
      } catch (error) {
      } finally {
        setIsSearchingPatients(false)
      }
    }
    if (currentOpen && patients.length === 0) fetchPatients()
  }, [currentOpen, patients.length, user?.uid])

  // Fake API debounce
  React.useEffect(() => {
    const searchMeds = async () => {
      if (!apiSearchTerm) { setApiResults([]); return; }
      setIsSearchingMeds(true)
      await new Promise(r => setTimeout(r, 600)) 
      const term = apiSearchTerm.toLowerCase()
      setApiResults(FAKE_API_MEDS.filter(m => m.nome_comercial.toLowerCase().includes(term) || m.principio_ativo.toLowerCase().includes(term)))
      setIsSearchingMeds(false)
    }
    const timer = setTimeout(searchMeds, 300)
    return () => clearTimeout(timer)
  }, [apiSearchTerm])

  async function onSubmit(values: PrescriptionFormValues) {
    setIsSubmitting(true)
    try {
      const selectedPatient = patients.find(p => p.id === values.patientId)
      const patientName = initialPatientName || selectedPatient?.name || "Desconhecido"
      const selectedProf = professionals.find(p => p.id === values.professionalId)

      await addDoc(collection(db, "prescriptions"), {
        patientId: values.patientId,
        patientName,
        professionalId: values.professionalId,
        professionalName: selectedProf?.name || "Desconhecido",
        date: serverTimestamp(),
        medications: values.medications,
        notes: values.notes || "",
      })

      await logAction("EMISSAO_RECEITUARIO", values.patientId, { paciente: patientName, itens: values.medications.length })

      toast({ title: "Receita Emitida", description: "O receituário foi arquivado com sucesso." })
      form.reset()
      if (isControlled && onClose) onClose()
      else setOpen(false)
    } catch (error) {
      toast({ variant: "destructive", title: "Erro na Gravação", description: "Falha ao gravar receituário." })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOpenChange = (o: boolean) => {
    if (isControlled && onClose && !o) onClose()
    else if (!isControlled) setOpen(o)
  }

  return (
    <Dialog open={currentOpen} onOpenChange={handleOpenChange}>
      {!isControlled && (
        <DialogTrigger asChild>
          {trigger || <Button className="bg-accent text-white hover:bg-accent/90 shadow-lg"><Plus className="h-4 w-4 mr-2" /> Novo Receituário</Button>}
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[750px] max-h-[90vh] overflow-y-auto border-none shadow-2xl p-0">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-0">
            <DialogHeader className="p-6 bg-slate-50 border-b">
              <div className="flex items-center gap-3">
                <div className="bg-primary p-2 rounded-xl text-white">
                  <Pill className="h-6 w-6" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-headline text-primary">Prescrição Farmacêutica</DialogTitle>
                  <DialogDescription>Módulo Integrado para Fórmulas e Industrializados.</DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="p-6 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-primary/5 p-4 rounded-xl border border-primary/10">
                  <FormField
                    control={form.control}
                    name="patientId"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel className="text-[10px] uppercase font-bold text-primary mb-2">Paciente Selecionado</FormLabel>
                        {initialPatientId ? (
                          <div className="p-3 bg-white rounded-lg border border-primary/20 flex items-center justify-between h-11">
                            <span className="text-sm font-bold text-slate-900">{initialPatientName || "..."}</span>
                            <UserCheck className="h-4 w-4 text-primary" />
                          </div>
                        ) : (
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button variant="outline" role="combobox" className={cn("w-full justify-between h-11 bg-white border-primary/20", !field.value && "text-muted-foreground")}>
                                  {field.value ? patients.find((p) => p.id === field.value)?.name : "Buscar base..."}
                                  <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="p-0 shadow-2xl border-none">
                              <Command>
                                <CommandInput placeholder="Nome..." className="h-12" />
                                <CommandList>
                                  <CommandEmpty>{isSearchingPatients ? "Lendo..." : "Não localizado."}</CommandEmpty>
                                  <CommandGroup>
                                    {patients.map((p) => (
                                      <CommandItem key={p.id} value={p.name} onSelect={() => form.setValue("patientId", p.id)} className="p-3">
                                        <Check className={cn("mr-2 h-4 w-4 text-primary", p.id === field.value ? "opacity-100" : "opacity-0")} />
                                        <span>{p.name}</span>
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="bg-accent/5 p-4 rounded-xl border border-accent/10">
                  <FormField
                    control={form.control}
                    name="professionalId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] uppercase font-bold text-accent mb-2">Prescritor Responsável</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-11 bg-white border-accent/20">
                              <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {professionals.map((prof) => (
                              <SelectItem key={prof.id} value={prof.id} className="text-xs">{prof.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between border-b pb-2">
                  <h4 className="text-xs font-bold uppercase flex items-center gap-2"><Pill className="h-4 w-4" /> Composição</h4>
                  <Button type="button" variant="ghost" size="sm" onClick={() => append({ tipo: "industrial", nome: "", composicao: "", posologia: "", via: "VO", orientacoes: "" })} className="text-primary h-8 border border-primary/20 bg-primary/5 hover:bg-primary/20 font-bold transition-all">
                    <Plus className="h-4 w-4 mr-1" /> Adicionar Ativo
                  </Button>
                </div>

                {fields.map((field, index) => (
                  <div key={field.id} className="p-6 border rounded-2xl bg-white shadow-sm space-y-5 relative">
                    {fields.length > 1 && (
                      <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="absolute top-4 right-4 text-slate-300 hover:text-red-500">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}

                    <Tabs 
                      value={form.watch(`medications.${index}.tipo`)} 
                      onValueChange={(val) => {
                        form.setValue(`medications.${index}.tipo`, val as "industrial" | "manipulada");
                        if (val === "manipulada") form.setValue(`medications.${index}.nome`, "Fórmula Magistral/Manipulada");
                        else form.setValue(`medications.${index}.nome`, "");
                      }}
                    >
                      <TabsList className="grid w-full sm:w-[350px] grid-cols-2 mb-4 h-10 bg-slate-100">
                        <TabsTrigger value="industrial" className="text-xs font-bold"><Pill className="h-3 w-3 mr-1"/>Industrializado</TabsTrigger>
                        <TabsTrigger value="manipulada" className="text-xs font-bold"><Beaker className="h-3 w-3 mr-1"/>Ofticinal / Manipulado</TabsTrigger>
                      </TabsList>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-2">
                          <TabsContent value="industrial" className="mt-0">
                            <FormField
                              control={form.control}
                              name={`medications.${index}.nome`}
                              render={({ field }) => (
                                <FormItem className="flex flex-col">
                                  <FormLabel className="text-[10px] uppercase font-bold text-slate-500">Busca API (Open) / Industrializado</FormLabel>
                                  <Popover open={openMedicationIndex === index} onOpenChange={(o) => { setOpenMedicationIndex(o ? index : null); if(!o) setApiSearchTerm(""); }}>
                                    <PopoverTrigger asChild>
                                      <FormControl>
                                        <Button variant="outline" role="combobox" className="w-full justify-between h-10 bg-secondary/5">
                                          <span className="truncate flex-1 text-left">{field.value || "Buscar na base API..."}</span>
                                          <Search className="ml-2 h-3.5 w-3.5 opacity-50 shrink-0" />
                                        </Button>
                                      </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[350px] sm:w-[450px] p-0 shadow-2xl">
                                      <Command shouldFilter={false}>
                                        <CommandInput placeholder="Digite nome comercial ou princípio ativo..." value={apiSearchTerm} onValueChange={setApiSearchTerm} />
                                        <CommandList>
                                          {isSearchingMeds ? (
                                            <div className="p-4 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                                              <Loader2 className="h-3 w-3 animate-spin"/> Conectando serviço Rx...
                                            </div>
                                          ) : (
                                            <>
                                              {apiResults.length === 0 && apiSearchTerm && (
                                                <div className="p-4 text-center">
                                                  <p className="text-xs text-muted-foreground mb-3">Ausente na API.</p>
                                                  <Button type="button" size="sm" className="w-full text-[10px] bg-amber-100 text-amber-800 font-bold hover:bg-amber-200" onClick={() => { form.setValue(`medications.${index}.nome`, apiSearchTerm); setOpenMedicationIndex(null); }}>
                                                    USAR TEXTO: "{apiSearchTerm}"
                                                  </Button>
                                                </div>
                                              )}
                                              <CommandGroup>
                                                {apiResults.map((med) => (
                                                  <CommandItem key={med.id} value={med.nome_comercial} onSelect={() => { form.setValue(`medications.${index}.nome`, `${med.nome_comercial} (${med.principio_ativo})`); setOpenMedicationIndex(null); }}>
                                                    <span className="font-bold text-primary mr-2 truncate">{med.nome_comercial}</span> 
                                                    <span className="text-[10px] italic text-muted-foreground whitespace-nowrap">{med.concentracao}</span>
                                                  </CommandItem>
                                                ))}
                                              </CommandGroup>
                                            </>
                                          )}
                                        </CommandList>
                                      </Command>
                                    </PopoverContent>
                                  </Popover>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </TabsContent>
                          
                          <TabsContent value="manipulada" className="mt-0">
                            <FormField
                              control={form.control}
                              name={`medications.${index}.composicao`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-[10px] uppercase font-bold text-emerald-600">Composição Magistral Completa</FormLabel>
                                  <FormControl>
                                    <Textarea placeholder="Ex: Metionina 100mg&#10;Inositol 50mg&#10;QSP 1 Cápsula Vegetal" className="bg-emerald-50/50 border-emerald-200 min-h-[90px] text-sm" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </TabsContent>
                        </div>
                        
                        <div>
                          <FormField
                            control={form.control}
                            name={`medications.${index}.via`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-[10px] uppercase font-bold text-slate-500">Via de Administração</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger className="h-10 bg-secondary/5 border font-bold">
                                      <SelectValue placeholder="Via..." />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {ADMINISTRATION_ROUTES.map((route) => (
                                      <SelectItem key={route.value} value={route.value} className="text-xs">{route.label}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    </Tabs>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4 border-slate-100">
                      <FormField
                        control={form.control}
                        name={`medications.${index}.posologia`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] uppercase font-bold text-slate-500">Posologia / Frequência</FormLabel>
                            <FormControl><Input placeholder="Ex: Ingerir 1 vez ao dia" className="h-10 bg-white" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`medications.${index}.orientacoes`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] uppercase font-bold text-slate-500">Observações de Uso</FormLabel>
                            <FormControl><Input placeholder="Ex: Tomar após o almoço para absorção" className="h-10 bg-white" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-bold text-primary">Diretrizes Complementares / Dieta</FormLabel>
                    <FormControl><Input placeholder="Dicas gerais não-farmacológicas..." className="h-12 bg-white" {...field} /></FormControl>
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter className="p-6 bg-slate-50 border-t sticky bottom-0 z-20">
              <Button type="submit" className="w-full bg-primary text-white h-14 font-bold text-lg hover:bg-primary/90" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="h-6 w-6 animate-spin mr-2" /> : <Save className="h-6 w-6 mr-2" />} Finalizar Receita
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
