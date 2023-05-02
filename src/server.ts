// @ts-expect-error // This is a custom import injected by Vite in SSR builds
import ssrManifest from "custom:manifest";

export default function () {
  // TODO: I do some SolidJS renderToStream here to render the app

  return new Response(`Hello World! ${ssrManifest["src/client.ts"].file}`);
}
