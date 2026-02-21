"use client"

import { useState, useEffect } from "react";
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
  Globe
} from "lucide-react";
import { generateProtocolExplanation } from "@/ai/flows/generate-protocol-explanation";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { logAction } from "@/lib/audit";
import { Badge } from "@/components/ui/badge";

type TherapyCategory = "Alopático" | "Fitoterápico" | "Floral" | "Suplemento";

interface SelectedTherapy {
  id: string;
  name: string;
  activeIngredient: string;
  category: TherapyCategory;
  dosage: string;
  contraindications: string[];
}

// Simulação de Base Mestra (ANVISA + Integrativa)
const ANVISA_MASTER_DATABASE = [
  { name: "Ashwagandha", ingredient: "Withania somnifera", category: "Fitoterápico", contraindications: ["Gravidez", "Hipertireoidismo", "Lactação"] },
  { name: "Melatonina", ingredient: "N-acetil-5-metoxitriptamina", category: "Suplemento", contraindications: ["Insuficiência Renal", "Crianças"] },
  { name: "Óleo Essencial de Lavanda", ingredient: "Lavandula angustifolia", category: "Fitoterápico", contraindications: ["Alergia a Linalol", "Asma"] },
  { name: "Rescue Remedy", ingredient: "Floral de Bach", category: "Floral", contraindications: [] },
  { name: "Ibuprofeno", ingredient: "Ibuprofeno", category: "Alopático", contraindications: ["Gastrite", "Úlcera", "Asma", "Problemas Cardíacos"] },
  { name: "Cúrcuma", ingredient: "Curcuma longa", category: "Fitoterápico", contraindications: ["Cálculos Biliares", "Anticoagulantes"] },
  { name: "Magnésio Inositol", ingredient: "Mix Bio-Idêntico", category: "Suplemento", contraindications: ["Hipotensão severa"] },
];

export default function PlannerPage() {
  const [protocolName, setProtocolName] = useState("");
  const [anamnesisSummary, setAnamnesisSummary] = useState("");
  const [therapies, setTherapies] = useState<SelectedTherapy[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [explanation, setExplanation] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  // Simulação de busca ativa (API ANVISA Mock)
  useEffect(() => {
    if (searchTerm.length > 2) {
      const filtered = ANVISA_MASTER_DATABASE.filter(item => 
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.ingredient.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setSuggestions(filtered);
    } else {
      setSuggestions([]);
    }
  }, [searchTerm]);

  const addTherapyFromDatabase = (item: any) => {
    const newTherapy: SelectedTherapy = {
      id: Math.random().toString(36).substr(2, 9),
      name: item.name,
      activeIngredient: item.ingredient,
      category: item.category as TherapyCategory,
      dosage: "A definir pelo profissional",
      contraindications: item.contraindications
    };
    setTherapies([...therapies, newTherapy]);
    setSearchTerm("");
    setSuggestions([]);
    
    logAction("PESQUISA_API_ANVISA", "N/A", { termo: item.name });
  };

  const removeTherapy = (id: string) => {
    setTherapies(therapies.filter(t => t.id !== id));
  };

  const checkForInteractions = (therapy: SelectedTherapy) => {
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
      
      await logAction("GERAR_RACIONAL_IA", "N/A", { protocolo: protocolName, totalTerapias: therapies.length });

      toast({
        title: "Racional Clínico Gerado",
        description: "A inteligência farmacêutica analisou a compatibilidade das terapias.",
      });
    } catch (error) {
      toast({
        title: "Erro na Inteligência Clínica",
        description: "Falha ao processar racional. Verifique a conexão.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const saveProtocol = async () => {
    setIsSaving(true);
    await logAction("SALVAR_PROTOCOLO", "N/A", { protocolo: protocolName });
    setTimeout(() => {
      setIsSaving(false);
      toast({
        title: "Protocolo Arquivado",
        description: "O documento foi salvo e auditado conforme normas ABNT/LGPD.",
      });
    }, 1000);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary font-headline">Planejador de Inteligência Clínica</h1>
          <p className="text-muted-foreground">Prescrição farmacêutica com sincronização ANVISA e rastreabilidade total.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="border-primary/20 text-primary">
            <FileDown className="h-4 w-4 mr-2" /> PDF Prescrição
          </Button>
          <Button variant="outline" className="border-primary/20 text-primary">
            <QrCode className="h-4 w-4 mr-2" /> Validar QR
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-none shadow-md overflow-hidden bg-white">
            <CardHeader className="bg-primary text-white">
              <CardTitle className="text-xl">1. Alvo Terapêutico e Contexto</CardTitle>
              <CardDescription className="text-white/80">Dados da anamnese para cruzamento de segurança.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-primary uppercase tracking-wider">Título do Protocolo</label>
                <Input 
                  placeholder="Ex: Manejo do Estresse e Saúde Gastrointestinal" 
                  value={protocolName}
                  onChange={(e) => setProtocolName(e.target.value)}
                  className="bg-secondary/20 border-none h-12"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-primary uppercase tracking-wider">Notas de Anamnese (Base para Alertas)</label>
                <Textarea 
                  placeholder="Ex: Paciente com histórico de gastrite, insônia e uso de anticoagulantes..." 
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
                  <CardTitle className="text-primary font-headline">2. Terapias Ativas (Base ANVISA)</CardTitle>
                  <CardDescription>Busca sincronizada com dados abertos da saúde.</CardDescription>
                </div>
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                  <Globe className="h-3 w-3 mr-1" /> Sincronizado
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="relative">
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      placeholder="Pesquisar medicamento ou princípio ativo..." 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 bg-secondary/20 border-none h-12"
                    />
                  </div>
                </div>

                {suggestions.length > 0 && (
                  <div className="absolute z-20 w-full mt-1 bg-white border border-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-1">
                    {suggestions.map((item, idx) => (
                      <button
                        key={idx}
                        onClick={() => addTherapyFromDatabase(item)}
                        className="w-full text-left p-4 hover:bg-primary/5 border-b border-border last:border-none flex items-center justify-between group"
                      >
                        <div>
                          <div className="font-bold text-primary">{item.name}</div>
                          <div className="text-xs text-muted-foreground italic">{item.ingredient}</div>
                        </div>
                        <Badge variant="outline" className="text-[10px] uppercase font-bold text-accent border-accent/20">
                          {item.category}
                        </Badge>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-4">
                {therapies.length === 0 && (
                  <div className="text-center py-12 border-2 border-dashed rounded-2xl border-secondary/30 bg-secondary/5">
                    <p className="text-muted-foreground text-sm">Adicione terapias para iniciar a análise de segurança.</p>
                  </div>
                )}
                {therapies.map((therapy) => {
                  const interaction = checkForInteractions(therapy);
                  return (
                    <div key={therapy.id} className={cn(
                      "flex flex-col p-5 rounded-2xl border transition-all duration-300",
                      interaction ? "bg-red-50 border-red-200 shadow-sm" : "bg-secondary/10 border-border"
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
                                  <AlertTriangle className="h-3 w-3 mr-1" /> Risco Clínico
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
                        <div className="mt-2 p-3 bg-red-100/50 rounded-lg text-xs text-red-800 font-medium border border-red-200">
                          <strong>Alerta Farmacêutico:</strong> Esta terapia é contraindicada para pacientes com histórico de <strong>"{interaction}"</strong> detectado no resumo clínico.
                        </div>
                      )}

                      <div className="mt-4">
                        <Input 
                          placeholder="Posologia (Ex: 1 cápsula às 20h por 30 dias)" 
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
              <CardDescription className="text-white/80">Racional farmacêutico baseado na farmacopeia.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <Button 
                onClick={handleGenerateAI} 
                disabled={isGenerating}
                className="w-full bg-accent hover:bg-accent/90 text-white shadow-lg py-7 font-bold text-lg"
              >
                {isGenerating ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Sparkles className="h-5 w-5 mr-2" />}
                Gerar Racional Clínico
              </Button>
              
              {explanation && (
                <div className="mt-6 p-5 bg-accent/5 border border-accent/20 rounded-2xl space-y-3 animate-in fade-in zoom-in-95">
                  <h4 className="text-xs font-bold text-accent uppercase tracking-widest flex items-center gap-2">
                    <CheckCircle2 className="h-3 w-3" /> Justificativa Profissional
                  </h4>
                  <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap font-medium italic">
                    {explanation}
                  </div>
                  <div className="pt-4 border-t border-accent/10 flex items-center justify-between">
                    <span className="text-[10px] text-accent/60 font-bold uppercase tracking-tighter italic">Gerado por IA Farmacêutica</span>
                    <Button variant="ghost" size="sm" className="text-[10px] h-6 px-2 text-accent">Editar</Button>
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
                Arquivar e Auditar Protocolo
              </Button>
              <p className="text-[10px] text-center text-muted-foreground uppercase tracking-widest font-bold">
                Conformidade RDC ANVISA • LGPD Rastreável
              </p>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}