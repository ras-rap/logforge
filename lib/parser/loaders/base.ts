import { LogEntry, SuspectMod } from "../types";

export interface LoaderModule {
    /** Loader-specific crash cause line. Falls back to generic detectCause() if undefined. */
    detectCause(log: string): string | undefined;
    /** Loader-specific mod/plugin id extraction. */
    detectMods(log: string): string[];
    /** Loader-specific suspect scoring, given the mods/plugins already found. */
    detectSuspectMods(log: string, mods: string[]): SuspectMod[];
}

export const GENERIC_BLACKLIST = new Set([
    "minecraft",
    "forge",
    "neoforge",
    "fabric",
    "quilt",
    "paper",
    "spigot",
    "bukkit",
    "purpur",
    "folia",
    "java",
    "client",
    "server",
    "common",
    "loader",
    "mod",
    "mods",
    "plugin",
    "plugins",
    "version",
    "environment",
    "mixin",
    "mixinextras",
    "mixinsquared",
    "connector",
    "json",
    "gson",
    "fmlearlywindow",
    "modlauncher",
    "net",
    "com",
    "org",
]);

export function detectVersion(log: string): string | undefined {
    const patterns = [
        /Minecraft\s*Version[:\s]+([0-9.]+)/i,
        /minecraft@([0-9.]+)/i,
        /Minecraft\s+([0-9]+\.[0-9.]+)/i,
        /mc_version[=: ]+([0-9.]+)/i,
        /This server is running .*?version.*?\(MC:\s*([0-9.]+)\)/i, // paper-family /version output
    ];

    for (const pattern of patterns) {
        const match = log.match(pattern);
        if (match) return match[1];
    }

    return undefined;
}

export function detectJava(log: string): string | undefined {
    const match = log.match(/Java Version[:\s]+(.+)/i);
    return match?.[1]?.trim();
}

/** Generic "Caused by:" + first Exception fallback. Loader modules can override with smarter logic. */
export function detectCauseGeneric(log: string): string | undefined {
    const lines = log.split("\n");
    let causedBy = "";

    for (const line of lines) {
        if (line.includes("Caused by:")) {
            causedBy = line.replace("Caused by:", "").trim();
        }
    }

    if (causedBy) return causedBy;

    const exception = log.match(/([\w.$]+Exception)/);
    return exception?.[1];
}

export function collectMessages(log: string): { errors: LogEntry[]; warnings: LogEntry[] } {
    const errors: LogEntry[] = [];
    const warnings: LogEntry[] = [];

    log.split("\n").forEach((line, index) => {
        const lower = line.toLowerCase();

        if (lower.includes("error") || lower.includes("exception") || lower.includes("crash")) {
            errors.push({ level: "error", line: index + 1, text: line });
        }

        if (lower.includes("warn")) {
            warnings.push({ level: "warn", line: index + 1, text: line });
        }
    });

    return { errors, warnings };
}

export function collectStackTrace(log: string): string[] {
    return log
        .split("\n")
        .filter((line) => line.trim().startsWith("at "))
        .slice(0, 50);
}

export function computeImportantLines(log: string, errors: LogEntry[]): number[] {
    const diagnosticLines = log.split("\n").reduce((acc, line, i) => {
        const lower = line.toLowerCase();
        if (
            lower.includes("minecraft version:") ||
            lower.includes("java version:") ||
            lower.includes("loading mod") ||
            lower.includes("base mod") ||
            lower.includes("enabling ") ||
            lower.includes("caused by:")
        ) {
            acc.push(i + 1);
        }
        return acc;
    }, [] as number[]);

    return [...errors.map((x) => x.line), ...diagnosticLines].filter((v, i, a) => a.indexOf(v) === i);
}

/** Last N lines of the log, lowercased — the window most scoring heuristics look at. */
export function tail(log: string, lines = 150): string {
    return log.split("\n").slice(-lines).join("\n").toLowerCase();
}

interface ScoreRule {
    /** Adds points + sets reason when this predicate matches a given mod id against the tail window. */
    test: (id: string, tailLower: string) => boolean;
    points: number;
    reason: string;
}

/**
 * Shared scoring engine. Each loader module supplies its own rule set
 * (different mixin/classloading vocab per loader) plus an ignore list.
 */
export function scoreMods(
    log: string,
    mods: string[],
    rules: ScoreRule[],
    ignore: Set<string> = new Set()
): SuspectMod[] {
    const suspects = new Map<string, SuspectMod & { score: number }>();
    const tailLower = tail(log);

    for (const mod of mods) {
        const id = mod.toLowerCase();
        if (ignore.has(id)) continue;

        let score = 0;
        let reason = "";

        for (const rule of rules) {
            if (rule.test(id, tailLower)) {
                score += rule.points;
                reason = rule.reason;
            }
        }

        if (score > 0) {
            suspects.set(id, {
                name: mod,
                reason,
                score,
                confidence: Math.min(score * 10, 100),
            });
        }
    }

    return [...suspects.values()]
        .sort((a, b) => b.score - a.score)
        .slice(0, 5)
        .map((x) => ({ name: x.name, reason: x.reason, confidence: x.confidence }));
}

export function isBadModId(id: string): boolean {
    return GENERIC_BLACKLIST.has(id);
}