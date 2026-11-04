# 🎯 Học Bổng Hunter v4.0 — 12-Node Multi-Agent Scholarship Ecosystem & Triple-Verification Engine

[![CI/CD & Triple-Verification](https://github.com/MinhTriTM/hocbong-hunter/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/MinhTriTM/hocbong-hunter/actions/workflows/ci-cd.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](LICENSE)
[![Meta Models](https://img.shields.io/badge/Meta_Muse-Wonder_1.0_%2B_Spark_1.3-0866FF.svg)](https://dev.meta.ai)
[![Languages](https://img.shields.io/badge/i18n-50_Global_Languages-8b5cf6.svg)](js/i18n.js)
[![Live Demo](https://img.shields.io/badge/Live_Demo-GitHub_Pages-10b981.svg)](https://minhtritm.github.io/hocbong-hunter/)
[![3-Min Demo Video](https://img.shields.io/badge/YouTube-3--Min_Demo_Video-FF0000.svg)](https://youtu.be/5LXRnpNLMII)

> 🌐 **Live Production Demo**: **[https://minhtritm.github.io/hocbong-hunter/](https://minhtritm.github.io/hocbong-hunter/)**
> 🎬 **3-Minute Hackathon Demo Video**: **[https://youtu.be/5LXRnpNLMII](https://youtu.be/5LXRnpNLMII)**
> 🏆 **Built for the Meta Global AI Developer Hackathon (Meta & Cerebral Valley)**
> - **Track**: Indie Developer Track
> - **Theme**: Build for Your World & Push the Frontier (Multi-Model Agentic Workflows)
> - **Models Used**: `muse-wonder-1.0` (1M Context), `muse-spark-1.3` (1M Context + Web Search), `muse-spark-1.3-contributor` via official Meta Model API (`https://api.meta.ai/v1/responses`)

---

## 💡 The Problem We Solve ("Build for Your World")

Every year, millions of students worldwide miss out on life-changing international scholarships because:
1. **Fragmented & Outdated Portals**: Scholarship listings are scattered across thousands of government, university, and foundation pages in different languages.
2. **AI Hallucinations & Dead Links**: Standard single-prompt LLMs frequently hallucinate non-existent grants, expired deadlines, or fake URLs (`example.com`).
3. **High Barrier to Application & Interview Prep**: Hiring study-abroad agencies costs $2,000–$10,000+ for CV parsing, motivation letter editing, and mock interviews.

**Học Bổng Hunter v4.0** solves this end-to-end by orchestrating a **12-Node Heterogeneous Multi-Agent Pipeline** powered by **Meta Muse Wonder 1.0** and **Meta Muse Spark 1.3** (`1M Context Window`), verified by a deterministic **3-Tier Anti-Hallucination Engine (`VerifierEngine`)**, and accessible in **50 global languages** with **5 free sponsored AI runs per IP & Device MAC**.

---

## 🧠 12-Node Multi-Agent Architecture & Heterogeneous Model Routing

Instead of a single monolithic LLM call, **Học Bổng Hunter v4.0** routes tasks across specialized Meta Muse models based on cognitive complexity, tool requirements, and cost efficiency:

```text
[👤 Node 1: Profile Analyzer & AI CV Parser] ──► [🕸️ 5-Axis SVG Profile Radar Chart]
                      │
      [🧠 Node 2: Supervisor Agent] (Muse Wonder 1.0 — Dynamic 3-Lane Search Strategy)
                      │ fan-out (Promise.all parallel execution)
           ┌──────────┼──────────┐
           ▼          ▼          ▼
        [🔎 R1]    [🔎 R2]    [🔎 R3] (Nodes 3, 4, 5: Muse Spark 1.3 + Live Web Search)
           └──────────┼──────────┘
                      │ fan-in
      [🔀 Node 6: Merge & Deduplicator] (0-Token Deterministic URL/Title Deduplication)
                      │
      [🧾 Node 7: Structured Extractor] (Muse Spark 1.3 — Strict JSON Schema Extraction)
                      │
     [🛡️ Node 8: Triple-Verify Critic]  (Muse Wonder 1.0 Fresh Context + 3-Tier VerifierEngine)
                      │ verified scholarship pool
     [📊 Node 9: Multi-Criteria Matcher] (Muse Spark 1.3 — 0-100 Score + 4 Sub-dimension Bars)
                      │
    [✍️ Node 10: Strategic App Drafter]  (Muse Wonder 1.0 — Motivation Letter + 3-Stage Timeline)
                      │
        ┌─────────────┴─────────────┐
        ▼                           ▼
[🎙️ Node 11: AI Mock Interviewer]  [📝 Node 12: AI Essay Critic & Rewriter]
(Muse Wonder 1.0 + Web Speech API   (Muse Wonder 1.0 — 4-Metric Scoring,
 Voice Recognition + STAR Grading)   Cliché Detection & Academic Rewrite)
```

### Why Pair `Muse Wonder 1.0` + `Muse Spark 1.3`?
| Meta Model | Assigned Agent Nodes | Architectural Rationale |
| :--- | :--- | :--- |
| **✨ Muse Wonder 1.0** (`muse-wonder-1.0` · 1M Context) | `#2 Supervisor`, `#8 Triple-Verify Critic`, `#10 Strategic Drafter`, `#11 Mock Interviewer`, `#12 Essay Critic` | Frontier reasoning, long-horizon strategic planning, critical auditing in a fresh context, and nuanced academic writing/grading. |
| **⚡ Muse Spark 1.3** (`muse-spark-1.3` · 1M Context) | `#3 Researcher 1`, `#4 Researcher 2`, `#5 Researcher 3`, `#7 Extractor`, `#9 Matcher`, `CV Parser` | High-speed parallel web search grounding (`tools: [{ type: "web_search" }]`), low-latency JSON extraction, and fewer tokens than v1.2. |
| **🌱 Muse Spark 1.3 Contributor** (`muse-spark-1.3-contributor`) | Optional 1-Click Eco Strategy | Cuts token costs by up to **95%** (`$0.10/1M input`, `$0.20/1M output`) for high-volume student communities. |

---

## 🛡️ Key Features & Technical Innovations (v4.0)

### 1. Triple-Verification Protocol (`VerifierEngine`)
Every scholarship discovered by the parallel researchers must pass three independent verification layers before being presented:
- **Tier 1 — Domain & URL Authenticity Audit**: Classifies links into `🏛️ Official Domain` (`.gov`, `.edu`, `.ac.jp`, `.go.kr`, `.edu.au`, `.europa.eu`, `.daad.de`, `.edu.vn`), `📰 Trusted Portal`, or blocks `🚫 Fake/Placeholder URLs`.
- **Tier 2 — Temporal & 2026–2027 Deadline Parser**: Calculates exact days remaining, flags urgent deadlines (`≤ 45 days`), and filters out expired pre-2026 cycles.
- **Tier 3 — Fresh-Context AI Critic & Eligibility Cross-Check**: Runs `muse-wonder-1.0` in a clean context window (free from user-profile confirmation bias) and deterministically cross-checks GPA & IELTS/TOEFL requirements to compute a **Trust Score (`0–99%`)**.

### 2. Interactive SVG Telemetry & Per-Node Inspector
- Watch all **12 agents** light up in real time on a responsive Bezier SVG canvas.
- Click any node on the graph to inspect its exact **Input Prompt, Output Payload, Model ID, Latency (ms), Token Usage, and USD Cost**.

### 3. 🎙️ Agent #11 (`MockInterview`) & 📝 Agent #12 (`EssayCritic`)
- **AI Mock Interview Coach**: Answer scholarship committee questions via keyboard or **Voice Input (`Web Speech API`)** and receive an instant **STAR Score (`0–100`)**, strengths/weaknesses analysis, and a model answer from `Muse Wonder 1.0`.
- **AI Essay Critic & Rewriter**: Paste your Motivation Letter or Statement of Purpose draft to get a **4-Dimension Rubric Score** (*Hook, Academic Fit, Leadership Impact, Clarity*), **Cliché Alerts**, and an upgraded academic paragraph.

### 4. 🕸️ 5-Axis SVG Profile Radar & Calendar/PDF Exports
- **5-Axis SVG Radar Chart**: Visually compares the student's **GPA, Language, Research/Extracurriculars, Major Priority, and Target Readiness** against the Full Scholarship Benchmark.
- **Multi-Format & Calendar Export**: Export verified results to **`.ICS` (Apple/Google/Outlook Calendar with 14-day & 3-day reminders)**, **Print/Save A4 PDF Report**, **JSON**, **CSV (UTF-8 BOM)**, or **Markdown (`.md`)**.
- **Light / Dark Academic Glassmorphism + PWA Ready**: Seamless theme switching and installable `manifest.json`.

### 5. 🌍 50 Global Languages (`i18n.js`) & Zero-Exposure API Security (`QuotaGuard`)
- **50 Languages + Automatic RTL Layout**: Switch seamlessly between 50 languages (Vietnamese, English, Japanese, Korean, Chinese, French, German, Arabic, Hindi, Spanish, etc.). Both the UI and all **12 AI Agent Prompts** dynamically adapt to the selected language.
- **Zero-Exposure Security & IP + Device MAC Quota (`5 Free Turns`)**:
  - **Zero Plaintext Key in Repo**: Protected by automated CI/CD secret scanning (`tests/verify-pipeline.js`).
  - **5 Sponsored Queries per IP & Hardware MAC Fingerprint (`QuotaGuard`)**: Judges and students can immediately run **5 live Meta Model API queries** right on GitHub Pages without entering a key, enforced per public IP and 6-octet WebGL/Audio/Canvas hardware MAC fingerprint (`XX:XX:XX:XX:XX:XX`).
  - **WebCrypto `AES-GCM 256-bit` (`CryptoVault`)**: Any personal API key entered by a user is encrypted locally using `PBKDF2 (SHA-256, 100,000 iterations)`.

---

## 🛠️ Quick Start (3 Ways to Run)

### Option A — Instant Live Web App (Recommended for Hackathon Judges)
Visit **[https://minhtritm.github.io/hocbong-hunter/](https://minhtritm.github.io/hocbong-hunter/)**:
1. Click **🚀 Săn Học Bổng Ngay** to run live with the **5 Free Sponsored Queries** (powered by `Muse Wonder 1.0` & `Muse Spark 1.3`), OR
2. Click **⚡ Chạy Demo Thực Tế (0 Credit)** for an instant full 12-node interactive simulation, OR
3. Paste your own `MODEL_API_KEY` from [dev.meta.ai](https://dev.meta.ai) for unlimited queries.

### Option B — Local Static Server
```bash
git clone https://github.com/MinhTriTM/hocbong-hunter.git
cd hocbong-hunter
python -m http.server 8080
# Open http://localhost:8080
```

### Option C — Secure Node.js `.env` Proxy Server (Zero-Key Exposure Backend)
```bash
cp .env.example .env
# Add META_API_KEY=your_key_here inside .env
node server.js
# Server runs at http://localhost:3000 with server-side IP + MAC rate limiting (5 turns)
```

---

## 🧪 Automated CI/CD & Verification Suite

Run our 7-stage automated verification suite locally or via GitHub Actions:
```bash
node tests/verify-pipeline.js
```
Checks performed on every push:
1. Required architecture files & MIT `LICENSE` integrity
2. JavaScript AST syntax check across all modules (`node --check`)
3. **Zero-Plaintext Secret Leak Audit** across all tracked files
4. Meta Muse Model Catalog & `/v1/responses` endpoint verification
5. 50-Language `i18n` & `QuotaGuard` IP/MAC 5-limit verification
6. 12-Node Multi-Agent Pipeline & DOM contract verification

---

## 📁 Project Structure

```text
├── index.html                  # Cyber-Academic Glassmorphism UI (Light/Dark, 50-Lang, 12-Node Studio)
├── css/style.css               # Responsive Glassmorphism, Light/Dark theme, Radar & Studio styles
├── js/
│   ├── meta.js                 # Meta Model API (/v1/responses), Multi-Model Router, QuotaGuard, CryptoVault, VerifierEngine
│   ├── i18n.js                 # 50-Language Internationalization Dictionary + RTL + AI Prompt Injector
│   ├── agents-v2.js            # 12-Node Agent Prompts, Parallel Web Search, Mock Interviewer (#11) & Essay Critic (#12)
│   ├── flowchart.js            # Interactive 12-Node Bezier SVG Flowchart & Live Telemetry Inspector
│   └── app.js                  # UI Controller, 5-Axis Radar SVG, .ICS/PDF/CSV/MD Exporters, Voice Input
├── server.js                   # Optional Node.js Zero-Dependency Backend Proxy (.env + IP/MAC 5-limit)
├── cloudflare-worker.js        # Optional Serverless Edge Worker Proxy for Cloudflare
├── tests/verify-pipeline.js    # 7-Stage CI/CD Security & Architecture Verification Suite
├── .github/workflows/ci-cd.yml # Automated GitHub Actions CI/CD + GitHub Pages Deployment
└── LICENSE                     # Open-Source MIT License
```

---

## 📄 License

Distributed under the **MIT License**. See [`LICENSE`](LICENSE) for full details.
