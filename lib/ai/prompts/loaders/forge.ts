export const forgeAnalysisContext = `## Forge (FML) — Loader Context

You are analyzing a **Forge (FML)** mod loader crash. Addons are called **mods**, declared in \`mods.toml\` inside the mod jar.

### Key error patterns to check first
- \`LoaderException\` / \`ModLoadingException\` — FML failed to load or initialize a mod. The mod ID and failing stage (LOADING, CONSTRUCT, COMMON_SETUP, etc.) are usually named.
- \`Mixin apply failed\` — a mixin from one mod is incompatible with another mod's class or with the Minecraft version. Check which mixin config is named (\`*.mixins.json\`).
- \`DuplicateModsFoundException\` — two versions of the same mod are in the \`mods/\` folder. Remove the older one.
- \`NoSuchMethodError\` / \`ClassNotFoundException\` — usually a mod built against a different Forge or Minecraft version, or a missing dependency.
- \`Mod File:\` lines in the crash report — FML names the offending jar file directly. This is the most reliable signal; prioritize it.
- Crash report header block (\`---- Minecraft Crash Report ----\`) — always check the \`Description:\` and \`Caused by:\` lines at the top.

### Dependency and compatibility
Forge mods declare their dependencies in \`mods.toml\` under \`[[dependencies.modid]]\`. A mismatch between \`versionRange\` and the installed version causes a hard failure at startup. When a dependency error is present, list the required vs. installed versions explicitly.

FML mod-loading stages in order: LOADING → CONSTRUCT → COMMON_SETUP → SIDED_SETUP → ENQUEUE_IMC → PROCESS_IMC → COMPLETE. The stage named in the error tells you how far the mod got.

### Useful resources to link when relevant
- CurseForge (mod pages): https://www.curseforge.com/minecraft/mc-mods
- Modrinth: https://modrinth.com/mods
- Forge issue tracker: https://github.com/MinecraftForge/MinecraftForge/issues
- Forge user support: https://forums.minecraftforge.net`;

export const forgeChatContext = `## Forge (FML) context

This is a **Forge** modded Minecraft instance. Addons are **mods** in the \`mods/\` folder, declared with \`mods.toml\`.

Key things to know:
- FML crash reports name the offending mod jar in \`Mod File:\` lines — look there first
- Mixin failures name the \`*.mixins.json\` config, which maps 1:1 to a mod
- \`DuplicateModsFoundException\` = two versions of same mod in mods folder
- Loading stages: LOADING → CONSTRUCT → COMMON_SETUP → SIDED_SETUP → COMPLETE
- Dependencies declared in \`mods.toml\` \`[[dependencies]]\` blocks

Suggest checking mod pages on CurseForge (https://www.curseforge.com/minecraft/mc-mods) or Modrinth (https://modrinth.com/mods) for version compatibility.`;