
'use server';

/**
 * @fileOverview Generates interview questions and ideal answers from a resume.
 *
 * - generateQuestionsFromResume - A function that generates interview questions and answers.
 * - GenerateQuestionsFromResumeInput - The input type for the generateQuestionsFromResume function.
 * - GenerateQuestionsFromResumeOutput - The return type for the generateQuestionsfromResume function.
 * - InterviewQuestion - The type for a single question/answer pair.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateQuestionsFromResumeInputSchema = z.object({
  resumeText: z.string().describe('The full text content of a resume.'),
});
export type GenerateQuestionsFromResumeInput = z.infer<
  typeof GenerateQuestionsFromResumeInputSchema
>;

const InterviewQuestionSchema = z.object({
    question: z.string().describe("The interview question."),
    answer: z.string().describe("The ideal, detailed answer to the question, tailored to the resume."),
});
export type InterviewQuestion = z.infer<typeof InterviewQuestionSchema>;

const GenerateQuestionsFromResumeOutputSchema = z.object({
  questions: z
    .array(InterviewQuestionSchema)
    .max(3)
    .describe('An array of exactly 3 interview questions and their ideal answers.'),
});
export type GenerateQuestionsFromResumeOutput = z.infer<
  typeof GenerateQuestionsFromResumeOutputSchema
>;

export async function generateQuestionsFromResume(
  input: GenerateQuestionsFromResumeInput
): Promise<GenerateQuestionsFromResumeOutput> {
  return generateQuestionsFromResumeFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateQuestionsFromResumePrompt',
  model: 'googleai/gemini-1.5-flash-latest',
  input: {schema: GenerateQuestionsFromResumeInputSchema},
  output: {schema: GenerateQuestionsFromResumeOutputSchema},
  prompt: `You are an expert career coach and hiring manager. Based on the following resume text, generate exactly three common but important interview questions.

One of the questions MUST be "Tell me about yourself".

For each of the three questions, provide a strong, detailed, ideal answer that the candidate could give. The answer MUST be tailored specifically to the content of the provided resume.

Resume Text:
{{{resumeText}}}

Return the result as a valid JSON object.`,
});

const generateQuestionsFromResumeFlow = ai.defineFlow(
  {
    name: 'generateQuestionsFromResumeFlow',
    inputSchema: GenerateQuestionsFromResumeInputSchema,
    outputSchema: GenerateQuestionsFromResumeOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
