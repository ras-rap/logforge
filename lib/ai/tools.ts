import { AiAnalysis } from "@/lib/parser/types";

// -- Stream event types (used by route → client) ---------------------------------

export type StreamEvent =
    | { type: "tool_call";   name: string; args: Record<string, unknown>; callSummary: string }
    | { type: "tool_result"; name: string; resultSummary: string }
    | { type: "analysis";    data: AiAnalysis }
    | { type: "answer";      text: string }
    | { type: "error";       message: string };

// -- Tool definitions (OpenAI function-calling format) ---------------------------

export interface ToolDefinition {
    type: "function";
    function: {
        name: string;
        description: string;
        parameters: {
            type: "object";
            properties: Record<string, unknown>;
            required?: string[];
        };
    };
}

export const LOG_TOOLS: ToolDefinition[] = [
    {
        type: "function",
        function: {
            name: "grep_log",
            description:
                "Search the FULL log (not just the provided tail) for lines matching a pattern. " +
                "Returns matching lines with their exact 1-based line numbers. " +
                "Use this to find specific exceptions, class names, mod/plugin IDs, stack frames, or any text anywhere in the log.",
            parameters: {
                type: "object",
                properties: {
                    pattern: {
                        type: "string",
                        description:
                            "Search string (case-insensitive substring by default). " +
                            "Set is_regex=true to use a JavaScript regex (no delimiters).",
                    },
                    is_regex: {
                        type: "boolean",
                        description: "Treat pattern as a JS regex. Default false.",
                    },
                    max_results: {
                        type: "number",
                        description: "Max matching lines to return. Default 30, max 100.",
                    },
                },
                required: ["pattern"],
            },
        },
    },
    {
        type: "function",
        function: {
            name: "get_lines",
            description:
                "Fetch a specific range of lines from the log by line number. " +
                "Use when you know the exact area you want to inspect.",
            parameters: {
                type: "object",
                properties: {
                    start: { type: "number", description: "First line to return (1-based, inclusive)." },
                    end:   { type: "number", description: "Last line to return (1-based, inclusive). Max range: 200 lines." },
                },
                required: ["start", "end"],
            },
        },
    },
    {
        type: "function",
        function: {
            name: "get_context",
            description:
                "Get lines surrounding a specific line number. " +
                "Ideal for seeing what surrounds a known error or exception line.",
            parameters: {
                type: "object",
                properties: {
                    line:   { type: "number", description: "Target line number (1-based)." },
                    before: { type: "number", description: "Lines before the target. Default 10, max 50." },
                    after:  { type: "number", description: "Lines after the target. Default 10, max 50." },
                },
                required: ["line"],
            },
        },
    },
    {
        type: "function",
        function: {
            name: "get_log_stats",
            description:
                "Get basic stats about the full log: total line count. " +
                "Call this first when you need to understand the scope of the log.",
            parameters: {
                type: "object",
                properties: {},
                required: [],
            },
        },
    },
];

// -- Tool executor ---------------------------------------------------------------

export interface ToolResultData {
    /** Full content sent back to the AI as the tool result message. */
    content: string;
    /** Short human-readable summary shown in the UI. */
    summary: string;
}

export function executeTool(
    name: string,
    args: Record<string, unknown>,
    logLines: string[],
): ToolResultData {
    switch (name) {
        case "grep_log": {
            const pattern    = String(args.pattern ?? "");
            const isRegex    = Boolean(args.is_regex);
            const maxResults = Math.min(Number(args.max_results ?? 30), 100);
            const matches: { line: number; text: string }[] = [];

            try {
                const re = isRegex ? new RegExp(pattern, "i") : null;
                for (let i = 0; i < logLines.length; i++) {
                    const matched = re
                        ? re.test(logLines[i])
                        : logLines[i].toLowerCase().includes(pattern.toLowerCase());
                    if (matched) {
                        matches.push({ line: i + 1, text: logLines[i] });
                        if (matches.length >= maxResults) break;
                    }
                }
            } catch (e) {
                return { content: `Error: invalid regex "${pattern}": ${e}`, summary: "regex error" };
            }

            if (matches.length === 0) {
                return {
                    content: `No lines match "${pattern}" in the full log (${logLines.length} lines searched).`,
                    summary: "0 matches",
                };
            }

            return {
                content:
                    `Found ${matches.length} match(es) for "${pattern}" (showing up to ${maxResults}):\n\n` +
                    matches.map(m => `${m.line}: ${m.text}`).join("\n"),
                summary: `${matches.length} match${matches.length === 1 ? "" : "es"}`,
            };
        }

        case "get_lines": {
            const start = Math.max(1, Number(args.start ?? 1));
            const end   = Math.min(logLines.length, Math.min(Number(args.end ?? start + 50), start + 199));
            const slice = logLines
                .slice(start - 1, end)
                .map((line, i) => `${start + i}: ${line}`)
                .join("\n");
            return {
                content: `Lines ${start}–${end} (of ${logLines.length} total):\n\n${slice}`,
                summary: `${end - start + 1} lines (${start}–${end})`,
            };
        }

        case "get_context": {
            const target = Number(args.line ?? 1);
            const before = Math.min(Number(args.before ?? 10), 50);
            const after  = Math.min(Number(args.after  ?? 10), 50);
            const start  = Math.max(1, target - before);
            const end    = Math.min(logLines.length, target + after);
            const slice  = logLines
                .slice(start - 1, end)
                .map((line, i) => {
                    const n = start + i;
                    return `${n === target ? ">>>" : "   "} ${n}: ${line}`;
                })
                .join("\n");
            return {
                content: `Context around line ${target} (lines ${start}–${end}):\n\n${slice}`,
                summary: `${end - start + 1} lines around line ${target}`,
            };
        }

        case "get_log_stats": {
            return {
                content: `Total lines: ${logLines.length}\nTotal characters: ${logLines.join("\n").length}`,
                summary: `${logLines.length} lines total`,
            };
        }

        default:
            return { content: `Unknown tool: ${name}`, summary: "unknown tool" };
    }
}

// -- Human-readable call summary (for the UI) ------------------------------------

export function buildCallSummary(name: string, args: Record<string, unknown>): string {
    switch (name) {
        case "grep_log":     return `Searching for "${args.pattern ?? ""}"`;
        case "get_lines":    return `Reading lines ${args.start ?? "?"}–${args.end ?? "?"}`;
        case "get_context":  return `Context around line ${args.line ?? "?"}`;
        case "get_log_stats": return "Checking log size";
        default:             return name;
    }
}