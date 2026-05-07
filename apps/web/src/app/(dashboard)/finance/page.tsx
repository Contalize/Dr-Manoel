"use client"

import { useState, useEffect } from "react";
import { db } from "@/firebase/config";
import { collection, onSnapshot, query, where, orderBy, doc, updateDoc, addDoc, serverTimestamp } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { logAction } from "@/lib/audit";
import { StatCard } from "@/components/dashboard/StatCard";
import { 
  ArrowUpRight, 
  CreditCard, 
  CircleDollarSign,
  Download,
  PlusCircle,
  Loader2,
  Plus
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


// Padrão de centavos (IEEE 754): amount é sempre um inteiro em centavos.
// Use sempre esta função para exibir — nunca acesse tx.amount diretamente na UI.
function formatCurrency(centavos: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    centavos / 100
  );
}

export default function FinancePage() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState({
    monthlyRevenue: 0,
    pendingPayments: 0,
    avgTicket: 0
  });

  const [cashFlow, setCashFlow] = useState<Array<{ name: string; receitas: number; despesas: number }>>([]);

  const { toast } = useToast();
  const [isTransactionDialogOpen, setIsTransactionDialogOpen] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [txForm, setTxForm] = useState({
    description: "",
    patientName: "",
    amount: "",
    type: "Receita" as "Receita" | "Despesa",
    method: "Pix" as "Pix" | "Dinheiro" | "Cartão de Crédito" | "Cartão de Débito" | "Convênio",
    status: "Paid" as "Paid" | "Pending"
  });

  const handleAddTransaction = async () => {
    if (!txForm.description || !txForm.amount) {
      toast({ title: "Preencha descrição e valor", variant: "destructive" });
      return;
    }

    const numericAmount = parseFloat(txForm.amount.replace(',', '.'));
    if (isNaN(numericAmount) || numericAmount <= 0) {
      toast({ title: "Valor inválido", variant: "destructive" });
      return;
    }

    // Converter para centavos antes de salvar (padrão IEEE 754)
    const amountInCents = Math.round(numericAmount * 100);

    setIsSubmitting(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      await addDoc(collection(db, "transactions"), {
        description: txForm.description,
        patientName: txForm.patientName || txForm.description,
        amount: txForm.type === "Despesa" ? -amountInCents : amountInCents,
        type: txForm.type,
        method: txForm.method,
        status: txForm.status,
        date: today,
        createdAt: serverTimestamp(),
        createdBy: user?.email || "Profissional",
        createdByUid: user?.uid || ""
      });

      await logAction("LANCAR_TRANSACAO_FINANCEIRA", "financial", {
        descricao: txForm.description,
        valorCentavos: amountInCents,
        tipo: txForm.type
      });

      toast({
        title: "Transação registrada",
        description: `${txForm.type}: ${formatCurrency(amountInCents)}`
      });

      setTxForm({ description: "", patientName: "", amount: "", type: "Receita", method: "Pix", status: "Paid" });
      setIsTransactionDialogOpen(false);
    } catch (error) {
      toast({ title: "Erro ao registrar transação", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmPayment = async (txId: string) => {
    setConfirmingId(txId);
    try {
      await updateDoc(doc(db, "transactions", txId), { status: "Paid", method: "Confirmado" });
      await logAction("CONFIRMAR_PAGAMENTO", txId, {});
      toast({ title: "Pagamento confirmado" });
    } catch {
      toast({ title: "Erro ao confirmar pagamento", variant: "destructive" });
    } finally {
      setConfirmingId(null);
    }
  };

  useEffect(() => {
    if (!user?.uid) return;
    const q = query(
      collection(db, "transactions"),
      where("createdByUid", "==", user.uid),
      orderBy("date", "desc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const txs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Transaction[];
      
      // Exibir apenas as 10 mais recentes na tabela
      setTransactions(txs.slice(0, 10));

      // Calcular estatísticas
      const paid = txs.filter(tx => tx.status === 'Paid');
      const pending = txs.filter(tx => tx.status === 'Pending');
      const total = paid.reduce((acc, tx) => acc + (tx.amount > 0 ? tx.amount : 0), 0);
      const totalPending = pending.reduce((acc, tx) => acc + Math.abs(tx.amount), 0);
      setStats({
        monthlyRevenue: total,
        pendingPayments: totalPending,
        avgTicket: paid.length > 0 ? total / paid.length : 0
      });

      // Construir cashFlow dos últimos 6 meses
      const now = new Date();
      const months = Array.from({ length: 6 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
        return {
          key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
          name: d.toLocaleDateString('pt-BR', { month: 'short' })
        };
      });

      const flow = months.map(month => {
        const monthTxs = txs.filter(tx => tx.date?.startsWith(month.key));
        return {
          name: month.name,
          receitas: monthTxs.filter(tx => tx.amount > 0).reduce((s, tx) => s + tx.amount, 0),
          despesas: Math.abs(monthTxs.filter(tx => tx.amount < 0).reduce((s, tx) => s + tx.amount, 0))
        };
      });

      setCashFlow(flow);
    });
    return () => unsubscribe();
  }, [user?.uid]);

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
          <Dialog open={isTransactionDialogOpen} onOpenChange={setIsTransactionDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-accent text-white hover:bg-accent/90">
                <PlusCircle className="h-4 w-4 mr-2" /> Lançar Transação
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[460px] border-none shadow-2xl">
              <DialogHeader>
                <DialogTitle className="text-primary font-headline text-2xl">Nova Transação</DialogTitle>
                <DialogDescription>Registre uma receita ou despesa da clínica.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-3">
                  {(['Receita', 'Despesa'] as const).map(type => (
                    <button
                      key={type}
                      onClick={() => setTxForm(prev => ({ ...prev, type }))}
                      className={cn(
                        "py-3 rounded-xl text-sm font-bold border-2 transition-all",
                        txForm.type === type
                          ? type === 'Receita'
                            ? "bg-emerald-600 text-white border-emerald-600"
                            : "bg-red-500 text-white border-red-500"
                          : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                      )}
                    >
                      {type === 'Receita' ? '↑ Receita' : '↓ Despesa'}
                    </button>
                  ))}
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-slate-400">Descrição / Serviço *</Label>
                  <Input
                    value={txForm.description}
                    onChange={(e) => setTxForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Ex: Consulta integrativa, soroterapia..."
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-slate-400">Paciente (opcional)</Label>
                  <Input
                    value={txForm.patientName}
                    onChange={(e) => setTxForm(prev => ({ ...prev, patientName: e.target.value }))}
                    placeholder="Nome do paciente"
                    className="h-11"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-slate-400">Valor (R$) *</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={txForm.amount}
                      onChange={(e) => setTxForm(prev => ({ ...prev, amount: e.target.value }))}
                      placeholder="0,00"
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-slate-400">Status</Label>
                    <Select
                      value={txForm.status}
                      onValueChange={(v: "Paid" | "Pending") => setTxForm(prev => ({ ...prev, status: v }))}
                    >
                      <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Paid">Pago / Recebido</SelectItem>
                        <SelectItem value="Pending">Pendente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-slate-400">Forma de Pagamento</Label>
                  <Select
                    value={txForm.method}
                    onValueChange={(v) => setTxForm(prev => ({ ...prev, method: v as typeof txForm.method }))}
                  >
                    <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pix">Pix</SelectItem>
                      <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                      <SelectItem value="Cartão de Crédito">Cartão de Crédito</SelectItem>
                      <SelectItem value="Cartão de Débito">Cartão de Débito</SelectItem>
                      <SelectItem value="Convênio">Convênio</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsTransactionDialogOpen(false)}>Cancelar</Button>
                <Button
                  onClick={handleAddTransaction}
                  disabled={isSubmitting}
                  className="bg-primary text-white hover:bg-primary/90"
                >
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <PlusCircle className="h-4 w-4 mr-2" />}
                  Registrar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Receita Total"
          value={formatCurrency(stats.monthlyRevenue)}
          icon={CircleDollarSign}
          trend={{ value: "15%", positive: true }}
        />
        <StatCard
          title="Pagamentos Pendentes"
          value={formatCurrency(stats.pendingPayments)}
          icon={CreditCard}
        />
        <StatCard
          title="Ticket Médio"
          value={formatCurrency(stats.avgTicket)}
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
                <BarChart data={cashFlow}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="name" stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis
                    stroke="#94A3B8"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `R$${(v / 100 / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      formatCurrency(value),
                      name === 'receitas' ? 'Receitas' : 'Despesas'
                    ]}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Bar dataKey="receitas" fill="#2D5A27" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="despesas" fill="#D4AF37" radius={[4, 4, 0, 0]} opacity={0.7} />
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
                  <TableHead className="text-right font-bold">Ação</TableHead>
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
                      <TableCell className={cn("font-bold", tx.amount < 0 ? "text-red-600" : "text-emerald-700")}>
                        {formatCurrency(tx.amount)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={tx.status === 'Paid' ? 'default' : 'secondary'} className={cn(
                          "text-[10px] uppercase font-bold",
                          tx.status === 'Paid' ? "bg-green-100 text-green-700 border-none" : "bg-amber-100 text-amber-700 border-none"
                        )}>
                          {tx.status === 'Paid' ? 'Pago' : 'Pendente'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {tx.status === 'Pending' ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-[10px] font-bold border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                            onClick={() => handleConfirmPayment(tx.id)}
                            disabled={confirmingId === tx.id}
                          >
                            {confirmingId === tx.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "✓ Confirmar"}
                          </Button>
                        ) : (
                          <span className="text-xs font-semibold text-muted-foreground uppercase">{tx.method}</span>
                        )}
                      </TableCell>
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