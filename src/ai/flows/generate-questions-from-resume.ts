
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
  prompt: `You are an expert career coach and hiring manager. Your task is to analyze the provided resume text and generate a set of interview questions and answers to help a candidate prepare.

Instructions:
1.  First, thoroughly analyze the resume to extract key information. Pay close attention to sections like **Name, Education, Experience, Projects, and Certifications**.
2.  Generate exactly three common but important interview questions based on the resume. One of the questions MUST be "Tell me about yourself".
3.  For EACH of the three questions, you must craft a complete, detailed, and ideal answer.
4.  **Crucially, the answer MUST be written from the candidate's perspective (first-person "I") as if they were speaking it aloud.**
5.  The answer's content must be derived **exclusively** from the information present in the resume. Weave the specific details you gathered (like university name, job titles, project outcomes, etc.) into the narrative of the answer. Do not invent skills, experiences, or details not mentioned in the text.
6.  The answer should not be a list of suggestions or bullet points. It must be a ready-to-use, well-structured narrative that demonstrates the candidate's skills and experiences effectively. Think of it as a script for the candidate to practice.

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
