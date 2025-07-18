export const SectionTitle = ({ number, title }: { number: string; title: string }) => {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-lg">
          {number}
        </div>
        <h2 className="text-2xl font-bold font-headline">{title}</h2>
      </div>
    );
  };
  