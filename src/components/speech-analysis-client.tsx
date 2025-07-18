"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Loader2, Mic, Upload, FileAudio, Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

type AnalysisMode = "Presentation Mode" | "Interview Mode" | "Practice Mode";

interface CustomSpeechRecognition extends SpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
}

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

    recognition.onresult = (event) => {
      let final_transcript = "";
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          final_transcript += event.results[i][0].transcript;
        }
      }
      setTranscript((prev) => prev + final_transcript);
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
        mediaRecorderRef.current.ondataavailable = (event) => {
          audioChunksRef.current.push(event.data);
        };
        mediaRecorderRef.current.onstop = () => {
          const blob = new Blob(audioChunksRef.current, { type: "audio/wav" });
          setAudioBlob(blob);
          const url = URL.createObjectURL(blob);
          setAudioURL(url);
          stream.getTracks().forEach((track) => track.stop());
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
    setIsRecording(!isRecording);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setAudioBlob(file);
      setAudioURL(URL.createObjectURL(file));
    }
  };

  const clearAudio = () => {
    setAudioBlob(null);
    setAudioURL(null);
    if(fileInputRef.current) fileInputRef.current.value = "";
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
    } else if (currentTab === "record" || currentTab === "upload") {
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

  return (
    <div className="w-full max-w-5xl space-y-8">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="font-headline">
              1. Provide Your Speech
            </CardTitle>
            <CardDescription>
              Choose your preferred method to input your speech.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs
              value={currentTab}
              onValueChange={setCurrentTab}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="live">Live</TabsTrigger>
                <TabsTrigger value="record">Record</TabsTrigger>
                <TabsTrigger value="upload">Upload</TabsTrigger>
              </TabsList>
              <TabsContent value="live" className="mt-4">
                <Textarea
                  placeholder="Your transcribed speech will appear here..."
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  className="h-36"
                  readOnly={isListening}
                />
                <Button
                  onClick={handleToggleListening}
                  className="mt-4 w-full"
                  disabled={!SpeechRecognition}
                >
                  <Mic className="mr-2 h-4 w-4" />
                  {isListening ? "Stop Listening" : "Start Listening"}
                </Button>
                {!SpeechRecognition && <p className="text-xs text-destructive mt-2">Speech recognition is not supported by your browser.</p>}
              </TabsContent>
              <TabsContent value="record" className="mt-4">
                 {audioURL ? (
                  <div className="space-y-4">
                    <audio controls src={audioURL} className="w-full"></audio>
                    <div className="flex gap-2">
                      <Button onClick={() => window.open(audioURL)} variant="outline" className="w-full"><Download className="mr-2 h-4 w-4" /> Download</Button>
                      <Button onClick={clearAudio} variant="destructive" className="w-full"><X className="mr-2 h-4 w-4" /> Clear</Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center space-y-4 rounded-md border-dashed border-2 h-36">
                    <Button onClick={handleToggleRecording} size="lg">
                      <Mic className="mr-2 h-5 w-5" />
                      {isRecording ? "Stop Recording" : "Start Recording"}
                    </Button>
                    {isRecording && <p className="text-sm text-muted-foreground animate-pulse">Recording...</p>}
                  </div>
                )}
              </TabsContent>
              <TabsContent value="upload" className="mt-4">
                 {audioURL && audioBlob ? (
                  <div className="space-y-4">
                    <audio controls src={audioURL} className="w-full"></audio>
                    <p className="text-sm text-muted-foreground truncate">File: {audioBlob.name}</p>
                    <Button onClick={clearAudio} variant="destructive" className="w-full"><X className="mr-2 h-4 w-4" /> Clear Audio</Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center space-y-2 rounded-md border-dashed border-2 h-36">
                    <FileAudio className="h-10 w-10 text-muted-foreground" />
                    <Label htmlFor="audio-upload" className="cursor-pointer text-primary hover:underline">
                      Choose an audio file
                    </Label>
                    <Input id="audio-upload" type="file" accept="audio/*" onChange={handleFileChange} className="hidden" ref={fileInputRef}/>
                    <p className="text-xs text-muted-foreground">MP3, WAV, etc.</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-headline">
              2. Set Analysis Context
            </CardTitle>
            <CardDescription>
              Provide context for a more accurate analysis.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <RadioGroup
              value={mode}
              onValueChange={(value) => setMode(value as AnalysisMode)}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="Presentation Mode" id="r1" />
                <Label htmlFor="r1">Presentation Mode</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="Interview Mode" id="r2" />
                <Label htmlFor="r2">Interview Mode</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="Practice Mode" id="r3" />
                <Label htmlFor="r3">Practice Mode</Label>
              </div>
            </RadioGroup>

            {(mode === "Interview Mode" || mode === "Practice Mode") && (
              <div className="space-y-2">
                <Label htmlFor="question">Interview Question</Label>
                <Input
                  id="question"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="e.g., Tell me about yourself."
                />
              </div>
            )}
            {mode === "Practice Mode" && (
              <div className="space-y-2">
                <Label htmlFor="perfect-answer">Perfect Answer</Label>
                <Textarea
                  id="perfect-answer"
                  value={perfectAnswer}
                  onChange={(e) => setPerfectAnswer(e.target.value)}
                  placeholder="Provide an ideal answer for comparison."
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-center">
        <Button onClick={handleAnalyze} size="lg" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isLoading ? "Analyzing..." : "Analyze My Speech"}
        </Button>
      </div>

      <div className="mt-8 w-full">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12">
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
