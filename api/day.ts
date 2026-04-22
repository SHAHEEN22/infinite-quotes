import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getEvent } from "../lib/store";
import { toApiResponse } from "../lib/labels";
import { parseDDMMYYYY } from "../lib/date-utils";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const dateParam = req.query.date as string | undefined;
  if (!dateParam) {
    return res.status(400).send("Missing date parameter");
  }

  const parsed = parseDDMMYYYY(dateParam);
  if (!parsed) {
    return res.status(400).send("Invalid date format. Use DDMMYYYY.");
  }

  const event = await getEvent(parsed.month, parsed.day);

  // Build OG tags — use event data if available, fallback to generic branding
  const title = event
    ? `${toApiResponse(event).label}: ${event.headline}`
    : "One Strange Thing — Daily Paranormal History";
  const description = event
    ? event.summary
    : "A daily dispatch from the realm of the unexplained.";
  const ogImage = `https://onestrangething.net/api/og?date=${dateParam}`;
  const canonicalUrl = `https://onestrangething.net/day/${dateParam}`;

  const escHtml = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escHtml(title)}</title>
  <meta name="description" content="${escHtml(description)}">
  <meta property="og:title" content="${escHtml(title)}">
  <meta property="og:description" content="${escHtml(description)}">
  <meta property="og:type" content="article">
  <meta property="og:url" content="${escHtml(canonicalUrl)}">
  <meta property="og:image" content="${escHtml(ogImage)}">
  <meta property="og:image:width" content="1080">
  <meta property="og:image:height" content="1350">
  <link rel="canonical" href="${escHtml(canonicalUrl)}">
  <link rel="alternate" type="application/rss+xml" title="One Strange Thing" href="/api/feed">
  <meta name="theme-color" content="#f5f0e8" media="(prefers-color-scheme: light)">
  <meta name="theme-color" content="#1a1410" media="(prefers-color-scheme: dark)">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="apple-touch-icon" href="/apple-touch-icon.png">
  <link rel="stylesheet" href="/styles.css">
</head>
<body>
  <a href="#content" class="skip-link">Skip to content</a>
  <main>
    <header>
      <h1><a href="/" style="color:inherit;text-decoration:none">One Strange Thing</a></h1>
      <p class="tagline">A daily dispatch from the realm of the unexplained</p>
    </header>
    <article id="content" aria-live="polite" aria-busy="true">
      <div id="loading">
        <p>Contacting the other side&hellip;</p>
      </div>
      <div id="event" hidden>
        <p id="label" class="label"></p>
        <div id="icon-container"></div>
        <h2 id="headline"></h2>
        <p id="summary"></p>
        <footer>
          <time id="display-date"></time>
          <span class="separator" aria-hidden="true">&middot;</span>
          <span id="year"></span>
        </footer>
        <div id="actions" class="actions" hidden>
          <button id="share-btn" class="action-link" aria-label="Share this story">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M13 6L8 1L3 6M8 1v10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M2 10v3a1 1 0 001 1h10a1 1 0 001-1v-3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span>Share</span>
          </button>
          <span class="separator" aria-hidden="true">&middot;</span>
          <a href="/api/feed" class="action-link" aria-label="RSS Feed">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <circle cx="3.5" cy="12.5" r="1.5" fill="currentColor"/>
              <path d="M2 8a6 6 0 016 6M2 4a10 10 0 0110 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
            <span>RSS</span>
          </a>
        </div>
      </div>
      <div id="empty" hidden>
        <p>No dispatch found for this date. The veil between worlds is still settling.</p>
      </div>
      <div id="error" hidden>
        <p>Something went wrong reaching the other side. Try again later.</p>
      </div>
    </article>
  </main>
  <footer class="site-credit">
    <p>Conjured by Hiro from the <a href="https://hiro.report">Hiro Report</a> <span id="heart" role="img" aria-hidden="true">&#9825;</span></p>
  </footer>
  <script src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.4/dist/confetti.browser.min.js"></script>
  <script>
  // Day page JS — fetches specific date content
  var DATE_PARAM = ${JSON.stringify(dateParam)};
  </script>
  <script src="/day-app.js"></script>
  <script data-collect-dnt="true" async src="https://scripts.simpleanalyticscdn.com/latest.js"></script>
</body>
</html>`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=3600");
  return res.send(html);
}
