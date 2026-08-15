"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowUpRight, Copy, Check, Download, RefreshCw, Search } from "lucide-react";
import { Footer } from "@/components/site/footer";
import { SiteHeader } from "@/components/site/header";
import { Challenge, fetchChallenges } from "@/lib/challenges";

export default function HubPage() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const load = async () => {
    setLoading(true); setError(null);
    try { setChallenges(await fetchChallenges()); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not load challenges"); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);
  const filtered = challenges.filter((challenge) => `${challenge.name} ${challenge.display_name} ${challenge.description}`.toLowerCase().includes(query.toLowerCase()));
  const copy = async (challenge: Challenge) => { await navigator.clipboard.writeText(challenge.download_url); setCopied(challenge.name); window.setTimeout(() => setCopied(null), 1800); };

  return <div className="flex min-h-screen flex-col"><SiteHeader rightContent={<a href="https://github.com/The-Conos-Project/ctf-challenges" target="_blank" rel="noreferrer" className="text-sm font-medium text-muted-foreground hover:text-foreground">GitHub repository</a>} />
    <main className="flex-1 px-4 py-12 sm:py-16"><div className="mx-auto max-w-[1100px] space-y-9"><div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="mb-2 text-sm font-medium text-muted-foreground">Live repository catalogue</p><h1 className="text-4xl font-semibold tracking-tight">Challenge Hub</h1><p className="mt-3 max-w-2xl text-muted-foreground">New Markdown guides and challenge archives appear here automatically. No website redeploy is required.</p></div></div>
      <div className="w-full max-w-[1100px]"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search challenges" className="w-full rounded-xl border border-border bg-card py-3 pl-10 pr-4 outline-none focus:ring-2 focus:ring-ring" /></div>
      {loading && <p className="py-20 text-center text-muted-foreground">Loading live challenges…</p>}{error && <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-5 text-destructive">{error} <button onClick={() => void load()} className="ml-2 underline">Try again</button></div>}
      {!loading && !error && <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{filtered.map((challenge) => <article key={challenge.name} className="flex min-h-64 flex-col rounded-2xl border border-border bg-card p-6 shadow-sm"><p className="font-mono text-xs text-muted-foreground">{challenge.name}</p><h2 className="mt-3 text-xl font-semibold">{challenge.display_name}</h2><p className="mt-3 flex-1 text-sm leading-6 text-muted-foreground">{challenge.description || "Open the challenge page for its guide and download."}</p><div className="mt-6 flex gap-2"><Link href={`/hub/${encodeURIComponent(challenge.name)}`} className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground">View challenge <ArrowUpRight className="h-4 w-4" /></Link><button onClick={() => void copy(challenge)} className="rounded-lg border border-border p-2.5" aria-label={`Copy ${challenge.display_name} link`}>{copied === challenge.name ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}</button><a href={challenge.download_url} target="_blank" rel="noreferrer" className="rounded-lg border border-border p-2.5" aria-label={`Download ${challenge.display_name}`}><Download className="h-4 w-4" /></a></div></article>)}</div>}
      {!loading && !error && !filtered.length && <p className="py-20 text-center text-muted-foreground">No challenge matches “{query}”.</p>}</div></main><Footer /></div>;
}
