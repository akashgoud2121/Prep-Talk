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

const evaluationCriteriaEnum = z.enum([
  "Speech Fluency and Delivery",
  "Pronunciation and Clarity",
  "Grammar and Language Accuracy",
  "Vocabulary and Word Choice",
  "Content Relevance and Focus",
  "Coverage of Key Points",
  "Accuracy of Facts and Explanations",
  "Organization and Coherence",
  "Confidence or Self-Assurance",
  "Use of Examples or Evidence",
  "Depth of Understanding (Analytical Depth)",
  "Originality or Plagiarism Detection",
  "Uncertainty or Doubt Indicators",
  "Emotional Tone or Sentiment",
  "Length and Time Management"
]);

const HighlightedSegmentSchema = z.object({
  text: z.string(),
  type: z.enum(['default', 'filler', 'pause']),
});

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
  }),
  highlightedTranscription: z.array(HighlightedSegmentSchema).optional().describe('The full transcription, segmented for highlighting filler words and pauses.'),
  evaluationCriteria: z.array(
    z.object({
      criteria: evaluationCriteriaEnum.describe('The specific evaluation criteria.'),
      score: z.number().min(0).max(10).describe('The score for the criteria (0-10).'),
      evaluation: z.string().describe('A brief evaluation of the speech sample against the criteria.'),
      feedback: z.string().describe('Actionable feedback to improve the criteria.'),
    })
  ).describe('Detailed evaluation of the 15 specified criteria.'),
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
- Evaluate the speech sample on ALL 15 of the following criteria: ${evaluationCriteriaEnum.options.join(', ')}.
- For each criterion, provide a score from 0-10, a brief evaluation, and actionable feedback.
- The totalScore is from 0 to 100, and evaluate the speech sample and context as a whole.
- The speechRateWPM should be a number calculated from the speechSample.
- The wordCount should be the number of words from the speechSample.
- The fillerWordCount should be the number of filler words from the speechSample. Filler words include: like, um, uh, so, you know, actually, basically, I mean, okay, right.
- The averagePauseDurationMs should be a number calculated from the speechSample.
- The pitchVariance should be a number calculated from the speechSample.
- If the speechSample is an audio data URI, the audioDurationSeconds should be a number calculated from the audio data URI.
- The highlightedTranscription should be an array of objects. Segment the transcription into parts. For each part, specify if its type is 'default', 'filler' (for filler words like 'um', 'ah', 'like'), or 'pause' (for significant silences). The text for a pause should represent the pause, e.g., '[PAUSE: 1.2s]'. Concatenating all 'text' fields should reconstruct the full transcription with pause annotations.
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
