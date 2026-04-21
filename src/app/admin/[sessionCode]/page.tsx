import { PresenterDashboard } from "./presenter-dashboard";

type AdminPageProps = {
  params: Promise<{
    sessionCode: string;
  }>;
};

export default async function AdminPage({ params }: AdminPageProps) {
  const { sessionCode } = await params;

  return <PresenterDashboard sessionCode={sessionCode} />;
}
