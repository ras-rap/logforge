import { notFound } from "next/navigation";
import LogViewer from "@/components/log-viewer";
import AnalysisDrawer from "@/components/analysis-drawer";
import { getLog } from "@/lib/db";

export default async function LogPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const log = getLog(id);

  if (!log) notFound();

  const parsed = log.parsed ? JSON.parse(log.parsed) : null;

  return (
    <main className="h-dvh p-4 overflow-hidden">
      <div className="relative h-full">
        <div className="h-full">
          <h1 className="text-3xl font-black mb-3">LogForge</h1>
          <LogViewer text={log.content} />
        </div>
        {parsed && <AnalysisDrawer data={parsed} />}
      </div>
    </main>
  );
}
