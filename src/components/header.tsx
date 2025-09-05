import { ThemeToggle } from "@/components/theme-toggle";

export default function Header() {
  return (
    <div className="w-full max-w-7xl text-center mb-12">
       <div className="flex justify-center items-center gap-4 mb-2">
        <h1 className="font-headline text-4xl md:text-5xl font-bold text-primary">
          🎙️ Speech Analysis Assistant
        </h1>
        <ThemeToggle />
      </div>
      <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
        Record or transcribe your speech to get AI-powered feedback on your delivery, language, and content. Choose a mode below and speak out!
      </p>
    </div>
  );
}
