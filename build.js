#!/usr/bin/env node
/**
 * LuxeShutters Blog Build Script
 *
 * Reads HTML post files from /posts/, wraps them in the site template,
 * and generates: index page, sitemap.xml, rss.xml, individual post pages.
 *
 * Post files must contain a metadata comment block at the top:
 * <!-- META
 * title: How Much Do Plantation Shutters Cost?
 * slug: plantation-shutters-cost-australia
 * description: Real pricing from a Riverina installer...
 * date: 2026-05-15
 * updated: 2026-05-15
 * category: Plantation Shutters
 * image: /blog/images/shutters-cost-hero.webp
 * image_alt: Plantation shutters in a Temora home
 * read_time: 8
 * -->
 */

const fs = require('fs');
const path = require('path');

const SITE_URL = 'https://luxeshutters.com.au';
const BLOG_PATH = '/blog';
const DIST = path.join(__dirname, 'dist');
const POSTS_DIR = path.join(__dirname, 'posts');
const TEMPLATES_DIR = path.join(__dirname, 'templates');
const CSS_DIR = path.join(__dirname, 'css');
const IMAGES_DIR = path.join(__dirname, 'images');

// ============================================================
// Helpers
// ============================================================

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function parseMeta(html) {
  const match = html.match(/<!--\s*META\s*([\s\S]*?)-->/);
  if (!match) return null;
  const meta = {};
  match[1].split('\n').forEach(line => {
    const idx = line.indexOf(':');
    if (idx === -1) return;
    const key = line.slice(0, idx).trim();
    const val = line.slice(idx + 1).trim();
    if (key && val) meta[key] = val;
  });
  return meta;
}

function stripMeta(html) {
  return html.replace(/<!--\s*META\s*[\s\S]*?-->\s*/, '');
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-AU', { year: 'numeric', month: 'long', day: 'numeric' });
}

function isoDate(dateStr) {
  return new Date(dateStr + 'T00:00:00').toISOString();
}

function escapeXml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function truncate(str, len) {
  if (str.length <= len) return str;
  return str.slice(0, len - 3) + '...';
}

function extractExcerpt(html) {
  // Strip tags, get first 200 chars
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return truncate(text, 200);
}

// ============================================================
// Load posts
// ============================================================

function loadPosts() {
  if (!fs.existsSync(POSTS_DIR)) return [];

  const files = fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.html'));
  const posts = [];

  for (const file of files) {
    const raw = fs.readFileSync(path.join(POSTS_DIR, file), 'utf8');
    const meta = parseMeta(raw);
    if (!meta || !meta.title || !meta.slug || !meta.date) {
      console.warn(`  SKIP: ${file} (missing required META fields: title, slug, date)`);
      continue;
    }
    posts.push({
      file,
      meta,
      content: stripMeta(raw),
      excerpt: meta.description || extractExcerpt(stripMeta(raw)),
    });
  }

  // Sort by date descending (newest first)
  posts.sort((a, b) => new Date(b.meta.date) - new Date(a.meta.date));
  return posts;
}

// ============================================================
// Build individual post pages
// ============================================================

function buildPostPages(posts, postTemplate) {
  const year = new Date().getFullYear();

  for (const post of posts) {
    const postDir = path.join(DIST, post.meta.slug);
    ensureDir(postDir);

    // Build schema JSON-LD
    const schema = buildPostSchema(post);

    // Find related posts (same category, max 3, exclude self)
    const related = posts
      .filter(p => p.meta.slug !== post.meta.slug)
      .filter(p => p.meta.category === post.meta.category)
      .slice(0, 3);

    const relatedHtml = related.length > 0
      ? related.map(r => `
        <a href="${BLOG_PATH}/${r.meta.slug}/" class="post-card">
          ${r.meta.image ? `<img src="${r.meta.image}" alt="${escapeXml(r.meta.image_alt || r.meta.title)}" class="post-card-img" loading="lazy">` : ''}
          <div class="post-card-body">
            <p class="post-card-category">${escapeXml(r.meta.category || '')}</p>
            <h3 class="post-card-title">${escapeXml(r.meta.title)}</h3>
          </div>
        </a>`).join('\n')
      : '<p>More articles coming soon.</p>';

    let html = postTemplate
      .replace(/\{\{TITLE\}\}/g, escapeXml(post.meta.title))
      .replace(/\{\{TITLE_SHORT\}\}/g, escapeXml(truncate(post.meta.title, 50)))
      .replace(/\{\{META_DESCRIPTION\}\}/g, escapeXml(post.meta.description || post.excerpt))
      .replace(/\{\{SLUG\}\}/g, post.meta.slug)
      .replace(/\{\{OG_IMAGE\}\}/g, post.meta.image ? `${SITE_URL}${post.meta.image}` : `${SITE_URL}/og-image.webp`)
      .replace(/\{\{SCHEMA\}\}/g, `<script type="application/ld+json">\n${JSON.stringify(schema, null, 2)}\n</script>`)
      .replace(/\{\{CONTENT\}\}/g, post.content)
      .replace(/\{\{RELATED_POSTS\}\}/g, relatedHtml)
      .replace(/\{\{YEAR\}\}/g, year);

    fs.writeFileSync(path.join(postDir, 'index.html'), html);
    console.log(`  POST: ${post.meta.slug}/`);
  }
}

function buildPostSchema(post) {
  const schema = [
    {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      "headline": post.meta.title,
      "description": post.meta.description || post.excerpt,
      "datePublished": isoDate(post.meta.date),
      "dateModified": isoDate(post.meta.updated || post.meta.date),
      "url": `${SITE_URL}${BLOG_PATH}/${post.meta.slug}/`,
      "image": post.meta.image ? `${SITE_URL}${post.meta.image}` : undefined,
      "author": {
        "@type": "Person",
        "name": "Chris & Campbell",
        "jobTitle": "Founders, LuxeShutters",
        "url": `${SITE_URL}/`,
      },
      "publisher": {
        "@type": "LocalBusiness",
        "name": "Luxe Shutters",
        "url": SITE_URL,
        "telephone": "1800-465-893",
        "address": {
          "@type": "PostalAddress",
          "addressLocality": "Temora",
          "addressRegion": "NSW",
          "addressCountry": "AU",
        },
      },
      "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": `${SITE_URL}${BLOG_PATH}/${post.meta.slug}/`,
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": SITE_URL },
        { "@type": "ListItem", "position": 2, "name": "Blog", "item": `${SITE_URL}${BLOG_PATH}/` },
        { "@type": "ListItem", "position": 3, "name": post.meta.title, "item": `${SITE_URL}${BLOG_PATH}/${post.meta.slug}/` },
      ],
    },
  ];
  return schema;
}

// ============================================================
// Build index page
// ============================================================

function buildIndexPage(posts, indexTemplate) {
  const year = new Date().getFullYear();

  const cards = posts.map(post => `
    <a href="${BLOG_PATH}/${post.meta.slug}/" class="post-card">
      ${post.meta.image ? `<img src="${post.meta.image}" alt="${escapeXml(post.meta.image_alt || post.meta.title)}" class="post-card-img" loading="lazy">` : ''}
      <div class="post-card-body">
        <p class="post-card-category">${escapeXml(post.meta.category || 'General')}</p>
        <h2 class="post-card-title">${escapeXml(post.meta.title)}</h2>
        <p class="post-card-excerpt">${escapeXml(post.excerpt)}</p>
        <div class="post-card-meta">
          <span>${formatDate(post.meta.date)}</span>
          ${post.meta.read_time ? `<span>${post.meta.read_time} min read</span>` : ''}
        </div>
      </div>
    </a>`).join('\n');

  const html = indexTemplate
    .replace(/\{\{POST_CARDS\}\}/g, cards || '<p style="text-align:center;padding:3rem;color:#6b7d8e;">Posts coming soon.</p>')
    .replace(/\{\{YEAR\}\}/g, year);

  fs.writeFileSync(path.join(DIST, 'index.html'), html);
  console.log('  INDEX: /blog/');
}

// ============================================================
// Build sitemap.xml
// ============================================================

function buildSitemap(posts) {
  const urls = [
    `  <url>\n    <loc>${SITE_URL}${BLOG_PATH}/</loc>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>`,
    ...posts.map(post =>
      `  <url>\n    <loc>${SITE_URL}${BLOG_PATH}/${post.meta.slug}/</loc>\n    <lastmod>${post.meta.updated || post.meta.date}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.7</priority>\n  </url>`
    ),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;

  fs.writeFileSync(path.join(DIST, 'sitemap.xml'), xml);
  console.log('  SITEMAP: /blog/sitemap.xml');
}

// ============================================================
// Build rss.xml
// ============================================================

function buildRss(posts) {
  const items = posts.slice(0, 20).map(post => `    <item>
      <title>${escapeXml(post.meta.title)}</title>
      <link>${SITE_URL}${BLOG_PATH}/${post.meta.slug}/</link>
      <description>${escapeXml(post.excerpt)}</description>
      <pubDate>${new Date(post.meta.date + 'T00:00:00').toUTCString()}</pubDate>
      <guid isPermaLink="true">${SITE_URL}${BLOG_PATH}/${post.meta.slug}/</guid>
      ${post.meta.category ? `<category>${escapeXml(post.meta.category)}</category>` : ''}
    </item>`).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Luxe Shutters Blog</title>
    <link>${SITE_URL}${BLOG_PATH}/</link>
    <description>Expert guides on plantation shutters, blinds, curtains, and outdoor solutions for Riverina homes.</description>
    <language>en-AU</language>
    <atom:link href="${SITE_URL}${BLOG_PATH}/rss.xml" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>`;

  fs.writeFileSync(path.join(DIST, 'rss.xml'), xml);
  console.log('  RSS: /blog/rss.xml');
}

// ============================================================
// Copy static assets
// ============================================================

function copyAssets() {
  // CSS
  const cssDistDir = path.join(DIST, 'css');
  ensureDir(cssDistDir);
  if (fs.existsSync(CSS_DIR)) {
    for (const file of fs.readdirSync(CSS_DIR)) {
      fs.copyFileSync(path.join(CSS_DIR, file), path.join(cssDistDir, file));
    }
    console.log('  CSS: copied');
  }

  // Images
  const imgDistDir = path.join(DIST, 'images');
  ensureDir(imgDistDir);
  if (fs.existsSync(IMAGES_DIR)) {
    for (const file of fs.readdirSync(IMAGES_DIR)) {
      fs.copyFileSync(path.join(IMAGES_DIR, file), path.join(imgDistDir, file));
    }
    console.log(`  IMAGES: ${fs.readdirSync(IMAGES_DIR).length} copied`);
  }
}

// ============================================================
// Main
// ============================================================

function main() {
  console.log('\n🔨 LuxeShutters Blog Build\n');

  // Clean dist
  if (fs.existsSync(DIST)) fs.rmSync(DIST, { recursive: true });
  ensureDir(DIST);

  // Load templates
  const postTemplate = fs.readFileSync(path.join(TEMPLATES_DIR, 'post.html'), 'utf8');
  const indexTemplate = fs.readFileSync(path.join(TEMPLATES_DIR, 'index.html'), 'utf8');

  // Load posts
  const posts = loadPosts();
  console.log(`  Found ${posts.length} post(s)\n`);

  // Build everything
  buildPostPages(posts, postTemplate);
  buildIndexPage(posts, indexTemplate);
  buildSitemap(posts);
  buildRss(posts);
  copyAssets();

  // Ping search engines with sitemap
  pingSitemap();

  console.log(`\n✅ Build complete: ${posts.length} post(s) → dist/\n`);
}

// ============================================================
// Ping search engines with sitemap URL
// ============================================================

function pingSitemap() {
  const sitemapUrl = `${SITE_URL}${BLOG_PATH}/sitemap.xml`;
  const https = require('https');

  const pingUrl = (url) => {
    https.get(url, () => {}).on('error', () => {});
  };

  pingUrl(`https://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`);
  pingUrl(`https://www.bing.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`);
  console.log('  PING: sitemap submitted to Google + Bing');
}

main();
