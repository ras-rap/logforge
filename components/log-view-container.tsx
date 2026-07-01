"use client";

import { useState, useCallback } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "./ui/button";
import LogViewer, { JumpSignal } from "./log-viewer";
import AiPanel from "./ai-panel";
import { ParsedLog, AiAnalysis } from "@/lib/parser/types";
import { StreamEvent } from "@/lib/ai/tools";

interface LogViewContainerProps {
  id: string;
  content: string;
  parsed: ParsedLog | null;
  initialAiAnalysis?: AiAnalysis;
}

/** Read an SSE stream, calling onEvent for each parsed event. */
async function readSSE(res: Response, onEvent: (e: StreamEvent) => void) {
  if (!res.body) throw new Error("No response body");
  const reader  = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer    = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split("\n\n");
    buffer = chunks.pop() ?? "";
    for (const chunk of chunks) {
      for (const line of chunk.split("\n")) {
        if (!line.startsWith("data: ")) continue;
        try { onEvent(JSON.parse(line.slice(6))); } catch {}
      }
    }
  }
}

export default function LogViewContainer({ id, content, parsed, initialAiAnalysis }: LogViewContainerProps) {
  const [jumpSignal,     setJumpSignal]     = useState<JumpSignal | null>(null);
  const [aiAnalysis,     setAiAnalysis]     = useState<AiAnalysis | undefined>(initialAiAnalysis);
  const [isAnalyzing,    setIsAnalyzing]    = useState(false);
  const [analysisError,  setAnalysisError]  = useState<string | null>(null);
  const [toolEvents,     setToolEvents]     = useState<StreamEvent[]>([]);
  const [isAiPanelOpen,  setIsAiPanelOpen]  = useState(false);
  const [aiPanelTab,     setAiPanelTab]     = useState<"summary" | "chat">("summary");

  const handleOpenAi = useCallback((tab: "summary" | "chat" = "summary") => {
    setAiPanelTab(tab);
    setIsAiPanelOpen(true);
  }, []);

  const handleJumpToCrash = useCallback(() => {
    if (!parsed) return;
    const crashLine = parsed.errors?.[0]?.line ?? parsed.importantLines?.[0];
    if (crashLine) setJumpSignal({ line: crashLine, nonce: Math.random() });
  }, [parsed]);

  const handleJumpToLine = useCallback((line: number) => {
    setJumpSignal({ line, nonce: Math.random() });
  }, []);

  const handleRunAiAnalysis = useCallback(async () => {
    setIsAnalyzing(true);
    setAnalysisError(null);
    setToolEvents([]);

    try {
      const res = await fetch("/api/analyze", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ id }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text}`);
      }

      await readSSE(res, (event) => {
        switch (event.type) {
          case "tool_call":
          case "tool_result":
            setToolEvents(prev => [...prev, event]);
            break;
          case "analysis":
            setAiAnalysis(event.data);
            setIsAnalyzing(false);
            break;
          case "error":
            setAnalysisError(event.message);
            setIsAnalyzing(false);
            break;
        }
      });
    } catch (e: unknown) {
      setAnalysisError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsAnalyzing(false);
    }
  }, [id]);

  const hasCrash = parsed
      ? ((parsed.errors?.length ?? 0) > 0 || (parsed.importantLines?.length ?? 0) > 0)
      : false;

  return (
      <div className="relative h-full flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-3xl font-black">LogForge</h1>
          <Button
              variant="outline"
              onClick={() => handleOpenAi("summary")}
              className="border-4 border-border shadow-[0.25rem_0.25rem_0_var(--border)] font-black uppercase text-xs tracking-widest bg-primary text-primary-foreground hover:translate-x-px hover:translate-y-px hover:shadow-[0.125rem_0.125rem_0_var(--border)] transition-all"
          >
            <Sparkles className="size-4 mr-2" />
            AI Insights
          </Button>
        </div>

        <div className="flex-1 min-h-0">
          <LogViewer
              logId={id}
              text={content}
              jumpSignal={jumpSignal}
              onJumpToCrash={handleJumpToCrash}
              hasCrash={hasCrash}
              parsed={parsed}
              onOpenAi={() => handleOpenAi("chat")}
              annotations={aiAnalysis?.annotations}
          />
        </div>

        {parsed && (
            <div className="absolute bottom-4 right-4 flex gap-2 w-[60rem] max-w-[60rem]">
              <AiPanel
                  isOpen={isAiPanelOpen}
                  onOpenChange={setIsAiPanelOpen}
                  logId={id}
                  data={parsed}
                  aiAnalysis={aiAnalysis}
                  isAnalyzing={isAnalyzing}
                  analysisError={analysisError}
                  toolEvents={toolEvents}
                  onRunAiAnalysis={handleRunAiAnalysis}
                  onJumpToCrash={handleJumpToCrash}
                  onJumpToLine={handleJumpToLine}
                  initialTab={aiPanelTab}
              />
            </div>
        )}
      </div>
  );
}