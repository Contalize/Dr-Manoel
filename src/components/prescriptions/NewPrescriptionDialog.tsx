
"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useFieldArray } from "react-hook-form"
import * as z from "zod"
import { Check, ChevronsUpDown, Loader2, Plus, Trash2, Pill, Save, Search, Info, UserCheck, AlertCircle } from "lucide-react"
import { db, auth } from "@/firebase/config"
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
  FormDescription,
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
import { useToast } from "@/hooks/use-toast"
import { logAction } from "@/lib/audit"
import { useClinic } from "@/contexts/ClinicContext"
import { BASE_MEDICAMENTOS } from "@/data/medicamentos"

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
  nome: z.string().min(1, "O nome do medicamento é obrigatório"),
  posologia: z.string().min(1, "A posologia é obrigatória"),
  via: z.string().min(1, "A via é obrigatória"),
  orientacoes: z.string().optional(),
})

const prescriptionFormSchema = z.object({
  patientId: z.string({
    required_error: "Selecione um paciente.",
  }),
  professionalId: z.string({
    required_error: "Selecione o profissional responsável.",
  }),
  notes: z.string().optional(),
  medications: z.array(medicationSchema).min(1, "Adicione pelo menos um medicamento"),
})

type PrescriptionFormValues = z.infer<typeof prescriptionFormSchema>

interface Patient {
  id: string
  name: string
  cpf: string
}

interface NewPrescriptionDialogProps {
  initialPatientId?: string
  initialPatientName?: string
  trigger?: React.ReactNode
}

export function NewPrescriptionDialog({ initialPatientId, initialPatientName, trigger }: NewPrescriptionDialogProps) {
  const [open, setOpen] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [patients, setPatients] = React.useState<Patient[]>([])
  const [isSearchingPatients, setIsSearchingPatients] = React.useState(false)
  const [openMedicationIndex, setOpenMedicationIndex] = React.useState<number | null>(null)
  const [searchValue, setSearchValue] = React.useState("")
  
  const { toast } = useToast()
  const { professionals } = useClinic()

  const form = useForm<PrescriptionFormValues>({
    resolver: zodResolver(prescriptionFormSchema),
    defaultValues: {
      patientId: initialPatientId || "",
      professionalId: "",
      notes: "",
      medications: [{ nome: "", posologia: "", via: "VO", orientacoes: "" }],
    },
  })

  const { fields, append, remove } = useFieldArray({
    name: "medications",
    control: form.control,
  })

  React.useEffect(() => {
    const fetchPatients = async () => {
      setIsSearchingPatients(true)
      try {
        const q = query(collection(db, "patients"), where("status", "==", "active"))
        const querySnapshot = await getDocs(q)
        const patientData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name,
          cpf: doc.data().cpf,
        }))
        setPatients(patientData)
      } catch (error) {
        console.error("Erro ao carregar pacientes:", error)
      } finally {
        setIsSearchingPatients(false)
      }
    }

    if (open && !initialPatientId) {
      fetchPatients()
    }
  }, [open, initialPatientId])

  async function onSubmit(values: PrescriptionFormValues) {
    setIsSubmitting(true)
    try {
      const selectedPatient = patients.find(p => p.id === values.patientId)
      const patientName = initialPatientName || selectedPatient?.name || "Desconhecido"
      const selectedProf = professionals.find(p => p.id === values.professionalId)

      if (!auth.currentUser?.uid) {
        throw new Error("Usuário não autenticado. Ação negada.");
      }

      await addDoc(collection(db, "prescriptions"), {
        userId: auth.currentUser.uid, // Security Enhancement: LGPD Compliance row-level access
        patientId: values.patientId,
        patientName,
        professionalId: values.professionalId,
        professionalName: selectedProf?.name || "Desconhecido",
        professionalRegistration: selectedProf?.registration || "",
        date: serverTimestamp(),
        medications: values.medications,
        notes: values.notes || "",
      })

      await logAction("EMISSAO_RECEITUARIO", values.patientId, { 
        paciente: patientName,
        profissional: selectedProf?.name,
        itens: values.medications.length 
      })

      toast({
        title: "Receita Emitida",
        description: `O receituário para ${patientName} foi arquivado com sucesso.`,
      })
      
      form.reset({
        patientId: initialPatientId || "",
        professionalId: "",
        notes: "",
        medications: [{ nome: "", posologia: "", via: "VO", orientacoes: "" }],
      })
      setOpen(false)
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro na Gravação",
        description: "Não foi possível sincronizar o receituário.",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="bg-accent text-white hover:bg-accent/90 font-bold shadow-lg">
            <Plus className="h-4 w-4 mr-2" /> Novo Receituário
          </Button>
        )}
      </DialogTrigger>
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
                  <DialogDescription>Emissão em conformidade com RDC/ANVISA e Farmacopeia.</DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="p-6 space-y-8">
              {/* Identificação Técnica */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-primary/5 p-4 rounded-xl border border-primary/10">
                  <FormField
                    control={form.control}
                    name="patientId"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-primary mb-2">Paciente Selecionado</FormLabel>
                        {initialPatientId ? (
                          <div className="p-3 bg-white rounded-lg border border-primary/20 flex items-center justify-between h-11">
                            <span className="text-sm font-bold text-slate-900">{initialPatientName}</span>
                            <UserCheck className="h-4 w-4 text-primary" />
                          </div>
                        ) : (
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  className={cn(
                                    "w-full justify-between h-11 bg-white border-primary/20 text-sm font-medium",
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  {field.value
                                    ? patients.find((p) => p.id === field.value)?.name
                                    : "Buscar paciente na base..."}
                                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 shadow-2xl border-none">
                              <Command>
                                <CommandInput placeholder="Nome ou CPF..." className="h-12" />
                                <CommandList>
                                  <CommandEmpty>{isSearchingPatients ? "Lendo banco de dados..." : "Nenhum paciente localizado."}</CommandEmpty>
                                  <CommandGroup>
                                    {patients.map((p) => (
                                      <CommandItem
                                        value={p.name}
                                        key={p.id}
                                        onSelect={() => form.setValue("patientId", p.id)}
                                        className="p-3 cursor-pointer"
                                      >
                                        <Check className={cn("mr-2 h-4 w-4 text-primary", p.id === field.value ? "opacity-100" : "opacity-0")} />
                                        <div className="flex flex-col">
                                          <span className="font-bold text-sm">{p.name}</span>
                                          <span className="text-[10px] text-muted-foreground uppercase">CPF: {p.cpf}</span>
                                        </div>
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
                        <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-accent mb-2">Prescritor Responsável</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-11 bg-white border-accent/20 font-medium">
                              <SelectValue placeholder="Selecione o profissional..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {professionals.map((prof) => (
                              <SelectItem key={prof.id} value={prof.id} className="text-xs">
                                {prof.name} ({prof.registration})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Lista Dinâmica de Itens */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b pb-2">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Pill className="h-4 w-4" /> Composição do Receituário
                  </h4>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => append({ nome: "", posologia: "", via: "VO", orientacoes: "" })}
                    className="text-xs font-bold text-primary hover:bg-primary/5 h-8"
                  >
                    <Plus className="h-4 w-4 mr-1" /> Adicionar Ativo
                  </Button>
                </div>

                {fields.map((field, index) => (
                  <div key={field.id} className="p-5 border rounded-2xl bg-white shadow-sm space-y-4 relative group hover:border-primary/40 transition-all">
                    {fields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => remove(index)}
                        className="absolute top-2 right-2 h-7 w-7 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* MEDICAMENTO (COMBOBOX) */}
                      <FormField
                        control={form.control}
                        name={`medications.${index}.nome`}
                        render={({ field }) => (
                          <FormItem className="flex flex-col md:col-span-2">
                            <FormLabel className="text-[10px] uppercase font-bold text-slate-500 mb-1">Medicamento / Princípio Ativo</FormLabel>
                            <Popover 
                              open={openMedicationIndex === index} 
                              onOpenChange={(isOpen) => {
                                setOpenMedicationIndex(isOpen ? index : null);
                                if (!isOpen) setSearchValue("");
                              }}
                            >
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant="outline"
                                    role="combobox"
                                    className={cn(
                                      "w-full justify-between h-10 bg-secondary/10 border-none font-bold text-slate-900 px-4",
                                      !field.value && "text-muted-foreground font-normal"
                                    )}
                                  >
                                    <span className="truncate">{field.value || "Buscar na base PharmaZen..."}</span>
                                    <Search className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-[400px] p-0 shadow-2xl border-none">
                                <Command shouldFilter={false}>
                                  <CommandInput 
                                    placeholder="Nome ou Princípio Ativo..." 
                                    className="h-11"
                                    value={searchValue}
                                    onValueChange={setSearchValue}
                                  />
                                  <CommandList>
                                    {searchValue.length > 0 && !BASE_MEDICAMENTOS.some(m => 
                                      m.nome_comercial.toLowerCase().includes(searchValue.toLowerCase()) || 
                                      m.principio_ativo.toLowerCase().includes(searchValue.toLowerCase())
                                    ) && (
                                      <div className="p-4 text-center border-b">
                                        <p className="text-xs text-muted-foreground mb-3 flex items-center justify-center gap-2">
                                          <AlertCircle className="h-3 w-3" /> Não localizado na base oficial.
                                        </p>
                                        <Button 
                                          type="button" 
                                          size="sm" 
                                          className="w-full text-[10px] h-8 bg-amber-100 text-amber-800 hover:bg-amber-200 border-none font-bold"
                                          onClick={() => {
                                            form.setValue(`medications.${index}.nome`, searchValue);
                                            setOpenMedicationIndex(null);
                                          }}
                                        >
                                          USAR VALOR CUSTOMIZADO: "{searchValue}"
                                        </Button>
                                      </div>
                                    )}
                                    <CommandGroup heading="Sugestões Clínicas">
                                      {BASE_MEDICAMENTOS
                                        .filter(m => 
                                          searchValue === "" ||
                                          m.nome_comercial.toLowerCase().includes(searchValue.toLowerCase()) || 
                                          m.principio_ativo.toLowerCase().includes(searchValue.toLowerCase())
                                        )
                                        .slice(0, 10)
                                        .map((med) => (
                                          <CommandItem
                                            key={med.id}
                                            value={med.nome_comercial}
                                            onSelect={() => {
                                              form.setValue(`medications.${index}.nome`, `${med.nome_comercial} (${med.principio_ativo})`);
                                              setOpenMedicationIndex(null);
                                            }}
                                            className="p-3 cursor-pointer"
                                          >
                                            <div className="flex flex-col">
                                              <span className="font-bold text-sm text-primary">{med.nome_comercial}</span>
                                              <span className="text-[10px] text-muted-foreground italic">{med.principio_ativo} • {med.concentracao}</span>
                                            </div>
                                          </CommandItem>
                                        ))}
                                    </CommandGroup>
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* VIA */}
                      <FormField
                        control={form.control}
                        name={`medications.${index}.via`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] uppercase font-bold text-slate-500 mb-1">Via</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger className="h-10 bg-secondary/10 border-none font-bold">
                                  <SelectValue placeholder="Via..." />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {ADMINISTRATION_ROUTES.map((route) => (
                                  <SelectItem key={route.value} value={route.value} className="text-xs">
                                    {route.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name={`medications.${index}.posologia`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] uppercase font-bold text-slate-500">Posologia / Frequência</FormLabel>
                            <FormControl>
                              <Input placeholder="Ex: Tomar 1 cápsula de 8/8h" className="h-10 bg-secondary/10 border-none text-xs font-medium" {...field} />
                            </FormControl>
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
                            <FormControl>
                              <Input placeholder="Ex: Após o almoço" className="h-10 bg-secondary/10 border-none text-xs font-medium" {...field} />
                            </FormControl>
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
                    <FormLabel className="text-sm font-bold text-primary">Recomendações de Estilo de Vida & Dieta</FormLabel>
                    <FormControl>
                      <Input placeholder="Dicas gerais para o sucesso do tratamento integrativo..." className="h-12 border-primary/20" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="p-6 bg-slate-50 border-t sticky bottom-0 z-20">
              <Button
                type="submit"
                className="w-full bg-primary text-white font-bold h-14 shadow-2xl text-lg hover:bg-primary/90 transition-all"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="h-6 w-6 animate-spin mr-2" />
                ) : (
                  <Save className="h-6 w-6 mr-2" />
                )}
                Finalizar e Registrar Receita
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
