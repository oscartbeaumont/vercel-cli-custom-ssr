// An attempt at using a Vercel runtime to make this framework work with `vercel dev`

const path = require("path");
const { mkdir, writeFile, rm, readFile } = require("fs/promises");
const { build: viteBuild } = require("vite");
const { EdgeFunction, FileFsRef } = require("@vercel/build-utils");

async function build(options) {
  // TODO: Should also build and serve HTML/CSS

  const outDir = path.join(".vercel", ".dev");
  await mkdir(outDir, { recursive: true });

  // Build JS/CSS
  const staticDir = path.join(outDir, "static");
  await viteBuild({
    mode: "production",
    build: {
      manifest: true,
      emptyOutDir: false,
      outDir: staticDir,
    },
  });

  const functionDir = path.join(outDir, "index.func");
  await mkdir(functionDir, { recursive: true });
  await writeFile(
    path.join(functionDir, ".vc-config.json"),
    JSON.stringify({
      runtime: "edge",
      entrypoint: "index.js",
    })
  );

  await viteBuild({
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

  const renderFunc = new EdgeFunction({
    name: "index",
    deploymentTarget: "v8-worker",
    entrypoint: "index.js",
    files: {
      "index.js": new FileFsRef({
        fsPath: path.join(functionDir, "index.js"),
      }),
    },
  });

  return {
    output: renderFunc,
  };
}

function importManifestVitePlugin() {
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
        let manifest = JSON.parse(
          await readFile(
            path.join(".vercel", ".dev", "static", "manifest.json"),
            "utf-8"
          )
        );
        return `export default (${JSON.stringify(manifest)})`;
      }
    },
    async buildEnd() {
      await rm(path.join(".vercel", ".dev", "static", "manifest.json"));
    },
  };
}

module.exports = {
  version: 3,
  build,
};
