import { SiteHeader } from "@/components/site/header";
import { Footer } from "@/components/site/footer";
import ChallengeView from "./challenge-view";

type ChallengeMeta = {
  name: string;
  display_name: string;
  description: string;
  download_url: string;
  content: string;
};

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

export async function generateStaticParams() {
  try {
    const repo = "The-Conos-Project/ctf-challenges";
    const folderUrl = `https://api.github.com/repos/${repo}/contents/challenges`;
    const res = await fetch(folderUrl, {
      headers: { Accept: "application/vnd.github.v3+json" },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const items = await res.json();
    return items
      .filter((item: any) => item.type === "dir")
      .map((item: any) => ({ name: item.name }));
  } catch {
    return [];
  }
}

export default async function ChallengeDetailPage({ params }: { params: { name: string } }) {
  const name = params.name;
  const decodedName = decodeURIComponent(name);

  let challenge: ChallengeMeta | null = null;
  let error: string | null = null;

  try {
    const repo = "The-Conos-Project/ctf-challenges";
    const folderUrl = `https://api.github.com/repos/${repo}/contents/challenges/${decodedName}`;

    const folderRes = await fetch(folderUrl, {
      headers: { Accept: "application/vnd.github.v3+json" },
      next: { revalidate: 3600 },
    });

    if (!folderRes.ok) throw new Error("Challenge not found");
    const files = await folderRes.json();

    const mdFile = files.find((f: any) => f.name.endsWith(".md"));
    const tarFile = files.find((f: any) => f.name.endsWith(".tar.gz"));

    if (!mdFile || !tarFile) throw new Error("Invalid challenge structure");

    const mdRes = await fetch(mdFile.download_url);
    if (!mdRes.ok) throw new Error("Failed to load markdown");
    const mdContent = await mdRes.text();

    const meta = parseFrontmatter(mdContent);
    const description = extractDescription(mdContent);

    challenge = {
      name: meta.name || decodedName,
      display_name: meta.display_name || decodedName.replace(/-/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()),
      description,
      download_url: tarFile.download_url,
      content: mdContent,
    };
  } catch (err) {
    error = err instanceof Error ? err.message : "Unknown error";
  }

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader
        badge="Hub"
        rightContent={
          <a
            href="/hub"
            className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium inline-flex items-center gap-1"
          >
            Back
          </a>
        }
      />

      <main className="flex-1">
        <section className="px-4 py-12">
          <div className="mx-auto w-full max-w-[1000px]">
            {error && (
              <div className="text-center py-20 text-red-400">
                Failed to load challenge: {error}
              </div>
            )}

            {!error && challenge && (
              <ChallengeView challenge={challenge} />
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
