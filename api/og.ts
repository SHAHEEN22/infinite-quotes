import { ImageResponse } from "@vercel/og";
import type { ApiEvent } from "../lib/labels";

export const config = { runtime: "edge" };

// Category → decorative label for the OG image
const TRADITIONS: Record<string, string> = {
  philosophy: "Philosophy",
  literature: "Literature",
  wisdom: "Wisdom",
  ethics: "Ethics",
  metaphysics: "Metaphysics",
  existentialism: "Existentialism",
};

// Load serif fonts for the OG image
async function loadFonts() {
  const [regular, bold] = await Promise.all([
    fetch(
      "https://fonts.gstatic.com/s/ebgaramond/v32/SlGDmQSNjdsmc35JDF1K5E55YMjF_7DPuGi-6_RUAw.ttf"
    ).then((r) => r.arrayBuffer()),
    fetch(
      "https://fonts.gstatic.com/s/ebgaramond/v32/SlGDmQSNjdsmc35JDF1K5E55YMjF_7DPuGi-DPNUAw.ttf"
    ).then((r) => r.arrayBuffer()),
  ]);
  return [
    { name: "EB Garamond", data: regular, weight: 400 as const, style: "normal" as const },
    { name: "EB Garamond", data: bold, weight: 700 as const, style: "normal" as const },
  ];
}

export default async function handler(req: Request): Promise<Response> {
  let fonts: Awaited<ReturnType<typeof loadFonts>> = [];
  try {
    fonts = await loadFonts();
  } catch {
    // Proceed without custom fonts — will use Satori defaults
  }
  let event: ApiEvent | null = null;

  try {
    const base = process.env.BASE_URL ?? "https://infinite-quotes.vercel.app";
    const url = new URL(req.url, base);
    const dateParam = url.searchParams.get("date");

    const apiUrl = dateParam
      ? `${base}/api/today?date=${encodeURIComponent(dateParam)}`
      : `${base}/api/today`;

    const res = await fetch(apiUrl);
    if (res.ok) {
      event = (await res.json()) as ApiEvent;
    }
  } catch {
    // fall through to static branded card
  }

  // Static fallback card (no event data)
  if (!event) {
    return new ImageResponse(
      {
        type: "div",
        props: {
          style: {
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            height: "100%",
            backgroundColor: "#f5f0e8",
            border: "8px solid #c4a882",
            padding: "60px 80px",
            fontFamily: "EB Garamond",
            textAlign: "center",
          },
          children: [
            // Decorative infinity symbol
            {
              type: "div",
              props: {
                style: {
                  fontSize: 120,
                  color: "#c4a882",
                  marginBottom: 10,
                  lineHeight: 1,
                },
                children: "\u221E",
              },
            },
            {
              type: "div",
              props: {
                style: {
                  fontSize: 65,
                  letterSpacing: "0.12em",
                  color: "#2a1a0e",
                  textTransform: "uppercase",
                  marginBottom: 20,
                },
                children: "Infinite Quotes",
              },
            },
            {
              type: "div",
              props: {
                style: {
                  fontSize: 30,
                  color: "#74604a",
                },
                children:
                  "Daily philosophical & literary wisdom from history\u2019s greatest minds",
              },
            },
          ],
        },
      } as any,
      {
        width: 1080,
        height: 1350,
        fonts,
        headers: { "Cache-Control": "public, max-age=3600" },
      }
    );
  }

  const { headline, summary, label, display_date, year, category } = event;

  const displaySummary =
    summary.length > 400 ? summary.slice(0, 397) + "\u2026" : summary;

  const tradition = TRADITIONS[category] ?? "Wisdom";

  return new ImageResponse(
    {
      type: "div",
      props: {
        style: {
          display: "flex",
          width: "100%",
          height: "100%",
          backgroundColor: "#f5f0e8",
          fontFamily: "EB Garamond",
        },
        children: {
          type: "div",
          props: {
            style: {
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              width: "100%",
              height: "100%",
              border: "8px solid #c4a882",
              padding: "60px 80px",
              boxSizing: "border-box",
              textAlign: "center",
              position: "relative",
            },
            children: [
              // Site name
              {
                type: "div",
                props: {
                  style: {
                    fontSize: 50,
                    letterSpacing: "0.12em",
                    color: "#2a1a0e",
                    textTransform: "uppercase",
                    marginBottom: 8,
                  },
                  children: "INFINITE QUOTES",
                },
              },
              // Category label
              {
                type: "div",
                props: {
                  style: {
                    fontSize: 22,
                    letterSpacing: "0.2em",
                    color: "#a0663a",
                    textTransform: "uppercase",
                    fontFamily: "sans-serif",
                    marginBottom: 50,
                  },
                  children: label,
                },
              },
              // Divider
              {
                type: "div",
                props: {
                  style: {
                    width: "40%",
                    height: 1,
                    backgroundColor: "#c4a882",
                    marginBottom: 50,
                  },
                  children: null,
                },
              },
              // Headline
              {
                type: "div",
                props: {
                  style: {
                    fontSize: 72,
                    fontWeight: "bold",
                    color: "#2a1a0e",
                    lineHeight: 1.2,
                    marginBottom: 40,
                    padding: "0 40px",
                  },
                  children: headline,
                },
              },
              // Summary
              {
                type: "div",
                props: {
                  style: {
                    fontSize: 32,
                    color: "#4a3728",
                    lineHeight: 1.6,
                    maxWidth: "85%",
                    padding: "0 20px",
                  },
                  children: displaySummary,
                },
              },
              // Tradition badge (replaces the old DECLASSIFIED stamp)
              {
                type: "div",
                props: {
                  style: {
                    position: "absolute",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    top: 780,
                    right: 80,
                    fontFamily: "EB Garamond",
                    fontWeight: 700,
                    color: "#8b4513",
                    opacity: 0.18,
                    textAlign: "center",
                    lineHeight: 1,
                  },
                  children: {
                    type: "div",
                    props: {
                      style: { fontSize: 160 },
                      children: "\u221E",
                    },
                  },
                },
              },
              // Footer
              {
                type: "div",
                props: {
                  style: {
                    position: "absolute",
                    bottom: 35,
                    fontSize: 18,
                    color: "#74604a",
                    letterSpacing: "0.05em",
                  },
                  children:
                    display_date +
                    (year ? " \u00b7 " + year : "") +
                    " \u00b7 Curated by Shaheen \u00b7 Powered by Hiro Report",
                },
              },
            ],
          },
        },
      },
    } as any,
    {
      width: 1080,
      height: 1350,
      fonts,
      headers: { "Cache-Control": "public, max-age=3600" },
    }
  );
}
