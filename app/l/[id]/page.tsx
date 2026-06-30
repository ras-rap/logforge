import { notFound } from "next/navigation";
import LogViewContainer from "@/components/log-view-container";
import { getLog } from "@/lib/db";

export default async function LogPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const log = getLog(id);

  if (!log) notFound();

  const parsed = log.parsed ? JSON.parse(log.parsed) : null;

  return (
    <main className="h-dvh p-4 overflow-hidden">
      <LogViewContainer 
        id={id}
        content={log.content} 
        parsed={parsed} 
        initialAiAnalysis={log.ai_analysis ? JSON.parse(log.ai_analysis) : null}
      />
    </main>
  );
}
