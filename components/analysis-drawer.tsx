"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Crosshair } from "lucide-react";

interface SuspectMod {
  name: string;
  reason: string;
  confidence: number;
}

interface LogEntryLike {
  line: number;
}

interface ParsedData {
  loader: string;
  minecraftVersion?: string;
  javaVersion?: string;
  crashCause?: string;
  suspectMods: SuspectMod[];
  errors?: LogEntryLike[];
}

function MiniInfo({ label, value }: { label: string; value: React.ReactNode }) {
  return (
      <div>
        <p className="text-xs uppercase font-semibold text-muted-foreground tracking-wider">{label}</p>
        <div className="font-bold mt-0.5 break-words text-sm">{value}</div>
      </div>
  );
}

function ConfidenceBadge({ value }: { value: number }) {
  const color =
      value >= 75 ? "bg-red-500 text-white" :
          value >= 40 ? "bg-amber-400 text-black" :
              "bg-zinc-600 text-zinc-200";
  return (
      <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-black border-2 border-border ${color}`}>
      {value}%
    </span>
  );
}

function SuspectList({ suspects }: { suspects: SuspectMod[] }) {
  if (!suspects || suspects.length === 0) {
    return <p className="text-sm text-muted-foreground italic">No suspects detected</p>;
  }
  return (
      <div className="space-y-2">
        {suspects.map((s, i) => (
            <div key={i} className="rounded-lg border-2 border-border bg-destructive/10 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-sm truncate text-destructive">⚠ {s.name}</span>
                <ConfidenceBadge value={s.confidence} />
              </div>
              <p className="text-xs text-muted-foreground mt-1">{s.reason}</p>
            </div>
        ))}
      </div>
  );
}

export default function AnalysisDrawer({
                                         data,
                                         onJumpToCrash,
                                       }: {
  data: ParsedData;
  onJumpToCrash?: () => void;
}) {
  const hasErrors = !!data.errors?.length;

  return (
      <div className="fixed right-0 top-1/2 -translate-y-1/2 z-50 group max-w-8 hover:max-w-[352px] transition-all duration-200 ease-out overflow-hidden rounded-l-xl border-4 border-border bg-card text-card-foreground shadow-[-6px_6px_0_var(--border)]">
        <div className="flex items-start">
          <div className="h-16 w-8 bg-primary border-r-4 border-border flex rounded-l-lg items-center justify-center flex-shrink-0">
            <span className="text-lg font-black text-primary-foreground transition-transform duration-200 group-hover:rotate-180">❮</span>
          </div>
          <div className="w-80">
            <ScrollArea className="max-h-[80vh]">
              <div className="p-4 space-y-4">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-black">Analysis</h2>
                  <Badge variant="secondary" className="ml-auto text-[10px] font-black border-2 border-border">AUTO</Badge>
                </div>

                <MiniInfo label="Loader" value={
                  <span className="text-primary">{data.loader}</span>
                } />
                <Separator />
                <MiniInfo label="Minecraft" value={data.minecraftVersion ?? "Unknown"} />
                <Separator />
                <MiniInfo label="Java" value={data.javaVersion ?? "Unknown"} />
                <Separator />
                <MiniInfo
                    label="Crash cause"
                    value={
                      data.crashCause
                          ? <span className="text-destructive text-xs font-mono leading-relaxed">{data.crashCause}</span>
                          : <span className="text-muted-foreground">Unknown</span>
                    }
                />

                {onJumpToCrash && (
                    <Button
                        size="sm"
                        disabled={!hasErrors}
                        onClick={onJumpToCrash}
                        className="w-full h-8 border-2 border-border text-xs font-bold bg-red-500 text-white hover:bg-red-600 shadow-[2px_2px_0_var(--border)] disabled:opacity-40 transition-all"
                    >
                      <Crosshair className="size-3.5 mr-1.5" />
                      Jump to crash
                    </Button>
                )}

                <Separator />
                <div>
                  <h3 className="font-bold text-sm mb-2">Suspected Mods</h3>
                  <SuspectList suspects={data.suspectMods} />
                </div>
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>
  );
}