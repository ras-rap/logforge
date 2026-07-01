import { Loader, ParsedLog, Platform } from "./types";
import { LoaderModule, detectVersion, detectJava, detectCauseGeneric, collectMessages, collectStackTrace, computeImportantLines } from "./loaders/base";
import { paperModule } from "./loaders/paper";
import { forgeModule } from "./loaders/forge";
import { neoforgeModule } from "./loaders/neoforge";
import { fabricModule } from "./loaders/fabric";
import { quiltModule } from "./loaders/quilt";

const genericModule: LoaderModule = {
    detectCause: detectCauseGeneric,
    detectMods: () => [],
    detectSuspectMods: () => [],
};

function detectLoader(log: string): Loader {
    const lower = log.toLowerCase();

    // Checked in priority order — most specific markers first.
    //
    // NeoForge must come before Fabric: NeoForge ≥1.20.4 bundles sponge-mixin
    // from the net.fabricmc org, so "net.fabricmc" appears in NeoForge logs.
    // We tighten the Fabric match to "net.fabricmc.loader" (the Fabric Loader
    // namespace) and "fabric loader" (its startup banner) so sponge-mixin alone
    // doesn't trigger a false-positive.
    if (lower.includes("neoforge")) return "neoforge";
    if (lower.includes("quilt loader") || lower.includes("org.quiltmc") || lower.includes("quilt.mod.json")) return "quilt";
    if (lower.includes("fabric loader") || lower.includes("net.fabricmc.loader")) return "fabric";
    if (lower.includes("forge") || lower.includes("fml")) return "forge";

    // Bare "folia" false-positives on Paper servers with FoliaLib/FoliaScheduler plugins.
    // Match Folia's actual startup markers instead.
    if (
        lower.includes("this server is running folia") ||
        lower.includes("io.papermc.paper.threadedregions")
    ) return "folia";
    if (lower.includes("purpur")) return "purpur";
    if (lower.includes("paper")) return "paper";
    if (lower.includes("spigot")) return "spigot";
    if (lower.includes("craftbukkit") || lower.includes("bukkit")) return "bukkit";

    return "unknown";
}

function getPlatform(loader: Loader): Platform {
    if (["paper", "purpur", "folia", "spigot", "bukkit"].includes(loader)) return "plugin";
    if (loader === "vanilla" || loader === "unknown") return "vanilla";
    return "mod";
}

function getLoaderModule(loader: Loader): LoaderModule {
    switch (loader) {
        case "paper":
        case "purpur":
        case "folia":
        case "spigot":
        case "bukkit":
            return paperModule;
        case "fabric":
            return fabricModule;
        case "quilt":
            return quiltModule;
        case "forge":
            return forgeModule;
        case "neoforge":
            return neoforgeModule;
        default:
            return genericModule;
    }
}

export function parseMinecraftLog(raw: string): ParsedLog {
    const loader = detectLoader(raw);
    const platform = getPlatform(loader);
    const mod = getLoaderModule(loader);

    const messages = collectMessages(raw);
    const mods = mod.detectMods(raw);

    return {
        loader,
        platform,

        minecraftVersion: detectVersion(raw),
        javaVersion: detectJava(raw),
        crashCause: mod.detectCause(raw),

        mods,
        suspectMods: mod.detectSuspectMods(raw, mods),

        errors: messages.errors,
        warnings: messages.warnings,
        stackTrace: collectStackTrace(raw),
        importantLines: computeImportantLines(raw, messages.errors),

        raw,
    };
}