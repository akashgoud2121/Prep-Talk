export default function Header() {
  return (
    <div className="w-full max-w-5xl text-center mb-12">
      <h1 className="text-4xl md:text-5xl font-bold font-headline flex items-center justify-center gap-3">
        <span>🎙️</span>
        Speech Analysis Assistant
      </h1>
      <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
        Upload your speech, get instant AI-powered feedback, and improve your public speaking skills.
      </p>
    </div>
  );
}
