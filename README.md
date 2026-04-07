# LuxeShutters Blog

Static HTML blog for [luxeshutters.com.au/blog/](https://luxeshutters.com.au/blog/)

## Architecture

```
luxeshutters.com.au/blog/*  →  Cloudflare Worker  →  This project (static HTML)
luxeshutters.com.au/*       →  Main React SPA (separate repo)
```

- **Pure static HTML** - no JavaScript, no CMS, no database
- **Served as subfolder** via Cloudflare Workers reverse proxy (better SEO than subdomain)
- **Auto-generates** index page, sitemap.xml, and RSS feed from posts
- **Deploys** to Cloudflare Pages on every push to main

## Adding a Post

1. Create an HTML file in `/posts/` with a META comment block at the top:

```html
<!-- META
title: Your Post Title
slug: your-post-slug
description: Meta description (150-160 chars)
date: 2026-05-15
updated: 2026-05-15
category: Plantation Shutters
image: /blog/images/your-image.webp
image_alt: Descriptive alt text
read_time: 8
-->

<h1>Your Post Title</h1>
<!-- post content -->
```

2. Run `npm run build` - generates the full site in `/dist/`
3. Push to main - Cloudflare Pages auto-deploys

## Development

```bash
npm install
npm run build    # Build to /dist/
npm run dev      # Build + serve at localhost:3001
```

## Deployment

### Cloudflare Pages (blog static files)
- Connect this repo to Cloudflare Pages
- Build command: `npm run build`
- Build output: `dist`
- Branch: `main`

### Cloudflare Worker (reverse proxy)
- Deploy `worker.js` via Wrangler or Cloudflare dashboard
- Set route: `luxeshutters.com.au/blog/*`
- Update `BLOG_ORIGIN` in worker.js to your Pages project URL
