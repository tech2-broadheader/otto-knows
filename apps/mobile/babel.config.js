module.exports = function (api) {
  api.cache(true);
  return {
    // NativeWind v4 on Expo SDK 54: babel-preset-expo and `nativewind/babel` BOTH
    // register a JSX transform (one routing to "nativewind", one to
    // "react-native-css-interop"); the collision makes Babel fall back to plain
    // react/jsx-runtime, so className is never wired and nothing is styled.
    // Fix: keep a single JSX transform (expo → "nativewind") and add ONLY
    // NativeWind's className-extraction plugin instead of the whole preset.
    presets: [["babel-preset-expo", { jsxImportSource: "nativewind" }]],
    plugins: [
      require("react-native-css-interop/dist/babel-plugin").default,
      // NativeWind's engine (css-interop) require()s react-native-reanimated on the
      // render path, and reanimated 4 needs its worklets babel plugin. nativewind/babel
      // used to add this; we dropped that preset to fix the JSX conflict, so add it back.
      // Must be LAST.
      "react-native-worklets/plugin",
    ],
  };
};
