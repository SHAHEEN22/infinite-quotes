import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getEvent, storeEvent } from "../lib/store";
import { toApiResponse } from "../lib/labels";
import { parseDDMMYYYY } from "../lib/date-utils";

const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

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

      // Self-healing: if no event for today, generate one on the fly
      if (!event && useFallback) {
              try {
                        const monthName = MONTH_NAMES[month - 1];
                        const displayDate = `${monthName} ${day}`;
                        const { generateContentForDate } = await import("../lib/claude");
                        const generated = await generateContentForDate(monthName, day);
                        await storeEvent(month, day, displayDate, generated);
                        event = await getEvent(month, day);
                        console.log(`[today] Self-healed: generated content for ${month}/${day}`);
              } catch (genErr) {
                        console.error("[today] Self-healing generation failed:", genErr instanceof Error ? genErr.message : String(genErr));
                        // Fall through to yesterday fallback
              }
      }

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
        res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=60");
        return res.status(200).json(toApiResponse(event));
  } catch (err) {
        console.error("[today] error:", err instanceof Error ? err.message : String(err));
        return res.status(500).json({ error: "Internal server error" });
  }
}
