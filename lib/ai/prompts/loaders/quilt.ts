export const quiltAnalysisContext = `## Quilt — Loader Context

You are analyzing a **Quilt** mod loader crash. Quilt is a fork of Fabric; most Fabric concepts apply but Quilt has its own loader, manifest format, and standard library.

### Quilt-specific differences from Fabric
- Manifest file is \`quilt.mod.json\` (Quilt mods) or \`fabric.mod.json\` (Fabric mods, which Quilt can also load)
- Quilt Loader classes are under \`org.quiltmc.loader.*\` (not \`net.fabricmc.loader.*\`)
- Quilt Standard Libraries (QSL) replace Fabric API for native Quilt mods — but Fabric API can run via the Quilted Fabric API (QFAPI) compatibility layer
- Quilted Fabric API (QFAPI) must be installed if running Fabric mods on Quilt — if it's missing, Fabric-API-dependent mods will fail

### Key error patterns
- \`Mixin apply failed\` — same as Fabric; \`*.mixins.json\` maps to the guilty mod
- \`Could not find required mod:\` / \`Incompatible mod set!\` — Quilt's dep resolver; read the listed requirements carefully
- \`org.quiltmc.loader.*Exception\` — Quilt Loader-level failure
- \`ClassNotFoundException\` referencing \`net.fabricmc.fabric.api.*\` — Fabric API is being called but QFAPI isn't installed
- Mixed Quilt-native and Fabric mods can cause subtle mixin conflicts — note if the mixin target is a QSL or Fabric API class

### Useful resources to link when relevant
- Quilt docs: https://quiltmc.org/en/usage/
- Modrinth (Quilt mods): https://modrinth.com/mods?g=categories%3Aquilt
- QFAPI (Quilted Fabric API): https://modrinth.com/mod/qsl
- Quilt Discord: https://discord.quiltmc.org`;

export const quiltChatContext = `## Quilt context

This is a **Quilt** modded Minecraft instance. Quilt is a Fabric fork that can also load Fabric mods.

Key Quilt differences:
- Quilt mods use \`quilt.mod.json\`; Fabric mods use \`fabric.mod.json\` (both work)
- Quilt Loader = \`org.quiltmc.loader.*\`; Fabric Loader = \`net.fabricmc.loader.*\`
- Fabric API calls need Quilted Fabric API (QFAPI) installed — if missing, Fabric-API-dependent mods crash
- QSL (Quilt Standard Libraries) is the native equivalent of Fabric API

Suggest Modrinth for mod pages and confirm QFAPI is installed when Fabric mods are in use.`;