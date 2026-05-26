const BRAVE_API_URL = "https://api.search.brave.com/res/v1/web/search";

export interface SearchResult {
  title: string;
  description: string;
  url: string;
}

export async function searchQuotes(
  monthName: string,
  day: number
): Promise<SearchResult[]> {
  const apiKey = process.env.BRAVE_API_KEY;
  if (!apiKey) throw new Error("BRAVE_API_KEY is not set");

  const query = `famous quote "${monthName} ${day}" philosopher author wisdom literature born died`;
  const url = new URL(BRAVE_API_URL);
  url.searchParams.set("q", query);
  url.searchParams.set("count", "8");
  url.searchParams.set("search_lang", "en");

  const response = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      "Accept-Encoding": "gzip",
      "X-Subscription-Token": apiKey,
    },
  });

  if (!response.ok) {
    throw new Error(
      `Brave Search API error: ${response.status} ${response.statusText}`
    );
  }

  const data = (await response.json()) as {
    web?: { results?: Array<{ title: string; description: string; url: string }> };
  };

  return (data.web?.results ?? []).map((r) => ({
    title: r.title ?? "",
    description: r.description ?? "",
    url: r.url ?? "",
  }));
}


/** Search for quotes from a specific philosopher/author with their source works */
export async function searchPhilosopherQuotes(
  name: string,
  description: string
): Promise<SearchResult[]> {
  const apiKey = process.env.BRAVE_API_KEY;
  if (!apiKey) return []; // Graceful fallback — don't throw

  const query = `"${name}" quote original text source work`;
  const url = new URL(BRAVE_API_URL);
  url.searchParams.set("q", query);
  url.searchParams.set("count", "10");
  url.searchParams.set("search_lang", "en");

  try {
    const response = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip",
        "X-Subscription-Token": apiKey,
      },
    });

    if (!response.ok) {
      console.warn(`[brave] Search failed for "${name}": ${response.status}`);
      return [];
    }

    const data = (await response.json()) as {
      web?: { results?: Array<{ title: string; description: string; url: string }> };
    };

    return (data.web?.results ?? []).map((r) => ({
      title: r.title ?? "",
      description: r.description ?? "",
      url: r.url ?? "",
    }));
  } catch (err) {
    console.warn(`[brave] Search error for "${name}":`, err instanceof Error ? err.message : String(err));
    return [];
  }
}
