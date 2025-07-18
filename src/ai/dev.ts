import { config } from 'dotenv';
config();

import '@/ai/flows/generate-interview-questions.ts';
import '@/ai/flows/analyze-speech.ts';
import '@/ai/flows/summarize-speech.ts';