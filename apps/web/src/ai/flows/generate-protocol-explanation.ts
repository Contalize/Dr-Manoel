/**
 * @fileOverview This file is currently a STUB.
 * PharmaZen is using Static Export (output: 'export'), which does not support Server Actions.
 * To use Genkit AI securely, these flows should be deployed as Firebase Cloud Functions
 * and called via HTTPS.
 */

export type GenerateProtocolExplanationInput = {
  protocolName: string;
  anamnesisNotes: string;
  selectedTherapies: string[];
};

export type GenerateProtocolExplanationOutput = {
  explanation: string;
};

export async function generateProtocolExplanation(input: GenerateProtocolExplanationInput): Promise<GenerateProtocolExplanationOutput> {
  // Simulação de resposta da IA para permitir o build em modo estático.
  // Em produção, isto deve ser substituído por uma chamada de API (fetch) para uma Cloud Function.
  console.log("AI Flow called with:", input);
  
  return {
    explanation: `[MOCK IA] Justificativa clínica para o protocolo "${input.protocolName}": 
    Baseado na anamnese e nas terapias (${input.selectedTherapies.join(", ")}), 
    o tratamento visa o equilíbrio sistêmico e suporte metabólico. 
    (Nota: A integração real com Genkit exige uma Cloud Function em modo de exportação estática).`
  };
}
