import { ThemeToggle } from "@/components/theme-toggle";

export default function Header() {
  return (
    <div className="w-full max-w-7xl text-center mb-12">
      <div className="flex items-center justify-between w-full">
        <h1 className="text-4xl md:text-5xl font-bold font-headline flex items-center gap-3">
          <span>🎙️</span>
          Speech <span className="text-primary">Analysis Assistant</span>
        </h1>
        <ThemeToggle />
      </div>
      <p className="mt-4 text-lg text-foreground/80 max-w-3xl mx-auto">
        Upload your speech, get instant AI-powered feedback, and improve your
        public speaking skills.
      </p>
    </div>
  );
}
