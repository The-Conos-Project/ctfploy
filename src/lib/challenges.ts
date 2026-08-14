export type Challenge = {
  name: string;
  display_name: string;
  description: string;
  download_url: string;
  content?: string;
};

const repo = "The-Conos-Project/ctf-challenges";
const headers = { Accept: "application/vnd.github.v3+json" };

function decodeBase64(base64: string): string {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

function extractDescription(content: string): string {
  const withoutFrontmatter = content.replace(/^---[\s\S]*?---/, "").trim();
  return withoutFrontmatter
    .split("\n")
    .filter((line) => line.trim() && !line.startsWith("#"))
    .slice(0, 3)
    .join(" ")
    .trim();
}

export async function fetchChallenge(slug: string): Promise<Challenge> {
  const folderResponse = await fetch(`https://api.github.com/repos/${repo}/contents/challenges/${encodeURIComponent(slug)}`, { headers, cache: "no-store" });
  if (!folderResponse.ok) throw new Error("Challenge not found");
  const files = await folderResponse.json();
  const markdown = files.find((file: { name: string }) => file.name.endsWith(".md"));
  const archive = files.find((file: { name: string }) => file.name.endsWith(".tar.gz"));
  if (!markdown || !archive) throw new Error("This challenge needs both a Markdown guide and a .tar.gz archive");
  const contentResponse = await fetch(markdown.download_url, { cache: "no-store" });
  if (!contentResponse.ok) throw new Error("Could not load the challenge guide");
  const content = await contentResponse.text();
  return {
    name: slug,
    display_name: slug.replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()),
    description: extractDescription(content),
    download_url: archive.download_url,
    content,
  };
}

export async function fetchChallenges(): Promise<Challenge[]> {
  const response = await fetch(`https://api.github.com/repos/${repo}/contents/challenges`, { headers, cache: "no-store" });
  if (!response.ok) throw new Error("GitHub did not return the challenge list");
  const folders = await response.json();
  const results = await Promise.all(
    folders
      .filter((item: { type: string }) => item.type === "dir")
      .map((folder: { name: string }) => fetchChallenge(folder.name).catch(() => null))
  );
  return results.filter((item): item is Challenge => item !== null).sort((a, b) => a.display_name.localeCompare(b.display_name));
}
