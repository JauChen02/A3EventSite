import { SubmitReflectionForm } from "./submit-reflection-form";

type SubmitPageProps = {
  params: Promise<{
    sessionCode: string;
  }>;
};

export default async function SubmitPage({ params }: SubmitPageProps) {
  const { sessionCode } = await params;

  return <SubmitReflectionForm sessionCode={sessionCode} />;
}
