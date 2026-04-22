import { createClient } from "@vercel/kv";
import type { EventCategory, ContentType } from "./claude";

const kv = createClient({
  url: process.env.upstash_KV_REST_API_URL ?? process.env.KV_REST_API_URL ?? "",
  token: process.env.upstash_KV_REST_API_TOKEN ?? process.env.KV_REST_API_TOKEN ?? "",
});

export interface QueuedEvent {
  headline: string;
  summary: string;
  year: string;
  category: EventCategory;
  contentType: ContentType;
  symbolKey?: string;
  dateKey: string;
  displayDate: string;
  tags: string[];
  status: "generated" | "edited" | "approved";
  generatedAt: string;
  editedAt?: string;
}

function queueKey(dateKey: string): string {
  return `paranormnl:queue:${dateKey}`;
}

function tagsKey(dateKey: string): string {
  return `paranormnl:tags:${dateKey}`;
}

// --- Date helpers ---

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function formatDateKey(month: number, day: number): string {
  return `${String(month).padStart(2, "0")}${String(day).padStart(2, "0")}`;
}

export function formatDisplayDate(month: number, day: number): string {
  return `${MONTH_NAMES[month - 1]} ${day}`;
}

export function getMonthName(month: number): string {
  return MONTH_NAMES[month - 1];
}

/** Returns array of { month, day, dateKey, displayDate } for the next N days starting from today */
export function getUpcomingDates(count: number): Array<{ month: number; day: number; dateKey: string; displayDate: string }> {
  const dates: Array<{ month: number; day: number; dateKey: string; displayDate: string }> = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() + i);
    const month = d.getUTCMonth() + 1;
    const day = d.getUTCDate();
    dates.push({
      month,
      day,
      dateKey: formatDateKey(month, day),
      displayDate: formatDisplayDate(month, day),
    });
  }
  return dates;
}

// --- Queue CRUD ---

export async function getQueueEntry(dateKey: string): Promise<QueuedEvent | null> {
  return kv.get<QueuedEvent>(queueKey(dateKey));
}

export async function setQueueEntry(entry: QueuedEvent): Promise<void> {
  await kv.set(queueKey(entry.dateKey), entry);
  await kv.set(tagsKey(entry.dateKey), entry.tags);
}

export async function deleteQueueEntry(dateKey: string): Promise<void> {
  await kv.del(queueKey(dateKey));
  // Tags stay — they're useful for spacing checks even after promotion
}

// --- Tag spacing ---

/** Check if any of the given tags appear within 14 days of the target date */
export async function checkTagSpacing(targetDateKey: string, tags: string[]): Promise<{ collision: boolean; collidingTags: string[]; collidingDate: string | null }> {
  if (tags.length === 0) return { collision: false, collidingTags: [], collidingDate: null };

  const targetMonth = parseInt(targetDateKey.slice(0, 2), 10);
  const targetDay = parseInt(targetDateKey.slice(2, 4), 10);
  const targetDate = new Date(Date.UTC(2000, targetMonth - 1, targetDay)); // Leap year for Feb 29

  const tagSet = new Set(tags);

  for (let offset = -14; offset <= 14; offset++) {
    if (offset === 0) continue;
    const checkDate = new Date(targetDate);
    checkDate.setUTCDate(checkDate.getUTCDate() + offset);
    const checkKey = formatDateKey(checkDate.getUTCMonth() + 1, checkDate.getUTCDate());

    const existingTags = await kv.get<string[]>(tagsKey(checkKey));
    if (!existingTags) continue;

    const overlap = existingTags.filter(t => tagSet.has(t));
    if (overlap.length > 0) {
      return { collision: true, collidingTags: overlap, collidingDate: checkKey };
    }
  }

  return { collision: false, collidingTags: [], collidingDate: null };
}

/** Get all tags used within 14 days of the target date */
export async function getNearbyTags(targetDateKey: string): Promise<string[]> {
  const targetMonth = parseInt(targetDateKey.slice(0, 2), 10);
  const targetDay = parseInt(targetDateKey.slice(2, 4), 10);
  const targetDate = new Date(Date.UTC(2000, targetMonth - 1, targetDay));

  const allTags: string[] = [];
  for (let offset = -14; offset <= 14; offset++) {
    if (offset === 0) continue;
    const checkDate = new Date(targetDate);
    checkDate.setUTCDate(checkDate.getUTCDate() + offset);
    const checkKey = formatDateKey(checkDate.getUTCMonth() + 1, checkDate.getUTCDate());

    const existingTags = await kv.get<string[]>(tagsKey(checkKey));
    if (existingTags) {
      allTags.push(...existingTags);
    }
  }
  return [...new Set(allTags)];
}

// --- Recent content type lookups ---

/** Get content types from the previous N days (for fallback type rotation) */
export async function getRecentContentTypes(targetDateKey: string, lookback: number = 5): Promise<string[]> {
  const { getEvent } = await import("./store");
  const targetMonth = parseInt(targetDateKey.slice(0, 2), 10);
  const targetDay = parseInt(targetDateKey.slice(2, 4), 10);
  const targetDate = new Date(Date.UTC(2000, targetMonth - 1, targetDay));

  const types: string[] = [];
  for (let offset = -1; offset >= -lookback; offset--) {
    const checkDate = new Date(targetDate);
    checkDate.setUTCDate(checkDate.getUTCDate() + offset);
    const m = checkDate.getUTCMonth() + 1;
    const d = checkDate.getUTCDate();
    const checkKey = formatDateKey(m, d);

    const queued = await getQueueEntry(checkKey);
    if (queued) {
      types.push(queued.contentType);
      continue;
    }
    const live = await getEvent(m, d);
    if (live) {
      types.push(live.contentType);
    }
  }
  return types;
}

// --- Bulk read for calendar view ---

export async function getCalendarData(count: number): Promise<Array<{ dateKey: string; displayDate: string; queue: QueuedEvent | null; live: import("./store").StoredEvent | null }>> {
  const { getEvent } = await import("./store");
  const dates = getUpcomingDates(count);
  const results = await Promise.all(
    dates.map(async ({ month, day, dateKey, displayDate }) => ({
      dateKey,
      displayDate,
      queue: await getQueueEntry(dateKey),
      live: await getEvent(month, day),
    }))
  );
  return results;
}
