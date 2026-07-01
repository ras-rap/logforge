"use client";

import * as React from "react";
import { useState, useRef, useEffect, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  Sparkles, MessageSquare, Loader2, Send, ExternalLink,
  Crosshair, AlertTriangle, Info, X, AlertCircle,
  Search, FileText, BarChart2, List, CheckCircle2, ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ParsedLog, AiAnalysis } from "@/lib/parser/types";
import { StreamEvent } from "@/lib/ai/tools";

// -- Types -----------------------------------------------------------------------

interface ChatMessage {
  role: "user" | "ai";
  text: string;
  toolActivities?: ToolActivity[];
}

interface ToolActivity {
  name: string;
  callSummary: string;
  resultSummary?: string;
  status: "pending" | "done";
}

interface AiPanelProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  logId: string;
  data: ParsedLog;
  aiAnalysis: AiAnalysis | null | undefined;
  isAnalyzing: boolean;
  analysisError?: string | null;
  toolEvents?: StreamEvent[];
  onRunAiAnalysis: () => void;
  onJumpToCrash: () => void;
  onJumpToLine?: (line: number) => void;
  initialTab?: "summary" | "chat";
}

// -- Helpers ---------------------------------------------------------------------

function buildToolActivities(events: StreamEvent[]): ToolActivity[] {
  const activities: ToolActivity[] = [];
  for (const event of events) {
    if (event.type === "tool_call") {
      activities.push({ name: event.name, callSummary: event.callSummary, status: "pending" });
    } else if (event.type === "tool_result") {
      const last = activities[activities.length - 1];
      if (last?.status === "pending") {
        last.resultSummary = event.resultSummary;
        last.status = "done";
      }
    }
  }
  return activities;
}

function toolIcon(name: string) {
  switch (name) {
    case "grep_log":      return <Search    className="size-3 shrink-0" />;
    case "get_lines":     return <FileText  className="size-3 shrink-0" />;
    case "get_context":   return <List      className="size-3 shrink-0" />;
    case "get_log_stats": return <BarChart2 className="size-3 shrink-0" />;
    default:              return <Search    className="size-3 shrink-0" />;
  }
}

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

// -- Sub-components --------------------------------------------------------------

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
      <span className={cn("shrink-0 rounded px-1.5 py-0.5 text-[0.625rem] font-black border-2 border-black/20", color)}>
      {value}%
    </span>
  );
}

function ToolActivityLog({
                           activities,
                           isRunning,
                         }: {
  activities: ToolActivity[];
  isRunning: boolean;
}) {
  const [expanded, setExpanded] = useState(true);
  const doneCount = activities.filter(a => a.status === "done").length;

  // Auto-collapse once analysis completes
  useEffect(() => {
    if (!isRunning && activities.length > 0) {
      const t = setTimeout(() => setExpanded(false), 1200);
      return () => clearTimeout(t);
    }
  }, [isRunning, activities.length]);

  if (activities.length === 0) return null;

  return (
      <div className="rounded-xl border-2 border-border bg-zinc-900/60 overflow-hidden">
        <button
            onClick={() => setExpanded(e => !e)}
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold text-zinc-400 hover:text-zinc-200 transition-colors"
        >
        <span className="flex items-center gap-2">
          {isRunning
              ? <Loader2 className="size-3 text-primary animate-spin" />
              : <CheckCircle2 className="size-3 text-green-500" />
          }
          <span className="text-primary font-black">Investigation</span>
          <span className="text-zinc-600">
            {isRunning ? `${doneCount}/${activities.length} searches…` : `${activities.length} search${activities.length === 1 ? "" : "es"}`}
          </span>
        </span>
          <ChevronDown className={cn("size-3.5 transition-transform duration-200", expanded && "rotate-180")} />
        </button>

        {expanded && (
            <div className="border-t border-border/40 px-3 py-2 space-y-1.5">
              {activities.map((activity, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    <div className="shrink-0 mt-0.5 text-zinc-500">
                      {activity.status === "pending"
                          ? <Loader2 className="size-3 text-primary animate-spin" />
                          : <CheckCircle2 className="size-3 text-green-500" />
                      }
                    </div>
                    <div className="min-w-0 flex items-center gap-1 flex-wrap">
                      <span className="text-zinc-500">{toolIcon(activity.name)}</span>
                      <span className="text-zinc-300">{activity.callSummary}</span>
                      {activity.resultSummary && (
                          <span className="text-zinc-600">→ {activity.resultSummary}</span>
                      )}
                    </div>
                  </div>
              ))}
            </div>
        )}
      </div>
  );
}

function InlineChatToolActivity({ activities }: { activities: ToolActivity[] }) {
  if (activities.length === 0) return null;
  return (
      <div className="flex justify-start">
        <div className="bg-zinc-900/80 border-2 border-border/50 rounded-2xl rounded-tl-none px-3 py-2 space-y-1 max-w-[85%]">
          {activities.map((activity, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-zinc-400">
                {activity.status === "pending"
                    ? <Loader2 className="size-3 text-primary animate-spin shrink-0" />
                    : <CheckCircle2 className="size-3 text-green-500 shrink-0" />
                }
                <span className="text-zinc-500">{toolIcon(activity.name)}</span>
                <span>{activity.callSummary}</span>
                {activity.resultSummary && (
                    <span className="text-zinc-600">→ {activity.resultSummary}</span>
                )}
              </div>
          ))}
        </div>
      </div>
  );
}

// -- Main component --------------------------------------------------------------

export default function AiPanel({
                                  isOpen, onOpenChange, logId, data,
                                  aiAnalysis, isAnalyzing, analysisError, toolEvents = [],
                                  onRunAiAnalysis, onJumpToCrash, onJumpToLine,
                                  initialTab = "summary",
                                }: AiPanelProps) {
  const [activeTab, setActiveTab] = useState<"summary" | "chat">(initialTab);
  useEffect(() => { if (isOpen) setActiveTab(initialTab); }, [isOpen, initialTab]);

  // Chat state
  const [chatQuestion,    setChatQuestion]    = useState("");
  const [chatMessages,    setChatMessages]    = useState<ChatMessage[]>([]);
  const [chatToolEvents,  setChatToolEvents]  = useState<StreamEvent[]>([]);
  const [isAsking,        setIsAsking]        = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isAsking, chatToolEvents]);

  const handleAsk = async () => {
    if (!chatQuestion.trim() || isAsking) return;
    const q = chatQuestion;
    setChatQuestion("");
    setChatMessages(prev => [...prev, { role: "user", text: q }]);
    setChatToolEvents([]);
    setIsAsking(true);

    try {
      const res = await fetch("/api/analyze", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ id: logId, type: "chat", question: q }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);

      // Accumulate live tool events so InlineChatToolActivity re-renders
      const liveEvents: StreamEvent[] = [];

      await readSSE(res, (event) => {
        if (event.type === "tool_call" || event.type === "tool_result") {
          liveEvents.push(event);
          setChatToolEvents([...liveEvents]);
        } else if (event.type === "answer") {
          const activities = buildToolActivities(liveEvents);
          setChatMessages(prev => [
            ...prev,
            { role: "ai", text: event.text, toolActivities: activities.length ? activities : undefined },
          ]);
          setChatToolEvents([]);
        } else if (event.type === "error") {
          setChatMessages(prev => [...prev, { role: "ai", text: `Error: ${event.message}` }]);
          setChatToolEvents([]);
        }
      });
    } catch (e: unknown) {
      setChatMessages(prev => [...prev, { role: "ai", text: `Something went wrong: ${e instanceof Error ? e.message : String(e)}` }]);
      setChatToolEvents([]);
    } finally {
      setIsAsking(false);
    }
  };

  const hasErrors       = !!data.errors?.length;
  const isPluginPlatform = data.platform === "plugin";
  const suspectLabel    = isPluginPlatform ? "Suspected Plugins" : "Suspected Mods";
  const suspectEmpty    = isPluginPlatform
      ? "No specific plugins flagged by the parser"
      : "No specific mods flagged by the parser";

  const analysisActivities = useMemo(() => buildToolActivities(toolEvents), [toolEvents]);

  return (
      <Sheet open={isOpen} onOpenChange={onOpenChange}>
        <SheetContent
            side="right"
            className="w-full sm:!max-w-[60rem] sm:h-[calc(100dvh-2rem)] sm:top-4 sm:right-4 sm:bottom-4 p-0 border-l-4 sm:border-4 border-border shadow-none sm:shadow-[0.5rem_0.5rem_0_0_var(--border)] flex flex-col bg-card sm:rounded-2xl transition-all duration-300"
            showCloseButton={false}
        >
          {/* Header */}
          <SheetHeader className="p-4 border-b-4 border-border bg-zinc-950 shrink-0 sm:rounded-t-xl">
            <div className="flex items-center justify-between mb-2">
              <SheetTitle className="text-xl font-black flex items-center gap-2 text-white">
                <Sparkles className="size-5 text-primary fill-primary/20" />
                AI Insights
              </SheetTitle>
              <Button variant="ghost" size="icon-sm" onClick={() => onOpenChange(false)}
                      className="text-zinc-500 hover:text-white hover:bg-white/10">
                <X className="size-5" />
              </Button>
            </div>
            <div className="flex gap-1 bg-zinc-900 p-1 rounded-lg border-2 border-zinc-800">
              {(["summary", "chat"] as const).map(tab => (
                  <button key={tab} onClick={() => setActiveTab(tab)}
                          className={cn(
                              "flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-bold rounded-md transition-all",
                              activeTab === tab
                                  ? "bg-primary text-primary-foreground shadow-[0.125rem_0.125rem_0_var(--border)] translate-x-[-1px] translate-y-[-1px]"
                                  : "text-zinc-500 hover:text-zinc-300",
                          )}
                  >
                    {tab === "summary" ? <Info className="size-3.5" /> : <MessageSquare className="size-3.5" />}
                    {tab === "summary" ? "Summary" : "Assistant"}
                  </button>
              ))}
            </div>
          </SheetHeader>

          <div className="flex-1 min-h-0 relative">
            <ScrollArea className="h-full">
              <div className="p-4 space-y-4 pb-20">

                {/* ---- SUMMARY TAB ---- */}
                {activeTab === "summary" && (
                    <>
                      {/* Metadata card */}
                      <div className="grid grid-cols-2 gap-4 bg-zinc-900/50 p-4 rounded-xl border-2 border-border shadow-[0.25rem_0.25rem_0_var(--border)]">
                        <MiniInfo label="Loader"  value={<span className="text-primary uppercase">{data.loader}</span>} />
                        <MiniInfo label="Version" value={data.minecraftVersion ?? "Unknown"} />
                        <MiniInfo label="Java"    value={data.javaVersion ?? "Unknown"} />
                        {data.crashCause && (
                            <div className="col-span-2 pt-2 border-t border-zinc-800">
                              <MiniInfo label="Crash Cause"
                                        value={<span className="text-destructive font-mono text-xs leading-relaxed break-all">{data.crashCause}</span>} />
                            </div>
                        )}
                      </div>

                      {/* Jump to crash */}
                      <Button onClick={onJumpToCrash} disabled={!hasErrors}
                              className="w-full h-10 border-2 border-border bg-red-500 text-white font-black shadow-[0.25rem_0.25rem_0_var(--border)] hover:translate-x-px hover:translate-y-px hover:shadow-[0.125rem_0.125rem_0_var(--border)] transition-all">
                        <Crosshair className="size-4 mr-2" /> JUMP TO CRASH
                      </Button>

                      <Separator className="h-1 bg-border rounded-full" />

                      {/* Tool activity log (analysis) */}
                      <ToolActivityLog activities={analysisActivities} isRunning={isAnalyzing} />

                      {/* AI content area */}
                      {analysisError ? (
                          /* Error state */
                          <div className="space-y-4 text-center py-6">
                            <div className="bg-destructive/10 rounded-full size-16 flex items-center justify-center mx-auto border-4 border-destructive/30">
                              <AlertCircle className="size-8 text-destructive" />
                            </div>
                            <div className="space-y-2">
                              <h3 className="font-black text-lg">Analysis Failed</h3>
                              <p className="text-xs text-muted-foreground font-mono bg-black/30 rounded-lg p-3 text-left break-all border border-border">
                                {analysisError}
                              </p>
                            </div>
                            <Button onClick={onRunAiAnalysis}
                                    className="w-full h-10 border-2 border-border bg-primary text-primary-foreground font-black shadow-[0.25rem_0.25rem_0_var(--border)] hover:translate-x-px hover:translate-y-px hover:shadow-[0.125rem_0.125rem_0_var(--border)] transition-all">
                              <Sparkles className="size-4 mr-2" /> Try Again
                            </Button>
                          </div>

                      ) : !aiAnalysis ? (
                          /* CTA state */
                          <div className="space-y-4 text-center py-6">
                            <div className="bg-primary/10 rounded-full size-16 flex items-center justify-center mx-auto border-4 border-primary shadow-[0.25rem_0.25rem_0_rgba(var(--primary-rgb),0.2)]">
                              <Sparkles className="size-8 text-primary" />
                            </div>
                            <div className="space-y-2">
                              <h3 className="font-black text-lg">Need a deeper look?</h3>
                              <p className="text-sm text-muted-foreground px-6">
                                Our AI searches the full log, not just the tail — it can pinpoint the root cause even in large files.
                              </p>
                            </div>
                            <Button onClick={onRunAiAnalysis} disabled={isAnalyzing}
                                    className="w-full h-12 border-4 border-border bg-primary text-primary-foreground font-black text-base shadow-[0.375rem_0.375rem_0_var(--border)] hover:translate-x-px hover:translate-y-px hover:shadow-[0.25rem_0.25rem_0_var(--border)] transition-all disabled:opacity-50">
                              {isAnalyzing ? (
                                  <><Loader2 className="size-5 mr-2 animate-spin" /> ANALYZING LOG…</>
                              ) : (
                                  <><Sparkles className="size-5 mr-2" /> ANALYZE WITH AI</>
                              )}
                            </Button>
                          </div>

                      ) : (
                          /* Analysis content */
                          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                            <div className="space-y-3">
                              <h3 className="font-black text-xs uppercase tracking-[0.2em] text-primary flex items-center gap-2">
                                <Sparkles className="size-4" /> The Explanation
                              </h3>
                              <div className="bg-primary/5 border-2 border-primary/20 rounded-xl p-4 leading-relaxed text-sm break-words markdown-content">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{aiAnalysis.explanation}</ReactMarkdown>
                              </div>
                            </div>

                            {aiAnalysis.steps?.length > 0 && (
                                <div className="space-y-3">
                                  <h3 className="font-black text-xs uppercase tracking-[0.2em] text-primary flex items-center gap-2">
                                    <AlertTriangle className="size-4" /> Fix Steps
                                  </h3>
                                  <div className="space-y-3">
                                    {aiAnalysis.steps.map((step, i) => (
                                        <div key={i} className="flex gap-3 group">
                                          <div className="shrink-0 size-6 rounded-lg border-2 border-primary bg-primary/10 flex items-center justify-center text-[0.625rem] font-black text-primary shadow-[0.125rem_0.125rem_0_var(--border)] group-hover:scale-110 transition-transform">
                                            {i + 1}
                                          </div>
                                          <div className="text-sm leading-relaxed pt-0.5 break-words markdown-content">
                                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{step}</ReactMarkdown>
                                          </div>
                                        </div>
                                    ))}
                                  </div>
                                </div>
                            )}

                            {aiAnalysis.links?.length > 0 && (
                                <div className="space-y-3">
                                  <h3 className="font-black text-xs uppercase tracking-[0.2em] text-primary">Helpful Links</h3>
                                  <div className="grid gap-2">
                                    {aiAnalysis.links.map((link, i) => (
                                        <a key={i} href={link.url} target="_blank" rel="noopener noreferrer"
                                           className="flex items-center justify-between p-3 rounded-xl border-2 border-border bg-zinc-900 hover:bg-zinc-800 transition-colors group">
                                          <span className="text-xs font-bold break-words pr-4">{link.title}</span>
                                          <ExternalLink className="size-3.5 text-zinc-500 group-hover:text-primary transition-colors" />
                                        </a>
                                    ))}
                                  </div>
                                </div>
                            )}

                            {aiAnalysis.annotations?.length > 0 && (
                                <div className="space-y-3">
                                  <h3 className="font-black text-xs uppercase tracking-[0.2em] text-primary flex items-center gap-2">
                                    <MessageSquare className="size-4" /> Annotated Lines
                                  </h3>
                                  <div className="space-y-2">
                                    {aiAnalysis.annotations.map((ann, i) => (
                                        <div key={i}
                                             className="flex items-start gap-3 p-3 rounded-xl border-2 border-border bg-zinc-900/50 cursor-pointer hover:bg-zinc-800/50 transition-colors"
                                             onClick={() => onJumpToLine?.(ann.line)}>
                                          <Button size="icon-sm"
                                                  className="shrink-0 size-7 rounded-lg border-2 border-primary bg-primary/10 text-primary font-mono text-xs font-black shadow-[0.125rem_0.125rem_0_var(--border)] hover:translate-x-px hover:translate-y-px hover:shadow-none transition-all">
                                            {ann.line}
                                          </Button>
                                          <p className="text-xs leading-relaxed break-words text-zinc-200 pt-0.5">{ann.comment}</p>
                                        </div>
                                    ))}
                                  </div>
                                </div>
                            )}
                          </div>
                      )}

                      <Separator className="h-0.5 bg-border/50" />

                      {/* Suspect mods/plugins */}
                      <div className="space-y-4">
                        <h3 className="font-black text-sm flex items-center gap-2">
                          <AlertTriangle className="size-4 text-destructive" /> {suspectLabel}
                        </h3>
                        <div className="space-y-3">
                          {data.suspectMods.length > 0 ? (
                              data.suspectMods.map((mod, i) => (
                                  <div key={i} className="p-4 rounded-xl border-2 border-border bg-destructive/5 space-y-2">
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="font-black text-sm text-destructive uppercase tracking-tight break-words">{mod.name}</span>
                                      <ConfidenceBadge value={mod.confidence} />
                                    </div>
                                    <p className="text-xs text-muted-foreground leading-relaxed italic break-words">{'\u201C'}{mod.reason}{'\u201D'}</p>
                                  </div>
                              ))
                          ) : (
                              <p className="text-sm text-muted-foreground italic text-center py-4 bg-zinc-900/30 rounded-lg border border-dashed border-border">
                                {suspectEmpty}
                              </p>
                          )}
                        </div>
                      </div>
                    </>
                )}

                {/* ---- CHAT TAB ---- */}
                {activeTab === "chat" && (
                    <div className="space-y-4 pb-4">
                      <div className="bg-zinc-900 border-2 border-border rounded-xl p-4 text-xs text-zinc-400 leading-relaxed italic flex gap-3">
                        <Info className="size-4 shrink-0 text-primary" />
                        Ask me anything about this log. I can search for specific errors, explain lines, and help you troubleshoot.
                      </div>

                      {chatMessages.map((msg, i) => (
                          <React.Fragment key={i}>
                            {/* Tool activities attached to this AI message */}
                            {msg.role === "ai" && msg.toolActivities && (
                                <div className="flex justify-start">
                                  <div className="bg-zinc-900/60 border border-border/40 rounded-xl px-3 py-2 space-y-1 max-w-[85%]">
                                    <p className="text-[0.625rem] uppercase font-black text-zinc-600 tracking-widest mb-1 flex items-center gap-1">
                                      <Search className="size-2.5" /> Searched {msg.toolActivities.length} time{msg.toolActivities.length === 1 ? "" : "s"}
                                    </p>
                                    {msg.toolActivities.map((a, j) => (
                                        <div key={j} className="flex items-center gap-2 text-xs text-zinc-500">
                                          <CheckCircle2 className="size-3 text-green-500 shrink-0" />
                                          {toolIcon(a.name)}
                                          <span>{a.callSummary}</span>
                                          {a.resultSummary && <span className="text-zinc-600">→ {a.resultSummary}</span>}
                                        </div>
                                    ))}
                                  </div>
                                </div>
                            )}
                            <div className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
                              <div className={cn(
                                  "max-w-[85%] px-4 py-2.5 rounded-2xl text-sm shadow-sm break-words markdown-content",
                                  msg.role === "user"
                                      ? "bg-primary text-primary-foreground font-medium rounded-tr-none border-2 border-primary"
                                      : "bg-zinc-800 text-zinc-200 border-2 border-border rounded-tl-none",
                              )}>
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.text}</ReactMarkdown>
                              </div>
                            </div>
                          </React.Fragment>
                      ))}

                      {/* Live tool activity while asking */}
                      {isAsking && <InlineChatToolActivity activities={buildToolActivities(chatToolEvents)} />}

                      {/* Spinner when waiting with no tool calls yet */}
                      {isAsking && chatToolEvents.length === 0 && (
                          <div className="flex justify-start">
                            <div className="bg-zinc-800 text-zinc-300 border-2 border-border rounded-2xl rounded-tl-none px-4 py-2.5 text-sm flex items-center gap-2 shadow-sm">
                              <Loader2 className="size-3.5 animate-spin text-primary" />
                              <span className="italic font-medium">Searching log…</span>
                            </div>
                          </div>
                      )}

                      <div ref={chatEndRef} />
                    </div>
                )}
              </div>
            </ScrollArea>

            {/* Chat input */}
            {activeTab === "chat" && (
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-card border-t-4 border-border shrink-0 sm:rounded-b-xl">
                  <div className="flex gap-2">
                    <input
                        value={chatQuestion}
                        onChange={e => setChatQuestion(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") handleAsk(); }}
                        placeholder="Ask a question…"
                        className="flex-1 bg-zinc-900 border-2 border-border rounded-xl px-4 py-2 text-sm text-zinc-200 outline-none focus:border-primary transition-all shadow-inner"
                    />
                    <Button size="icon" onClick={handleAsk} disabled={isAsking || !chatQuestion.trim()}
                            className="size-10 rounded-xl border-2 border-border bg-primary text-primary-foreground shadow-[0.125rem_0.125rem_0_var(--border)] hover:translate-x-[0.0625rem] hover:translate-y-[0.0625rem] hover:shadow-none transition-all">
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