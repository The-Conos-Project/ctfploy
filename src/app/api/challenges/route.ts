import { NextResponse } from "next/server";

const repo = "The-Conos-Project/ctf-challenges";
const headers = { Accept: "application/vnd.github.v3+json" };

export async function GET() {
  try {
    const response = await fetch(`https://api.github.com/repos/${repo}/contents/challenges`, { headers, cache: "no-store" });
    if (!response.ok) throw new Error("GitHub did not return the challenge list");
    const folders = await response.json();
    const results = await Promise.all(
      folders
        .filter((item: { type: string }) => item.type === "dir")
        .map(async (folder: { name: string }) => {
          const slug = folder.name;
          const folderResponse = await fetch(`https://api.github.com/repos/${repo}/contents/challenges/${encodeURIComponent(slug)}`, { headers, cache: "no-store" });
          if (!folderResponse.ok) return null;
          const files = await folderResponse.json();
          const markdown = files.find((file: { name: string }) => file.name.endsWith(".md"));
          const archive = files.find((file: { name: string }) => file.name.endsWith(".tar.gz"));
          if (!markdown || !archive) return null;
          const contentResponse = await fetch(markdown.download_url, { cache: "no-store" });
          if (!contentResponse.ok) return null;
          const content = await contentResponse.text();
          return {
            name: slug,
            display_name: slug.replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()),
            description: extractDescription(content),
            download_url: archive.download_url,
            content,
          };
        })
    );
    const challenges = results.filter((item): item is NonNullable<typeof item> => item !== null).sort((a, b) => a.display_name.localeCompare(b.display_name));
    return NextResponse.json(challenges);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not load challenges" }, { status: 500 });
  }
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
