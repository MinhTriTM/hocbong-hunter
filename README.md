# 🎓 Hoc Bong Hunter — AI Scholarship Hunter for Vietnamese Students

An agentic pipeline that finds **real, currently-open scholarships** matching a
Vietnamese student's profile — powered by **Meta Muse Spark** through the
Meta Model API. Built solo for the **Meta Global AI Developer Hackathon**
(Oct 26 – Nov 4, 2026), Indie Developer track, problem statement
**Agentic Workflows**.

## What it does

Enter your profile (level, major, GPA, year, scholarship types) → four agents
run in sequence:

1. **Researcher** — searches the live web for open 2026 scholarships using
   Muse Spark with **web search grounding** (`POST /v1/responses` +
   `tools: [{"type": "web_search"}]`), returning cited results.
2. **Extractor** — converts the raw findings into structured JSON
   (name, org, amount, deadline, requirements, official link).
3. **Matcher** — scores each scholarship 0–100 against your profile with a
   one-line reason.
4. **Drafter** — writes a personalized motivation-letter outline + application
   checklist for the top match.

Results render as ranked cards. Everything the AI finds is labeled
"verify on the official page" — the app never pretends a listing is confirmed.

## Tech

- **Meta Model API only** (`https://api.meta.ai/v1`): `muse-spark-1.3`
- Responses API for the grounded researcher; OpenAI-compatible Chat Completions
  for the structured agents. No other AI company's models are used.
- Single-page static app (HTML/CSS/vanilla JS) — deployable on GitHub Pages.
- Your API key is pasted in the app and stored **only in the browser's
  localStorage**; it is never committed or sent anywhere except api.meta.ai.

## Run it

1. Get a key at [dev.meta.ai](https://dev.meta.ai) (hackathon participants:
   claim the $150 credit form, or use the $20 free signup credit).
2. Open `index.html` (or serve the folder statically).
3. Paste the key → fill your profile → **Săn học bổng ngay**.

## New work

All code in this repo was written during the hackathon build window
(Oct 26 – Nov 4, 2026). The idea, design and implementation are original.

## Project structure

```
index.html        # UI (Vietnamese — the product serves VN students)
css/style.css     # styling
js/app.js         # 4-agent pipeline + rendering
```
