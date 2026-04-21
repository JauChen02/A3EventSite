import { WallView } from "./wall-view";

type WallPageProps = {
  params: Promise<{
    sessionCode: string;
  }>;
};

export default async function WallPage({ params }: WallPageProps) {
  const { sessionCode } = await params;

  return <WallView sessionCode={sessionCode} />;
}
