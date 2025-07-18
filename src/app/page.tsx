import Header from "@/components/header";
import SpeechAnalysisClient from "@/components/speech-analysis-client";

export default function Home() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <main className="flex flex-1 flex-col items-center justify-center p-4 md:p-6 lg:p-10">
        <Header />
        <SpeechAnalysisClient />
      </main>
    </div>
  );
}
