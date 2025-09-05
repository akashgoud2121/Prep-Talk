
"use client";

import { useState, useRef, useEffect } from "react";
import { Loader2, Mic, Upload, X, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Define types for the SpeechRecognition API to fix TypeScript errors
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
  readonly confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: SpeechRecognitionErrorCode;
  message: string;
}

type SpeechRecognitionErrorCode =
  | 'no-speech'
  | 'aborted'
  | 'audio-capture'
  | 'network'
  | 'not-allowed'
  | 'service-not-allowed'
  | 'bad-grammar'
  | 'language-not-supported';


interface CustomSpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  
  start(): void;
  stop(): void;
  abort(): void;
  
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

interface SpeechInputProps {
  onSpeechSampleReady: (sample: string | null) => void;
}

export default function SpeechInput({ onSpeechSampleReady }: SpeechInputProps) {
  const [transcript, setTranscript] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [currentTab, setCurrentTab] = useState("live");
  const [isSpeechRecognitionSupported, setIsSpeechRecognitionSupported] = useState(false);
  
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
  
  useEffect(() => {
    if (currentTab === 'live') {
      onSpeechSampleReady(transcript);
    }
  }, [transcript, currentTab, onSpeechSampleReady]);

  const fileToDataUri = (file: Blob) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => resolve(event.target?.result as string);
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });

  const handleAudioBlobReady = async (blob: Blob | null) => {
    setAudioBlob(blob);
    if (blob) {
      const dataUri = await fileToDataUri(blob);
      onSpeechSampleReady(dataUri);
      setAudioURL(URL.createObjectURL(blob));
    } else {
      onSpeechSampleReady(null);
      if(audioURL) URL.revokeObjectURL(audioURL);
      setAudioURL(null);
    }
  }

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
        const newAudioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        handleAudioBlobReady(newAudioBlob);
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
      handleAudioBlobReady(file);
    }
  };

  const clearAudio = () => {
    handleAudioBlobReady(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (isRecording) {
      stopRecording();
    }
    audioChunksRef.current = [];
  };

  const clearAll = () => {
      clearAudio();
      setTranscript("");
      onSpeechSampleReady(null);
  };
  
  return (
    <Tabs value={currentTab} onValueChange={(v) => { clearAll(); setCurrentTab(v); }} className="w-full flex flex-col">
        <CardHeader className="p-0 pb-4 border-b">
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
            <TabsContent value="live" className="mt-0">
                <CardContent className="p-4 flex flex-col">
                    <Textarea
                    placeholder="Your transcribed speech will appear here..."
                    value={transcript}
                    onChange={(e) => setTranscript(e.target.value)}
                    className="h-32 resize-none bg-secondary/50 border-dashed flex-grow"
                    readOnly={isListening}
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
                    <div className="flex-grow flex items-center justify-center">
                        {audioURL ? (
                            <div className="w-full space-y-4">
                                <audio controls src={audioURL} className="w-full"></audio>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center space-y-4 rounded-md border border-dashed bg-background h-32 w-full">
                                <p className="text-sm text-muted-foreground">{isRecording ? "Recording in progress..." : "Click button to start recording"}</p>
                            </div>
                        )}
                    </div>
                    <div className="flex items-center pt-4 gap-4">
                            {audioURL ? (
                            <>
                                <Button onClick={handleDownloadRecording} variant="secondary" className="w-full"><Download className="mr-2" /> Download</Button>
                                <Button onClick={clearAudio} variant="outline" className="w-full"><X className="mr-2" /> Clear</Button>
                            </>
                            ) : (
                            <Button onClick={handleToggleRecording} variant={isRecording ? "destructive" : "default"} className="w-full">
                                <Mic className="mr-2 h-5 w-5" />
                                {isRecording ? "Stop Recording" : "Start Recording"}
                            </Button>
                            )}
                    </div>
                </CardContent>
                </TabsContent>
                <TabsContent value="upload" className="mt-0">
                    <CardContent className="p-4 flex flex-col">
                    <div className="flex-grow flex items-center justify-center">
                    {audioURL ? (
                        <div className="w-full space-y-4">
                            <audio controls src={audioURL} className="w-full"></audio>
                            </div>
                        ) : (
                        <label htmlFor="audio-upload" className="w-full h-32 flex flex-col items-center justify-center p-6 border-2 border-dashed border-muted-foreground/30 rounded-lg cursor-pointer hover:bg-secondary/50 transition-colors">
                            <Upload className="h-10 w-10 text-muted-foreground/50 mb-2"/>
                            <p className="text-muted-foreground">Drop an audio file here or click.</p>
                            <input id="audio-upload" type="file" accept="audio/*" onChange={handleFileChange} className="hidden" ref={fileInputRef}/>
                        </label>
                        )}
                    </div>
                        <div className="flex items-center pt-4">
                        {audioURL ? (
                            <Button onClick={clearAudio} variant="outline" className="w-full"><X className="mr-2" /> Clear Selection</Button>
                        ) : (
                            <Button asChild className="w-full">
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
  )
}

    