/**
 * Cloudflare Worker — Reverse Proxy for LuxeShutters Blog
 *
 * Routes luxeshutters.com.au/blog/* to the blog Cloudflare Pages project.
 * All other routes pass through to the main React SPA.
 *
 * SETUP:
 * 1. Deploy this worker to Cloudflare (Workers dashboard or wrangler)
 * 2. Set route: luxeshutters.com.au/blog/*
 * 3. Update BLOG_ORIGIN to your blog Pages project URL
 *
 * The worker rewrites the URL path so the blog project receives clean paths:
 *   luxeshutters.com.au/blog/my-post/  →  fetch(BLOG_ORIGIN/my-post/)
 *   luxeshutters.com.au/blog/css/blog.css  →  fetch(BLOG_ORIGIN/css/blog.css)
 */

const BLOG_ORIGIN = 'https://luxeshutters-blog.pages.dev';

export default {
  async fetch(request) {
    const url = new URL(request.url);

    // Only handle /blog paths
    if (!url.pathname.startsWith('/blog')) {
      return fetch(request);
    }

    // Strip /blog prefix for the blog origin
    let blogPath = url.pathname.replace(/^\/blog/, '') || '/';

    // Ensure trailing slash for directory-style paths (SEO canonical)
    if (!blogPath.includes('.') && !blogPath.endsWith('/')) {
      blogPath += '/';
    }

    const blogUrl = new URL(blogPath, BLOG_ORIGIN);
    blogUrl.search = url.search;

    const response = await fetch(blogUrl.toString(), {
      method: request.method,
      headers: request.headers,
    });

    // Clone response and add SEO-friendly headers
    const newHeaders = new Headers(response.headers);
    newHeaders.set('X-Robots-Tag', 'index, follow');
    newHeaders.set('X-Content-Type-Options', 'nosniff');
    newHeaders.set('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Cache static assets aggressively, HTML less so
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('text/html')) {
      newHeaders.set('Cache-Control', 'public, max-age=3600, s-maxage=86400');
    } else {
      newHeaders.set('Cache-Control', 'public, max-age=31536000, immutable');
    }

    return new Response(response.body, {
      status: response.status,
      headers: newHeaders,
    });
  },
};
