/**
 * @fileOverview Centralized Zod schemas and TypeScript types for the application.
 */

import { z } from 'genkit';

// === analyze-speech.ts ===

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

export const AnalyzeSpeechInputSchema = z.object({
  speechSample: z.string().describe('The speech sample to analyze, either transcription or an audio data URI.'),
  mode: z.enum(['Presentation Mode', 'Interview Mode', 'Rehearsal Mode']).describe('The context for the analysis.'),
  question: z.string().optional().describe('The interview question being answered, required for Interview Mode and Rehearsal mode.'),
  perfectAnswer: z.string().optional().describe('A perfect answer to compare against, required for Rehearsal Mode.'),
});
export type AnalyzeSpeechInput = z.infer<typeof AnalyzeSpeechInputSchema>;

export const AnalyzeSpeechOutputSchema = z.object({
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
      comparison: z.string().optional().describe("How the candidate's answer compares with the perfect answer. This is only required for Rehearsal Mode."),
      feedback: z.string().describe('Actionable feedback to improve the criteria.'),
    })
  ).describe('Detailed evaluation of the 15 specified criteria.'),
  totalScore: z.number().min(0).max(100).describe('An overall assessment that summarizes performance across all criteria (0-100).'),
  overallAssessment: z.string().describe('An overall assessment of the speech'),
  suggestedSpeech: z.string().describe('A sample of how the speaker could have delivered their message more effectively.'),
});
export type AnalyzeSpeechOutput = z.infer<typeof AnalyzeSpeechOutputSchema>;


// === extract-resume-info.ts ===

export const ExtractResumeInfoInputSchema = z.object({
  resumeDataUri: z
    .string()
    .describe(
      "A resume file, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type ExtractResumeInfoInput = z.infer<typeof ExtractResumeInfoInputSchema>;

export const ExtractedResumeInfoSchema = z.object({
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


// === extract-text-from-file.ts ===

export const ExtractTextFromFileInputSchema = z.object({
  fileDataUri: z
    .string()
    .describe(
      "A file (e.g., PDF, DOCX), as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type ExtractTextFromFileInput = z.infer<typeof ExtractTextFromFileInputSchema>;

export const ExtractTextFromFileOutputSchema = z.object({
  text: z.string().describe("The full plain text content extracted from the file."),
});
export type ExtractTextFromFileOutput = z.infer<typeof ExtractTextFromFileOutputSchema>;


// === generate-questions-from-resume.ts ===

export const GenerateQuestionsFromResumeInputSchema = z.object({
  resumeSummary: z.string().describe('A summary of the most important parts of a resume, including job titles, companies, skills, and projects.'),
  resumeText: z.string().describe('The full text content of a resume.'),
});
export type GenerateQuestionsFromResumeInput = z.infer<
  typeof GenerateQuestionsFromResumeInputSchema
>;

export const InterviewQuestionSchema = z.object({
    question: z.string().describe("The interview question."),
    answer: z.string().describe("The ideal, detailed answer to the question, tailored to the resume."),
});
export type InterviewQuestion = z.infer<typeof InterviewQuestionSchema>;

export const GenerateQuestionsFromResumeOutputSchema = z.object({
  questions: z
    .array(InterviewQuestionSchema)
    .max(3)
    .describe('An array of exactly 3 interview questions and their ideal answers.'),
});
export type GenerateQuestionsFromResumeOutput = z.infer<
  typeof GenerateQuestionsFromResumeOutputSchema
>;
