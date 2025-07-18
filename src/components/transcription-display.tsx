"use client";

import { cn } from "@/lib/utils";

interface Segment {
  text: string;
  type: 'default' | 'filler' | 'pause';
}

interface TranscriptionDisplayProps {
  segments: Segment[];
}

export default function TranscriptionDisplay({ segments }: TranscriptionDisplayProps) {
  return (
    <div className="p-4 rounded-md bg-secondary/50 border border-border">
      <p className="leading-relaxed text-foreground">
        {segments.map((segment, index) => (
          <span
            key={index}
            className={cn({
              "text-red-500 font-medium": segment.type === 'filler' || segment.type === 'pause',
            })}
          >
            {segment.text}{' '}
          </span>
        ))}
      </p>
    </div>
  );
}
