import { TestRunner } from '@/components/test-runner';

export default async function TestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return <TestRunner testId={id} />;
}
