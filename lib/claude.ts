import Anthropic from "@anthropic-ai/sdk";
import type { SearchResult } from "./brave";
import { getTopicsForType, type TopicEntry } from "./topics";

const client = new Anthropic();

function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
  return fenced ? fenced[1].trim() : text.trim();
}

export type EventCategory =
  | "ufo"
  | "ghost"
  | "cryptids"
  | "mysteries"
  | "conspiracy"
  | "occult";

export type ContentType =
  | "event"
  | "cryptid"
  | "trivia"
  | "secret_society"
  | "occult_symbol"
  | "cursed_object";

export interface ParanormalEvent {
  headline: string;
  summary: string;
  year: string;
  category: EventCategory;
  contentType: ContentType;
  symbolKey?: string;
  tags: string[];
}

const VALID_CATEGORIES: Set<string> = new Set<string>([
  "ufo", "ghost", "cryptids", "mysteries", "conspiracy", "occult",
]);

const CATEGORY_LIST = Array.from(VALID_CATEGORIES).join(", ");

/** Infer topic tags from headline when Claude returns empty tags */
function inferTags(headline: string, category: string): string[] {
  const tags: string[] = [];
  if (category) tags.push(category);
  // Extract a slug from the headline (first 2-3 meaningful words)
  const slug = headline
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .split(/\s+/)
    .filter(w => w.length > 2 && !["the", "and", "for", "from", "with", "over", "near"].includes(w))
    .slice(0, 2)
    .join("-");
  if (slug) tags.push(slug);
  return tags;
}

function validCategory(val: unknown): EventCategory {
  if (typeof val === "string" && VALID_CATEGORIES.has(val)) {
    return val as EventCategory;
  }
  return "mysteries";
}

export async function summarizeParanormalEvent(
  monthName: string,
  day: number,
  results: SearchResult[]
): Promise<ParanormalEvent | null> {
  if (results.length === 0) return null;

  const snippets = results
    .map((r, i) => `[${i + 1}] ${r.title}\n${r.description}`)
    .join("\n\n");

  const response = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 512,
    system: `You are a writer for a "This Day in Paranormal History" daily feature.
Your tone is journalistic and factual — you report events as claimed without skepticism or sensationalism.
You cover the full gamut: UFO sightings, ghost encounters, cryptid sightings, unexplained disappearances, religious miracles, poltergeists, and other unexplained phenomena.`,
    messages: [
      {
        role: "user",
        content: `Today is ${monthName} ${day}. Based on the search results below, identify the single most notable paranormal event that occurred on this date in history and summarize it.

Respond with ONLY a JSON object in this exact format (no markdown, no extra text):
{
  "headline": "Short factual headline (max 10 words)",
  "summary": "2-4 sentences describing the event in a journalistic tone. Include the location and any key figures involved.",
  "year": "4-digit year of the event",
  "category": "one of: ${CATEGORY_LIST}",
  "tags": ["1-2 lowercase topic tags for deduplication, e.g. bigfoot, roswell, mothman"]
}

Category guide:
- ufo: UFO sightings, alien encounters, abductions
- ghost: Hauntings, apparitions, spectral encounters, poltergeist activity
- cryptids: Cryptid sightings (Bigfoot, Loch Ness, Mothman, Chupacabra, Yeti, Wendigo, Skinwalker, etc.)
- mysteries: Unexplained disappearances, religious miracles, psychic phenomena, remote viewing, ESP, and anything else unexplained
- conspiracy: Government cover-ups, Men in Black, secret experiments, secret societies
- occult: Occult practices, esoteric traditions, ritual magic, cursed objects

If no clear paranormal event occurred on ${monthName} ${day}, respond with exactly:
{"headline":"","summary":"","year":"","category":"mysteries"}

Search results:
${snippets}`,
      },
    ],
  });

  const raw =
    response.content[0].type === "text" ? response.content[0].text.trim() : "";
  const text = extractJson(raw);

  try {
    const parsed = JSON.parse(text) as {
      headline?: string;
      summary?: string;
      year?: string;
      category?: string;
      tags?: string[];
    };
    if (!parsed.headline || !parsed.summary || !parsed.year) return null;
    const category = validCategory(parsed.category);
    const tags = (parsed.tags && parsed.tags.length > 0)
      ? parsed.tags
      : inferTags(parsed.headline, category);
    return {
      headline: parsed.headline,
      summary: parsed.summary,
      year: parsed.year,
      category,
      contentType: "event",
      tags,
    };
  } catch {
    console.error("[claude] Failed to parse event JSON:", raw.slice(0, 200));
    return null;
  }
}

// --- Fallback content rotation ---

const FALLBACK_TYPES: FallbackContentType[] = [
  "cryptid",
  "trivia",
  "secret_society",
  "occult_symbol",
  "cursed_object",
];

function dayOfYear(monthName: string, day: number): number {
  const monthIndex = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ].indexOf(monthName);
  const d = new Date(2000, monthIndex, day); // leap year to handle Feb 29
  const start = new Date(2000, 0, 1);
  return Math.floor((d.getTime() - start.getTime()) / 86400000) + 1;
}

// Imported lazily to avoid circular deps at module level
let _symbolKeys: string[] | null = null;
async function getSymbolKeys(): Promise<string[]> {
  if (!_symbolKeys) {
    const { SYMBOL_KEYS } = await import("./symbols");
    _symbolKeys = SYMBOL_KEYS;
  }
  return _symbolKeys;
}

type FallbackContentType = Exclude<ContentType, "event">;

const FALLBACK_PROMPTS: Record<FallbackContentType, (monthName: string, day: number, symbolKeys?: string[]) => string> = {
  cryptid: (monthName, day) =>
    `Pick an obscure, lesser-known cryptid from world folklore. Not Bigfoot, Loch Ness, or Mothman — choose something unusual.

Respond with ONLY a JSON object:
{
  "headline": "Name of the cryptid (max 6 words)",
  "summary": "2-4 sentences about this cryptid: where it's reportedly seen, physical description, notable sightings or folklore. Journalistic tone.",
  "year": "—",
  "category": "one of: ${CATEGORY_LIST}"
}

Choose the cryptid based on today's date (${monthName} ${day}) for deterministic variety.`,

  trivia: (monthName, day) =>
    `Share an obscure piece of paranormal trivia — a strange fact, a lesser-known incident, or a weird historical connection to the paranormal. Not well-known stories.

Respond with ONLY a JSON object:
{
  "headline": "Short intriguing headline (max 8 words)",
  "summary": "2-4 sentences of fascinating paranormal trivia. Journalistic tone, factual reporting of claims.",
  "year": "—",
  "category": "one of: ${CATEGORY_LIST}"
}

Choose based on today's date (${monthName} ${day}) for variety.`,

  secret_society: (monthName, day) =>
    `Pick an obscure secret society, esoteric order, or occult organization from history. Not the Illuminati or Freemasons — choose something lesser-known.

Respond with ONLY a JSON object:
{
  "headline": "Name of the society (max 6 words)",
  "summary": "2-4 sentences: when it was active, its beliefs/goals, notable members or incidents. Journalistic tone.",
  "year": "—",
  "category": "conspiracy"
}

Choose based on today's date (${monthName} ${day}) for variety.`,

  occult_symbol: (_monthName, _day, symbolKeys) =>
    `Pick one occult or esoteric symbol from this list and describe its history and meaning:
${(symbolKeys ?? []).join(", ")}

Respond with ONLY a JSON object:
{
  "headline": "Name of the symbol (max 5 words)",
  "summary": "2-4 sentences about this symbol: its origin, tradition it belongs to, and what it represents. Journalistic tone.",
  "year": "—",
  "category": "occult",
  "symbolKey": "exact_key_from_list"
}

The symbolKey MUST be one of the keys listed above, exactly as written.`,

  cursed_object: (monthName, day) =>
    `Pick an obscure allegedly cursed object from history or folklore. Not the Hope Diamond or King Tut's tomb — choose something lesser-known.

Respond with ONLY a JSON object:
{
  "headline": "Name of the cursed object (max 6 words)",
  "summary": "2-4 sentences: the object's history, what curse is associated with it, and notable incidents. Journalistic tone.",
  "year": "—",
  "category": "occult"
}

Choose based on today's date (${monthName} ${day}) for variety.`,
};

export async function generateFallbackContent(
  monthName: string,
  day: number
): Promise<ParanormalEvent> {
  const doy = dayOfYear(monthName, day);
  const fallbackType = FALLBACK_TYPES[doy % 5];

  let symbolKeys: string[] | undefined;
  if (fallbackType === "occult_symbol") {
    symbolKeys = await getSymbolKeys();
  }

  const promptFn = FALLBACK_PROMPTS[fallbackType];
  const userPrompt = promptFn(monthName, day, symbolKeys);

  const response = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 512,
    system: `You are a writer for a daily paranormal/occult feature. Your tone is journalistic and factual — you report claims without skepticism or sensationalism. Choose obscure, lesser-known subjects for maximum variety and interest.`,
    messages: [{ role: "user", content: userPrompt }],
  });

  const raw =
    response.content[0].type === "text" ? response.content[0].text.trim() : "";
  const text = extractJson(raw);

  try {
    const parsed = JSON.parse(text) as {
      headline?: string;
      summary?: string;
      year?: string;
      category?: string;
      symbolKey?: string;
    };
    if (!parsed.headline || !parsed.summary) {
      console.error("[claude] Fallback missing fields:", text.slice(0, 200));
      return fallbackDefault(fallbackType);
    }
    return {
      headline: parsed.headline,
      summary: parsed.summary,
      year: parsed.year ?? "—",
      category: validCategory(parsed.category),
      contentType: fallbackType,
      symbolKey: fallbackType === "occult_symbol" ? parsed.symbolKey : undefined,
      tags: [],
    };
  } catch {
    console.error("[claude] Failed to parse fallback JSON:", raw.slice(0, 200));
    return fallbackDefault(fallbackType);
  }
}

function fallbackDefault(contentType: ContentType): ParanormalEvent {
  return {
    headline: "Signal From Beyond",
    summary: "The veil between worlds is thin today. Stay alert for signs of the unexplained.",
    year: "—",
    category: "mysteries",
    contentType,
    tags: [],
  };
}

export async function generateContentForDate(
  monthName: string,
  day: number,
  excludeTags: string[] = []
): Promise<ParanormalEvent> {
  const doy = dayOfYear(monthName, day);
  const monthNum = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ].indexOf(monthName) + 1;
  const dateKey = `${String(monthNum).padStart(2, "0")}${String(day).padStart(2, "0")}`;

  // Pick a fallback type that hasn't been used recently
  const { getRecentContentTypes } = await import("./queue");
  const recentTypes = await getRecentContentTypes(dateKey);
  let fallbackType = FALLBACK_TYPES[doy % FALLBACK_TYPES.length];
  for (let i = 0; i < FALLBACK_TYPES.length; i++) {
    const candidate = FALLBACK_TYPES[(doy + i) % FALLBACK_TYPES.length];
    if (!recentTypes.includes(candidate)) {
      fallbackType = candidate;
      break;
    }
  }

  // For occult_symbol, rotate deterministically through the 30 symbols
  if (fallbackType === "occult_symbol") {
    const symbolKeys = await getSymbolKeys();
    const excludeSet = new Set(excludeTags);

    // Find a symbol that isn't excluded
    let symbolKey: string | null = null;
    for (let i = 0; i < symbolKeys.length; i++) {
      const candidate = symbolKeys[(doy + i) % symbolKeys.length];
      if (!excludeSet.has(candidate)) {
        symbolKey = candidate;
        break;
      }
    }

    if (!symbolKey) {
      symbolKey = symbolKeys[doy % symbolKeys.length];
    }

    const response = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 512,
      system: `You are a writer for a daily paranormal/occult feature. Your tone is journalistic and factual — you report claims without skepticism or sensationalism.`,
      messages: [{
        role: "user",
        content: `Describe the history and meaning of this occult/esoteric symbol: ${symbolKey.replace(/_/g, " ")}

Respond with ONLY a JSON object:
{
  "headline": "Name of the symbol (max 5 words)",
  "summary": "2-4 sentences about this symbol: its origin, tradition it belongs to, and what it represents. Journalistic tone.",
  "year": "—",
  "category": "occult",
  "symbolKey": "${symbolKey}"
}`,
      }],
    });

    const raw = response.content[0].type === "text" ? response.content[0].text.trim() : "";
    const text = extractJson(raw);

    try {
      const parsed = JSON.parse(text) as { headline?: string; summary?: string; year?: string; symbolKey?: string };
      if (!parsed.headline || !parsed.summary) return fallbackDefault(fallbackType);
      return {
        headline: parsed.headline,
        summary: parsed.summary,
        year: parsed.year ?? "—",
        category: "occult" as EventCategory,
        contentType: "occult_symbol" as ContentType,
        symbolKey: symbolKey,
        tags: ["occult-symbol", symbolKey],
      };
    } catch {
      return fallbackDefault(fallbackType);
    }
  }

  const topics = getTopicsForType(fallbackType);
  if (topics.length === 0) {
    return generateFallbackContent(monthName, day);
  }

  // Pick a topic, rotating by day-of-year, skipping excluded tags
  const excludeSet = new Set(excludeTags);
  let topic: TopicEntry | null = null;
  for (let i = 0; i < topics.length; i++) {
    const candidate = topics[(doy + i) % topics.length];
    const hasExcluded = candidate.tags.some(t => excludeSet.has(t));
    if (!hasExcluded) {
      topic = candidate;
      break;
    }
  }

  if (!topic) {
    // All topics excluded, fall back to open-ended generation
    return generateFallbackContent(monthName, day);
  }

  const response = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 512,
    system: `You are a writer for a daily paranormal/occult feature. Your tone is journalistic and factual — you report claims without skepticism or sensationalism.`,
    messages: [{
      role: "user",
      content: `Write about the following ${fallbackType.replace("_", " ")}: ${topic.name}

Context: ${topic.description}

Respond with ONLY a JSON object:
{
  "headline": "Short headline (max 8 words)",
  "summary": "2-4 sentences about this subject. Journalistic tone, factual reporting of claims.",
  "year": "Relevant year or —",
  "category": "one of: ${CATEGORY_LIST}",
  "tags": ${JSON.stringify(topic.tags)}
}`,
    }],
  });

  const raw = response.content[0].type === "text" ? response.content[0].text.trim() : "";
  const text = extractJson(raw);

  try {
    const parsed = JSON.parse(text) as {
      headline?: string;
      summary?: string;
      year?: string;
      category?: string;
      tags?: string[];
    };
    if (!parsed.headline || !parsed.summary) {
      return fallbackDefault(fallbackType);
    }
    return {
      headline: parsed.headline,
      summary: parsed.summary,
      year: parsed.year ?? "—",
      category: validCategory(parsed.category),
      contentType: fallbackType,
      tags: parsed.tags ?? topic.tags,
    };
  } catch {
    console.error("[claude] Failed to parse curated fallback JSON:", raw.slice(0, 200));
    return fallbackDefault(fallbackType);
  }
}
