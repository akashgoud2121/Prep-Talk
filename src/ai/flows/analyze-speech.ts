'use server';

/**
 * @fileOverview An AI agent that analyzes a speech sample and provides feedback.
 *
 * - analyzeSpeech - A function that handles the speech analysis process.
 * - AnalyzeSpeechInput - The input type for the analyzeSpeech function.
 * - AnalyzeSpeechOutput - The return type for the analyzeSpeech function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeSpeechInputSchema = z.object({
  speechSample: z.string().describe('The speech sample to analyze, either transcription or an audio data URI.'),
  mode: z.enum(['Presentation Mode', 'Interview Mode', 'Practice Mode']).describe('The context for the analysis.'),
  question: z.string().optional().describe('The interview question being answered, required for Interview Mode and Practice mode.'),
  perfectAnswer: z.string().optional().describe('A perfect answer to compare against, required for Practice Mode.'),
});

export type AnalyzeSpeechInput = z.infer<typeof AnalyzeSpeechInputSchema>;

const AnalyzeSpeechOutputSchema = z.object({
  metadata: z.object({
    wordCount: z.number().describe('The number of words in the speech sample.'),
    fillerWordCount: z.number().describe('The number of filler words (e.g., "um", "ah", "like") in the speech sample.'),
    speechRateWPM: z.number().describe('The speech rate in words per minute.'),
    averagePauseDurationMs: z.number().describe('The average pause duration in milliseconds.'),
    pitchVariance: z.number().describe('The variance in pitch during the speech sample.'),
    audioDurationSeconds: z.number().optional().describe('The duration of the audio in seconds, if audio was provided.'),
    fullTranscription: z.string().optional().describe('The full transcription of the audio, if audio was provided.'),
  }),
  evaluationCriteria: z.array(
    z.object({
      category: z.enum(['Delivery', 'Language', 'Content']).describe('The category of the evaluation criteria.'),
      criteria: z.string().describe('The specific evaluation criteria.'),
      score: z.number().min(0).max(10).describe('The score for the criteria (0-10).'),
      evaluation: z.string().describe('A brief evaluation of the speech sample against the criteria.'),
      feedback: z.string().describe('Actionable feedback to improve the criteria.'),
    })
  ).describe('Detailed evaluation criteria.'),
  totalScore: z.number().min(0).max(100).describe('An overall assessment that summarizes performance across all criteria (0-100).'),
  overallAssessment: z.string().describe('An overall assessment of the speech'),
});

export type AnalyzeSpeechOutput = z.infer<typeof AnalyzeSpeechOutputSchema>;

export async function analyzeSpeech(input: AnalyzeSpeechInput): Promise<AnalyzeSpeechOutput> {
  return analyzeSpeechFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeSpeechPrompt',
  input: {schema: AnalyzeSpeechInputSchema},
  output: {schema: AnalyzeSpeechOutputSchema},
  prompt: `You are a professional speech coach. Analyze the following speech sample and provide feedback on delivery, language, and content.

Speech Sample: {{{speechSample}}}

Context: {{{mode}}}

{{~#if question}}Question: {{{question}}}{{/if}}
{{~#if perfectAnswer}}Perfect Answer: {{{perfectAnswer}}}{{/if}}

Return a structured JSON object with the following schema:
${AnalyzeSpeechOutputSchema.description}\n\nFollow these instructions when generating the JSON:
-The score is from 0 to 10, evaluate various dimensions of the speech sample and context.
-The totalScore is from 0 to 100, and evaluate the speech sample and context as a whole.
-The speechRateWPM should be a number calculated from the speechSample.
-The wordCount should be the number of words from the speechSample.
-The fillerWordCount should be the number of filler words from the speechSample. Filler words include: like, um, uh, so, you know, actually, basically, I mean, okay, right.
-The averagePauseDurationMs should be a number calculated from the speechSample.
-The pitchVariance should be a number calculated from the speechSample.
-If the speechSample is an audio data URI, the fullTranscription should the transcription of the speechSample. And the audioDurationSeconds should be a number calculated from the audio data URI.
`,
});

const analyzeSpeechFlow = ai.defineFlow(
  {
    name: 'analyzeSpeechFlow',
    inputSchema: AnalyzeSpeechInputSchema,
    outputSchema: AnalyzeSpeechOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
