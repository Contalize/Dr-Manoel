"use client"

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Stethoscope, 
  Activity, 
  Moon, 
  Apple, 
  ShieldAlert, 
  Save, 
  ArrowRight, 
  ArrowLeft,
  CheckCircle2
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";

export default function AnamnesisPage() {
  const [step, setStep] = useState(1);
  const totalSteps = 4;

  const progress = (step / totalSteps) * 100;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary font-headline">Anamnese Integrativa</h1>
          <p className="text-muted-foreground">Avaliação clínica baseada na metodologia SOAP.</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">Progresso da Sessão</p>
          <div className="flex items-center gap-3">
            <Progress value={progress} className="w-32 h-2" />
            <span className="text-sm font-bold text-primary">{Math.round(progress)}%</span>
          </div>
        </div>
      </header>

      <Card className="border-none shadow-xl overflow-hidden">
        <Tabs value={`step-${step}`} className="w-full">
          <div className="bg-secondary/50 p-2 border-b border-border">
            <TabsList className="grid grid-cols-4 bg-transparent w-full">
              <TabsTrigger value="step-1" onClick={() => setStep(1)} className="data-[state=active]:bg-white data-[state=active]:text-primary rounded-lg font-bold">
                1. Subjetivo
              </TabsTrigger>
              <TabsTrigger value="step-2" onClick={() => setStep(2)} className="data-[state=active]:bg-white data-[state=active]:text-primary rounded-lg font-bold">
                2. Objetivo
              </TabsTrigger>
              <TabsTrigger value="step-3" onClick={() => setStep(3)} className="data-[state=active]:bg-white data-[state=active]:text-primary rounded-lg font-bold">
                3. Marcadores
              </TabsTrigger>
              <TabsTrigger value="step-4" onClick={() => setStep(4)} className="data-[state=active]:bg-white data-[state=active]:text-primary rounded-lg font-bold">
                4. Avaliação
              </TabsTrigger>
            </TabsList>
          </div>

          <CardContent className="p-8">
            <TabsContent value="step-1" className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-primary/10 p-2 rounded-lg">
                  <Stethoscope className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-primary">Subjetivo (Voz do Paciente)</h3>
                  <p className="text-sm text-muted-foreground">Queixa principal, sintomas e histórico médico.</p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="font-bold text-primary">Queixa Principal</Label>
                  <Textarea placeholder="Descreva o motivo principal da consulta..." className="bg-secondary/30 border-none min-h-[100px]" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="font-bold text-primary">Nível de Dor (0-10)</Label>
                    <Slider defaultValue={[0]} max={10} step={1} className="py-4" />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold text-primary">Nível de Estresse</Label>
                    <Slider defaultValue={[5]} max={10} step={1} className="py-4" />
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="step-2" className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-accent/10 p-2 rounded-lg">
                  <Activity className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-primary">Objetivo (Achados Clínicos)</h3>
                  <p className="text-sm text-muted-foreground">Exame físico e resultados laboratoriais.</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label>Pressão Arterial</Label>
                  <Input placeholder="120/80 mmHg" className="bg-secondary/30 border-none" />
                </div>
                <div className="space-y-2">
                  <Label>Frequência Cardíaca</Label>
                  <Input placeholder="72 bpm" className="bg-secondary/30 border-none" />
                </div>
                <div className="space-y-2">
                  <Label>Peso (kg)</Label>
                  <Input placeholder="75.5" className="bg-secondary/30 border-none" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="font-bold text-primary">Notas do Exame Físico</Label>
                <Textarea placeholder="Observe sinais visíveis, condição da pele, palpação abdominal..." className="bg-secondary/30 border-none min-h-[100px]" />
              </div>
            </TabsContent>

            <TabsContent value="step-3" className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-primary/10 p-2 rounded-lg text-primary">
                  <Moon className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-primary">Marcadores Integrativos</h3>
                  <p className="text-sm text-muted-foreground">Saúde intestinal, qualidade do sono e estilo de vida.</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4 p-4 rounded-xl bg-secondary/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Apple className="h-4 w-4 text-green-600" />
                    <h4 className="font-bold text-sm uppercase tracking-wider text-primary">Saúde Intestinal</h4>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Frequência de Evacuação</Label>
                    <Input placeholder="ex: Diária, 2x por semana" className="bg-white border-none text-sm" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Escala de Bristol</Label>
                    <Input placeholder="Tipo 1-7" className="bg-white border-none text-sm" />
                  </div>
                </div>
                <div className="space-y-4 p-4 rounded-xl bg-secondary/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Moon className="h-4 w-4 text-blue-600" />
                    <h4 className="font-bold text-sm uppercase tracking-wider text-primary">Ritmo Circadiano</h4>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Duração do Sono (hrs)</Label>
                    <Input placeholder="7.5" className="bg-white border-none text-sm" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Energia Matinal (1-10)</Label>
                    <Input placeholder="8" className="bg-white border-none text-sm" />
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="step-4" className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-accent/10 p-2 rounded-lg text-accent">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-primary">Avaliação e Plano</h3>
                  <p className="text-sm text-muted-foreground">Raciocínio clínico e estratégia terapêutica.</p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="font-bold text-primary">Diagnóstico / Avaliação Integrativa</Label>
                  <Textarea placeholder="Resuma seu raciocínio clínico com base nos dados..." className="bg-secondary/30 border-none min-h-[120px]" />
                </div>
                <div className="space-y-2">
                  <Label className="font-bold text-primary">Estratégia Proposta (O Plano)</Label>
                  <Textarea placeholder="Próximos passos: mudanças de estilo de vida, suplementos..." className="bg-secondary/30 border-none min-h-[120px]" />
                </div>
              </div>
            </TabsContent>
          </CardContent>

          <CardFooter className="p-8 border-t bg-secondary/10 flex justify-between">
            <Button 
              variant="outline" 
              onClick={() => setStep(prev => Math.max(1, prev - 1))}
              disabled={step === 1}
              className="border-primary/20 text-primary"
            >
              <ArrowLeft className="h-4 w-4 mr-2" /> Passo Anterior
            </Button>
            
            {step < totalSteps ? (
              <Button 
                onClick={() => setStep(prev => Math.min(totalSteps, prev + 1))}
                className="bg-primary text-white"
              >
                Próximo Passo <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button className="bg-accent text-white hover:bg-accent/90 px-8">
                <Save className="h-4 w-4 mr-2" /> Finalizar Anamnese
              </Button>
            )}
          </CardFooter>
        </Tabs>
      </Card>
    </div>
  );
}