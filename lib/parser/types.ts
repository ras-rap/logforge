export type Loader =
    | "vanilla"
    | "fabric"
    | "forge"
    | "neoforge"
    | "quilt"
    | "paper"
    | "purpur"
    | "spigot"
    | "bukkit"
    | "unknown";


export type LogLevel =
    | "info"
    | "warn"
    | "error";


export interface LogEntry {
    level: LogLevel;
    line: number;
    text: string;
}


export interface ParsedLog {

    loader: Loader;

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
    name:string;
    reason:string;
    confidence:number;
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