
'use server';

/**
 * @fileOverview An AI agent that analyzes a speech sample and provides feedback.
 *
 * - analyzeSpeech - A function that handles the speech analysis process.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { AnalyzeSpeechInput, AnalyzeSpeechInputSchema, AnalyzeSpeechOutput, AnalyzeSpeechOutputSchema } from '@/ai/schemas';

export async function analyzeSpeech(input: AnalyzeSpeechInput): Promise<AnalyzeSpeechOutput> {
  return analyzeSpeechFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeSpeechPrompt',
  model: 'googleai/gemini-1.5-flash-latest',
  input: {schema: AnalyzeSpeechInputSchema.extend({ isAudio: z.boolean().optional() })},
  output: {schema: AnalyzeSpeechOutputSchema},
  prompt: `
  {{#if perfectAnswer}}
  You are a professional exam evaluator. Your task is to evaluate the candidate's answer compared to the perfect answer based on the following 15 criteria. For each criterion, you must provide:
  - **Evaluation:** A brief assessment of the candidate's performance on that criterion.
  - **Comparison:** A detailed analysis of how the candidate's answer compares with the perfect answer for that criterion.
  - **Feedback:** Specific, actionable suggestions for improvement.
  {{else}}
  You are a professional speech coach. Your task is to analyze a speech sample and provide constructive feedback.
  {{/if}}

  IMPORTANT: The speech sample may be provided as text OR as an audio data URI. If it is an audio data URI you MUST first transcribe the audio into text. Then, use that transcription for the analysis below. If the 'speechSample' is already text, use it directly.
  
  CRITICAL: You must strictly evaluate the speech based on the provided context. If the user speaks about content that is irrelevant to the selected mode (especially in "Interview Mode" or "Rehearsal Mode" where a specific question is provided), you MUST penalize their score in the 'Relevance' and 'Organization' criteria and reflect this in the 'totalScore' and 'overallAssessment'. The user should only speak about the provided topic.

  Return your answer as a valid JSON object following this schema exactly (do not include any extra text).

  Speech Sample (Candidate's Answer):
  {{#if isAudio}}
  {{media url=speechSample}}
  {{else}}
  {{{speechSample}}}
  {{/if}}

  Context: {{{mode}}}
  {{~#if question}}Question: {{{question}}}{{/if}}
  {{~#if perfectAnswer}}Perfect Answer: {{{perfectAnswer}}}{{/if}}

  JSON Output Schema:
  ${AnalyzeSpeechOutputSchema.description}\n\nFollow these instructions when generating the JSON:
  - Evaluate the speech sample on ALL 15 of the following criteria.
  - **Delivery Criteria**: Fluency, Pacing, Clarity, Confidence, Emotional Tone. Assign the category 'Delivery' to these.
  - **Language Criteria**: Grammar, Vocabulary, Word Choice, Conciseness, Filler Words. Assign the category 'Language' to these.
  - **Content Criteria**: Relevance, Organization, Accuracy, Depth, Persuasiveness. Assign the category 'Content' to these.
  - For each of the 15 criteria, provide a score from 0-10, an evaluation, and actionable feedback.
  - {{#if perfectAnswer}}For each criterion, you MUST also provide a 'comparison' of the candidate's answer to the perfect answer.{{/if}}
  - The totalScore is from 0 to 100, and should evaluate the speech sample and context as a whole.
  - The wordCount, fillerWordCount, speechRateWPM, averagePauseDurationMs, and pitchVariance should be calculated or estimated from the transcription.
  - The paceScore and clarityScore should be scores from 0-100 based on the analysis.
  - The pausePercentage should be the estimated percentage of total time the speaker was pausing.
  - **highlightedTranscription**: This is critical. You must meticulously segment the entire transcription. Create a segment for every single word or pause. A 'filler' type is ONLY for a single filler word (e.g., um, ah, like). A 'pause' type is for significant silences (e.g., '[PAUSE: 1.2s]'). All other words are 'default'. Concatenating all 'text' fields MUST reconstruct the full transcription with pause annotations. Do not leave this field empty. Be extremely thorough.
  - **suggestedSpeech**: After the full analysis, provide a paragraph demonstrating how the speaker could have delivered their message more effectively, incorporating the feedback provided.
  `,
});

const analyzeSpeechFlow = ai.defineFlow(
  {
    name: 'analyzeSpeechFlow',
    inputSchema: AnalyzeSpeechInputSchema,
    outputSchema: AnalyzeSpeechOutputSchema,
  },
  async input => {
    const isAudio = input.speechSample.startsWith('data:audio');
    
    // In Interview mode, we are comparing against a perfect answer, which is the same as Rehearsal mode for the AI.
    if(input.mode === 'Interview Mode' && input.perfectAnswer) {
      input.mode = 'Rehearsal Mode';
    }

    const {output} = await prompt({...input, isAudio});
    return output!;
  }
);
