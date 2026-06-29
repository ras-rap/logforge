"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileText, Loader2 } from "lucide-react";

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
      body: JSON.stringify({
        content: text,
        filename: fileName || "pasted-log.txt",
      }),
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
      <Card className="w-full max-w-3xl border-4 border-black shadow-[6px_6px_0_black]">
        <CardHeader>
          <CardTitle className="text-5xl font-black">LogForge</CardTitle>
          <CardDescription className="text-base">
            Minecraft crash log analyzer. Upload a log and find out what broke.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste your crash log here..."
            className="min-h-[350px] w-full rounded-xl border-4 border-black bg-white p-4 font-mono text-sm shadow-[4px_4px_0_black] outline-none resize-y"
          />

          <div className="flex items-center gap-3">
            <input
              ref={inputRef}
              type="file"
              hidden
              onChange={handleFile}
            />
            <Button
              variant="outline"
              size="lg"
              onClick={() => inputRef.current?.click()}
              className="border-4 border-black shadow-[4px_4px_0_black] font-bold"
            >
              <Upload data-icon="inline-start" />
              Upload
            </Button>
            <Button
              size="lg"
              disabled={!hasContent || loading}
              onClick={submit}
              className="border-4 border-black bg-yellow-300 text-black font-black shadow-[4px_4px_0_black] hover:bg-yellow-400"
            >
              {loading ? (
                <>
                  <Loader2 data-icon="inline-start" className="animate-spin" />
                  Analyzing...
                </>
              ) : (
                "Analyze"
              )}
            </Button>
          </div>

          {fileName && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileText className="size-4" />
              {fileName}
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
