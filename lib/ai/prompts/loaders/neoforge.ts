import { forgeAnalysisContext, forgeChatContext } from "./forge";

// NeoForge is structurally very similar to Forge but has its own namespaces,
// manifest file, and diverges more with each release. We extend the Forge
// context and override the NeoForge-specific details.

export const neoforgeAnalysisContext = `## NeoForge — Loader Context

You are analyzing a **NeoForge** mod loader crash. NeoForge is a fork of Forge; most FML concepts apply but namespace and manifest details differ.

### NeoForge-specific differences from Forge
- Manifest file is \`neoforge.mods.toml\` (not \`mods.toml\`)
- All loader classes are under \`net.neoforged.*\` (not \`net.minecraftforge.*\`) — use this to distinguish stack traces from legacy Forge
- NeoForge ≥1.20.4 bundles \`sponge-mixin\` from the \`net.fabricmc\` org — seeing \`net.fabricmc\` in a stack trace does NOT mean this is a Fabric log
- Dependency blocks in \`neoforge.mods.toml\` use \`[[dependencies.modid]]\` same as Forge

### Key error patterns (same as Forge, NeoForge namespaces)
- \`net.neoforged.fml.ModLoadingException\` — NeoForge failed to load or initialize a mod
- \`Mixin apply failed\` — mixin incompatibility; the named \`*.mixins.json\` maps to the guilty mod
- \`DuplicateModsFoundException\` — two versions of the same mod in \`mods/\`
- \`NoSuchMethodError\` / \`ClassNotFoundException\` — mod built against wrong NeoForge or MC version
- \`Mod File:\` lines — NeoForge names the offending jar directly; prioritize this

### Loading stages
Same order as Forge: LOADING → CONSTRUCT → COMMON_SETUP → SIDED_SETUP → ENQUEUE_IMC → PROCESS_IMC → COMPLETE.

### Useful resources to link when relevant
- NeoForge docs: https://docs.neoforged.net
- NeoForge issue tracker: https://github.com/neoforged/NeoForge/issues
- Modrinth (NeoForge mods): https://modrinth.com/mods?g=categories%3Aneoforge
- CurseForge: https://www.curseforge.com/minecraft/mc-mods`;

export const neoforgeContext = neoforgeAnalysisContext; // alias for backwards compat

export const neoforgeChatContext = `## NeoForge context

This is a **NeoForge** modded Minecraft instance. NeoForge is a Forge fork — same FML concepts, different namespaces.

Key NeoForge differences:
- Manifest is \`neoforge.mods.toml\` (not \`mods.toml\`)
- Stack traces use \`net.neoforged.*\` not \`net.minecraftforge.*\`
- \`net.fabricmc\` appearing in traces = sponge-mixin bundled by NeoForge, NOT Fabric
- Mods folder, dependency blocks, and loading stages are the same as Forge

Suggest Modrinth (https://modrinth.com/mods) or CurseForge (https://www.curseforge.com/minecraft/mc-mods) for version compatibility checks.`;