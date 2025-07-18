import { ThemeToggle } from "@/components/theme-toggle";

export default function Header() {
  return (
    <div className="w-full max-w-7xl text-center mb-12">
      <div className="flex items-center justify-center w-full relative">
        <h1 className="text-4xl md:text-5xl font-bold font-headline flex items-center gap-3">
          <span>🎙️</span>
          <span className="text-primary">Speech</span> <span className="text-primary">Analysis Assistant</span>
        </h1>
        <div className="absolute right-0">
         <ThemeToggle />
        </div>
      </div>
      <p className="mt-4 text-lg text-foreground/80 max-w-3xl mx-auto">
        Upload your speech, get instant AI-powered feedback, and improve your
        public speaking skills.
      </p>
    </div>
  );
}
