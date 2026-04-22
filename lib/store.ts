import { createClient } from "@vercel/kv";
import type { ParanormalEvent } from "./claude";

const kv = createClient({
  url: process.env.upstash_KV_REST_API_URL ?? process.env.KV_REST_API_URL ?? "",
  token: process.env.upstash_KV_REST_API_TOKEN ?? process.env.KV_REST_API_TOKEN ?? "",
});

export interface StoredEvent extends ParanormalEvent {
  dateKey: string; // MMDD
  displayDate: string; // e.g. "March 24"
  generatedAt: string; // ISO timestamp
}

function dateKey(month: number, day: number): string {
  return `${String(month).padStart(2, "0")}${String(day).padStart(2, "0")}`;
}

export function kvKey(month: number, day: number): string {
  return `paranormnl:event:${dateKey(month, day)}`;
}

export async function storeEvent(
  month: number,
  day: number,
  displayDate: string,
  event: ParanormalEvent
): Promise<void> {
  const stored: StoredEvent = {
    ...event,
    dateKey: dateKey(month, day),
    displayDate,
    generatedAt: new Date().toISOString(),
  };
  await kv.set(kvKey(month, day), stored);
}

export async function getEvent(
  month: number,
  day: number
): Promise<StoredEvent | null> {
  const event = await kv.get<StoredEvent>(kvKey(month, day));
  if (event && !event.tags) {
    event.tags = [];
  }
  return event;
}

export async function getAllEvents(): Promise<StoredEvent[]> {
  const keys: string[] = [];
  let cursor: string | number = "0";
  while (true) {
    const scanResult: [string, string[]] = await kv.scan(cursor, {
      match: "paranormnl:event:*",
      count: 100,
    });
    keys.push(...scanResult[1]);
    cursor = scanResult[0];
    if (scanResult[0] === "0") break;
  }

  if (keys.length === 0) return [];

  const values = await kv.mget<StoredEvent[]>(...keys);
  return values.filter((v): v is StoredEvent => v !== null).map(v => {
    if (!v.tags) v.tags = [];
    return v;
  });
}
