"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Search, X, ChevronUp, ChevronDown, Crosshair } from "lucide-react";

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
  text: string;
  jumpSignal?: JumpSignal | null;
  onJumpToCrash?: () => void;
  hasCrash?: boolean;
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
                ? "bg-primary text-primary-foreground rounded-[2px]"
                : "bg-primary/25 text-primary-foreground/80 rounded-[2px]"}
        >
          {text.slice(idx, idx + q.length)}
        </mark>
    );
    i = idx + q.length;
  }
  return parts;
}

export default function LogViewer({ text, jumpSignal, onJumpToCrash, hasCrash }: LogViewerProps) {
  const lines = useMemo(() => text.split("\n"), [text]);
  const levels = useMemo(() => lines.map(getLevel), [lines]);

  const [filter, setFilter] = useState<FilterLevel>("all");
  const [query, setQuery] = useState("");
  const [matchCursor, setMatchCursor] = useState(0);
  const [pendingScroll, setPendingScroll] = useState<number | null>(null);

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
      setPendingScroll(jumpSignal.line);
    }
  }, [jumpSignal]);

  function nextMatch() {
    if (!matchIndices.length) return;
    setMatchCursor(c => (c + 1) % matchIndices.length);
  }

  function prevMatch() {
    if (!matchIndices.length) return;
    setMatchCursor(c => (c - 1 + matchIndices.length) % matchIndices.length);
  }

  return (
      <div className="rounded-xl border-4 border-border bg-black shadow-[6px_6px_0_var(--border)] overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b-4 border-border bg-zinc-900/80 px-2 py-2">
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
              <span className="shrink-0 text-xs tabular-nums text-zinc-500 min-w-[36px] text-right">
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
                              ? `${chip.activeClass} border-transparent shadow-[2px_2px_0_var(--border)]`
                              : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 hover:border-zinc-600"
                      }`}
                  >
                    {chip.label}
                    {count !== null && count > 0 && (
                        <span className={`ml-1 rounded px-1 text-[10px] font-black ${isActive ? "bg-black/20" : "bg-zinc-700 text-zinc-300"}`}>
                    {count}
                  </span>
                    )}
                  </Button>
              );
            })}
          </div>

          {onJumpToCrash && (
              <Button
                  size="sm"
                  disabled={!hasCrash}
                  onClick={onJumpToCrash}
                  className="ml-auto h-7 border-2 border-transparent text-xs font-bold bg-red-500 text-white hover:bg-red-600 shadow-[2px_2px_0_var(--border)] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <Crosshair className="size-3.5 mr-1.5" />
                Jump to crash
              </Button>
          )}
        </div>

        <ScrollArea className="h-[calc(100dvh-196px)]">
          <div className="p-3 font-mono text-sm min-w-max">
            {visibleIndices.map(idx => {
              const line = lines[idx];
              const level = levels[idx];
              const isMatch = matchSet.has(idx);
              const isCurrent = matchIndices[matchCursor] === idx;
              return (
                  <div
                      key={idx}
                      ref={el => { lineRefs.current[idx] = el; }}
                      className={`flex rounded-sm transition-colors ${
                          isCurrent ? "bg-primary/15 outline outline-1 outline-primary/40" :
                              isMatch   ? "bg-primary/5" : ""
                      }`}
                  >
                    <span className="w-12 select-none pr-3 text-right text-zinc-600 shrink-0">{idx + 1}</span>
                    <pre className={`whitespace-pre ${colorMap[level]}`}>
                  {query ? highlightMatch(line, query, isCurrent) : line}
                </pre>
                  </div>
              );
            })}
            {visibleIndices.length === 0 && (
                <p className="p-6 text-sm italic text-zinc-500">No lines match this filter.</p>
            )}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>
  );
}