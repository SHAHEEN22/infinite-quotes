import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getEvent } from "../lib/store";
import { LABELS } from "../lib/labels";
import { readFileSync } from "fs";
import { join } from "path";

// Read the static HTML template once at cold start
const template = readFileSync(
  join(__dirname, "..", "public", "index.html"),
  "utf-8"
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Try to get today's content for dynamic OG tags
  const now = new Date();
  let month = now.getUTCMonth() + 1;
  let day = now.getUTCDate();
  let event = await getEvent(month, day);

  // Fall back to yesterday
  if (!event) {
    const yesterday = new Date(now);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    event = await getEvent(yesterday.getUTCMonth() + 1, yesterday.getUTCDate());
  }

  let html = template;

  if (event) {
    const label = LABELS[event.contentType] ?? LABELS.event;
    const ogTitle = event.headline + " \u2014 One Strange Thing";
    const ogDesc = label + ": " + event.summary.split(".")[0] + ".";

    // Replace static OG tags with dynamic content
    html = html.replace(
      /<title>.*?<\/title>/,
      `<title>${escapeHtml(ogTitle)}</title>`
    );
    html = html.replace(
      /content="One Strange Thing — Daily Paranormal History"/,
      `content="${escapeHtml(ogTitle)}"`
    );
    html = html.replace(
      /<meta property="og:description" content="[^"]*">/,
      `<meta property="og:description" content="${escapeHtml(ogDesc)}">`
    );
    html = html.replace(
      /<meta name="description" content="[^"]*">/,
      `<meta name="description" content="${escapeHtml(ogDesc)}">`
    );
  }

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=3600");
  return res.status(200).send(html);
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
