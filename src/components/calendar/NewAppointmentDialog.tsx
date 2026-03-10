"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { db, auth } from "@/firebase/config"
import { collection, addDoc, getDocs, query, where } from "firebase/firestore"
import { Button } from "@/components/ui/button"
import { Plus, Loader2, CalendarIcon, Clock } from "lucide-react"
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
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"

const appointmentSchema = z.object({
  patientName: z.string().min(1, "O nome do paciente é obrigatório"),
  date: z.string().min(1, "A data é obrigatória"),
  time: z.string().min(1, "A hora é obrigatória"),
  type: z.enum(["Consulta", "Soroterapia", "Injetável", "Retorno"]),
})

type AppointmentFormValues = z.infer<typeof appointmentSchema>

export function NewAppointmentDialog() {
  const [open, setOpen] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const { toast } = useToast()

  const form = useForm<AppointmentFormValues>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      patientName: "",
      date: format(new Date(), "yyyy-MM-dd"),
      time: "08:00",
      type: "Consulta",
    },
  })

  async function onSubmit(values: AppointmentFormValues) {
    setIsSubmitting(true)
    try {
      const userId = auth.currentUser?.uid
      if (!userId) throw new Error("Usuário não autenticado")

      await addDoc(collection(db, "appointments"), {
        patientName: values.patientName,
        date: values.date,
        time: values.time,
        type: values.type,
        status: "Scheduled",
        userId,
      })

      toast({
        title: "Agendamento Criado",
        description: `O paciente ${values.patientName} foi agendado com sucesso.`,
      })

      form.reset()
      setOpen(false)
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro na Gravação",
        description: "Não foi possível criar o agendamento.",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-accent text-white hover:bg-accent/90 shadow-lg px-6 font-bold">
          <Plus className="h-4 w-4 mr-2" /> Novo Agendamento
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Novo Agendamento</DialogTitle>
              <DialogDescription>Marque um horário para um paciente na agenda da clínica.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <FormField
                control={form.control}
                name="patientName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do Paciente</FormLabel>
                    <FormControl>
                      <Input placeholder="Digite o nome do paciente..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2"><CalendarIcon className="w-4 h-4"/> Data</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2"><Clock className="w-4 h-4"/> Horário</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Atendimento</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Consulta">Consulta</SelectItem>
                        <SelectItem value="Soroterapia">Soroterapia</SelectItem>
                        <SelectItem value="Injetável">Injetável</SelectItem>
                        <SelectItem value="Retorno">Retorno</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button type="submit" className="w-full bg-primary" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                Salvar Agendamento
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}