
"use client";

import type { AnalyzeSpeechOutput } from "@/ai/flows/analyze-speech";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Download, Star, FileText, FilterX, Zap, PauseCircle, TrendingUp, Rabbit, MicVocal, Hourglass } from "lucide-react";
import TranscriptionDisplay from "./transcription-display";

interface AnalysisDashboardProps {
  data: AnalyzeSpeechOutput;
  onDownloadPDF: () => void;
}

const MetricCard = ({
  title,
  value,
  unit,
  icon: Icon,
}: {
  title: string;
  value: string | number;
  unit?: string;
  icon: React.ElementType;
}) => (
  <Card className="bg-secondary/30">
    <CardHeader className="pb-2">
      <CardDescription className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        <span>{title}</span>
      </CardDescription>
      <CardTitle className="text-3xl font-bold font-headline pl-6">
        {value}
        {unit && <span className="text-xl font-medium text-muted-foreground ml-1">{unit}</span>}
      </CardTitle>
    </CardHeader>
  </Card>
);

const EvaluationCard = ({
  criterion,
  score,
  evaluation,
  feedback,
}: {
  criterion: string;
  score: number;
  evaluation: string;
  feedback: string;
}) => (
  <Card className="flex flex-col">
    <CardHeader className="pb-4">
      <div className="flex items-start justify-between">
        <CardTitle className="font-headline text-lg leading-tight">{criterion}</CardTitle>
        <div className="flex items-center gap-1 text-primary font-bold">
          <Star className="w-4 h-4 fill-primary" />
          <span>{score}/10</span>
        </div>
      </div>
    </CardHeader>
    <CardContent className="flex-grow space-y-3">
        <div>
            <h4 className="font-semibold text-sm mb-1">Evaluation</h4>
            <p className="text-sm text-muted-foreground">{evaluation}</p>
        </div>
         <div>
            <h4 className="font-semibold text-sm mb-1">Feedback</h4>
            <p className="text-sm text-muted-foreground">{feedback}</p>
        </div>
    </CardContent>
  </Card>
);

export default function AnalysisDashboard({
  data,
  onDownloadPDF,
}: AnalysisDashboardProps) {
  const { metadata, evaluationCriteria, totalScore, overallAssessment, highlightedTranscription } = data;

  return (
    <div className="w-full space-y-8">
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="font-headline text-2xl">
                Overall Assessment
              </CardTitle>
              <CardDescription>Total Score: {totalScore}/100</CardDescription>
            </div>
            <Button onClick={onDownloadPDF} variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Download Report
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Progress value={totalScore} className="mb-4 h-3" />
          <p className="text-muted-foreground">{overallAssessment}</p>
        </CardContent>
      </Card>

      {highlightedTranscription && highlightedTranscription.length > 0 && (
         <Card className="shadow-lg">
            <CardHeader>
                <CardTitle className="font-headline text-2xl">Full Transcription</CardTitle>
                <CardDescription>Filler words and long pauses are highlighted in red.</CardDescription>
            </CardHeader>
            <CardContent>
                <TranscriptionDisplay segments={highlightedTranscription} />
            </CardContent>
         </Card>
      )}

      <div className="space-y-4">
        <h2 className="font-headline text-2xl font-semibold">Key Metrics</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard title="Word Count" value={metadata.wordCount} icon={FileText} />
            <MetricCard title="Filler Words" value={metadata.fillerWordCount} icon={FilterX} />
            <MetricCard title="Speech Rate" value={metadata.speechRateWPM} unit="WPM" icon={Zap} />
            <MetricCard title="Avg. Pause" value={metadata.averagePauseDurationMs} unit="ms" icon={PauseCircle} />
            <MetricCard title="Pitch Variance" value={metadata.pitchVariance.toFixed(2)} icon={TrendingUp} />
            <MetricCard title="Pace Score" value={metadata.paceScore} unit="/ 100" icon={Rabbit} />
            <MetricCard title="Clarity Score" value={metadata.clarityScore} unit="/ 100" icon={MicVocal} />
            <MetricCard title="Pause Time" value={metadata.pausePercentage.toFixed(1)} unit="%" icon={Hourglass} />
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="font-headline text-2xl font-semibold">
            Detailed Feedback
        </h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {evaluationCriteria.map((item, index) => (
                <EvaluationCard 
                    key={index}
                    criterion={item.criteria}
                    score={item.score}
                    evaluation={item.evaluation}
                    feedback={item.feedback}
                />
            ))}
        </div>
      </div>
    </div>
  );
}
