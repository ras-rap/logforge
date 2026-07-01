export const fabricAnalysisContext = `## Fabric — Loader Context

You are analyzing a **Fabric** mod loader crash. Addons are called **mods**, declared in \`fabric.mod.json\` inside the mod jar.

### Key error patterns to check first
- \`Mixin apply failed\` — the most common Fabric crash. The named \`*.mixins.json\` file maps directly to a mod ID. The target class name tells you which other mod or vanilla class is in conflict.
- \`Could not find required mod:\` / \`Incompatible mod set!\` — Fabric Loader's dependency resolver failed. It lists exactly which mod requires what version of which other mod. Read this block carefully — it is the root cause.
- \`net.fabricmc.loader.api.SemanticVersionParsingException\` — a mod's version string in \`fabric.mod.json\` doesn't follow semver. Usually a poorly-packaged mod.
- \`ClassNotFoundException\` / \`NoClassDefFoundError\` — a mod references a class from another mod that isn't installed, or targets a different Minecraft/Fabric API version.
- Knot classloader errors (\`net.fabricmc.loader.impl.launch.knot.*\`) — loader-level failure, often caused by a mod using Java internals that aren't accessible.
- \`fabric.mod.json parse error\` — malformed mod descriptor; the mod is probably corrupted or from the wrong game version.

### Dependency and compatibility
Fabric mods declare deps in \`fabric.mod.json\` under the \`"depends"\` key with semver ranges. Fabric API itself is a separate mod (\`fabric-api\`) and must match the Minecraft version. When a dependency error is shown, list the required range vs. installed version.

The Fabric Loader version is separate from the Fabric API version — both matter. Loader version is shown at startup (\`Loading Fabric Loader x.y.z\`).

### Useful resources to link when relevant
- Modrinth (Fabric mods): https://modrinth.com/mods?g=categories%3Afabric
- Fabric wiki: https://fabricmc.net/wiki
- Fabric issue tracker: https://github.com/FabricMC/fabric-loader/issues
- Fabric Discord: https://discord.gg/v6v4pMv`;

export const fabricChatContext = `## Fabric context

This is a **Fabric** modded Minecraft instance. Mods are in \`mods/\` with \`fabric.mod.json\` descriptors.

Key things to know:
- \`Incompatible mod set!\` = Fabric's dep resolver failed; the error message lists exactly what's missing/conflicting
- Mixin failures name the \`*.mixins.json\` config, which maps to the mod causing the conflict
- Fabric API (\`fabric-api\`) is a separate mod and must match the MC version
- Fabric Loader version ≠ Fabric API version — both shown at startup

Suggest Modrinth (https://modrinth.com/mods?g=categories%3Afabric) for mod version compatibility.`;