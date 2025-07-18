import { ThemeToggle } from "@/components/theme-toggle";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center justify-between">
        <h1 className="text-2xl font-bold font-headline text-primary">
          Verbal Insights
        </h1>
        <ThemeToggle />
      </div>
    </header>
  );
}
