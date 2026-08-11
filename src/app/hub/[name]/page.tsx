"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Download, ArrowLeft, Sun, Moon, Copy, Check } from "lucide-react";
import { SiteHeader } from "@/components/site/header";
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

type ChallengeMeta = {
  name: string;
  display_name: string;
  description: string;
  download_url: string;
  content: string;
};

function parseFrontmatter(text: string): Record<string, any> {
  const meta: Record<string, any> = {};
  if (!text.startsWith("---")) return meta;
  const end = text.indexOf("---", 3);
  if (end === -1) return meta;
  const block = text.slice(3, end).trim();
  for (const line of block.split("\n")) {
    if (!line.includes(":")) continue;
    const [key, ...rest] = line.split(":");
    const value = rest.join(":").trim();
    if (value.startsWith("[") && value.endsWith("]")) {
      meta[key.trim()] = value.slice(1, -1).split(",").map((v) => v.trim()).filter(Boolean);
    } else {
      meta[key.trim()] = value;
    }
  }
  return meta;
}

function extractDescription(text: string): string {
  const withoutFrontmatter = text.replace(/^---[\s\S]*?---/, "").trim();
  const lines = withoutFrontmatter.split("\n").filter((line) => line.trim() && !line.startsWith("#"));
  return lines.slice(0, 3).join(" ").trim();
}

function renderMarkdown(md: string): string {
  const withoutFrontmatter = md.replace(/^---[\s\S]*?---/, "").trim();

  let html = withoutFrontmatter
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  html = html.replace(/```([\s\S]*?)```/g, (_match, code) => {
    return `<pre><code>${code.trim()}</code></pre>`;
  });

  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

  html = html.replace(/^#{1,6}\s+(.+)$/gm, (match, title) => {
    const level = match.match(/^(#{1,6})/)?.[1].length || 1;
    return `<h${level}>${title.trim()}</h${level}>`;
  });

  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");

  html = html.replace(/^(\s*)[-*]\s+(.+)$/gm, (match, indent, item) => {
    return `${indent}<li>${item}</li>`;
  });

  html = html.replace(/(<li>.*<\/li>\n?)+/g, (match) => {
    return `<ul>${match.trim()}</ul>\n`;
  });

  html = html.replace(/^(?!<[hlu]|<\/)(.+)$/gm, (match) => {
    if (!match.trim()) return "";
    return `<p>${match.trim()}</p>`;
  });

  return html;
}

export default function ChallengeDetailPage() {
  const params = useParams();
  const name = typeof params.name === "string" ? params.name : Array.isArray(params.name) ? params.name[0] : "";
  const decodedName = decodeURIComponent(name);

  const [theme, setTheme] = useState<Theme>(getStoredTheme() || getSystemTheme());
  const [mounted, setMounted] = useState(false);
  const [challenge, setChallenge] = useState<ChallengeMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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

  useEffect(() => {
    async function fetchChallenge() {
      try {
        setLoading(true);
        setError(null);

        const repo = "The-Conos-Project/ctf-challenges";
        const folderUrl = `https://api.github.com/repos/${repo}/contents/challenges/${decodedName}`;

        const folderRes = await fetch(folderUrl, {
          headers: { Accept: "application/vnd.github.v3+json" },
          next: { revalidate: 3600 },
        });

        if (!folderRes.ok) throw new Error("Challenge not found");
        const files = await folderRes.json();

        const mdFile = files.find((f: any) => f.name.endsWith(".md"));
        const tarFile = files.find((f: any) => f.name.endsWith(".tar.gz"));

        if (!mdFile || !tarFile) throw new Error("Invalid challenge structure");

        const mdRes = await fetch(mdFile.download_url);
        if (!mdRes.ok) throw new Error("Failed to load markdown");
        const mdContent = await mdRes.text();

        const meta = parseFrontmatter(mdContent);
        const description = extractDescription(mdContent);

        setChallenge({
          name: meta.name || decodedName,
          display_name: meta.display_name || decodedName.replace(/-/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()),
          description,
          download_url: tarFile.download_url,
          content: mdContent,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    if (decodedName) {
      fetchChallenge();
    }
  }, [decodedName]);

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader
        badge="Hub"
        rightContent={
          <a
            href="/hub"
            className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium inline-flex items-center gap-1"
          >
            Back
          </a>
        }
      />

      <main className="flex-1">
        <section className="px-4 py-12">
          <div className="mx-auto w-full max-w-[1000px]">
            {loading && (
              <div className="text-center py-20 text-muted-foreground">
                Loading challenge...
              </div>
            )}

            {error && (
              <div className="text-center py-20 text-red-400">
                Failed to load challenge: {error}
              </div>
            )}

            {!loading && !error && challenge && (
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="p-8">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div>
                      <h1 className="text-3xl font-semibold tracking-tight">{challenge.display_name}</h1>
                      <p className="text-sm text-muted-foreground font-mono mt-1">{challenge.name}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(challenge.download_url);
                          setCopied(true);
                          setTimeout(() => setCopied(false), 2000);
                        }}
                        className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/80 transition-colors"
                      >
                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        {copied ? "Copied" : "Copy Link"}
                      </button>
                      <a
                        href={challenge.download_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-lg border border-border bg-background text-foreground px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
                      >
                        <Download className="h-4 w-4" />
                        Download
                      </a>
                    </div>
                  </div>
                  <p className="text-muted-foreground">{challenge.description}</p>
                </div>

                <div className="border-t border-border" />

                <div className="p-8">
                  <div
                    className="prose prose-invert max-w-none text-sm leading-relaxed text-foreground [&_pre]:bg-muted [&_pre]:p-4 [&_pre]:rounded-lg [&_pre]:overflow-x-auto [&_code]:font-mono [&_code]:text-xs [&_h1]:text-2xl [&_h1]:font-semibold [&_h1]:mb-4 [&_h1]:mt-6 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mb-3 [&_h2]:mt-5 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mb-2 [&_h3]:mt-4 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_li]:text-muted-foreground [&_p]:mb-4 [&_p]:text-muted-foreground [&_strong]:text-foreground [&_strong]:font-medium"
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(challenge.content) }}
                  />
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
