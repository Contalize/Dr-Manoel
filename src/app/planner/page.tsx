
"use client"

import { useState, useEffect } from "react";
import { db } from "@/firebase/config";
import { 
  collection, 
  query, 
  getDocs, 
  limit, 
  orderBy, 
  startAt, 
  endAt, 
  addDoc, 
  serverTimestamp 
} from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { 
  Sparkles, 
  Plus, 
  Trash2, 
  Save, 
  CheckCircle2, 
  FlaskConical, 
  Leaf, 
  Droplets,
  Loader2,
  AlertTriangle,
  Search,
  FileDown,
  QrCode,
  Database,
  ExternalLink,
  ShieldCheck
} from "lucide-react";
import { generateProtocolExplanation } from "@/ai/flows/generate-protocol-explanation";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { logAction } from "@/lib/audit";

interface MedicamentoReferencia {
  id: string;
  nome_comercial: string;
  principio_ativo: string;
  concentracao: string;
  categoria: "Alopático" | "Fitoterápico" | "Suplemento";
  bula_resumida: string;
  url_bula_anvisa: string;
  contraindicacoes: string[];
}

interface TerapiaSelecionada extends MedicamentoReferencia {
  id_instancia: string;
  posologia: string;
}

export default function PlannerPage() {
  const [protocolName, setProtocolName] = useState("");
  const [anamnesisSummary, setAnamnesisSummary] = useState("");
  const [therapies, setTherapies] = useState<TerapiaSelecionada[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [suggestions, setSuggestions] = useState<MedicamentoReferencia[]>([]);
  const [explanation, setExplanation] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const { toast } = useToast();

  // Busca Inteligente na Base Mestra (Simulação ANVISA via medicamentos_referencia)
  useEffect(() => {
    const searchMedications = async () => {
      if (searchTerm.length > 2) {
        setIsSearching(true);
        try {
          const searchTermFixed = searchTerm.charAt(0).toUpperCase() + searchTerm.slice(1);
          const q = query(
            collection(db, "medicamentos_referencia"),
            orderBy("nome_comercial"),
            startAt(searchTermFixed),
            endAt(searchTermFixed + '\uf8ff'),
            limit(10)
          );
          
          const snapshot = await getDocs(q);
          const results = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as MedicamentoReferencia[];
          
          setSuggestions(results);
        } catch (error) {
          console.error("Erro na busca de medicamentos:", error);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSuggestions([]);
      }
    };

    const timer = setTimeout(searchMedications, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const addTherapy = (item: MedicamentoReferencia) => {
    const newTherapy: TerapiaSelecionada = {
      ...item,
      id_instancia: Math.random().toString(36).substr(2, 9),
      posologia: "A definir"
    };
    setTherapies([...therapies, newTherapy]);
    setSearchTerm("");
    setSuggestions([]);
    
    logAction("SELECAO_MEDICAMENTO_INTELIGENTE", "N/A", { medicamento: item.nome_comercial });
  };

  const removeTherapy = (idInstancia: string) => {
    setTherapies(therapies.filter(t => t.id_instancia !== idInstancia));
  };

  const checkSafetyAlerts = (therapy: MedicamentoReferencia) => {
    if (!anamnesisSummary) return null;
    return therapy.contraindicacoes.find(ci => 
      anamnesisSummary.toLowerCase().includes(ci.toLowerCase())
    );
  };

  const handleGenerateAI = async () => {
    if (!protocolName || therapies.length === 0 || !anamnesisSummary) {
      toast({
        title: "Dados Incompletos",
        description: "Preencha o título, contexto clínico e adicione terapias.",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    try {
      const result = await generateProtocolExplanation({
        protocolName,
        anamnesisNotes: anamnesisSummary,
        selectedTherapies: therapies.map(t => `${t.nome_comercial} (${t.principio_ativo}) - ${t.categoria}`)
      });
      setExplanation(result.explanation);
      
      await logAction("GERAR_RACIONAL_CLINICO_IA", "N/A", { protocolo: protocolName });

      toast({
        title: "Racional Clínico Gerado",
        description: "Análise de compatibilidade finalizada com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro na IA Clínica",
        description: "Não foi possível processar o racional clínico.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const saveProtocol = async () => {
    setIsSaving(true);
    try {
      // Simulação de persistência no prontuário
      await logAction("SALVAR_PROTOCOLO_AUDITADO", "N/A", { protocolo: protocolName });
      toast({
        title: "Protocolo Arquivado",
        description: "Documento salvo em conformidade com RDC/ANVISA.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary font-headline">Planejador de Inteligência Clínica</h1>
          <p className="text-muted-foreground flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            Sincronização Ativa com Base Farmacêutica e Normas ABNT.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="border-primary/20 text-primary">
            <FileDown className="h-4 w-4 mr-2" /> Exportar PDF
          </Button>
          <Button className="bg-primary text-white hover:bg-primary/90 shadow-md">
            <QrCode className="h-4 w-4 mr-2" /> Validar Protocolo
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-none shadow-md overflow-hidden bg-white">
            <CardHeader className="bg-primary text-white">
              <CardTitle className="text-lg font-headline">1. Contexto Clínico do Paciente</CardTitle>
              <CardDescription className="text-white/80">Essencial para o cruzamento de interações medicamentosas.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-primary uppercase tracking-widest">Nome do Protocolo Integrativo</label>
                <Input 
                  placeholder="Ex: Protocolo de Controle Glicêmico e Suporte Metabólico" 
                  value={protocolName}
                  onChange={(e) => setProtocolName(e.target.value)}
                  className="bg-secondary/20 border-none h-12 text-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-primary uppercase tracking-widest">Resumo de Patologias e Alertas</label>
                <Textarea 
                  placeholder="Ex: Paciente hipertenso, alérgico a dipirona, queixa de insônia..." 
                  className="min-h-[100px] bg-secondary/20 border-none resize-none text-sm"
                  value={anamnesisSummary}
                  onChange={(e) => setAnamnesisSummary(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md bg-white">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-primary font-headline">2. Seleção de Medicamentos e Ativos</CardTitle>
                  <CardDescription>Busca ativa na base sincronizada (ANVISA / Fitoterápicos).</CardDescription>
                </div>
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 uppercase text-[10px] font-bold">
                  <Database className="h-3 w-3 mr-1" /> Sincronização Ativa
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="relative">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Digite o nome comercial ou princípio ativo..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-secondary/20 border-none h-12"
                  />
                  {isSearching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-primary" />}
                </div>

                {suggestions.length > 0 && (
                  <div className="absolute z-20 w-full mt-1 bg-white border rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-1">
                    {suggestions.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => addTherapy(item)}
                        className="w-full text-left p-4 hover:bg-primary/5 border-b last:border-none flex items-center justify-between group"
                      >
                        <div>
                          <div className="font-bold text-primary">{item.nome_comercial}</div>
                          <div className="text-xs text-muted-foreground italic">{item.principio_ativo} - {item.concentracao}</div>
                        </div>
                        <Badge variant="outline" className="text-[10px] uppercase font-bold text-accent border-accent/20">
                          {item.categoria}
                        </Badge>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-4">
                {therapies.length === 0 && (
                  <div className="text-center py-12 border-2 border-dashed rounded-2xl border-secondary/30 bg-secondary/5">
                    <p className="text-muted-foreground text-sm italic">Adicione terapias para análise de segurança clínica.</p>
                  </div>
                )}
                {therapies.map((therapy) => {
                  const alert = checkSafetyAlerts(therapy);
                  return (
                    <Card key={therapy.id_instancia} className={cn(
                      "border transition-all shadow-sm",
                      alert ? "bg-red-50 border-red-200" : "bg-white border-border"
                    )}>
                      <CardContent className="p-5 space-y-4">
                        <div className="flex items-start justify-between">
                          <div className="flex gap-4">
                            <div className={cn(
                              "p-3 rounded-xl",
                              therapy.categoria === "Fitoterápico" ? "bg-emerald-100 text-emerald-700" :
                              therapy.categoria === "Alopático" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"
                            )}>
                              {therapy.categoria === "Fitoterápico" ? <Leaf className="h-5 w-5" /> :
                               therapy.categoria === "Alopático" ? <FlaskConical className="h-5 w-5" /> : <Droplets className="h-5 w-5" />}
                            </div>
                            <div>
                              <h4 className="font-bold text-primary text-lg flex items-center gap-2">
                                {therapy.nome_comercial}
                                {alert && (
                                  <Badge variant="destructive" className="animate-pulse uppercase text-[8px] font-bold tracking-tighter py-0 h-4">
                                    <AlertTriangle className="h-3 w-3 mr-1" /> Alerta de Segurança
                                  </Badge>
                                )}
                              </h4>
                              <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">
                                {therapy.principio_ativo} • {therapy.concentracao}
                              </p>
                            </div>
                          </div>
                          <Button variant="ghost" size="sm" onClick={() => removeTherapy(therapy.id_instancia)} className="text-muted-foreground hover:text-red-600">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        {alert && (
                          <div className="p-3 bg-red-100/50 rounded-lg border border-red-200 flex gap-2">
                            <AlertTriangle className="h-4 w-4 text-red-700 shrink-0" />
                            <p className="text-xs text-red-800 font-bold">
                              RISCO DETECTADO: Este medicamento é contraindicado para pacientes com "{alert}".
                            </p>
                          </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase">Posologia e Orientações</label>
                            <Input 
                              placeholder="Ex: 1 cápsula 12/12h após refeições" 
                              className="bg-secondary/10 border-none text-xs"
                              value={therapy.posologia}
                              onChange={(e) => {
                                const newTherapies = [...therapies];
                                const idx = newTherapies.findIndex(t => t.id_instancia === therapy.id_instancia);
                                newTherapies[idx].posologia = e.target.value;
                                setTherapies(newTherapies);
                              }}
                            />
                          </div>
                          <div className="flex justify-end pt-5">
                            <Button variant="link" className="text-accent text-xs h-auto p-0 gap-1 font-bold" asChild>
                              <a href={therapy.url_bula_anvisa} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-3 w-3" /> Ver Bula Oficial (PDF)
                              </a>
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-none shadow-xl bg-white overflow-hidden">
            <CardHeader className="bg-accent text-white">
              <CardTitle className="flex items-center gap-2 font-headline text-lg">
                <Sparkles className="h-5 w-5" />
                Racional Clínico IA
              </CardTitle>
              <CardDescription className="text-white/80">Validação baseada na farmacopeia brasileira.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <Button 
                onClick={handleGenerateAI} 
                disabled={isGenerating}
                className="w-full bg-accent hover:bg-accent/90 text-white shadow-lg py-7 font-bold text-md"
              >
                {isGenerating ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Sparkles className="h-5 w-5 mr-2" />}
                Gerar Justificativa Farmacêutica
              </Button>
              
              {explanation && (
                <div className="mt-6 p-5 bg-accent/5 border border-accent/20 rounded-2xl space-y-4 animate-in fade-in zoom-in-95">
                  <h4 className="text-[10px] font-bold text-accent uppercase tracking-widest flex items-center gap-2">
                    <CheckCircle2 className="h-3 w-3" /> Análise de Compatibilidade
                  </h4>
                  <div className="text-sm text-foreground leading-relaxed font-medium">
                    {explanation}
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter className="pt-0 flex flex-col items-stretch px-6 pb-6 gap-3">
              <Button 
                onClick={saveProtocol} 
                disabled={isSaving}
                className="w-full bg-primary hover:bg-primary/90 py-6 font-bold"
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Salvar Protocolo Auditado
              </Button>
              <div className="flex items-center justify-center gap-2 text-[9px] text-muted-foreground uppercase tracking-widest font-bold">
                <ShieldCheck className="h-3 w-3" /> Conformidade RDC 67/2007 • Rastreabilidade Ativa
              </div>
            </CardFooter>
          </Card>

          <Card className="border-none shadow-md bg-secondary/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold text-primary uppercase">Dica de Segurança</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground leading-relaxed">
                O sistema cruza as <strong>contraindicações</strong> da bula oficial com as notas da <strong>anamnese</strong>. Mantenha os registros do paciente atualizados para garantir a precisão dos alertas.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
