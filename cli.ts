import { mkdir, readFile, rm, writeFile } from "fs/promises";
import path from "path";
import { Manifest } from "vite";
import { PluginOption, build } from "vite";

async function buildCmd() {
  const outDir = path.resolve(".vercel", "output");

  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });

  await writeFile(
    path.join(outDir, "config.json"),
    JSON.stringify({
      version: 3,
    })
  );

  // Build JS/CSS
  const staticDir = path.join(outDir, "static");
  await build({
    mode: "production",
    build: {
      manifest: true,
      emptyOutDir: false,
      outDir: staticDir,
    },
  });

  // SSR Function
  const functionDir = path.join(outDir, "functions", "index.func");
  await mkdir(functionDir, { recursive: true });
  await writeFile(
    path.join(functionDir, ".vc-config.json"),
    JSON.stringify({
      runtime: "edge",
      entrypoint: "index.js",
    })
  );

  await build({
    // We use this plugin so during SSR we can inject `<script src="/assets/index.{some_hash}.js" />"
    plugins: [importManifestVitePlugin()],
    mode: "production",
    publicDir: false,
    ssr: {
      noExternal: true,
    },
    build: {
      target: "esnext",
      ssr: true,
      assetsDir: "chunks",
      minify: true,
      manifest: false,
      emptyOutDir: false,
      outDir: functionDir,
      rollupOptions: {
        input: path.resolve("./src/server.ts"),
        output: {
          format: "esm",
          entryFileNames: "index.js",
          // https://github.com/denoland/deploy_feedback/issues/1
          inlineDynamicImports: true,
        },
        preserveEntrySignatures: "strict",
      },
    },
  });
}

function importManifestVitePlugin(): PluginOption {
  const virtualModuleId = "custom:manifest";
  const resolvedVirtualModuleId = "\0" + virtualModuleId;

  return {
    name: "vite-plugin-manifest",
    resolveId(id) {
      if (id === virtualModuleId) {
        return resolvedVirtualModuleId;
      }
    },
    async load(id) {
      if (id === resolvedVirtualModuleId) {
        let manifest: Manifest = JSON.parse(
          await readFile(
            path.join(".vercel", "output", "static", "manifest.json"),
            "utf-8"
          )
        );
        return `export default (${JSON.stringify(manifest)})`;
      }
    },
    async buildEnd() {
      await rm(path.join(".vercel", "output", "static", "manifest.json"));
    },
  };
}

(async () => {
  if (process.argv?.[2] === "build") {
    await buildCmd();
  } else {
    console.error("Invalid command. Must be 'dev', 'build', or 'deploy'!");
    process.exit(1);
  }
})();
