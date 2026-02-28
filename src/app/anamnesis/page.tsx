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
  Save, 
  ArrowRight, 
  ArrowLeft,
  CheckCircle2
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";

export default function AnamnesisPage() {
  const [step, setStep] = useState(1);
  const [painIntensity, setPainIntensity] = useState(0);
  const [stressLevel, setStressLevel] = useState(5);
  const totalSteps = 4;

  const progress = (step / totalSteps) * 100;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary font-headline">Anamnese Integrativa</h1>
          <p className="text-muted-foreground">Avaliação clínica baseada na metodologia SOAP (Subjetivo, Objetivo, Avaliação, Plano).</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">Status da Sessão</p>
          <div className="flex items-center gap-3">
            <Progress value={progress} className="w-32 h-2" />
            <span className="text-sm font-bold text-primary">{Math.round(progress)}%</span>
          </div>
        </div>
      </header>

      <Card className="border-none shadow-xl overflow-hidden">
        <Tabs value={`step-${step}`} className="w-full">
          <div className="bg-secondary/10 p-2 border-b">
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
            <TabsContent value="step-1" className="space-y-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-primary/10 p-2 rounded-lg"><Stethoscope className="h-6 w-6 text-primary" /></div>
                <div>
                  <h3 className="text-lg font-bold text-primary">Subjetivo (Relato do Paciente)</h3>
                  <p className="text-sm text-muted-foreground">Queixas principais, sintomas e histórico de saúde.</p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="font-bold text-primary">Queixa Principal</Label>
                  <Textarea placeholder="Descreva detalhadamente os sintomas relatados..." className="bg-secondary/20 border-none min-h-[100px]" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center mb-1">
                      <Label className="font-bold text-primary">Intensidade da Dor (0-10)</Label>
                      <span className="text-xs font-bold bg-primary/10 text-primary px-2 py-1 rounded-md">{painIntensity}/10</span>
                    </div>
                    <Slider 
                      value={[painIntensity]} 
                      onValueChange={(val) => setPainIntensity(val[0])} 
                      max={10} 
                      step={1} 
                      className="py-4" 
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center mb-1">
                      <Label className="font-bold text-primary">Nível de Estresse Percebido</Label>
                      <span className="text-xs font-bold bg-primary/10 text-primary px-2 py-1 rounded-md">{stressLevel}/10</span>
                    </div>
                    <Slider 
                      value={[stressLevel]} 
                      onValueChange={(val) => setStressLevel(val[0])} 
                      max={10} 
                      step={1} 
                      className="py-4" 
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="step-2" className="space-y-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-accent/10 p-2 rounded-lg"><Activity className="h-6 w-6 text-accent" /></div>
                <div>
                  <h3 className="text-lg font-bold text-primary">Objetivo (Dados Clínicos)</h3>
                  <p className="text-sm text-muted-foreground">Sinais vitais, exames físicos e laboratoriais.</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label>Pressão Arterial</Label>
                  <Input placeholder="120/80 mmHg" className="bg-secondary/20 border-none" />
                </div>
                <div className="space-y-2">
                  <Label>Frequência Cardíaca</Label>
                  <Input placeholder="75 bpm" className="bg-secondary/20 border-none" />
                </div>
                <div className="space-y-2">
                  <Label>Peso Corporal (kg)</Label>
                  <Input placeholder="70.0" className="bg-secondary/20 border-none" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="font-bold text-primary">Observações do Exame Físico</Label>
                <Textarea placeholder="Descreva sinais visíveis, estado da pele, palpação..." className="bg-secondary/20 border-none min-h-[100px]" />
              </div>
            </TabsContent>

            <TabsContent value="step-3" className="space-y-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-primary/10 p-2 rounded-lg text-primary"><Apple className="h-6 w-6" /></div>
                <div>
                  <h3 className="text-lg font-bold text-primary">Marcadores de Estilo de Vida</h3>
                  <p className="text-sm text-muted-foreground">Saúde intestinal, sono e alimentação.</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4 p-4 rounded-xl bg-secondary/10">
                  <h4 className="font-bold text-xs uppercase text-primary">Saúde Gastrointestinal</h4>
                  <div className="space-y-2">
                    <Label className="text-xs">Frequência de Evacuação</Label>
                    <Input placeholder="Ex: Diária" className="bg-white border-none" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Escala de Bristol (Tipo)</Label>
                    <Input placeholder="Tipo 1 a 7" className="bg-white border-none" />
                  </div>
                </div>
                <div className="space-y-4 p-4 rounded-xl bg-secondary/10">
                  <h4 className="font-bold text-xs uppercase text-primary">Qualidade do Sono</h4>
                  <div className="space-y-2">
                    <Label className="text-xs">Horas de Sono por Noite</Label>
                    <Input placeholder="Ex: 8 horas" className="bg-white border-none" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Nível de Energia ao Acordar</Label>
                    <Input placeholder="Escala 1 a 10" className="bg-white border-none" />
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="step-4" className="space-y-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-accent/10 p-2 rounded-lg text-accent"><CheckCircle2 className="h-6 w-6" /></div>
                <div>
                  <h3 className="text-lg font-bold text-primary">Avaliação e Plano de Cuidado</h3>
                  <p className="text-sm text-muted-foreground">Raciocínio clínico e estratégia terapêutica final.</p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="font-bold text-primary">Avaliação Integrativa (Diagnóstico Clínico)</Label>
                  <Textarea placeholder="Resuma seu raciocínio com base nos dados coletados..." className="bg-secondary/20 border-none min-h-[120px]" />
                </div>
                <div className="space-y-2">
                  <Label className="font-bold text-primary">Plano Terapêutico (Estratégia)</Label>
                  <Textarea placeholder="Defina os suplementos, mudanças de hábitos e próximos passos..." className="bg-secondary/20 border-none min-h-[120px]" />
                </div>
              </div>
            </TabsContent>
          </CardContent>

          <CardFooter className="p-8 border-t bg-secondary/5 flex justify-between">
            <Button 
              variant="outline" 
              onClick={() => setStep(prev => Math.max(1, prev - 1))}
              disabled={step === 1}
              className="border-primary/20 text-primary"
            >
              <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
            </Button>
            
            {step < totalSteps ? (
              <Button onClick={() => setStep(prev => Math.min(totalSteps, prev + 1))} className="bg-primary text-white">
                Próximo Passo <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button className="bg-accent text-white hover:bg-accent/90 px-8 shadow-md">
                <Save className="h-4 w-4 mr-2" /> Salvar Anamnese
              </Button>
            )}
          </CardFooter>
        </Tabs>
      </Card>
    </div>
  );
}
