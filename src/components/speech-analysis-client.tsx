
"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Loader2, Mic, Upload, X, Download, FileText, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  analyzeSpeech,
  AnalyzeSpeechOutput,
  AnalyzeSpeechInput,
} from "@/ai/flows/analyze-speech";
import {
  generateQuestionsFromResume,
  InterviewQuestion,
} from "@/ai/flows/generate-questions-from-resume";
import {
  extractResumeInfo,
  ExtractedResumeInfo,
} from "@/ai/flows/extract-resume-info";
import AnalysisDashboard from "@/components/analysis-dashboard";
import EmptyState from "@/components/empty-state";
import { generatePdfReport } from "@/lib/pdf";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";


type AnalysisMode = "Presentation Mode" | "Interview Mode" | "Practice Mode";

// Define types for the SpeechRecognition API to fix TypeScript errors
interface SpeechRecognitionResult {
  isFinal: boolean;
  [key: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionResultList {
  [key: number]: SpeechRecognitionResult;
  length: number;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface CustomSpeechRecognition extends EventTarget {
  // Properties
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  serviceURI: string;
  grammars: any;
  
  // Methods
  start(): void;
  stop(): void;
  abort(): void;
  
  // Event handlers
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onstart: (() => void) | null;
  onspeechstart: (() => void) | null;
  onspeechend: (() => void) | null;
  onsoundstart: (() => void) | null;
  onsoundend: (() => void) | null;
  onaudiostart: (() => void) | null;
  onaudioend: (() => void) | null;
  onnomatch: ((event: SpeechRecognitionEvent) => void) | null;
}


declare global {
  interface Window {
    SpeechRecognition: new () => CustomSpeechRecognition;
    webkitSpeechRecognition: new () => CustomSpeechRecognition;
  }
}

const PresentationIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><path d="M2 3h20"></path><path d="M21 3v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V3"></path><path d="m7 21 5-5 5 5"></path></svg>
);
const InterviewIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path><path d="M8 12a2 2 0 0 0 2-2V8H8"></path><path d="M14 12a2 2 0 0 0 2-2V8h-2"></path></svg>
);
const PracticeIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="00 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"></rect><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><path d="m9 14 2 2 4-4"></path></svg>
);

const modeOptions = [
    { 
        value: "Presentation Mode", 
        icon: PresentationIcon, 
        title: "Presentation",
        description: "General-purpose analysis of structure, clarity, and engagement.",
    },
    { 
        value: "Interview Mode",
        icon: InterviewIcon,
        title: "Interview",
        description: "Upload a resume to get tailored questions and practice your answers.",
    },
    {
        value: "Practice Mode",
        icon: PracticeIcon,
        title: "Practice",
        description: "Compares your answer against a 'perfect' answer you provide.",
    }
];

export default function SpeechAnalysisClient() {
  const [mode, setMode] = useState<AnalysisMode>("Presentation Mode");
  const [question, setQuestion] = useState("");
  const [perfectAnswer, setPerfectAnswer] = useState("");
  const [transcript, setTranscript] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [currentTab, setCurrentTab] = useState("live");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Analyzing...");
  const [analysisResult, setAnalysisResult] =
    useState<AnalyzeSpeechOutput | null>(null);
  const [isSpeechRecognitionSupported, setIsSpeechRecognitionSupported] = useState(false);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [generatedQuestions, setGeneratedQuestions] = useState<InterviewQuestion[]>([]);
  const [activeQuestion, setActiveQuestion] = useState<InterviewQuestion | null>(null);
  const [resumeInfoText, setResumeInfoText] = useState("");


  const { toast } = useToast();

  const recognitionRef = useRef<CustomSpeechRecognition | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setIsSpeechRecognitionSupported(true);
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      let final_transcript = "";
      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let interim_transcript = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            final_transcript += event.results[i][0].transcript;
          } else {
            interim_transcript += event.results[i][0].transcript;
          }
        }
        setTranscript(final_transcript + interim_transcript);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        toast({
          variant: "destructive",
          title: "Speech Recognition Error",
          description: `Error: ${event.error}`,
        });
      };

      return () => {
        if (recognitionRef.current) {
          recognitionRef.current.stop();
        }
      };
    } else {
      console.warn("SpeechRecognition API is not supported in this browser.");
    }
  }, [toast]);
  
  const handleToggleListening = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      setTranscript("");
      recognitionRef.current.start();
    }
    setIsListening(!isListening);
  };
  
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(audioBlob);
        setAudioBlob(audioBlob);
        setAudioURL(url);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Microphone access denied:", error);
      toast({
        variant: "destructive",
        title: "Microphone Error",
        description: "Could not access microphone. Please check permissions.",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleToggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      clearAudio();
      startRecording();
    }
  };

  const handleDownloadRecording = () => {
    if (audioURL) {
      const a = document.createElement('a');
      a.href = audioURL;
      a.download = 'recording.webm';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      clearAudio();
      setAudioBlob(file);
      setAudioURL(URL.createObjectURL(file));
      setCurrentTab('upload');
    }
  };
  
  const handleResumeFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setResumeFile(file);
      handleExtractResumeInfo(file);
    }
  };

  const clearAudio = () => {
    setAudioBlob(null);
    if(audioURL) {
      URL.revokeObjectURL(audioURL);
    }
    setAudioURL(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (isRecording) {
      stopRecording();
    }
    audioChunksRef.current = [];
  };
  
  const fileToDataUri = (file: Blob) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => resolve(event.target?.result as string);
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });

  const fileToText = (file: File) =>
    new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => resolve(event.target?.result as string);
        reader.onerror = (error) => reject(error);
        reader.readAsText(file);
    });

  const handleExtractResumeInfo = async (file: File) => {
    if (!file) {
      toast({ variant: "destructive", title: "No resume file selected." });
      return;
    }
    setIsLoading(true);
    setLoadingMessage("Extracting info from resume...");
    setResumeInfoText("");
    setGeneratedQuestions([]);
    setActiveQuestion(null);
    try {
      const resumeText = await fileToText(file);
      const result = await extractResumeInfo({ resumeText });
      setResumeInfoText(JSON.stringify(result, null, 2));
      toast({
        title: "Resume Info Extracted",
        description: "Review the extracted information below, then generate questions.",
      });
    } catch (error) {
      console.error("Resume extraction failed:", error);
      toast({
        variant: "destructive",
        title: "Resume Extraction Failed",
        description: "Could not read or parse the resume. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateQuestions = async () => {
      if (!resumeInfoText) {
          toast({ variant: "destructive", title: "No resume information to generate questions from." });
          return;
      }
      setIsLoading(true);
      setLoadingMessage("Generating questions...");
      setGeneratedQuestions([]);
      setActiveQuestion(null);
      try {
          // Here we use the potentially edited text from the textarea
          const result = await generateQuestionsFromResume({ resumeText: resumeInfoText });
          if (result.questions && result.questions.length > 0) {
              setGeneratedQuestions(result.questions);
              toast({
                  title: "Questions Generated",
                  description: "Review the questions and ideal answers, then record your response."
              });
          } else {
              toast({ variant: "destructive", title: "Could not generate questions." });
          }
      } catch (error) {
          console.error("Question generation failed:", error);
          toast({
              variant: "destructive",
              title: "Question Generation Failed",
              description: "Could not generate questions from the provided info. Please try again.",
          });
      } finally {
          setIsLoading(false);
      }
  };

  const handleAnalyze = async () => {
    let speechSample = "";
    if (currentTab === "live") {
      if (!transcript) {
        toast({ variant: "destructive", title: "No transcription provided." });
        return;
      }
      speechSample = transcript;
    } else if (currentTab === 'record' || currentTab === 'upload') {
        if (!audioBlob) {
            toast({ variant: "destructive", title: "No audio provided." });
            return;
        }
        speechSample = await fileToDataUri(audioBlob);
    }

    if (!speechSample) {
        toast({ variant: "destructive", title: "No speech sample provided." });
        return;
    }

    const input: AnalyzeSpeechInput = { speechSample, mode };
    
    if (mode === "Interview Mode") {
        if (!activeQuestion) {
            toast({ variant: "destructive", title: "Please select a question to answer from the generated list." });
            return;
        }
        input.question = activeQuestion.question;
        input.perfectAnswer = activeQuestion.answer;
        // In Interview mode, we switch the AI mode to "Practice Mode" for evaluation
        // so it performs the comparison against the perfect answer.
        input.mode = "Practice Mode";
    }

    if (mode === "Practice Mode") {
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

  const handleDownloadPDF = useCallback(() => {
    if (analysisResult) {
      generatePdfReport(analysisResult);
    }
  }, [analysisResult]);
  
  const resetInterviewState = () => {
    setResumeFile(null);
    setResumeInfoText("");
    setGeneratedQuestions([]);
    setActiveQuestion(null);
  };


  return (
    <div className="w-full max-w-7xl space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <div className="w-full space-y-4">
            <h2 className="flex items-center gap-3 font-headline text-2xl font-semibold">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">1</span>
                Provide Your Speech
            </h2>
            <Card className="rounded-lg border shadow-lg bg-card/50 w-full h-full">
                <Tabs value={currentTab} onValueChange={(v) => { clearAudio(); setTranscript(""); setCurrentTab(v); }} className="w-full flex flex-col h-full">
                    <CardHeader className="p-4 border-b">
                        <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="live">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" x2="12" y1="19" y2="22"></line></svg>
                            Live
                        </TabsTrigger>
                        <TabsTrigger value="record">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><path d="M2 10v3"></path><path d="M6 6v11"></path><path d="M10 3v18"></path><path d="M14 8v7"></path><path d="M18 5v13"></path><path d="M22 10v3"></path></svg>
                            Record
                        </TabsTrigger>
                        <TabsTrigger value="upload">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" x2="12" y1="3" y2="15"></line></svg>
                            Upload
                        </TabsTrigger>
                        </TabsList>
                        <div className="pt-2 text-center">
                            <p className="text-xs text-muted-foreground">Note: For best results, keep recordings to ~30 seconds.</p>
                        </div>
                    </CardHeader>
                    <div className="flex-grow">
                        <TabsContent value="live" className="h-full mt-0">
                            <CardContent className="p-4 h-full flex flex-col">
                                <Textarea
                                placeholder="Your transcribed speech will appear here..."
                                value={transcript}
                                onChange={(e) => setTranscript(e.target.value)}
                                className="h-48 resize-none bg-secondary/50 border-dashed flex-grow"
                                readOnly={isListening}
                                />
                                <div className="flex items-center pt-4">
                                    <Button onClick={handleToggleListening} className="w-full" size="lg" disabled={!isSpeechRecognitionSupported}>
                                        <Mic className="mr-2 h-5 w-5" />
                                        {isListening ? "Stop live transcription" : "Start live transcription"}
                                    </Button>
                                </div>
                            </CardContent>
                        </TabsContent>
                         <TabsContent value="record" className="h-full mt-0">
                            <CardContent className="p-4 h-full flex flex-col">
                                <div className="flex-grow flex items-center justify-center">
                                    {audioURL ? (
                                        <div className="w-full space-y-4">
                                            <audio controls src={audioURL} className="w-full"></audio>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center space-y-4 rounded-md border border-dashed bg-background h-48 w-full">
                                            <p className="text-sm text-muted-foreground">{isRecording ? "Recording in progress..." : "Click button to start recording"}</p>
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center pt-4 gap-4">
                                     {audioURL ? (
                                        <>
                                            <Button onClick={handleDownloadRecording} variant="secondary" className="w-full" size="lg"><Download className="mr-2" /> Download</Button>
                                            <Button onClick={clearAudio} variant="outline" className="w-full" size="lg"><X className="mr-2" /> Clear</Button>
                                        </>
                                     ) : (
                                        <Button onClick={handleToggleRecording} variant={isRecording ? "destructive" : "default"} size="lg" className="w-full">
                                            <Mic className="mr-2 h-5 w-5" />
                                            {isRecording ? "Stop Recording" : "Start Recording"}
                                        </Button>
                                     )}
                               </div>
                            </CardContent>
                         </TabsContent>
                         <TabsContent value="upload" className="h-full mt-0">
                             <CardContent className="p-4 h-full flex flex-col">
                                <div className="flex-grow flex items-center justify-center">
                                {audioURL ? (
                                    <div className="w-full space-y-4">
                                        <audio controls src={audioURL} className="w-full"></audio>
                                        </div>
                                    ) : (
                                    <label htmlFor="audio-upload" className="w-full h-48 flex flex-col items-center justify-center p-6 border-2 border-dashed border-muted-foreground/30 rounded-lg cursor-pointer hover:bg-secondary/50 transition-colors">
                                        <Upload className="h-10 w-10 text-muted-foreground/50 mb-2"/>
                                        <p className="text-muted-foreground">Drop an audio file here or click.</p>
                                        <input id="audio-upload" type="file" accept="audio/*" onChange={handleFileChange} className="hidden" ref={fileInputRef}/>
                                    </label>
                                    )}
                                </div>
                                 <div className="flex items-center pt-4">
                                    {audioURL ? (
                                        <Button onClick={clearAudio} variant="outline" className="w-full" size="lg"><X className="mr-2" /> Clear Selection</Button>
                                    ) : (
                                        <Button asChild size="lg" className="w-full">
                                        <label htmlFor="audio-upload">
                                            <Upload className="mr-2 h-5 w-5" />
                                            Browse Files
                                        </label>
                                        </Button>
                                    )}
                                </div>
                             </CardContent>
                         </TabsContent>
                    </div>
                </Tabs>
            </Card>
        </div>

        <div className="w-full space-y-4">
             <h2 className="flex items-center gap-3 font-headline text-2xl font-semibold">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">2</span>
                Set Analysis Context
            </h2>
             <div className="space-y-4">
                {modeOptions.map(option => {
                    const isSelected = mode === option.value;
                    return (
                        <Card 
                            key={option.value}
                            onClick={() => {
                                setMode(option.value as AnalysisMode);
                                resetInterviewState();
                                setQuestion("");
                                setPerfectAnswer("");
                            }}
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
                            {isSelected && (
                                 <div className="mt-4 space-y-4">
                                    {option.value === "Interview Mode" && (
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="resume-upload" className="font-semibold">1. Upload Resume</Label>
                                                {resumeFile ? (
                                                    <div className="flex items-center justify-between rounded-md border bg-background p-2">
                                                        <div className="flex items-center gap-2">
                                                            <CheckCircle className="h-5 w-5 text-green-500" />
                                                            <span className="text-sm font-medium">{resumeFile.name}</span>
                                                        </div>
                                                        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); resetInterviewState(); }}>
                                                            <X className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <Button asChild variant="outline" className="w-full" onClick={(e) => e.stopPropagation()}>
                                                        <label htmlFor="resume-upload">
                                                            <FileText className="mr-2 h-4 w-4" />
                                                            Select Resume File
                                                            <input id="resume-upload" type="file" accept=".txt,.pdf,.doc,.docx" onChange={handleResumeFileChange} className="hidden" />
                                                        </label>
                                                    </Button>
                                                )}
                                            </div>
                                            
                                            {(isLoading && loadingMessage.includes("Extracting")) && (
                                                <div className="flex items-center justify-center space-x-2">
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                    <p className="text-sm text-muted-foreground">Extracting information...</p>
                                                </div>
                                            )}

                                            {resumeInfoText && (
                                                <div className="space-y-2">
                                                    <Label htmlFor="resume-info" className="font-semibold">2. Review Extracted Information</Label>
                                                    <Textarea 
                                                        id="resume-info"
                                                        value={resumeInfoText}
                                                        onChange={(e) => setResumeInfoText(e.target.value)}
                                                        rows={10}
                                                        className="bg-background text-xs font-mono"
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                     <Button 
                                                        onClick={(e) => { e.stopPropagation(); handleGenerateQuestions(); }} 
                                                        className="w-full" 
                                                        disabled={isLoading && loadingMessage.includes("Generating")}>
                                                            {isLoading && loadingMessage.includes("Generating") ? (
                                                                <>
                                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                                Generating...
                                                                </>
                                                            ) : "Generate Questions from Info"}
                                                    </Button>
                                                </div>
                                            )}

                                            {generatedQuestions.length > 0 && (
                                                <div className="space-y-2">
                                                    <Label className="font-semibold">3. Your Questions & Ideal Answers</Label>
                                                    <p className="text-xs text-muted-foreground">Click a question to select it for your practice session.</p>
                                                    <Accordion type="single" collapsible className="w-full" onValueChange={(value) => {
                                                        const questionIndex = parseInt(value.split('-')[1]);
                                                        setActiveQuestion(generatedQuestions[questionIndex] || null);
                                                    }}>
                                                        {generatedQuestions.map((q, index) => (
                                                        <AccordionItem value={`item-${index}`} key={index}>
                                                            <AccordionTrigger className={cn("font-semibold text-left", activeQuestion?.question === q.question && "text-primary")} onClick={(e) => e.stopPropagation()}>{index + 1}. {q.question}</AccordionTrigger>
                                                            <AccordionContent onClick={(e) => e.stopPropagation()}>
                                                            <p className="text-sm text-muted-foreground italic">
                                                                {q.answer}
                                                            </p>
                                                            </AccordionContent>
                                                        </AccordionItem>
                                                        ))}
                                                    </Accordion>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    {option.value === "Practice Mode" && (
                                       <>
                                        <div className="space-y-2">
                                            <Label htmlFor="question" className="font-semibold">Interview Question</Label>
                                            <Textarea
                                                id="question"
                                                value={question}
                                                onChange={(e) => setQuestion(e.target.value)}
                                                placeholder="Enter the interview question here..."
                                                className="bg-background"
                                                onClick={(e) => e.stopPropagation()}
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
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        </div>
                                       </>
                                    )}
                                </div>
                            )}
                         </Card>
                    )
                })}
            </div>
        </div>
      </div>

      <div className="flex justify-center py-6">
        <Button onClick={handleAnalyze} size="lg" disabled={isLoading} className="w-full max-w-sm">
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
