"use client";

import { useState, useCallback } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "./ui/button";
import LogViewer, { JumpSignal } from "./log-viewer";
import AiPanel from "./ai-panel";
import { ParsedLog, AiAnalysis } from "@/lib/parser/types";

interface LogViewContainerProps {
  id: string;
  content: string;
  parsed: ParsedLog | null;
  initialAiAnalysis?: AiAnalysis;
}

export default function LogViewContainer({ id, content, parsed, initialAiAnalysis }: LogViewContainerProps) {
  const [jumpSignal, setJumpSignal] = useState<JumpSignal | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<AiAnalysis | undefined>(initialAiAnalysis);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isAiPanelOpen, setIsAiPanelOpen] = useState(false);
  const [aiPanelTab, setAiPanelTab] = useState<"summary" | "chat">("summary");

  const handleOpenAi = useCallback((tab: "summary" | "chat" = "summary") => {
    setAiPanelTab(tab);
    setIsAiPanelOpen(true);
  }, []);

  const handleJumpToCrash = useCallback(() => {
    if (!parsed) return;
    const crashLine = parsed.errors?.[0]?.line ?? parsed.importantLines?.[0];
    if (crashLine) {
      setJumpSignal({ line: crashLine, nonce: Math.random() });
    }
  }, [parsed]);

  const handleJumpToLine = useCallback((line: number) => {
    setJumpSignal({ line, nonce: Math.random() });
  }, []);

  const handleRunAiAnalysis = useCallback(async () => {
    setIsAnalyzing(true);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (data.analysis) {
        setAiAnalysis(data.analysis);
      }
    } catch (e) {
      console.error("Analysis failed", e);
    } finally {
      setIsAnalyzing(false);
    }
  }, [id]);

  const hasCrash = parsed ? ((parsed.errors?.length ?? 0) > 0 || (parsed.importantLines?.length ?? 0) > 0) : false;

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
