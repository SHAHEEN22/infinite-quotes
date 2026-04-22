import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getEvent } from "../lib/store";
import { toApiResponse } from "../lib/labels";
import { parseDDMMYYYY } from "../lib/date-utils";

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
    let month: number;
    let day: number;
    let useFallback = true; // only fall back to yesterday for "today" requests

    const dateParam = req.query.date as string | undefined;
    if (dateParam) {
      const parsed = parseDDMMYYYY(dateParam);
      if (!parsed) {
        return res.status(400).json({ error: "Invalid date format. Use DDMMYYYY." });
      }
      month = parsed.month;
      day = parsed.day;
      useFallback = false;
    } else {
      const now = new Date();
      month = now.getUTCMonth() + 1;
      day = now.getUTCDate();
    }

    let event = await getEvent(month, day);

    // Fall back to yesterday's content only for "today" requests
    if (!event && useFallback) {
      const yesterday = new Date();
      yesterday.setUTCDate(yesterday.getUTCDate() - 1);
      event = await getEvent(yesterday.getUTCMonth() + 1, yesterday.getUTCDate());
    }

    if (!event) {
      return res.status(404).json({ error: "No content available" });
    }

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "public, max-age=3600");
    return res.status(200).json(toApiResponse(event));
  } catch (err) {
    console.error("[today] error:", err instanceof Error ? err.message : String(err));
    return res.status(500).json({ error: "Internal server error" });
  }
}
