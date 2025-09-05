
'use server';

/**
 * @fileOverview Provides a concise summary of the speech's main points.
 *
 * - summarizeSpeech - A function that summarizes the speech.
 */

import {ai} from '@/ai/genkit';
import { SummarizeSpeechInput, SummarizeSpeechInputSchema, SummarizeSpeechOutput, SummarizeSpeechOutputSchema } from '@/ai/schemas';


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
