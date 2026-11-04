# 🎯 Học Bổng Hunter v3.0 — Multi-Agent Scholarship Hunter & Triple-Verification System

An advanced **10-Node Multi-Agent Workflow** that discovers, cross-verifies, ranks, and drafts personalized scholarship applications for Vietnamese students — powered by **Meta Muse Wonder 1.0** and **Meta Muse Spark 1.3** (`1M Context Window`) via the **Meta Model API** (`https://api.meta.ai/v1/responses`).

Built for the **Meta Global AI Developer Hackathon** (Oct 26 – Nov 4, 2026), Track: **Indie Developers**, Problem Statement: **Agentic Workflows**.

---

## 🚀 Key Highlights & Architecture (v3.0)

### 1. Heterogeneous Multi-Model Routing (Meta Muse Ecosystem)
Instead of relying on a single monolithic prompt, **Học Bổng Hunter v3.0** routes tasks across specialized Meta Muse models based on cognitive complexity and tool requirements:
- **✨ Meta Muse Wonder 1.0 (`muse-wonder-1.0` · 1M Context)**: Powers the **Supervisor**, **Triple-Verify Critic**, and **Strategic Drafter** agents — leveraging frontier long-horizon planning, sub-agent delegation, and automatic error recovery.
- **⚡ Meta Muse Spark 1.3 (`muse-spark-1.3` · 1M Context)**: Powers the **3 Parallel Researchers** (with live `web_search` grounding), **Structured Extractor**, and **Multi-Criteria Matcher** — maximizing parallel execution speed and token efficiency.
- **🌱 Muse Spark 1.3 Contributor (`muse-spark-1.3-contributor`)**: Supported as a 1-click eco-routing mode (`$0.10/1M input`, `$0.20/1M output` — saving up to 95% API cost).

### 2. 10-Node Agentic Pipeline & Live SVG Telemetry Inspector
```text
[👤 Profile Analyzer & AI CV Parser]
                 │
       [🧠 Supervisor Agent]  (Muse Wonder 1.0 — Dynamic 3-Lane Strategy)
                 │ fan-out (Promise.all parallel execution)
        ┌────────┼────────┐
        ▼        ▼        ▼
     [🔎 R1]  [🔎 R2]  [🔎 R3] (Muse Spark 1.3 + Web Search Grounding)
        └────────┼────────┘
                 │ fan-in
     [🔀 Merge & Deduplicator] (0-Token Deterministic Code Deduplication)
                 │
     [🧾 Structured Extractor] (Muse Spark 1.3 — JSON Schema Extraction)
                 │
    [🛡️ Triple-Verify Critic]  (Muse Wonder 1.0 Fresh Context + VerifierEngine)
                 │ approved pool
    [📊 Multi-Criteria Matcher] (Muse Spark 1.3 — 0-100 Score + 4 Sub-scores)
                 │
   [✍️ Strategic App Drafter]  (Muse Wonder 1.0 — Motivation Letter + Timeline + Interview)
```
- **Interactive Node Inspector**: Click any node directly on the live SVG flowchart to inspect its real-time **Input Prompt, Output Response, Model Used, Latency (ms), Token Count, and USD Cost**.

### 3. 🛡️ Triple-Verification Protocol (Anti-Hallucination & Source Audit)
Every extracted scholarship undergoes a rigorous 3-tier verification before reaching the student:
1. **Tier 1 — Domain & URL Authenticity Audit**: Classifies links into `🏛️ Official Domain` (`.gov`, `.edu`, `.ac.jp`, `.go.kr`, `.edu.au`, `.europa.eu`, `.edu.vn`, etc.), `📰 Trusted Secondary Portal`, or flags `🚫 Placeholder / Fake URLs` (`example.com`).
2. **Tier 2 — Temporal & Deadline Validator**: Parses deadlines against the current 2026–2027 academic cycle, calculating days remaining and rejecting outdated pre-2026 listings.
3. **Tier 3 — Fresh-Context AI Critic & Hard Eligibility Cross-Check**: An independent Critic Agent (without profile bias) audits scholarship legitimacy while deterministic rules cross-check the candidate's GPA and IELTS/language scores against program requirements to compute a **Trust Score (0–99%)**.

### 4. Rich Student Experience & AI Application Studio
- **1-Click Profile Presets & AI CV Parser**: Test immediately with 4 realistic Vietnamese student profiles or paste/upload a CV (`.txt`, `.md`) to auto-fill the form.
- **Zero-Key Live Simulation Mode**: Evaluates and demonstrates the full 10-node telemetry pipeline immediately even before entering a Meta Model API key.
- **4-Dimension Match Breakdown**: Visual progress bars for **Major Fit, GPA Feasibility, Language Readiness, and Country/Grant Alignment**.
- **Side-by-Side Scholarship Comparison**: Select up to 4 scholarships to compare values, deadlines, trust scores, and requirements in a unified table.
- **AI Application Studio**: Generate tailored **English/Vietnamese Motivation Letter Outlines, 3-Stage Application Timelines, Top 3 Interview Questions**, and an **Interactive Document Checklist** (persisted in `localStorage`) for **any** scholarship card.
- **Multi-Format Export**: Download complete reports as **JSON**, **Excel-ready CSV (UTF-8 BOM)**, or **Markdown (`.md`)**.

---

## 🛠️ Quick Start

1. Clone this repository:
   ```bash
   git clone https://github.com/MinhTriTM/hocbong-hunter.git
   cd hocbong-hunter
   ```
2. Open `index.html` directly in any modern browser or serve locally:
   ```bash
   python -m http.server 8080
   ```
3. Paste your **Meta Model API Key** from [dev.meta.ai](https://dev.meta.ai) and click **🚀 Săn Học Bổng Ngay**, or click **⚡ Chạy Demo Thực Tế (0 Credit)** to experience the full 10-node pipeline right away.

---

## 📁 Project Structure

```text
index.html        # Cyber-Academic Glassmorphism UI & Multi-Agent Command Center
css/style.css     # Responsive Dark Glassmorphism styling, SVG glow animations, Comparison & Studio UI
js/meta.js        # Meta Model API Client (/v1/responses), Multi-Model Router, Cost Telemetry & Triple-Verification Engine
js/flowchart.js   # Interactive 10-Node Bezier SVG Flowchart & Per-Agent Telemetry Inspector
js/agents-v2.js   # 10-Node Agent prompts, CV Parser, Parallel Web Search, Fresh-Context Critic & Checklist Builder
js/app.js         # UI Controller, 1-Click Presets, Filtering/Sorting, Side-by-Side Comparison & JSON/CSV/MD Exporters
```
