import type { EventCategory } from "./claude";

const ICONS: Record<EventCategory, string> = {
  /* ── Philosophy ── Greek Column */
  philosophy: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M7 3h2v18H7V3zm8 0h2v18h-2V3zm-4 0h2v18h-2V3zm8 0h2v18h-2V3zM6 20h12v2H6v-2z" fill="currentColor"/>
  </svg>`,

  /* ── Literature ── Open Book */
  literature: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M19 1H5c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V3c0-1.1-.9-2-2-2zm0 20H5V3h14v18zm-3-9H8v2h8v-2zm0-4H8v2h8V8zm0 8H8v2h8v-2z" fill="currentColor"/>
  </svg>`,

  /* ── Wisdom ── Owl */
  wisdom: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm-5-9c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm10 0c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm-5 6c2.2 0 4-1.8 4-4H8c0 2.2 1.8 4 4 4z" fill="currentColor"/>
  </svg>`,
  /* ── Ethics ── Balance/Scales */
  ethics: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2L3 7v3h2v9H3v2h18v-2h-2v-9h2V7l-9-5zm0 4l7 3.5v8.5H5v-8.5L12 6zm0 11c-2.2 0-4-1.8-4-4s1.8-4 4-4 4 1.8 4 4-1.8 4-4 4zm-3-4h6v-2h-6v2z" fill="currentColor"/>
  </svg>`,

  /* ── Metaphysics ── Infinity Symbol */
  metaphysics: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 8c-2.2 0-4 1.8-4 4s1.8 4 4 4 4-1.8 4-4-1.8-4-4-4zm0 6c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm8-6c-2.2 0-4 1.8-4 4s1.8 4 4 4 4-1.8 4-4-1.8-4-4-4zm0 6c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zM7 12c0 1.1.9 2 2 2h0c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2zm8 0c0 1.1.9 2 2 2h0c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2z" fill="currentColor"/>
  </svg>`,

  /* ── Existentialism ── Question Mark */
  existentialism: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v2h2v-2zm0-6h-2v4h2v-4zm0-6h-2v2h2V5z" fill="currentColor"/>
  </svg>`,
};

/**
 * Returns a base64-encoded data URI for the given category icon.
 */
export function getCategoryIcon(category: string): string {
  const key = category as EventCategory;
  const svg = ICONS[key] ?? ICONS.wisdom;
  const base64 = Buffer.from(svg).toString("base64");
  return `data:image/svg+xml;base64,${base64}`;
}

/**
 * Returns the raw SVG string for the given category icon.
 */
export function getCategoryIconSvg(category: string): string {
  const key = category as EventCategory;
  return ICONS[key] ?? ICONS.wisdom;
}
