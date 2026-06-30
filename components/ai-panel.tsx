"use client";

import * as React from "react";
import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetDescription 
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { 
  Sparkles, 
  MessageSquare, 
  Loader2, 
  Send, 
  ExternalLink, 
  Crosshair,
  AlertTriangle,
  Info,
  ChevronRight,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ParsedLog, SuspectMod, AiAnnotation, AiAnalysis } from "@/lib/parser/types";

interface ChatMessage {
  role: "user" | "ai";
  text: string;
}

interface AiPanelProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  logId: string;
  data: ParsedLog;
  aiAnalysis: AiAnalysis | null | undefined;
  isAnalyzing: boolean;
  onRunAiAnalysis: () => void;
  onJumpToCrash: () => void;
  onJumpToLine?: (line: number) => void;
  initialTab?: "summary" | "chat";
}

function MiniInfo({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-[0.625rem] uppercase font-black text-muted-foreground tracking-widest">{label}</p>
      <div className="font-bold text-sm leading-tight break-words">{value}</div>
    </div>
  );
}

function ConfidenceBadge({ value }: { value: number }) {
  const color =
    value >= 75 ? "bg-red-500 text-white" :
      value >= 40 ? "bg-amber-400 text-black" :
        "bg-zinc-700 text-zinc-300";
  return (
    <span className={cn(
      "shrink-0 rounded px-1.5 py-0.5 text-[0.625rem] font-black border-2 border-black/20",
      color
    )}>
      {value}%
    </span>
  );
}

export default function AiPanel({
  isOpen,
  onOpenChange,
  logId,
  data,
  aiAnalysis,
  isAnalyzing,
  onRunAiAnalysis,
  onJumpToCrash,
  onJumpToLine,
  initialTab = "summary",
}: AiPanelProps) {
  const [activeTab, setActiveTab] = useState<"summary" | "chat">(initialTab);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);
  const [chatQuestion, setChatQuestion] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isAsking, setIsAsking] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, isAsking]);

  const handleAsk = async () => {
    if (!chatQuestion.trim() || isAsking) return;
    const q = chatQuestion;
    setChatQuestion("");
    setChatMessages(prev => [...prev, { role: "user", text: q }]);
    setIsAsking(true);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        body: JSON.stringify({ id: logId, type: "chat", question: q }),
      });
      const resData = await res.json();
      if (resData.answer) {
        setChatMessages(prev => [...prev, { role: "ai", text: resData.answer }]);
      }
    } catch {
      setChatMessages(prev => [...prev, { role: "ai", text: "Sorry, I couldn't answer that." }]);
    } finally {
      setIsAsking(false);
    }
  };

  const hasErrors = !!data.errors?.length;

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent 
        side="right" 
        className="w-full sm:!max-w-[60rem] sm:h-[calc(100dvh-2rem)] sm:top-4 sm:right-4 sm:bottom-4 p-0 border-l-4 sm:border-4 border-border shadow-none sm:shadow-[0.5rem_0.5rem_0_0_var(--border)] flex flex-col bg-card sm:rounded-2xl transition-all duration-300" 
        showCloseButton={false}
      >
        <SheetHeader className="p-4 border-b-4 border-border bg-zinc-950 shrink-0 sm:rounded-t-xl">
          <div className="flex items-center justify-between mb-2">
            <SheetTitle className="text-xl font-black flex items-center gap-2 text-white">
              <Sparkles className="size-5 text-primary fill-primary/20" />
              AI Insights
            </SheetTitle>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onOpenChange(false)}
              className="text-zinc-500 hover:text-white hover:bg-white/10"
            >
              <X className="size-5" />
            </Button>
          </div>
          <div className="flex gap-1 bg-zinc-900 p-1 rounded-lg border-2 border-zinc-800">
            <button
              onClick={() => setActiveTab("summary")}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-bold rounded-md transition-all",
                activeTab === "summary" 
                  ? "bg-primary text-primary-foreground shadow-[0.125rem_0.125rem_0_var(--border)] translate-x-[-1px] translate-y-[-1px]" 
                  : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              <Info className="size-3.5" />
              Summary
            </button>
            <button
              onClick={() => setActiveTab("chat")}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-bold rounded-md transition-all",
                activeTab === "chat" 
                  ? "bg-primary text-primary-foreground shadow-[0.125rem_0.125rem_0_var(--border)] translate-x-[-1px] translate-y-[-1px]" 
                  : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              <MessageSquare className="size-3.5" />
              Assistant
            </button>
          </div>
        </SheetHeader>

        <div className="flex-1 min-h-0 relative">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-6 pb-20">
              {activeTab === "summary" ? (
                <>
                  {/* Basic Metadata */}
                  <div className="grid grid-cols-2 gap-4 bg-zinc-900/50 p-4 rounded-xl border-2 border-border shadow-[0.25rem_0.25rem_0_var(--border)]">
                    <MiniInfo label="Loader" value={<span className="text-primary uppercase">{data.loader}</span>} />
                    <MiniInfo label="Version" value={data.minecraftVersion ?? "Unknown"} />
                    <MiniInfo label="Java" value={data.javaVersion ?? "Unknown"} />
                    {data.crashCause && (
                      <div className="col-span-2 pt-2 border-t border-zinc-800">
                        <MiniInfo 
                          label="Crash Cause" 
                          value={<span className="text-destructive font-mono text-xs leading-relaxed break-all">{data.crashCause}</span>} 
                        />
                      </div>
                    )}
                  </div>

                  {onJumpToCrash && (
                    <Button
                      onClick={onJumpToCrash}
                      disabled={!hasErrors}
                      className="w-full h-10 border-2 border-border bg-red-500 text-white font-black shadow-[0.25rem_0.25rem_0_var(--border)] hover:translate-x-px hover:translate-y-px hover:shadow-[0.125rem_0.125rem_0_var(--border)] transition-all"
                    >
                      <Crosshair className="size-4 mr-2" />
                      JUMP TO CRASH
                    </Button>
                  )}

                  <Separator className="h-1 bg-border rounded-full" />

                  {/* AI Content */}
                  {!aiAnalysis ? (
                    <div className="space-y-4 text-center py-6">
                      <div className="bg-primary/10 rounded-full size-16 flex items-center justify-center mx-auto border-4 border-primary shadow-[0.25rem_0.25rem_0_rgba(var(--primary-rgb),0.2)]">
                        <Sparkles className="size-8 text-primary" />
                      </div>
                      <div className="space-y-2">
                        <h3 className="font-black text-lg">Need a deeper look?</h3>
                        <p className="text-sm text-muted-foreground px-6">Our AI can analyze the full log to explain the crash and give you step-by-step fix instructions.</p>
                      </div>
                      <Button
                        onClick={onRunAiAnalysis}
                        disabled={isAnalyzing}
                        className="w-full h-12 border-4 border-border bg-primary text-primary-foreground font-black text-base shadow-[0.375rem_0.375rem_0_var(--border)] hover:translate-x-px hover:translate-y-px hover:shadow-[0.25rem_0.25rem_0_var(--border)] transition-all disabled:opacity-50"
                      >
                        {isAnalyzing ? (
                          <>
                            <Loader2 className="size-5 mr-2 animate-spin" />
                            ANALYZING LOG...
                          </>
                        ) : (
                          <>
                            <Sparkles className="size-5 mr-2" />
                            ANALYZE WITH AI
                          </>
                        )}
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                      {/* Explanation */}
                      <div className="space-y-3">
                        <h3 className="font-black text-xs uppercase tracking-[0.2em] text-primary flex items-center gap-2">
                          <Sparkles className="size-4" />
                          The Explanation
                        </h3>
                        <div className="bg-primary/5 border-2 border-primary/20 rounded-xl p-4 leading-relaxed text-sm break-words markdown-content">
                          <ReactMarkdown>{aiAnalysis.explanation}</ReactMarkdown>
                        </div>
                      </div>

                      {/* Fix Steps */}
                      {aiAnalysis.steps?.length > 0 && (
                        <div className="space-y-3">
                          <h3 className="font-black text-xs uppercase tracking-[0.2em] text-primary flex items-center gap-2">
                            <AlertTriangle className="size-4" />
                            Fix Steps
                          </h3>
                          <div className="space-y-3">
                            {aiAnalysis.steps.map((step, i) => (
                              <div key={i} className="flex gap-3 group">
                                <div className="shrink-0 size-6 rounded-lg border-2 border-primary bg-primary/10 flex items-center justify-center text-[0.625rem] font-black text-primary shadow-[0.125rem_0.125rem_0_var(--border)] group-hover:scale-110 transition-transform">
                                  {i + 1}
                                </div>
                                <div className="text-sm leading-relaxed pt-0.5 break-words markdown-content">
                                  <ReactMarkdown>{step}</ReactMarkdown>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Links */}
                      {aiAnalysis.links?.length > 0 && (
                        <div className="space-y-3">
                          <h3 className="font-black text-xs uppercase tracking-[0.2em] text-primary">Helpful Links</h3>
                          <div className="grid gap-2">
                            {aiAnalysis.links.map((link, i) => (
                              <a
                                key={i}
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-between p-3 rounded-xl border-2 border-border bg-zinc-900 hover:bg-zinc-800 transition-colors group"
                              >
                                <span className="text-xs font-bold break-words pr-4">{link.title}</span>
                                <ExternalLink className="size-3.5 text-zinc-500 group-hover:text-primary transition-colors" />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Annotated Lines */}
                      {aiAnalysis.annotations?.length > 0 && (
                        <div className="space-y-3">
                          <h3 className="font-black text-xs uppercase tracking-[0.2em] text-primary flex items-center gap-2">
                            <MessageSquare className="size-4" />
                            Annotated Lines
                          </h3>
                          <div className="space-y-2">
                            {aiAnalysis.annotations.map((ann, i) => (
                              <div
                                key={i}
                                className="flex items-start gap-3 p-3 rounded-xl border-2 border-border bg-zinc-900/50 group cursor-pointer hover:bg-zinc-800/50 transition-colors"
                                onClick={() => onJumpToLine?.(ann.line)}
                              >
                                <Button
                                  size="icon-sm"
                                  className="shrink-0 size-7 rounded-lg border-2 border-primary bg-primary/10 text-primary font-mono text-xs font-black shadow-[0.125rem_0.125rem_0_var(--border)] hover:translate-x-px hover:translate-y-px hover:shadow-none transition-all"
                                >
                                  {ann.line}
                                </Button>
                                <div className="min-w-0 flex-1 pt-0.5">
                                  <p className="text-xs leading-relaxed break-words text-zinc-200">
                                    {ann.comment}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <Separator className="h-0.5 bg-border/50" />

                  {/* Suspected Mods */}
                  <div className="space-y-4">
                    <h3 className="font-black text-sm flex items-center gap-2">
                      <AlertTriangle className="size-4 text-destructive" />
                      Suspected Mods
                    </h3>
                    <div className="space-y-3">
                      {data.suspectMods.length > 0 ? (
                        data.suspectMods.map((mod, i) => (
                          <div key={i} className="p-4 rounded-xl border-2 border-border bg-destructive/5 space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-black text-sm text-destructive uppercase tracking-tight break-words">
                                {mod.name}
                              </span>
                              <ConfidenceBadge value={mod.confidence} />
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed italic break-words">
                              "{mod.reason}"
                            </p>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground italic text-center py-4 bg-zinc-900/30 rounded-lg border border-dashed border-border">
                          No specific mods flagged by the parser
                        </p>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                /* Chat Interface */
                <div className="flex flex-col h-full min-h-[25rem]">
                  <div className="space-y-4 pb-4">
                    <div className="bg-zinc-900 border-2 border-border rounded-xl p-4 text-xs text-zinc-400 leading-relaxed italic flex gap-3">
                      <Info className="size-4 shrink-0 text-primary" />
                      Ask me anything about this log! I can explain specific lines, investigate mod versions, or help you troubleshoot further.
                    </div>
                    {chatMessages.map((msg, i) => (
                      <div key={i} className={cn(
                        "flex",
                        msg.role === "user" ? "justify-end" : "justify-start"
                      )}>
                        <div className={cn(
                          "max-w-[85%] px-4 py-2.5 rounded-2xl text-sm shadow-sm break-words markdown-content",
                          msg.role === "user" 
                            ? "bg-primary text-primary-foreground font-medium rounded-tr-none border-2 border-primary" 
                            : "bg-zinc-800 text-zinc-200 border-2 border-border rounded-tl-none"
                        )}>
                          <ReactMarkdown>{msg.text}</ReactMarkdown>
                        </div>
                      </div>
                    ))}
                    {isAsking && (
                      <div className="flex justify-start">
                        <div className="bg-zinc-800 text-zinc-300 border-2 border-border rounded-2xl rounded-tl-none px-4 py-2.5 text-sm flex items-center gap-2 shadow-sm">
                          <Loader2 className="size-3.5 animate-spin text-primary" />
                          <span className="italic font-medium">Assistant is thinking...</span>
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Chat Input - sticky at bottom */}
          {activeTab === "chat" && (
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-card border-t-4 border-border shrink-0 sm:rounded-b-xl">
              <div className="flex gap-2">
                <input
                  value={chatQuestion}
                  onChange={e => setChatQuestion(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") handleAsk(); }}
                  placeholder="Ask a question..."
                  className="flex-1 bg-zinc-900 border-2 border-border rounded-xl px-4 py-2 text-sm text-zinc-200 outline-none focus:border-primary transition-all shadow-inner"
                />
                <Button 
                  size="icon" 
                  onClick={handleAsk} 
                  disabled={isAsking || !chatQuestion.trim()}
                  className="size-10 rounded-xl border-2 border-border bg-primary text-primary-foreground shadow-[0.125rem_0.125rem_0_var(--border)] hover:translate-x-[0.0625rem] hover:translate-y-[0.0625rem] hover:shadow-none transition-all"
                >
                  <Send className="size-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
