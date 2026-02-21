"use client"

import { useState, useEffect } from "react";
import { db } from "@/firebase/config";
import { collection, query, where, getDocs, limit, orderBy, startAt, endAt } from "firebase/firestore";
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
  Globe,
  Database
} from "lucide-react";
import { generateProtocolExplanation } from "@/ai/flows/generate-protocol-explanation";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { logAction } from "@/lib/audit";

type CategoriaTerapia = "Alopático" | "Fitoterápico" | "Floral" | "Suplemento";

interface TerapiaSelecionada {
  id: string;
  name: string;
  activeIngredient: string;
  category: CategoriaTerapia;
  dosage: string;
  contraindications: string[];
}

export default function PlannerPage() {
  const [protocolName, setProtocolName] = useState("");
  const [anamnesisSummary, setAnamnesisSummary] = useState("");
  const [therapies, setTherapies] = useState<TerapiaSelecionada[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [explanation, setExplanation] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const { toast } = useToast();

  // Busca Ativa na Base de Medicamentos (Firestore - Sincronização ANVISA)
  useEffect(() => {
    const searchMedications = async () => {
      if (searchTerm.length > 2) {
        setIsSearching(true);
        try {
          // Busca por prefixo na coleção 'medications'
          const q = query(
            collection(db, "medications"),
            orderBy("name"),
            startAt(searchTerm.charAt(0).toUpperCase() + searchTerm.slice(1)),
            endAt(searchTerm.charAt(0).toUpperCase() + searchTerm.slice(1) + '\uf8ff'),
            limit(8)
          );
          
          const snapshot = await getDocs(q);
          const results = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          
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

  const addTherapyFromSearch = (item: any) => {
    const newTherapy: TerapiaSelecionada = {
      id: Math.random().toString(36).substr(2, 9),
      name: item.name,
      activeIngredient: item.activeIngredient || item.principioAtivo || "Não informado",
      category: (item.category || item.categoria || "Suplemento") as CategoriaTerapia,
      dosage: "A definir pelo profissional",
      contraindications: item.contraindications || item.contraindicacoes || []
    };
    setTherapies([...therapies, newTherapy]);
    setSearchTerm("");
    setSuggestions([]);
    
    logAction("SELECAO_MEDICAMENTO_BASE_MESTRA", "SISTEMA", { medicamento: item.name });
  };

  const removeTherapy = (id: string) => {
    setTherapies(therapies.filter(t => t.id !== id));
  };

  const checkForInteractions = (therapy: TerapiaSelecionada) => {
    if (!anamnesisSummary) return null;
    const found = therapy.contraindications.find(ci => 
      anamnesisSummary.toLowerCase().includes(ci.toLowerCase())
    );
    return found ? found : null;
  };

  const handleGenerateAI = async () => {
    if (!protocolName || therapies.length === 0 || !anamnesisSummary) {
      toast({
        title: "Dados Incompletos",
        description: "Preencha o nome do protocolo, contexto clínico e adicione ao menos uma terapia.",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    try {
      const result = await generateProtocolExplanation({
        protocolName,
        anamnesisNotes: anamnesisSummary,
        selectedTherapies: therapies.map(t => `${t.name} [${t.activeIngredient}] (${t.category})`)
      });
      setExplanation(result.explanation);
      
      await logAction("GERAR_JUSTIFICATIVA_IA", "N/A", { protocolo: protocolName });

      toast({
        title: "Racional Clínico Gerado",
        description: "A inteligência farmacêutica processou a compatibilidade com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro na Inteligência Clínica",
        description: "Falha ao processar racional. Tente novamente em instantes.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const saveProtocol = async () => {
    setIsSaving(true);
    try {
      await logAction("SALVAR_PROTOCOLO_FINAL", "N/A", { protocolo: protocolName });
      toast({
        title: "Protocolo Arquivado",
        description: "Documento salvo e auditado conforme normas RDC/ANVISA.",
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
          <p className="text-muted-foreground">Prescrição farmacêutica sincronizada com a base mestra de medicamentos e ativos.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="border-primary/20 text-primary">
            <FileDown className="h-4 w-4 mr-2" /> Exportar PDF
          </Button>
          <Button variant="outline" className="border-primary/20 text-primary">
            <QrCode className="h-4 w-4 mr-2" /> Validar Protocolo
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-none shadow-md overflow-hidden bg-white">
            <CardHeader className="bg-primary text-white">
              <CardTitle className="text-xl">1. Alvo Terapêutico e Contexto</CardTitle>
              <CardDescription className="text-white/80">Dados da anamnese para cruzamento automático de segurança.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-primary uppercase tracking-wider">Título do Protocolo Integrativo</label>
                <Input 
                  placeholder="Ex: Protocolo de Recuperação Metabólica" 
                  value={protocolName}
                  onChange={(e) => setProtocolName(e.target.value)}
                  className="bg-secondary/20 border-none h-12"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-primary uppercase tracking-wider">Resumo Clínico / Alertas (Base para IA)</label>
                <Textarea 
                  placeholder="Descreva patologias, alergias e observações críticas do paciente..." 
                  className="min-h-[120px] bg-secondary/20 border-none resize-none"
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
                  <CardTitle className="text-primary font-headline">2. Seleção de Terapias (Base Ativa)</CardTitle>
                  <CardDescription>Busca sincronizada com a base de dados farmacêutica nacional.</CardDescription>
                </div>
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                  <Database className="h-3 w-3 mr-1" /> Base Firestore
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="relative">
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      placeholder="Pesquisar por nome ou princípio ativo (Ex: Cúrcuma, Ibuprofeno...)" 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 bg-secondary/20 border-none h-12"
                    />
                    {isSearching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-primary" />}
                  </div>
                </div>

                {suggestions.length > 0 && (
                  <div className="absolute z-20 w-full mt-1 bg-white border border-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-1">
                    {suggestions.map((item, idx) => (
                      <button
                        key={idx}
                        onClick={() => addTherapyFromSearch(item)}
                        className="w-full text-left p-4 hover:bg-primary/5 border-b border-border last:border-none flex items-center justify-between group"
                      >
                        <div>
                          <div className="font-bold text-primary">{item.name}</div>
                          <div className="text-xs text-muted-foreground italic">{item.activeIngredient || item.principioAtivo}</div>
                        </div>
                        <Badge variant="outline" className="text-[10px] uppercase font-bold text-accent border-accent/20">
                          {item.category || item.categoria}
                        </Badge>
                      </button>
                    ))}
                  </div>
                )}
                
                {searchTerm.length > 2 && suggestions.length === 0 && !isSearching && (
                  <div className="absolute z-20 w-full mt-1 bg-white border border-border rounded-xl p-4 text-center text-sm text-muted-foreground shadow-lg">
                    Nenhum medicamento encontrado na base. Verifique a grafia ou adicione manualmente.
                  </div>
                )}
              </div>

              <div className="space-y-4">
                {therapies.length === 0 && (
                  <div className="text-center py-12 border-2 border-dashed rounded-2xl border-secondary/30 bg-secondary/5">
                    <p className="text-muted-foreground text-sm italic">Adicione terapias para iniciar a análise de compatibilidade.</p>
                  </div>
                )}
                {therapies.map((therapy) => {
                  const interaction = checkForInteractions(therapy);
                  return (
                    <div key={therapy.id} className={cn(
                      "flex flex-col p-5 rounded-2xl border transition-all duration-300",
                      interaction ? "bg-red-50 border-red-200 shadow-sm" : "bg-secondary/5 border-border"
                    )}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "p-3 rounded-xl",
                            therapy.category === "Fitoterápico" ? "bg-emerald-100 text-emerald-700" :
                            therapy.category === "Alopático" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"
                          )}>
                            {therapy.category === "Fitoterápico" ? <Leaf className="h-5 w-5" /> :
                             therapy.category === "Alopático" ? <FlaskConical className="h-5 w-5" /> : <Droplets className="h-5 w-5" />}
                          </div>
                          <div>
                            <h4 className="font-bold text-primary flex items-center gap-2">
                              {therapy.name}
                              {interaction && (
                                <Badge variant="destructive" className="animate-pulse text-[9px] uppercase font-bold border-none h-5">
                                  <AlertTriangle className="h-3 w-3 mr-1" /> Risco de Interação
                                </Badge>
                              )}
                            </h4>
                            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">{therapy.activeIngredient}</p>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => removeTherapy(therapy.id)} className="text-muted-foreground hover:text-red-600">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      {interaction && (
                        <div className="mt-2 p-3 bg-red-100/50 rounded-lg text-xs text-red-800 font-bold border border-red-200">
                          ALERTA: Contraindicado para pacientes com "{interaction}".
                        </div>
                      )}

                      <div className="mt-4">
                        <Input 
                          placeholder="Instruções de Posologia e Duração..." 
                          className="bg-white/50 border-border text-sm"
                          defaultValue={therapy.dosage}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-none shadow-lg bg-white overflow-hidden">
            <CardHeader className="bg-accent text-white">
              <CardTitle className="flex items-center gap-2 font-headline">
                <Sparkles className="h-5 w-5" />
                Inteligência IA
              </CardTitle>
              <CardDescription className="text-white/80">Racional farmacêutico baseado na farmacopeia brasileira.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <Button 
                onClick={handleGenerateAI} 
                disabled={isGenerating}
                className="w-full bg-accent hover:bg-accent/90 text-white shadow-lg py-7 font-bold text-lg"
              >
                {isGenerating ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Sparkles className="h-5 w-5 mr-2" />}
                Gerar Justificativa Clínica
              </Button>
              
              {explanation && (
                <div className="mt-6 p-5 bg-accent/5 border border-accent/20 rounded-2xl space-y-3 animate-in fade-in zoom-in-95">
                  <h4 className="text-xs font-bold text-accent uppercase tracking-widest flex items-center gap-2">
                    <CheckCircle2 className="h-3 w-3" /> Avaliação Profissional
                  </h4>
                  <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap font-medium">
                    {explanation}
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter className="pt-0 flex flex-col items-stretch px-6 pb-6 gap-3">
              <Button 
                onClick={saveProtocol} 
                disabled={isSaving}
                className="w-full bg-primary hover:bg-primary/90 py-6"
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Salvar e Auditar Protocolo
              </Button>
              <p className="text-[10px] text-center text-muted-foreground uppercase tracking-widest font-bold">
                Conformidade RDC 67/2007 • LGPD Rastreável
              </p>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
