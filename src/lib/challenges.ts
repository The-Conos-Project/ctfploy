export type Challenge = {
  name: string;
  display_name: string;
  description: string;
  download_url: string;
  content?: string;
};

const repo = "The-Conos-Project/ctf-challenges";
const headers = { Accept: "application/vnd.github.v3+json" };

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

const titleize = (value: string) => value.replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

export async function fetchChallenge(slug: string): Promise<Challenge> {
  const response = await fetch(`https://api.github.com/repos/${repo}/contents/challenges/${encodeURIComponent(slug)}`, { headers, cache: "no-store" });
  if (!response.ok) throw new Error("Challenge not found");
  const files = await response.json();
  const markdown = files.find((file: { name: string }) => file.name.endsWith(".md"));
  const archive = files.find((file: { name: string }) => file.name.endsWith(".tar.gz"));
  if (!markdown || !archive) throw new Error("This challenge needs both a Markdown guide and a .tar.gz archive");
  const contentResponse = await fetch(markdown.download_url, { cache: "no-store" });
  if (!contentResponse.ok) throw new Error("Could not load the challenge guide");
  const content = await contentResponse.text();
  const meta = parseFrontmatter(content);
  return { name: meta.name || slug, display_name: meta.display_name || titleize(slug), description: extractDescription(content), download_url: archive.download_url, content };
}

export async function fetchChallenges(): Promise<Challenge[]> {
  const response = await fetch(`https://api.github.com/repos/${repo}/contents/challenges`, { headers, cache: "no-store" });
  if (!response.ok) throw new Error("GitHub did not return the challenge list");
  const folders = await response.json();
  const results = await Promise.all(folders.filter((item: { type: string }) => item.type === "dir").map((folder: { name: string }) => fetchChallenge(folder.name).catch(() => null)));
  return results.filter((item): item is Challenge => item !== null).sort((a, b) => a.display_name.localeCompare(b.display_name));
}
