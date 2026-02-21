'use server';
/**
 * @fileOverview This file implements a Genkit flow to generate a professional and coherent explanation
 * for an 'Integrative Protocol', based on the patient's anamnesis and selected therapies.
 * All output is in Portuguese (Brazil).
 *
 * - generateProtocolExplanation - A function that orchestrates the generation of the protocol explanation.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const CheckTherapyCompatibilityInputSchema = z.object({
  anamnesisNotes: z
    .string()
    .describe("Notas detalhadas da anamnese do paciente, incluindo histórico de saúde e sintomas."),
  selectedTherapies: z
    .array(z.string())
    .describe("Lista de terapias selecionadas (suplementos, óleos essenciais, florais, etc.)."),
});
type CheckTherapyCompatibilityInput = z.infer<typeof CheckTherapyCompatibilityInputSchema>;

const CheckTherapyCompatibilityOutputSchema = z.object({
  assessment: z
    .string()
    .describe("Uma avaliação concisa se as terapias são compatíveis com o perfil do paciente em Português."),
});
type CheckTherapyCompatibilityOutput = z.infer<typeof CheckTherapyCompatibilityOutputSchema>;

const checkTherapyCompatibilityToolPrompt = ai.definePrompt({
  name: 'checkTherapyCompatibilityToolPrompt',
  input: { schema: CheckTherapyCompatibilityInputSchema },
  output: { schema: CheckTherapyCompatibilityOutputSchema },
  prompt: `Analise as seguintes notas de anamnese e a lista de terapias propostas.
Forneça uma avaliação concisa em Português (Brasil) sobre a compatibilidade dessas terapias com o perfil de saúde do paciente. Destaque benefícios ou preocupações.

Notas de Anamnese:
{{{anamnesisNotes}}}

Terapias Propostas:
{{#each selectedTherapies}}
- {{{this}}}
{{/each}}

Sua avaliação deve ser técnica e em Português, focando no raciocínio clínico farmacêutico.
`,
});

const checkTherapyCompatibility = ai.defineTool(
  {
    name: 'checkTherapyCompatibility',
    description: 'Avalia se as terapias propostas alinham-se com a anamnese do paciente.',
    inputSchema: CheckTherapyCompatibilityInputSchema,
    outputSchema: CheckTherapyCompatibilityOutputSchema,
  },
  async (input: CheckTherapyCompatibilityInput): Promise<CheckTherapyCompatibilityOutput> => {
    const { output } = await checkTherapyCompatibilityToolPrompt(input);
    if (!output) {
      throw new Error('Falha ao obter avaliação de compatibilidade.');
    }
    return output;
  },
);

const GenerateProtocolExplanationInputSchema = z.object({
  protocolName: z.string().describe("Nome do protocolo integrativo."),
  anamnesisNotes: z.string().describe("Notas da anamnese."),
  selectedTherapies: z.array(z.string()).describe("Lista de terapias."),
});
export type GenerateProtocolExplanationInput = z.infer<typeof GenerateProtocolExplanationInputSchema>;

const GenerateProtocolExplanationOutputSchema = z.object({
  explanation: z.string().describe("Explicação profissional e coerente em Português (Brasil)."),
});
export type GenerateProtocolExplanationOutput = z.infer<typeof GenerateProtocolExplanationOutputSchema>;

const generateProtocolExplanationPrompt = ai.definePrompt({
  name: 'generateProtocolExplanationPrompt',
  input: { schema: GenerateProtocolExplanationInputSchema },
  output: { schema: GenerateProtocolExplanationOutputSchema },
  tools: [checkTherapyCompatibility],
  prompt: `Você é um farmacêutico clínico em uma clínica de farmácia integrativa. Gere uma explicação profissional e empática em Português (Brasil) para um 'Protocolo Integrativo'.
A explicação deve articular o raciocínio por trás do protocolo, ligando-o à anamnese e às terapias escolhidas.

Primeiro, use a ferramenta 'checkTherapyCompatibility' para avaliar o alinhamento das terapias.

Nome do Protocolo: {{{protocolName}}}

Notas de Anamnese:
{{{anamnesisNotes}}}

Terapias Selecionadas:
{{#each selectedTherapies}}
- {{{this}}}
{{/each}}

Com base nessas informações e na avaliação da ferramenta, gere uma justificativa clínica completa e amigável ao paciente em Português. Use termos técnicos da farmacopeia brasileira de forma clara.
`,
});

const generateProtocolExplanationFlow = ai.defineFlow(
  {
    name: 'generateProtocolExplanationFlow',
    inputSchema: GenerateProtocolExplanationInputSchema,
    outputSchema: GenerateProtocolExplanationOutputSchema,
  },
  async (input) => {
    const { output } = await generateProtocolExplanationPrompt(input);
    if (!output) {
      throw new Error('Falha ao gerar explicação do protocolo.');
    }
    return output;
  },
);

export async function generateProtocolExplanation(input: GenerateProtocolExplanationInput): Promise<GenerateProtocolExplanationOutput> {
  return generateProtocolExplanationFlow(input);
}
