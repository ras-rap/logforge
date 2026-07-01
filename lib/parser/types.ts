export type Loader =
    | "vanilla"
    | "fabric"
    | "quilt"
    | "forge"
    | "neoforge"
    | "paper"
    | "purpur"
    | "folia"
    | "spigot"
    | "bukkit"
    | "unknown";

// Which family of addon the loader uses. Paper-family servers load
// "plugins", everything else loads "mods". Used to drive UI copy
// (e.g. "Suspected Plugins" vs "Suspected Mods") without re-detecting.
export type Platform = "mod" | "plugin" | "vanilla";

export type LogLevel = "info" | "warn" | "error";

export interface LogEntry {
    level: LogLevel;
    line: number;
    text: string;
}

export interface ParsedLog {
    loader: Loader;
    platform: Platform;

    minecraftVersion?: string;
    javaVersion?: string;
    crashCause?: string;

    mods: string[];
    suspectMods: SuspectMod[];

    errors: LogEntry[];
    warnings: LogEntry[];
    stackTrace: string[];
    importantLines: number[];

    raw: string;
}

export interface SuspectMod {
    name: string;
    reason: string;
    confidence: number;
}

export interface AiAnnotation {
    line: number;
    comment: string;
}

export interface AiAnalysis {
    explanation: string;
    steps: string[];
    links: { title: string; url: string }[];
    snippets: { file: string; content: string }[];
    annotations: AiAnnotation[];
}