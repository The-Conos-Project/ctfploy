"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Footer } from "@/components/site/footer";
import { SiteHeader } from "@/components/site/header";
import { Challenge, fetchChallenge } from "@/lib/challenges";
import ChallengeView from "./challenge-view";

export default function ChallengeDetail({ slug }: { slug: string }) {
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => { setError(null); try { setChallenge(await fetchChallenge(decodeURIComponent(slug))); } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not load challenge"); } }, [slug]);
  useEffect(() => { void load(); }, [load]);
  return <div className="flex min-h-screen flex-col"><SiteHeader rightContent={<Link href="/hub" className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Back to Hub</Link>} /><main className="flex-1 px-4 py-12"><div className="mx-auto max-w-4xl">{!challenge && !error && <p className="py-24 text-center text-muted-foreground">Loading challenge guide…</p>}{error && <div className="py-24 text-center"><p className="text-destructive">{error}</p><button className="mt-5 inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2" onClick={() => void load()}>Try again</button></div>}{challenge && <ChallengeView challenge={challenge as Required<Challenge>} />}</div></main><Footer /></div>;
}
