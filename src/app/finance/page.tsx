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
  { name: 'Feb', value: 21000 },
  { name: 'Mar', value: 24500 },
  { name: 'Apr', value: 19500 },
];

export default function FinancePage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState({
    monthlyRevenue: 0,
    pendingPayments: 0,
    avgTicket: 0
  });

  useEffect(() => {
    const q = query(collection(db, "transactions"), orderBy("date", "desc"), limit(10));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const txs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Transaction[];
      setTransactions(txs);

      // Simple stat calculation from visible transactions for demo
      const total = txs.reduce((acc, tx) => acc + (tx.status === 'Paid' ? tx.amount : 0), 0);
      const pending = txs.reduce((acc, tx) => acc + (tx.status === 'Pending' ? tx.amount : 0), 0);
      setStats({
        monthlyRevenue: total,
        pendingPayments: pending,
        avgTicket: txs.length > 0 ? total / txs.length : 0
      });
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary font-headline">Financial Control</h1>
          <p className="text-muted-foreground">Track revenue, pending payments, and clinic cash flow.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="border-primary/20 text-primary">
            <Download className="h-4 w-4 mr-2" /> Export Report
          </Button>
          <Button className="bg-accent text-white hover:bg-accent/90">
            <PlusCircle className="h-4 w-4 mr-2" /> Record Expense
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          title="Total Revenue" 
          value={`R$ ${stats.monthlyRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} 
          icon={CircleDollarSign} 
          trend={{ value: "15%", positive: true }} 
        />
        <StatCard 
          title="Pending Payments" 
          value={`R$ ${stats.pendingPayments.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} 
          icon={CreditCard} 
        />
        <StatCard 
          title="Average Ticket" 
          value={`R$ ${stats.avgTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} 
          icon={ArrowUpRight} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="border-none shadow-md">
          <CardHeader>
            <CardTitle className="text-primary font-headline">Cash Flow Forecast (BRL)</CardTitle>
            <CardDescription>Monthly revenue trends for the current year.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mockCashFlow}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="name" stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR')}`}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {mockCashFlow.map((entry, index) => (
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
            <CardTitle className="text-primary font-headline">Recent Transactions</CardTitle>
            <CardDescription>Latest consultation payments and invoices.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-bold">Patient</TableHead>
                  <TableHead className="font-bold">Amount</TableHead>
                  <TableHead className="font-bold">Status</TableHead>
                  <TableHead className="text-right font-bold">Method</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                      No recent transactions recorded.
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
                          {tx.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-xs font-semibold text-muted-foreground uppercase">{tx.method}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            <Button variant="ghost" className="w-full mt-4 text-accent hover:bg-accent/5">View Full History</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
