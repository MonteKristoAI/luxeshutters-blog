# LuxeShutters Blog Deployment Guide

## Step 1: Cloudflare Pages (Blog Static Files)

1. Go to: https://dash.cloudflare.com → Pages → Create a project
2. Connect to Git → Select `MonteKristoAI/luxeshutters-blog`
3. Configure build:
   - **Build command:** `node build.js`
   - **Build output directory:** `dist`
   - **Root directory:** `/` (default)
   - **Branch:** `main`
4. Click "Save and Deploy"
5. Note your project URL (e.g., `luxeshutters-blog.pages.dev`)

## Step 2: Cloudflare Worker (Reverse Proxy)

1. Go to: https://dash.cloudflare.com → Workers & Pages → Create Worker
2. Name it: `luxeshutters-blog-proxy`
3. Paste the contents of `worker.js` from this repo
4. Update `BLOG_ORIGIN` to match your Pages URL from Step 1
5. Click "Deploy"

## Step 3: Set Worker Route

1. Go to: https://dash.cloudflare.com → luxeshutters.com.au → Workers Routes
2. Add route: `luxeshutters.com.au/blog/*` → `luxeshutters-blog-proxy`
3. Save

## Step 4: Verify

- Open: https://luxeshutters.com.au/blog/
- Check: https://luxeshutters.com.au/blog/sitemap.xml
- Check: https://luxeshutters.com.au/blog/rss.xml

## Step 5: Google Search Console

1. Open: https://search.google.com/search-console
2. Select property: luxeshutters.com.au
3. Go to: Sitemaps → Add
4. Enter: `https://luxeshutters.com.au/blog/sitemap.xml`
5. Submit

## Step 6: GA4 Property

1. Go to: https://analytics.google.com
2. Create property for luxeshutters.com.au (if not already done)
3. Get Measurement ID (G-XXXXXXXXXX)
4. Replace `G-XXXXXXXXXX` in both template files:
   - `templates/post.html`
   - `templates/index.html`
5. Commit and push

## After Deployment

Every time a new blog post is pushed to main:
1. Cloudflare Pages auto-rebuilds
2. build.js generates new index, sitemap, RSS
3. Sitemap is pinged to Google + Bing automatically
4. New post is live at luxeshutters.com.au/blog/{slug}/
