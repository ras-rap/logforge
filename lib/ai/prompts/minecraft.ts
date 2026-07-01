import { ParsedLog, Loader } from "@/lib/parser/types";
import { buildAnalysisSystem, buildChatSystem } from "./base";
import { paperAnalysisContext, paperChatContext } from "./loaders/paper";
import { forgeAnalysisContext, forgeChatContext } from "./loaders/forge";
import { neoforgeAnalysisContext, neoforgeChatContext } from "./loaders/neoforge";
import { fabricAnalysisContext, fabricChatContext } from "./loaders/fabric";
import { quiltAnalysisContext, quiltChatContext } from "./loaders/quilt";

const FALLBACK_ANALYSIS_CONTEXT = `## General Minecraft — Loader Context
The loader could not be detected. Apply general Minecraft troubleshooting knowledge.
Check for Java version mismatches, missing dependencies, and exception messages near the end of the log.`;

const FALLBACK_CHAT_CONTEXT = `## General Minecraft context
The specific loader/platform could not be detected. Apply general Minecraft troubleshooting knowledge.`;

function getLoaderAnalysisContext(loader: Loader): string {
    switch (loader) {
        case "paper":
        case "purpur":
        case "folia":
        case "spigot":
        case "bukkit":
            return paperAnalysisContext;
        case "forge":
            return forgeAnalysisContext;
        case "neoforge":
            return neoforgeAnalysisContext;
        case "fabric":
            return fabricAnalysisContext;
        case "quilt":
            return quiltAnalysisContext;
        default:
            return FALLBACK_ANALYSIS_CONTEXT;
    }
}

function getLoaderChatContext(loader: Loader): string {
    switch (loader) {
        case "paper":
        case "purpur":
        case "folia":
        case "spigot":
        case "bukkit":
            return paperChatContext;
        case "forge":
            return forgeChatContext;
        case "neoforge":
            return neoforgeChatContext;
        case "fabric":
            return fabricChatContext;
        case "quilt":
            return quiltChatContext;
        default:
            return FALLBACK_CHAT_CONTEXT;
    }
}

/** Build the analysis system prompt for a given loader. */
export function getAnalysisSystem(loader: Loader = "unknown"): string {
    return buildAnalysisSystem(getLoaderAnalysisContext(loader));
}

/** Build the chat system prompt for a given loader. */
export function getChatSystem(loader: Loader = "unknown"): string {
    return buildChatSystem(getLoaderChatContext(loader));
}

// ---------------------------------------------------------------------------
// User-message prompt builders (unchanged shape from before)
// ---------------------------------------------------------------------------

export function getAnalysisPrompt(log: string, metadata?: Partial<ParsedLog>): string {
    const MAX_CHARS = 20000;
    let tailStart = 0;
    let tailText = log;
    if (log.length > MAX_CHARS) {
        const sliced = log.slice(-MAX_CHARS);
        const firstNewline = sliced.indexOf("\n");
        tailText = firstNewline >= 0 ? sliced.slice(firstNewline + 1) : sliced;
        const beforeTail = log.slice(0, log.length - tailText.length);
        tailStart = beforeTail.endsWith("\n")
            ? beforeTail.split("\n").length - 1
            : beforeTail.split("\n").length;
        if (tailStart < 0) tailStart = 0;
    }
    const tailLines = tailText.split("\n");
    const numberedTail = tailLines.map((line, i) => `${tailStart + i + 1}: ${line}`).join("\n");

    let metadataStr = "";
    if (metadata) {
        if (metadata.loader) metadataStr += `- Loader: ${metadata.loader}\n`;
        if (metadata.minecraftVersion) metadataStr += `- Minecraft Version: ${metadata.minecraftVersion}\n`;
        if (metadata.javaVersion) metadataStr += `- Java Version: ${metadata.javaVersion}\n`;
        if (metadata.crashCause) metadataStr += `- Crash Cause: ${metadata.crashCause}\n`;
        if (metadata.suspectMods?.length) {
            metadataStr += `- Suspected ${metadata.loader && ["paper","purpur","folia","spigot","bukkit"].includes(metadata.loader) ? "Plugins" : "Mods"}:\n${
                metadata.suspectMods.map(m => `  * ${m.name} (${m.confidence}% confidence): ${m.reason}`).join("\n")
            }\n`;
        }
        if (metadata.errors?.length) {
            metadataStr += `- Parser-detected error lines:\n${
                metadata.errors.slice(0, 10).map(e => `  * Line ${e.line}: ${e.text.slice(0, 120)}`).join("\n")
            }\n`;
        }
        if (metadata.importantLines?.length) {
            metadataStr += `- Important diagnostic lines: ${metadata.importantLines.join(", ")}\n`;
        }
    }

    return `I have parsed this Minecraft log and identified the following metadata:
${metadataStr || "None identified by the automatic parser."}

Here is the log content (tail) with ACTUAL line numbers from the original file — use these exact numbers for annotations:
${numberedTail}

Analyze this log and provide a JSON report focusing on the root cause. If suspected mods/plugins are listed, investigate them first and check for version compatibility issues.`;
}

export function getChatPrompt(log: string, question: string): string {
    const logTail = log.length > 15000 ? log.slice(-15000) : log;
    return `Context log (partial):\n${logTail}\n\nQuestion: ${question}`;
}