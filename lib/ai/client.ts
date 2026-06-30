import { env } from "@/lib/env";

export async function generateText(prompt: string, systemPrompt?: string): Promise<string> {
  if (env.AI_PROVIDER === "openai") {
    return generateOpenAI(prompt, systemPrompt);
  } else if (env.AI_PROVIDER === "custom") {
    return generateCustom(prompt, systemPrompt);
  } else {
    return generateOllama(prompt, systemPrompt);
  }
}

async function generateOpenAI(prompt: string, systemPrompt?: string) {
  if (!env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not set");
  }

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: env.OPENAI_MODEL,
      messages: [
        ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
    }),
  });
  
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI error: ${err}`);
  }

  const data = await res.json();
  return data.choices[0].message.content;
}

async function generateCustom(prompt: string, systemPrompt?: string) {
  if (!env.CUSTOM_OPENAI_BASE_URL) {
    throw new Error("CUSTOM_OPENAI_BASE_URL is not set");
  }

  const baseUrl = env.CUSTOM_OPENAI_BASE_URL.replace(/\/$/, "");
  // Some providers might expect the full path in base URL, but usually it's the base.
  // We'll append /chat/completions if it's not already there.
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
  
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Custom AI error: ${err}`);
  }

  const data = await res.json();
  return data.choices[0].message.content;
}

async function generateOllama(prompt: string, systemPrompt?: string) {
  const res = await fetch(`${env.OLLAMA_BASE_URL}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: env.OLLAMA_MODEL,
      system: systemPrompt,
      prompt: prompt,
      stream: false,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Ollama error: ${err}`);
  }

  const data = await res.json();
  return data.response;
}
