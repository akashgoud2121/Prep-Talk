
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
import { Download, Star, FileText, FilterX, Zap, PauseCircle, TrendingUp, Rabbit, MicVocal, Hourglass, BrainCircuit, Speech, BookOpen } from "lucide-react";
import TranscriptionDisplay from "./transcription-display";
import { cn } from "@/lib/utils";


interface AnalysisDashboardProps {
  data: AnalyzeSpeechOutput;
  onDownloadPDF: () => void;
}

const MetricCard = ({
  title,
  value,
  unit,
  icon: Icon,
  color,
}: {
  title: string;
  value: string | number;
  unit?: string;
  icon: React.ElementType;
  color: string;
}) => (
    <Card className="relative overflow-hidden bg-card/50 shadow-sm transition-transform hover:scale-105 hover:shadow-lg">
      <CardContent className="p-4 flex items-center gap-4">
        <div className={cn("flex-shrink-0 h-12 w-12 rounded-lg flex items-center justify-center", color)}>
           <Icon className="h-6 w-6 text-white" />
        </div>
        <div className="flex-grow">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold">
            {value}
            {unit && <span className="text-xs font-normal text-muted-foreground ml-1">{unit}</span>}
          </p>
        </div>
      </CardContent>
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
  <Card className="flex flex-col bg-card/50 shadow-sm transition-transform hover:scale-105 hover:shadow-lg w-full">
    <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
            <CardTitle className="font-headline text-md leading-tight">{criterion}</CardTitle>
            <div className="flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-full bg-primary/10 border-2 border-primary text-primary font-bold text-sm">
                {score}/10
            </div>
        </div>
    </CardHeader>
    <CardContent className="flex-grow space-y-3">
        <div>
            <h4 className="font-semibold text-xs uppercase text-muted-foreground tracking-wider mb-1">Evaluation</h4>
            <p className="text-sm text-foreground/80">{evaluation}</p>
        </div>
         <div>
            <h4 className="font-semibold text-xs uppercase text-muted-foreground tracking-wider mb-1">Feedback</h4>
            <p className="text-sm text-foreground/80">{feedback}</p>
        </div>
    </CardContent>
  </Card>
);

const categoryIcons: Record<string, React.ElementType> = {
    "Delivery": Speech,
    "Language": BookOpen,
    "Content": BrainCircuit,
};

const metricIcons: Record<string, { icon: React.ElementType, color: string }> = {
    "Word Count": { icon: FileText, color: "bg-blue-500" },
    "Filler Words": { icon: FilterX, color: "bg-red-500" },
    "Speech Rate": { icon: Zap, color: "bg-yellow-500" },
    "Avg. Pause": { icon: PauseCircle, color: "bg-indigo-500" },
    "Pitch Variance": { icon: TrendingUp, color: "bg-green-500" },
    "Pace Score": { icon: Rabbit, color: "bg-orange-500" },
    "Clarity Score": { icon: MicVocal, color: "bg-sky-500" },
    "Pause Time": { icon: Hourglass, color: "bg-purple-500" },
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
            <MetricCard title="Word Count" value={metadata.wordCount} icon={metricIcons["Word Count"].icon} color={metricIcons["Word Count"].color} />
            <MetricCard title="Filler Words" value={metadata.fillerWordCount} icon={metricIcons["Filler Words"].icon} color={metricIcons["Filler Words"].color} />
            <MetricCard title="Speech Rate" value={metadata.speechRateWPM} unit="WPM" icon={metricIcons["Speech Rate"].icon} color={metricIcons["Speech Rate"].color} />
            <MetricCard title="Avg. Pause" value={metadata.averagePauseDurationMs} unit="ms" icon={metricIcons["Avg. Pause"].icon} color={metricIcons["Avg. Pause"].color} />
            <MetricCard title="Pitch Variance" value={metadata.pitchVariance.toFixed(2)} icon={metricIcons["Pitch Variance"].icon} color={metricIcons["Pitch Variance"].color} />
            <MetricCard title="Pace Score" value={metadata.paceScore} unit="/ 100" icon={metricIcons["Pace Score"].icon} color={metricIcons["Pace Score"].color} />
            <MetricCard title="Clarity Score" value={metadata.clarityScore} unit="/ 100" icon={metricIcons["Clarity Score"].icon} color={metricIcons["Clarity Score"].color} />
            <MetricCard title="Pause Time" value={metadata.pausePercentage.toFixed(1)} unit="%" icon={metricIcons["Pause Time"].icon} color={metricIcons["Pause Time"].color} />
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
