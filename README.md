# Conos CTFploy

One-command CTF platform deployment.

## Quick Start

```bash
curl -sSL https://ctfploy.conos.uz/install.sh | sudo bash
```

## Landing Page

The landing page is a Next.js app. To build it:

```bash
npm install
npm run build
```

Deploy the application to a Next.js-compatible host under your domain (e.g. `ctfploy.conos.uz`).

### Cloudflare Pages

Use the **Next.js** framework preset, or configure:

- Build command: `npx @cloudflare/next-on-pages@1`
- Build output directory: `.vercel/output/static`

The Cloudflare adapter dependencies are pinned in `package.json` so the build does not select incompatible latest packages.

## Docs

- [Platform source](./ctfploy-platform/)
- [Installer](./installer/)
