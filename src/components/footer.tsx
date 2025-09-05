
import { Linkedin } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="w-full border-t border-border/50 bg-secondary backdrop-blur-sm mt-12">
      <div className="container mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 py-8 px-4 md:px-6 text-sm">
        <div className="flex flex-col items-center md:items-start space-y-4">
          <div className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="Cognisys AI Logo"
              width={40}
              height={40}
              className="rounded-md"
              data-ai-hint="company logo"
            />
            <h3 className="text-xl font-bold font-headline">Cognisys AI</h3>
          </div>
          <div className="text-muted-foreground text-center md:text-left">
             <p>&copy; {new Date().getFullYear()} Cognisys AI. All rights reserved.</p>
             <p>Terms and Conditions apply.</p>
          </div>
        </div>

        <div className="text-muted-foreground text-center md:text-left">
          <h4 className="font-semibold text-foreground mb-2">About Us</h4>
          <p>
            Pioneering technology to integrate AI with VLSI for high-performance, intelligent systems. We build end-to-end solutions, from custom ML models to robust MLOps pipelines, shaping the intelligent future.
          </p>
        </div>

        <div className="flex flex-col items-center md:items-end space-y-2">
           <h4 className="font-semibold text-foreground">Connect With Us</h4>
          <div className="flex items-center gap-4">
            <Link
              href="https://www.linkedin.com/company/cognisys-ai/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Cognisys AI LinkedIn"
              className="flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground"
            >
              <Linkedin className="h-5 w-5" />
              <span>LinkedIn</span>
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
