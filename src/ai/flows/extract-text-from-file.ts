
'use server';

/**
 * @fileOverview Extracts plain text content from a file using a multimodal AI model.
 *
 * - extractTextFromFile - A function that reads a file and returns its text content.
 */

import {ai} from '@/ai/genkit';
import { ExtractTextFromFileInput, ExtractTextFromFileInputSchema, ExtractTextFromFileOutput, ExtractTextFromFileOutputSchema } from '@/ai/schemas';

export async function extractTextFromFile(
  input: ExtractTextFromFileInput
): Promise<ExtractTextFromFileOutput> {
  return extractTextFromFileFlow(input);
}

const prompt = ai.definePrompt({
  name: 'extractTextFromFilePrompt',
  model: 'googleai/gemini-1.5-flash-latest',
  input: {schema: ExtractTextFromFileInputSchema},
  output: {schema: ExtractTextFromFileOutputSchema},
  prompt: `You are an expert file parser. Your sole task is to extract all the plain text content from the provided file.

  Instructions:
  1.  Thoroughly read the file provided.
  2.  Extract every piece of text you can find.
  3.  Return ONLY the extracted text content. Do not add any summaries, explanations, or formatting.
  4. The output must be a valid JSON object matching the schema, with the full text inside the 'text' field.

  File to process:
  {{media url=fileDataUri}}
  `,
});

const extractTextFromFileFlow = ai.defineFlow(
  {
    name: 'extractTextFromFileFlow',
    inputSchema: ExtractTextFromFileInputSchema,
    outputSchema: ExtractTextFromFileOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
