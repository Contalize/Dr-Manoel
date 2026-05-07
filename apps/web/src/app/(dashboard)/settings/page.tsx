"use client"

import { useState, useEffect } from "react"
import { db } from "@/firebase/config"
import { 
  collection, 
  onSnapshot, 
  query, 
  addDoc, 
  setDoc,
  doc,
  serverTimestamp 
} from "firebase/firestore"
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent, 
  CardDescription,
  CardFooter
} from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
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
  Building2, 
  Users, 
  Save, 
  Plus, 
  ShieldCheck, 
  Phone, 
  Mail, 
  MapPin, 
  FileText,
  Loader2,
  Image as ImageIcon,
  BadgeCheck,
  MessageCircle
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import { logAction } from "@/lib/audit"
import { cn } from "@/lib/utils"

interface Professional {
  id: string
  name: string
  role: string
  registration: string
  status: 'active' | 'inactive'
}

interface ClinicSettings {
  name: string
  cnpj: string
  phone: string
  email: string
  cep: string
  address: string
  logoUrl?: string
}

interface WhatsAppSettings {
  instanceId: string
  token: string
  enabled: boolean
  reminderHoursBeforeAppointment: number
  clinicPhoneNumber: string
}

export default function SettingsPage() {
  const [clinicData, setClinicData] = useState<ClinicSettings>({
    name: "",
    cnpj: "",
    phone: "",
    email: "",
    cep: "",
    address: "",
    logoUrl: ""
  })
  const [professionals, setProfessionals] = useState<Professional[]>([])
  const [isSavingClinic, setIsSavingClinic] = useState(false)
  const [isAddingProfessional, setIsAddingProfessional] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const { toast } = useToast()

  const [newProf, setNewProf] = useState({ name: "", role: "", registration: "" })

  // ── WhatsApp states ───────────────────────────────────────────
  const [waSettings, setWaSettings] = useState<WhatsAppSettings>({
    instanceId: "",
    token: "",
    enabled: false,
    reminderHoursBeforeAppointment: 24,
    clinicPhoneNumber: ""
  })
  const [isSavingWa, setIsSavingWa] = useState(false)
  const [isTestingWa, setIsTestingWa] = useState(false)
  const [testPhone, setTestPhone] = useState("")
  // ─────────────────────────────────────────────────────────────

  useEffect(() => {
    const unsubClinic = onSnapshot(doc(db, "clinic_settings", "main"), (snap) => {
      if (snap.exists()) {
        setClinicData(snap.data() as ClinicSettings)
      }
    })

    const qProfs = query(collection(db, "professionals"))
    const unsubProfs = onSnapshot(qProfs, (snap) => {
      setProfessionals(snap.docs.map(d => ({ id: d.id, ...d.data() } as Professional)))
    })

    const unsubWa = onSnapshot(doc(db, "clinic_settings", "whatsapp"), (snap) => {
      if (snap.exists()) {
        setWaSettings(snap.data() as WhatsAppSettings)
      }
    })

    return () => {
      unsubClinic()
      unsubProfs()
      unsubWa()
    }
  }, [])

  const handleSaveClinic = async () => {
    setIsSavingClinic(true)
    try {
      await setDoc(doc(db, "clinic_settings", "main"), {
        ...clinicData,
        updatedAt: serverTimestamp()
      }, { merge: true })
      await logAction("ATUALIZAR_CONFIG_CLINICA", "SYSTEM")
      toast({ title: "Configurações Salvas", description: "Os dados da clínica foram atualizados com sucesso." })
    } catch {
      toast({ variant: "destructive", title: "Erro ao salvar" })
    } finally {
      setIsSavingClinic(false)
    }
  }

  const handleAddProfessional = async () => {
    if (!newProf.name || !newProf.registration) {
      toast({ variant: "destructive", title: "Campos Incompletos", description: "Nome e Registro Profissional são obrigatórios." })
      return
    }
    setIsAddingProfessional(true)
    try {
      await addDoc(collection(db, "professionals"), {
        ...newProf,
        status: "active",
        createdAt: serverTimestamp()
      })
      await logAction("ADICIONAR_PROFISSIONAL", "SYSTEM", { nome: newProf.name })
      toast({ title: "Profissional Cadastrado", description: `${newProf.name} agora faz parte do corpo clínico.` })
      setNewProf({ name: "", role: "", registration: "" })
      setIsDialogOpen(false)
    } catch {
      toast({ variant: "destructive", title: "Erro ao cadastrar" })
    } finally {
      setIsAddingProfessional(false)
    }
  }

  const handleSaveWhatsApp = async () => {
    setIsSavingWa(true)
    try {
      await setDoc(doc(db, "clinic_settings", "whatsapp"), {
        ...waSettings,
        updatedAt: serverTimestamp()
      }, { merge: true })
      await logAction("ATUALIZAR_CONFIG_WHATSAPP", "SYSTEM")
      toast({ title: "Configurações WhatsApp salvas" })
    } catch {
      toast({ title: "Erro ao salvar", variant: "destructive" })
    } finally {
      setIsSavingWa(false)
    }
  }

  const handleTestWhatsApp = async () => {
    if (!testPhone) {
      toast({ title: "Informe um número para testar", variant: "destructive" })
      return
    }
    setIsTestingWa(true)
    try {
      const response = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: testPhone,
          message: "✅ Dr. Manoel: conexão WhatsApp funcionando! Este é o seu lembrete automático de consultas.",
          instanceId: waSettings.instanceId,
          token: waSettings.token
        })
      })
      if (!response.ok) throw new Error("Falha no envio")
      toast({ title: "Mensagem de teste enviada!", description: `Verifique o WhatsApp do número ${testPhone}` })
    } catch {
      toast({ title: "Erro ao enviar teste. Verifique as credenciais.", variant: "destructive" })
    } finally {
      setIsTestingWa(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      <header className="pt-12 md:pt-0">
        <h1 className="text-3xl font-bold text-primary font-headline">Configurações do Sistema</h1>
        <p className="text-muted-foreground flex items-center gap-2 mt-1">
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          Gerenciamento administrativo e governança clínica.
        </p>
      </header>

      <Tabs defaultValue="clinic" className="w-full">
        <TabsList className="grid grid-cols-3 w-full max-w-lg bg-white border shadow-sm p-1 h-auto mb-8 rounded-xl">
          <TabsTrigger value="clinic" className="py-3 font-bold gap-2 data-[state=active]:bg-primary data-[state=active]:text-white transition-all rounded-lg">
            <Building2 className="h-4 w-4" /> Dados da Clínica
          </TabsTrigger>
          <TabsTrigger value="team" className="py-3 font-bold gap-2 data-[state=active]:bg-primary data-[state=active]:text-white transition-all rounded-lg">
            <Users className="h-4 w-4" /> Corpo Clínico
          </TabsTrigger>
          <TabsTrigger value="whatsapp" className="py-3 font-bold gap-2 data-[state=active]:bg-primary data-[state=active]:text-white transition-all rounded-lg">
            <MessageCircle className="h-4 w-4" /> WhatsApp
          </TabsTrigger>
        </TabsList>

        {/* ── Dados da Clínica ─────────────────────────────────── */}
        <TabsContent value="clinic" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <Card className="border-none shadow-xl bg-white overflow-hidden">
            <CardHeader className="bg-primary/5 border-b">
              <CardTitle className="text-primary font-headline flex items-center gap-2">
                <FileText className="h-5 w-5" /> Identidade Institucional
              </CardTitle>
              <CardDescription>Estes dados serão utilizados no cabeçalho de receitas, laudos e evoluções clínicas.</CardDescription>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="clinicName" className="text-xs font-bold uppercase tracking-widest text-slate-500">Nome da Clínica / Razão Social</Label>
                    <Input 
                      id="clinicName" 
                      value={clinicData.name} 
                      onChange={(e) => setClinicData({...clinicData, name: e.target.value})}
                      placeholder="Ex: Dr. Manoel Clínica Integrativa"
                      className="h-12 bg-secondary/5 border-slate-200"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cnpj" className="text-xs font-bold uppercase tracking-widest text-slate-500">CNPJ</Label>
                    <Input 
                      id="cnpj" 
                      value={clinicData.cnpj} 
                      onChange={(e) => setClinicData({...clinicData, cnpj: e.target.value})}
                      placeholder="00.000.000/0000-00"
                      className="h-11"
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="p-6 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-3 bg-secondary/5 text-slate-400 hover:text-primary hover:border-primary/30 transition-all cursor-pointer">
                    <ImageIcon className="h-8 w-8" />
                    <p className="text-xs font-bold uppercase tracking-widest text-center">Logo da Clínica (PNG/JPG)<br/><span className="text-[10px] font-normal">Máximo 2MB</span></p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="logoUrl" className="text-xs font-bold uppercase tracking-widest text-slate-500">URL da Logo (Opcional)</Label>
                    <Input 
                      id="logoUrl" 
                      value={clinicData.logoUrl} 
                      onChange={(e) => setClinicData({...clinicData, logoUrl: e.target.value})}
                      placeholder="https://exemplo.com/logo.png"
                      className="h-11"
                    />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t">
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-primary uppercase flex items-center gap-2">
                    <Phone className="h-4 w-4" /> Contatos Operacionais
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs">Telefone Principal</Label>
                      <Input value={clinicData.phone} onChange={(e) => setClinicData({...clinicData, phone: e.target.value})} placeholder="(11) 0000-0000" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">E-mail Administrativo</Label>
                      <Input value={clinicData.email} onChange={(e) => setClinicData({...clinicData, email: e.target.value})} placeholder="atendimento@clinica.com" />
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-primary uppercase flex items-center gap-2">
                    <MapPin className="h-4 w-4" /> Localização Física
                  </h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs">CEP</Label>
                      <Input value={clinicData.cep} onChange={(e) => setClinicData({...clinicData, cep: e.target.value})} placeholder="00000-000" />
                    </div>
                    <div className="col-span-2 space-y-2">
                      <Label className="text-xs">Endereço Completo</Label>
                      <Input value={clinicData.address} onChange={(e) => setClinicData({...clinicData, address: e.target.value})} placeholder="Rua, Número, Bairro, Cidade - UF" />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="bg-secondary/5 p-8 border-t flex justify-end">
              <Button 
                onClick={handleSaveClinic} 
                className="bg-primary text-white hover:bg-primary/90 px-8 font-bold shadow-lg h-12"
                disabled={isSavingClinic}
              >
                {isSavingClinic ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Salvar Configurações Clínicas
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* ── Corpo Clínico ─────────────────────────────────────── */}
        <TabsContent value="team" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <Card className="border-none shadow-xl bg-white overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between border-b p-8">
              <div>
                <CardTitle className="text-primary font-headline">Corpo Clínico Ativo</CardTitle>
                <CardDescription>Gerencie os profissionais habilitados a realizar diagnósticos e assinar prescrições.</CardDescription>
              </div>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-accent text-white hover:bg-accent/90 shadow-md font-bold h-11 px-6">
                    <Plus className="h-4 w-4 mr-2" /> Adicionar Profissional
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px] border-none shadow-2xl">
                  <DialogHeader>
                    <DialogTitle className="text-primary font-headline text-2xl">Novo Membro da Equipe</DialogTitle>
                    <DialogDescription className="font-medium text-slate-500">Preencha os dados técnicos do profissional para habilitação no sistema.</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-6 py-6">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase text-slate-400">Nome Completo</Label>
                      <Input value={newProf.name} onChange={e => setNewProf({...newProf, name: e.target.value})} placeholder="Ex: Dr. Manoel Silva" className="h-11" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase text-slate-400">Cargo / Especialidade</Label>
                        <Input value={newProf.role} onChange={e => setNewProf({...newProf, role: e.target.value})} placeholder="Ex: Farmacêutico Esteta" className="h-11" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase text-slate-400">Nº Registro (CRF/CRM)</Label>
                        <Input value={newProf.registration} onChange={e => setNewProf({...newProf, registration: e.target.value})} placeholder="Ex: CRF/SP 123456" className="h-11" />
                      </div>
                    </div>
                  </div>
                  <DialogFooter className="border-t pt-6">
                    <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="h-11 px-6">Cancelar</Button>
                    <Button onClick={handleAddProfessional} disabled={isAddingProfessional} className="bg-primary text-white h-11 px-8 font-bold shadow-lg">
                      {isAddingProfessional ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                      Finalizar Cadastro
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-secondary/5">
                  <TableRow className="h-14 border-b">
                    <TableHead className="font-bold text-primary pl-8">Profissional / Identificação</TableHead>
                    <TableHead className="font-bold text-primary">Cargo / Especialidade</TableHead>
                    <TableHead className="font-bold text-primary text-center">Nº de Registro</TableHead>
                    <TableHead className="font-bold text-primary text-right pr-8">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {professionals.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-20 text-muted-foreground italic">
                        Nenhum profissional cadastrado na base institucional.
                      </TableCell>
                    </TableRow>
                  ) : (
                    professionals.map((prof) => (
                      <TableRow key={prof.id} className="hover:bg-primary/5 transition-colors h-16 border-b">
                        <TableCell className="font-bold text-slate-900 pl-8">
                          <div className="flex items-center gap-3">
                            <div className="bg-primary/10 p-2 rounded-lg"><Users className="h-4 w-4 text-primary" /></div>
                            {prof.name}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-slate-600 font-medium">{prof.role}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="font-mono text-[10px] font-bold text-slate-500 border-slate-200">
                            {prof.registration}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right pr-8">
                          <Badge className="bg-emerald-100 text-emerald-700 border-none text-[10px] uppercase font-bold flex items-center gap-1 w-fit ml-auto">
                            <BadgeCheck className="h-3 w-3" /> Ativo
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── WhatsApp ──────────────────────────────────────────── */}
        <TabsContent value="whatsapp" className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-6">

          <Card className="border-none shadow-md bg-white overflow-hidden">
            <CardHeader className="bg-primary/5 border-b">
              <CardTitle className="text-primary font-headline flex items-center gap-2">
                <MessageCircle className="h-5 w-5" /> Automação de Mensagens
              </CardTitle>
              <CardDescription>
                Configure o Z-API para enviar lembretes automáticos de consulta e mensagens de aniversário via WhatsApp.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-8 space-y-6">

              {/* Toggle de ativação */}
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border">
                <div>
                  <p className="text-sm font-bold text-slate-800">Automação ativa</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {waSettings.enabled ? "Lembretes sendo enviados automaticamente" : "Lembretes pausados"}
                  </p>
                </div>
                <button
                  onClick={() => setWaSettings(prev => ({ ...prev, enabled: !prev.enabled }))}
                  className={cn(
                    "relative w-12 h-6 rounded-full transition-colors duration-200",
                    waSettings.enabled ? "bg-primary" : "bg-slate-200"
                  )}
                >
                  <span className={cn(
                    "absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200",
                    waSettings.enabled ? "translate-x-6" : "translate-x-0"
                  )} />
                </button>
              </div>

              {/* Credenciais Z-API */}
              <div className="space-y-4">
                <Label className="text-xs font-bold uppercase text-slate-400">Credenciais Z-API</Label>
                <p className="text-xs text-muted-foreground">
                  Obtenha em <span className="font-mono text-primary">app.z-api.io</span> → sua instância → API.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Instance ID</Label>
                    <Input
                      value={waSettings.instanceId}
                      onChange={(e) => setWaSettings(prev => ({ ...prev, instanceId: e.target.value }))}
                      placeholder="Ex: 3A123ABC456DEF"
                      className="h-11 font-mono text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Token</Label>
                    <Input
                      type="password"
                      value={waSettings.token}
                      onChange={(e) => setWaSettings(prev => ({ ...prev, token: e.target.value }))}
                      placeholder="Token da instância"
                      className="h-11 font-mono text-sm"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Número de telefone da clínica (WhatsApp vinculado)</Label>
                  <Input
                    value={waSettings.clinicPhoneNumber}
                    onChange={(e) => setWaSettings(prev => ({ ...prev, clinicPhoneNumber: e.target.value }))}
                    placeholder="(11) 99999-9999"
                    className="h-11 max-w-xs"
                  />
                </div>
              </div>

              {/* Horário do lembrete */}
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-slate-400">
                  Enviar lembrete quantas horas antes?
                </Label>
                <div className="flex items-center gap-3">
                  {[12, 24, 48].map(h => (
                    <button
                      key={h}
                      onClick={() => setWaSettings(prev => ({ ...prev, reminderHoursBeforeAppointment: h }))}
                      className={cn(
                        "px-4 py-2 rounded-lg text-sm font-bold border transition-all",
                        waSettings.reminderHoursBeforeAppointment === h
                          ? "bg-primary text-white border-primary"
                          : "bg-white text-slate-600 border-slate-200 hover:border-primary/30"
                      )}
                    >
                      {h}h antes
                    </button>
                  ))}
                </div>
              </div>

              {/* Teste de envio */}
              <div className="space-y-2 pt-2 border-t">
                <Label className="text-xs font-bold uppercase text-slate-400">Testar conexão</Label>
                <div className="flex gap-2">
                  <Input
                    value={testPhone}
                    onChange={(e) => setTestPhone(e.target.value)}
                    placeholder="(11) 99999-9999 — número para receber teste"
                    className="h-11"
                  />
                  <Button
                    onClick={handleTestWhatsApp}
                    disabled={isTestingWa || !waSettings.instanceId || !waSettings.token}
                    variant="outline"
                    className="h-11 border-primary/20 text-primary hover:bg-primary/5 flex-shrink-0"
                  >
                    {isTestingWa ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enviar Teste"}
                  </Button>
                </div>
              </div>

            </CardContent>
            <CardFooter className="bg-secondary/5 p-8 border-t flex justify-end">
              <Button
                onClick={handleSaveWhatsApp}
                className="bg-primary text-white hover:bg-primary/90 px-8 font-bold shadow-lg h-12"
                disabled={isSavingWa}
              >
                {isSavingWa ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Salvar Configurações WhatsApp
              </Button>
            </CardFooter>
          </Card>

          {/* Instruções */}
          <Card className="border-none shadow-sm bg-amber-50 border-l-4 border-amber-400">
            <CardContent className="p-5">
              <p className="text-xs font-bold text-amber-800 uppercase tracking-widest mb-2">
                Como conectar o número da clínica
              </p>
              <ol className="text-sm text-amber-900 space-y-1.5 list-decimal list-inside">
                <li>Acesse app.z-api.io e crie uma instância</li>
                <li>Copie o Instance ID e Token acima e salve</li>
                <li>No painel Z-API, clique em "Conectar" e escaneie o QR code com o WhatsApp da clínica</li>
                <li>Use o número dedicado da clínica — nunca o celular pessoal</li>
                <li>Clique em "Enviar Teste" para confirmar a conexão</li>
              </ol>
            </CardContent>
          </Card>

        </TabsContent>
      </Tabs>
    </div>
  )
}
