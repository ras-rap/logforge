import { LoaderModule } from "./base";
import { forgeModule, detectModsForge, detectSuspectModsForge, detectCauseForge } from "./forge";

function detectCause(log: string): string | undefined {
    // NeoForge mod loading errors reference net.neoforged.* namespaces specifically
    const neoLoadError = log.match(/net\.neoforged\.fml\.[\w.]*?(?:Error|Exception)[^\n]*/i);
    if (neoLoadError) return neoLoadError[0].trim();

    return detectCauseForge(log);
}

function detectMods(log: string): string[] {
    const mods = new Set(detectModsForge(log));

    // "neoforge.mods.toml" manifest references — same shape as forge.mods.toml but its own marker
    const tomlRefs = log.matchAll(/([a-z0-9_-]{2,40})[/\\]neoforge\.mods\.toml/gi);
    for (const match of tomlRefs) mods.add(match[1].toLowerCase());

    return [...mods];
}

export const neoforgeModule: LoaderModule = {
    detectCause,
    detectMods,
    detectSuspectMods: (log, mods) => detectSuspectModsForge(log, mods),
};

// re-export for completeness / symmetry with forge.ts
export { forgeModule };