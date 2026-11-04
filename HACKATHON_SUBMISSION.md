# 🏆 Meta Global AI Developer Hackathon — Official Submission Kit

> **Submission Deadline**: **Nov 4, 2026 at 9:00 PM ET** (**Nov 5, 2026 at 9:00 AM GMT+7 Vietnam Time**)
> **Submission Link**: Your approved event page on [cerebralvalley.ai](https://cerebralvalley.ai) -> **Submit Project** tab.

---

## ✅ 1. Mandatory Requirements Checklist (100% Ready)

| Requirement | Status | Details / Link |
| :--- | :---: | :--- |
| **Open-Source GitHub Repository** | ✅ **READY** | **[https://github.com/MinhTriTM/hocbong-hunter](https://github.com/MinhTriTM/hocbong-hunter)** (Public repo + `MIT LICENSE` included) |
| **Live Production Deployment** | ✅ **READY** | **[https://minhtritm.github.io/hocbong-hunter/](https://minhtritm.github.io/hocbong-hunter/)** (GitHub Pages + CI/CD Green) |
| **Meta Models Integrated** | ✅ **READY** | **Muse Wonder 1.0** (`muse-wonder-1.0`), **Muse Spark 1.3** (`muse-spark-1.3`), **Muse Spark 1.3 Contributor** via `https://api.meta.ai/v1/responses` |
| **Zero-Friction Judge Testing** | ✅ **READY** | Includes **5 Free Sponsored Live API Queries per IP/MAC (`QuotaGuard`)** + **1-Click Zero-Credit Interactive Demo** |
| **3-Minute Demo Video** | 🎬 **SCRIPT BELOW** | Record your screen at `https://minhtritm.github.io/hocbong-hunter/` using the 3-minute script below |

---

## 📋 2. Copy-Paste Answers for the Hackathon Submission Form

### 🔹 Project Title
```text
Học Bổng Hunter v4.0 — 12-Node Multi-Agent Scholarship Ecosystem & Triple-Verification Engine
```

### 🔹 Short Pitch / Tagline (1–2 sentences)
```text
An open-source 12-node multi-agent system powered by Meta Muse Wonder 1.0 and Muse Spark 1.3 that autonomously discovers, cross-verifies against hallucinations, matches, and coaches students through international scholarship applications across 50 global languages.
```

### 🔹 Track Selection
- **Track**: `Indie Developer Track`
- **Project Theme**: `Build for Your World` (and `Push the Frontier — Agentic Workflows`)

### 🔹 Links
- **GitHub Repository URL (Public & Open Source MIT)**:
  `https://github.com/MinhTriTM/hocbong-hunter`
- **Live Demo / Deployed App URL**:
  `https://minhtritm.github.io/hocbong-hunter/`

### 🔹 Which Meta Models & Tools Did You Use?
- **`muse-wonder-1.0` (Meta Muse Wonder · 1M Context)**: Powers our complex reasoning, planning, and evaluation nodes (`#2 Supervisor Agent`, `#8 Triple-Verify Critic`, `#10 Strategic Application Drafter`, `#11 AI Mock Interview Coach`, and `#12 AI Essay Critic & Rewriter`).
- **`muse-spark-1.3` (Meta Muse Spark 1.3 · 1M Context + Native Web Search)**: Powers our high-speed parallel execution and structured extraction nodes (`#3, #4, #5 Parallel Web Researchers` with `tools: [{ type: "web_search" }]`, `#7 JSON Schema Extractor`, `#9 Multi-Criteria Matcher`, and `AI CV Parser`).
- **`muse-spark-1.3-contributor`**: Integrated as a 1-click eco-routing option that reduces token cost by up to 95% (`$0.10/1M input`, `$0.20/1M output`).

### 🔹 Detailed Project Description (What it does & Why we built it)
```text
Every year, millions of talented students in emerging economies miss out on life-changing international scholarships because information is fragmented across thousands of foreign websites, commercial study-abroad agencies charge $2,000–$10,000+, and standard single-prompt LLMs frequently hallucinate expired deadlines or fake URLs.

Học Bổng Hunter v4.0 solves this firsthand problem by orchestrating a 12-Node Heterogeneous Multi-Agent Pipeline over the official Meta Model API (https://api.meta.ai/v1/responses):

1. Heterogeneous Multi-Model Routing (Muse Wonder 1.0 + Muse Spark 1.3):
   - Node 1 (Profile Analyzer & AI CV Parser) + 5-Axis SVG Radar Chart: Extracts GPA, IELTS/TOEFL, major, and research achievements from raw resumes and maps them against a Full Scholarship Benchmark.
   - Node 2 (Supervisor Agent — Muse Wonder 1.0): Formulates a dynamic 3-lane search strategy (Government/Bilateral, University-Specific, and Global Foundations).
   - Nodes 3, 4, 5 (Parallel Researchers — Muse Spark 1.3 + Live Web Search): Execute concurrently via Promise.all to gather real-time 2026–2027 scholarship data.
   - Node 6 (0-Token Deterministic Deduplicator) & Node 7 (Structured JSON Extractor — Muse Spark 1.3).
   - Node 8 (Triple-Verify Critic — Muse Wonder 1.0 in a Fresh Context + Deterministic VerifierEngine): Audits every URL (.gov/.edu/.ac.*/.org vs fake links), validates 2026–2027 deadlines, and cross-checks GPA/language eligibility to compute a Trust Score (0–99%).
   - Node 9 (Multi-Criteria Matcher — Muse Spark 1.3): Computes an overall Match Score (0–100%) and 4 sub-scores (Major Fit, GPA Feasibility, Language Readiness, Country/Grant Alignment).
   - Node 10 (Strategic Drafter — Muse Wonder 1.0): Generates personalized Motivation Letter outlines and a 3-stage action plan.
   - Node 11 (AI Mock Interview Coach — Muse Wonder 1.0 + Web Speech API): Allows students to answer scholarship interview questions by voice or text and grades them using the STAR rubric (0–100).
   - Node 12 (AI Essay Critic & Rewriter — Muse Wonder 1.0): Scores essay drafts across 4 academic dimensions, detects clichés, and rewrites weak paragraphs.

2. Built for Global Accessibility & Production Security:
   - 50 Global Languages (with automatic RTL support for Arabic/Urdu/Hebrew/Persian) dynamically injected into both the UI and all 12 agent prompts.
   - Live Interactive SVG Flowchart & Telemetry Inspector tracking per-node prompts, outputs, latency (ms), tokens, and USD cost.
   - Zero-Exposure API Security: WebCrypto AES-GCM 256-bit key vault + QuotaGuard (5 free sponsored live API runs per public IP and hardware MAC fingerprint).
   - Multi-format exports: .ICS Calendar reminders, Print/Save A4 PDF, CSV, Markdown, and JSON.
```

### 🔹 How We Built It & Technical Challenges Solved
```text
- Direct Meta Responses API Integration (/v1/responses): We built a resilient client in js/meta.js supporting Meta's native input_text blocks, reasoning effort controls, web_search tool definitions, and automatic fallback chains.
- Eliminating Hallucinations via Fresh-Context Auditing: When an LLM both searches and evaluates in the same context window, it suffers from confirmation bias. We isolated Node #8 (Triple-Verify Critic) in a clean context window using Muse Wonder 1.0 and paired it with our deterministic VerifierEngine (domain TLD classification, deadline parsing, and hard GPA/IELTS thresholding).
- Zero-Exposure Client/Edge Quota Enforcement: To let hackathon judges test live Meta Muse API calls on GitHub Pages without exposing plaintext keys in git, we engineered a 7-stage CI/CD secret scanner, an optional Node.js/Cloudflare Worker proxy, and a client-side QuotaGuard combining public IP lookup with a 6-octet WebGL/Audio/Canvas hardware MAC fingerprint.
```

---

## 🎬 3. Timed 3-Minute Demo Video Script (Record in 1 Take!)

> **Tip**: Open `https://minhtritm.github.io/hocbong-hunter/` in Chrome, set zoom to `100%`, and use OBS / Loom / Windows Snipping Tool (`Win + Shift + R`) with microphone on.

- **0:00 – 0:25 | Hook & Problem ("Build for Your World")**
  - *Show the main interface, toggle Light/Dark mode, and open the 50-Language dropdown.*
  - **Say**: *"Hi everyone! Every year, millions of students miss out on international scholarships due to scattered portals, $5,000 agency fees, and LLM hallucinations. Today I’m presenting Học Bổng Hunter v4.0 — a 12-node multi-agent ecosystem powered by Meta Muse Wonder 1.0 and Muse Spark 1.3, supporting 50 languages."*

- **0:25 – 0:55 | Profile Input, AI CV Parser & 5-Axis Radar Chart**
  - *Click preset **`🇯🇵 MEXT Nhật (Kỹ thuật)`** or **`🇬🇧 Chevening / Gates`** (or paste a CV into the AI CV Parser).*
  - *Point to the **5-Axis SVG Profile Radar Chart** in the left panel.*
  - **Say**: *"With one click or by pasting a raw CV, Node 1 analyzes the student's profile and renders a live 5-Axis SVG Radar Chart comparing their GPA, IELTS, and research profile against a Full Scholarship Benchmark."*

- **0:55 – 1:40 | Live 12-Node Execution & Multi-Model Routing (`Muse Wonder 1.0` + `Muse Spark 1.3`)**
  - *Select routing strategy **`⚡ Cân bằng: Wonder 1.0 + Spark 1.3`** and click **`🚀 Săn Học Bổng Ngay`** (or **`⚡ Chạy Demo Thực Tế`**).*
  - *Click on nodes in the **Interactive 12-Node SVG Flowchart** as they light up (`Supervisor`, `Researcher 1-3`, `Triple-Verify Critic`).*
  - **Say**: *"Watch our 12-node pipeline in action. We route Meta Muse Wonder 1.0 to the Supervisor and Critic nodes for deep reasoning, while 3 parallel Muse Spark 1.3 agents execute concurrent web searches. Clicking any node on the SVG graph opens the live Telemetry Inspector showing exact prompts, JSON outputs, token counts, latency, and USD cost."*

- **1:40 – 2:15 | Triple-Verification Protocol & Side-by-Side Comparison**
  - *Scroll through the verified scholarship cards, pointing out the **`🏛️ Official Domain`** badge, **`Trust Score 98%`**, and 4 sub-score bars. Check 2 cards to open the **Comparison Table**.*
  - **Say**: *"To eliminate hallucinations, Node 8 runs a 3-Tier Verification Engine: auditing official .gov and .edu domains, validating 2026–2027 deadlines, and cross-checking GPA and IELTS eligibility. Students can also compare up to 4 scholarships side-by-side."*

- **2:15 – 2:45 | AI Application Studio: Mock Interviewer (#11) & Essay Critic (#12)**
  - *In the AI Application Studio, click **`🎙️ Luyện Phỏng Vấn AI`** (type or speak an answer and click **`🧠 AI Chấm Điểm STAR`**) and then click **`📝 AI Chấm & Sửa Bài Luận`**.*
  - **Say**: *"Beyond discovery, Muse Wonder 1.0 powers our AI Application Studio. Agent 11 is an interactive Mock Interview Coach with voice recognition that grades answers using the STAR method. Agent 12 is an AI Essay Critic that scores Motivation Letters across 4 criteria, flags clichés, and rewrites weak paragraphs into academic English."*

- **2:45 – 3:00 | Calendar `.ICS` / PDF Export & Wrap-up**
  - *Click **`📅 Xuất lịch .ICS`** and **`🖨️ In / Lưu PDF`**.*
  - **Say**: *"Finally, students can export deadlines directly to Google or Apple Calendar via .ICS or print a complete A4 PDF dossier. Built 100% open-source with Meta Muse Wonder 1.0 and Spark 1.3. Thank you!"*
