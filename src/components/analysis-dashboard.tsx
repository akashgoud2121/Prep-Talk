
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
import { Download, Star, FileText, FilterX, Zap, PauseCircle, TrendingUp, Rabbit, MicVocal, Hourglass, BrainCircuit, Speech, BookOpen, Smile, Award, Wind, Target, Scale, Brain, Crosshair } from "lucide-react";
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
  <Card className="bg-card/50 shadow-md transition-transform hover:scale-105 hover:shadow-lg">
    <div className="flex">
        <div className="flex items-center justify-center p-4 bg-primary/10 rounded-l-lg">
            <Icon className="h-8 w-8 text-primary" />
        </div>
        <div className="p-4 flex flex-col justify-center">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold text-foreground">
                {value}
                {unit && <span className="text-xs font-normal text-muted-foreground ml-1">{unit}</span>}
            </p>
        </div>
    </div>
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
  <Card className="flex flex-col bg-card/50 shadow-md transition-transform hover:scale-105 hover:shadow-lg">
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

const categoryIcons: Record<string, React.ElementType> = {
    "Delivery": Speech,
    "Language": BookOpen,
    "Content": BrainCircuit,
};

const metricIcons: Record<string, React.ElementType> = {
    "Word Count": FileText,
    "Filler Words": FilterX,
    "Speech Rate": Zap,
    "Avg. Pause": PauseCircle,
    "Pitch Variance": TrendingUp,
    "Pace Score": Rabbit,
    "Clarity Score": MicVocal,
    "Pause Time": Hourglass,
};

export default function AnalysisDashboard({
  data,
  onDownloadPDF,
}: AnalysisDashboardProps) {
  const { metadata, evaluationCriteria, totalScore, overallAssessment, highlightedTranscription } = data;

  const groupedCriteria = evaluationCriteria.reduce((acc, criterion) => {
    const category = criterion.category;
    if (!acc[category]) acc[category] = [];
    acc[category].push(criterion);
    return acc;
  }, {} as Record<string, typeof evaluationCriteria>);

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
                <CardDescription>Filler words and long pauses are highlighted.</CardDescription>
            </CardHeader>
            <CardContent>
                <TranscriptionDisplay segments={highlightedTranscription} />
            </CardContent>
         </Card>
      )}

      <div className="space-y-4">
        <h2 className="font-headline text-2xl font-semibold">Key Metrics</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard title="Word Count" value={metadata.wordCount} icon={metricIcons["Word Count"]} />
            <MetricCard title="Filler Words" value={metadata.fillerWordCount} icon={metricIcons["Filler Words"]} />
            <MetricCard title="Speech Rate" value={metadata.speechRateWPM} unit="WPM" icon={metricIcons["Speech Rate"]} />
            <MetricCard title="Avg. Pause" value={metadata.averagePauseDurationMs} unit="ms" icon={metricIcons["Avg. Pause"]} />
            <MetricCard title="Pitch Variance" value={metadata.pitchVariance.toFixed(2)} icon={metricIcons["Pitch Variance"]} />
            <MetricCard title="Pace Score" value={metadata.paceScore} unit="/ 100" icon={metricIcons["Pace Score"]} />
            <MetricCard title="Clarity Score" value={metadata.clarityScore} unit="/ 100" icon={metricIcons["Clarity Score"]} />
            <MetricCard title="Pause Time" value={metadata.pausePercentage.toFixed(1)} unit="%" icon={metricIcons["Pause Time"]} />
        </div>
      </div>
      
       <div className="space-y-8">
        <h2 className="font-headline text-2xl font-semibold">Detailed Feedback</h2>
        {Object.entries(groupedCriteria).map(([category, items]) => {
          const CategoryIcon = categoryIcons[category] || Star;
          return (
            <div key={category} className="space-y-4 rounded-lg border border-border p-6 shadow-md bg-card/20">
              <div className="flex items-center gap-3">
                 <CategoryIcon className="h-6 w-6 text-primary" />
                 <h3 className="font-headline text-xl font-semibold">{category}</h3>
              </div>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                {items.map((item, index) => (
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
          );
        })}
      </div>
    </div>
  );
}
