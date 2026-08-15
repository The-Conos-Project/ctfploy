import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-border/60 bg-muted/30">
      <div className="mx-auto w-full max-w-[1000px] px-4 sm:px-5 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
        <span>by Conos</span>
        <div className="flex items-center gap-6">
          <a
            href="https://github.com/The-Conos-Project/ctfploy-platform"
            className="hover:text-foreground transition-colors"
            target="_blank"
            rel="noopener noreferrer"
          >
            CTFploy Platform
          </a>
          <a
            href="https://www.conos.uz"
            className="hover:text-foreground transition-colors"
            target="_blank"
            rel="noopener noreferrer"
          >
            The Conos Project
          </a>
        </div>
      </div>
    </footer>
  );
}
