import { defineConfig } from "vite";

export default defineConfig((config) => ({
  build: {
    target: "esnext",
    manifest: !config.ssrBuild,
    rollupOptions: {
      input: {
        index: "./src/client.ts",
      },
    },
  },
}));
