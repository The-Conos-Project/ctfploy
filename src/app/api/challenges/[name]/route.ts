import { NextResponse } from "next/server";

const repo = "The-Conos-Project/ctf-challenges";
const headers = { Accept: "application/vnd.github.v3+json" };

export async function GET(_request: Request, { params }: { params: Promise<{ name: string }> }) {
  try {
    const { name } = await params;
    const folderResponse = await fetch(`https://api.github.com/repos/${repo}/contents/challenges/${encodeURIComponent(name)}`, { headers, cache: "no-store" });
    if (!folderResponse.ok) throw new Error("Challenge not found");
    const files = await folderResponse.json();
    const markdown = files.find((file: { name: string }) => file.name.endsWith(".md"));
    const archive = files.find((file: { name: string }) => file.name.endsWith(".tar.gz"));
    if (!markdown || !archive) throw new Error("This challenge needs both a Markdown guide and a .tar.gz archive");
    const contentResponse = await fetch(markdown.download_url, { cache: "no-store" });
    if (!contentResponse.ok) throw new Error("Could not load the challenge guide");
    const content = await contentResponse.text();
    return NextResponse.json({
      name,
      display_name: name.replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()),
      description: extractDescription(content),
      download_url: archive.download_url,
      content,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not load challenge" }, { status: 500 });
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
