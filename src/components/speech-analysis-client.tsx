
"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Loader2, Mic, Upload, X, FileText, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { analyzeSpeech } from "@/ai/flows/analyze-speech";
import { generateQuestionsFromResume } from "@/ai/flows/generate-questions-from-resume";
import { extractResumeInfo } from "@/ai/flows/extract-resume-info";
import { extractTextFromFile } from "@/ai/flows/extract-text-from-file";
import type {
  AnalyzeSpeechOutput,
  AnalyzeSpeechInput,
  InterviewQuestion,
  ExtractedResumeInfo,
} from "@/ai/schemas";
import AnalysisDashboard from "@/components/analysis-dashboard";
import EmptyState from "@/components/empty-state";
import { generatePdfReport } from "@/lib/pdf";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import SpeechInput from "./speech-input";

type AnalysisMode = "Presentation Mode" | "Interview Mode" | "Rehearsal Mode";

const PresentationIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><path d="M2 3h20"></path><path d="M21 3v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V3"></path><path d="m7 21 5-5 5 5"></path></svg>
);
const InterviewIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path><path d="M8 12a2 2 0 0 0 2-2V8H8"></path><path d="M14 12a2 2 0 0 0 2-2V8h-2"></path></svg>
);
const RehearsalIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"></rect><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><path d="m9 14 2 2 4-4"></path></svg>
);

const modeOptions = [
    { 
        value: "Presentation Mode", 
        icon: PresentationIcon, 
        title: "Presentation",
        description: "Present on any topic. Get instant feedback on your delivery, language, and content.",
    },
    { 
        value: "Interview Mode",
        icon: InterviewIcon,
        title: "Interview",
        description: "Practice for an interview. Upload a resume to generate tailored questions and answers.",
    },
    {
        value: "Rehearsal Mode",
        icon: RehearsalIcon,
        title: "Rehearsal",
        description: "Rehearse a specific answer. Provide a question and an ideal answer to compare your response against.",
    }
];

export default function SpeechAnalysisClient() {
  const [mode, setMode] = useState<AnalysisMode>("Presentation Mode");
  const [question, setQuestion] = useState("");
  const [perfectAnswer, setPerfectAnswer] = useState("");
  const [speechSample, setSpeechSample] = useState<string | null>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Analyzing...");
  const [analysisResult, setAnalysisResult] =
    useState<AnalyzeSpeechOutput | null>(null);

  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [generatedQuestions, setGeneratedQuestions] = useState<InterviewQuestion[]>([]);
  const [activeQuestion, setActiveQuestion] = useState<InterviewQuestion | null>(null);
  const [resumeInfoText, setResumeInfoText] = useState("");
  const [extractedResumeData, setExtractedResumeData] = useState<ExtractedResumeInfo | null>(null);
  const [showIdealAnswer, setShowIdealAnswer] = useState(false);


  const { toast } = useToast();

  const fileToDataUri = (file: Blob) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => resolve(event.target?.result as string);
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  
  const handleResumeFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setResumeFile(file);
    setIsLoading(true);
    setLoadingMessage("Extracting resume info...");
    setResumeInfoText("");
    setExtractedResumeData(null);
    setGeneratedQuestions([]);
    setActiveQuestion(null);

    try {
      const resumeDataUri = await fileToDataUri(file);
      
      const [structuredInfo, textInfo] = await Promise.all([
        extractResumeInfo({ resumeDataUri }),
        extractTextFromFile({ fileDataUri: resumeDataUri }),
      ]);
      
      setExtractedResumeData(structuredInfo);
      setResumeInfoText(textInfo.text);

      toast({
        title: "Resume Info Extracted",
        description: "Review the extracted information, then generate questions.",
      });
    } catch (error: any) {
      console.error("Resume extraction failed:", error);
      toast({
        variant: "destructive",
        title: "Resume Extraction Failed",
        description: error.message || "Could not read or parse the resume file. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateQuestions = async () => {
      if (!extractedResumeData || !resumeInfoText) {
          toast({ variant: "destructive", title: "No resume information to generate questions from." });
          return;
      }
      setIsLoading(true);
      setLoadingMessage("Generating questions...");
      setGeneratedQuestions([]);
      setActiveQuestion(null);

      try {
          const summary = extractedResumeData.summary || `The candidate's experience includes: ${extractedResumeData.experience?.map(e => e.jobTitle).join(', ')}.`;
          
          const result = await generateQuestionsFromResume({ resumeSummary: summary, resumeText: resumeInfoText });
          if (result.questions && result.questions.length > 0) {
              setGeneratedQuestions(result.questions);
              toast({
                  title: "Questions Generated",
                  description: "Select a question below to start practicing."
              });
          } else {
              toast({ variant: "destructive", title: "Could not generate questions." });
          }
      } catch (error: any) {
          console.error("Question generation failed:", error);
          toast({
              variant: "destructive",
              title: "Question Generation Failed",
              description: error.message || "Could not generate questions from the provided info. Please try again.",
          });
      } finally {
          setIsLoading(false);
      }
  };

  const handleAnalyze = async () => {
    if (!speechSample) {
        toast({ variant: "destructive", title: "No speech sample provided." });
        return;
    }

    const input: AnalyzeSpeechInput = { speechSample, mode };
    
    if (mode === "Interview Mode") {
        if (!activeQuestion) {
            toast({ variant: "destructive", title: "Please select a question to answer." });
            return;
        }
        input.question = activeQuestion.question;
        input.perfectAnswer = activeQuestion.answer;
        input.mode = "Rehearsal Mode"; 
    }

    if (mode === "Rehearsal Mode") {
       if (!question || !perfectAnswer) {
         toast({ variant: "destructive", title: "Please enter both a question and a perfect answer." });
         return;
       }
       input.question = question;
       input.perfectAnswer = perfectAnswer;
    }

    setIsLoading(true);
    setLoadingMessage("Analyzing speech...");
    setAnalysisResult(null);

    try {
      const result = await analyzeSpeech(input);
      setAnalysisResult(result);
    } catch (error) {
      console.error("Analysis failed:", error);
      toast({
        variant: "destructive",
        title: "Analysis Failed",
        description: "Something went wrong. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadPDF = useCallback(async () => {
    if (analysisResult) {
      await generatePdfReport(analysisResult);
    }
  }, [analysisResult]);
  
  const resetInterviewState = () => {
    setResumeFile(null);
    setResumeInfoText("");
    setExtractedResumeData(null);
    setGeneratedQuestions([]);
    setActiveQuestion(null);
    setShowIdealAnswer(false);
  };

  const handleModeChange = (newMode: AnalysisMode) => {
    setMode(newMode);
    setAnalysisResult(null);
    setSpeechSample(null);
    if (newMode !== 'Interview Mode') {
      resetInterviewState();
    }
    if (newMode !== 'Rehearsal Mode') {
      setQuestion('');
      setPerfectAnswer('');
    }
  }

  return (
    <div className="w-full max-w-7xl space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <div className="space-y-4">
            <h2 className="font-headline text-2xl font-semibold">
                Select Analysis Context
            </h2>
            <div className="grid grid-cols-1 gap-4">
                {modeOptions.map(option => {
                    const isSelected = mode === option.value;
                    return (
                        <Card 
                            key={option.value}
                            onClick={() => handleModeChange(option.value as AnalysisMode)}
                            className={cn(
                                "rounded-lg border-2 bg-card/50 p-4 transition-all cursor-pointer hover:shadow-lg",
                                isSelected ? "border-primary shadow-md" : "border-muted hover:border-muted-foreground/50"
                            )}
                        >
                            <div className="flex items-start gap-4">
                                <div className={cn("flex-shrink-0 h-12 w-12 rounded-lg flex items-center justify-center bg-primary/10 text-primary", isSelected && "bg-primary text-primary-foreground")}>
                                    <option.icon />
                                </div>
                                <div className="flex-grow">
                                    <h3 className="font-bold">{option.title}</h3>
                                    <p className="text-sm text-muted-foreground">{option.description}</p>
                                </div>
                            </div>
                        </Card>
                    )
                })}
            </div>
        </div>

        <div className="space-y-6">
          {mode === "Presentation Mode" && (
            <Card className="rounded-lg border shadow-lg bg-card/50 w-full">
                <CardHeader>
                    <CardTitle className="font-headline text-2xl">Provide Your Speech</CardTitle>
                </CardHeader>
                <CardContent>
                    <SpeechInput onSpeechSampleReady={setSpeechSample} key="presentation" />
                </CardContent>
            </Card>
          )}

          {mode === "Rehearsal Mode" && (
            <div className="space-y-6">
                <Card className="rounded-lg border shadow-lg bg-card/50 w-full">
                    <CardHeader>
                        <CardTitle className="font-headline text-2xl">Set Up Your Rehearsal</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="question" className="font-semibold">Interview Question</Label>
                            <Textarea
                                id="question"
                                value={question}
                                onChange={(e) => setQuestion(e.target.value)}
                                placeholder="Enter the interview question here..."
                                className="bg-background"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="perfect-answer" className="font-semibold">Your Perfect Answer</Label>
                            <Textarea
                                id="perfect-answer"
                                value={perfectAnswer}
                                onChange={(e) => setPerfectAnswer(e.target.value)}
                                placeholder="Provide an ideal or 'perfect' answer for comparison."
                                className="bg-background"
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card className="rounded-lg border shadow-lg bg-card/50 w-full">
                    <CardHeader>
                        <CardTitle className="font-headline text-2xl">Provide Your Speech</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <SpeechInput onSpeechSampleReady={setSpeechSample} key="rehearsal" />
                    </CardContent>
                </Card>
            </div>
          )}

          {mode === "Interview Mode" && (
              <div className="space-y-6">
                  <Card className="rounded-lg border shadow-lg bg-card/50 w-full">
                      <CardHeader>
                          <CardTitle className="font-headline text-2xl">Step 1: Upload Resume</CardTitle>
                      </CardHeader>
                      <CardContent>
                          {resumeFile ? (
                              <div className="flex items-center justify-between rounded-md border bg-background p-3">
                                  <div className="flex items-center gap-2">
                                      <CheckCircle className="h-5 w-5 text-green-500" />
                                      <span className="text-sm font-medium">{resumeFile.name}</span>
                                  </div>
                                  <Button variant="ghost" size="icon" onClick={resetInterviewState}>
                                      <X className="h-4 w-4" />
                                  </Button>
                              </div>
                          ) : (
                              <Button asChild variant="outline" className="w-full">
                                  <label htmlFor="resume-upload">
                                      <FileText className="mr-2 h-4 w-4" />
                                      Select Resume File (.pdf, .txt, .docx)
                                      <input id="resume-upload" type="file" accept=".pdf,.txt,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={handleResumeFileChange} className="hidden" />
                                  </label>
                              </Button>
                          )}
                          {(isLoading && loadingMessage.includes("Extracting")) && (
                            <div className="flex items-center justify-center space-x-2 mt-4">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <p className="text-sm text-muted-foreground">Extracting info...</p>
                            </div>
                          )}
                      </CardContent>
                  </Card>

                  {resumeInfoText && (
                      <Card className="rounded-lg border shadow-lg bg-card/50 w-full">
                          <CardHeader>
                              <CardTitle className="font-headline text-2xl">Step 2: Generate & Select Question</CardTitle>
                               <CardDescription>The AI will evaluate how relevant your answer is to the selected question.</CardDescription>
                          </CardHeader>
                          <CardContent>
                              <Button 
                              onClick={handleGenerateQuestions}
                              className="w-full mb-4" 
                              disabled={isLoading && loadingMessage.includes("Generating")}>
                                  {isLoading && loadingMessage.includes("Generating") ? (
                                      <>
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                      Generating...
                                      </>
                                  ) : "Generate Questions"}
                              </Button>

                              {generatedQuestions.length > 0 && (
                                <RadioGroup 
                                    onValueChange={(value) => {
                                        const question = generatedQuestions.find(q => q.question === value);
                                        setActiveQuestion(question || null);
                                    }}
                                    className="space-y-2 mt-4"
                                >
                                    {generatedQuestions.map((q, index) => (
                                        <div key={index} className="rounded-md border p-4 flex flex-col gap-4">
                                            <div className="flex items-start gap-3">
                                                <RadioGroupItem value={q.question} id={`q-${index}`} />
                                                <Label htmlFor={`q-${index}`} className="font-semibold text-base cursor-pointer flex-grow">{q.question}</Label>
                                            </div>

                                            {activeQuestion?.question === q.question && (
                                                <div className="pl-8 space-y-4">
                                                    <div className="flex items-center space-x-2">
                                                        <Switch id={`show-answer-${index}`} checked={showIdealAnswer} onCheckedChange={setShowIdealAnswer} />
                                                        <Label htmlFor={`show-answer-${index}`}>Show ideal answer</Label>
                                                    </div>
                                                    {showIdealAnswer && (
                                                        <div className="text-sm text-muted-foreground italic p-3 bg-secondary/50 rounded-md border">
                                                            {q.answer}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </RadioGroup>
                              )}
                          </CardContent>
                      </Card>
                  )}

                  {activeQuestion && (
                      <Card className="rounded-lg border shadow-lg bg-card/50 w-full">
                          <CardHeader>
                              <CardTitle className="font-headline text-2xl">Step 3: Provide Your Answer</CardTitle>
                              <CardDescription>Now, provide your answer to the selected question: "{activeQuestion.question}"</CardDescription>
                          </CardHeader>
                          <CardContent>
                              <SpeechInput onSpeechSampleReady={setSpeechSample} key={activeQuestion.question} />
                          </CardContent>
                      </Card>
                  )}
              </div>
          )}
        </div>
      </div>


      <div className="flex justify-center py-6">
        <Button onClick={handleAnalyze} size="lg" disabled={isLoading || !speechSample} className="w-full max-w-sm">
          {isLoading && loadingMessage.includes("Analyzing") ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {loadingMessage}
            </>
          ) : (
             "Analyze My Speech"
          )}
        </Button>
      </div>

      <div className="mt-8 w-full">
        {isLoading && loadingMessage === "Analyzing speech..." ? (
          <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border p-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="mt-4 text-muted-foreground">
              AI is analyzing your speech...
            </p>
          </div>
        ) : analysisResult ? (
          <AnalysisDashboard
            data={analysisResult}
            onDownloadPDF={handleDownloadPDF}
          />
        ) : (
          !isLoading && <EmptyState />
        )}
      </div>
    </div>
  );
}
