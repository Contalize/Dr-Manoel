"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { signInWithEmailAndPassword } from "firebase/auth"
import { auth } from "@/firebase/config"
import Link from "next/link"
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Leaf, ShieldCheck, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      await signInWithEmailAndPassword(auth, email, password)
      toast({
        title: "Acesso Autorizado",
        description: "Bem-vindo à plataforma clínica Manoel da Farmácia.",
      })
      router.push("/")
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro de Autenticação",
        description: "Verifique suas credenciais e tente novamente.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-primary/5 rounded-full translate-y-1/2 -translate-x-1/2" />

      <div className="w-full max-w-md p-4 relative z-10">
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="bg-primary p-3 rounded-2xl mb-4 shadow-lg">
            <Leaf className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-primary font-headline">PharmaZen</h1>
          <p className="text-secondary font-medium mt-2">Plataforma Farmacêutica Integrativa</p>
        </div>

        <Card className="border-none shadow-2xl bg-white/80 backdrop-blur-sm">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">Acesso Restrito</CardTitle>
            <CardDescription className="text-center">
              Insira suas credenciais para acessar o painel clínico.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleLogin}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail Profissional</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="exemplo@clinicapharm.com.br"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-white"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Senha</Label>
                  <button type="button" className="text-xs text-primary hover:underline font-semibold">Esqueceu a senha?</button>
                </div>
                <Input 
                  id="password" 
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="bg-white"
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button 
                type="submit" 
                className="w-full bg-primary hover:bg-primary/90 text-white py-6 text-lg shadow-md"
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Entrar no Sistema"}
              </Button>
              
              <div className="text-sm text-center text-slate-600 mt-2">
                Não tem uma conta assinada?{" "}
                <Link href="/register" className="text-primary font-bold hover:underline">
                  Cadastre-se na Plataforma
                </Link>
              </div>

              <div className="flex items-center gap-2 text-[11px] text-slate-500 uppercase tracking-widest font-bold">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                Ambiente Criptografado • Conformidade LGPD
              </div>
            </CardFooter>
          </form>
        </Card>
        
        <p className="text-center mt-8 text-xs text-slate-400">
          Desenvolvido sob normas ABNT de segurança de dados em saúde.
        </p>
      </div>
    </div>
  )
}