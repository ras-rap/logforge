"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileText, Loader2, Zap } from "lucide-react";

export default function Home() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!text.trim()) return;
    setLoading(true);
    const res = await fetch("/api/upload", {
      method: "POST",
      body: JSON.stringify({ content: text, filename: fileName || "pasted-log.txt" }),
      headers: { "Content-Type": "application/json" },
    });
    const data = await res.json();
    router.push(`/l/${data.id}`);
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setText(await file.text());
  }

  const hasContent = text.trim().length > 0;

  return (
      <main className="flex min-h-dvh items-center justify-center p-6">
        <div className="w-full max-w-3xl space-y-3">
          <div className="mb-6">
            <h1 className="text-6xl font-black tracking-tight">
              Log<span className="text-primary">Forge</span>
            </h1>
            <p className="text-muted-foreground mt-1 text-base">
              Paste or upload a Minecraft crash log to analyze it.
            </p>
          </div>

          <Card className="border-4 border-border shadow-[6px_6px_0_var(--border)] bg-card">
            <CardContent className="p-5 space-y-4">
            <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Paste your crash log or latest.log here..."
                className="min-h-[380px] w-full rounded-lg border-4 border-border bg-background p-4 font-mono text-sm shadow-[3px_3px_0_var(--border)] outline-none resize-y placeholder:text-muted-foreground focus:border-primary transition-colors"
            />

              <div className="flex items-center gap-3">
                <input ref={inputRef} type="file" hidden onChange={handleFile} />
                <Button
                    variant="outline"
                    size="lg"
                    onClick={() => inputRef.current?.click()}
                    className="border-4 border-border shadow-[3px_3px_0_var(--border)] font-bold hover:translate-x-px hover:translate-y-px hover:shadow-[2px_2px_0_var(--border)] transition-all"
                >
                  <Upload className="size-4 mr-2" />
                  Upload file
                </Button>

                <Button
                    size="lg"
                    disabled={!hasContent || loading}
                    onClick={submit}
                    className="border-4 border-border bg-primary text-primary-foreground font-black shadow-[3px_3px_0_var(--border)] hover:bg-primary/90 hover:translate-x-px hover:translate-y-px hover:shadow-[2px_2px_0_var(--border)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                      <>
                        <Loader2 className="size-4 mr-2 animate-spin" />
                        Analyzing...
                      </>
                  ) : (
                      <>
                        <Zap className="size-4 mr-2" />
                        Analyze
                      </>
                  )}
                </Button>

                {fileName && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground ml-auto">
                      <FileText className="size-4 shrink-0" />
                      <span className="truncate max-w-48">{fileName}</span>
                    </div>
                )}
              </div>
            </CardContent>
          </Card>

          <p className="text-center text-xs text-muted-foreground">
            Supports Forge, Fabric, NeoForge, Paper, and vanilla logs
          </p>
        </div>
      </main>
  );
}