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

const evaluationCategoryEnum = z.enum([
    "Delivery",
    "Language",
    "Content"
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
    averagePauseDurationMs: z.number().describe('The average pause duration in milliseconds. If not available from the source, estimate based on text.'),
    pitchVariance: z.number().describe('The variance in pitch during the speech sample. If not available from the source, estimate based on text.'),
    audioDurationSeconds: z.number().optional().describe('The duration of the audio in seconds, if audio was provided.'),
  }),
  highlightedTranscription: z.array(HighlightedSegmentSchema).optional().describe('The full transcription, segmented for highlighting filler words and pauses. Concatenating all text fields should reconstruct the full transcription with pause annotations.'),
  evaluationCriteria: z.array(
    z.object({
      category: evaluationCategoryEnum.describe("The category of the criteria. Assign one of: 'Delivery', 'Language', or 'Content'"),
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
  prompt: `You are a professional speech coach. Your task is to analyze a speech sample.

IMPORTANT: The speech sample may be provided as text OR as an audio data URI. If the 'speechSample' field contains a data URI (e.g., 'data:audio/wav;base64,...'), you MUST first transcribe the audio into text. Then, use that transcription for the analysis below. If the 'speechSample' is already text, use it directly.

Speech Sample: {{media url=speechSample}}

Context: {{{mode}}}

{{~#if question}}Question: {{{question}}}{{/if}}
{{~#if perfectAnswer}}Perfect Answer: {{{perfectAnswer}}}{{/if}}

Return a structured JSON object with the following schema:
${AnalyzeSpeechOutputSchema.description}\n\nFollow these instructions when generating the JSON:
- Evaluate the speech sample on ALL 15 of the following criteria: ${evaluationCriteriaEnum.options.join(', ')}.
- For each criterion, provide a score from 0-10, a brief evaluation, actionable feedback, and a category ('Delivery', 'Language', or 'Content').
- The totalScore is from 0 to 100, and evaluate the speech sample and context as a whole.
- The speechRateWPM should be a number calculated from the transcription.
- The wordCount should be the number of words from the transcription.
- The fillerWordCount should be the number of filler words from the transcription. Filler words include: like, um, uh, so, you know, actually, basically, I mean, okay, right.
- The averagePauseDurationMs should be a number estimated from the transcription.
- The pitchVariance should be a number estimated from the transcription.
- If the speechSample was an audio data URI, the audioDurationSeconds should be a number calculated from the audio data.
- The highlightedTranscription must be an array of objects based on the full transcription. Segment the entire transcription into parts. For each part, specify if its type is 'default', 'filler' (for filler words like 'um', 'ah', 'like'), or 'pause' (for significant silences). The text for a pause should represent the pause, e.g., '[PAUSE: 1.2s]'. Concatenating all 'text' fields must reconstruct the full transcription with pause annotations. Do not leave this field empty.
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
