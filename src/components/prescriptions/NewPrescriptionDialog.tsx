
"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useFieldArray } from "react-hook-form"
import * as z from "zod"
import { Check, ChevronsUpDown, Loader2, Plus, Trash2, Pill, Save } from "lucide-react"
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
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { logAction } from "@/lib/audit"

const medicationSchema = z.object({
  nome: z.string().min(1, "O nome do medicamento é obrigatório"),
  posologia: z.string().min(1, "A posologia é obrigatória"),
  via: z.string().min(1, "A via é obrigatória"),
})

const prescriptionFormSchema = z.object({
  patientId: z.string({
    required_error: "Selecione um paciente.",
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
  const { toast } = useToast()

  const form = useForm<PrescriptionFormValues>({
    resolver: zodResolver(prescriptionFormSchema),
    defaultValues: {
      patientId: initialPatientId || "",
      notes: "",
      medications: [{ nome: "", posologia: "", via: "Oral" }],
    },
  })

  const { fields, append, remove } = useFieldArray({
    name: "medications",
    control: form.control,
  })

  // Busca de pacientes para o Combobox
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

      await addDoc(collection(db, "prescriptions"), {
        patientId: values.patientId,
        patientName,
        date: serverTimestamp(),
        medications: values.medications,
        notes: values.notes || "",
      })

      await logAction("EMISSAO_RECEITUARIO", values.patientId, { paciente: patientName })

      toast({
        title: "Receita Emitida",
        description: `O receituário para ${patientName} foi salvo com sucesso.`,
      })
      
      form.reset({
        patientId: initialPatientId || "",
        notes: "",
        medications: [{ nome: "", posologia: "", via: "Oral" }],
      })
      setOpen(false)
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro ao Salvar",
        description: "Ocorreu um problema técnico ao registrar a receita.",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="bg-accent text-white hover:bg-accent/90">
            <Plus className="h-4 w-4 mr-2" /> Novo Receituário
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-primary font-headline flex items-center gap-2">
            <Pill className="h-5 w-5" /> Emitir Prescrição Farmacêutica
          </DialogTitle>
          <DialogDescription>
            Registre a conduta farmacêutica e orientações para o paciente.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Seleção de Paciente com Combobox Case-Insensitive */}
            <FormField
              control={form.control}
              name="patientId"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Paciente</FormLabel>
                  {initialPatientId ? (
                    <div className="p-2 bg-secondary/10 rounded-md border text-sm font-bold text-primary">
                      {initialPatientName}
                    </div>
                  ) : (
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            className={cn(
                              "w-full justify-between",
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
                      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                        <Command 
                          filter={(value, search) => {
                            if (value.toLowerCase().includes(search.toLowerCase())) return 1
                            return 0
                          }}
                        >
                          <CommandInput placeholder="Digite o nome do paciente..." />
                          <CommandList>
                            <CommandEmpty>
                              {isSearching ? "Buscando..." : "Nenhum paciente localizado."}
                            </CommandEmpty>
                            <CommandGroup>
                              {patients.map((patient) => (
                                <CommandItem
                                  value={patient.name}
                                  key={patient.id}
                                  onSelect={() => {
                                    form.setValue("patientId", patient.id)
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      patient.id === field.value
                                        ? "opacity-100"
                                        : "opacity-0"
                                    )}
                                  />
                                  <div className="flex flex-col">
                                    <span className="font-medium">{patient.name}</span>
                                    <span className="text-[10px] text-muted-foreground uppercase">CPF: {patient.cpf}</span>
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

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-primary uppercase tracking-widest">Medicamentos / Ativos</h4>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ nome: "", posologia: "", via: "Oral" })}
                  className="h-8 text-xs border-dashed"
                >
                  <Plus className="h-3 w-3 mr-1" /> Adicionar
                </Button>
              </div>

              {fields.map((field, index) => (
                <div key={field.id} className="p-4 border rounded-xl bg-secondary/5 space-y-3 relative group">
                  {fields.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => remove(index)}
                      className="absolute top-2 right-2 h-6 w-6 text-muted-foreground hover:text-red-500"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name={`medications.${index}.nome`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] uppercase font-bold">Medicamento/Ativo</FormLabel>
                          <FormControl>
                            <Input placeholder="Ex: Vitamina C 500mg" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`medications.${index}.via`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] uppercase font-bold">Via</FormLabel>
                          <FormControl>
                            <Input placeholder="Ex: Oral, IM, IV..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name={`medications.${index}.posologia`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] uppercase font-bold">Posologia / Orientações</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: 1 cápsula 12/12h por 30 dias" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              ))}
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações Gerais</FormLabel>
                  <FormControl>
                    <Input placeholder="Orientações adicionais de dieta ou estilo de vida..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="submit"
                className="w-full bg-primary text-white font-bold h-12 shadow-lg"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                ) : (
                  <Save className="h-5 w-5 mr-2" />
                )}
                Finalizar e Salvar Receituário
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
