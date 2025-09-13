
"use client";

import { useState, useRef, useEffect } from "react";
import { Loader2, Mic, Upload, X, FileText, CheckCircle, AudioLines, Pause, Play, Download } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Header from "@/components/header";

// Define types for the SpeechRecognition API
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}
interface SpeechRecognitionResultList {
  item(index: number): SpeechRecognitionResult;
  readonly length: number;
}
interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  item(index: number): SpeechRecognitionAlternative;
  readonly length: number;
}
interface SpeechRecognitionAlternative {
  readonly transcript: string;
}
interface SpeechRecognitionErrorEvent extends Event {
  error: SpeechRecognitionErrorCode;
  message: string;
}
type SpeechRecognitionErrorCode =
  | 'no-speech' | 'aborted' | 'audio-capture' | 'network'
  | 'not-allowed' | 'service-not-allowed' | 'bad-grammar' | 'language-not-supported';
interface CustomSpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
}
declare global {
  interface Window {
    SpeechRecognition?: new () => CustomSpeechRecognition;
    webkitSpeechRecognition?: new () => CustomSpeechRecognition;
  }
}


type AnalysisMode = "Presentation Mode" | "Interview Mode" | "Rehearsal Mode";

const StepCircle = ({ number }: { number: number }) => (
  <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg">
    {number}
  </div>
);

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
    { value: "Presentation Mode", icon: PresentationIcon, title: "Presentation", description: "Practice a presentation or speech on any topic. The AI will provide a full analysis of your delivery, language, and content." },
    { value: "Interview Mode", icon: InterviewIcon, title: "Interview", description: "Practice for an interview. Upload a resume to generate tailored questions and answers, select a question, and then record your answer to get a detailed analysis." },
    { value: "Rehearsal Mode", icon: RehearsalIcon, title: "Rehearsal", description: "Enter a question and perfect answer, record your response, and get instant analysis." }
];

const tabDescriptions: Record<string, string> = {
    live: "See a real-time transcription as you speak to test your microphone. Note: For best results, keep recordings to ~30 seconds.",
    record: "Record your speech directly in the browser. Note: For best results, keep recordings to ~30 seconds.",
    upload: "Upload a pre-existing audio file for analysis. Note: For best results, keep recordings to ~30 seconds."
};


export default function Home() {
  // Overall state
  const [mode, setMode] = useState<AnalysisMode>("Presentation Mode");
  const [speechSample, setSpeechSample] = useState<string | null>(null);
  
  // Rehearsal mode state
  const [question, setQuestion] = useState("");
  const [perfectAnswer, setPerfectAnswer] = useState("");
  
  // Interview mode state
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [generatedQuestions, setGeneratedQuestions] = useState<InterviewQuestion[]>([]);
  const [activeQuestion, setActiveQuestion] = useState<InterviewQuestion | null>(null);
  const [resumeInfoText, setResumeInfoText] = useState("");
  const [extractedResumeData, setExtractedResumeData] = useState<ExtractedResumeInfo | null>(null);
  const [showIdealAnswer, setShowIdealAnswer] = useState(false);

  // Analysis state
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Analyzing...");
  const [analysisResult, setAnalysisResult] = useState<AnalyzeSpeechOutput | null>(null);

  // Speech Input state
  const [inputTab, setInputTab] = useState("live");
  const [transcript, setTranscript] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const [isSpeechRecognitionSupported, setIsSpeechRecognitionSupported] = useState(false);

  // Refs for APIs
  const recognitionRef = useRef<CustomSpeechRecognition | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const finalTranscriptRef = useRef<string>("");

  const { toast } = useToast();

  // Check for SpeechRecognition support on client-side
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      setIsSpeechRecognitionSupported(!!SpeechRecognition);
    }
  }, []);

  // Initialize SpeechRecognition
  useEffect(() => {
    if (!isSpeechRecognitionSupported) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    const recognition = recognitionRef.current;
    
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim_transcript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscriptRef.current += event.results[i][0].transcript;
        } else {
          interim_transcript += event.results[i][0].transcript;
        }
      }
      setTranscript(finalTranscriptRef.current + interim_transcript);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (['no-speech', 'aborted', 'network'].includes(event.error)) {
        setIsListening(false);
        return;
      }
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        toast({
          variant: "destructive",
          title: "Microphone Access Denied",
          description: "Please check your browser's microphone permissions. In Brave, you may need to disable Shields.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Speech Recognition Error",
          description: `Error: ${event.error}. Please try again.`,
        });
      }
      setIsListening(false);
    };
    
    return () => {
      recognition?.stop();
    };
  }, [isSpeechRecognitionSupported, toast]);

  // Update speechSample when transcript changes in live mode
  useEffect(() => {
    if (inputTab === 'live') {
      setSpeechSample(transcript);
    }
  }, [transcript, inputTab]);

  const fileToDataUri = (file: Blob) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => resolve(event.target?.result as string);
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });

  // == Speech Input Handlers ==
  const handleToggleListening = () => {
    const recognition = recognitionRef.current;
    if (!recognition) return;

    if (isListening) {
      recognition.stop();
    } else {
      try {
        finalTranscriptRef.current = ""; 
        setTranscript("");
        recognition.start();
      } catch (e: any) {
        if (e.name === 'InvalidStateError') {
          // Already started, do nothing
        } else {
          console.error("Could not start speech recognition:", e);
        }
      }
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

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setAudioURL(URL.createObjectURL(audioBlob));
        const dataUri = await fileToDataUri(audioBlob);
        setSpeechSample(dataUri);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Microphone access denied:", error);
      toast({ variant: "destructive", title: "Microphone Error", description: "Could not access microphone." });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };
  
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      clearAudio();
      setAudioURL(URL.createObjectURL(file));
      const dataUri = await fileToDataUri(file);
      setSpeechSample(dataUri);
    }
  };

  const clearAudio = () => {
    setSpeechSample(null);
    setAudioURL(null);
    stopRecording();
    audioChunksRef.current = [];
  };

  const clearAllInput = () => {
      clearAudio();
      setTranscript("");
      setSpeechSample(null);
      if(isListening && recognitionRef.current) {
        recognitionRef.current.stop();
      }
  };
  
  // == App Logic Handlers ==
  const handleResumeFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setResumeFile(file);
    setIsLoading(true);
    setLoadingMessage("Extracting resume info...");
    resetInterviewState(false);

    try {
      const resumeDataUri = await fileToDataUri(file);
      const [structuredInfo, textInfo] = await Promise.all([
        extractResumeInfo({ resumeDataUri }),
        extractTextFromFile({ fileDataUri: resumeDataUri }),
      ]);
      setExtractedResumeData(structuredInfo);
      setResumeInfoText(textInfo.text);
      toast({ title: "Resume Info Extracted", description: "Review the extracted information, then generate questions." });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Resume Extraction Failed", description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateQuestions = async () => {
      if (!extractedResumeData || !resumeInfoText) return;
      setIsLoading(true);
      setLoadingMessage("Generating questions...");
      setGeneratedQuestions([]);
      setActiveQuestion(null);

      try {
          const summary = extractedResumeData.summary || `The candidate's experience includes: ${extractedResumeData.experience?.map(e => e.jobTitle).join(', ')}.`;
          const result = await generateQuestionsFromResume({ resumeSummary: summary, resumeText: resumeInfoText });
          setGeneratedQuestions(result.questions || []);
          toast({ title: "Questions Generated", description: "Select a question below to start practicing." });
      } catch (error: any) {
          toast({ variant: "destructive", title: "Question Generation Failed", description: error.message });
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
    } else if (mode === "Rehearsal Mode") {
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
    } catch (error: any) {
      toast({ variant: "destructive", title: "Analysis Failed", description: error.message || "An unknown error occurred." });
    } finally {
      setIsLoading(false);
    }
  };

  const resetInterviewState = (fullReset = true) => {
    if(fullReset) setResumeFile(null);
    setResumeInfoText("");
    setExtractedResumeData(null);
    setGeneratedQuestions([]);
    setActiveQuestion(null);
    setShowIdealAnswer(false);
  };

  const handleModeChange = (newMode: AnalysisMode) => {
    setMode(newMode);
    setAnalysisResult(null);
    clearAllInput();
    if (newMode !== 'Interview Mode') resetInterviewState();
    if (newMode !== 'Rehearsal Mode') {
      setQuestion('');
      setPerfectAnswer('');
    }
  };
  
  const isRehearsalReady = mode === 'Rehearsal Mode' && !!question && !!perfectAnswer;

  const renderSpeechInput = () => (
    <Tabs value={inputTab} onValueChange={(v) => { clearAllInput(); setInputTab(v); }} className="w-full flex flex-col">
        <CardHeader className="p-0 pb-4 border-b">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="live" disabled={!isSpeechRecognitionSupported}> <Mic className="mr-2 h-4 w-4" /> Live </TabsTrigger>
              <TabsTrigger value="record"> <AudioLines className="mr-2 h-4 w-4" /> Record </TabsTrigger>
              <TabsTrigger value="upload"> <Upload className="mr-2 h-4 w-4" /> Upload </TabsTrigger>
            </TabsList>
            <div className="pt-2 text-center h-8 flex items-center justify-center">
                <p className="text-xs text-muted-foreground">{tabDescriptions[inputTab]}</p>
            </div>
        </CardHeader>
        <div className="flex-grow">
            <TabsContent value="live" className="mt-0">
                <CardContent className="p-4 flex flex-col">
                    <Textarea
                      placeholder={isSpeechRecognitionSupported ? "Your transcribed speech will appear here..." : "Live transcription is not supported in your browser."}
                      value={transcript}
                      onChange={(e) => setTranscript(e.target.value)}
                      className="h-32 resize-none bg-secondary/50 border-dashed"
                      readOnly={isListening}
                      disabled={!isSpeechRecognitionSupported}
                    />
                    <div className="flex items-center pt-4">
                        <Button onClick={handleToggleListening} className="w-full" disabled={!isSpeechRecognitionSupported}>
                            <Mic className="mr-2 h-5 w-5" />
                            {isListening ? "Stop live transcription" : "Start live transcription"}
                        </Button>
                    </div>
                </CardContent>
            </TabsContent>
            <TabsContent value="record" className="mt-0">
              <CardContent className="p-4 flex flex-col">
                  <div className="flex-grow flex items-center justify-center h-32 w-full rounded-md border border-dashed bg-background">
                      {audioURL ? (
                          <audio controls src={audioURL} className="w-full"></audio>
                      ) : (
                          <p className="text-sm text-muted-foreground">{isRecording ? "Recording..." : "Click to start recording"}</p>
                      )}
                  </div>
                  <div className="flex items-center pt-4 gap-4">
                      {isRecording ? (
                        <Button onClick={stopRecording} variant="default" className="w-full"><Pause className="mr-2 h-5 w-5" />Stop Recording</Button>
                      ) : (
                        <Button onClick={startRecording} variant="default" className="w-full" disabled={!!audioURL}><Play className="mr-2 h-5 w-5" />Start Recording</Button>
                      )}
                      {audioURL && <Button onClick={clearAudio} variant="outline" className="w-full"><X className="mr-2 h-4 w-4" /> Clear</Button>}
                  </div>
              </CardContent>
            </TabsContent>
            <TabsContent value="upload" className="mt-0">
                <CardContent className="p-4 flex flex-col">
                <div className="flex-grow flex items-center justify-center h-32 w-full">
                {audioURL ? (
                    <div className="w-full space-y-4 text-center">
                        <p className="text-sm font-medium">File ready for analysis.</p>
                        <audio controls src={audioURL} className="w-full"></audio>
                    </div>
                    ) : (
                    <label htmlFor="audio-upload" className="w-full h-full flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg cursor-pointer hover:bg-secondary/50">
                        <Upload className="h-10 w-10 text-muted-foreground/50 mb-2"/>
                        <p className="text-muted-foreground">Drop an audio file here or click.</p>
                        <input id="audio-upload" type="file" accept="audio/*" onChange={handleFileChange} className="hidden"/>
                    </label>
                    )}
                </div>
                    <div className="flex items-center pt-4">
                    {audioURL ? (
                        <Button onClick={clearAudio} variant="outline" className="w-full"><X className="mr-2 h-4 w-4" /> Clear Selection</Button>
                    ) : (
                        <Button asChild className="w-full"><label htmlFor="audio-upload"><Upload className="mr-2 h-5 w-5" />Browse Files</label></Button>
                    )}
                </div>
                </CardContent>
            </TabsContent>
        </div>
    </Tabs>
  );

  return (
    <div className="flex min-h-full w-full flex-col bg-background">
      <main className="flex flex-1 flex-col items-center justify-center p-4 md:p-6 lg:p-10">
        <Header />
        <div className="w-full max-w-7xl space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <StepCircle number={1} />
                  <h2 className="font-headline text-2xl font-semibold">Select Analysis Context</h2>
                </div>
                <div className="grid grid-cols-1 gap-4">
                    {modeOptions.map(option => (
                        <Card key={option.value} onClick={() => handleModeChange(option.value as AnalysisMode)}
                            className={cn("rounded-lg border-2 bg-card/50 p-4 transition-all cursor-pointer hover:shadow-lg", mode === option.value ? "border-primary shadow-md" : "border-muted hover:border-muted-foreground/50")}>
                            <div className="flex items-start gap-4">
                                <div className={cn("flex-shrink-0 h-12 w-12 rounded-lg flex items-center justify-center bg-primary/10 text-primary", mode === option.value && "bg-primary text-primary-foreground")}>
                                    <option.icon />
                                </div>
                                <div className="flex-grow">
                                    <h3 className="font-bold">{option.title}</h3>
                                    <p className="text-sm text-muted-foreground">{option.description}</p>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            </div>

            <div className="space-y-6">
              {mode === "Presentation Mode" && (
                <Card className="rounded-lg border shadow-lg bg-card/50 w-full">
                    <CardHeader><CardTitle className="font-headline text-2xl flex items-center gap-4"><StepCircle number={2} /><span>Provide Your Speech</span></CardTitle></CardHeader>
                    <CardContent>{renderSpeechInput()}</CardContent>
                </Card>
              )}

              {mode === "Rehearsal Mode" && (
                <div className="space-y-6">
                    <Card className="rounded-lg border shadow-lg bg-card/50 w-full">
                        <CardHeader><CardTitle className="font-headline text-2xl flex items-center gap-4"><StepCircle number={2} /><span>Set Up Your Rehearsal</span></CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2"><Label htmlFor="question" className="font-semibold">Interview Question</Label><Textarea id="question" value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Enter the interview question here..." className="bg-background"/></div>
                            <div className="space-y-2"><Label htmlFor="perfect-answer" className="font-semibold">Your Perfect Answer</Label><Textarea id="perfect-answer" value={perfectAnswer} onChange={(e) => setPerfectAnswer(e.target.value)} placeholder="Provide an ideal or 'perfect' answer for comparison." className="bg-background"/></div>
                        </CardContent>
                    </Card>

                    <Card className="rounded-lg border shadow-lg bg-card/50 w-full">
                        <CardHeader><CardTitle className="font-headline text-2xl flex items-center gap-4"><StepCircle number={3} /><span>Provide Your Speech</span></CardTitle></CardHeader>
                        <CardContent>
                            {isRehearsalReady ? renderSpeechInput() : <div className="text-center text-muted-foreground p-4 bg-secondary rounded-md">Please provide a question and a perfect answer above.</div>}
                        </CardContent>
                    </Card>
                </div>
              )}

              {mode === "Interview Mode" && (
                  <div className="space-y-6">
                      <Card className="rounded-lg border shadow-lg bg-card/50 w-full">
                          <CardHeader><CardTitle className="font-headline text-2xl flex items-center gap-4"><StepCircle number={2} /><span>Upload Resume</span></CardTitle></CardHeader>
                          <CardContent>
                              {resumeFile ? (
                                  <div className="flex items-center justify-between rounded-md border bg-background p-3">
                                      <div className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-green-500" /><span className="text-sm font-medium">{resumeFile.name}</span></div>
                                      <Button variant="ghost" size="icon" onClick={() => { setResumeFile(null); resetInterviewState(); }}><X className="h-4 w-4" /></Button>
                                  </div>
                              ) : (
                                  <Button asChild variant="outline" className="w-full">
                                      <label htmlFor="resume-upload"><FileText className="mr-2 h-4 w-4" />Select Resume File<input id="resume-upload" type="file" accept=".pdf,.txt,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={handleResumeFileChange} className="hidden" /></label>
                                  </Button>
                              )}
                              {(isLoading && loadingMessage.includes("Extracting")) && <div className="flex items-center justify-center space-x-2 mt-4"><Loader2 className="h-4 w-4 animate-spin" /><p className="text-sm text-muted-foreground">Extracting info...</p></div>}
                          </CardContent>
                      </Card>

                      {resumeInfoText && (
                          <Card className="rounded-lg border shadow-lg bg-card/50 w-full">
                              <CardHeader>
                                  <CardTitle className="font-headline text-2xl flex items-center gap-4"><StepCircle number={3} /><span>Generate &amp; Select Question</span></CardTitle>
                                  <CardDescription>The AI will evaluate how relevant your answer is to the selected question.</CardDescription>
                              </CardHeader>
                              <CardContent>
                                  <Button onClick={handleGenerateQuestions} className="w-full mb-4" disabled={isLoading && loadingMessage.includes("Generating")}>
                                      {isLoading && loadingMessage.includes("Generating") ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating...</> : "Generate Questions"}
                                  </Button>
                                  {generatedQuestions.length > 0 && (
                                    <RadioGroup onValueChange={(value) => setActiveQuestion(generatedQuestions.find(q => q.question === value) || null)} className="space-y-2 mt-4">
                                        {generatedQuestions.map((q, index) => (
                                            <div key={index} className="rounded-md border p-4 flex flex-col gap-4">
                                                <div className="flex items-start gap-3"><RadioGroupItem value={q.question} id={`q-${index}`} /><Label htmlFor={`q-${index}`} className="font-semibold text-base cursor-pointer flex-grow">{q.question}</Label></div>
                                                {activeQuestion?.question === q.question && (
                                                    <div className="pl-8 space-y-4">
                                                        <div className="flex items-center space-x-2"><Switch id={`show-answer-${index}`} checked={showIdealAnswer} onCheckedChange={setShowIdealAnswer} /><Label htmlFor={`show-answer-${index}`}>Show ideal answer</Label></div>
                                                        {showIdealAnswer && <div className="text-sm text-muted-foreground italic p-3 bg-secondary/50 rounded-md border">{q.answer}</div>}
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
                                  <CardTitle className="font-headline text-2xl flex items-center gap-4"><StepCircle number={4} /><span>Provide Your Answer</span></CardTitle>
                                  <CardDescription>Now, provide your answer to the selected question: "{activeQuestion.question}"</CardDescription>
                              </CardHeader>
                              <CardContent>{renderSpeechInput()}</CardContent>
                          </Card>
                      )}
                  </div>
              )}
            </div>
          </div>

          <div className="flex justify-center py-6">
            <Button onClick={handleAnalyze} size="lg" disabled={isLoading || !speechSample} className="w-full max-w-sm">
              {isLoading && loadingMessage.includes("Analyzing") ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{loadingMessage}</> : "Analyze My Speech"}
            </Button>
          </div>

          <div className="mt-8 w-full">
            {isLoading && loadingMessage.includes("Analyzing") ? (
              <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border p-12">
                <Loader2 className="h-12 w-12 animate-spin text-primary" /><p className="mt-4 text-muted-foreground">AI is analyzing your speech...</p>
              </div>
            ) : analysisResult ? (
              <AnalysisDashboard data={analysisResult} onDownloadPDF={() => generatePdfReport(analysisResult)} />
            ) : (
              !isLoading && <EmptyState />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

    