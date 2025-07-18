"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Loader2, Mic, Upload, FileAudio, Download, X, Presentation, ClipboardCheck, MessageSquareQuote, WandSparkles } from "lucide-react";
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

type AnalysisMode = "Presentation Mode" | "Interview Mode" | "Practice Mode";

interface CustomSpeechRecognition extends SpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
}

const SectionTitle = ({ num, title }: { num: number; title: string }) => (
  <div className="flex items-center gap-3 mb-4">
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
      {num}
    </div>
    <h2 className="text-xl font-headline font-semibold">{title}</h2>
  </div>
);

const ContextCard = ({
  icon,
  title,
  isSelected,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  isSelected: boolean;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className={cn(
      "flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 p-4 text-center transition-colors",
      isSelected
        ? "border-primary bg-primary/10 text-primary"
        : "border-border bg-card hover:bg-accent"
    )}
  >
    {icon}
    <span className="font-medium">{title}</span>
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
  const { toast } = useToast();

  const recognitionRef = useRef<CustomSpeechRecognition | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const SpeechRecognition =
    typeof window !== "undefined"
      ? window.SpeechRecognition || window.webkitSpeechRecognition
      : null;

  useEffect(() => {
    if (!SpeechRecognition) return;
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
      recognition.stop();
    };
  }, [SpeechRecognition]);

  const handleToggleListening = () => {
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
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        mediaRecorderRef.current = new MediaRecorder(stream);
        audioChunksRef.current = [];
        setAudioURL(null);
        setAudioBlob(null);
        mediaRecorderRef.current.ondataavailable = (event) => {
          audioChunksRef.current.push(event.data);
        };
        mediaRecorderRef.current.onstop = () => {
          const blob = new Blob(audioChunksRef.current, { type: "audio/wav" });
          setAudioBlob(blob);
          const url = URL.createObjectURL(blob);
          setAudioURL(url);
          stream.getTracks().forEach((track) => track.stop());
          setIsRecording(false);
        };
        mediaRecorderRef.current.start();
        setIsRecording(true);
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Microphone Error",
          description:
            "Could not access microphone. Please check your browser permissions.",
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
  
  const contextDescriptions: Record<AnalysisMode, string> = {
    'Presentation Mode': 'In Presentation Mode, your speech will be evaluated for general clarity, structure, and engagement.',
    'Interview Mode': 'In Interview Mode, your speech will be evaluated based on how well you answer the provided interview question.',
    'Practice Mode': 'In Practice Mode, your speech will be compared against the provided "perfect answer" for accuracy and completeness.'
  }

  const renderInputArea = () => {
    if (audioURL) {
      return (
         <div className="space-y-4">
            <audio controls src={audioURL} className="w-full"></audio>
            <div className="flex gap-2">
                <Button onClick={() => window.open(audioURL)} variant="outline" className="w-full"><Download /> Download</Button>
                <Button onClick={clearAudio} variant="destructive" className="w-full"><X /> Clear</Button>
            </div>
          </div>
      )
    }

    return (
       <Textarea
          placeholder="Your transcribed speech will appear here..."
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          className="h-36 bg-input"
          readOnly={isListening}
        />
    )
  }

  return (
    <div className="w-full max-w-5xl space-y-8">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="space-y-4">
            <SectionTitle num={1} title="Provide Your Speech" />
            <div className="rounded-lg border bg-card p-4 space-y-4">
                <div className="grid grid-cols-3 gap-2 rounded-md bg-input p-1">
                    <Button variant={currentTab === 'live' ? 'secondary' : 'ghost'} onClick={() => { setCurrentTab('live'); clearAudio(); }}><Mic className="mr-2"/>Live</Button>
                    <Button variant={currentTab === 'record' ? 'secondary' : 'ghost'} onClick={() => setCurrentTab('record')}><WandSparkles className="mr-2" />Record</Button>
                    <Button variant={currentTab === 'upload' ? 'secondary' : 'ghost'} asChild><label htmlFor="audio-upload" className="cursor-pointer inline-flex items-center justify-center"><Upload className="mr-2"/>Upload</label></Button>
                    <input id="audio-upload" type="file" accept="audio/*" onChange={handleFileChange} className="hidden" ref={fileInputRef}/>
                </div>
                 {renderInputArea()}

                <Button
                  onClick={currentTab === 'live' ? handleToggleListening : handleToggleRecording}
                  className="w-full"
                  disabled={!SpeechRecognition && currentTab === 'live'}
                >
                  <Mic className="mr-2" />
                  {currentTab === 'live' 
                    ? (isListening ? "Stop Live Transcription" : "Start Live Transcription")
                    : (isRecording ? "Stop Recording" : "Start Recording")
                  }
                </Button>
            </div>
        </div>

        <div className="space-y-4">
            <SectionTitle num={2} title="Set Analysis Context" />
            <div className="rounded-lg border bg-card p-4 space-y-4">
                <div className="grid grid-cols-3 gap-2">
                    <ContextCard icon={<Presentation size={24}/>} title="Presentation" isSelected={mode === 'Presentation Mode'} onClick={() => setMode('Presentation Mode')} />
                    <ContextCard icon={<MessageSquareQuote size={24}/>} title="Interview" isSelected={mode === 'Interview Mode'} onClick={() => setMode('Interview Mode')} />
                    <ContextCard icon={<ClipboardCheck size={24}/>} title="Practice" isSelected={mode === 'Practice Mode'} onClick={() => setMode('Practice Mode')} />
                </div>
                 <div className="rounded-lg bg-input p-4 text-sm text-muted-foreground">
                    {contextDescriptions[mode]}
                 </div>
                {(mode === "Interview Mode" || mode === "Practice Mode") && (
                  <div className="space-y-2">
                    <Textarea
                      id="question"
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      placeholder="e.g., Tell me about yourself."
                      className="bg-background"
                    />
                  </div>
                )}
                {mode === "Practice Mode" && (
                  <div className="space-y-2">
                    <Textarea
                      id="perfect-answer"
                      value={perfectAnswer}
                      onChange={(e) => setPerfectAnswer(e.target.value)}
                      placeholder="Provide an ideal answer for comparison."
                      className="bg-background"
                    />
                  </div>
                )}
            </div>
        </div>

      </div>

      <div className="flex justify-center">
        <Button onClick={handleAnalyze} size="lg" disabled={isLoading}>
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
