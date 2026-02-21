'use server';
/**
 * @fileOverview This file implements a Genkit flow to generate a professional and coherent explanation
 * for an 'Integrative Protocol', based on the patient's anamnesis and selected therapies.
 *
 * - generateProtocolExplanation - A function that orchestrates the generation of the protocol explanation.
 * - GenerateProtocolExplanationInput - The input type for the generateProtocolExplanation function.
 * - GenerateProtocolExplanationOutput - The return type for the generateProtocolExplanation function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

/**
 * Schema for the input of the therapy compatibility check tool.
 */
const CheckTherapyCompatibilityInputSchema = z.object({
  anamnesisNotes: z
    .string()
    .describe("Detailed patient anamnesis notes, including health history, symptoms, and lifestyle factors."),
  selectedTherapies: z
    .array(z.string())
    .describe("A list of selected therapies (e.g., supplements, essential oils, floral therapies) for the protocol."),
});
type CheckTherapyCompatibilityInput = z.infer<typeof CheckTherapyCompatibilityInputSchema>;

/**
 * Schema for the output of the therapy compatibility check tool.
 */
const CheckTherapyCompatibilityOutputSchema = z.object({
  assessment: z
    .string()
    .describe("A concise assessment of whether the proposed therapies are compatible and well-aligned with the patient's health profile, highlighting potential benefits or concerns."),
});
type CheckTherapyCompatibilityOutput = z.infer<typeof CheckTherapyCompatibilityOutputSchema>;

/**
 * Internal prompt for the therapy compatibility check tool.
 */
const checkTherapyCompatibilityToolPrompt = ai.definePrompt({
  name: 'checkTherapyCompatibilityToolPrompt',
  input: { schema: CheckTherapyCompatibilityInputSchema },
  output: { schema: CheckTherapyCompatibilityOutputSchema },
  prompt: `Analyze the following patient anamnesis notes and a list of proposed therapies.
Provide a concise assessment of whether these therapies are compatible and well-aligned with the patient's health profile described in the anamnesis. Highlight any potential benefits or areas of concern.

Anamnesis Notes:
{{{anamnesisNotes}}}

Proposed Therapies:
{{#each selectedTherapies}}
- {{{this}}}
{{/each}}

Your assessment should be directly usable by another AI to inform a professional explanation. Focus on rationale and alignment.
`,
});

/**
 * A reasoning tool that determines whether requested therapies match a patient's notes and plans.
 */
const checkTherapyCompatibility = ai.defineTool(
  {
    name: 'checkTherapyCompatibility',
    description: 'Assesses whether a list of proposed therapies aligns with a patient\'s anamnesis notes, providing feedback on potential benefits or conflicts.',
    inputSchema: CheckTherapyCompatibilityInputSchema,
    outputSchema: CheckTherapyCompatibilityOutputSchema,
  },
  async (input: CheckTherapyCompatibilityInput): Promise<CheckTherapyCompatibilityOutput> => {
    const { output } = await checkTherapyCompatibilityToolPrompt(input);
    if (!output) {
      throw new Error('Failed to get compatibility assessment from the tool prompt.');
    }
    return output;
  },
);

/**
 * Schema for the input of the generate protocol explanation flow.
 */
const GenerateProtocolExplanationInputSchema = z.object({
  protocolName: z.string().describe("The name of the integrative protocol (e.g., 'Detox Protocol', 'Anxiety Management')."),
  anamnesisNotes: z
    .string()
    .describe("Detailed patient anamnesis notes, including health history, symptoms, and lifestyle factors."),
  selectedTherapies: z
    .array(z.string())
    .describe("A list of selected therapies (e.g., supplements, essential oils, floral therapies) for the protocol."),
});
export type GenerateProtocolExplanationInput = z.infer<typeof GenerateProtocolExplanationInputSchema>;

/**
 * Schema for the output of the generate protocol explanation flow.
 */
const GenerateProtocolExplanationOutputSchema = z.object({
  explanation: z.string().describe("A professional and coherent explanation for the integrative protocol."),
});
export type GenerateProtocolExplanationOutput = z.infer<typeof GenerateProtocolExplanationOutputSchema>;

/**
 * Prompt for generating a professional and coherent explanation for an Integrative Protocol.
 * It uses the `checkTherapyCompatibility` tool to ensure alignment with patient's anamnesis.
 */
const generateProtocolExplanationPrompt = ai.definePrompt({
  name: 'generateProtocolExplanationPrompt',
  input: { schema: GenerateProtocolExplanationInputSchema },
  output: { schema: GenerateProtocolExplanationOutputSchema },
  tools: [checkTherapyCompatibility],
  prompt: `You are a clinic administrator at an Integrative Pharmaceutical Clinic. Your task is to generate a professional and coherent explanation for an 'Integrative Protocol' for a patient.
The explanation should clearly articulate the rationale behind the protocol, linking it to the patient's specific health profile (anamnesis) and the selected therapies.

First, use the 'checkTherapyCompatibility' tool to get an assessment of how well the proposed therapies align with the patient's anamnesis. This assessment will help inform your explanation.

Protocol Name: {{{protocolName}}}

Patient Anamnesis Notes:
{{{anamnesisNotes}}}

Selected Therapies for this Protocol:
{{#each selectedTherapies}}
- {{{this}}}
{{/each}}

Based on the above information and the compatibility assessment from the tool, generate a comprehensive, professional, and patient-friendly explanation for this protocol. Ensure the language is empathetic and clear. The explanation should be suitable for direct presentation to the patient.
`,
});

/**
 * Defines a Genkit flow to generate a professional explanation for an Integrative Protocol.
 * It leverages an AI prompt and a compatibility check tool to create a well-aligned explanation.
 */
const generateProtocolExplanationFlow = ai.defineFlow(
  {
    name: 'generateProtocolExplanationFlow',
    inputSchema: GenerateProtocolExplanationInputSchema,
    outputSchema: GenerateProtocolExplanationOutputSchema,
  },
  async (input) => {
    const { output } = await generateProtocolExplanationPrompt(input);
    if (!output) {
      throw new Error('Failed to generate protocol explanation.');
    }
    return output;
  },
);

/**
 * Generates a professional explanation for an 'Integrative Protocol' using Genkit AI.
 * The explanation is based on the patient's anamnesis and selected therapies, ensuring alignment and clarity.
 *
 * @param input - The input containing protocol name, anamnesis notes, and selected therapies.
 * @returns A promise that resolves to an object containing the generated protocol explanation.
 */
export async function generateProtocolExplanation(input: GenerateProtocolExplanationInput): Promise<GenerateProtocolExplanationOutput> {
  return generateProtocolExplanationFlow(input);
}
