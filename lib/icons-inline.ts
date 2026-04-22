import type { EventCategory } from "./claude";

const S = `xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"`;

/**
 * Small inline SVGs for embedding in TRMNL webhook payloads.
 * Must stay under ~1500 bytes each to fit within 2KB payload limit.
 */
const INLINE_ICONS: Record<EventCategory, string> = {
  /* ── UFO ── flying saucer with dome and beam */
  ufo: `<svg ${S}>
    <ellipse cx="24" cy="22" rx="16" ry="6"/>
    <path d="M16 22c0-4 3.5-8 8-8s8 4 8 8"/>
    <line x1="18" y1="28" x2="14" y2="40"/>
    <line x1="30" y1="28" x2="34" y2="40"/>
    <line x1="24" y1="28" x2="24" y2="40"/>
  </svg>`,

  /* ── Ghost ── classic ghost shape */
  ghost: `<svg ${S}>
    <path d="M14 44v-20a10 10 0 0 1 20 0v20l-5-4-5 4-5-4-5 4z"/>
    <circle cx="20" cy="22" r="2" fill="black"/>
    <circle cx="28" cy="22" r="2" fill="black"/>
  </svg>`,

  /* ── Cryptids ── paw print with question mark */
  cryptids: `<svg ${S}>
    <ellipse cx="24" cy="28" rx="10" ry="12"/>
    <ellipse cx="15" cy="12" rx="4" ry="5"/>
    <ellipse cx="24" cy="9" rx="3.5" ry="4.5"/>
    <ellipse cx="33" cy="12" rx="4" ry="5"/>
    <path d="M21 25c0-3 1.5-5 3-5s3 2 3 4c0 1.5-1 2-3 3"/>
    <circle cx="24" cy="32" r="1" fill="black"/>
  </svg>`,

  /* ── Mysteries ── question mark with radiating lines */
  mysteries: `<svg ${S}>
    <path d="M18 16c0-5 3-8 6-8s6 3 6 6c0 3-2 4-6 6"/>
    <circle cx="24" cy="26" r="1" fill="black"/>
    <circle cx="24" cy="24" r="18" stroke-dasharray="4 3"/>
    <line x1="24" y1="2" x2="24" y2="6"/>
    <line x1="24" y1="42" x2="24" y2="46"/>
    <line x1="2" y1="24" x2="6" y2="24"/>
    <line x1="42" y1="24" x2="46" y2="24"/>
  </svg>`,

  /* ── Conspiracy ── all-seeing eye in pyramid */
  conspiracy: `<svg ${S}>
    <path d="M24 4L4 42h40z"/>
    <path d="M16 28c4-4 8-5 8-5s4 1 8 5"/>
    <path d="M16 28c4 4 8 5 8 5s4-1 8-5"/>
    <circle cx="24" cy="28" r="3"/>
    <circle cx="24" cy="28" r="1" fill="black"/>
  </svg>`,

  /* ── Occult ── crystal ball with sparkles */
  occult: `<svg ${S}>
    <circle cx="24" cy="20" r="12"/>
    <path d="M16 30c2 4 8 6 8 6s6-2 8-6"/>
    <path d="M18 36h12"/>
    <path d="M16 40h16"/>
    <line x1="18" y1="36" x2="16" y2="40"/>
    <line x1="30" y1="36" x2="32" y2="40"/>
    <line x1="8" y1="6" x2="8" y2="10"/>
    <line x1="6" y1="8" x2="10" y2="8"/>
    <line x1="38" y1="4" x2="38" y2="8"/>
    <line x1="36" y1="6" x2="40" y2="6"/>
  </svg>`,
};

export function getInlineIconSvg(category: string): string {
  const key = category as EventCategory;
  return INLINE_ICONS[key] ?? INLINE_ICONS.mysteries;
}

export function getInlineIconDataUri(category: string): string {
  const svg = getInlineIconSvg(category);
  const base64 = Buffer.from(svg).toString("base64");
  return `data:image/svg+xml;base64,${base64}`;
}
