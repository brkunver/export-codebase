import { defineConfig } from "tsup"

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true, // Generate TypeScript definition files
  sourcemap: true, // Generate sourcemaps
  clean: true, // Clean the dist directory before building
  splitting: false, // Keep output as a single file for CLI simplicity
  treeshake: true,
  banner: {
    js: "#!/usr/bin/env node", // Add shebang
  },
  external: [
    "fsevents", // Optional macOS dependency, good to externalize
  ],
  minify: true, // Set to true for smaller production builds if desired
  target: "node18", // Target Node.js version
})
