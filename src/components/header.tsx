import { ThemeToggle } from "@/components/theme-toggle";
import { Mic2 } from "lucide-react";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 w-full bg-background/95 pb-4 pt-6 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex max-w-5xl flex-col items-center gap-4 text-center">
        <div className="flex items-center justify-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Mic2 className="h-6 w-6" />
          </div>
          <h1 className="text-3xl font-bold font-headline text-foreground sm:text-4xl">
            Speech Analysis Assistant
          </h1>
          <ThemeToggle />
        </div>
        <p className="max-w-2xl text-muted-foreground">
          Record or transcribe your speech to get AI-powered feedback on your
          delivery, language, and content.
        </p>
      </div>
    </header>
  );
}
