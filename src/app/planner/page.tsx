"use client"

import { useState } from "react";
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
  Loader2
} from "lucide-react";
import { generateProtocolExplanation } from "@/ai/flows/generate-protocol-explanation";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

type TherapyType = "Supplement" | "Essential Oil" | "Floral Therapy";

interface SelectedTherapy {
  id: string;
  name: string;
  type: TherapyType;
  dosage: string;
}

export default function PlannerPage() {
  const [protocolName, setProtocolName] = useState("");
  const [anamnesisSummary, setAnamnesisSummary] = useState("");
  const [therapies, setTherapies] = useState<SelectedTherapy[]>([]);
  const [newTherapyName, setNewTherapyName] = useState("");
  const [newTherapyType, setNewTherapyType] = useState<TherapyType>("Supplement");
  const [explanation, setExplanation] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const addTherapy = () => {
    if (!newTherapyName) return;
    const newTherapy: SelectedTherapy = {
      id: Math.random().toString(36).substr(2, 9),
      name: newTherapyName,
      type: newTherapyType,
      dosage: "1 dose/day"
    };
    setTherapies([...therapies, newTherapy]);
    setNewTherapyName("");
  };

  const removeTherapy = (id: string) => {
    setTherapies(therapies.filter(t => t.id !== id));
  };

  const handleGenerateAI = async () => {
    if (!protocolName || therapies.length === 0 || !anamnesisSummary) {
      toast({
        title: "Missing Information",
        description: "Please provide a protocol name, anamnesis summary, and at least one therapy.",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    try {
      const result = await generateProtocolExplanation({
        protocolName,
        anamnesisNotes: anamnesisSummary,
        selectedTherapies: therapies.map(t => `${t.name} (${t.type})`)
      });
      setExplanation(result.explanation);
      toast({
        title: "Explanation Generated",
        description: "AI has successfully analyzed the compatibility and drafted the rationale.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate AI explanation. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-primary font-headline">Integrative Treatment Planner</h1>
        <p className="text-muted-foreground">Craft personalized clinical protocols with AI-driven rationale.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-none shadow-md overflow-hidden">
            <CardHeader className="bg-primary text-white">
              <CardTitle>Protocol Definition</CardTitle>
              <CardDescription className="text-white/70">Set basic information and clinical context.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-primary uppercase tracking-wider">Protocol Name</label>
                <Input 
                  placeholder="e.g., Anxiety Management & Circadian Rhythm Support" 
                  value={protocolName}
                  onChange={(e) => setProtocolName(e.target.value)}
                  className="bg-secondary/50 border-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-primary uppercase tracking-wider">Clinical Context (Anamnesis Summary)</label>
                <Textarea 
                  placeholder="Summarize the patient's main complaints, gut health status, and sleep quality..." 
                  className="min-h-[120px] bg-secondary/50 border-none"
                  value={anamnesisSummary}
                  onChange={(e) => setAnamnesisSummary(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md">
            <CardHeader>
              <CardTitle className="text-primary font-headline">Selected Therapies</CardTitle>
              <CardDescription>Add supplements, essential oils, or floral remedies to this protocol.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col md:flex-row gap-3">
                <Select value={newTherapyType} onValueChange={(v) => setNewTherapyType(v as TherapyType)}>
                  <SelectTrigger className="w-full md:w-48 bg-secondary/50 border-none">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Supplement">Supplement</SelectItem>
                    <SelectItem value="Essential Oil">Essential Oil</SelectItem>
                    <SelectItem value="Floral Therapy">Floral Therapy</SelectItem>
                  </SelectContent>
                </Select>
                <Input 
                  placeholder="Name (e.g., Ashwagandha 500mg)" 
                  value={newTherapyName}
                  onChange={(e) => setNewTherapyName(e.target.value)}
                  className="flex-1 bg-secondary/50 border-none"
                />
                <Button onClick={addTherapy} className="bg-primary hover:bg-primary/90">
                  <Plus className="h-4 w-4 mr-2" /> Add
                </Button>
              </div>

              <div className="space-y-3 mt-4">
                {therapies.length === 0 && (
                  <div className="text-center py-10 border-2 border-dashed rounded-xl border-muted">
                    <p className="text-muted-foreground">No therapies added yet.</p>
                  </div>
                )}
                {therapies.map((therapy) => (
                  <div key={therapy.id} className="flex items-center justify-between p-4 bg-secondary/30 rounded-xl border border-border group">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "p-2 rounded-lg",
                        therapy.type === "Supplement" ? "bg-green-100 text-green-700" :
                        therapy.type === "Essential Oil" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"
                      )}>
                        {therapy.type === "Supplement" ? <Leaf className="h-4 w-4" /> :
                         therapy.type === "Essential Oil" ? <Droplets className="h-4 w-4" /> : <FlaskConical className="h-4 w-4" />}
                      </div>
                      <div>
                        <h4 className="font-bold text-primary">{therapy.name}</h4>
                        <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">{therapy.type}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => removeTherapy(therapy.id)} className="text-muted-foreground hover:text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-none shadow-md bg-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary font-headline">
                <Sparkles className="h-5 w-5 text-accent" />
                AI Rationale Generator
              </CardTitle>
              <CardDescription>Automatically draft a professional explanation for this protocol based on clinical alignment.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={handleGenerateAI} 
                disabled={isGenerating}
                className="w-full bg-accent hover:bg-accent/90 text-white shadow-lg py-6"
              >
                {isGenerating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                Generate Explanation
              </Button>
              
              {explanation && (
                <div className="mt-6 p-4 bg-accent/5 border border-accent/20 rounded-xl space-y-3">
                  <h4 className="text-sm font-bold text-accent uppercase tracking-wider">Drafted Rationale</h4>
                  <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                    {explanation}
                  </div>
                  <Button variant="outline" size="sm" className="w-full text-xs mt-2 border-accent/30 text-accent">
                    Edit Rationale
                  </Button>
                </div>
              )}
            </CardContent>
            <CardFooter className="pt-0 flex flex-col items-stretch">
              <Button className="w-full bg-primary hover:bg-primary/90 mt-2">
                <Save className="h-4 w-4 mr-2" /> Save Protocol
              </Button>
            </CardFooter>
          </Card>

          <Card className="border-none shadow-md bg-secondary/20">
            <CardContent className="p-6">
              <h3 className="text-sm font-bold text-primary uppercase mb-4">Integrative Goals</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-green-600" /> Bio-Age Optimization
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-green-600" /> Mitochondrial Support
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-green-600" /> HPA-Axis Balancing
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}