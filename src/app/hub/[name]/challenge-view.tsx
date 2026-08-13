"use client";

import { useState } from "react";
import { Download, Copy, Check } from "lucide-react";

type ChallengeMeta = {
  name: string;
  display_name: string;
  description: string;
  download_url: string;
  content: string;
};

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

export default function ChallengeView({ challenge }: { challenge: ChallengeMeta }) {
  const [copied, setCopied] = useState(false);

  return (
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
          className="max-w-none text-sm leading-relaxed text-foreground [&_pre]:bg-muted [&_pre]:p-4 [&_pre]:rounded-lg [&_pre]:overflow-x-auto [&_code]:font-mono [&_code]:text-xs [&_h1]:text-2xl [&_h1]:font-semibold [&_h1]:mb-4 [&_h1]:mt-6 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mb-3 [&_h2]:mt-5 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mb-2 [&_h3]:mt-4 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_li]:text-muted-foreground [&_p]:mb-4 [&_p]:text-muted-foreground [&_strong]:text-foreground [&_strong]:font-medium"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(challenge.content) }}
        />
      </div>
    </div>
  );
}
