"use client";

import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

function getLevel(line: string) {
  const lower = line.toLowerCase();
  if (lower.includes("error") || lower.includes("exception") || lower.includes("crash") || lower.includes("fatal"))
    return "error";
  if (lower.includes("warn")) return "warn";
  if (lower.includes("debug")) return "debug";
  if (lower.includes("info")) return "info";
  return "normal";
}

const colorMap: Record<string, string> = {
  error: "text-red-400",
  warn: "text-yellow-300",
  debug: "text-purple-300",
  info: "text-blue-300",
  normal: "text-zinc-300",
};

export default function LogViewer({ text }: { text: string }) {
  const lines = text.split("\n");

  return (
    <div className="rounded-xl border-4 border-black bg-black shadow-[6px_6px_0_black]">
      <ScrollArea className="h-[calc(100dvh-120px)]">
        <div className="p-3 font-mono text-sm min-w-max">
          {lines.map((line, index) => {
            const level = getLevel(line);
            return (
              <div key={index} className="flex">
                <span className="w-12 select-none pr-3 text-right text-zinc-600 shrink-0">
                  {index + 1}
                </span>
                <pre className={`whitespace-pre ${colorMap[level]}`}>{line}</pre>
              </div>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
