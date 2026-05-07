"use client"

import { useState } from "react"
import { auth, db } from "@/firebase/config"
import { createUserWithEmailAndPassword } from "firebase/auth"
import { setDoc, doc, serverTimestamp } from "firebase/firestore"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Leaf, ShieldCheck, Loader2, User, Building } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"

export default function RegisterPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [type, setType] = useState<"pf" | "pj">("pf")
  
  // States PF
  const [name, setName] = useState("")
  const [cpf, setCpf] = useState("")
  const [crf, setCrf] = useState("")
  
  // States PJ
  const [razaoSocial, setRazaoSocial] = useState("")
  const [nomeFantasia, setNomeFantasia] = useState("")
  const [cnpj, setCnpj] = useState("")
  const [rt, setRt] = useState("")
  
  // Common States
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  
  const router = useRouter()
  const { toast } = useToast()

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      const user = userCredential.user

      const commonData = {
        email,
        type,
        createdAt: serverTimestamp(),
      }

      const specificData = type === "pf" 
        ? { nome_exibicao: name, name, cpf, crf }
        : { nome_exibicao: nomeFantasia, razaoSocial, nomeFantasia, cnpj, responsavelTecnico: rt }

      await setDoc(doc(db, "users", user.uid), {
        ...commonData,
        ...specificData
      })

      toast({
        title: "Cadastro Concluído!",
        description: "Bem-vindo à plataforma Dr. Manoel.",
      })
      router.push("/")
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro no Cadastro",
        description: error.message || "Verifique os dados informados.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 relative overflow-hidden py-12">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-primary/5 rounded-full translate-y-1/2 -translate-x-1/2" />

      <div className="w-full max-w-lg p-4 relative z-10">
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="bg-primary p-3 rounded-2xl mb-4 shadow-lg">
            <Leaf className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-primary font-headline">Dr. Manoel</h1>
          <p className="text-secondary font-medium mt-2">Plataforma Farmacêutica Integrativa</p>
        </div>

        <Card className="border-none shadow-2xl bg-white/80 backdrop-blur-sm">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">Crie sua Conta</CardTitle>
            <CardDescription className="text-center">
              Preencha os dados abaixo para iniciar sua jornada clínica.
            </CardDescription>
          </CardHeader>
          
          <Tabs defaultValue="pf" onValueChange={(v) => setType(v as "pf" | "pj")} className="w-full">
            <div className="px-6 pb-2">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="pf" className="font-bold flex gap-2">
                  <User className="h-4 w-4" /> Pessoa Física
                </TabsTrigger>
                <TabsTrigger value="pj" className="font-bold flex gap-2">
                  <Building className="h-4 w-4" /> Clínica (PJ)
                </TabsTrigger>
              </TabsList>
            </div>

            <form onSubmit={handleRegister}>
              <CardContent className="space-y-4 pt-4">
                <TabsContent value="pf" className="space-y-4 mt-0">
                  <div className="space-y-2">
                    <Label htmlFor="nome">Nome Completo</Label>
                    <Input id="nome" value={name} onChange={e => setName(e.target.value)} required={type === "pf"} className="bg-white" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="cpf">CPF</Label>
                      <Input id="cpf" value={cpf} onChange={e => setCpf(e.target.value)} required={type === "pf"} className="bg-white" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="crf">CRF (Conselho)</Label>
                      <Input id="crf" value={crf} onChange={e => setCrf(e.target.value)} required={type === "pf"} className="bg-white" />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="pj" className="space-y-4 mt-0">
                  <div className="space-y-2">
                    <Label htmlFor="razao">Razão Social</Label>
                    <Input id="razao" value={razaoSocial} onChange={e => setRazaoSocial(e.target.value)} required={type === "pj"} className="bg-white" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="fantasia">Nome Fantasia</Label>
                      <Input id="fantasia" value={nomeFantasia} onChange={e => setNomeFantasia(e.target.value)} required={type === "pj"} className="bg-white" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cnpj">CNPJ</Label>
                      <Input id="cnpj" value={cnpj} onChange={e => setCnpj(e.target.value)} required={type === "pj"} className="bg-white" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rt">Responsável Técnico (Nome e CRF)</Label>
                    <Input id="rt" value={rt} onChange={e => setRt(e.target.value)} required={type === "pj"} className="bg-white" />
                  </div>
                </TabsContent>

                <div className="space-y-4 border-t pt-4 border-slate-200 mt-4 rounded-xl">
                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail Profissional</Label>
                    <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required className="bg-white" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Crie uma Senha (mín. 6 caracteres)</Label>
                    <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required className="bg-white" minLength={6} />
                  </div>
                </div>
              </CardContent>

              <CardFooter className="flex flex-col gap-4">
                <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-white py-6 text-lg shadow-md" disabled={isLoading}>
                  {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Criar Minha Conta"}
                </Button>
                
                <div className="text-sm text-center text-slate-600 mt-2">
                  Já possui uma conta?{" "}
                  <Link href="/login" className="text-primary font-bold hover:underline">
                    Fazer Login
                  </Link>
                </div>

                <div className="flex items-center gap-2 text-[11px] text-slate-500 uppercase tracking-widest font-bold">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  Ambiente Criptografado • Conformidade LGPD
                </div>
              </CardFooter>
            </form>
          </Tabs>
        </Card>
      </div>
    </div>
  )
}
