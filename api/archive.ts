import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getAllEvents } from "../lib/store";
import { toApiResponse } from "../lib/labels";

const VALID_CATEGORIES: Set<string> = new Set<string>([
  "ufo", "ghost", "cryptids", "mysteries", "conspiracy", "occult",
]);

const PAGE_SIZE = 20;

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

  const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10) || 1);
  const category = typeof req.query.category === "string" ? req.query.category : undefined;

  if (category && !VALID_CATEGORIES.has(category)) {
    return res.status(400).json({
      error: `Invalid category. Valid values: ${[...VALID_CATEGORIES].join(", ")}`,
    });
  }

  try {
    let events = await getAllEvents();

    // Filter by category if specified
    if (category) {
      events = events.filter((e) => e.category === category);
    }

    // Sort newest first by generatedAt (ISO 8601 strings sort correctly with direct comparison)
    events.sort((a, b) => (a.generatedAt > b.generatedAt ? -1 : 1));

    // Paginate
    const offset = (page - 1) * PAGE_SIZE;
    const pageEvents = events.slice(offset, offset + PAGE_SIZE);
    const hasMore = offset + PAGE_SIZE < events.length;

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "public, max-age=3600");
    return res.status(200).json({
      entries: pageEvents.map(toApiResponse),
      page,
      has_more: hasMore,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: message });
  }
}
