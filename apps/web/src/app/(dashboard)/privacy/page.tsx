
"use client"

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  ShieldCheck, 
  History, 
  UserCheck, 
  Lock, 
  Eye, 
  FileText,
  AlertCircle
} from "lucide-react";
import { db } from "@/firebase/config";
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function PrivacyPage() {
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    const q = query(collection(db, "audit_logs"), orderBy("timestamp", "desc"), limit(20));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setLogs(snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        formattedDate: doc.data().timestamp?.toDate() 
          ? format(doc.data().timestamp.toDate(), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })
          : "Processando..."
      })));
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      <header>
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-primary p-2 rounded-lg text-white">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h1 className="text-3xl font-bold text-primary font-headline">Privacidade & Conformidade LGPD</h1>
        </div>
        <p className="text-muted-foreground">Monitoramento de governança de dados e trilha de auditoria em tempo real.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-none shadow-md bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-muted-foreground uppercase">Status de Governança</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                <Lock className="h-6 w-6" />
              </div>
              <div>
                <p className="text-2xl font-bold text-primary">Ativo</p>
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">ISO/IEC 27001</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-muted-foreground uppercase">Dados Criptografados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                <History className="h-6 w-6" />
              </div>
              <div>
                <p className="text-2xl font-bold text-primary">100%</p>
                <p className="text-xs text-muted-foreground">AES-256 em repouso</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-muted-foreground uppercase">Logs de Auditoria</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                <UserCheck className="h-6 w-6" />
              </div>
              <div>
                <p className="text-2xl font-bold text-primary">{logs.length}</p>
                <p className="text-xs text-muted-foreground">Eventos rastreáveis hoje</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 border-none shadow-md overflow-hidden">
          <CardHeader className="bg-primary text-white">
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Trilha de Auditoria (Audit Trail)
            </CardTitle>
            <CardDescription className="text-white/80">Registro imutável de acessos a dados sensíveis conforme RDC ANVISA.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary/10 border-none">
                  <TableHead className="font-bold text-primary py-4">Usuário/Profissional</TableHead>
                  <TableHead className="font-bold text-primary py-4">Ação Realizada</TableHead>
                  <TableHead className="font-bold text-primary py-4">Data/Hora</TableHead>
                  <TableHead className="font-bold text-primary py-4">ID Paciente</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-10 text-muted-foreground italic">
                      Nenhum evento registrado no momento.
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow key={log.id} className="hover:bg-slate-50 border-border">
                      <TableCell>
                        <div className="font-medium text-primary">{log.userName}</div>
                        <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">ID: {log.userId.substring(0, 8)}...</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] font-bold">
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs font-medium text-muted-foreground">
                        {log.formattedDate}
                      </TableCell>
                      <TableCell className="text-xs font-mono">
                        {log.patientId === "N/A" ? "N/A" : log.patientId.substring(0, 8)}...
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-none shadow-md bg-white">
            <CardHeader>
              <CardTitle className="text-primary flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-amber-500" />
                Dicas de Segurança
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-secondary/5 rounded-xl border border-border">
                <h4 className="font-bold text-sm mb-1">Mínimo Privilégio</h4>
                <p className="text-xs text-muted-foreground">Apenas farmacêuticos com CRM ativo podem revelar CPFs de pacientes.</p>
              </div>
              <div className="p-4 bg-secondary/5 rounded-xl border border-border">
                <h4 className="font-bold text-sm mb-1">Backup Auditado</h4>
                <p className="text-xs text-muted-foreground">Logs são espelhados em tempo real e não podem ser apagados pelo usuário.</p>
              </div>
              <Button variant="outline" className="w-full border-primary/20 text-primary">
                <FileText className="h-4 w-4 mr-2" /> Baixar Relatório ANVISA
              </Button>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md bg-primary text-white overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="h-5 w-5" />
                Direitos do Titular
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs leading-relaxed text-white/80">
                O paciente tem o direito de solicitar a exclusão de seus dados a qualquer momento, salvo obrigatoriedade legal de retenção do prontuário por 20 anos.
              </p>
              <Button className="w-full bg-white text-primary hover:bg-white/90">
                Gerenciar Consentimentos
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
