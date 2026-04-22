import type { ContentType } from "./claude";
import type { StoredEvent } from "./store";

export const LABELS: Record<ContentType, string> = {
  event: "TODAY'S QUOTE",
  greek_philosopher: "ANCIENT WISDOM",
  german_philosopher: "GERMAN PHILOSOPHY",
  french_philosopher: "FRENCH PHILOSOPHY",
  fiction_author: "LITERARY WISDOM",
  classical_author: "CLASSICAL LITERATURE",
};

export interface ApiEvent {
  headline: string;
  summary: string;
  year: string;
  display_date: string;
  label: string;
  category: string;
  content_type: string;
  date_key: string;
  generated_at: string;
  original_text?: string;
  original_language?: string;
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
    date_key: event.dateKey,
    generated_at: event.generatedAt,
    original_text: event.originalText,
    original_language: event.originalLanguage,
  };
}
