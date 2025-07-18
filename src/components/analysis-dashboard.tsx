
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
import { Download, Star, FileText, FilterX, Zap, PauseCircle, TrendingUp, Rabbit, MicVocal, Hourglass, BrainCircuit, Speech, BookOpen, ChevronDown } from "lucide-react";
import TranscriptionDisplay from "./transcription-display";
import { cn } from "@/lib/utils";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";


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

const ScoreCircle = ({ score }: { score: number }) => {
    const circumference = 2 * Math.PI * 20; // 2 * pi * radius
    const offset = circumference - (score / 10) * circumference;
    let colorClass = 'text-green-500';
    if (score < 5) colorClass = 'text-red-500';
    else if (score < 8) colorClass = 'text-amber-500';

    return (
        <div className="relative h-16 w-16 flex-shrink-0">
            <svg className="h-full w-full" viewBox="0 0 44 44">
                <circle
                    className="text-muted/20"
                    strokeWidth="4"
                    stroke="currentColor"
                    fill="transparent"
                    r="20"
                    cx="22"
                    cy="22"
                />
                <circle
                    className={cn("transition-all duration-1000 ease-in-out", colorClass)}
                    strokeWidth="4"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="transparent"
                    r="20"
                    cx="22"
                    cy="22"
                    transform="rotate(-90 22 22)"
                />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
                <span className={cn("text-lg font-bold", colorClass)}>{score}</span>
                <span className={cn("text-xs font-semibold text-muted-foreground", colorClass)}>/10</span>
            </div>
        </div>
    );
};


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
  <Card className="flex flex-col bg-card/50 shadow-sm transition-transform hover:scale-[1.02] hover:shadow-lg w-full">
    <CardContent className="p-4 flex items-start gap-4">
        <ScoreCircle score={score} />
        <div className="flex-grow space-y-3">
             <h3 className="font-headline text-md font-semibold leading-tight">{criterion}</h3>
            <div>
                <h4 className="font-semibold text-sm text-foreground/90 mb-1">Evaluation</h4>
                <p className="text-sm text-foreground/80">{evaluation}</p>
            </div>
            <div>
                <h4 className="font-semibold text-sm text-foreground/90 mb-1">Feedback</h4>
                <p className="text-sm text-foreground/80">{feedback}</p>
            </div>
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
      
       <div className="space-y-4">
        <h2 className="font-headline text-2xl font-semibold">Detailed Feedback</h2>
        <Accordion type="multiple" defaultValue={Object.keys(groupedCriteria)} className="w-full space-y-4">
            {Object.entries(groupedCriteria).map(([category, items]) => {
                const CategoryIcon = categoryIcons[category] || Star;
                return (
                    <AccordionItem key={category} value={category} className="border rounded-lg bg-card/50 shadow-md">
                        <AccordionTrigger className="p-6 hover:no-underline">
                            <div className="flex items-center gap-3">
                                <CategoryIcon className="h-6 w-6 text-primary" />
                                <h3 className="font-headline text-xl font-semibold">{category}</h3>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="p-6 pt-0">
                             <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
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
                        </AccordionContent>
                    </AccordionItem>
                )
            })}
        </Accordion>
      </div>
    </div>
  );
}
