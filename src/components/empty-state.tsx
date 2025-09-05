import { BrainCircuit } from "lucide-react";

export default function EmptyState() {
  return (
    <section className="space-y-6 pt-12 max-w-7xl mx-auto">
      <div className="flex flex-col items-center justify-center rounded-lg h-full text-center bg-secondary p-16">
        <BrainCircuit className="h-16 w-16 text-muted-foreground/50 mb-4" />
        <p className="text-2xl font-medium">
          Your analysis dashboard will appear here.
        </p>
        <p className="text-muted-foreground">
          Record your speech and click &quot;Analyze&quot; to get started.
        </p>
      </div>
    </section>
  );
}
