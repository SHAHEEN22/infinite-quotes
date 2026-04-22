import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getEvent } from "../lib/store";
import { toApiResponse } from "../lib/labels";
import { dayPageUrl } from "../lib/date-utils";
import {
  createContainer,
  publishContainer,
  refreshToken,
  getAccessToken,
  setAccessToken,
  getTokenExpiry,
  setTokenExpiry,
  getLastPost,
  setLastPost,
  setRefreshFailed,
} from "../lib/threads";

/**
 * Title-case a label string.
 * "CURSED OBJECT OF THE DAY" → "Cursed Object of the Day"
 */
function titleCase(label: string): string {
  const minorWords = new Set(["of", "the", "and", "in", "on", "at", "to", "for", "a", "an"]);
  return label
    .toLowerCase()
    .split(" ")
    .map((word, i) => (i === 0 || !minorWords.has(word)) ? word.charAt(0).toUpperCase() + word.slice(1) : word)
    .join(" ");
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Auth: same CRON_SECRET pattern as generate.ts
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error("[threads] CRON_SECRET not configured");
    return res.status(500).json({ error: "Server misconfiguration" });
  }
  const authHeader = req.headers["authorization"];
  if (authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const userId = process.env.THREADS_USER_ID;
  if (!userId) {
    console.error("[threads] THREADS_USER_ID not configured");
    return res.status(500).json({ error: "Threads credentials not configured" });
  }

  // Prefer KV-stored refreshed token, fall back to env var
  let accessToken = await getAccessToken();
  if (!accessToken) {
    console.error("[threads] No Threads access token in KV or env");
    return res.status(500).json({ error: "Threads credentials not configured" });
  }

  const now = new Date();
  const month = now.getUTCMonth() + 1;
  const day = now.getUTCDate();
  const dateKey = `${String(month).padStart(2, "0")}${String(day).padStart(2, "0")}`;

  // Double-post guard
  const lastPost = await getLastPost();
  if (lastPost === dateKey) {
    console.log(`[threads] Already posted for ${dateKey}, skipping`);
    return res.status(200).json({ success: true, skipped: true, reason: "already_posted" });
  }

  // Get today's content
  const event = await getEvent(month, day);
  if (!event) {
    console.log(`[threads] No content for ${dateKey}, skipping`);
    return res.status(200).json({ success: true, skipped: true, reason: "no_content" });
  }

  // Token refresh check — refresh if expiring within 7 days
  try {
    const expiryStr = await getTokenExpiry();
    if (expiryStr) {
      const expiry = new Date(expiryStr);
      const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      if (expiry <= sevenDaysFromNow) {
        console.log("[threads] Token expiring soon, refreshing...");
        const result = await refreshToken(accessToken);
        accessToken = result.token;
        await setAccessToken(accessToken);
        const newExpiry = new Date(now.getTime() + result.expiresIn * 1000);
        await setTokenExpiry(newExpiry.toISOString());
        await setRefreshFailed(false);
        console.log(`[threads] Token refreshed, new expiry: ${newExpiry.toISOString()}`);
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[threads] Token refresh failed:", message);
    await setRefreshFailed(true);
    // Continue with existing token — it may still be valid
  }

  // Format the post
  const apiEvent = toApiResponse(event);
  const label = titleCase(apiEvent.label);
  const headline = apiEvent.headline;
  const url = dayPageUrl(now);
  const postText = `${label}: ${headline}\n\n${url}`;

  // Publish to Threads (two-step: create container, then publish)
  try {
    const containerId = await createContainer(userId, accessToken, postText, url);
    const postId = await publishContainer(userId, accessToken, containerId);
    await setLastPost(dateKey);
    console.log(`[threads] Posted successfully: ${postId}`);
    return res.status(200).json({ success: true, postId, dateKey });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[threads] Posting failed:", message);
    return res.status(500).json({ error: message });
  }
}
