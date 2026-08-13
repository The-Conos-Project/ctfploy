"use client";

import Link from "next/link";
import Image from "next/image";
import { Sun, Moon } from "lucide-react";
import { useState, useEffect } from "react";

type Theme = "light" | "dark";

function getSystemTheme(): Theme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function getStoredTheme(): Theme | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("ctfploy-theme") as Theme | null;
}

function useClientTheme() {
  const [theme, setTheme] = useState<Theme>(getStoredTheme() || getSystemTheme());
  const [mounted, setMounted] = useState(false);

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

  return { mounted, isDark, toggleTheme };
}

type SiteHeaderProps = {
  badge?: string;
  rightContent?: React.ReactNode;
};

export function SiteHeader({ badge, rightContent }: SiteHeaderProps) {
  const { mounted, isDark, toggleTheme } = useClientTheme();

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto w-full max-w-[1000px] flex h-16 items-center justify-between gap-4 px-4 sm:px-5">
        <Link href="/" className="flex items-center gap-2.5" aria-label="CTFploy home">
          <Image src="/logos/logo-solid.png" alt="" width={34} height={34} className="h-[34px] w-[34px] shrink-0 rounded-lg" priority />
          <span className="text-lg font-semibold tracking-tight header-wordmark">
            CTFploy
          </span>
          {badge && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full border border-foreground/20 text-muted-foreground">
              {badge}
            </span>
          )}
        </Link>
        <nav className="flex items-center gap-4">
          {rightContent}
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
  );
}
