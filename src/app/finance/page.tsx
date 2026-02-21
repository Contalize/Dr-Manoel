"use client"

import { financialData } from "@/lib/mock-data";
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

const transactions = [
  { id: '1', patient: 'Ana Silva', date: '2024-05-18', amount: 350.00, status: 'Paid', method: 'Pix' },
  { id: '2', patient: 'Carlos Eduardo', date: '2024-05-19', amount: 450.00, status: 'Pending', method: 'Credit Card' },
  { id: '3', patient: 'Mariana Oliveira', date: '2024-05-19', amount: 350.00, status: 'Paid', method: 'Boleto' },
  { id: '4', patient: 'Pedro Alvares', date: '2024-05-20', amount: 1200.00, status: 'Paid', method: 'Pix' },
];

export default function FinancePage() {
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
          title="Total Revenue (Monthly)" 
          value={`R$ ${financialData.monthlyRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} 
          icon={CircleDollarSign} 
          trend={{ value: "15%", positive: true }} 
        />
        <StatCard 
          title="Pending Payments" 
          value={`R$ ${financialData.pendingPayments.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} 
          icon={CreditCard} 
        />
        <StatCard 
          title="Average Ticket" 
          value={`R$ 480,00`} 
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
                <BarChart data={financialData.cashFlow}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="name" stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR')}`}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {financialData.cashFlow.map((entry, index) => (
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
                {transactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell>
                      <div className="font-medium">{tx.patient}</div>
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
                ))}
              </TableBody>
            </Table>
            <Button variant="ghost" className="w-full mt-4 text-accent hover:bg-accent/5">View Full History</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}