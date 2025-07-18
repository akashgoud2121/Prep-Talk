
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
  // Delivery
  "Fluency",
  "Pacing",
  "Clarity",
  "Confidence",
  "Emotional Tone",
  // Language
  "Grammar",
  "Vocabulary",
  "Word Choice",
  "Conciseness",
  "Filler Words",
  // Content
  "Relevance",
  "Organization",
  "Accuracy",
  "Depth",
  "Persuasiveness",
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
    paceScore: z.number().min(0).max(100).describe('A score from 0-100 indicating how well-paced the speech is. Ideal is between 140-160 WPM.'),
    clarityScore: z.number().min(0).max(100).describe('A score from 0-100 indicating the clarity of pronunciation and articulation.'),
    pausePercentage: z.number().min(0).max(100).describe('The percentage of total speaking time spent in pauses.'),
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
- Evaluate the speech sample on ALL 15 of the following criteria.
- **Delivery Criteria**: Fluency, Pacing, Clarity, Confidence, Emotional Tone. Assign the category 'Delivery' to these.
- **Language Criteria**: Grammar, Vocabulary, Word Choice, Conciseness, Filler Words. Assign the category 'Language' to these.
- **Content Criteria**: Relevance, Organization, Accuracy, Depth, Persuasiveness. Assign the category 'Content' to these.
- For each of the 15 criteria, provide a score from 0-10, a brief evaluation, and actionable feedback.
- The totalScore is from 0 to 100, and evaluate the speech sample and context as a whole.
- The speechRateWPM should be a number calculated from the transcription.
- The wordCount should be the number of words from the transcription.
- The fillerWordCount should be the number of filler words from the transcription. Filler words include: like, um, uh, ah, so, you know, actually, basically, I mean, okay, right.
- The averagePauseDurationMs should be a number estimated from the transcription.
- The pitchVariance should be a number estimated from the transcription.
- The paceScore should be a score from 0-100 based on the speechRateWPM. A rate between 140-160 WPM is ideal (100). The score should decrease as the rate moves away from this range.
- The clarityScore should be a score from 0-100 based on an analysis of pronunciation, articulation, and mumbling in the transcription/audio.
- The pausePercentage should be a number representing the estimated percentage of total time the speaker was pausing.
- If the speechSample was an audio data URI, the audioDurationSeconds should be a number calculated from the audio data.
- **highlightedTranscription**: This is critical. You must meticulously segment the entire transcription.
  - Create a segment for every single word or pause.
  - For each segment, specify its type: 'default', 'filler', or 'pause'.
  - A 'filler' type is ONLY for a single filler word from the list. If you see "um, like", that must be two separate segments, one for "um" and one for "like".
  - A 'pause' type is for significant silences. The text for a pause should represent the pause, e.g., '[PAUSE: 1.2s]'.
  - All other words are 'default'.
  - Concatenating all 'text' fields MUST reconstruct the full transcription with pause annotations. Do not leave this field empty. Be extremely thorough.
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
