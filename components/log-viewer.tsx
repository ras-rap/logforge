"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Search, X, ChevronUp, ChevronDown, Crosshair, Sparkles, AlertCircle, Info } from "lucide-react";
import { ParsedLog, AiAnnotation } from "@/lib/parser/types";

type Level = "error" | "warn" | "debug" | "info" | "normal";
type FilterLevel = "all" | "error" | "warn" | "info" | "debug";

function getLevel(line: string): Level {
  const lower = line.toLowerCase();
  if (lower.includes("error") || lower.includes("exception") || lower.includes("crash") || lower.includes("fatal"))
    return "error";
  if (lower.includes("warn")) return "warn";
  if (lower.includes("debug")) return "debug";
  if (lower.includes("info")) return "info";
  return "normal";
}

const colorMap: Record<Level, string> = {
  error: "text-red-400",
  warn: "text-amber-300",
  debug: "text-purple-400",
  info: "text-blue-300",
  normal: "text-zinc-300",
};

const filterChips: { key: FilterLevel; label: string; activeClass: string }[] = [
  { key: "all",   label: "All",      activeClass: "bg-primary text-primary-foreground hover:bg-primary/90" },
  { key: "error", label: "Errors",   activeClass: "bg-red-500 text-white hover:bg-red-600" },
  { key: "warn",  label: "Warnings", activeClass: "bg-amber-400 text-black hover:bg-amber-500" },
  { key: "info",  label: "Info",     activeClass: "bg-blue-500 text-white hover:bg-blue-600" },
  { key: "debug", label: "Debug",    activeClass: "bg-purple-500 text-white hover:bg-purple-600" },
];

export interface JumpSignal {
  line: number;
  nonce: number;
}

interface LogViewerProps {
  logId: string;
  text: string;
  jumpSignal?: JumpSignal | null;
  onJumpToCrash?: () => void;
  onOpenAi?: () => void;
  hasCrash?: boolean;
  parsed?: ParsedLog | null;
  annotations?: AiAnnotation[];
}

function highlightMatch(text: string, query: string, isCurrent: boolean) {
  if (!query) return text;
  const lower = text.toLowerCase();
  const q = query.toLowerCase();
  const parts: React.ReactNode[] = [];
  let i = 0;
  let key = 0;
  while (i < text.length) {
    const idx = lower.indexOf(q, i);
    if (idx === -1) { parts.push(text.slice(i)); break; }
    if (idx > i) parts.push(text.slice(i, idx));
    parts.push(
      <mark
        key={key++}
        className={isCurrent
          ? "bg-primary text-primary-foreground rounded-[0.125rem]"
          : "bg-primary/25 text-primary-foreground/80 rounded-[0.125rem]"}
      >
        {text.slice(idx, idx + q.length)}
      </mark>
    );
    i = idx + q.length;
  }
  return parts;
}

export default function LogViewer({ logId, text, jumpSignal, onJumpToCrash, onOpenAi, hasCrash, parsed, annotations }: LogViewerProps) {
  const lines = useMemo(() => text.split("\n"), [text]);
  const levels = useMemo(() => lines.map(getLevel), [lines]);

  const errorMap = useMemo(() => {
    const map = new Map<number, string>();
    parsed?.errors.forEach(e => map.set(e.line, e.text));
    return map;
  }, [parsed]);

  const importantSet = useMemo(() => new Set(parsed?.importantLines ?? []), [parsed]);

  const aiAnnotationMap = useMemo(() => {
    const map = new Map<number, string>();
    annotations?.forEach(a => map.set(a.line, a.comment));
    return map;
  }, [annotations]);

  const [filter, setFilter] = useState<FilterLevel>("all");
  const [query, setQuery] = useState("");
  const [matchCursor, setMatchCursor] = useState(0);
  const [pendingScroll, setPendingScroll] = useState<number | null>(null);
  const didInitialScroll = useRef(false);

  const lineRefs = useRef<(HTMLDivElement | null)[]>([]);

  const matchIndices = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return lines.reduce<number[]>((acc, line, i) => {
      if (line.toLowerCase().includes(q)) acc.push(i);
      return acc;
    }, []);
  }, [lines, query]);

  const matchSet = useMemo(() => new Set(matchIndices), [matchIndices]);

  const visibleIndices = useMemo(() => {
    if (filter === "all") return lines.map((_, i) => i);
    return lines.reduce<number[]>((acc, _, i) => {
      if (levels[i] === filter) acc.push(i);
      return acc;
    }, []);
  }, [lines, levels, filter]);

  const errorCount = useMemo(() => levels.filter(l => l === "error").length, [levels]);
  const warnCount  = useMemo(() => levels.filter(l => l === "warn").length,  [levels]);

  useEffect(() => {
    setMatchCursor(0);
    if (query) setFilter("all");
  }, [query]);

  function scrollToIndex(idx: number) {
    lineRefs.current[idx]?.scrollIntoView({ block: "center", behavior: "smooth" });
  }

  useEffect(() => {
    if (matchIndices.length > 0) scrollToIndex(matchIndices[matchCursor]);
  }, [matchCursor, matchIndices]);

  useEffect(() => {
    if (pendingScroll !== null) {
      scrollToIndex(pendingScroll);
      setPendingScroll(null);
    }
  }, [pendingScroll, filter]);

  useEffect(() => {
    if (jumpSignal) {
      setQuery("");
      setFilter("all");
      setPendingScroll(jumpSignal.line - 1);
    }
  }, [jumpSignal]);

  useEffect(() => {
    if (didInitialScroll.current) return;
    if (parsed?.errors && parsed.errors.length > 0) {
      const firstErrorLine = parsed.errors[0].line;
      const idx = firstErrorLine - 1;
      const timer = setTimeout(() => {
        lineRefs.current[idx]?.scrollIntoView({ block: "center", behavior: "smooth" });
        didInitialScroll.current = true;
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [parsed]);

  function nextMatch() {
    if (!matchIndices.length) return;
    setMatchCursor(c => (c + 1) % matchIndices.length);
  }

  function prevMatch() {
    if (!matchIndices.length) return;
    setMatchCursor(c => (c - 1 + matchIndices.length) % matchIndices.length);
  }

  return (
    <div className="rounded-xl border-4 border-border bg-black shadow-[0.375rem_0.375rem_0_var(--border)] overflow-hidden flex flex-col h-full">
      <div className="flex flex-wrap items-center gap-2 border-b-4 border-border bg-zinc-900/80 px-2 py-2 shrink-0">
        <div className="flex items-center gap-1 rounded-lg border-2 border-zinc-700 bg-zinc-950 px-2 py-1">
          <Search className="size-4 shrink-0 text-zinc-500" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") e.shiftKey ? prevMatch() : nextMatch(); }}
            placeholder="Search log..."
            className="w-36 bg-transparent text-sm text-zinc-200 outline-none placeholder:text-zinc-600"
          />
          {query && (
            <>
              <span className="shrink-0 text-xs tabular-nums text-zinc-500 min-w-[2.25rem] text-right">
                {matchIndices.length > 0 ? `${matchCursor + 1}/${matchIndices.length}` : "0/0"}
              </span>
              <button onClick={prevMatch} className="text-zinc-500 hover:text-zinc-200 transition-colors">
                <ChevronUp className="size-4" />
              </button>
              <button onClick={nextMatch} className="text-zinc-500 hover:text-zinc-200 transition-colors">
                <ChevronDown className="size-4" />
              </button>
              <button onClick={() => setQuery("")} className="text-zinc-500 hover:text-zinc-200 transition-colors">
                <X className="size-4" />
              </button>
            </>
          )}
        </div>

        <div className="flex items-center gap-1 flex-wrap">
          {filterChips.map(chip => {
            const count = chip.key === "error" ? errorCount : chip.key === "warn" ? warnCount : null;
            const isActive = filter === chip.key;
            return (
              <Button
                key={chip.key}
                size="sm"
                variant="outline"
                onClick={() => setFilter(chip.key)}
                className={`h-7 border-2 border-zinc-700 text-xs font-bold transition-all ${
                  isActive
                    ? `${chip.activeClass} border-transparent shadow-[0.125rem_0.125rem_0_var(--border)]`
                    : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 hover:border-zinc-600"
                }`}
              >
                {chip.label}
                {count !== null && count > 0 && (
                  <span className={`ml-1 rounded px-1 text-[0.625rem] font-black ${isActive ? "bg-black/20" : "bg-zinc-700 text-zinc-300"}`}>
                    {count}
                  </span>
                )}
              </Button>
            );
          })}
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={onOpenAi}
          className="h-7 border-2 border-zinc-700 text-xs font-bold transition-all ml-1 bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 hover:border-zinc-600 active:translate-x-px active:translate-y-px shadow-[0.125rem_0.125rem_0_rgba(0,0,0,0.2)]"
        >
          <Sparkles className="size-3.5 mr-1.5 text-primary" />
          AI Assistant
        </Button>

        {onJumpToCrash && (
          <Button
            size="sm"
            disabled={!hasCrash}
            onClick={onJumpToCrash}
            className="ml-auto h-7 border-2 border-transparent text-xs font-bold bg-red-500 text-white hover:bg-red-600 shadow-[0.125rem_0.125rem_0_var(--border)] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            <Crosshair className="size-3.5 mr-1.5" />
            Jump to crash
          </Button>
        )}
      </div>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        <ScrollArea className="flex-1 h-full">
          <div className="p-3 font-mono text-sm min-w-max">
            {visibleIndices.map(idx => {
              const lineNumber = idx + 1;
              const line = lines[idx];
              const level = levels[idx];
              const isMatch = matchSet.has(idx);
              const isCurrent = matchIndices[matchCursor] === idx;

              const isError = errorMap.has(lineNumber);
              const isImportant = !isError && importantSet.has(lineNumber);
              const errorText = errorMap.get(lineNumber);
              const hasIndicator = isError || isImportant;
              const hasAiAnnotation = aiAnnotationMap.has(lineNumber);
              const aiComment = aiAnnotationMap.get(lineNumber) ?? null;

              const rowClasses = [
                "flex rounded-sm transition-colors",
                isCurrent
                  ? "bg-primary/15 outline outline-1 outline-primary/40"
                  : isMatch
                  ? "bg-primary/5"
                  : isError
                  ? "bg-red-500/10 border-l-2 border-red-500"
                  : isImportant
                  ? "bg-primary/5 border-l-2 border-primary/50"
                  : hasAiAnnotation
                  ? "border-l-2 border-primary/30"
                  : "",
              ].filter(Boolean).join(" ");

              const lineContent = (
                <div
                  key={idx}
                  ref={el => { lineRefs.current[idx] = el; }}
                  className={rowClasses}
                >
                  <div className="flex w-16 select-none pr-2 shrink-0 items-center justify-end gap-1">
                    {isError && <AlertCircle className="size-3 text-red-500 shrink-0" />}
                    {isImportant && !isError && <Info className="size-3 text-primary shrink-0" />}
                    {hasAiAnnotation && !isError && !isImportant && <Sparkles className="size-3 text-primary shrink-0" />}
                    <span className={`text-right tabular-nums ${isError ? "text-red-500/70" : isImportant ? "text-primary/60" : hasAiAnnotation ? "text-primary/60" : "text-zinc-600"}`}>
                      {lineNumber}
                    </span>
                  </div>
                  <pre className={`whitespace-pre ${colorMap[level]} ${isError ? "font-semibold" : ""}`}>
                    {query ? highlightMatch(line, query, isCurrent) : line}
                  </pre>
                </div>
              );

              if (hasIndicator || hasAiAnnotation) {
                return (
                  <Tooltip key={idx}>
                    <TooltipTrigger asChild>
                      {lineContent}
                    </TooltipTrigger>
                    <TooltipContent
                      align="start"
                      side="top"
                      className="border-2 border-border bg-popover text-popover-foreground shadow-[0.125rem_0.125rem_0_var(--border)] max-w-sm z-50"
                    >
                      <div className="space-y-1">
                        {(isError || isImportant) && (
                          <>
                            <p className="font-black flex items-center gap-1.5 text-xs">
                              {isError ? (
                                <>
                                  <AlertCircle className="size-3.5 text-red-500" />
                                  <span className="text-red-500 uppercase">Error / Crash</span>
                                </>
                              ) : (
                                <>
                                  <Info className="size-3.5 text-primary" />
                                  <span className="text-primary uppercase">Important Line</span>
                                </>
                              )}
                            </p>
                            <p className="text-xs leading-relaxed opacity-90 break-words">
                              {errorText ?? "Key diagnostic line — version info, mod loading, or crash hint."}
                            </p>
                          </>
                        )}
                        {hasAiAnnotation && (
                          <>
                            {(isError || isImportant) && <div className="h-px bg-border/50 my-1" />}
                            <div className="space-y-0.5">
                              <p className="font-black flex items-center gap-1.5 text-xs text-primary">
                                <Sparkles className="size-3.5 shrink-0" />
                                <span className="uppercase">AI Comment</span>
                              </p>
                              <p className="text-xs leading-relaxed opacity-90 break-words">
                                {aiComment}
                              </p>
                            </div>
                          </>
                        )}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                );
              }

              return lineContent;
            })}
            {visibleIndices.length === 0 && (
              <p className="p-6 text-sm italic text-zinc-500">No lines match this filter.</p>
            )}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>
    </div>
  );
}
