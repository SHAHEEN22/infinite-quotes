# Infinite Knowledge — Daily AI-Powered Content, Free to Run

A starter template for building your own AI-powered daily content site. Every day at 6am, it automatically searches the web, calls Claude AI, and publishes a new piece of content to your website — no manual effort required once it's set up.

**This template ships with a paranormal history theme** ("This Day in Paranormal History"), but you can ask Claude Code to change the theme to absolutely anything: sports trivia, space exploration, historical events, local history, film quotes, cooking facts — whatever you want. The AI handles the research and writing every day.

---

## What you'll be building

- A public website that shows a different AI-generated fact or story every day
- An admin panel where you can preview, edit, or queue up content in advance
- *(Optional)* A plugin for your [TRMNL](https://usetrmnl.com) e-ink display device
- *(Optional)* Automatic daily posts to your Threads account

## How it works (in plain English)

Every morning at 6am, an automated job runs that:

1. Searches the web for events matching today's date using the Brave Search API
2. Sends those results to Claude AI, which writes a short, clean summary
3. Saves the result and updates your website automatically

You never need to touch anything day-to-day — it runs itself.

---

## What you need

Free accounts with these services before you start:

| Service | What it's for | Cost |
|---------|---------------|------|
| **GitHub** | Storing your code | Free |
| **Vercel** | Hosting your website | Free |
| **Anthropic** | Claude AI generates the content | ~$1–5/month |
| **Brave Search** | Finds real web results for today's date | Free tier |
| **Claude Code** | Your AI assistant for customizing everything | Included with Anthropic |

---

## Step 1: Get Claude Code

Claude Code is what you'll use to customize this project. Think of it as a very smart assistant that you talk to in plain English — you describe what you want changed, and it changes the code for you. You don't write any code yourself.

1. Go to [claude.ai](https://claude.ai) and create an account (or log in if you have one)
2. From the same account, download **Claude Code** — it's a free desktop app
3. Open Claude Code — it will look like a plain text window. That's normal.

> **What's a terminal?** Claude Code runs in a terminal — a text-based window where you type instead of clicking. You don't need to learn any commands. You just type in plain English and Claude Code does the rest.

---

## Step 2: Get your copy of this project

1. On this page, click the green **"Use this template"** button → **"Create a new repository"**
2. Give your project a name (e.g., `daily-space-facts`) and click **Create repository**
3. On your new repo's page, click the green **Code** button and copy the URL shown
4. Open Claude Code and type:

   > *"Clone this GitHub repo onto my computer: [paste the URL you copied]"*

Claude Code will download your project and open it automatically.

---

## Step 3: Get your API keys

API keys are like passwords that prove you're allowed to use each service. You need three.

### Anthropic (Claude AI)
This is what generates your daily content.

1. Go to [console.anthropic.com](https://console.anthropic.com) and sign in
2. Click **API Keys** in the left sidebar
3. Click **Create Key**, give it a name, and copy the key — it starts with `sk-ant-`

### Brave Search
This searches the web each day to find real events and sources.

1. Go to [api.search.brave.com](https://api.search.brave.com) and sign up
2. Create a new app and copy the API key shown

### CRON_SECRET
This is a password you make up yourself — it protects the daily job from being triggered by anyone other than Vercel.

1. Just make up any random string of letters and numbers, e.g., `sunrise-kestrel-7842`
2. Write it down — you'll enter it in two places

---

## Step 4: Set up your project locally

In your project folder, there's a file called `.env.example`. This is a template showing all the environment variables your project needs.

Tell Claude Code:

> *"Copy `.env.example` to a new file called `.env` and fill in these values: ANTHROPIC_API_KEY is [your key], BRAVE_API_KEY is [your key], CRON_SECRET is [your secret]. Leave the KV variables for now."*

Claude Code will create the file and fill it in for you.

---

## Step 5: Deploy to Vercel

Vercel is the service that hosts and runs your website. It's free for personal projects.

1. Go to [vercel.com](https://vercel.com) and sign up using your GitHub account
2. Click **Add New → Project**
3. Find your GitHub repo in the list and click **Import**
4. Leave all settings on their defaults and click **Deploy**

Your site will go live at a URL like `your-project-name.vercel.app`. It won't have any content yet — we'll fix that next.

---

## Step 6: Add your database

Your project needs somewhere to store each day's generated content so it doesn't have to regenerate it on every page load. Vercel provides a free storage service called KV.

1. In your Vercel project dashboard, click the **Storage** tab
2. Click **Create** → **KV**
3. Give it any name and click through the prompts to connect it to your project

Vercel automatically adds the connection details to your project. You don't need to copy anything.

---

## Step 7: Add your secrets to Vercel

Your `.env` file works when you're testing locally, but Vercel needs the secrets entered separately in its dashboard.

1. In your Vercel project, click **Settings** → **Environment Variables**
2. Add each of these, one at a time:
   - **Name:** `ANTHROPIC_API_KEY` → **Value:** your Anthropic key
   - **Name:** `BRAVE_API_KEY` → **Value:** your Brave key
   - **Name:** `CRON_SECRET` → **Value:** the secret you made up
3. Click **Save** after each one
4. Go back to the **Deployments** tab and click **Redeploy** on your latest deployment

---

## Step 8: Generate your first piece of content

Your project runs automatically every day at 6am, but you can trigger it manually right now to test it.

Tell Claude Code:

> *"How do I manually trigger the content generation for today?"*

It will show you exactly what to do. Once it runs successfully, visit your website URL — you should see your first daily fact.

---

## Step 9: Customize it (the fun part)

Now open Claude Code in your project folder and tell it what you want. Some examples:

- *"Change the theme from paranormal history to space exploration facts"*
- *"Make the website use a dark background with white text"*
- *"Change the daily generation time from 6am to 9am"*
- *"Add a 'Copy' button so visitors can easily share the day's fact"*
- *"Make the headline font bigger"*
- *"Add a footer with my name and a link to my other projects"*

After Claude Code makes a change, it will tell you how to deploy the update to Vercel (usually just a `git push`).

---

## Optional: TRMNL e-ink display plugin

If you have a [TRMNL](https://usetrmnl.com) device, this template includes ready-made display layouts.

1. Log into your TRMNL dashboard → **Plugins** → **Private Plugin**
2. Create a new plugin and copy your **Plugin UUID**
3. In Vercel, add a new environment variable: `TRMNL_PLUGIN_UUID` → your UUID
4. Redeploy

Tell Claude Code: *"Help me set up my TRMNL plugin with the templates in this project"* and it will walk you through uploading the layouts.

---

## Optional: Automatic Threads posts

The project can post each day's content to your Threads account automatically.

Tell Claude Code: *"Help me set up automatic Threads posting"* — it will guide you through the authentication setup, which requires a Meta developer account.

---

## FAQ

**How much does this actually cost?**
Vercel and Brave are free. Anthropic charges per use — for one generation per day, you're looking at a few cents a month, rarely more than $1–2 total.

**Can I change what topic the site covers?**
Yes, completely. Tell Claude Code the theme you want. It will rewrite the AI prompts, rename the categories, update the website copy — everything. You don't need to touch the code yourself.

**What if something breaks?**
Tell Claude Code what's wrong. Paste the error message you're seeing and describe what happened. It will diagnose the problem and fix it.

**Do I need to know how to code?**
No. Claude Code writes and edits all the code. You just describe what you want in plain English.

**Can I make it private or password-protected?**
Yes. Tell Claude Code: *"Add password protection to my site"* and it will implement it.

**How do I update my site after making changes?**
Claude Code will tell you — usually it's just one command to push your changes to GitHub, and Vercel picks them up automatically within a minute.
