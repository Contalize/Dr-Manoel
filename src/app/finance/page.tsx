"use client"

import { useState, useEffect } from "react";
import { db } from "@/firebase/config";
import { collection, onSnapshot, query, orderBy, limit } from "firebase/firestore";
import { StatCard } from "@/components/dashboard/StatCard";
import { 
  ArrowUpRight, 
  CreditCard, 
  CircleDollarSign,
  Download,
  PlusCircle
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from "recharts";
import { Button } from "@/components/ui/button";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { NewTransactionDialog } from "@/components/finance/NewTransactionDialog";

interface Transaction {
  id: string;
  patientName: string;
  amount: number;
  status: string;
  method: string;
  date: string;
}

const mockCashFlow = [
  { name: 'Jan', value: 18000 },
  { name: 'Fev', value: 21000 },
  { name: 'Mar', value: 24500 },
  { name: 'Abr', value: 19500 },
];

export default function FinancePage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState({
    monthlyRevenue: 0,
    pendingPayments: 0,
    avgTicket: 0
  });
  const [cashFlowData, setCashFlowData] = useState<{ name: string; value: number }[]>([]);

  useEffect(() => {
    const q = query(collection(db, "transactions"), orderBy("createdAt", "desc"), limit(50));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const txs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Transaction[];
      setTransactions(txs);

      const total = txs.reduce((acc, tx) => acc + (tx.status === 'Paid' ? tx.amount : 0), 0);
      const pending = txs.reduce((acc, tx) => acc + (tx.status === 'Pending' ? tx.amount : 0), 0);
      setStats({
        monthlyRevenue: total,
        pendingPayments: pending,
        avgTicket: txs.length > 0 ? total / txs.length : 0
      });

      // Calcular dados reais para o gráfico de fluxo de caixa (mock substituído por real data)
      const flowData = txs.reduce((acc, tx) => {
        if (tx.status === 'Paid') {
          // Extrai mês no formato 'MM/YYYY' ou 'YYYY-MM-DD' e agrupa
          const dateStr = typeof tx.date === 'string' ? tx.date : new Date().toISOString();
          // Tentar formatar a string de data (assumindo pt-BR 'DD/MM/YYYY' ou ISO 'YYYY-MM-DD')
          let monthName = "Mês atual";
          if (dateStr.includes('/')) {
            const parts = dateStr.split('/');
            if (parts.length >= 2) monthName = `Mês ${parts[1]}`;
          } else if (dateStr.includes('-')) {
            const parts = dateStr.split('-');
            if (parts.length >= 2) monthName = `Mês ${parts[1]}`;
          }

          if (!acc[monthName]) acc[monthName] = 0;
          acc[monthName] += tx.amount;
        }
        return acc;
      }, {} as Record<string, number>);

      const chartData = Object.keys(flowData).map(key => ({
        name: key,
        value: flowData[key]
      }));
      setCashFlowData(chartData.length > 0 ? chartData : mockCashFlow); // Fallback para mock apenas se estiver completamente vazio para não quebrar UI de demonstração
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary font-headline">Controle Financeiro</h1>
          <p className="text-muted-foreground">Monitore receitas, pagamentos pendentes e o fluxo de caixa da clínica.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="border-primary/20 text-primary">
            <Download className="h-4 w-4 mr-2" /> Exportar Relatório
          </Button>
          <NewTransactionDialog />
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          title="Receita Total" 
          value={`R$ ${stats.monthlyRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} 
          icon={CircleDollarSign} 
          trend={{ value: "15%", positive: true }} 
        />
        <StatCard 
          title="Pagamentos Pendentes" 
          value={`R$ ${stats.pendingPayments.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} 
          icon={CreditCard} 
        />
        <StatCard 
          title="Ticket Médio" 
          value={`R$ ${stats.avgTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} 
          icon={ArrowUpRight} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="border-none shadow-md">
          <CardHeader>
            <CardTitle className="text-primary font-headline">Previsão de Fluxo de Caixa (BRL)</CardTitle>
            <CardDescription>Tendências de receita mensal para o ano atual.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cashFlowData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="name" stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR')}`}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {cashFlowData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 2 ? "#D4AF37" : "#2D5A27"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md">
          <CardHeader>
            <CardTitle className="text-primary font-headline">Transações Recentes</CardTitle>
            <CardDescription>Últimos pagamentos de consultas e faturas.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-bold">Paciente</TableHead>
                  <TableHead className="font-bold">Valor</TableHead>
                  <TableHead className="font-bold">Status</TableHead>
                  <TableHead className="text-right font-bold">Método</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                      Nenhuma transação recente registrada.
                    </TableCell>
                  </TableRow>
                ) : (
                  transactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell>
                        <div className="font-medium">{tx.patientName}</div>
                        <div className="text-xs text-muted-foreground">{tx.date}</div>
                      </TableCell>
                      <TableCell className="font-bold">
                        R$ {tx.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>
                        <Badge variant={tx.status === 'Paid' ? 'default' : 'secondary'} className={cn(
                          "text-[10px] uppercase font-bold",
                          tx.status === 'Paid' ? "bg-green-100 text-green-700 border-none" : "bg-amber-100 text-amber-700 border-none"
                        )}>
                          {tx.status === 'Paid' ? 'Pago' : 'Pendente'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-xs font-semibold text-muted-foreground uppercase">{tx.method}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            <Button variant="ghost" className="w-full mt-4 text-accent hover:bg-accent/5">Ver Histórico Completo</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}