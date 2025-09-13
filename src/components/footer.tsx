
import { Linkedin, Link as LinkIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="w-full border-t border-border/50 bg-secondary backdrop-blur-sm mt-12">
      <div className="container mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 py-6 px-4 md:px-6 text-sm">
        <div className="flex flex-col items-center md:items-start space-y-3">
          <div className="flex items-center gap-3">
            <Image
              src="https://media.licdn.com/dms/image/v2/D560BAQFK4uppQGwRcg/company-logo_200_200/company-logo_200_200/0/1735737431638?e=1759968000&v=beta&t=K2Xh4e_oAMJ3lcIfYmknNr_I1qmAWRBTv1WgA7BIWYA"
              alt="Cognisys AI Logo"
              width={32}
              height={32}
              className="rounded-md"
              data-ai-hint="company logo"
            />
            <h3 className="text-lg font-bold font-headline">Cognisys AI</h3>
          </div>
          <div className="text-muted-foreground text-center md:text-left text-xs">
             <p>&copy; {new Date().getFullYear()} Cognisys AI. All rights reserved.</p>
             <p>Terms and Conditions apply.</p>
          </div>
        </div>

        <div className="text-muted-foreground text-center md:text-left">
          <h4 className="font-semibold text-foreground mb-1">About Us</h4>
          <p className="text-xs">
            Pioneering technology to integrate AI with VLSI for high-performance, intelligent systems. We build end-to-end solutions, from custom ML models to robust MLOps pipelines, shaping the intelligent future.
          </p>
        </div>

        <div className="flex flex-col items-center md:items-end space-y-2">
           <h4 className="font-semibold text-foreground">Connect With Us</h4>
          <div className="flex items-center gap-4">
            <Link
              href="https://cognisysai.com/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Cognisys AI Website"
              className="flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground"
            >
                <LinkIcon className="h-5 w-5" />
                <span>Website</span>
            </Link>
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
