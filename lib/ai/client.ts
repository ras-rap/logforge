import { env } from "@/lib/env";
import { LOG_TOOLS, executeTool, buildCallSummary, StreamEvent } from "./tools";

// -- Types -----------------------------------------------------------------------

interface ToolCall {
  id: string;
  function: {
    name: string;
    arguments: string;
  };
}

type ChatMsg =
    | { role: "system" | "user" | "assistant"; content: string | null; tool_calls?: ToolCall[] }
    | { role: "tool"; tool_call_id: string; content: string };

interface OpenAIResponse {
  error?: { message: string };
  choices?: {
    message: {
      content: string | null;
      tool_calls?: ToolCall[] | null;
    };
  }[];
}

// -- Shared helpers --------------------------------------------------------------

function extractChoice(data: OpenAIResponse, providerName: string): { content: string | null; toolCalls: ToolCall[] | null } {
  if (data.error) throw new Error(`${providerName} error: ${JSON.stringify(data.error)}`);
  const message = data.choices?.[0]?.message;
  if (!message) throw new Error(`${providerName} returned no choices. Full response: ${JSON.stringify(data)}`);
  return {
    content:   message.content   ?? null,
    toolCalls: message.tool_calls ?? null,
  };
}

// -- Simple one-shot generation (no tools) ---------------------------------------

export async function generateText(prompt: string, systemPrompt?: string): Promise<string> {
  if (env.AI_PROVIDER === "openai")  return generateOpenAI(prompt, systemPrompt);
  if (env.AI_PROVIDER === "custom")  return generateCustom(prompt, systemPrompt);
  return generateOllama(prompt, systemPrompt);
}

async function generateOpenAI(prompt: string, systemPrompt?: string) {
  if (!env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not set");
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.OPENAI_API_KEY}` },
    body: JSON.stringify({
      model: env.OPENAI_MODEL,
      messages: [
        ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
    }),
  });
  if (!res.ok) throw new Error(`OpenAI HTTP ${res.status}: ${await res.text()}`);
  const { content } = extractChoice(await res.json(), "OpenAI");
  if (!content) throw new Error("OpenAI returned empty content");
  return content;
}

async function generateCustom(prompt: string, systemPrompt?: string) {
  if (!env.CUSTOM_OPENAI_BASE_URL) throw new Error("CUSTOM_OPENAI_BASE_URL is not set");
  const baseUrl = env.CUSTOM_OPENAI_BASE_URL.replace(/\/$/, "");
  const url = baseUrl.endsWith("/chat/completions") ? baseUrl : `${baseUrl}/chat/completions`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(env.CUSTOM_OPENAI_API_KEY ? { Authorization: `Bearer ${env.CUSTOM_OPENAI_API_KEY}` } : {}),
    },
    body: JSON.stringify({
      model: env.CUSTOM_OPENAI_MODEL,
      messages: [
        ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
    }),
  });
  if (!res.ok) throw new Error(`Custom AI HTTP ${res.status}: ${await res.text()}`);
  const { content } = extractChoice(await res.json(), "Custom AI");
  if (!content) throw new Error("Custom AI returned empty content");
  return content;
}

async function generateOllama(prompt: string, systemPrompt?: string) {
  const res = await fetch(`${env.OLLAMA_BASE_URL}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: env.OLLAMA_MODEL, system: systemPrompt, prompt, stream: false }),
  });
  if (!res.ok) throw new Error(`Ollama HTTP ${res.status}: ${await res.text()}`);
  const data = await res.json();
  if (!data.response) throw new Error(`Ollama returned no response. Body: ${JSON.stringify(data)}`);
  return data.response;
}

// -- Agentic tool loop -----------------------------------------------------------

/**
 * Runs an agentic loop with tool access to the full log.
 * Fires onEvent callbacks as tool calls and results occur (for SSE streaming).
 * Returns the final text content once the model stops calling tools.
 */
export async function generateWithTools(
    prompt: string,
    systemPrompt: string,
    log: string,
    onEvent: (event: StreamEvent) => void,
    maxIterations = 8,
): Promise<string> {
  if (env.AI_PROVIDER === "ollama") {
    return generateWithToolsOllama(prompt, systemPrompt, log, onEvent, maxIterations);
  }
  return generateWithToolsOpenAI(prompt, systemPrompt, log, onEvent, maxIterations);
}

async function runToolLoop(
    logLines: string[],
    messages: ChatMsg[],
    onEvent: (event: StreamEvent) => void,
    maxIterations: number,
    makeRequest: (msgs: ChatMsg[]) => Promise<{ content: string | null; toolCalls: ToolCall[] | null }>,
): Promise<string> {
  for (let i = 0; i < maxIterations; i++) {
    const { content, toolCalls } = await makeRequest(messages);

    if (!toolCalls || toolCalls.length === 0) {
      return content ?? "";
    }

    // Push the assistant turn (may have no text content if it only called tools)
    messages.push({ role: "assistant", content: content ?? null, tool_calls: toolCalls ?? undefined });

    for (const tc of toolCalls) {
      const name = tc.function.name;
      const args: Record<string, unknown> = (() => {
        try { return JSON.parse(tc.function.arguments); }
        catch { return {}; }
      })();

      onEvent({ type: "tool_call", name, args, callSummary: buildCallSummary(name, args) });

      const result = executeTool(name, args, logLines);

      onEvent({ type: "tool_result", name, resultSummary: result.summary });

      messages.push({ role: "tool", tool_call_id: tc.id, content: result.content });
    }
  }

  // Final pass after hitting iteration limit
  const { content } = await makeRequest(messages);
  return content ?? "";
}

async function generateWithToolsOpenAI(
    prompt: string,
    systemPrompt: string,
    log: string,
    onEvent: (event: StreamEvent) => void,
    maxIterations: number,
): Promise<string> {
  const isCustom = env.AI_PROVIDER === "custom";

  if (isCustom && !env.CUSTOM_OPENAI_BASE_URL) throw new Error("CUSTOM_OPENAI_BASE_URL is not set");
  if (!isCustom && !env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not set");

  const baseUrl  = isCustom
      ? env.CUSTOM_OPENAI_BASE_URL.replace(/\/$/, "")
      : "https://api.openai.com/v1";
  const url      = baseUrl.endsWith("/chat/completions") ? baseUrl : `${baseUrl}/chat/completions`;
  const model    = isCustom ? env.CUSTOM_OPENAI_MODEL : env.OPENAI_MODEL;
  const apiKey   = isCustom ? env.CUSTOM_OPENAI_API_KEY : env.OPENAI_API_KEY;
  const logLines = log.split("\n");

  const messages: ChatMsg[] = [
    { role: "system", content: systemPrompt },
    { role: "user",   content: prompt },
  ];

  const makeRequest = async (msgs: ChatMsg[]) => {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify({ model, messages: msgs, tools: LOG_TOOLS, temperature: 0.7 }),
    });
    if (!res.ok) throw new Error(`${isCustom ? "Custom AI" : "OpenAI"} HTTP ${res.status}: ${await res.text()}`);
    return extractChoice(await res.json(), isCustom ? "Custom AI" : "OpenAI");
  };

  return runToolLoop(logLines, messages, onEvent, maxIterations, makeRequest);
}

async function generateWithToolsOllama(
    prompt: string,
    systemPrompt: string,
    log: string,
    onEvent: (event: StreamEvent) => void,
    maxIterations: number,
): Promise<string> {
  const logLines = log.split("\n");
  const url      = `${env.OLLAMA_BASE_URL}/api/chat`;

  const messages: ChatMsg[] = [
    { role: "system", content: systemPrompt },
    { role: "user",   content: prompt },
  ];

  const makeRequest = async (msgs: ChatMsg[]) => {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: env.OLLAMA_MODEL, messages: msgs, tools: LOG_TOOLS, stream: false }),
    });
    if (!res.ok) throw new Error(`Ollama HTTP ${res.status}: ${await res.text()}`);
    const data = await res.json();
    // Ollama /api/chat response: { message: { role, content, tool_calls? } }
    if (data.error) throw new Error(`Ollama error: ${data.error}`);
    const message = data.message;
    if (!message) throw new Error(`Ollama returned no message. Body: ${JSON.stringify(data)}`);
    return {
      content:   message.content   ?? null,
      toolCalls: message.tool_calls ?? null,
    };
  };

  return runToolLoop(logLines, messages, onEvent, maxIterations, makeRequest);
}