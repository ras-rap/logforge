import { SuspectMod } from "../types";
import { LoaderModule, GENERIC_BLACKLIST, detectCauseGeneric, scoreMods, tail } from "./base";

const PAPER_IGNORE = new Set([...GENERIC_BLACKLIST, "craftbukkit", "vault", "luckperms"]);

function detectPlugins(log: string): string[] {
    const plugins = new Set<string>();
    const lines = log.split("\n");

    for (const line of lines) {
        const clean = line.trim();

        // "[12:34:56 INFO]: Loading PluginName v1.2.3"
        const loading = clean.match(/Loading\s+([A-Za-z0-9_-]{2,40})\s+v[\d.]/i);
        if (loading) plugins.add(loading[1].toLowerCase());

        // "[12:34:56 INFO]: Enabling PluginName v1.2.3"
        const enabling = clean.match(/Enabling\s+([A-Za-z0-9_-]{2,40})\s+v[\d.]/i);
        if (enabling) plugins.add(enabling[1].toLowerCase());

        // bracket-tagged log lines: "[EssentialsX] message", "[Vault] message"
        const tag = clean.match(/^\[(?:\d{2}:\d{2}:\d{2}\s+\w+\]\s*)?\[([A-Za-z0-9_-]{2,40})\]/);
        if (tag) {
            const id = tag[1].toLowerCase();
            if (!GENERIC_BLACKLIST.has(id) && !/^\d+$/.test(id)) plugins.add(id);
        }

        // "plugins/PluginName.jar"
        const jarPath = clean.match(/plugins[/\\]([a-z0-9_-]{2,40})(?:-[\d.]+)?\.jar/i);
        if (jarPath) plugins.add(jarPath[1].toLowerCase());

        // "Could not pass event X to PluginName"
        const eventCrash = clean.match(/to\s+([A-Za-z0-9_-]{2,40})\s*$/);
        if (clean.includes("Could not pass event") && eventCrash) {
            plugins.add(eventCrash[1].toLowerCase());
        }

        // "Could not pass command X to PluginName" / executor crashes
        const cmdCrash = clean.match(/Could not pass (?:command|tab-complete)[^\n]*to\s+([A-Za-z0-9_-]{2,40})/i);
        if (cmdCrash) plugins.add(cmdCrash[1].toLowerCase());
    }

    return [...plugins].filter((id) => !GENERIC_BLACKLIST.has(id));
}

function detectCause(log: string): string | undefined {
    // Most actionable Bukkit-family signal: which plugin a handler crashed in.
    const eventCrash = log.match(/Could not pass event \S+ to (\S+)/);
    if (eventCrash) return `Plugin handler crash in ${eventCrash[1]}`;

    const cmdCrash = log.match(/Could not pass command [^\n]*to (\S+)/);
    if (cmdCrash) return `Command handler crash in ${cmdCrash[1]}`;

    // Folia region-thread violations are a distinct, very common failure mode.
    if (log.includes("Cannot run synchronous code") || log.includes("must run on the region's thread")) {
        return "Region-thread violation (Folia threading constraint)";
    }

    return detectCauseGeneric(log);
}

function detectSuspectMods(log: string, plugins: string[]): SuspectMod[] {
    const tailLower = tail(log);

    return scoreMods(
        log,
        plugins,
        [
            {
                test: (id, t) => t.includes(`could not pass event`) && t.includes(id),
                points: 30,
                reason: "Event handler threw during dispatch",
            },
            {
                test: (id, t) => t.includes(`could not pass command`) && t.includes(id),
                points: 25,
                reason: "Command handler crash",
            },
            {
                test: (id, t) => t.includes(id) && (t.includes("classnotfoundexception") || t.includes("noclassdeffounderror")),
                points: 15,
                reason: "Missing class reference",
            },
            {
                test: (id, t) =>
                    t.includes(id) &&
                    (t.includes("unsupported api-version") || t.includes("incompatible") || t.includes("requires")),
                points: 20,
                reason: "Plugin API version mismatch",
            },
            {
                test: (id, t) => t.includes("must run on the region's thread") && t.includes(id),
                points: 25,
                reason: "Folia region-thread violation",
            },
            {
                test: (id, t) => t.includes(id),
                points: 5,
                reason: "Referenced near crash",
            },
        ],
        PAPER_IGNORE
    );
}

export const paperModule: LoaderModule = {
    detectCause,
    detectMods: detectPlugins,
    detectSuspectMods,
};