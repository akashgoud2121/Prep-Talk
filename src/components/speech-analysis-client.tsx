"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Loader2, Mic, Upload, X, Presentation, ClipboardCheck, MessageSquareQuote, WandSparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  analyzeSpeech,
  AnalyzeSpeechOutput,
  AnalyzeSpeechInput,
} from "@/ai/flows/analyze-speech";
import AnalysisDashboard from "@/components/analysis-dashboard";
import EmptyState from "@/components/empty-state";
import { generatePdfReport } from "@/lib/pdf";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type AnalysisMode = "Presentation Mode" | "Interview Mode" | "Practice Mode";

interface CustomSpeechRecognition extends SpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
}

const ContextCard = ({
  icon,
  title,
  description,
  isSelected,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  isSelected: boolean;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className={cn(
      "flex w-full items-start gap-4 rounded-lg border p-4 text-left transition-colors",
      isSelected
        ? "border-primary bg-primary/10 text-primary"
        : "border-border bg-card hover:bg-accent"
    )}
  >
    <div className={cn("mt-1", isSelected ? 'text-primary' : 'text-muted-foreground')}>{icon}</div>
    <div>
      <h3 className="font-semibold text-foreground">{title}</h3>
      <p className={cn("text-sm", isSelected ? 'text-primary/80' : 'text-muted-foreground')}>{description}</p>
    </div>
  </button>
);


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
  const [analysisResult, setAnalysisResult] =
    useState<AnalyzeSpeechOutput | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [isSpeechRecognitionSupported, setIsSpeechRecognitionSupported] = useState(false);

  const { toast } = useToast();

  const recognitionRef = useRef<CustomSpeechRecognition | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsMounted(true);
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setIsSpeechRecognitionSupported(true);
      recognitionRef.current = new SpeechRecognition() as CustomSpeechRecognition;
      const recognition = recognitionRef.current;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      let final_transcript = "";
      recognition.onresult = (event) => {
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

      return () => {
          if (recognitionRef.current) {
               recognitionRef.current.stop();
          }
      };
    } else {
        console.warn("SpeechRecognition API is not supported in this browser.");
    }
  }, []);

  const handleToggleListening = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      setTranscript("");
      recognitionRef.current?.start();
    }
    setIsListening(!isListening);
  };

  const handleToggleRecording = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
        audioChunksRef.current = [];
        setAudioURL(null);
        setAudioBlob(null);
        mediaRecorderRef.current.ondataavailable = (event) => {
          audioChunksRef.current.push(event.data);
        };
        mediaRecorderRef.current.onstop = () => {
          const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
          setAudioBlob(blob);
          const url = URL.createObjectURL(blob);
          setAudioURL(url);
          stream.getTracks().forEach((track) => track.stop());
        };
        mediaRecorderRef.current.start();
        setIsRecording(true);
      } catch (error) {
        console.error(error);
        toast({
          variant: "destructive",
          title: "Microphone Error",
          description:
            "Could not access microphone. Please check permissions and that your browser supports audio/webm recording.",
        });
      }
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

  const clearAudio = () => {
    setAudioBlob(null);
    if(audioURL) {
      URL.revokeObjectURL(audioURL);
    }
    setAudioURL(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };
  
  const fileToDataUri = (file: Blob) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => resolve(event.target?.result as string);
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });

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

    if (mode === "Interview Mode" && !question) {
      toast({ variant: "destructive", title: "Please enter an interview question." });
      return;
    }
    if (mode === "Practice Mode" && (!question || !perfectAnswer)) {
      toast({ variant: "destructive", title: "Please enter both question and perfect answer." });
      return;
    }

    setIsLoading(true);
    setAnalysisResult(null);

    try {
      const input: AnalyzeSpeechInput = { speechSample, mode };
      if (question) input.question = question;
      if (perfectAnswer && mode === "Practice Mode") input.perfectAnswer = perfectAnswer;
      
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
  
  const contextDescriptions = {
    'Presentation Mode': 'Evaluated for clarity, structure, and engagement.',
    'Interview Mode': 'Evaluated based on how well you answer the question.',
    'Practice Mode': 'Compared against a "perfect answer" for accuracy.'
  };

  return (
    <div className="w-full max-w-5xl space-y-8">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:items-start">
        <Card className="lg:sticky lg:top-24">
            <CardHeader>
                <CardTitle className="font-headline text-xl">1. Provide Your Speech</CardTitle>
            </CardHeader>
            <CardContent>
                <Tabs value={currentTab} onValueChange={(v) => { clearAudio(); setCurrentTab(v); }} className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="live">Live Transcription</TabsTrigger>
                    <TabsTrigger value="record">Record Audio</TabsTrigger>
                    <TabsTrigger value="upload">Upload File</TabsTrigger>
                  </TabsList>
                  <TabsContent value="live" className="mt-4">
                     <Textarea
                        placeholder="Your transcribed speech will appear here..."
                        value={transcript}
                        onChange={(e) => setTranscript(e.target.value)}
                        className="h-36 bg-background"
                        readOnly={isListening}
                      />
                      <Button onClick={handleToggleListening} className="w-full mt-4" disabled={!isMounted || !isSpeechRecognitionSupported}>
                        <Mic className="mr-2" />
                        {isListening ? "Stop Transcription" : "Start Transcription"}
                      </Button>
                  </TabsContent>
                  <TabsContent value="record" className="mt-4">
                     {audioURL ? (
                       <div className="space-y-4">
                          <audio controls src={audioURL} className="w-full"></audio>
                          <Button onClick={clearAudio} variant="outline" className="w-full"><X className="mr-2" /> Clear Recording</Button>
                        </div>
                     ) : (
                      <div className="flex flex-col items-center justify-center space-y-4 rounded-md border border-dashed bg-background p-8 h-36">
                        <p className="text-sm text-muted-foreground">{isRecording ? "Recording in progress..." : "Click button to start recording"}</p>
                        <Button onClick={handleToggleRecording} variant={isRecording ? "destructive" : "default"} size="lg">
                          <Mic className="mr-2" />
                          {isRecording ? "Stop Recording" : "Start Recording"}
                        </Button>
                      </div>
                     )}
                  </TabsContent>
                  <TabsContent value="upload" className="mt-4">
                      {audioURL ? (
                         <div className="space-y-4">
                            <audio controls src={audioURL} className="w-full"></audio>
                            <Button onClick={clearAudio} variant="outline" className="w-full"><X className="mr-2" /> Clear Selection</Button>
                          </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center space-y-2 rounded-md border border-dashed bg-background p-8 h-36">
                          <Upload className="h-8 w-8 text-muted-foreground"/>
                          <p className="text-sm text-muted-foreground">Select an audio file</p>
                          <Button asChild size="sm">
                            <label htmlFor="audio-upload">
                              Browse Files
                              <input id="audio-upload" type="file" accept="audio/*" onChange={handleFileChange} className="hidden" ref={fileInputRef}/>
                            </label>
                          </Button>
                        </div>
                      )}
                  </TabsContent>
                </Tabs>
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle className="font-headline text-xl">2. Set Analysis Context</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <ContextCard icon={<Presentation size={20}/>} title="Presentation" description={contextDescriptions['Presentation Mode']} isSelected={mode === 'Presentation Mode'} onClick={() => setMode('Presentation Mode')} />
                    <ContextCard icon={<MessageSquareQuote size={20}/>} title="Interview" description={contextDescriptions['Interview Mode']} isSelected={mode === 'Interview Mode'} onClick={() => setMode('Interview Mode')} />
                    <ContextCard icon={<ClipboardCheck size={20}/>} title="Practice" description={contextDescriptions['Practice Mode']} isSelected={mode === 'Practice Mode'} onClick={() => setMode('Practice Mode')} />
                </div>
                {(mode === "Interview Mode" || mode === "Practice Mode") && (
                    <Textarea
                      id="question"
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      placeholder="Enter the interview question here... e.g., Tell me about yourself."
                      className="bg-background"
                    />
                )}
                {mode === "Practice Mode" && (
                    <Textarea
                      id="perfect-answer"
                      value={perfectAnswer}
                      onChange={(e) => setPerfectAnswer(e.target.value)}
                      placeholder="Provide an ideal or 'perfect' answer for comparison."
                      className="bg-background"
                    />
                )}
            </CardContent>
        </Card>

      </div>

      <div className="flex justify-center py-4">
        <Button onClick={handleAnalyze} size="lg" disabled={isLoading} className="w-full max-w-sm">
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analyzing...
            </>
          ) : (
             <>
              <WandSparkles className="mr-2" />
               Analyze My Speech
             </>
          )}
        </Button>
      </div>

      <div className="mt-8 w-full">
        {isLoading ? (
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
          <EmptyState />
        )}
      </div>
    </div>
  );
}
