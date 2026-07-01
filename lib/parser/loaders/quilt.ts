import { LoaderModule } from "./base";
import { fabricModule, detectModsFabric, detectSuspectModsFabric, detectCauseFabric } from "./fabric";

function detectMods(log: string): string[] {
    const mods = new Set(detectModsFabric(log));

    // "quilt.mod.json" manifest references
    const qmjRefs = log.matchAll(/([a-z0-9_-]{2,40})[/\\]quilt\.mod\.json/gi);
    for (const match of qmjRefs) mods.add(match[1].toLowerCase());

    return [...mods];
}

function detectCause(log: string): string | undefined {
    const quiltLoaderError = log.match(/org\.quiltmc\.loader\.[\w.]*?(?:Error|Exception)[^\n]*/i);
    if (quiltLoaderError) return quiltLoaderError[0].trim();

    return detectCauseFabric(log);
}

export const quiltModule: LoaderModule = {
    detectCause,
    detectMods,
    detectSuspectMods: (log, mods) => detectSuspectModsFabric(log, mods),
};

export { fabricModule };