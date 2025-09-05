
'use server';

/**
 * @fileOverview Extracts structured information from resume text.
 *
 * - extractResumeInfo - A function that parses a resume and returns structured data.
 * - ExtractResumeInfoInput - The input type for the extractResumeInfo function.
 * - ExtractedResumeInfo - The return type for the extractResumeInfo function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ExtractResumeInfoInputSchema = z.object({
  resumeText: z.string().describe('The full text content of a resume.'),
});
export type ExtractResumeInfoInput = z.infer<typeof ExtractResumeInfoInputSchema>;

const ExtractedResumeInfoSchema = z.object({
  name: z.string().optional().describe("The candidate's full name."),
  contact: z.object({
    email: z.string().optional(),
    phone: z.string().optional(),
    linkedin: z.string().optional(),
    website: z.string().optional(),
  }).optional(),
  summary: z.string().optional().describe("A professional summary or objective statement."),
  experience: z.array(z.object({
    jobTitle: z.string(),
    company: z.string(),
    location: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    responsibilities: z.array(z.string()),
  })).optional().describe("A list of professional experiences."),
  education: z.array(z.object({
    institution: z.string(),
    degree: z.string(),
    major: z.string().optional(),
    graduationDate: z.string().optional(),
  })).optional().describe("A list of educational qualifications."),
  skills: z.array(z.string()).optional().describe("A list of skills."),
  projects: z.array(z.object({
    name: z.string(),
    description: z.string(),
    technologies: z.array(z.string()).optional(),
  })).optional().describe("A list of personal or academic projects."),
  certifications: z.array(z.string()).optional().describe("A list of certifications."),
});
export type ExtractedResumeInfo = z.infer<typeof ExtractedResumeInfoSchema>;


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
  prompt: `You are an expert resume parser. Your task is to analyze the provided resume text and extract key information into a structured JSON format.

  Instructions:
  1.  Thoroughly read the resume text provided below.
  2.  Identify and extract information for the following fields: name, contact (email, phone, etc.), summary, experience (job title, company, dates, responsibilities), education (institution, degree, graduation date), skills, projects, and certifications.
  3.  Populate the JSON object with the data you find.
  4.  If a section or piece of information (like 'projects' or 'certifications') is not present in the resume, you MUST omit the corresponding field or array from the JSON output entirely. Do not include empty arrays or null values for missing sections.
  5.  Return ONLY the valid JSON object that matches the provided schema. Do not include any extra text, explanations, or markdown formatting like \`\`\`json.

  Resume Text:
  {{{resumeText}}}
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
