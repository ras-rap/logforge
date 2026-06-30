import { ParsedLog } from "@/lib/parser/types";

export const MINECRAFT_ANALYSIS_SYSTEM = `You are a Minecraft Log Analysis AI. 
Your goal is to analyze a Minecraft server or client log and provide a detailed but extremely concise report.

The report must be in JSON format with the following fields:
{
  "explanation": "A plain-English explanation of what went wrong. Be thorough — cover the root cause, what chain of events led to it, and any relevant context. Aim for 4-8 sentences.",
  "steps": ["Concise Step 1", "Concise Step 2"],
  "links": [{"title": "Issue #123", "url": "https://..."}],
  "snippets": [{"file": "config.yml", "content": "..."}],
  "annotations": [{"line": 42, "comment": "This line shows the exact mod that failed to load"}]
}

CRITICAL: The "annotations" field is for placing AI comments on specific log lines. You MUST follow these rules:
1. Each annotation has a line number (1-based) and a short comment (under 80 chars).
2. You MUST look up the exact content of that line in the provided log (with line numbers) and VERIFY your comment actually matches what that line says. Never guess.
3. Only annotate lines that DIRECTLY contain one of: an exception/error message, a crash cause, a Java version line, a Minecraft version line, a mod incompatibility error, or a "Caused by:" line.
4. NEVER annotate: mod scanning/list/discovery lines, info-level loading messages, "Hello from X" messages, or any line that doesn't directly contribute to the crash or root cause.
5. If you cannot find appropriate lines that match, return an empty annotations array [].

Aim for 0–5 high-quality annotations. It is better to return zero annotations than incorrect ones.

Be highly technical but accessible. Focus on the single most likely root cause. Use markdown for the explanation field.`;

export function getAnalysisPrompt(log: string, metadata?: Partial<ParsedLog>) {
  const MAX_CHARS = 20000;
  let tailStart = 0;
  let tailText = log;
  if (log.length > MAX_CHARS) {
    // Slice last N chars, then rewind to start of line
    const sliced = log.slice(-MAX_CHARS);
    const firstNewline = sliced.indexOf("\n");
    tailText = firstNewline >= 0 ? sliced.slice(firstNewline + 1) : sliced;
    const beforeTail = log.slice(0, log.length - tailText.length);
    tailStart = beforeTail.endsWith("\n") ? beforeTail.split("\n").length - 1 : beforeTail.split("\n").length;
    if (tailStart < 0) tailStart = 0;
  }
  const tailLines = tailText.split("\n");
  
  // Number with actual 1-based line numbers from the full log
  const numberedTail = tailLines.map((line, i) => `${tailStart + i + 1}: ${line}`).join("\n");

  let metadataStr = "";
  if (metadata) {
      if (metadata.loader) metadataStr += `- Loader: ${metadata.loader}\n`;
      if (metadata.minecraftVersion) metadataStr += `- Minecraft Version: ${metadata.minecraftVersion}\n`;
      if (metadata.javaVersion) metadataStr += `- Java Version: ${metadata.javaVersion}\n`;
      if (metadata.crashCause) metadataStr += `- Crash Cause: ${metadata.crashCause}\n`;
      if (metadata.suspectMods?.length) {
          metadataStr += `- Suspected Mods:\n${metadata.suspectMods.map(m => `  * ${m.name} (${m.confidence}% confidence): ${m.reason}`).join("\n")}\n`;
      }
      if (metadata.errors?.length) {
          metadataStr += `- Parser-detected error lines:\n${metadata.errors.slice(0, 10).map(e => `  * Line ${e.line}: ${e.text.slice(0, 120)}`).join("\n")}\n`;
      }
      if (metadata.importantLines?.length) {
          metadataStr += `- Important diagnostic lines: ${metadata.importantLines.join(", ")}\n`;
      }
  }

  return `I have parsed this Minecraft log and identified the following metadata:
${metadataStr || "None identified by the automatic parser."}

Here is the log content (tail) with ACTUAL line numbers from the original file — you MUST use these exact line numbers when creating annotations:
${numberedTail}

Analyze this log and provide a JSON report focusing on the root cause. If the metadata suggests suspected mods, investigate them first and check for version compatibility issues (e.g., mod X requiring a newer version of mod Y).`;
}

export const MINECRAFT_CHAT_SYSTEM = `You are a Minecraft Log Assistant. 
You have access to a Minecraft log. Help the user understand specific lines or general issues.
Be helpful, extremely concise, and accurate. 
Keep your answers short and to the point. Use markdown for formatting.`;

export function getChatPrompt(log: string, question: string) {
    const logTail = log.length > 15000 ? log.slice(-15000) : log;
    return `Context log (partial):\n${logTail}\n\nQuestion: ${question}`;
}
