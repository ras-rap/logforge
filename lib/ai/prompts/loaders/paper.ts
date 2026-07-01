export const paperAnalysisContext = `## Paper/Bukkit/Spigot/Purpur/Folia — Loader Context

You are analyzing a **plugin-based** Minecraft server. The addons are called **plugins**, not mods. They are loaded from the \`plugins/\` folder and declared in \`plugin.yml\`.

### Key error patterns to check first
- \`Could not pass event <Event> to <PluginName>\` — a plugin's event handler threw. The named plugin is almost always the culprit.
- \`Could not pass command\` / \`Error occurred while enabling <PluginName>\` — command or lifecycle crash. Check the plugin version against the server version.
- \`Caused by: java.lang.NoSuchMethodError\` or \`NoClassDefFoundError\` — a plugin is calling a Bukkit/Paper API method that doesn't exist in this server version. Usually means the plugin is too new or too old for the server.
- \`Plugin X requires plugin Y\` / \`depends on unknown plugin\` — missing plugin dependency. Check \`plugin.yml\` \`depend:\` and \`softdepend:\` fields.
- \`Unsupported API version\` — the plugin's \`api-version\` in \`plugin.yml\` is higher than the server supports.
- \`Cannot run synchronous code\` / \`must run on the region's thread\` (Folia only) — a plugin is calling sync Bukkit API from an async or region-threaded context, which is illegal on Folia.

### Dependency and compatibility
Paper API version aligns with the Minecraft version (e.g. Paper 1.21.1). When a plugin targets a newer API version than the running server, it will fail to enable. Suggest checking the plugin's \`api-version\` field and comparing against \`/version\` output.

For Folia specifically: most Bukkit/Spigot/Paper plugins are NOT Folia-compatible unless explicitly stated. Recommend checking the plugin's Folia support status.

### Useful resources to link when relevant
- Paper docs: https://docs.papermc.io
- SpigotMC plugin page (when a specific plugin is suspect): https://www.spigotmc.org/resources/
- Hangar (Paper's plugin repository): https://hangar.papermc.io
- Folia compatibility info: https://github.com/PaperMC/Folia`;

export const paperChatContext = `## Paper/Bukkit context

This is a **plugin-based** Minecraft server (Paper/Spigot/Purpur/Folia). Addons are **plugins** loaded from \`plugins/\` with \`plugin.yml\` descriptors.

Key things to know:
- Event crashes name the guilty plugin: \`Could not pass event X to PluginName\`
- Folia adds region-threading rules that most plugins violate
- API version in \`plugin.yml\` must not exceed the server version
- Missing dependencies are declared in \`plugin.yml\` \`depend:\` field

When asked about fixing an issue, suggest checking plugin versions on SpigotMC (https://www.spigotmc.org/resources/) or Hangar (https://hangar.papermc.io) first.`;