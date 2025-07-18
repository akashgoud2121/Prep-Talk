'use server';

/**
 * @fileOverview Provides a concise summary of the speech's main points.
 *
 * - summarizeSpeech - A function that summarizes the speech.
 * - SummarizeSpeechInput - The input type for the summarizeSpeech function.
 * - SummarizeSpeechOutput - The return type for the summarizeSpeech function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeSpeechInputSchema = z.object({
  speechText: z
    .string()
    .describe('The transcribed text of the speech to be summarized.'),
});
export type SummarizeSpeechInput = z.infer<typeof SummarizeSpeechInputSchema>;

const SummarizeSpeechOutputSchema = z.object({
  summary: z.string().describe('A concise summary of the speech.'),
});
export type SummarizeSpeechOutput = z.infer<typeof SummarizeSpeechOutputSchema>;

export async function summarizeSpeech(input: SummarizeSpeechInput): Promise<SummarizeSpeechOutput> {
  return summarizeSpeechFlow(input);
}

const prompt = ai.definePrompt({
  name: 'summarizeSpeechPrompt',
  input: {schema: SummarizeSpeechInputSchema},
  output: {schema: SummarizeSpeechOutputSchema},
  prompt: `You are an expert speech summarizer. Please provide a concise summary of the following speech:\n\n{{{speechText}}}`,
});

const summarizeSpeechFlow = ai.defineFlow(
  {
    name: 'summarizeSpeechFlow',
    inputSchema: SummarizeSpeechInputSchema,
    outputSchema: SummarizeSpeechOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
