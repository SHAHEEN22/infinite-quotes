const BRAVE_API_URL = "https://api.search.brave.com/res/v1/web/search";

export interface SearchResult {
  title: string;
  description: string;
  url: string;
}

export async function searchParanormalEvents(
  monthName: string,
  day: number
): Promise<SearchResult[]> {
  const apiKey = process.env.BRAVE_API_KEY;
  if (!apiKey) throw new Error("BRAVE_API_KEY is not set");

  const query = `paranormal history "${monthName} ${day}" UFO ghost cryptid unexplained event`;
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
