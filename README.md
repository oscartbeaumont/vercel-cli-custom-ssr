# vercel-cli-custom-ssr

A demo of using the Vercel CLI for custom SSR

## Local Development

```bash
# idk??? Vercel's CLI doesn't seem to have solution for this that I can find.
```

### Attempted Solutions

#### Just use `vercel dev`?

When using `vercel dev` it just runs Vite's dev server and proxies to it but because my CLI has to create the edge function, Vercel's CLI is unaware of it and doesn't serve it.

My CLI has to be in-charge of creating the edge function as it needs to inject the SSR manifest.

#### Use a custom Vercel runtime?

You seemingly can't use a custom runtime that returns an `EdgeFunction` with the local dev server.

`vercel build` works fine but `vercel dev` returns the error:
```
Error: The result of "builder.build()" must be a `Lambda`
```

To reproduce:

```bash
git checkout custom-runtime
pnpm i
cd runtime/ && pnpm link --global && cd ../
vercel dev
# Error: The result of "builder.build()" must be a `Lambda`
```

## Deploy

```bash
pnpm i
pnpm build
vercel deploy --prebuilt --prod
```
