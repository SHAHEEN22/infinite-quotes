import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getCategoryIconSvg } from "../lib/icons";
import { getSymbolSvg } from "../lib/symbols";

export default function handler(req: VercelRequest, res: VercelResponse) {
  const { type, name } = req.query;

  let svg: string | null | undefined;

  if (type === "category" && typeof name === "string") {
    svg = getCategoryIconSvg(name as any);
  } else if (type === "symbol" && typeof name === "string") {
    svg = getSymbolSvg(name);
  }

  if (!svg) {
    return res.status(404).send("Not found");
  }

  res.setHeader("Content-Type", "image/svg+xml");
  res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  return res.status(200).send(svg);
}
