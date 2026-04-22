import { createClient } from "@vercel/kv";

const kv = createClient({
  url: process.env.upstash_KV_REST_API_URL ?? process.env.KV_REST_API_URL ?? "",
  token: process.env.upstash_KV_REST_API_TOKEN ?? process.env.KV_REST_API_TOKEN ?? "",
});

const KV_TOKEN_EXPIRY = "paranormnl:threads:token_expiry";
const KV_LAST_POST = "paranormnl:threads:last_post";
const KV_REFRESH_FAILED = "paranormnl:threads:refresh_failed";
const KV_ACCESS_TOKEN = "paranormnl:threads:access_token";

const THREADS_API = "https://graph.threads.net/v1.0";

interface ThreadsContainerResponse {
  id: string;
}

interface ThreadsPublishResponse {
  id: string;
}

interface ThreadsTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

/**
 * Create a Threads media container for a text post with a link.
 */
export async function createContainer(
  userId: string,
  accessToken: string,
  text: string,
  linkUrl: string
): Promise<string> {
  const params = new URLSearchParams({
    media_type: "TEXT",
    text,
    link_attachment: linkUrl,
    access_token: accessToken,
  });

  const res = await fetch(`${THREADS_API}/${userId}/threads`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Threads createContainer failed (${res.status}): ${body}`);
  }

  const data = (await res.json()) as ThreadsContainerResponse;
  return data.id;
}

/**
 * Publish a previously created media container.
 */
export async function publishContainer(
  userId: string,
  accessToken: string,
  containerId: string
): Promise<string> {
  const params = new URLSearchParams({
    creation_id: containerId,
    access_token: accessToken,
  });

  const res = await fetch(`${THREADS_API}/${userId}/threads_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Threads publishContainer failed (${res.status}): ${body}`);
  }

  const data = (await res.json()) as ThreadsPublishResponse;
  return data.id;
}

/**
 * Refresh the long-lived Threads access token.
 * Returns the new token and expiry seconds, or throws on failure.
 */
export async function refreshToken(currentToken: string): Promise<{ token: string; expiresIn: number }> {
  const params = new URLSearchParams({
    grant_type: "th_refresh_token",
    access_token: currentToken,
  });

  // Refresh endpoint is at the root, not under /v1.0/
  const res = await fetch(`https://graph.threads.net/refresh_access_token?${params.toString()}`);

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Threads token refresh failed (${res.status}): ${body}`);
  }

  const data = (await res.json()) as ThreadsTokenResponse;
  return { token: data.access_token, expiresIn: data.expires_in };
}

/**
 * Get token expiry date from KV.
 */
export async function getTokenExpiry(): Promise<string | null> {
  return kv.get<string>(KV_TOKEN_EXPIRY);
}

/**
 * Store token expiry date in KV.
 */
export async function setTokenExpiry(isoDate: string): Promise<void> {
  await kv.set(KV_TOKEN_EXPIRY, isoDate);
}

/**
 * Get the date key of the last successful Threads post.
 */
export async function getLastPost(): Promise<string | null> {
  return kv.get<string>(KV_LAST_POST);
}

/**
 * Record a successful Threads post.
 */
export async function setLastPost(dateKey: string): Promise<void> {
  await kv.set(KV_LAST_POST, dateKey);
}

/**
 * Check if the last token refresh failed.
 */
export async function getRefreshFailed(): Promise<boolean> {
  return (await kv.get<boolean>(KV_REFRESH_FAILED)) === true;
}

/**
 * Set or clear the refresh-failed flag.
 */
export async function setRefreshFailed(failed: boolean): Promise<void> {
  if (failed) {
    await kv.set(KV_REFRESH_FAILED, true);
  } else {
    await kv.del(KV_REFRESH_FAILED);
  }
}

/**
 * Get the access token, preferring a KV-stored refreshed token over the env var.
 */
export async function getAccessToken(): Promise<string | null> {
  const kvToken = await kv.get<string>(KV_ACCESS_TOKEN);
  return kvToken ?? process.env.THREADS_ACCESS_TOKEN ?? null;
}

/**
 * Store a refreshed access token in KV.
 */
export async function setAccessToken(token: string): Promise<void> {
  await kv.set(KV_ACCESS_TOKEN, token);
}
