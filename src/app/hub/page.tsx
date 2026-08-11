"use client";

import { useState, useEffect } from "react";
import { Search, Download, ExternalLink, Copy, Check, ChevronDown, ChevronUp, Sun, Moon } from "lucide-react";
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

type Challenge = {
  name: string;
  display_name: string;
  internal_port: number;
  connection_type: string;
  flag_type: string;
  hints: string[];
  download_url: string;
  description?: string;
};

export default function HubPage() {
  const [theme, setTheme] = useState<Theme>(getStoredTheme() || getSystemTheme());
  const [mounted, setMounted] = useState(false);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

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

  useEffect(() => {
    async function fetchChallenges() {
      try {
        setLoading(true);
        setError(null);

        const repo = "The-Conos-Project/ctf-challenges";
        const folderUrl = `https://api.github.com/repos/${repo}/contents/challenges`;

        const folderRes = await fetch(folderUrl, {
          headers: { Accept: "application/vnd.github.v3+json" },
          next: { revalidate: 3600 },
        });

        if (!folderRes.ok) throw new Error("Failed to load challenges");
        const folders = await folderRes.json();

        const challengePromises = folders
          .filter((item: any) => item.type === "dir")
          .map(async (folder: any) => {
            const folderApiUrl = folder.url;
            const filesRes = await fetch(folderApiUrl, {
              headers: { Accept: "application/vnd.github.v3+json" },
            });

            if (!filesRes.ok) return null;
            const files = await filesRes.json();

            const mdFile = files.find((f: any) => f.name.endsWith(".md"));
            const tarFile = files.find((f: any) => f.name.endsWith(".tar.gz"));

            if (!mdFile || !tarFile) return null;

            const mdRes = await fetch(mdFile.download_url);
            if (!mdRes.ok) return null;
            const mdContent = await mdRes.text();

            const meta = parseFrontmatter(mdContent);
            const description = extractDescription(mdContent);

            return {
              name: meta.name || folder.name,
              display_name: meta.display_name || folder.name.replace(/-/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()),
              internal_port: Number(meta.internal_port) || 22,
              connection_type: meta.connection_type || "ssh",
              flag_type: meta.flag_type || "static",
              hints: Array.isArray(meta.hints) ? meta.hints : [],
              download_url: tarFile.download_url,
              description,
            } as Challenge;
          });

        const results = await Promise.all(challengePromises);
        setChallenges(results.filter((ch): ch is Challenge => ch !== null));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    fetchChallenges();
  }, []);

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

  const toggleExpand = (name: string) => {
    setExpandedId(expandedId === name ? null : name);
  };

  const copyPath = async (url: string, name: string) => {
    await navigator.clipboard.writeText(url);
    setCopiedId(name);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filtered = challenges.filter((ch) => {
    const q = query.toLowerCase();
    if (!q) return true;
    return (
      ch.display_name.toLowerCase().includes(q) ||
      ch.name.toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex flex-1 flex-col">
      {/* Header matching main site */}
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="mx-auto w-full max-w-[1000px] flex h-16 items-center justify-between gap-4 px-4 sm:px-5">
          <div className="flex items-center gap-2.5">
            <span className="text-lg font-semibold tracking-tight" style={{ color: isDark ? "#ffffff" : "#0B0E1C" }}>
              CTFploy
            </span>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full border border-foreground/20 text-muted-foreground">
              Hub
            </span>
          </div>
          <nav className="flex items-center gap-4">
            <a
              href="https://github.com/The-Conos-Project/ctf-challenges"
              className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium inline-flex items-center gap-1"
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="h-4 w-4" />
              Repo
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
        <section className="px-4 py-12">
          <div className="mx-auto w-full max-w-[1000px] space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-semibold tracking-tight">CTFploy Hub</h1>
                <p className="text-muted-foreground mt-1">
                  Browse and import challenges from the Conos CTF challenges repository.
                </p>
              </div>
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search challenges..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full rounded-lg border border-border bg-card pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>

            {loading && (
              <div className="text-center py-20 text-muted-foreground">
                Loading challenges...
              </div>
            )}

            {error && (
              <div className="text-center py-20 text-red-400">
                Failed to load challenges: {error}
              </div>
            )}

            {!loading && !error && filtered.length === 0 && (
              <div className="text-center py-20 text-muted-foreground">
                No challenges found.
              </div>
            )}

            {!loading && !error && filtered.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filtered.map((ch) => (
                  <div
                    key={ch.name}
                    className="rounded-xl border border-border bg-card flex flex-col"
                  >
                    <div className="p-6 flex-1">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="font-semibold text-lg">{ch.display_name}</h3>
                        <button
                          onClick={() => toggleExpand(ch.name)}
                          className="shrink-0 rounded-md p-1 hover:bg-muted transition-colors"
                          aria-label={expandedId === ch.name ? "Collapse" : "Expand"}
                        >
                          {expandedId === ch.name ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          )}
                        </button>
                      </div>
                      <p className="text-xs text-muted-foreground mb-4 font-mono">{ch.name}</p>
                      <div className="flex gap-2 mb-4 flex-wrap">
                        <span className="inline-flex items-center rounded-full bg-primary/10 text-primary text-xs px-2.5 py-0.5 font-medium">
                          {ch.connection_type.toUpperCase()}
                        </span>
                        <span className="inline-flex items-center rounded-full bg-muted text-muted-foreground text-xs px-2.5 py-0.5 font-medium">
                          {ch.flag_type}
                        </span>
                        <span className="inline-flex items-center rounded-full bg-muted text-muted-foreground text-xs px-2.5 py-0.5 font-medium">
                          Port {ch.internal_port}
                        </span>
                      </div>
                      {expandedId === ch.name && (
                        <div className="mt-4 pt-4 border-t border-border space-y-3">
                          {ch.description && (
                            <p className="text-sm text-muted-foreground">{ch.description}</p>
                          )}
                          {ch.hints && ch.hints.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-foreground mb-1">Hints</p>
                              <ul className="list-disc list-inside text-xs text-muted-foreground space-y-1">
                                {ch.hints.map((hint, idx) => (
                                  <li key={idx}>{hint}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          <div>
                            <p className="text-xs font-medium text-foreground mb-1">Download URL</p>
                            <div className="flex items-center gap-2">
                              <code className="flex-1 text-xs bg-muted p-2 rounded-md break-all text-muted-foreground">
                                {ch.download_url}
                              </code>
                              <button
                                onClick={() => copyPath(ch.download_url, ch.name)}
                                className="shrink-0 rounded-md bg-foreground text-background px-2 py-1.5 text-xs font-medium hover:opacity-80 transition-opacity"
                              >
                                {copiedId === ch.name ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="px-6 py-4 border-t border-border">
                      <a
                        href={ch.download_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/80 transition-colors w-full"
                      >
                        <Download className="h-4 w-4" />
                        Download .tar.gz
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
