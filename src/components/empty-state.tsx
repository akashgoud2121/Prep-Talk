import { Mic2 } from "lucide-react";

export default function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-card p-12 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
        <Mic2 className="h-10 w-10 text-primary" />
      </div>
      <h3 className="mt-4 text-xl font-semibold font-headline">
        Awaiting Your Speech
      </h3>
      <p className="mt-2 text-sm text-muted-foreground">
        Provide your speech input and set the context above, then click
        "Analyze My Speech" to see your results.
      </p>
    </div>
  );
}
