
import jsPDF from "jspdf";
import type { AnalyzeSpeechOutput } from "@/ai/schemas";

const getBase64Image = (url: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(img, 0, 0);
                const dataURL = canvas.toDataURL('image/png');
                resolve(dataURL);
            } else {
                reject(new Error('Could not get canvas context'));
            }
        };
        img.onerror = reject;
        img.src = url;
    });
};


export const generatePdfReport = async (data: AnalyzeSpeechOutput): Promise<void> => {
  const doc = new jsPDF();
  const { metadata, evaluationCriteria, totalScore, overallAssessment, highlightedTranscription, suggestedSpeech } = data;

  const pageHeight =
    doc.internal.pageSize.height || doc.internal.pageSize.getHeight();
  const pageWidth =
    doc.internal.pageSize.width || doc.internal.pageSize.getWidth();
  let y = 15;
  const margin = 15;
  const line_height = 7;

  const checkY = (increment = 0) => {
    if (y + increment > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
  };

  try {
    const logoDataUri = await getBase64Image('/logo.png');
    doc.addImage(logoDataUri, 'PNG', margin, y, 15, 15);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("Cognisys AI", margin + 20, y + 10);
  } catch (error) {
    console.error("Could not add logo to PDF:", error);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("Cognisys AI", margin, y + 10);
  }

  y += 30;


  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text(
    "Verbal Insights: Speech Analysis Report",
    pageWidth / 2,
    y,
    { align: "center" }
  );
  y += line_height * 2;

  doc.setFontSize(16);
  doc.text("Overall Assessment", margin, y);
  y += line_height;
  doc.setDrawColor(200);
  doc.line(margin, y, pageWidth - margin, y);
  y += line_height;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.text(`Total Score: ${totalScore}/100`, margin, y);
  y += line_height;

  const assessmentLines = doc.splitTextToSize(
    overallAssessment,
    pageWidth - margin * 2
  );
  doc.text(assessmentLines, margin, y);
  y += assessmentLines.length * line_height + line_height;

  if (highlightedTranscription && highlightedTranscription.length > 0) {
    checkY(line_height * 3);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("Full Transcription", margin, y);
    y += line_height;
    doc.line(margin, y, pageWidth - margin, y);
    y += line_height;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const fullText = highlightedTranscription.map(s => s.text).join(' ');
    const transcriptionLines = doc.splitTextToSize(
      fullText,
      pageWidth - margin * 2
    );
    doc.text(transcriptionLines, margin, y);
    y += transcriptionLines.length * line_height + line_height;
  }
  
  checkY(line_height * 2);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Key Metrics", margin, y);
  y += line_height;
  doc.line(margin, y, pageWidth - margin, y);
  y += line_height;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  const metrics = [
    `Word Count: ${metadata.wordCount}`,
    `Filler Words: ${metadata.fillerWordCount}`,
    `Speech Rate (WPM): ${metadata.speechRateWPM}`,
    `Pitch Variance: ${metadata.pitchVariance.toFixed(2)}`,
    `Average Pause (ms): ${metadata.averagePauseDurationMs}`,
    `Pace Score: ${metadata.paceScore}/100`,
    `Clarity Score: ${metadata.clarityScore}/100`,
    `Pause Time: ${metadata.pausePercentage.toFixed(1)}%`,
  ];
  if (metadata.audioDurationSeconds) {
    metrics.push(
      `Audio Duration (s): ${metadata.audioDurationSeconds.toFixed(2)}`
    );
  }

  metrics.forEach((metric) => {
    checkY();
    doc.text(metric, margin, y);
    y += line_height;
  });
  y += line_height;

  const groupedCriteria = evaluationCriteria.reduce((acc, criterion) => {
    const category = criterion.category;
    if (!acc[category]) acc[category] = [];
    acc[category].push(criterion);
    return acc;
  }, {} as Record<string, typeof evaluationCriteria>);
  
  checkY(line_height * 2);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Detailed Feedback", margin, y);
  y += line_height;
  doc.line(margin, y, pageWidth - margin, y);
  y += line_height;

  Object.entries(groupedCriteria).forEach(([category, items]) => {
    checkY(line_height * 2);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(category, margin, y);
    y += line_height;

    items.forEach((item) => {
      checkY(line_height * 5); 
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text(`${item.criteria} - Score: ${item.score}/10`, margin + 5, y);
      y += line_height;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);

      const evalLines = doc.splitTextToSize(
        `Evaluation: ${item.evaluation}`,
        pageWidth - margin * 2 - 5
      );
      checkY(evalLines.length * line_height);
      doc.text(evalLines, margin + 5, y);
      y += evalLines.length * line_height;

      if (item.comparison) {
          const comparisonLines = doc.splitTextToSize(
            `Comparison: ${item.comparison}`,
            pageWidth - margin * 2 - 5
          );
          checkY(comparisonLines.length * line_height);
          doc.text(comparisonLines, margin + 5, y);
          y += comparisonLines.length * line_height;
      }

      const feedbackLines = doc.splitTextToSize(
        `Feedback: ${item.feedback}`,
        pageWidth - margin * 2 - 5
      );
      checkY(feedbackLines.length * line_height);
      doc.text(feedbackLines, margin + 5, y);
      y += feedbackLines.length * line_height + line_height / 2;
    });
  });

  if (suggestedSpeech) {
    checkY(line_height * 3);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("Suggested Delivery Example", margin, y);
    y += line_height;
    doc.line(margin, y, pageWidth - margin, y);
    y += line_height;

    doc.setFont("helvetica", "italic");
    doc.setFontSize(12);
    const suggestedLines = doc.splitTextToSize(
      suggestedSpeech,
      pageWidth - margin * 2
    );
    checkY(suggestedLines.length * line_height);
    doc.text(suggestedLines, margin, y);
    y += suggestedLines.length * line_height;
  }

  doc.save("verbal-insights-report.pdf");
};
