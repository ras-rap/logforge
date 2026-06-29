"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface SuspectMod {
  name: string;
  reason: string;
  confidence: number;
}

interface ParsedData {
  loader: string;
  minecraftVersion?: string;
  javaVersion?: string;
  crashCause?: string;
  suspectMods: SuspectMod[];
}

function MiniInfo({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs uppercase font-semibold text-muted-foreground tracking-wider">{label}</p>
      <p className="font-bold mt-0.5 break-words">{value}</p>
    </div>
  );
}

function SuspectList({ suspects }: { suspects: SuspectMod[] }) {
  if (!suspects || suspects.length === 0) {
    return <p className="text-sm text-muted-foreground">No suspects found</p>;
  }

  return (
    <div className="space-y-2">
      {suspects.map((s, i) => (
        <div key={i} className="rounded-lg border-4 border-black bg-destructive/10 p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="font-bold text-sm truncate">⚠ {s.name}</span>
            <Badge variant="destructive" className="shrink-0">{s.confidence}%</Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">{s.reason}</p>
        </div>
      ))}
    </div>
  );
}

export default function AnalysisDrawer({ data }: { data: ParsedData }) {
  return (
    <div className="fixed right-0 top-1/2 -translate-y-1/2 z-50 group max-w-8 hover:max-w-[352px] transition-all duration-200 ease-out overflow-hidden rounded-l-xl border-4 border-black bg-card text-card-foreground shadow-[-6px_6px_0_black]">
      <div className="flex items-start">
        <div className="h-16 w-8 bg-yellow-300 border-r-4 border-black flex rounded-l-lg items-center justify-center flex-shrink-0">
          <span className="text-lg font-black transition-transform duration-200 group-hover:rotate-180">❮</span>
        </div>
        <div className="w-80">
          <ScrollArea className="max-h-[80vh]">
            <div className="p-4 space-y-4">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold">Analysis</h2>
                <Badge variant="secondary" className="ml-auto">AUTO</Badge>
              </div>

              <MiniInfo label="Loader" value={data.loader} />
              <Separator />
              <MiniInfo label="Minecraft" value={data.minecraftVersion ?? "Unknown"} />
              <Separator />
              <MiniInfo label="Java" value={data.javaVersion ?? "Unknown"} />
              <Separator />
              <MiniInfo label="Crash" value={data.crashCause ?? "Unknown"} />

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
