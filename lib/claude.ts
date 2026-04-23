import Anthropic from "@anthropic-ai/sdk";
import type { SearchResult } from "./brave";
import { getTopicsForType, type TopicEntry } from "./topics";

const client = new Anthropic();

function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
  return fenced ? fenced[1].trim() : text.trim();
}

export type EventCategory =
  | "philosophy"
  | "literature"
  | "wisdom"
  | "ethics"
  | "metaphysics"
  | "existentialism";

export type ContentType =
  | "event"
  | "greek_philosopher"
  | "german_philosopher"
  | "french_philosopher"
  | "fiction_author"
  | "classical_author";

export interface ParanormalEvent {
  headline: string;
  summary: string;
  year: string;
  category: EventCategory;
  contentType: ContentType;
  tags: string[];
  originalText?: string;
  originalLanguage?: string;
  originalAttribution?: string;
}

const VALID_CATEGORIES: Set<string> = new Set<string>([
  "philosophy", "literature", "wisdom", "ethics", "metaphysics", "existentialism",
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
    .filter(w => w.length > 2 && !["the", "and", "for", "from", "with", "over", "near", "by"].includes(w))
    .slice(0, 2)
    .join("-");
  if (slug) tags.push(slug);
  return tags;
}

function validCategory(val: unknown): EventCategory {
  if (typeof val === "string" && VALID_CATEGORIES.has(val)) {
    return val as EventCategory;
  }
  return "wisdom";
}

export async function summarizeQuote(
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
    system: `You are a curator for a daily philosophical and literary quotes feature. You select profound, thought-provoking quotes from great philosophers and authors throughout history, providing context about the thinker and the significance of their words.`,
    messages: [
      {
        role: "user",
        content: `Today is ${monthName} ${day}. Based on the search results below, identify a notable quote from a philosopher or author associated with this date (born, died, or published work). Extract or paraphrase the quote and provide context.

Respond with ONLY a JSON object in this exact format (no markdown, no extra text):
{
  "headline": "The quote (max 15 words)",
  "summary": "2-4 sentences: who said/wrote it, when, from which work, and why it matters or resonates today.",
  "year": "Year with CE or BCE suffix, e.g. 399 BCE, 1785 CE",
  "category": "one of: ${CATEGORY_LIST}",
  "tags": ["1-2 lowercase topic tags for deduplication, e.g. stoicism, existentialism"],
  "original_text": "The quote written ONLY in its original language \u2014 the actual Ancient Greek, Latin, German, or French words. Never include English translations here. If the quote was originally in English, leave this empty.",
  "original_language": "The single original language name, e.g. Ancient Greek, Latin, German, French",
  "original_attribution": "The name of the person who ORIGINALLY said or wrote the quote, e.g. Socrates, Albert Camus, Seneca"
}

IMPORTANT: Only attribute the quote to someone who ORIGINALLY said or wrote it. Do not attribute a quote to someone who merely discussed, referenced, or quoted it in their own work.

Category guide:
- philosophy: philosophical concepts, epistemology, metaphysics
- literature: literary works, narrative, storytelling
- wisdom: practical wisdom, virtue, how to live
- ethics: morality, virtue, right action
- metaphysics: being, existence, reality
- existentialism: freedom, meaning, existence

If no clear quote or philosopher found on ${monthName} ${day}, respond with exactly:
{"headline":"","summary":"","year":"","category":"wisdom"}

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
      original_text?: string;
      original_language?: string;
      original_attribution?: string;
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
      originalText: parsed.original_text,
      originalLanguage: parsed.original_language,
      originalAttribution: parsed.original_attribution,
    };
  } catch {
    console.error("[claude] Failed to parse quote JSON:", raw.slice(0, 200));
    return null;
  }
}

// --- Fallback content rotation ---

const FALLBACK_TYPES: FallbackContentType[] = [
  "greek_philosopher",
  "german_philosopher",
  "french_philosopher",
  "fiction_author",
  "classical_author",
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

type FallbackContentType = Exclude<ContentType, "event">;

const FALLBACK_PROMPTS: Record<FallbackContentType, (monthName: string, day: number) => string> = {
  greek_philosopher: (monthName, day) =>
    `Share a profound quote from an ancient Greek philosopher (Socrates, Plato, Aristotle, Epictetus, Marcus Aurelius, Seneca, etc.). Include the original context and why this idea endures.

IMPORTANT: Only use quotes that this philosopher ORIGINALLY said or wrote. Do not use quotes they merely discussed, referenced, or attributed to others.

Respond with ONLY a JSON object:
{
  "headline": "The quote (max 15 words)",
  "summary": "2-4 sentences: who said it, when they lived, the context of the quote, and why it matters.",
  "year": "Year with CE or BCE suffix, e.g. 399 BCE, 1785 CE",
  "category": "one of: ${CATEGORY_LIST}",
  "original_text": "The quote ONLY in its original language \u2014 the actual Ancient Greek or Latin words, no English. If originally English, leave empty.",
  "original_language": "The single original language, e.g. Ancient Greek, Latin",
  "original_attribution": "The name of the person who originally said/wrote the quote"
}

Choose based on today's date (${monthName} ${day}) for deterministic variety.`,

  german_philosopher: (monthName, day) =>
    `Share a thought-provoking quote from a German philosopher (16th-20th century: Kant, Hegel, Nietzsche, Schopenhauer, Heidegger, Marx, Leibniz, etc.). Provide context about the work it comes from.

IMPORTANT: Only use quotes that this philosopher ORIGINALLY said or wrote. Do not use quotes they merely discussed, referenced, or attributed to others.

Respond with ONLY a JSON object:
{
  "headline": "The quote (max 15 words)",
  "summary": "2-4 sentences: who said it, the work it's from, the philosophical context, and its significance.",
  "year": "Year with CE or BCE suffix, e.g. 399 BCE, 1785 CE",
  "category": "one of: ${CATEGORY_LIST}",
  "original_text": "The quote written ONLY in German \u2014 the actual German words, no English translation.",
  "original_language": "German",
  "original_attribution": "The name of the person who originally said/wrote the quote"
}

Choose based on today's date (${monthName} ${day}) for variety.`,

  french_philosopher: (monthName, day) =>
    `Share an insightful quote from a French philosopher (16th-20th century: Descartes, Voltaire, Rousseau, Montaigne, Pascal, Sartre, Camus, de Beauvoir, Foucault, etc.). Explain its philosophical significance.

IMPORTANT: Only use quotes that this philosopher ORIGINALLY said or wrote. Do not use quotes they merely discussed, referenced, or attributed to others.

Respond with ONLY a JSON object:
{
  "headline": "The quote (max 15 words)",
  "summary": "2-4 sentences: who said it, the philosophical tradition, the context of the quote, and why it endures.",
  "year": "Year with CE or BCE suffix, e.g. 399 BCE, 1785 CE",
  "category": "one of: ${CATEGORY_LIST}",
  "original_text": "The quote written ONLY in French \u2014 the actual French words, no English translation.",
  "original_language": "French",
  "original_attribution": "The name of the person who originally said/wrote the quote"
}

Choose based on today's date (${monthName} ${day}) for variety.`,

  fiction_author: (monthName, day) =>
    `Share a memorable quote from a famous fiction author (English, French, or German: Shakespeare, Dickens, Austen, Wilde, Orwell, Tolkien, Hugo, Flaubert, Proust, Goethe, Kafka, Mann, Hesse, etc.). Explain the work it comes from and its literary significance.

IMPORTANT: Only use quotes that this author ORIGINALLY wrote. Do not use quotes they merely discussed, referenced, or attributed to others.

Respond with ONLY a JSON object:
{
  "headline": "The quote (max 15 words)",
  "summary": "2-4 sentences: who wrote it, which work it's from, the literary context, and why this passage resonates.",
  "year": "Year with CE or BCE suffix, e.g. 399 BCE, 1785 CE",
  "category": "one of: ${CATEGORY_LIST}",
  "original_text": "The quote ONLY in its original language \u2014 the actual French, German, etc. words. No English. If originally English, leave empty.",
  "original_language": "The single original language, e.g. English, French, German",
  "original_attribution": "The name of the person who originally wrote the quote"
}

Choose based on today's date (${monthName} ${day}) for variety.`,

  classical_author: (monthName, day) =>
    `Share a timeless quote from an ancient Greek or Roman author (Homer, Sophocles, Virgil, Ovid, Horace, Cicero, Plutarch, etc.). Provide context about the original work.

IMPORTANT: Only use quotes that this author ORIGINALLY wrote. Do not use quotes they merely discussed, referenced, or attributed to others. For example, do not attribute "Know thyself" to Plutarch \u2014 he wrote about it, but it is a Delphic maxim.

Respond with ONLY a JSON object:
{
  "headline": "The quote (max 15 words)",
  "summary": "2-4 sentences: who wrote it, which work, the historical context, and why this wisdom endures across millennia.",
  "year": "Year with CE or BCE suffix, e.g. 399 BCE, 1785 CE",
  "category": "one of: ${CATEGORY_LIST}",
  "original_text": "The quote ONLY in its original language \u2014 the actual Ancient Greek or Latin words, no English. If originally English, leave empty.",
  "original_language": "The single original language, e.g. Ancient Greek, Latin",
  "original_attribution": "The name of the person who originally wrote the quote"
}

Choose based on today's date (${monthName} ${day}) for variety.`,
};


export async function generateFallbackContent(
  monthName: string,
  day: number
): Promise<ParanormalEvent> {
  const doy = dayOfYear(monthName, day);
  const fallbackType = FALLBACK_TYPES[doy % FALLBACK_TYPES.length];

  const promptFn = FALLBACK_PROMPTS[fallbackType];
  const userPrompt = promptFn(monthName, day);

  const response = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 512,
    system: `You are a curator for a daily philosophical and literary quotes feature. Your tone is thoughtful and appreciative \u2014 you share profound quotes that resonate across time. Select lesser-known or surprising quotes for maximum variety and delight.`,
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
      original_text?: string;
      original_language?: string;
      original_attribution?: string;
    };
    if (!parsed.headline || !parsed.summary) {
      console.error("[claude] Fallback missing fields:", text.slice(0, 200));
      return fallbackDefault(fallbackType);
    }
    return {
      headline: parsed.headline,
      summary: parsed.summary,
      year: parsed.year ?? "\u2014",
      category: validCategory(parsed.category),
      contentType: fallbackType,
      tags: [],
      originalText: parsed.original_text,
      originalLanguage: parsed.original_language,
      originalAttribution: parsed.original_attribution,
    };
  } catch {
    console.error("[claude] Failed to parse fallback JSON:", raw.slice(0, 200));
    return fallbackDefault(fallbackType);
  }
}

function fallbackDefault(contentType: ContentType): ParanormalEvent {
  return {
    headline: "In wisdom there is great power.",
    summary: "The greatest thinkers throughout history have left us words to live by. Today, let us pause and reflect on the enduring power of philosophy and literature to illuminate our path.",
    year: "\u2014",
    category: "wisdom",
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
    system: `You are a curator for a daily philosophical and literary quotes feature. Your tone is thoughtful and appreciative \u2014 you share profound quotes that resonate across time.`,
    messages: [{
      role: "user",
      content: `Share a famous quote from ${topic.name}:

Context: ${topic.description}

IMPORTANT: Only use a quote that ${topic.name} ORIGINALLY said or wrote. Do not use quotes they merely discussed, referenced, or attributed to others.

Respond with ONLY a JSON object:
{
  "headline": "The quote (max 15 words)",
  "summary": "2-4 sentences: the quote's context, who said/wrote it, and why this wisdom endures.",
  "year": "Year with CE or BCE suffix, e.g. 399 BCE, 1785 CE",
  "category": "one of: ${CATEGORY_LIST}",
  "tags": ${JSON.stringify(topic.tags)},
  "original_text": "The quote ONLY in its original language \u2014 actual Greek, Latin, German, or French words. No English. If originally English, leave empty.",
  "original_language": "The single original language, e.g. Ancient Greek, Latin, German, French",
  "original_attribution": "The name of the person who originally said/wrote the quote, e.g. ${topic.name}"
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
      original_text?: string;
      original_language?: string;
      original_attribution?: string;
    };
    if (!parsed.headline || !parsed.summary) {
      return fallbackDefault(fallbackType);
    }
    return {
      headline: parsed.headline,
      summary: parsed.summary,
      year: parsed.year ?? "\u2014",
      category: validCategory(parsed.category),
      contentType: fallbackType,
      tags: parsed.tags ?? topic.tags,
      originalText: parsed.original_text,
      originalLanguage: parsed.original_language,
      originalAttribution: parsed.original_attribution,
    };
  } catch {
    console.error("[claude] Failed to parse curated fallback JSON:", raw.slice(0, 200));
    return fallbackDefault(fallbackType);
  }
}
