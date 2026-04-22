import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getAllEvents } from "../lib/store";
import { LABELS } from "../lib/labels";

const SITE_URL = "https://onestrangething.net";

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS preflight
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(204).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const allEvents = await getAllEvents();

    const sorted = allEvents
      .sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime())
      .slice(0, 20);

    const items = sorted
      .map((event) => {
        const pubDate = new Date(event.generatedAt).toUTCString();
        const label = LABELS[event.contentType] ?? LABELS.event;
        const guid = `${SITE_URL}/#${event.dateKey}`;

        return `    <item>
      <title>${escapeXml(event.headline)}</title>
      <description>${escapeXml(event.summary)}</description>
      <pubDate>${pubDate}</pubDate>
      <link>${SITE_URL}</link>
      <category>${escapeXml(label)}</category>
      <guid isPermaLink="false">${guid}</guid>
    </item>`;
      })
      .join("\n");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>One Strange Thing</title>
    <description>A daily dispatch from the edges of the unexplained</description>
    <link>${SITE_URL}</link>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>`;

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Content-Type", "application/rss+xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=3600");
    return res.status(200).send(xml);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: message });
  }
}
