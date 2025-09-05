
import { Linkedin } from "lucide-react";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="w-full border-t border-border/50 bg-background/50 backdrop-blur-sm">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
        <p className="text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} Cognisys AI. All rights reserved.
        </p>
        <div className="flex items-center gap-4">
          <Link
            href="https://www.linkedin.com/company/cognisys-ai/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Cognisys AI LinkedIn"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            <Linkedin className="h-5 w-5" />
          </Link>
        </div>
      </div>
    </footer>
  );
}
