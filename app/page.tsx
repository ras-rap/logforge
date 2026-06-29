"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

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
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await res.json();

    router.push(`/l/${data.id}`);
  }


  async function handleFile(
      e: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = e.target.files?.[0];

    if (!file) return;

    setFileName(file.name);

    const contents = await file.text();

    setText(contents);
  }


  return (
      <main className="flex min-h-screen items-center justify-center p-6">

        <div className="w-full max-w-3xl space-y-6">

          <div>
            <h1 className="text-6xl font-black">
              LogForge
            </h1>

            <p className="mt-3 text-muted-foreground">
              Minecraft crash log analyzer.
              Upload a log and find out what broke.
            </p>
          </div>


          <textarea
              value={text}
              onChange={(e)=>setText(e.target.value)}
              placeholder="Paste your crash log here..."
              className="
            min-h-[350px]
            w-full
            rounded-xl
            border-4
            border-black
            bg-white
            p-4
            font-mono
            text-sm
            shadow-[6px_6px_0px_black]
            outline-none
          "
          />


          <div className="flex gap-3">

            <label
                className="
              cursor-pointer
              rounded-lg
              border-4
              border-black
              px-4
              py-2
              font-bold
              shadow-[4px_4px_0px_black]
            "
            >

              Upload

              <input
                  type="file"
                  hidden
                  onChange={handleFile}
              />

            </label>


            <button
                onClick={submit}
                disabled={loading}
                className="
              rounded-lg
              border-4
              border-black
              bg-yellow-300
              px-6
              py-2
              font-black
              shadow-[4px_4px_0px_black]
              disabled:opacity-50
            "
            >

              {loading ? "Uploading..." : "Analyze"}

            </button>

          </div>


          {fileName && (
              <p className="text-sm">
                Loaded: {fileName}
              </p>
          )}

        </div>

      </main>
  );
}