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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Textarea } from "@/components/ui/textarea";
import { Download } from "lucide-react";

interface AnalysisDashboardProps {
  data: AnalyzeSpeechOutput;
  onDownloadPDF: () => void;
}

const MetricCard = ({
  title,
  value,
}: {
  title: string;
  value: string | number;
}) => (
  <Card>
    <CardHeader className="pb-2">
      <CardDescription>{title}</CardDescription>
      <CardTitle className="text-3xl font-bold font-headline">{value}</CardTitle>
    </CardHeader>
  </Card>
);

export default function AnalysisDashboard({
  data,
  onDownloadPDF,
}: AnalysisDashboardProps) {
  const { metadata, evaluationCriteria, totalScore, overallAssessment } = data;

  const groupedCriteria = evaluationCriteria.reduce((acc, criterion) => {
    const category = criterion.category;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(criterion);
    return acc;
  }, {} as Record<string, typeof evaluationCriteria>);

  return (
    <div className="w-full space-y-6">
      <Card>
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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard title="Word Count" value={metadata.wordCount} />
        <MetricCard title="Filler Words" value={metadata.fillerWordCount} />
        <MetricCard title="Speech Rate (WPM)" value={metadata.speechRateWPM} />
        <MetricCard
          title="Pitch Variance"
          value={`${metadata.pitchVariance.toFixed(2)}`}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-2xl">
            Detailed Feedback
          </CardTitle>
          <CardDescription>
            Breakdown of your performance across different categories.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion
            type="single"
            collapsible
            className="w-full"
            defaultValue={Object.keys(groupedCriteria)[0]}
          >
            {Object.entries(groupedCriteria).map(([category, criteria]) => (
              <AccordionItem value={category} key={category}>
                <AccordionTrigger className="text-lg font-semibold font-headline">
                  {category}
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-6">
                    {criteria.map((item, index) => (
                      <div key={index}>
                        <div className="mb-1 flex items-center justify-between">
                          <h4 className="font-medium">{item.criteria}</h4>
                          <span className="text-sm font-bold text-primary">
                            {item.score}/10
                          </span>
                        </div>
                        <Progress value={item.score * 10} className="h-2" />
                        <p className="mt-2 text-sm text-muted-foreground">
                          <strong className="text-foreground">
                            Evaluation:
                          </strong>{" "}
                          {item.evaluation}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          <strong className="text-foreground">
                            Feedback:
                          </strong>{" "}
                          {item.feedback}
                        </p>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>
      
      {metadata.fullTranscription && (
         <Card>
            <CardHeader>
                <CardTitle className="font-headline text-2xl">Full Transcription</CardTitle>
            </CardHeader>
            <CardContent>
                <Textarea readOnly value={metadata.fullTranscription} className="h-48 bg-muted/50" />
            </CardContent>
         </Card>
      )}
    </div>
  );
}
