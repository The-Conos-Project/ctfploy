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

The static export will be in the `out/` directory. Deploy it to any static host (Vercel, Cloudflare Pages, nginx, etc.) under your domain (e.g. `ctfploy.conos.uz`).

## Docs

- [Platform source](./ctfploy-platform/)
- [Installer](./installer/)
