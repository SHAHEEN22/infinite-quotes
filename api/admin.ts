import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@vercel/kv";
import {
  verifyPassword, checkRateLimit, recordFailedAttempt,
  createSession, setSessionCookie, requireAuth,
  getSessionToken, deleteSession, clearSessionCookie,
} from "../lib/auth";
import {
  getCalendarData, checkTagSpacing, getQueueEntry, setQueueEntry,
  getNearbyTags, getMonthName, getUpcomingDates, type QueuedEvent,
} from "../lib/queue";
import { searchParanormalEvents } from "../lib/brave";
import { summarizeParanormalEvent, generateContentForDate } from "../lib/claude";
import { getTokenExpiry, getLastPost, getRefreshFailed } from "../lib/threads";

const kv = createClient({
  url: process.env.upstash_KV_REST_API_URL ?? process.env.KV_REST_API_URL ?? "",
  token: process.env.upstash_KV_REST_API_TOKEN ?? process.env.KV_REST_API_TOKEN ?? "",
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const action = req.query.action as string | undefined;

  // No action = serve admin HTML page
  if (!action) {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    return res.send(HTML);
  }

  switch (action) {
    case "login": return handleLogin(req, res);
    case "logout": return handleLogout(req, res);
    case "calendar": return handleCalendar(req, res);
    case "edit": return handleEdit(req, res);
    case "approve": return handleApprove(req, res);
    case "reroll": return handleReroll(req, res);
    case "generate-ahead": return handleGenerateAhead(req, res);
    case "threads-status": return handleThreadsStatus(req, res);
    default: return res.status(404).json({ error: "Unknown action" });
  }
}

async function handleLogin(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const allowed = await checkRateLimit(req);
  if (!allowed) {
    return res.status(429).json({ error: "Too many login attempts. Try again in a minute." });
  }

  const { password } = req.body as { password?: string };
  if (!password || !verifyPassword(password)) {
    await recordFailedAttempt(req);
    return res.status(401).json({ error: "Invalid password" });
  }

  const token = await createSession();
  setSessionCookie(res, token);
  return res.status(200).json({ success: true });
}

async function handleLogout(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const authed = await requireAuth(req, res);
  if (!authed) return;

  const token = getSessionToken(req);
  await deleteSession(token);
  clearSessionCookie(res);
  return res.status(200).json({ success: true });
}

async function handleCalendar(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const authed = await requireAuth(req, res);
  if (!authed) return;

  const calendar = await getCalendarData(14);

  // Check tag spacing for each queued entry
  const entries = await Promise.all(
    calendar.map(async (entry) => {
      let spacingWarning: string[] | null = null;
      const source = entry.queue ?? entry.live;
      if (source && "tags" in source && Array.isArray((source as any).tags)) {
        const tags = (source as any).tags as string[];
        if (tags.length > 0) {
          const spacing = await checkTagSpacing(entry.dateKey, tags);
          if (spacing.collision) {
            spacingWarning = spacing.collidingTags;
          }
        }
      }
      return {
        dateKey: entry.dateKey,
        displayDate: entry.displayDate,
        queue: entry.queue,
        live: entry.live,
        spacingWarning,
      };
    })
  );

  return res.status(200).json({ entries });
}

async function handleEdit(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const authed = await requireAuth(req, res);
  if (!authed) return;

  const { dateKey, headline, summary, year, category, contentType, tags } = req.body as {
    dateKey?: string;
    headline?: string;
    summary?: string;
    year?: string;
    category?: string;
    contentType?: string;
    tags?: string[];
  };

  if (!dateKey || !/^\d{4}$/.test(dateKey)) {
    return res.status(400).json({ error: "dateKey is required (MMDD format)" });
  }

  const existing = await getQueueEntry(dateKey);
  if (!existing) {
    return res.status(404).json({ error: "No queue entry for this date" });
  }

  const updated: QueuedEvent = {
    ...existing,
    headline: headline ?? existing.headline,
    summary: summary ?? existing.summary,
    year: year ?? existing.year,
    category: (category as QueuedEvent["category"]) ?? existing.category,
    contentType: (contentType as QueuedEvent["contentType"]) ?? existing.contentType,
    tags: tags ?? existing.tags,
    status: "edited",
    editedAt: new Date().toISOString(),
  };

  await setQueueEntry(updated);
  return res.status(200).json({ success: true, entry: updated });
}

async function handleApprove(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const authed = await requireAuth(req, res);
  if (!authed) return;

  const { dateKey } = req.body as { dateKey?: string };
  if (!dateKey || !/^\d{4}$/.test(dateKey)) {
    return res.status(400).json({ error: "dateKey is required (MMDD format)" });
  }

  const existing = await getQueueEntry(dateKey);
  if (!existing) {
    return res.status(404).json({ error: "No queue entry for this date" });
  }

  const updated = { ...existing, status: "approved" as const };
  await setQueueEntry(updated);
  return res.status(200).json({ success: true, entry: updated });
}

async function handleReroll(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const authed = await requireAuth(req, res);
  if (!authed) return;

  const { dateKey } = req.body as { dateKey?: string };
  if (!dateKey || dateKey.length !== 4) {
    return res.status(400).json({ error: "dateKey is required (MMDD format)" });
  }

  const existing = await getQueueEntry(dateKey);
  if (existing?.status === "approved") {
    return res.status(409).json({ error: "Entry is approved. Edit it directly or un-approve first." });
  }

  const month = parseInt(dateKey.slice(0, 2), 10);
  const day = parseInt(dateKey.slice(2, 4), 10);
  const monthName = getMonthName(month);
  const displayDate = `${monthName} ${day}`;

  // Re-roll always uses the curated fallback path to guarantee different content.
  // Brave Search returns the same results for the same date, so re-rolling
  // through it just rewords the same article.
  const nearbyTags = await getNearbyTags(dateKey);

  // Also exclude tags from the existing entry so we don't get the same topic
  const existingTags = existing?.tags ?? [];
  const excludeTags = [...new Set([...nearbyTags, ...existingTags])];

  const MAX_ATTEMPTS = 3;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const event = await generateContentForDate(monthName, day, excludeTags);

    const tags = event.tags ?? [];
    const spacingCheck = await checkTagSpacing(dateKey, tags);

    if (!spacingCheck.collision || attempt === MAX_ATTEMPTS - 1) {
      const entry = {
        ...event,
        dateKey,
        displayDate,
        tags,
        status: "generated" as const,
        generatedAt: new Date().toISOString(),
      };
      await setQueueEntry(entry);
      return res.status(200).json({
        success: true,
        entry,
        spacingWarning: spacingCheck.collision ? spacingCheck.collidingTags : null,
      });
    }
  }
}

async function handleGenerateAhead(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const authed = await requireAuth(req, res);
  if (!authed) return;

  const lockKey = "paranormnl:admin:generate-ahead-lock";
  const locked = await kv.get(lockKey);
  if (locked) {
    return res.status(429).json({ error: "Generation already in progress. Try again in a few minutes." });
  }
  await kv.set(lockKey, "1", { ex: 300 }); // 5 minute lock

  const dates = getUpcomingDates(14);
  const results: Array<{ dateKey: string; status: string; spacingWarning: string[] | null }> = [];

  for (const { month, day, dateKey, displayDate } of dates) {
    // Skip dates that already have queue entries
    const existing = await getQueueEntry(dateKey);
    if (existing) {
      results.push({ dateKey, status: "skipped", spacingWarning: null });
      continue;
    }

    const monthName = getMonthName(month);

    try {
      const MAX_ATTEMPTS = 3;
      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        // Try primary path (Brave Search + Claude)
        const searchResults = await searchParanormalEvents(monthName, day);
        let event = await summarizeParanormalEvent(monthName, day, searchResults);

        if (!event) {
          // Fallback to curated topic generation, excluding nearby tags
          const excludeTags = await getNearbyTags(dateKey);
          event = await generateContentForDate(monthName, day, excludeTags);
        }

        const tags = event.tags ?? [];
        const spacingCheck = await checkTagSpacing(dateKey, tags);

        if (!spacingCheck.collision || attempt === MAX_ATTEMPTS - 1) {
          const entry = {
            ...event,
            dateKey,
            displayDate,
            tags,
            status: "generated" as const,
            generatedAt: new Date().toISOString(),
          };
          await setQueueEntry(entry);
          results.push({
            dateKey,
            status: "generated",
            spacingWarning: spacingCheck.collision ? spacingCheck.collidingTags : null,
          });
          break;
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[generate-ahead] Error for ${dateKey}:`, message);
      results.push({ dateKey, status: `error: ${message}`, spacingWarning: null });
    }
  }

  await kv.del(lockKey);
  return res.status(200).json({ success: true, results });
}

async function handleThreadsStatus(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const authed = await requireAuth(req, res);
  if (!authed) return;

  const [tokenExpiry, lastPost, refreshFailed] = await Promise.all([
    getTokenExpiry(),
    getLastPost(),
    getRefreshFailed(),
  ]);

  let daysUntilExpiry: number | null = null;
  if (tokenExpiry) {
    const expiry = new Date(tokenExpiry);
    const now = new Date();
    daysUntilExpiry = Math.floor((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  }

  const configured = !!(process.env.THREADS_USER_ID && process.env.THREADS_ACCESS_TOKEN);

  return res.status(200).json({
    configured,
    tokenExpiry,
    daysUntilExpiry,
    lastPost,
    refreshFailed,
  });
}

const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex, nofollow">
  <title>Admin — One Strange Thing</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --bg: #1a1410;
      --bg-surface: #231d17;
      --bg-elevated: #2d2520;
      --text: #d4c8b8;
      --text-heading: #e8ddd0;
      --text-secondary: #b8a898;
      --text-tertiary: #9a8a78;
      --accent: #c4813a;
      --accent-hover: #d4914a;
      --border: #3d3228;
      --error: #d4736a;
      --success: #6abf69;
      --warning: #d4a84a;
      --pill-generated: #3d3228;
      --pill-edited: #3a3520;
      --pill-approved: #1d3520;
      --pill-empty: #2d2020;
      --pill-live: #1d2535;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      padding: 2rem 1rem;
    }

    .container { max-width: 900px; margin: 0 auto; }

    h1 {
      font-family: 'EB Garamond', Georgia, serif;
      color: var(--text-heading);
      font-size: 1.5rem;
      margin-bottom: 0.25rem;
    }

    .subtitle {
      color: var(--text-tertiary);
      font-size: 0.85rem;
      margin-bottom: 2rem;
    }

    /* Login */
    .login-form {
      max-width: 320px;
      margin: 4rem auto;
      text-align: center;
    }
    .login-form h1 { margin-bottom: 1.5rem; }
    .login-form input {
      width: 100%;
      padding: 0.75rem 1rem;
      background: var(--bg-surface);
      border: 1px solid var(--border);
      border-radius: 6px;
      color: var(--text);
      font-size: 1rem;
      margin-bottom: 1rem;
    }
    .login-form input:focus {
      outline: none;
      border-color: var(--accent);
    }

    /* Buttons */
    .btn {
      padding: 0.5rem 1rem;
      border: 1px solid var(--border);
      border-radius: 6px;
      background: var(--bg-surface);
      color: var(--text);
      cursor: pointer;
      font-size: 0.85rem;
      transition: border-color 0.15s, background 0.15s;
    }
    .btn:hover { border-color: var(--accent); background: var(--bg-elevated); }
    .btn-primary { background: var(--accent); color: #1a1410; border-color: var(--accent); font-weight: 600; }
    .btn-primary:hover { background: var(--accent-hover); }
    .btn-small { padding: 0.3rem 0.6rem; font-size: 0.75rem; }

    /* Toolbar */
    .toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
      gap: 0.75rem;
      flex-wrap: wrap;
    }

    /* Calendar entries */
    .entry {
      background: var(--bg-surface);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 1rem 1.25rem;
      margin-bottom: 0.75rem;
      transition: border-color 0.15s;
    }
    .entry:hover { border-color: var(--accent); }
    .entry-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 0.5rem;
      gap: 0.5rem;
    }
    .entry-date {
      font-weight: 600;
      color: var(--text-heading);
      white-space: nowrap;
    }
    .entry-headline {
      flex: 1;
      font-family: 'EB Garamond', Georgia, serif;
      font-size: 1.1rem;
      color: var(--text-heading);
    }
    .entry-summary {
      color: var(--text-secondary);
      font-size: 0.85rem;
      line-height: 1.5;
      margin-bottom: 0.5rem;
    }
    .entry-meta {
      display: flex;
      gap: 0.5rem;
      align-items: center;
      flex-wrap: wrap;
    }

    /* Pills */
    .pill {
      display: inline-block;
      padding: 0.15rem 0.5rem;
      border-radius: 4px;
      font-size: 0.7rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    .pill-generated { background: var(--pill-generated); color: var(--text-secondary); }
    .pill-edited { background: var(--pill-edited); color: var(--warning); }
    .pill-approved { background: var(--pill-approved); color: var(--success); }
    .pill-empty { background: var(--pill-empty); color: var(--error); }
    .pill-live { background: var(--pill-live); color: #6a9fd4; }
    .pill-tag { background: var(--bg-elevated); color: var(--text-tertiary); font-weight: 400; text-transform: none; }
    .pill-warning { background: #3d2d20; color: var(--warning); }

    /* Actions */
    .entry-actions {
      display: flex;
      gap: 0.4rem;
      margin-top: 0.5rem;
    }

    /* Edit form */
    .edit-form { margin-top: 0.75rem; display: none; }
    .edit-form.active { display: block; }
    .edit-form label {
      display: block;
      font-size: 0.75rem;
      color: var(--text-tertiary);
      margin-bottom: 0.25rem;
      margin-top: 0.5rem;
    }
    .edit-form input, .edit-form textarea, .edit-form select {
      width: 100%;
      padding: 0.5rem 0.75rem;
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 4px;
      color: var(--text);
      font-size: 0.85rem;
      font-family: inherit;
    }
    .edit-form textarea { min-height: 80px; resize: vertical; }
    .edit-form input:focus, .edit-form textarea:focus, .edit-form select:focus {
      outline: none;
      border-color: var(--accent);
    }
    .edit-actions { display: flex; gap: 0.4rem; margin-top: 0.75rem; }

    /* Loading & errors */
    .loading { text-align: center; color: var(--text-tertiary); padding: 2rem; }
    .error-msg { color: var(--error); font-size: 0.85rem; margin-top: 0.5rem; }
    .success-msg { color: var(--success); font-size: 0.85rem; margin-top: 0.5rem; }

    /* Generating indicator */
    .generating { opacity: 0.5; pointer-events: none; }
  </style>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=EB+Garamond:wght@400;600&display=swap" rel="stylesheet">
</head>
<body>
  <div class="container">
    <!-- Login View -->
    <div id="login-view" class="login-form" hidden>
      <h1>One Strange Thing</h1>
      <p class="subtitle">Admin</p>
      <input type="password" id="password" placeholder="Password" autofocus>
      <button class="btn btn-primary" style="width:100%" onclick="login()">Log In</button>
      <div id="login-error" class="error-msg" hidden></div>
    </div>

    <!-- Calendar View -->
    <div id="calendar-view" hidden>
      <h1>Content Calendar</h1>
      <p class="subtitle">Next 14 days</p>
      <div class="toolbar">
        <button class="btn btn-primary" id="generate-all-btn" onclick="generateAll()">Generate All Empty</button>
        <button class="btn" onclick="logout()">Log Out</button>
      </div>
      <div id="calendar-entries">
        <div class="loading">Loading calendar...</div>
      </div>
      <div id="generate-status"></div>
      <section id="threads-section" style="margin-top:2rem;padding:1rem;border:1px solid var(--border);border-radius:4px;">
        <h3 style="margin:0 0 0.75rem;font-size:1rem;color:var(--accent);">Threads Status</h3>
        <div id="threads-info" style="font-size:0.85rem;color:var(--text-secondary);">Loading...</div>
      </section>
    </div>
  </div>

<script>
(function() {
  var CATEGORIES = ['ufo','ghost','cryptids','mysteries','conspiracy','occult'];
  var CONTENT_TYPES = ['event','cryptid','trivia','secret_society','occult_symbol','cursed_object'];

  // Check auth on load
  fetch('/api/admin?action=calendar').then(function(r) {
    if (r.ok) {
      document.getElementById('calendar-view').hidden = false;
      r.json().then(renderCalendar);
      loadThreadsStatus();
    } else {
      document.getElementById('login-view').hidden = false;
    }
  }).catch(function() {
    document.getElementById('login-view').hidden = false;
  });

  // Enter key on password field
  document.getElementById('password').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') login();
  });

  window.login = function() {
    var pw = document.getElementById('password').value;
    var errEl = document.getElementById('login-error');
    errEl.hidden = true;

    fetch('/api/admin?action=login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pw })
    }).then(function(r) {
      if (r.ok) {
        document.getElementById('login-view').hidden = true;
        document.getElementById('calendar-view').hidden = false;
        fetch('/api/admin?action=calendar').then(function(r2) { return r2.json(); }).then(renderCalendar);
      } else {
        return r.json().then(function(data) {
          errEl.textContent = data.error || 'Login failed';
          errEl.hidden = false;
        });
      }
    });
  };

  window.logout = function() {
    fetch('/api/admin?action=logout', { method: 'POST' }).then(function() {
      document.getElementById('calendar-view').hidden = true;
      document.getElementById('login-view').hidden = false;
      document.getElementById('password').value = '';
    });
  };

  function renderCalendar(data) {
    var container = document.getElementById('calendar-entries');
    if (!data.entries || data.entries.length === 0) {
      container.innerHTML = '<div class="loading">No entries found</div>';
      return;
    }

    container.innerHTML = data.entries.map(function(e) {
      var source = e.queue || e.live;
      var status = e.queue ? e.queue.status : (e.live ? 'live' : 'empty');
      var headline = source ? source.headline : '\\u2014';
      var summary = source ? source.summary : 'No content generated';
      var tags = (source && source.tags) ? source.tags : [];
      var category = source ? (source.category || '') : '';
      var year = source ? (source.year || '') : '';

      var pillClass = 'pill-' + status;
      var tagsHtml = tags.map(function(t) { return '<span class="pill pill-tag">' + esc(t) + '</span>'; }).join(' ');
      var warningHtml = e.spacingWarning ? '<span class="pill pill-warning">\\u26A0 ' + esc(e.spacingWarning.join(', ')) + '</span>' : '';

      return '<div class="entry" id="entry-' + e.dateKey + '">' +
        '<div class="entry-header">' +
          '<span class="entry-date">' + esc(e.displayDate) + '</span>' +
          '<span class="pill ' + pillClass + '">' + esc(status) + '</span>' +
        '</div>' +
        '<div class="entry-headline">' + esc(headline) + '</div>' +
        '<div class="entry-summary">' + esc(summary) + '</div>' +
        '<div class="entry-meta">' +
          (category ? '<span class="pill pill-tag">' + esc(category) + '</span>' : '') +
          (year && year !== '\\u2014' ? '<span class="pill pill-tag">' + esc(year) + '</span>' : '') +
          tagsHtml + warningHtml +
        '</div>' +
        '<div class="entry-actions">' +
          '<button class="btn btn-small" onclick="reroll(\\'' + e.dateKey + '\\')">Re-roll</button>' +
          (e.queue ? '<button class="btn btn-small" onclick="toggleEdit(\\'' + e.dateKey + '\\')">Edit</button>' : '') +
          (e.queue && e.queue.status !== 'approved' ? '<button class="btn btn-small" onclick="approve(\\'' + e.dateKey + '\\')">Approve</button>' : '') +
        '</div>' +
        (e.queue ? renderEditForm(e.dateKey, e.queue) : '') +
      '</div>';
    }).join('');
  }

  function renderEditForm(dateKey, entry) {
    return '<div class="edit-form" id="edit-' + dateKey + '">' +
      '<label>Headline</label>' +
      '<input type="text" id="edit-headline-' + dateKey + '" value="' + escAttr(entry.headline) + '">' +
      '<label>Summary</label>' +
      '<textarea id="edit-summary-' + dateKey + '">' + esc(entry.summary) + '</textarea>' +
      '<label>Year</label>' +
      '<input type="text" id="edit-year-' + dateKey + '" value="' + escAttr(entry.year) + '">' +
      '<label>Category</label>' +
      '<select id="edit-category-' + dateKey + '">' +
        CATEGORIES.map(function(c) { return '<option value="' + c + '"' + (c === entry.category ? ' selected' : '') + '>' + c + '</option>'; }).join('') +
      '</select>' +
      '<label>Content Type</label>' +
      '<select id="edit-contentType-' + dateKey + '">' +
        CONTENT_TYPES.map(function(c) { return '<option value="' + c + '"' + (c === entry.contentType ? ' selected' : '') + '>' + c + '</option>'; }).join('') +
      '</select>' +
      '<label>Tags (comma-separated)</label>' +
      '<input type="text" id="edit-tags-' + dateKey + '" value="' + escAttr((entry.tags || []).join(', ')) + '">' +
      '<div class="edit-actions">' +
        '<button class="btn btn-small btn-primary" onclick="saveEdit(\\'' + dateKey + '\\')">Save</button>' +
        '<button class="btn btn-small" onclick="toggleEdit(\\'' + dateKey + '\\')">Cancel</button>' +
      '</div>' +
    '</div>';
  }

  window.toggleEdit = function(dateKey) {
    var form = document.getElementById('edit-' + dateKey);
    if (form) form.classList.toggle('active');
  };

  window.saveEdit = function(dateKey) {
    var tags = document.getElementById('edit-tags-' + dateKey).value
      .split(',').map(function(t) { return t.trim(); }).filter(Boolean);

    fetch('/api/admin?action=edit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dateKey: dateKey,
        headline: document.getElementById('edit-headline-' + dateKey).value,
        summary: document.getElementById('edit-summary-' + dateKey).value,
        year: document.getElementById('edit-year-' + dateKey).value,
        category: document.getElementById('edit-category-' + dateKey).value,
        contentType: document.getElementById('edit-contentType-' + dateKey).value,
        tags: tags
      })
    }).then(function(r) { return r.json(); }).then(function() {
      fetch('/api/admin?action=calendar').then(function(r) { return r.json(); }).then(renderCalendar);
    });
  };

  window.approve = function(dateKey) {
    fetch('/api/admin?action=approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dateKey: dateKey })
    }).then(function() {
      fetch('/api/admin?action=calendar').then(function(r) { return r.json(); }).then(renderCalendar);
    });
  };

  window.reroll = function(dateKey) {
    var entry = document.getElementById('entry-' + dateKey);
    if (entry) entry.classList.add('generating');

    fetch('/api/admin?action=reroll', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dateKey: dateKey })
    }).then(function(r) { return r.json(); }).then(function() {
      if (entry) entry.classList.remove('generating');
      fetch('/api/admin?action=calendar').then(function(r) { return r.json(); }).then(renderCalendar);
    }).catch(function() {
      if (entry) entry.classList.remove('generating');
    });
  };

  window.generateAll = function() {
    var btn = document.getElementById('generate-all-btn');
    btn.textContent = 'Generating...';
    btn.disabled = true;

    fetch('/api/admin?action=generate-ahead', { method: 'POST' })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        btn.textContent = 'Generate All Empty';
        btn.disabled = false;
        var statusEl = document.getElementById('generate-status');
        if (data.results) {
          var generated = data.results.filter(function(r) { return r.status === 'generated'; }).length;
          var skipped = data.results.filter(function(r) { return r.status === 'skipped'; }).length;
          var errors = data.results.filter(function(r) { return r.status.startsWith('error'); }).length;
          statusEl.innerHTML = '<p class="success-msg">Generated: ' + generated + ' | Skipped: ' + skipped + (errors ? ' | Errors: ' + errors : '') + '</p>';
          setTimeout(function() { statusEl.innerHTML = ''; }, 5000);
        }
        fetch('/api/admin?action=calendar').then(function(r) { return r.json(); }).then(renderCalendar);
      }).catch(function() {
        btn.textContent = 'Generate All Empty';
        btn.disabled = false;
      });
  };

  // Threads status
  function loadThreadsStatus() {
    fetch('/api/admin?action=threads-status', { credentials: 'same-origin' }).then(function(r) {
      if (!r.ok) return;
      return r.json();
    }).then(function(data) {
      if (!data) return;
      var el = document.getElementById('threads-info');
      if (!data.configured) {
        el.textContent = 'Not configured \u2014 set THREADS_USER_ID and THREADS_ACCESS_TOKEN env vars.';
        return;
      }
      var parts = [];
      if (data.daysUntilExpiry !== null) {
        var warning = data.refreshFailed ? ' \u26A0 refresh failed' : '';
        parts.push('Token: ' + data.daysUntilExpiry + ' days until expiry' + warning);
      } else {
        parts.push('Token: expiry unknown \u2014 set paranormnl:threads:token_expiry in KV');
      }
      if (data.lastPost) {
        parts.push('Last post: ' + data.lastPost);
      } else {
        parts.push('Last post: none yet');
      }
      el.innerHTML = parts.join('<br>');
    }).catch(function() {});
  }

  function esc(s) { var d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML; }
  function escAttr(s) { return (s || '').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/'/g,'&#39;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
})();
</script>
</body>
</html>`;
