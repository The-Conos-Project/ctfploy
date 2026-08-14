export type Challenge = {
  name: string;
  display_name: string;
  description: string;
  download_url: string;
  content?: string;
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "";

export async function fetchChallenges(): Promise<Challenge[]> {
  const response = await fetch(`${API_BASE}/api/challenges`, { cache: "no-store" });
  if (!response.ok) throw new Error("Could not load challenges");
  return response.json();
}

export async function fetchChallenge(slug: string): Promise<Challenge> {
  const response = await fetch(`${API_BASE}/api/challenges/${encodeURIComponent(slug)}`, { cache: "no-store" });
  if (!response.ok) throw new Error("Could not load challenge");
  return response.json();
}

export function parseFrontmatter(text: string): Record<string, string> {
  const meta: Record<string, string> = {};
  const match = text.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!match) return meta;
  for (const line of match[1].split("\n")) {
    const separator = line.indexOf(":");
    if (separator > 0) meta[line.slice(0, separator).trim()] = line.slice(separator + 1).trim();
  }
  return meta;
}

export function extractDescription(text: string) {
  return text.replace(/^---[\s\S]*?---/, "").split("\n").filter((line) => line.trim() && !line.startsWith("#")).slice(0, 3).join(" ").trim();
}
