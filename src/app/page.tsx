"use client";

import { useState, useEffect } from "react";
import { ArrowRight, Container, Shield, Zap, Terminal, Sun, Moon, Copy, Check } from "lucide-react";
import { Footer } from "@/components/site/footer";

type Theme = "light" | "dark";

function getSystemTheme(): Theme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function getStoredTheme(): Theme | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("ctfploy-theme") as Theme | null;
}

export default function HomePage() {
  const [theme, setTheme] = useState<Theme>(getStoredTheme() || getSystemTheme());
  const [mounted, setMounted] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setMounted(true);
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("ctfploy-theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  const isDark = theme === "dark";
  const headerColor = isDark ? "#ffffff" : "#0B0E1C";

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="mx-auto w-full max-w-[1000px] flex h-16 items-center justify-between gap-4 px-4 sm:px-5">
          <div className="flex items-center gap-2.5">
            <span className="text-lg font-semibold tracking-tight header-wordmark">
              CTFploy
            </span>
          </div>
          <nav className="flex items-center gap-4">
            <a
              href="/hub"
              className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium"
            >
              Hub
            </a>
            <button
              onClick={toggleTheme}
              className="rounded-full p-2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Toggle theme"
            >
              {mounted && isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="flex flex-col items-center justify-center px-4 py-24 text-center min-h-[calc(100vh-64px-72px)]">
          <div className="mx-auto w-full max-w-[1000px] space-y-8">
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
              CTFploy
            </h1>
            <p className="text-base leading-relaxed text-muted-foreground sm:text-lg max-w-2xl mx-auto">
              One-command deployment for self-hosted CTF platforms.
              Docker-powered, instant challenge instances, zero configuration headaches.
            </p>

            <div className="mt-8 w-full max-w-2xl mx-auto">
              <div className="rounded-xl border border-border bg-card overflow-hidden shadow-lg">
                <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/30">
                  <div className="flex items-center gap-2">
                    <Terminal className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground">bash</span>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText("curl -sSL https://ctfploy.conos.uz/install.sh | sudo bash");
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-md bg-foreground text-background px-3 py-1.5 text-xs font-medium hover:opacity-80 transition-opacity"
                  >
                    {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
                <div className="px-5 py-3">
                  <code className="text-sm sm:text-base font-mono text-left break-all text-foreground">
                    curl -sSL https://ctfploy.conos.uz/install.sh | sudo bash
                  </code>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-12 text-left">
              <div className="space-y-2">
                <Zap className="h-5 w-5 text-foreground" />
                <h3 className="font-semibold text-foreground">Instant Deploy</h3>
                <p className="text-sm text-muted-foreground">
                  One command sets up Docker, nginx, and the platform on any Ubuntu VPS.
                </p>
              </div>
              <div className="space-y-2">
                <Container className="h-5 w-5 text-foreground" />
                <h3 className="font-semibold text-foreground">Challenge Instances</h3>
                <p className="text-sm text-muted-foreground">
                  Each participant gets isolated Docker containers with dynamic flags and auto-expiry.
                </p>
              </div>
              <div className="space-y-2">
                <Shield className="h-5 w-5 text-foreground" />
                <h3 className="font-semibold text-foreground">Access Control</h3>
                <p className="text-sm text-muted-foreground">
                  Code-based access, admin dashboard, and per-user instance limits out of the box.
                </p>
              </div>
            </div>

            <div className="pt-8">
              <a
                href="https://github.com/The-Conos-Project/ctfploy"
                className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-6 py-3 font-medium hover:bg-primary/80 transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                View on GitHub
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
