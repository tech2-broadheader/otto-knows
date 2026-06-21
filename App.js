// Monorepo entry shim. In a pnpm hoisted workspace, Expo's
// node_modules/expo/AppEntry.js (at the repo root) does `import App from '../../App'`,
// which resolves to THIS file at the repo root. Re-export the real mobile App so
// the app loads whether Metro enters via apps/mobile/index.ts (the `main` field)
// or falls back to expo/AppEntry. Mirrors index.ts (gesture-handler import first).
import "react-native-gesture-handler";
export { default } from "./apps/mobile/App";
