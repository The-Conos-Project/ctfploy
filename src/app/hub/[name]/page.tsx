import ChallengeDetail from "./challenge-detail";

export default async function ChallengeDetailPage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  return <ChallengeDetail slug={name} />;
}
