import { SuspectMod } from "../types";
import { LoaderModule, GENERIC_BLACKLIST, detectCauseGeneric, scoreMods } from "./base";

export const FORGE_IGNORE = new Set([...GENERIC_BLACKLIST, "fmlloader", "fmlcore", "javafmllanguage", "mclanguage"]);

export function detectModsForge(log: string): string[] {
    const mods = new Set<string>();
    const lines = log.split("\n");

    for (const line of lines) {
        const clean = line.trim().replace(/^[-|\\ ]+/, "");

        // FML mod list table row: "Active        | farmersdelight        | Farmer's Delight | 1.2.3 | ..."
        const tableRow = clean.match(/^\|?\s*\w+\s*\|\s*([a-z0-9_]{2,40})\s*\|/i);
        if (tableRow) mods.add(tableRow[1].toLowerCase());

        // "mods/farmersdelight-1.20.1-1.2.3.jar"
        const jarPath = clean.match(/mods[/\\]([a-z0-9_-]{2,40})-[\d.]/i);
        if (jarPath) mods.add(jarPath[1].toLowerCase());

        // bare jar filename fallback
        const jar = clean.match(/^([a-z0-9_-]{2,40})-\d/i);
        if (jar) mods.add(jar[1].toLowerCase());

        // "ModID: farmersdelight" / "modid=farmersdelight"
        const modid = clean.match(/mod\s*id[=:\s]+([a-z0-9_-]+)/i);
        if (modid) mods.add(modid[1].toLowerCase());

        // bare mod-list entry lines (FML's "- modid")
        if (/^[a-z0-9_ -]{3,50}$/i.test(clean)) {
            const id = clean.split(" ")[0].toLowerCase();
            if (!id.includes(".")) mods.add(id);
        }
    }

    return [...mods].filter((id) => !GENERIC_BLACKLIST.has(id));
}

export function detectCauseForge(log: string): string | undefined {
    // FML crash reports usually name the offending mod explicitly.
    const modLoadError = log.match(/Mod File:\s*\S*?([a-z0-9_-]{2,40})[-_][\d.]+\.jar/i);
    const wrapped = log.match(/Caused by:.*?\n.*?at\s+([a-z0-9_.]+)\.mod(?:s)?\./i);

    if (modLoadError) return `Failed loading mod file (${modLoadError[1]})`;
    if (wrapped) return wrapped[0].split("\n")[0]?.trim();

    return detectCauseGeneric(log);
}

export function forgeScoreRules() {
    return [
        {
            test: (id: string, t: string) => t.includes("mixin apply failed") && t.includes(id),
            points: 15,
            reason: "Mixin compatibility issue",
        },
        {
            test: (id: string, t: string) =>
                (t.includes("classnotfoundexception") || t.includes("noclassdeffounderror")) && t.includes(id),
            points: 15,
            reason: "Missing class reference",
        },
        {
            test: (id: string, t: string) =>
                t.includes(id) &&
                (t.includes("outdated") || t.includes("requires") || t.includes("dependency") || t.includes("newer version") || t.includes("incompatible")),
            points: 20,
            reason: "Version/dependency mismatch",
        },
        {
            test: (id: string, t: string) => t.includes("mod file") && t.includes(id),
            points: 25,
            reason: "Failed to load mod file",
        },
        {
            test: (id: string, t: string) => t.includes(id),
            points: 10,
            reason: "Referenced in crash",
        },
    ];
}

export function detectSuspectModsForge(log: string, mods: string[]): SuspectMod[] {
    const suspects = scoreMods(log, mods, forgeScoreRules(), FORGE_IGNORE);

    // legacy known-bad pairing kept from original heuristics
    const lower = log.toLowerCase();
    for (const word of ["hardcore_torches", "farmersdelight"]) {
        if (lower.includes(word) && !suspects.find((s) => s.name === word)) {
            suspects.push({ name: word, reason: "Referenced in crash log", confidence: 90 });
        }
    }

    return suspects.slice(0, 5);
}

export const forgeModule: LoaderModule = {
    detectCause: detectCauseForge,
    detectMods: detectModsForge,
    detectSuspectMods: detectSuspectModsForge,
};