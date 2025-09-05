
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
  resumeSummary: z.string().describe('A summary of the most important parts of a resume, including job titles, companies, skills, and projects.'),
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
  prompt: `You are an expert career coach and hiring manager. Your task is to analyze the provided resume text and generate a set of interview questions and answers to help a candidate prepare.

Instructions:
1.  First, analyze the resume summary to understand the candidate's key qualifications:
    Resume Summary:
    {{{resumeSummary}}}
2.  Next, use the FULL resume text provided below to find specific details to craft the answers.
3.  Generate exactly three common but important interview questions based on the summary. One of the questions MUST be "Tell me about yourself".
4.  For EACH of the three questions, you must craft a complete, detailed, and ideal answer using the FULL RESUME TEXT.
5.  **Crucially, the answer MUST be written from the candidate's perspective (first-person "I") as if they were speaking it aloud.**
6.  The answer's content must be derived **exclusively** from the information present in the full resume text. Weave the specific details (like university name, job titles, project outcomes, etc.) into the narrative of the answer. Do not invent skills, experiences, or details not mentioned in the text.
7.  The answer should not be a list of suggestions or a template with placeholders like [University Name]. It must be a ready-to-use, well-structured narrative that demonstrates the candidate's skills and experiences effectively. Think of it as a script for the candidate to practice.

Full Resume Text:
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
