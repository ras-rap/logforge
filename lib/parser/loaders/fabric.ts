import { SuspectMod } from "../types";
import { LoaderModule, GENERIC_BLACKLIST, detectCauseGeneric, scoreMods } from "./base";

export const FABRIC_IGNORE = new Set([...GENERIC_BLACKLIST, "knot", "intermediary", "fabricloader"]);

export function detectModsFabric(log: string): string[] {
    const mods = new Set<string>();
    const lines = log.split("\n");

    for (const line of lines) {
        const clean = line.trim().replace(/^[-|\\ ]+/, "");

        // Fabric's mod list dump: "	- modid 1.2.3"
        const listEntry = clean.match(/^-\s*([a-z0-9_-]{2,40})\s+[\d.]/i);
        if (listEntry) mods.add(listEntry[1].toLowerCase());

        // "mods/sodium-fabric-0.5.jar"
        const jarPath = clean.match(/mods[/\\]([a-z0-9_-]{2,40})(?:-fabric)?-[\d.]/i);
        if (jarPath) mods.add(jarPath[1].toLowerCase());

        // fabric.mod.json references in stack traces
        const fmj = clean.match(/([a-z0-9_-]{2,40})[/\\]fabric\.mod\.json/i);
        if (fmj) mods.add(fmj[1].toLowerCase());

        // "modid=" fallback
        const modid = clean.match(/modid[=: ]+([a-z0-9_-]+)/i);
        if (modid) mods.add(modid[1].toLowerCase());
    }

    return [...mods].filter((id) => !GENERIC_BLACKLIST.has(id));
}

export function detectCauseFabric(log: string): string | undefined {
    // Fabric mixin crash reports name the target mixin config, which usually maps 1:1 to a mod id.
    const mixinFail = log.match(/Mixin apply failed[^\n]*?([a-z0-9_-]{2,40})\.mixins\.json/i);
    if (mixinFail) return `Mixin apply failed (${mixinFail[1]})`;

    const knotError = log.match(/net\.fabricmc\.loader\.[\w.]*?(?:Error|Exception)[^\n]*/i);
    if (knotError) return knotError[0].trim();

    return detectCauseGeneric(log);
}

export function fabricScoreRules() {
    return [
        {
            test: (id: string, t: string) => t.includes("mixin apply failed") && t.includes(id),
            points: 20,
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
                t.includes(id) && (t.includes("requires") || t.includes("incompatible") || t.includes("breaks") || t.includes("conflicts")),
            points: 20,
            reason: "Dependency/version conflict",
        },
        {
            test: (id: string, t: string) => t.includes(id),
            points: 10,
            reason: "Referenced in crash",
        },
    ];
}

export function detectSuspectModsFabric(log: string, mods: string[]): SuspectMod[] {
    return scoreMods(log, mods, fabricScoreRules(), FABRIC_IGNORE);
}

export const fabricModule: LoaderModule = {
    detectCause: detectCauseFabric,
    detectMods: detectModsFabric,
    detectSuspectMods: detectSuspectModsFabric,
};