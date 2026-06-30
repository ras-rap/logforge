export const env = {
  AI_PROVIDER: process.env.AI_PROVIDER || "openai",
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || "",
  OPENAI_MODEL: process.env.OPENAI_MODEL || "gpt-4o",
  OLLAMA_BASE_URL: process.env.OLLAMA_BASE_URL || "http://localhost:11434",
  OLLAMA_MODEL: process.env.OLLAMA_MODEL || "llama3",
  CUSTOM_OPENAI_BASE_URL: process.env.CUSTOM_OPENAI_BASE_URL || "",
  CUSTOM_OPENAI_API_KEY: process.env.CUSTOM_OPENAI_API_KEY || "",
  CUSTOM_OPENAI_MODEL: process.env.CUSTOM_OPENAI_MODEL || "",
};
