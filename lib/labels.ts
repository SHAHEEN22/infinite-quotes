import type { ContentType } from "./claude";
import type { StoredEvent } from "./store";

export const LABELS: Record<ContentType, string> = {
  event: "THIS DAY IN PARANORMAL HISTORY",
  cryptid: "CRYPTID OF THE DAY",
  trivia: "PARANORMAL TRIVIA",
  secret_society: "SECRET SOCIETIES",
  occult_symbol: "OCCULT SYMBOL OF THE DAY",
  cursed_object: "CURSED OBJECT OF THE DAY",
};

export interface ApiEvent {
  headline: string;
  summary: string;
  year: string;
  display_date: string;
  label: string;
  category: string;
  content_type: string;
  symbol_key?: string;
  date_key: string;
  generated_at: string;
}

export function toApiResponse(event: StoredEvent): ApiEvent {
  return {
    headline: event.headline,
    summary: event.summary,
    year: event.year,
    display_date: event.displayDate,
    label: LABELS[event.contentType] ?? LABELS.event,
    category: event.category,
    content_type: event.contentType,
    symbol_key: event.symbolKey,
    date_key: event.dateKey,
    generated_at: event.generatedAt,
  };
}
