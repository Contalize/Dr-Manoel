"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useFieldArray } from "react-hook-form"
import * as z from "zod"
import { Check, ChevronsUpDown, Loader2, Plus, Trash2, Pill, Save, Search, Info, UserCheck } from "lucide-react"
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

// Base de Dados de Medicamentos e Suplementos (Healthcare MVP)
const MEDICATIONS_DB = [
  "Vitamina C (Ácido Ascórbico)", "Glutationa", "Coenzima Q10 (Ubiquinona)", "Complexo B", 
  "Vitamina D3 (Colecalciferol)", "Magnésio Inositol", "Magnésio Quelato", "Ômega 3 (EPA/DHA)", 
  "Curcumina", "Quercitina", "Resveratrol", "Melatonina", "5-HTP", "Zinco Quelato", 
  "Selênio Quelato", "Probióticos (Mix de Cepas)", "Glutamina", "Creatina Monoidratada", 
  "Whey Protein Isolado", "Colágeno Verisol", "Ashwagandha", "Rhodiola Rosea", 
  "Panax Ginseng", "Ginkgo Biloba", "Espinheira Santa", "Passiflora incarnata", 
  "Valeriana officinalis", "Dipirona Sódica", "Ibuprofeno", "Paracetamol", 
  "Nimesulida", "Amoxicilina + Clavulanato", "Azitromicina", "Ciprofloxacino", 
  "Losartana Potássica", "Enalapril", "Metformina", "Gliclazida", "Sinvastatina", 
  "Atorvastatina", "Omeprazol", "Pantoprazol", "Levotiroxina Sódica", "Fluoxetina", 
  "Sertralina", "Escitalopram", "Alprazolam", "Clonazepam", "Loratadina", 
  "Desloratadina", "Cetirizina"
].sort();

const ADMINISTRATION_ROUTES = [
  { value: "VO", label: "Via Oral (VO)" },
  { value: "SL", label: "Via Sublingual (SL)" },
  { value: "IV", label: "Via Intravenosa / Endovenosa (IV / EV)" },
  { value: "IM", label: "Via Intramuscular (IM)" },
  { value: "SC", label: "Via Subcutânea (SC)" },
  { value: "VR", label: "Via Retal (VR)" },
  { value: "TOP", label: "Via Tópica (Local)" },
  { value: "INALA", label: "Via Inalatória" },
  { value: "VAG", label: "Via Vaginal" },
  { value: "OFT", label: "Via Oftálmica (Olhos)" },
  { value: "OTO", label: "Via Otológica (Ouvidos)" },
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
  const [isSearching, setIsSearching] = React.useState(false)
  const [openMedicationIndex, setOpenMedicationIndex] = React.useState<number | null>(null)
  
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
      setIsSearching(true)
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
        setIsSearching(false)
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

      await addDoc(collection(db, "prescriptions"), {
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
        title: "Receita Emitida com Sucesso",
        description: `O receituário para ${patientName} foi arquivado no prontuário.`,
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
        description: "Não foi possível sincronizar o receituário com o Firebase.",
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
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto border-none shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-headline text-primary flex items-center gap-2">
            <Pill className="h-6 w-6 text-accent" /> Prescrição Farmacêutica
          </DialogTitle>
          <DialogDescription className="font-medium text-slate-500">
            Emissão de receita em conformidade com RDC/ANVISA e protocolos integrativos.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Seção do Paciente */}
              <div className="bg-primary/5 p-4 rounded-xl border border-primary/10">
                <FormField
                  control={form.control}
                  name="patientId"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel className="text-xs font-bold uppercase tracking-wider text-primary">Paciente Identificado</FormLabel>
                      {initialPatientId ? (
                        <div className="p-3 bg-white rounded-lg border border-primary/20 flex items-center gap-3 h-11">
                          <div className="bg-primary/10 p-1.5 rounded-full"><Search className="h-3 w-3 text-primary" /></div>
                          <div>
                            <p className="text-sm font-bold text-slate-900 leading-tight">{initialPatientName}</p>
                          </div>
                        </div>
                      ) : (
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                role="combobox"
                                className={cn(
                                  "w-full justify-between h-11 bg-white border-primary/20",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value
                                  ? patients.find((p) => p.id === field.value)?.name
                                  : "Pesquisar paciente..."}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 shadow-2xl border-none">
                            <Command filter={(value, search) => value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0}>
                              <CommandInput placeholder="Nome ou CPF..." className="h-12" />
                              <CommandList className="max-h-[250px]">
                                <CommandEmpty>{isSearching ? "Buscando..." : "Paciente não localizado."}</CommandEmpty>
                                <CommandGroup>
                                  {patients.map((patient) => (
                                    <CommandItem
                                      value={patient.name}
                                      key={patient.id}
                                      onSelect={() => form.setValue("patientId", patient.id)}
                                      className="p-3 cursor-pointer hover:bg-primary/5"
                                    >
                                      <Check className={cn("mr-2 h-4 w-4 text-primary", patient.id === field.value ? "opacity-100" : "opacity-0")} />
                                      <div className="flex flex-col">
                                        <span className="font-bold text-sm text-slate-900">{patient.name}</span>
                                        <span className="text-[10px] font-medium text-muted-foreground uppercase">CPF: {patient.cpf}</span>
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

              {/* Seção do Profissional */}
              <div className="bg-accent/5 p-4 rounded-xl border border-accent/10">
                <FormField
                  control={form.control}
                  name="professionalId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold uppercase tracking-wider text-accent flex items-center gap-2">
                        <UserCheck className="h-3 w-3" /> Profissional Responsável
                      </FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-11 bg-white border-accent/20">
                            <SelectValue placeholder="Selecione o prescritor..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {professionals.length === 0 ? (
                            <SelectItem value="none" disabled>Nenhum profissional ativo</SelectItem>
                          ) : (
                            professionals.map((prof) => (
                              <SelectItem key={prof.id} value={prof.id} className="text-xs">
                                {prof.name} ({prof.registration})
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Itens da Receita */}
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b pb-2 border-slate-100">
                <h4 className="text-sm font-bold text-primary uppercase tracking-widest flex items-center gap-2">
                  <Pill className="h-4 w-4" /> Itens da Prescrição
                </h4>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ nome: "", posologia: "", via: "VO", orientacoes: "" })}
                  className="h-8 text-xs border-primary text-primary font-bold hover:bg-primary/5"
                >
                  <Plus className="h-3 w-3 mr-1" /> Adicionar Ativo
                </Button>
              </div>

              {fields.map((field, index) => (
                <div key={field.id} className="p-6 border rounded-2xl bg-white shadow-sm space-y-4 relative group hover:border-primary/30 transition-all">
                  {fields.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => remove(index)}
                      className="absolute top-2 right-2 h-8 w-8 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Nome com Autocomplete */}
                    <FormField
                      control={form.control}
                      name={`medications.${index}.nome`}
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Medicamento ou Ativo</FormLabel>
                          <Popover open={openMedicationIndex === index} onOpenChange={(isOpen) => setOpenMedicationIndex(isOpen ? index : null)}>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  className={cn(
                                    "w-full justify-between h-10 text-left font-medium",
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  {field.value || "Selecione ou digite..."}
                                  <Search className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-[300px] p-0 shadow-xl border-none">
                              <Command>
                                <CommandInput placeholder="Buscar medicamento..." className="h-10" />
                                <CommandList>
                                  <CommandEmpty>
                                    <div className="p-4 text-center">
                                      <p className="text-xs text-muted-foreground mb-2">Não encontrado na base mestre.</p>
                                      <Button 
                                        type="button" 
                                        size="sm" 
                                        variant="secondary" 
                                        className="w-full text-[10px]"
                                        onClick={() => {
                                          const input = document.querySelector('[cmdk-input]') as HTMLInputElement;
                                          if (input?.value) {
                                            form.setValue(`medications.${index}.nome`, input.value);
                                            setOpenMedicationIndex(null);
                                          }
                                        }}
                                      >
                                        Usar termo digitado
                                      </Button>
                                    </div>
                                  </CommandEmpty>
                                  <CommandGroup heading="Sugestões Clínicas">
                                    {MEDICATIONS_DB.map((med) => (
                                      <CommandItem
                                        key={med}
                                        value={med}
                                        onSelect={() => {
                                          form.setValue(`medications.${index}.nome`, med);
                                          setOpenMedicationIndex(null);
                                        }}
                                        className="text-xs cursor-pointer p-2"
                                      >
                                        <Check className={cn("mr-2 h-3 w-3", med === field.value ? "opacity-100" : "opacity-0")} />
                                        {med}
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

                    {/* Via de Administração Select */}
                    <FormField
                      control={form.control}
                      name={`medications.${index}.via`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Via de Administração</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-10 font-medium">
                                <SelectValue placeholder="Selecione a via..." />
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
                          <FormLabel className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Posologia / Frequência</FormLabel>
                          <FormControl>
                            <Input placeholder="Ex: 1 cápsula de 8 em 8 horas" className="h-10 text-xs font-medium" {...field} />
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
                          <FormLabel className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Orientações Especiais</FormLabel>
                          <FormControl>
                            <Input placeholder="Ex: Tomar após o café da manhã" className="h-10 text-xs font-medium" {...field} />
                          </FormControl>
                          <FormDescription className="text-[9px] flex items-center gap-1">
                            <Info className="h-2 w-2" /> Dicas de uso para o paciente.
                          </FormDescription>
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
                  <FormLabel className="text-sm font-bold text-primary">Observações Gerais do Receituário</FormLabel>
                  <FormControl>
                    <Input placeholder="Recomendações de dieta, estilo de vida ou retorno..." className="h-12 border-primary/10" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-6 border-t border-slate-100">
              <Button
                type="submit"
                className="w-full bg-primary text-white font-bold h-14 shadow-xl text-lg hover:bg-primary/95 transition-all"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="h-6 w-6 animate-spin mr-2" />
                ) : (
                  <Save className="h-6 w-6 mr-2" />
                )}
                Finalizar e Arquivar Prescrição
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}