import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  type ParanormalEvent,
} from "../lib/claude";
import { storeEvent } from "../lib/store";
import { getQueueEntry, deleteQueueEntry } from "../lib/queue";
import { LABELS } from "../lib/labels";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function getBaseUrl(): string {
  return process.env.BASE_URL
    ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://infinite-quotes.vercel.app");
}

async function pushToTrmnl(
  event: ParanormalEvent,
  displayDate: string
): Promise<void> {
  const pluginUuid = process.env.TRMNL_PLUGIN_UUID;
  if (!pluginUuid) {
    console.warn("[generate] TRMNL_PLUGIN_UUID not set, skipping webhook push");
    return;
  }

  const baseUrl = getBaseUrl();
  const contentType = event.contentType ?? "event";
  const category = event.category ?? "mysteries";

  const mergeVariables: Record<string, string | null> = {
    headline: event.headline,
    summary: event.summary,
    year: event.year,
    display_date: displayDate,
    label: LABELS[contentType] ?? LABELS.event,
    category,
    content_type: contentType,
  };

  const webhookUrl = `https://trmnl.com/api/custom_plugins/${pluginUuid}`;

  try {
    const resp = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ merge_variables: mergeVariables }),
    });

    if (!resp.ok) {
      const body = await resp.text();
      console.error(`[generate] TRMNL webhook failed (${resp.status}):`, body);
    } else {
      console.log("[generate] TRMNL webhook push successful");
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[generate] TRMNL webhook error:", message);
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error("[generate] CRON_SECRET not configured");
    return res.status(500).json({ error: "Server misconfiguration" });
  }
  const authHeader = req.headers["authorization"];
  if (authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const now = new Date();
  const month = now.getUTCMonth();
  const day = now.getUTCDate();
  const monthName = MONTH_NAMES[month];
  const displayDate = `${monthName} ${day}`;
  const dateKey = `${String(month + 1).padStart(2, "0")}${String(day).padStart(2, "0")}`;

  try {
    // Try to promote from queue first
    const queued = await getQueueEntry(dateKey);
    if (queued) {
      const event: ParanormalEvent = {
        headline: queued.headline,
        summary: queued.summary,
        year: queued.year,
        category: queued.category,
        contentType: queued.contentType,
        symbolKey: queued.symbolKey,
        tags: queued.tags,
      };
      await storeEvent(month + 1, day, displayDate, event);
      await deleteQueueEntry(dateKey);
      await pushToTrmnl(event, displayDate);

      console.log(`[generate] Promoted queue entry for ${dateKey}`);
      return res.status(200).json({
        success: true,
        date: displayDate,
        source: "queue",
        event,
      });
    }

    // No queue entry â generate a random curated quote (not date-biased)
    console.log(`[generate] No queue entry for ${dateKey}, generating curated content`);
    const { generateContentForDate } = await import("../lib/claude");
    let event = await generateContentForDate(monthName, day);

    await storeEvent(month + 1, day, displayDate, event);
    await pushToTrmnl(event, displayDate);

    return res.status(200).json({
      success: true,
      date: displayDate,
      source: "live",
      event,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[generate] error:", message);
    return res.status(500).json({ error: message });
  }
}
