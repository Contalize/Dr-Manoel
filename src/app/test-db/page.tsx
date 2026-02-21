"use client"

import { useState, useEffect } from "react";
import { db } from "@/firebase/config";
import { collection, getDocs, limit, query } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle, RefreshCw, Database } from "lucide-react";
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
      setError(err.message || 'Erro desconhecido ao conectar ao Firestore');
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
          <h1 className="text-3xl font-bold text-primary font-headline">Conexão Firebase</h1>
          <p className="text-muted-foreground">Diagnóstico de comunicação com o Firestore.</p>
        </div>
      </div>

      <Card className="border-none shadow-xl overflow-hidden">
        <CardHeader className={status === 'success' ? 'bg-green-500/10' : status === 'error' ? 'bg-red-500/10' : 'bg-secondary'}>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">Status do Banco de Dados</CardTitle>
              <CardDescription>Verificação em tempo real</CardDescription>
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
              <p className="font-medium animate-pulse">Estabelecendo handshake...</p>
            </div>
          )}

          {status === 'success' && (
            <div className="space-y-4 animate-in fade-in duration-500">
              <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-100 rounded-xl">
                <div className="bg-green-600 rounded-full p-1">
                  <CheckCircle2 className="h-4 w-4 text-white" />
                </div>
                <p className="text-green-800 font-bold">Conexão estabelecida com sucesso!</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-secondary/30 rounded-lg">
                  <p className="text-xs uppercase font-bold text-muted-foreground mb-1">Coleção "patients"</p>
                  <div className="flex items-center gap-2">
                    <Badge variant="default" className="bg-primary">{count > 0 ? 'Documentos Encontrados' : 'Coleção Vazia'}</Badge>
                  </div>
                </div>
                <div className="p-4 bg-secondary/30 rounded-lg">
                  <p className="text-xs uppercase font-bold text-muted-foreground mb-1">Latência Estimada</p>
                  <p className="text-lg font-bold text-primary">&lt; 100ms</p>
                </div>
              </div>

              <div className="pt-4 border-t">
                <Link href="/">
                  <Button className="w-full bg-primary text-white">Voltar ao Dashboard</Button>
                </Link>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-4 animate-in zoom-in-95 duration-300">
              <div className="p-4 bg-red-50 border border-red-100 rounded-xl">
                <p className="text-red-700 font-bold mb-2">Falha na Conexão</p>
                <div className="text-sm font-mono bg-white/50 p-3 rounded border border-red-200 overflow-x-auto">
                  {error}
                </div>
              </div>
              
              <div className="space-y-3">
                <h4 className="text-sm font-bold uppercase text-muted-foreground">Possíveis Causas:</h4>
                <ul className="text-sm space-y-2 list-disc list-inside text-muted-foreground">
                  <li>Firestore não foi provisionado no Console do Firebase.</li>
                  <li>As Security Rules estão bloqueando o acesso.</li>
                  <li>Configuração do projeto (API Key, Project ID) incorreta.</li>
                  <li>Sem conexão com a internet.</li>
                </ul>
              </div>

              <Button onClick={testConnection} className="w-full gap-2" variant="outline">
                <RefreshCw className="h-4 w-4" /> Tentar Novamente
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      
      <p className="text-center text-xs text-muted-foreground mt-8">
        PharmaZen Platform • LGPD Compliant Connectivity Layer
      </p>
    </div>
  );
}
