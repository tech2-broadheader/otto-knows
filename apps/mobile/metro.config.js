// Monorepo-aware Metro config for Expo in a pnpm workspace.
// See https://docs.expo.dev/guides/monorepos/
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// 1. Watch the whole workspace so changes in /packages are picked up.
config.watchFolders = [workspaceRoot];

// 2. Resolve modules from the app first, then the workspace root.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

// 3. pnpm uses symlinks; let Metro follow them.
config.resolver.unstable_enableSymlinks = true;

// 4. Wrap with NativeWind (Tailwind for RN) — global.css holds the directives.
module.exports = withNativeWind(config, { input: "./global.css" });
