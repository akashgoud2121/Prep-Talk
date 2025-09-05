
'use server';

/**
 * @fileOverview Extracts structured information from a resume file.
 *
 * - extractResumeInfo - A function that parses a resume and returns structured data.
 */

import {ai} from '@/ai/genkit';
import { ExtractResumeInfoInput, ExtractResumeInfoInputSchema, ExtractedResumeInfo, ExtractedResumeInfoSchema } from '@/ai/schemas';

export async function extractResumeInfo(
  input: ExtractResumeInfoInput
): Promise<ExtractedResumeInfo> {
  return extractResumeInfoFlow(input);
}

const prompt = ai.definePrompt({
  name: 'extractResumeInfoPrompt',
  model: 'googleai/gemini-1.5-flash-latest',
  input: {schema: ExtractResumeInfoInputSchema},
  output: {schema: ExtractedResumeInfoSchema},
  prompt: `You are an expert resume parser. Your task is to analyze the provided resume file and extract key information into a structured JSON format.

  Instructions:
  1.  Thoroughly read the resume file provided below.
  2.  Identify and extract information for the following fields: name, contact (email, phone, etc.), summary, experience (job title, company, dates, responsibilities), education (institution, degree, graduation date), skills, projects, and certifications.
  3.  Populate the JSON object with the data you find.
  4.  If a section or piece of information (like 'projects' or 'certifications') is not present in the resume, you MUST omit the corresponding field or array from the JSON output entirely. Do not include empty arrays or null values for missing sections.
  5.  Return ONLY the valid JSON object that matches the provided schema. Do not include any extra text, explanations, or markdown formatting like \`\`\`json.

  Resume File:
  {{media url=resumeDataUri}}
  `,
});

const extractResumeInfoFlow = ai.defineFlow(
  {
    name: 'extractResumeInfoFlow',
    inputSchema: ExtractResumeInfoInputSchema,
    outputSchema: ExtractedResumeInfoSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
