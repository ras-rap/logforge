import { getLog, updateLogAiAnalysis } from "@/lib/db";
import { generateWithTools } from "@/lib/ai/client";
import { StreamEvent } from "@/lib/ai/tools";
import {
  getAnalysisSystem,
  getChatSystem,
  getAnalysisPrompt,
  getChatPrompt,
} from "@/lib/ai/prompts/minecraft";
import { Loader, ParsedLog, AiAnalysis } from "@/lib/parser/types";

/**
 * Extract a JSON object from a model response that may contain:
 * - bare JSON
 * - ```json ... ``` fences
 * - ``` ... ``` fences
 * - prose before/after the JSON block
 *
 * Strategy: strip fences first, then find the outermost matching { … } by
 * scanning for balanced braces. This handles truncation at the object level —
 * if the model cut off mid-string we still throw, but with a useful message.
 */
function parseAnalysisJson(raw: string): AiAnalysis {
  // 1. Strip markdown fences if present
  let text = raw.trim();
  const jsonFence = text.match(/```json\s*([\s\S]*?)```/);
  const anyFence  = text.match(/```\s*([\s\S]*?)```/);
  if (jsonFence) text = jsonFence[1].trim();
  else if (anyFence) text = anyFence[1].trim();

  // 2. Find the outermost { … } by brace scanning
  const start = text.indexOf("{");
  if (start === -1) {
    console.error("[analyze] No JSON object found in response. Raw response:\n", raw);
    throw new Error("Model did not return a JSON object. Check server logs for the raw response.");
  }

  let depth = 0;
  let end   = -1;
  for (let i = start; i < text.length; i++) {
    if (text[i] === "{") depth++;
    else if (text[i] === "}") {
      depth--;
      if (depth === 0) { end = i; break; }
    }
  }

  if (end === -1) {
    // Brace never closed — model was cut off mid-response
    console.error("[analyze] Truncated JSON (unclosed brace). Raw response:\n", raw);
    throw new Error(
        "Model response was cut off before the JSON was complete. " +
        "This usually means the output hit a token limit — try a shorter log or a model with a larger context window."
    );
  }

  const candidate = text.slice(start, end + 1);
  try {
    return JSON.parse(candidate);
  } catch (e: unknown) {
    console.error("[analyze] JSON.parse failed on extracted candidate:\n", candidate, "\nRaw response:\n", raw);
    throw new Error(`Could not parse model JSON: ${e instanceof Error ? e.message : String(e)}`);
  }
}

export async function POST(req: Request) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: StreamEvent) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };

      try {
        const { id, type, question } = await req.json();

        if (!id) { send({ type: "error", message: "Missing log ID" }); return; }

        const log = getLog(id);
        if (!log) { send({ type: "error", message: "Log not found" }); return; }

        let metadata: Partial<ParsedLog> = {};
        if (log.parsed) { try { metadata = JSON.parse(log.parsed); } catch {} }
        const loader = (metadata.loader ?? "unknown") as Loader;

        if (type === "chat") {
          if (!question) { send({ type: "error", message: "Missing question" }); return; }

          const answer = await generateWithTools(
              getChatPrompt(log.content, question),
              getChatSystem(loader),
              log.content,
              send,
              4,
          );
          send({ type: "answer", text: answer });
          return;
        }

        // Analysis — serve from cache if available
        if (log.ai_analysis) {
          try {
            send({ type: "analysis", data: JSON.parse(log.ai_analysis) });
            return;
          } catch {} // corrupt cache, regenerate
        }

        const raw = await generateWithTools(
            getAnalysisPrompt(log.content, metadata),
            getAnalysisSystem(loader),
            log.content,
            send,
            8,
        );

        const analysis = parseAnalysisJson(raw);
        updateLogAiAnalysis(id, JSON.stringify(analysis));
        send({ type: "analysis", data: analysis });

      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("AI analyze error:", error);
        try {
          controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: "error", message })}\n\n`)
          );
        } catch {}
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type":  "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection":    "keep-alive",
    },
  });
}