"use client"

import { useState, useEffect } from "react";
import { db, auth } from "@/firebase/config";
import { collection, getDocs, limit, query } from "firebase/firestore";
import { onAuthStateChanged, User } from "firebase/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  Database, 
  AlertTriangle, 
  ExternalLink, 
  Code,
  UserCircle,
  Lock
} from "lucide-react";
import Link from "next/link";

export default function TestDBPage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthLoading(false);
      if (user) {
        testConnection();
      } else {
        setStatus('error');
        setError("Usuário não autenticado. O Firebase exige login para acessar os dados com as regras atuais.");
      }
    });
    return () => unsubscribe();
  }, []);

  async function testConnection() {
    setStatus('loading');
    setError(null);
    try {
      const q = query(collection(db, "patients"), limit(1));
      const snapshot = await getDocs(q);
      setStatus('success');
    } catch (err: any) {
      console.error("Firestore connection error:", err);
      let friendlyError = err.message;
      if (err.code === 'permission-denied') {
        friendlyError = "Permissão negada. Verifique se o usuário logado tem autorização ou se as regras no console foram publicadas.";
      }
      setError(friendlyError || 'Erro desconhecido ao conectar ao Firestore');
      setStatus('error');
    }
  }

  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <div className="flex items-center gap-4 mb-8">
        <div className="bg-primary/10 p-3 rounded-xl">
          <Database className="h-8 w-8 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-primary font-headline">Diagnóstico PharmaZen</h1>
          <p className="text-muted-foreground">Verificando Identidade e Camada de Dados.</p>
        </div>
      </div>

      <div className="grid gap-6">
        {/* Status de Autenticação */}
        <Card className="border-none shadow-md overflow-hidden">
          <CardHeader className="bg-secondary/10 pb-4">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <UserCircle className="h-4 w-4" /> Status de Autenticação
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {authLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground italic">
                <Loader2 className="h-4 w-4 animate-spin" /> Verificando sessão...
              </div>
            ) : currentUser ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-green-700 font-bold">
                  <CheckCircle2 className="h-4 w-4" /> Conectado como {currentUser.email}
                </div>
                <Badge className="bg-green-100 text-green-700 border-none">Sessão Ativa</Badge>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-red-600 font-bold">
                  <Lock className="h-4 w-4" /> Sessão Encerrada / Não Identificada
                </div>
                <Link href="/login" className="block">
                  <Button className="w-full bg-accent text-white hover:bg-accent/90">
                    Ir para Tela de Login
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Status do Banco de Dados */}
        <Card className="border-none shadow-xl overflow-hidden">
          <CardHeader className={status === 'success' ? 'bg-green-500/10' : status === 'error' ? 'bg-red-500/10' : 'bg-secondary'}>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl">Handshake Firestore</CardTitle>
                <CardDescription>Acesso aos dados clínicos</CardDescription>
              </div>
              {status === 'loading' && <Loader2 className="h-6 w-6 animate-spin text-primary" />}
              {status === 'success' && <CheckCircle2 className="h-6 w-6 text-green-600" />}
              {status === 'error' && <XCircle className="h-6 w-6 text-red-600" />}
            </div>
          </CardHeader>

          <CardContent className="p-8 space-y-6">
            {status === 'success' && (
              <div className="space-y-4 animate-in fade-in duration-500">
                <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-100 rounded-xl">
                  <p className="text-green-800 font-bold">Banco de Dados Respondeu com Sucesso!</p>
                </div>
                <Link href="/" className="w-full">
                  <Button className="w-full bg-primary text-white">Acessar Painel Principal</Button>
                </Link>
              </div>
            )}

            {status === 'error' && (
              <div className="space-y-4 animate-in zoom-in-95 duration-300">
                <div className="p-4 bg-red-50 border border-red-100 rounded-xl">
                  <div className="flex items-center gap-2 text-red-700 font-bold mb-2">
                    <AlertTriangle className="h-5 w-5" />
                    <span>Falha na Verificação</span>
                  </div>
                  <div className="text-sm font-mono bg-white/50 p-3 rounded border border-red-200 text-red-900 leading-relaxed">
                    {error}
                  </div>
                </div>
                
                {!currentUser && (
                  <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 space-y-2">
                    <h4 className="text-sm font-bold text-amber-800 uppercase">Por que falhou?</h4>
                    <p className="text-xs text-amber-900 leading-relaxed">
                      Suas regras de segurança exigem login (<code>request.auth != null</code>). 
                      Como você não está logado, o Firebase bloqueou a leitura da coleção de pacientes.
                    </p>
                  </div>
                )}

                <Button onClick={testConnection} className="w-full gap-2" variant="outline" disabled={!currentUser}>
                  <RefreshCw className="h-4 w-4" /> Tentar Novamente
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      <p className="text-center text-xs text-muted-foreground mt-8">
        PharmaZen Intel • Auditoria LGPD Ativa
      </p>
    </div>
  );
}