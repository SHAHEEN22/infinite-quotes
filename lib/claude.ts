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
    system: `You are a curator for a daily philosophical and literary quotes feature. You select quotes from great philosophers and authors. CRITICAL: Only use quotes from a SPECIFIC, NAMED work (book, dialogue, letter, essay). Cite the source in the summary. Never use internet-attributed or apocryphal quotes.`,
    messages: [
      {
        role: "user",
        content: `Today is ${monthName} ${day}. Based on the search results below, identify a notable quote from a philosopher or author associated with this date (born, died, or published work). Extract or paraphrase the quote and provide context.

Respond with ONLY a JSON object in this exact format (no markdown, no extra text):
{
  "headline": "The full quote translated into English. Must be a COMPLETE translation matching the original_text — do not truncate. MUST be in English even if the original is in another language.",
  "summary": "2-4 sentences: who said/wrote it, when, from which work, and why it matters or resonates today.",
  "year": "4-digit year the quote was written or the person lived",
  "category": "one of: ${CATEGORY_LIST}",
  "tags": ["1-2 lowercase topic tags for deduplication, e.g. stoicism, existentialism"],
  "original_text": "The quote written ONLY in its original language — the actual Ancient Greek, Latin, German, or French words. Never include English translations here. If the quote was originally in English, leave this empty.",
  "original_language": "The single original language name, e.g. Ancient Greek, Latin, German, French",
  "original_attribution": "Full name of the person who said/wrote this quote, e.g. Socrates, Albert Camus, Seneca"
}

Prefer quotes the person originally said or wrote. Always respond with valid JSON.

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
    `Share a quote from an ancient Greek or Roman philosopher that comes from a SPECIFIC, NAMED work. You must be able to cite the exact source (e.g. Plato's Republic Book VII, Aristotle's Nicomachean Ethics Book II, Marcus Aurelius' Meditations Book IV, Epictetus' Discourses Book I, Seneca's Epistulae Morales 47). Do NOT use internet-attributed quotes or sayings without a verifiable textual source. The original_text field MUST contain the actual Ancient Greek or Latin words.

Respond with ONLY a JSON object:
{
  "headline": "The full quote translated into English. Must be a COMPLETE translation matching the original_text — do not truncate. MUST be in English even if the original is in another language.",
  "summary": "2-4 sentences: who said it, when they lived, the context of the quote, and why it matters.",
  "year": "4-digit year or approximate era",
  "category": "one of: ${CATEGORY_LIST}",
  "original_text": "The quote ONLY in its original language — the actual Ancient Greek or Latin words, no English. If originally English, leave empty.",
  "original_language": "The single original language, e.g. Ancient Greek, Latin",
  "original_attribution": "Full name of the person who said/wrote this quote",
"source_work": "The specific work and section (e.g. Republic Book VII, Meditations IV.3). REQUIRED."
}

Choose based on today's date (${monthName} ${day}) for deterministic variety.`,

  german_philosopher: (monthName, day) =>
    `Share a quote from a German philosopher that comes from a SPECIFIC, NAMED work. You must cite the exact source (e.g. Kant's Critique of Pure Reason, Nietzsche's Beyond Good and Evil §146, Schopenhauer's The World as Will and Representation Book I, Hegel's Phenomenology of Spirit). Do NOT use commonly misattributed sayings. The original_text field MUST contain the actual German words from the source text.

Respond with ONLY a JSON object:
{
  "headline": "The full quote translated into English. Must be a COMPLETE translation matching the original_text — do not truncate. MUST be in English even if the original is in another language.",
  "summary": "2-4 sentences: who said it, the work it's from, the philosophical context, and its significance.",
  "year": "4-digit year or approximate era",
  "category": "one of: ${CATEGORY_LIST}",
  "original_text": "The quote written ONLY in German — the actual German words, no English translation.",
  "original_language": "German",
  "original_attribution": "Full name of the person who said/wrote this quote",
"source_work": "The specific work and section (e.g. Critique of Pure Reason B132, Beyond Good and Evil §146). REQUIRED."
}

Choose based on today's date (${monthName} ${day}) for variety.`,

  french_philosopher: (monthName, day) =>
    `Share a quote from a French philosopher that comes from a SPECIFIC, NAMED work. You must cite the exact source (e.g. Descartes' Meditations on First Philosophy, Montaigne's Essays Book III Ch. 13, Pascal's Pensées §347, Camus' The Myth of Sisyphus, Sartre's Being and Nothingness). Do NOT use commonly misattributed sayings. The original_text field MUST contain the actual French words from the source text.

Respond with ONLY a JSON object:
{
  "headline": "The full quote translated into English. Must be a COMPLETE translation matching the original_text — do not truncate. MUST be in English even if the original is in another language.",
  "summary": "2-4 sentences: who said it, the philosophical tradition, the context of the quote, and why it endures.",
  "year": "4-digit year or approximate era",
  "category": "one of: ${CATEGORY_LIST}",
  "original_text": "The quote written ONLY in French — the actual French words, no English translation.",
  "original_language": "French",
  "original_attribution": "Full name of the person who said/wrote this quote"
}

Choose based on today's date (${monthName} ${day}) for variety.`,

  fiction_author: (monthName, day) =>
    `Share a passage from a famous work of fiction that you can cite by SPECIFIC work and chapter/act/section. You must name the exact source (e.g. Shakespeare's Hamlet Act III Scene 1, Dostoevsky's The Brothers Karamazov Book V Ch. 5, Kafka's The Trial Ch. 9, Goethe's Faust Part I). Do NOT use commonly misattributed sayings. If the work was not originally in English, the original_text field MUST contain the actual original-language words.

Respond with ONLY a JSON object:
{
  "headline": "The full quote translated into English. Must be a COMPLETE translation matching the original_text — do not truncate. MUST be in English even if the original is in another language.",
  "summary": "2-4 sentences: who wrote it, which work it's from, the literary context, and why this passage resonates.",
  "year": "4-digit year or approximate era",
  "category": "one of: ${CATEGORY_LIST}",
  "original_text": "The quote ONLY in its original language — the actual French, German, etc. words. No English. If originally English, leave empty.",
  "original_language": "The single original language, e.g. English, French, German",
  "original_attribution": "Full name of the person who wrote this quote",
"source_work": "The specific work and section (e.g. Hamlet Act III Scene 1, Faust Part I). REQUIRED."
}

Choose based on today's date (${monthName} ${day}) for variety.`,

  classical_author: (monthName, day) =>
    `Share a passage from an ancient Greek or Roman literary work that you can cite by SPECIFIC work and section. You must name the exact source (e.g. Homer's Iliad Book I, Virgil's Aeneid Book VI, Ovid's Metamorphoses Book I, Sophocles' Antigone lines 450-460, Cicero's De Officiis Book I). Do NOT use commonly misattributed sayings. The original_text field MUST contain the actual Ancient Greek or Latin words from the source text.

Respond with ONLY a JSON object:
{
  "headline": "The full quote translated into English. Must be a COMPLETE translation matching the original_text — do not truncate. MUST be in English even if the original is in another language.",
  "summary": "2-4 sentences: who wrote it, which work, the historical context, and why this wisdom endures across millennia.",
  "year": "4-digit year or approximate era",
  "category": "one of: ${CATEGORY_LIST}",
  "original_text": "The quote ONLY in its original language — the actual Ancient Greek or Latin words, no English. If originally English, leave empty.",
  "original_language": "The single original language, e.g. Ancient Greek, Latin",
  "original_attribution": "Full name of the person who wrote this quote",
"source_work": "The specific work and section (e.g. Iliad Book I, Aeneid Book VI). REQUIRED."
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
    system: `You are a curator for a daily philosophical and literary quotes feature. Your tone is thoughtful and appreciative — you share profound quotes that resonate across time. Select lesser-known or surprising quotes for maximum variety and delight.`,
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
    return ensureOriginalText({
      headline: parsed.headline,
      summary: parsed.summary,
      year: parsed.year ?? "—",
      category: validCategory(parsed.category),
      contentType: fallbackType,
      tags: [],
      originalText: parsed.original_text,
      originalLanguage: parsed.original_language,
      originalAttribution: parsed.original_attribution,
    });
  } catch {
    console.error("[claude] Failed to parse fallback JSON:", raw.slice(0, 200));
    return fallbackDefault(fallbackType);
  }
}

function fallbackDefault(contentType: ContentType): ParanormalEvent {
  return {
    headline: "In wisdom there is great power.",
    summary: "The greatest thinkers throughout history have left us words to live by. Today, let us pause and reflect on the enduring power of philosophy and literature to illuminate our path.",
    year: "—",
    category: "wisdom",
    contentType,
    tags: [],
  };
}

/** Check if text actually contains characters from the claimed original language.
 *  Catches cases where Claude returns English text but labels it as Greek, etc. */
function textMatchesLanguage(text: string, language: string): boolean {
  const lang = language.toLowerCase();
  // For non-Latin-script languages, verify expected characters are present
  if (lang.includes('greek')) {
    // Greek Unicode: U+0370-U+03FF (Greek and Coptic), U+1F00-U+1FFF (Extended Greek)
    return /[Ͱ-Ͽἀ-῿]/.test(text);
  }
  if (lang.includes('arabic') || lang.includes('persian')) {
    return /[؀-ۿ]/.test(text);
  }
  if (lang.includes('chinese') || lang.includes('mandarin')) {
    return /[一-鿿]/.test(text);
  }
  if (lang.includes('japanese')) {
    return /[぀-ゟ゠-ヿ一-鿿]/.test(text);
  }
  if (lang.includes('korean')) {
    return /[가-힯]/.test(text);
  }
  if (lang.includes('russian') || lang.includes('cyrillic')) {
    return /[Ѐ-ӿ]/.test(text);
  }
  if (lang.includes('hebrew')) {
    return /[֐-׿]/.test(text);
  }
  if (lang.includes('sanskrit') || lang.includes('hindi') || lang.includes('devanagari')) {
    return /[ऀ-ॿ]/.test(text);
  }
  // For Latin-script languages, check for language-specific markers
  if (lang === 'german') {
    return /[äöüßÄÖÜ]/.test(text);
  }
  if (lang === 'french') {
    return /[àâæçéèêëîïôœùûüÿ]/i.test(text);
  }
  // For Latin and others, accept as-is since hard to distinguish from English
  return true;
}

/** Validation result for generated quotes */
export interface ValidationResult {
  valid: boolean;
  reasons: string[];
}

/** Patterns that indicate Claude returned a refusal instead of content */
const REFUSAL_PATTERNS = [
  /\bI cannot\b/i,
  /\bI can't\b/i,
  /\bI'm unable\b/i,
  /\bI am unable\b/i,
  /\bI don't have\b/i,
  /\bI do not have\b/i,
  /\bunable to provide\b/i,
  /\bcannot provide\b/i,
  /\bI apologize\b/i,
  /\bI'm sorry\b/i,
  /\bas an AI\b/i,
  /\bI should note\b/i,
  /\bI need to clarify\b/i,
];

/** Validate a generated quote before storing it in KV */
export function validateQuote(
  event: ParanormalEvent,
  recentHeadlines: string[] = []
): ValidationResult {
  const reasons: string[] = [];

  // 1. Required fields must be non-empty
  if (!event.headline || event.headline.trim().length === 0) {
    reasons.push("headline is empty");
  }
  if (!event.summary || event.summary.trim().length === 0) {
    reasons.push("summary is empty");
  }
  if (!event.year || event.year.trim().length === 0) {
    reasons.push("year is empty");
  }

  // 2. Check for Claude refusal patterns in headline and summary
  for (const pattern of REFUSAL_PATTERNS) {
    if (event.headline && pattern.test(event.headline)) {
      reasons.push("headline contains refusal pattern: " + pattern.source);
      break;
    }
  }
  for (const pattern of REFUSAL_PATTERNS) {
    if (event.summary && pattern.test(event.summary)) {
      reasons.push("summary contains refusal pattern: " + pattern.source);
      break;
    }
  }

  // 3. Check originalText matches claimed language (if present)
  if (
    event.originalText &&
    event.originalText.trim().length > 0 &&
    event.originalLanguage &&
    event.originalLanguage.toLowerCase() !== "english"
  ) {
    if (!textMatchesLanguage(event.originalText, event.originalLanguage)) {
      reasons.push("originalText doesn't match claimed language: " + event.originalLanguage);
    }
    for (const pattern of REFUSAL_PATTERNS) {
      if (pattern.test(event.originalText)) {
        reasons.push("originalText contains refusal pattern");
        break;
      }
    }
  }

  // 4. Duplicate headline check
  if (event.headline && recentHeadlines.length > 0) {
    const normalizedHeadline = event.headline.toLowerCase().trim();
    const isDuplicate = recentHeadlines.some(
      (h) => h.toLowerCase().trim() === normalizedHeadline
    );
    if (isDuplicate) {
      reasons.push("headline is a duplicate of a recent quote");
    }
  }

  // 5. Headline length sanity check
  if (event.headline && event.headline.split(/\s+/).length > 25) {
    reasons.push("headline is too long (over 25 words)");
  }

  // 6. Category must be valid
  if (!VALID_CATEGORIES.has(event.category)) {
    reasons.push("invalid category: " + event.category);
  }

  return {
    valid: reasons.length === 0,
    reasons,
  };
}

async function ensureOriginalText(event: ParanormalEvent): Promise<ParanormalEvent> {
  // Skip if originally in English
  if (!event.originalLanguage || event.originalLanguage.toLowerCase() === "english") return event;

  // Skip if already has original text that actually matches the claimed language
  // (catches cases where Claude puts English translation in the original_text field)
  if (event.originalText && event.originalText.trim().length > 0 && textMatchesLanguage(event.originalText, event.originalLanguage)) return event;

  // Log when we detect English text masquerading as original language
  if (event.originalText && event.originalText.trim().length > 0) {
    console.log(`[claude] Detected English text in original_text field for ${event.originalLanguage} — regenerating`);
  }

  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 256,
      messages: [{
        role: "user",
        content: `Provide the original ${event.originalLanguage} text for this quote attributed to ${event.originalAttribution || "unknown"}:\n\n"${event.headline}"\n\nRespond with ONLY the quote in ${event.originalLanguage}. No English, no translation, no explanation, no quotation marks. Just the original words. If the exact original cannot be sourced, provide a faithful rendering in ${event.originalLanguage} that captures the same meaning.`,
      }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text.trim() : "";
    if (text.length > 0 && textMatchesLanguage(text, event.originalLanguage)) {
      event.originalText = text;
      console.log(`[claude] Repaired original text for ${event.originalAttribution} (${event.originalLanguage})`);
    } else if (text.length > 0) {
      // Claude returned English explanation/refusal instead of original language text — clear it
      console.log(`[claude] Claude returned non-${event.originalLanguage} text for repair — clearing original_text to prevent displaying refusal`);
      event.originalText = "";
      event.originalLanguage = "";
    }
  } catch (err) {
    console.error("[claude] Failed to repair original text:", err instanceof Error ? err.message : String(err));
  }

  return event;
}

export async function generateContentForDate(
  monthName: string,
  day: number,
  excludeTags: string[] = []
): Promise<ParanormalEvent> {
  const doy = dayOfYear(monthName, day);
  const year = new Date().getFullYear();
  const seed = doy + year * 7; // Vary rotation by year so same date picks different topics each year
  const monthNum = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ].indexOf(monthName) + 1;
  const dateKey = `${String(monthNum).padStart(2, "0")}${String(day).padStart(2, "0")}`;

  // Pick a random fallback type, avoiding recently used types
  const { getRecentContentTypes } = await import("./queue");
  const recentTypes = await getRecentContentTypes(dateKey);
  const shuffledTypes = [...FALLBACK_TYPES].sort(() => Math.random() - 0.5);
  let fallbackType = shuffledTypes[0]; // random default
  for (const candidate of shuffledTypes) {
    if (!recentTypes.includes(candidate)) {
      fallbackType = candidate;
      break;
    }
  }

  const topics = getTopicsForType(fallbackType);
  if (topics.length === 0) {
    return generateFallbackContent(monthName, day);
  }

  // Pick a random topic, skipping excluded tags
  const excludeSet = new Set(excludeTags);

    // Get recently used philosopher/author names to avoid repeats
    const { getRecentAttributions } = await import("./store");
    const recentAttributions = await getRecentAttributions(14);
    const recentAttrSet = new Set(recentAttributions.map(a => a.toLowerCase()));

    const shuffledTopics = [...topics].sort(() => Math.random() - 0.5);
    let topic: TopicEntry | null = null;
    for (const candidate of shuffledTopics) {
          const hasExcluded = candidate.tags.some(t => excludeSet.has(t));
          const recentlyUsed = recentAttrSet.has(candidate.name.toLowerCase());
          if (!hasExcluded && !recentlyUsed) {
                  topic = candidate;
                  break;
          }
    }
    // If all topics were recently used or excluded, pick any non-excluded one
    if (!topic) {
          for (const candidate of shuffledTopics) {
                  const hasExcluded = candidate.tags.some(t => excludeSet.has(t));
                  if (!hasExcluded) {
                            topic = candidate;
                            break;
                  }
          }
    }

  if (!topic) {
    // All topics excluded, fall back to open-ended generation
    return generateFallbackContent(monthName, day);
  }

  // Fetch recent headlines to avoid repeating the same quotes
  const { getRecentHeadlines } = await import("./store");
  const recentHeadlines = await getRecentHeadlines(30);
  const recentExclusion = recentHeadlines.length > 0
    ? `\n\nIMPORTANT: Do NOT repeat any of these recently shown quotes — pick something DIFFERENT:\n${recentHeadlines.map(h => `- "${h}"`).join("\n")}\n\nChoose a lesser-known or surprising quote instead.`
    : "";

  // PRIMARY PATH: Search Brave for real, sourced quotes from this philosopher
  const { searchPhilosopherQuotes } = await import("./brave");
  const searchResults = await searchPhilosopherQuotes(topic.name, topic.description);

  if (searchResults.length > 0) {
    console.log(`[claude] Found ${searchResults.length} Brave results for ${topic.name}, using search-based generation`);
    const snippets = searchResults
      .map((r, i) => `[${i + 1}] ${r.title}\n${r.description}`)
      .join("\n\n");

    const searchResponse = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 512,
      system: `You are a curator for a daily philosophical and literary quotes feature. CRITICAL RULES:\n1. Only select quotes that appear in the search results with a SPECIFIC, NAMED source work.\n2. Cite the exact source work in the summary.\n3. The original_text field MUST contain the actual words in the original language.\n4. Do NOT invent or paraphrase — use the actual quote from the search results.`,
      messages: [{
        role: "user",
        content: `Based on the search results below about ${topic.name}, select a real quote with its verified source.

Search results:
${snippets}

Respond with ONLY a JSON object:
{
  "headline": "The full quote translated into English. Must be a COMPLETE translation matching the original_text — do not truncate. MUST be in English.",
  "summary": "2-4 sentences: the source work (book, chapter, section), context, and why it endures.",
  "year": "4-digit year",
  "category": "one of: ${CATEGORY_LIST}",
  "tags": ${JSON.stringify(topic.tags)},
  "original_text": "The quote ONLY in its original language. REQUIRED for non-English sources.",
  "original_language": "The original language",
  "original_attribution": "${topic.name}",
  "source_work": "The specific work and section. REQUIRED."
}${recentExclusion}`,
      }],
    });

    const searchRaw = searchResponse.content[0].type === "text" ? searchResponse.content[0].text.trim() : "";
    const searchText = extractJson(searchRaw);
    try {
      const parsed = JSON.parse(searchText) as {
        headline?: string; summary?: string; year?: string; category?: string;
        tags?: string[]; original_text?: string; original_language?: string;
        original_attribution?: string; source_work?: string;
      };
      if (parsed.headline && parsed.summary) {
        console.log(`[claude] Search-based quote: "${parsed.headline}" (source: ${parsed.source_work || "unknown"})`);
        return ensureOriginalText({
          headline: parsed.headline,
          summary: parsed.summary,
          year: parsed.year ?? "—",
          category: validCategory(parsed.category),
          contentType: fallbackType,
          tags: parsed.tags ?? topic.tags,
          originalText: parsed.original_text,
          originalLanguage: parsed.original_language,
          originalAttribution: parsed.original_attribution,
        });
      }
    } catch {
      console.warn("[claude] Failed to parse search-based quote, falling back to direct generation");
    }
  } else {
    console.log(`[claude] No Brave results for ${topic.name}, using direct generation`);
  }

  // FALLBACK: Direct Claude generation (only if Brave search returned nothing useful)
  const response = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 512,
    system: `You are a curator for a daily philosophical and literary quotes feature. Your tone is thoughtful and appreciative — you share profound quotes that resonate across time. Select lesser-known or surprising quotes for maximum variety.`,
    messages: [{
      role: "user",
      content: `Share a famous quote from ${topic.name}:

Context: ${topic.description}

Respond with ONLY a JSON object:
{
  "headline": "The full quote translated into English. Must be a COMPLETE translation matching the original_text — do not truncate. MUST be in English even if the original is in another language.",
  "summary": "2-4 sentences: the quote's context, who said/wrote it, and why this wisdom endures.",
  "year": "4-digit year or approximate era",
  "category": "one of: ${CATEGORY_LIST}",
  "tags": ${JSON.stringify(topic.tags)},
  "original_text": "The quote ONLY in its original language — actual Greek, Latin, German, or French words. No English. If originally English, leave empty.",
  "original_language": "The single original language, e.g. Ancient Greek, Latin, German, French",
  "original_attribution": "Full name of the person who said/wrote this quote, e.g. ${topic.name}"
}${recentExclusion}`,
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
    return ensureOriginalText({
      headline: parsed.headline,
      summary: parsed.summary,
      year: parsed.year ?? "—",
      category: validCategory(parsed.category),
      contentType: fallbackType,
      tags: parsed.tags ?? topic.tags,
      originalText: parsed.original_text,
      originalLanguage: parsed.original_language,
      originalAttribution: parsed.original_attribution,
    });
  } catch {
    console.error("[claude] Failed to parse curated fallback JSON:", raw.slice(0, 200));
    return fallbackDefault(fallbackType);
  }
}
