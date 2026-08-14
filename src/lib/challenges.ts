export type Challenge = {
  name: string;
  display_name: string;
  description: string;
  download_url: string;
  content?: string;
};

const repo = "The-Conos-Project/ctf-challenges";
const headers = { Accept: "application/vnd.github.v3+json" };

function buildMarkdown(challenge: {
  name: string;
  display_name: string;
  description: string;
  flags: { flag: string; description: string; hints: string[] }[];
}): string {
  const flagsSection = challenge.flags
    .map(
      (flag, idx) =>
        `### Flag ${idx + 1}: ${flag.description}\n**Flag:** \`${flag.flag}\`\n\n**Hints:**\n${flag.hints.map((hint) => `- ${hint}`).join("\n")}`
    )
    .join("\n\n");

  return `---
name: ${challenge.name}
display_name: ${challenge.display_name}
description: ${challenge.description}
---

# ${challenge.display_name}

${challenge.description}

## Objectives

${flagsSection}
`;
}

export async function fetchChallenge(slug: string): Promise<Challenge> {
  const metaResponse = await fetch(`https://api.github.com/repos/${repo}/contents/ctf-challenges/ctfploy.json`, { headers, cache: "no-store" });
  if (!metaResponse.ok) throw new Error("Challenge metadata not found");
  const metaFile = await metaResponse.json();
  const metaContent = decodeBase64(metaFile.content);
  const meta = JSON.parse(metaContent);
  const challenge = (meta.challenges || []).find((ch: { name: string }) => ch.name === decodeURIComponent(slug));
  if (!challenge) throw new Error("Challenge not found");
  const archiveResponse = await fetch(`https://api.github.com/repos/${repo}/contents/ctf-challenges/ctf-challenges.tar.gz`, { headers, cache: "no-store" });
  if (!archiveResponse.ok) throw new Error("Archive not found");
  const archive = await archiveResponse.json();
  return {
    name: challenge.name,
    display_name: challenge.display_name,
    description: challenge.description,
    download_url: archive.download_url,
    content: buildMarkdown(challenge),
  };
}

export async function fetchChallenges(): Promise<Challenge[]> {
  const metaResponse = await fetch(`https://api.github.com/repos/${repo}/contents/ctf-challenges/ctfploy.json`, { headers, cache: "no-store" });
  if (!metaResponse.ok) throw new Error("Could not load challenge metadata");
  const metaFile = await metaResponse.json();
  const metaContent = decodeBase64(metaFile.content);
  const meta = JSON.parse(metaContent);
  const archiveResponse = await fetch(`https://api.github.com/repos/${repo}/contents/ctf-challenges/ctf-challenges.tar.gz`, { headers, cache: "no-store" });
  if (!archiveResponse.ok) throw new Error("Could not load challenge archive");
  const archive = await archiveResponse.json();
  return (meta.challenges || []).map((challenge: { name: string; display_name: string; description: string; flags: { flag: string; description: string; hints: string[] }[] }) => ({
    name: challenge.name,
    display_name: challenge.display_name,
    description: challenge.description,
    download_url: archive.download_url,
    content: buildMarkdown(challenge),
  })).sort((a: Challenge, b: Challenge) => a.display_name.localeCompare(b.display_name));
}

function decodeBase64(base64: string): string {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}
