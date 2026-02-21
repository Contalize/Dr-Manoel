"use client"

import { useState, useEffect } from "react";
import { db } from "@/firebase/config";
import { collection, getDocs, limit, query } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle, RefreshCw, Database, AlertTriangle, ExternalLink, Code } from "lucide-react";
import Link from "next/link";

export default function TestDBPage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [count, setCount] = useState(0);

  async function testConnection() {
    setStatus('loading');
    setError(null);
    try {
      // Tenta buscar 1 documento da coleção de pacientes
      const q = query(collection(db, "patients"), limit(1));
      const snapshot = await getDocs(q);
      setCount(snapshot.size);
      setStatus('success');
    } catch (err: any) {
      console.error("Firestore connection error:", err);
      // Tradução amigável para erros comuns
      let friendlyError = err.message;
      if (err.code === 'permission-denied') {
        friendlyError = "Permissões insuficientes. Suas regras atuais estão bloqueando o acesso (allow read, write: if false).";
      }
      setError(friendlyError || 'Erro desconhecido ao conectar ao Firestore');
      setStatus('error');
    }
  }

  useEffect(() => {
    testConnection();
  }, []);

  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <div className="flex items-center gap-4 mb-8">
        <div className="bg-primary/10 p-3 rounded-xl">
          <Database className="h-8 w-8 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-primary font-headline">Diagnóstico de Conexão</h1>
          <p className="text-muted-foreground">Verificando a integridade da camada de dados PharmaZen.</p>
        </div>
      </div>

      <Card className="border-none shadow-xl overflow-hidden">
        <CardHeader className={status === 'success' ? 'bg-green-500/10' : status === 'error' ? 'bg-red-500/10' : 'bg-secondary'}>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">Status do Banco de Dados</CardTitle>
              <CardDescription>Handshake com Firebase Firestore</CardDescription>
            </div>
            {status === 'loading' && <Loader2 className="h-6 w-6 animate-spin text-primary" />}
            {status === 'success' && <CheckCircle2 className="h-6 w-6 text-green-600" />}
            {status === 'error' && <XCircle className="h-6 w-6 text-red-600" />}
          </div>
        </CardHeader>

        <CardContent className="p-8 space-y-6">
          {status === 'loading' && (
            <div className="flex flex-col items-center py-12 gap-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary/40" />
              <p className="font-medium animate-pulse">Consultando nuvem...</p>
            </div>
          )}

          {status === 'success' && (
            <div className="space-y-4 animate-in fade-in duration-500">
              <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-100 rounded-xl">
                <div className="bg-green-600 rounded-full p-1">
                  <CheckCircle2 className="h-4 w-4 text-white" />
                </div>
                <p className="text-green-800 font-bold">Conexão 100% Operacional!</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-secondary/30 rounded-lg">
                  <p className="text-xs uppercase font-bold text-muted-foreground mb-1">Base de Dados</p>
                  <div className="flex items-center gap-2">
                    <Badge variant="default" className="bg-primary">Ativa</Badge>
                  </div>
                </div>
                <div className="p-4 bg-secondary/30 rounded-lg">
                  <p className="text-xs uppercase font-bold text-muted-foreground mb-1">Sincronização</p>
                  <p className="text-lg font-bold text-primary">Tempo Real</p>
                </div>
              </div>

              <div className="pt-4 border-t">
                <Link href="/" className="w-full">
                  <Button className="w-full bg-primary text-white">Voltar ao Painel Geral</Button>
                </Link>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-4 animate-in zoom-in-95 duration-300">
              <div className="p-4 bg-red-50 border border-red-100 rounded-xl">
                <div className="flex items-center gap-2 text-red-700 font-bold mb-2">
                  <AlertTriangle className="h-5 w-5" />
                  <span>Erro de Acesso Identificado</span>
                </div>
                <div className="text-sm font-mono bg-white/50 p-3 rounded border border-red-200 overflow-x-auto text-red-900">
                  {error}
                </div>
              </div>
              
              <div className="space-y-4 p-4 bg-amber-50 rounded-xl border border-amber-100">
                <div className="flex items-center gap-2 mb-2">
                  <Code className="h-4 w-4 text-amber-800" />
                  <h4 className="text-sm font-bold uppercase text-amber-800">Como corrigir agora:</h4>
                </div>
                <ol className="text-sm space-y-3 text-amber-900 list-decimal list-inside">
                  <li>No Console do Firebase, vá em <strong>Build &gt; Firestore Database</strong>.</li>
                  <li>Clique na aba <strong>Rules</strong> (Regras).</li>
                  <li>Substitua <code>allow read, write: if false;</code> por <code>allow read, write: if true;</code>.</li>
                  <li>Clique em <strong>Publish</strong> (Publicar) e aguarde 1 minuto.</li>
                </ol>
                <Button variant="outline" className="w-full border-amber-200 text-amber-800 hover:bg-amber-100 gap-2 mt-2" asChild>
                  <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer">
                    Abrir Editor de Regras <ExternalLink className="h-3 w-3" />
                  </a>
                </Button>
              </div>

              <Button onClick={testConnection} className="w-full gap-2" variant="outline">
                <RefreshCw className="h-4 w-4" /> Tentar Re-conexão
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      
      <p className="text-center text-xs text-muted-foreground mt-8">
        Manoel da Farmacia Platform • Padrão de Segurança ABNT/LGPD
      </p>
    </div>
  );
}
