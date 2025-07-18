import { MicVocal } from "lucide-react";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 py-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex max-w-5xl items-center justify-between">
        <div className="flex items-center gap-2">
          <MicVocal className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold font-headline text-foreground">
            Verbal Insights
          </h1>
        </div>
      </div>
    </header>
  );
}
