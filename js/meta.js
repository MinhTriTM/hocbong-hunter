/* ==========================================================================
 * Học Bổng Hunter v3.0 — Meta Muse Multi-Model Engine & Triple-Verification
 * File: js/meta.js
 * Hỗ trợ:
 *   1. Toàn bộ danh mục Meta Model API mới nhất (Context 1M):
 *      - muse-wonder-1.0 (Frontier agentic planning, delegation, error recovery)
 *      - muse-spark-1.3 (Long-horizon coding & multi-step tool/web_search use)
 *      - muse-spark-1.3-contributor (Tiết kiệm 95% chi phí: $0.10 / $0.20 per 1M)
 *      - muse-spark-1.2 & muse-spark-1.1
 *   2. Chuẩn payload chính thức của POST https://api.meta.ai/v1/responses:
 *      input: [{ role: "user", content: [{ type: "input_text", text: "..." }] }]
 *      kèm tự động fallback linh hoạt & tự phục hồi lỗi (Auto Error Recovery).
 *   3. Telemetry đo đạc thời gian thực: Latency, Tokens, Chi phí USD theo bảng giá.
 *   4. VerifierEngine — Giao thức Kiểm chứng Độc lập 3 Tầng (Triple-Verification).
 *   5. Live Simulation / Demo Mode với dữ liệu học bổng thực tế 2026–2027.
 * ========================================================================== */

const MUSE_MODELS = {
  "muse-wonder-1.0": {
    id: "muse-wonder-1.0",
    name: "Muse Wonder 1.0 (New · Frontier)",
    badge: "✨ Muse Wonder 1.0",
    context: "1M",
    desc: "Frontier coding, long-running agents & advanced computer use. Lập kế hoạch dài hạn, điều phối sub-agents và tự phục hồi lỗi.",
    pricing: { input: 4.00, cached: 0.20, output: 20.00 }, // USD per 1M tokens
  },
  "muse-spark-1.3": {
    id: "muse-spark-1.3",
    name: "Muse Spark 1.3 (Agentic & Tool Use)",
    badge: "⚡ Muse Spark 1.3",
    context: "1M",
    desc: "Tối ưu cho tác vụ đa bước, gọi công cụ (web_search, MCP) nhanh và tiết kiệm token hơn 1.2.",
    pricing: { input: 1.25, cached: 0.15, output: 4.25 },
  },
  "muse-spark-1.3-contributor": {
    id: "muse-spark-1.3-contributor",
    name: "Muse Spark 1.3 Contributor (-95% Cost)",
    badge: "🌱 Spark 1.3 Contributor",
    context: "1M",
    desc: "Sức mạnh tương đương Muse Spark 1.3 với chi phí rẻ hơn tới 95% ($0.10/1M input, $0.20/1M output).",
    pricing: { input: 0.10, cached: 0.002, output: 0.20 },
  },
  "muse-spark-1.2": {
    id: "muse-spark-1.2",
    name: "Muse Spark 1.2",
    badge: "🔧 Muse Spark 1.2",
    context: "1M",
    desc: "Model tối ưu hóa cho agentic workflows và phân tích cấu trúc dữ liệu lớn (1M context).",
    pricing: { input: 1.25, cached: 0.15, output: 4.25 },
  },
  "muse-spark-1.1": {
    id: "muse-spark-1.1",
    name: "Muse Spark 1.1",
    badge: "🔹 Muse Spark 1.1",
    context: "1M",
    desc: "Model đa phương thức nền tảng cho tác vụ agentic nhiều bước.",
    pricing: { input: 1.25, cached: 0.15, output: 4.25 },
  },
};

// Chiến lược phân bổ Model cho từng Agent trong Pipeline
const ROUTING_STRATEGIES = {
  "hybrid-wonder-spark": {
    id: "hybrid-wonder-spark",
    name: "🔥 Hybrid Frontier (Muse Wonder 1.0 + Muse Spark 1.3) — Khuyến nghị",
    desc: "Supervisor, Critic & Drafter dùng Muse Wonder 1.0 (lập kế hoạch & kiểm định sâu); 3 Researchers, Extractor & Matcher dùng Muse Spark 1.3 (tốc độ cao & web search).",
    map: {
      profile: "muse-spark-1.3",
      supervisor: "muse-wonder-1.0",
      r1: "muse-spark-1.3",
      r2: "muse-spark-1.3",
      r3: "muse-spark-1.3",
      extractor: "muse-spark-1.3",
      critic: "muse-wonder-1.0",
      matcher: "muse-spark-1.3",
      drafter: "muse-wonder-1.0",
    },
  },
  "all-spark-1.3": {
    id: "all-spark-1.3",
    name: "⚡ Toàn bộ Muse Spark 1.3 (Nhanh & Ổn định)",
    desc: "Tất cả các Agent đều chạy trên Muse Spark 1.3 ($1.25 / $4.25 per 1M tokens).",
    map: {
      profile: "muse-spark-1.3",
      supervisor: "muse-spark-1.3",
      r1: "muse-spark-1.3",
      r2: "muse-spark-1.3",
      r3: "muse-spark-1.3",
      extractor: "muse-spark-1.3",
      critic: "muse-spark-1.3",
      matcher: "muse-spark-1.3",
      drafter: "muse-spark-1.3",
    },
  },
  "all-wonder-1.0": {
    id: "all-wonder-1.0",
    name: "✨ Toàn bộ Muse Wonder 1.0 (Suy luận Tối đa)",
    desc: "Chạy toàn bộ hệ thống trên model Frontier mới nhất Muse Wonder 1.0 (tự động fallback sang Spark 1.3 nếu cần).",
    map: {
      profile: "muse-wonder-1.0",
      supervisor: "muse-wonder-1.0",
      r1: "muse-wonder-1.0",
      r2: "muse-wonder-1.0",
      r3: "muse-wonder-1.0",
      extractor: "muse-wonder-1.0",
      critic: "muse-wonder-1.0",
      matcher: "muse-wonder-1.0",
      drafter: "muse-wonder-1.0",
    },
  },
  "contributor-eco": {
    id: "contributor-eco",
    name: "🌱 Siêu Tiết Kiệm (Muse Spark 1.3 Contributor · -95% phí)",
    desc: "Sử dụng gói Contributor ($0.10/1M input, $0.20/1M output) tối ưu hóa ngân sách credit.",
    map: {
      profile: "muse-spark-1.3-contributor",
      supervisor: "muse-spark-1.3-contributor",
      r1: "muse-spark-1.3-contributor",
      r2: "muse-spark-1.3-contributor",
      r3: "muse-spark-1.3-contributor",
      extractor: "muse-spark-1.3-contributor",
      critic: "muse-spark-1.3-contributor",
      matcher: "muse-spark-1.3-contributor",
      drafter: "muse-spark-1.3-contributor",
    },
  },
};

const META_CONFIG = {
  apiBase: "https://api.meta.ai/v1",
  defaultStrategy: "hybrid-wonder-spark",
  todayStr: "04/11/2026",
  todayISO: "2026-11-04",
};

// Bộ đếm Telemetry & Cost Calculator cho toàn bộ phiên chạy pipeline
const metaStats = {
  calls: 0,
  webSearches: 0,
  recoveries: 0,
  inputTokens: 0,
  outputTokens: 0,
  estimatedCostUSD: 0,
  totalMs: 0,
  mode: "live", // "live" | "demo"
  strategyId: META_CONFIG.defaultStrategy,
  agentTraces: {},

  reset(mode = "live", strategyId = META_CONFIG.defaultStrategy) {
    this.calls = 0;
    this.webSearches = 0;
    this.recoveries = 0;
    this.inputTokens = 0;
    this.outputTokens = 0;
    this.estimatedCostUSD = 0;
    this.totalMs = 0;
    this.mode = mode;
    this.strategyId = strategyId;
    this.agentTraces = {};
  },

  resolveModelForNode(nodeId) {
    const strat = ROUTING_STRATEGIES[this.strategyId] || ROUTING_STRATEGIES[META_CONFIG.defaultStrategy];
    return strat.map[nodeId] || "muse-spark-1.3";
  },

  addUsage(modelId, inChars, outChars, usageObj) {
    const inTok = usageObj?.input_tokens || usageObj?.prompt_tokens || Math.max(1, Math.round(inChars / 3.8));
    const outTok = usageObj?.output_tokens || usageObj?.completion_tokens || Math.max(1, Math.round(outChars / 3.8));
    this.inputTokens += inTok;
    this.outputTokens += outTok;

    const spec = MUSE_MODELS[modelId] || MUSE_MODELS["muse-spark-1.3"];
    const cost = (inTok / 1_000_000) * spec.pricing.input + (outTok / 1_000_000) * spec.pricing.output;
    this.estimatedCostUSD += cost;
    return { inTok, outTok, cost };
  },

  recordTrace(nodeId, data) {
    this.agentTraces[nodeId] = {
      ...(this.agentTraces[nodeId] || {}),
      ...data,
      updatedAt: new Date().toLocaleTimeString("vi-VN", { hour12: false }),
    };
  },
};

function usageHint() {
  const totalTok = metaStats.inputTokens + metaStats.outputTokens;
  const sec = (metaStats.totalMs / 1000).toFixed(1);
  const costStr = metaStats.mode === "demo"
    ? "$0.0000 (Demo miễn phí)"
    : `$${metaStats.estimatedCostUSD.toFixed(4)} USD`;
  const strat = ROUTING_STRATEGIES[metaStats.strategyId] || ROUTING_STRATEGIES[META_CONFIG.defaultStrategy];
  const modeTag = metaStats.mode === "demo"
    ? "⚡ Chế độ Demo Mô phỏng Thực tế"
    : strat.name.split("—")[0].trim();
  const recStr = metaStats.recoveries > 0 ? ` · 🔄 ${metaStats.recoveries} Auto-Recovery` : "";
  return `${modeTag} · ${metaStats.calls} Agent calls (${metaStats.webSearches} Web Search)${recStr} · ~${totalTok.toLocaleString("vi-VN")} tokens (${costStr}) · ${sec}s`;
}

/**
 * Trích xuất văn bản, usage và danh sách URL trích dẫn từ kết quả trả về của
 * Meta Responses API (POST /v1/responses) hoặc Chat Completions API.
 */
function parseMetaOutput(data) {
  if (!data) throw new Error("API trả về dữ liệu rỗng.");

  // 1. Trường hợp output_text trực tiếp
  if (typeof data.output_text === "string" && data.output_text.trim()) {
    return { text: data.output_text.trim(), usage: data.usage || null };
  }

  // 2. Trường hợp Responses API chuẩn: data.output là mảng các item
  if (Array.isArray(data.output)) {
    const parts = [];
    const citations = new Set();

    for (const item of data.output) {
      if (!item) continue;
      if (typeof item.text === "string") parts.push(item.text);

      const contentList = Array.isArray(item.content)
        ? item.content
        : item.content
        ? [item.content]
        : [];

      for (const block of contentList) {
        if (typeof block === "string") {
          parts.push(block);
        } else if (block && typeof block.text === "string") {
          parts.push(block.text);
          if (Array.isArray(block.annotations)) {
            for (const ann of block.annotations) {
              const url = ann.url || (ann.url_citation && ann.url_citation.url);
              if (url) citations.add(url);
            }
          }
        }
      }
    }

    let text = parts.join("\n").trim();
    if (citations.size > 0) {
      const citeAppend = "\n\n[Nguồn Web Search trích xuất]:\n" + [...citations].map(u => `- ${u}`).join("\n");
      if (!text.includes("[Nguồn Web Search")) text += citeAppend;
    }
    if (text) return { text, usage: data.usage || null };
  }

  // 3. Trường hợp Chat Completions API: data.choices[0].message.content
  if (Array.isArray(data.choices) && data.choices[0]?.message?.content) {
    const content = data.choices[0].message.content;
    if (typeof content === "string" && content.trim()) {
      return { text: content.trim(), usage: data.usage || null };
    }
  }

  throw new Error("Không đọc được nội dung văn bản từ phản hồi của Meta Model API.");
}

/**
 * Gọi đơn lẻ 1 model qua endpoint /v1/responses theo chuẩn chính thức của Meta:
 * payload = {
 *   model: "muse-wonder-1.0" | "muse-spark-1.3",
 *   input: [{ role: "user", content: [{ type: "input_text", text: "..." }] }],
 *   stream: false
 * }
 */
async function callResponsesEndpoint({ baseUrl, headers, modelId, promptText, webSearch, effort, signal }) {
  // Chuẩn bị payload chính thức theo tài liệu dev.meta.ai
  const structuredInput = [
    {
      role: "user",
      content: [
        {
          type: "input_text",
          text: promptText,
        },
      ],
    },
  ];

  const payload = {
    model: modelId,
    input: structuredInput,
    stream: false,
  };

  if (webSearch) {
    payload.tools = [{ type: "web_search" }];
  }

  const res = await fetch(`${baseUrl}/responses`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
    signal,
  });

  if (res.ok) {
    const data = await res.json();
    return parseMetaOutput(data);
  }

  // Nếu API yêu cầu input dạng string (một số phiên bản /responses + web_search)
  const errBody = await res.text().catch(() => "");
  if (res.status === 400 || res.status === 422) {
    const fallbackPayload = {
      model: modelId,
      input: promptText,
      max_output_tokens: webSearch ? 2800 : 2200,
    };
    if (webSearch) fallbackPayload.tools = [{ type: "web_search" }];
    if (effort && effort !== "none") fallbackPayload.reasoning = { effort };

    const retryRes = await fetch(`${baseUrl}/responses`, {
      method: "POST",
      headers,
      body: JSON.stringify(fallbackPayload),
      signal,
    });
    if (retryRes.ok) {
      const data = await retryRes.json();
      return parseMetaOutput(data);
    }
  }

  const err = new Error(`Responses API (${modelId}) HTTP ${res.status}: ${errBody.slice(0, 180) || res.statusText}`);
  err.status = res.status;
  throw err;
}

/**
 * Hàm gọi API trung tâm cho mọi Agent:
 * - Tự động chọn model theo chiến lược phân tầng (Muse Wonder 1.0 / Muse Spark 1.3).
 * - Có cơ chế Auto Error Recovery: Nếu model chính (VD: muse-wonder-1.0) bị lỗi model/quyền truy cập/rate-limit,
 *   tự động chuyển tiếp sang model dự phòng (muse-spark-1.3 -> muse-spark-1.3-contributor -> /chat/completions).
 * - Hỗ trợ chế độ Demo Thực Tế khi apiKey === "DEMO" hoặc để trống khi bấm chạy thử.
 */
async function metaRespond({ apiKey, input, system, webSearch = false, effort = "low", signal, nodeId, preferredModel }) {
  const t0 = performance.now();
  metaStats.calls += 1;
  if (webSearch) metaStats.webSearches += 1;

  const primaryModel = preferredModel || metaStats.resolveModelForNode(nodeId || "supervisor");
  const fullPrompt = system ? `${system}\n\n${input}` : input;
  const inChars = fullPrompt.length;

  if (nodeId) {
    metaStats.recordTrace(nodeId, {
      status: "running",
      model: primaryModel,
      webSearch,
      effort,
      promptPreview: fullPrompt.slice(0, 700),
    });
  }

  // Chế độ DEMO Mô phỏng Thực tế (không cần API key)
  if (!apiKey || apiKey === "DEMO") {
    metaStats.mode = "demo";
    const simulated = await simulateMetaResponse({ input: fullPrompt, webSearch, nodeId, signal });
    const dt = Math.round(performance.now() - t0);
    metaStats.totalMs += dt;
    const { inTok, outTok, cost } = metaStats.addUsage(primaryModel, inChars, simulated.length, null);
    if (nodeId) {
      metaStats.recordTrace(nodeId, {
        status: "done",
        model: `${primaryModel} (Demo)`,
        latencyMs: dt,
        tokens: inTok + outTok,
        costUSD: cost,
        outputPreview: simulated.slice(0, 1200),
      });
    }
    return simulated;
  }

  const baseUrl = (localStorage.getItem("hbh_api_base") || META_CONFIG.apiBase).replace(/\/+$/, "");
  const headers = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${apiKey}`,
  };

  // Danh sách chuỗi model tự phục hồi (Fallback Chain)
  const modelChain = [primaryModel];
  if (primaryModel !== "muse-spark-1.3") modelChain.push("muse-spark-1.3");
  if (!modelChain.includes("muse-spark-1.2")) modelChain.push("muse-spark-1.2");

  let lastErr = null;
  let usedModel = primaryModel;

  // Bước 1: Thử qua endpoint chuẩn POST /v1/responses với chuỗi Model Fallback
  for (let i = 0; i < modelChain.length; i++) {
    const candidateModel = modelChain[i];
    try {
      const { text, usage } = await callResponsesEndpoint({
        baseUrl,
        headers,
        modelId: candidateModel,
        promptText: fullPrompt,
        webSearch,
        effort,
        signal,
      });

      if (i > 0) metaStats.recoveries += 1;
      usedModel = candidateModel;
      const dt = Math.round(performance.now() - t0);
      metaStats.totalMs += dt;
      const { inTok, outTok, cost } = metaStats.addUsage(usedModel, inChars, text.length, usage);

      if (nodeId) {
        metaStats.recordTrace(nodeId, {
          status: "done",
          model: usedModel,
          recoveredFrom: i > 0 ? primaryModel : null,
          latencyMs: dt,
          tokens: inTok + outTok,
          costUSD: cost,
          outputPreview: text.slice(0, 1200),
        });
      }
      return text;
    } catch (e) {
      if (e.name === "AbortError") throw e;
      lastErr = e;
      // Nếu lỗi 401 (sai API key hoàn toàn) thì dừng chuỗi thử model
      if (e.status === 401) break;
    }
  }

  // Bước 2: Fallback sang /v1/chat/completions (tương thích OpenAI / Meta Chat endpoint)
  try {
    const fallbackModel = primaryModel === "muse-wonder-1.0" ? "muse-spark-1.3" : primaryModel;
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: fallbackModel,
        messages: [
          {
            role: "system",
            content: system || "Bạn là chuyên gia AI trong hệ thống đa agent Học Bổng Hunter. Luôn trả lời chính xác, trung thực và đúng định dạng được yêu cầu.",
          },
          { role: "user", content: input },
        ],
        max_tokens: 2400,
        temperature: 0.3,
      }),
      signal,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`Chat API HTTP ${res.status}: ${errText.slice(0, 180) || res.statusText}`);
    }

    const data = await res.json();
    const { text, usage } = parseMetaOutput(data);
    metaStats.recoveries += 1;
    const dt = Math.round(performance.now() - t0);
    metaStats.totalMs += dt;
    const { inTok, outTok, cost } = metaStats.addUsage(fallbackModel, inChars, text.length, usage);

    if (nodeId) {
      metaStats.recordTrace(nodeId, {
        status: "done",
        model: `${fallbackModel} (Chat Fallback)`,
        latencyMs: dt,
        tokens: inTok + outTok,
        costUSD: cost,
        outputPreview: text.slice(0, 1200),
      });
    }
    return text;
  } catch (e) {
    if (nodeId) {
      metaStats.recordTrace(nodeId, {
        status: "failed",
        model: primaryModel,
        error: (lastErr || e).message,
      });
    }
    throw lastErr || e;
  }
}

/**
 * Bộ bóc tách JSON thông minh (chịu lỗi markdown ```json, dấu phẩy thừa, văn bản bao quanh).
 */
function extractJson(text) {
  if (!text || typeof text !== "string") {
    throw new Error("Dữ liệu đầu vào cho extractJson trống.");
  }

  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : text.trim();

  const firstArr = candidate.indexOf("[");
  const firstObj = candidate.indexOf("{");
  let start = -1;
  if (firstArr >= 0 && firstObj >= 0) start = Math.min(firstArr, firstObj);
  else start = Math.max(firstArr, firstObj);

  if (start < 0) throw new Error("Không tìm thấy cấu trúc JSON hợp lệ trong phản hồi AI.");

  const openChar = candidate[start];
  const closeChar = openChar === "[" ? "]" : "}";

  let depth = 0;
  let inString = false;
  let escaped = false;
  let end = -1;

  for (let i = start; i < candidate.length; i++) {
    const ch = candidate[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
    } else {
      if (ch === '"') {
        inString = true;
      } else if (ch === openChar) {
        depth++;
      } else if (ch === closeChar) {
        depth--;
        if (depth === 0) {
          end = i;
          break;
        }
      }
    }
  }

  const rawJson = end >= start ? candidate.slice(start, end + 1) : candidate.slice(start);
  try {
    return JSON.parse(rawJson);
  } catch {
    const cleaned = rawJson
      .replace(/,\s*([\]}])/g, "$1")
      .replace(/[\u0000-\u0019]+/g, " ");
    return JSON.parse(cleaned);
  }
}

/* ==========================================================================
 * GIAO THỨC KIỂM CHỨNG ĐỘC LẬP 3 TẦNG (TRIPLE-VERIFICATION ENGINE)
 * ========================================================================== */
const OFFICIAL_DOMAINS = [
  ".gov", ".edu", ".ac.jp", ".go.jp", ".ac.kr", ".go.kr", ".edu.au", ".ac.uk",
  ".gov.uk", ".edu.vn", ".org.vn", ".europa.eu", ".daad.de", ".campusfrance.org",
  ".fulbright", ".chevening.org", ".studyinjapan", ".studyinkorea", ".stipendiumhungaricum",
  ".vinuni.edu.vn", ".vingroup", ".vallet", ".amchamvietnam", ".britishcouncil",
  ".asean", ".adb.org", ".worldbank.org", ".erasmus", ".jasso.go.jp", ".epfl.ch"
];

const SECONDARY_DOMAINS = [
  "scholarships.com", "scholars4dev.com", "opportunitiescorners", "youthop.com",
  "scholarshipportal.com", "vnexpress.net", "tuoitre.vn", "thanhnien.vn", "giaoduc.net.vn"
];

const VerifierEngine = {
  /**
   * Tầng 1: Kiểm tra độ tin cậy của URL & Tên miền (Domain Authenticity Check)
   */
  verifyUrl(link) {
    if (!link || typeof link !== "string" || link.trim() === "" || link.toLowerCase() === "chưa rõ") {
      return {
        validUrl: false,
        tier: "unverified",
        badge: "⚠️ Chưa có link trực tiếp",
        trustDelta: -15,
        domain: "N/A",
        note: "Cần tra cứu tên học bổng trên Google để vào đúng cổng chính thức."
      };
    }

    try {
      const urlObj = new URL(link.trim());
      const host = urlObj.hostname.toLowerCase();

      if (host === "example.com" || host === "localhost" || host.includes("placeholder") || host.endsWith(".invalid")) {
        return {
          validUrl: false,
          tier: "fake",
          badge: "🚫 Link giả lập (Placeholder)",
          trustDelta: -50,
          domain: host,
          note: "Phát hiện tên miền mẫu (placeholder), không phải website thật."
        };
      }

      const isOfficial = OFFICIAL_DOMAINS.some(d => host.includes(d) || host.endsWith(d));
      if (isOfficial) {
        return {
          validUrl: true,
          tier: "official",
          badge: "🏛️ Cổng Chính Thức (Official Domain)",
          trustDelta: +20,
          domain: host,
          note: `Tên miền chính thức (${host}) thuộc tổ chức giáo dục/chính phủ.`
        };
      }

      const isSecondary = SECONDARY_DOMAINS.some(d => host.includes(d));
      if (isSecondary) {
        return {
          validUrl: true,
          tier: "secondary",
          badge: "📰 Cổng Thông Tin / Báo Chí",
          trustDelta: +5,
          domain: host,
          note: `Nguồn tổng hợp uy tín (${host}), nên mở bài viết để lấy link gốc.`
        };
      }

      return {
        validUrl: true,
        tier: "standard",
        badge: "🌐 Website Tổ Chức",
        trustDelta: +10,
        domain: host,
        note: `Domain hoạt động (${host}) — hãy đối chiếu tên tổ chức trước khi nộp.`
      };
    } catch {
      return {
        validUrl: false,
        tier: "malformed",
        badge: "⚠️ Định dạng URL lỗi",
        trustDelta: -20,
        domain: "N/A",
        note: "Chuỗi đường dẫn không đúng chuẩn HTTP/HTTPS."
      };
    }
  },

  /**
   * Tầng 2: Kiểm tra tính hợp lệ thời gian & Hạn nộp (Temporal & Deadline Audit)
   * Mốc chuẩn hiện tại: 04/11/2026 (Mùa săn học bổng 2026 - 2027)
   */
  verifyDeadline(deadlineStr) {
    const raw = String(deadlineStr || "").trim();
    if (!raw || raw.toLowerCase() === "chưa rõ") {
      return {
        status: "unknown",
        badge: "⏳ Hạn nộp: Xem trên web",
        isExpiredOld: false,
        trustDelta: -5,
        daysLeft: null
      };
    }

    const lower = raw.toLowerCase();
    const hasOldYear = /\b(2021|2022|2023|2024)\b/.test(lower);
    const hasCurrentOrNextYear = /\b(2026|2027)\b/.test(lower);
    if (hasOldYear && !hasCurrentOrNextYear) {
      return {
        status: "expired_old",
        badge: "🔴 Dữ liệu cũ (< 2026)",
        isExpiredOld: true,
        trustDelta: -45,
        daysLeft: -999
      };
    }

    const dmy = raw.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](202\d)/);
    if (dmy) {
      const day = parseInt(dmy[1], 10);
      const month = parseInt(dmy[2], 10);
      const year = parseInt(dmy[3], 10);
      const target = new Date(year, month - 1, day);
      const now = new Date(2026, 10, 4); // 04/11/2026
      const diffDays = Math.ceil((target - now) / (1000 * 60 * 60 * 24));

      if (diffDays < -30 && !lower.includes("hằng năm") && !lower.includes("chu kỳ") && !lower.includes("dự kiến")) {
        return {
          status: "closed_cycle",
          badge: `🟡 Đợt gần nhất đã đóng (${raw})`,
          isExpiredOld: false,
          trustDelta: -10,
          daysLeft: diffDays
        };
      } else if (diffDays >= 0 && diffDays <= 30) {
        return {
          status: "urgent",
          badge: `🔥 Sắp hết hạn (còn ${diffDays} ngày · ${raw})`,
          isExpiredOld: false,
          trustDelta: +15,
          daysLeft: diffDays
        };
      } else if (diffDays > 30) {
        return {
          status: "open",
          badge: `🟢 Đang mở / Sắp mở (còn ${diffDays} ngày · ${raw})`,
          isExpiredOld: false,
          trustDelta: +15,
          daysLeft: diffDays
        };
      }
    }

    if (lower.includes("đang mở") || lower.includes("2027") || lower.includes("11/2026") || lower.includes("12/2026")) {
      return {
        status: "open",
        badge: `🟢 Đang trong kỳ tuyển (${raw})`,
        isExpiredOld: false,
        trustDelta: +12,
        daysLeft: null
      };
    }

    return {
      status: "cycle",
      badge: `🗓️ Theo chu kỳ (${raw})`,
      isExpiredOld: false,
      trustDelta: +5,
      daysLeft: null
    };
  },

  /**
   * Tầng 3: Đối chiếu điều kiện cứng (GPA & IELTS) giữa Hồ sơ và Yêu cầu học bổng
   */
  verifyEligibility(profile, scholarship) {
    const cond = `${scholarship.conditions || ""} ${scholarship.value || ""}`.toLowerCase();
    const userGpa = parseFloat(String(profile.gpa || "0").replace(",", "."));
    const warnings = [];
    const matches = [];

    const gpaMatch = cond.match(/gpa\s*(?:>=|tối thiểu|từ|trên|>|:)?\s*([23]\.\d{1,2})/i);
    if (gpaMatch && !isNaN(userGpa) && userGpa > 0) {
      const reqGpa = parseFloat(gpaMatch[1]);
      if (userGpa >= reqGpa) {
        matches.push(`Đạt chuẩn GPA (${userGpa} ≥ ${reqGpa})`);
      } else {
        warnings.push(`GPA hiện tại (${userGpa}) thấp hơn mức khuyến nghị (${reqGpa})`);
      }
    } else if (userGpa >= 3.2) {
      matches.push(`GPA ${userGpa}/4.0 có tính cạnh tranh tốt`);
    }

    const userIeltsMatch = String(profile.english || "").match(/(\d(?:\.\d)?)/);
    const reqIeltsMatch = cond.match(/ielts\s*(?:>=|tối thiểu|từ|:)?\s*([5678]\.\d)/i);
    if (reqIeltsMatch && userIeltsMatch) {
      const userIelts = parseFloat(userIeltsMatch[1]);
      const reqIelts = parseFloat(reqIeltsMatch[1]);
      if (userIelts >= reqIelts) {
        matches.push(`Đạt chuẩn IELTS (${userIelts} ≥ ${reqIelts})`);
      } else {
        warnings.push(`Cần nâng IELTS từ ${userIelts} lên ${reqIelts}`);
      }
    }

    return { matches, warnings };
  },

  /**
   * Tổng hợp Kiểm chứng 3 Tầng (Triple-Verification Protocol) cho 1 học bổng
   */
  auditScholarship(profile, s, aiVerdict) {
    const urlCheck = this.verifyUrl(s.link);
    const dlCheck = this.verifyDeadline(s.deadline);
    const eligCheck = this.verifyEligibility(profile, s);

    let trustScore = 72 + urlCheck.trustDelta + dlCheck.trustDelta;
    if (s.org && s.org !== "chưa rõ") trustScore += 5;
    if (s.value && s.value !== "chưa rõ") trustScore += 4;
    if (aiVerdict && aiVerdict.ok === true) trustScore += 8;
    if (aiVerdict && aiVerdict.ok === false) trustScore -= 40;

    trustScore = Math.max(10, Math.min(99, trustScore));

    const isRejected =
      urlCheck.tier === "fake" ||
      dlCheck.isExpiredOld ||
      (aiVerdict && aiVerdict.ok === false);

    const rejectReason = isRejected
      ? (aiVerdict?.reason ||
         (urlCheck.tier === "fake" ? urlCheck.note : "Hạn nộp đã quá cũ hoặc thiếu căn cứ xác thực."))
      : null;

    return {
      ...s,
      verification: {
        trustScore,
        urlTier: urlCheck.tier,
        urlBadge: urlCheck.badge,
        domain: urlCheck.domain,
        urlNote: urlCheck.note,
        deadlineStatus: dlCheck.status,
        deadlineBadge: dlCheck.badge,
        daysLeft: dlCheck.daysLeft,
        eligMatches: eligCheck.matches,
        eligWarnings: eligCheck.warnings,
        criticNote: aiVerdict?.reason || "Đã đối chiếu chéo tên học bổng, tổ chức cấp và tên miền.",
      },
      isRejected,
      rejectReason,
    };
  }
};

/* ==========================================================================
 * KHO HỌC BỔNG THỰC TẾ ĐÃ XÁC MINH (DÙNG CHO CHẾ ĐỘ DEMO & GROUNDING BỔ TRỢ)
 * ========================================================================== */
const CURATED_SCHOLARSHIPS_2026_2027 = [
  {
    name: "Học bổng Chính phủ Nhật Bản MEXT (Monbukagakusho) 2027",
    org: "Bộ Giáo dục, Văn hóa, Thể thao, Khoa học và Công nghệ Nhật Bản (MEXT)",
    country: "Nhật Bản",
    deadline: "15/05/2027 (Chu kỳ Đại sứ quán & Tiến cử Trường 11/2026 - 02/2027)",
    value: "Toàn phần: 100% học phí + Sinh hoạt phí 117.000–145.000 JPY/tháng + Vé máy bay khứ hồi",
    conditions: "GPA >= 3.2/4.0, Bậc Đại học/Thạc sĩ/Tiến sĩ, IELTS >= 6.0 hoặc JLPT N2",
    link: "https://www.vn.emb-japan.go.jp/itpr_ja/culture_mext.html",
    category: "r1"
  },
  {
    name: "Học bổng Chính phủ Hàn Quốc GKS (Global Korea Scholarship) 2027",
    org: "Viện Giáo dục Quốc tế Quốc gia Hàn Quốc (NIIED)",
    country: "Hàn Quốc",
    deadline: "28/02/2027 (Hệ Sau đại học mở đơn đầu tháng 02/2027)",
    value: "Toàn phần: 100% học phí + 1 năm học tiếng Hàn + Trợ cấp 1.000.000–1.500.000 KRW/tháng + Vé máy bay",
    conditions: "GPA >= 2.64/4.0 (ưu tiên GPA >= 3.2), dưới 25 tuổi (ĐH) hoặc 40 tuổi (SĐH), có IELTS/TOPIK được cộng điểm",
    link: "https://www.studyinkorea.go.kr",
    category: "r1"
  },
  {
    name: "Australia Awards Scholarships (AAS) — Niên khóa 2027",
    org: "Bộ Ngoại giao và Thương mại Úc (DFAT)",
    country: "Úc",
    deadline: "30/04/2027 (Mở đơn từ 01/02/2027)",
    value: "Toàn phần: 100% học phí + Sinh hoạt phí tại Úc + Bảo hiểm OSHC + Vé máy bay khứ hồi",
    conditions: "Bậc Thạc sĩ, GPA >= 3.0, IELTS >= 6.5 (không kỹ năng nào dưới 6.0), ưu tiên ứng viên cam kết đóng góp phát triển Việt Nam",
    link: "https://www.australiaawardsvietnam.org",
    category: "r1"
  },
  {
    name: "Học bổng Chính phủ Pháp France Excellence Eiffel 2027",
    org: "Bộ Châu Âu và Ngoại giao Pháp (Campus France)",
    country: "Pháp / Châu Âu",
    deadline: "08/01/2027 (Đang mở nhận hồ sơ qua các trường ĐH Pháp)",
    value: "Trợ cấp 1.181 EUR/tháng (Thạc sĩ) hoặc 1.800 EUR/tháng (Tiến sĩ) + Vé máy bay + Bảo hiểm",
    conditions: "GPA >= 3.2/4.0, ngành Khoa học Công nghệ (CNTT, Kỹ thuật) hoặc Kinh tế - Luật, IELTS >= 6.5 hoặc B2 tiếng Pháp",
    link: "https://www.campusfrance.org/en/eiffel-scholarship-program-of-excellence",
    category: "r1"
  },
  {
    name: "Học bổng Erasmus Mundus Joint Masters (EMJM) 2026–2027",
    org: "Liên minh Châu Âu (European Commission)",
    country: "Châu Âu (Học tại 2–3 quốc gia)",
    deadline: "15/01/2027 (Đang mở đơn cho kỳ nhập học Thu 2027)",
    value: "Toàn phần: Miễn 100% học phí + 1.400 EUR/tháng trong 24 tháng + Chi phí đi lại & thị thực",
    conditions: "Sinh viên năm cuối hoặc đã tốt nghiệp ĐH, GPA >= 3.0, IELTS >= 6.5, đa dạng ngành (AI, Data Science, CNTT, Kinh tế, Môi trường)",
    link: "https://erasmus-plus.ec.europa.eu/opportunities/opportunities-for-individuals/students/erasmus-mundus-joint-masters",
    category: "r1"
  },
  {
    name: "Học bổng Khoa học Công nghệ Vingroup (Du học Thạc sĩ / Tiến sĩ) 2027",
    org: "Tập đoàn Vingroup (Quỹ Đổi mới Sáng tạo VINIF / VinUni)",
    country: "Mỹ, Anh, Úc, Pháp, Nhật, Hàn, Singapore",
    deadline: "15/04/2027 (Đợt nộp sớm tháng 12/2026)",
    value: "Toàn phần 100%: Học phí, sinh hoạt phí, bảo hiểm, vé máy bay và trợ cấp nghiên cứu",
    conditions: "Ngành KHCN trọng điểm (CNTT, AI, Khoa học Dữ liệu, Cơ điện tử, Y sinh), GPA >= 3.2/4.0, IELTS >= 6.5",
    link: "https://scholarships.vinuni.edu.vn",
    category: "r2"
  },
  {
    name: "Học bổng Tài năng Samsung (Samsung Talent Program — STP) 2026–2027",
    org: "Samsung R&D Institute Vietnam (SRV)",
    country: "Việt Nam",
    deadline: "30/11/2026 (Đang mở đơn học kỳ Thu-Đông)",
    value: "Trợ cấp 60–100 triệu VNĐ/năm + Thực tập hưởng lương & Cơ hội làm việc chính thức tại Samsung R&D",
    conditions: "Sinh viên năm 3, năm 4 ngành CNTT, Khoa học Máy tính, Điện tử Viễn thông; GPA >= 3.0/4.0; qua bài thi thuật toán",
    link: "https://www.samsung.com/vn/aboutsamsung/sustainability/corporate-citizenship/education/",
    category: "r2"
  },
  {
    name: "Học bổng AmCham Scholars Program Vietnam 2026–2027",
    org: "Hiệp hội Thương mại Hoa Kỳ tại Việt Nam (AmCham)",
    country: "Việt Nam",
    deadline: "25/11/2026 (Đang mở đơn tuyển chọn)",
    value: "15.000.000 VNĐ tiền mặt + Khóa đào tạo kỹ năng lãnh đạo & Ưu tiên tuyển dụng tại các tập đoàn Mỹ",
    conditions: "Sinh viên năm 3 đến năm cuối các trường ĐH tại Việt Nam, GPA >= 3.0/4.0, giao tiếp tiếng Anh tốt (tương đương IELTS >= 6.0)",
    link: "https://www.amchamvietnam.com/amcham-scholarship/",
    category: "r2"
  },
  {
    name: "Học bổng Gặp gỡ Việt Nam — Odon Vallet 2026–2027",
    org: "Tổ chức Khoa học Gặp gỡ Việt Nam (Rencontres du Vietnam) & Quỹ Vallet",
    country: "Việt Nam",
    deadline: "30/06/2027 (Chu kỳ xét duyệt thường niên)",
    value: "28.000.000 – 55.000.000 VNĐ/suất cho học sinh, sinh viên và học viên cao học xuất sắc",
    conditions: "Sinh viên/Học sinh có thành tích học tập xuất sắc (GPA >= 3.4/4.0), ưu tiên có giải thưởng NCKH, Olympic hoặc vượt khó",
    link: "https://icisequynhon.com/vi/hoc-bong-vallet/",
    category: "r2"
  },
  {
    name: "Học bổng Trao đổi Sinh viên ASEAN / AIMS & JASSO Nhật Bản 2027",
    org: "Tổ chức Hỗ trợ Sinh viên Nhật Bản (JASSO) & Mạng lưới ĐH Đông Nam Á (AUN)",
    country: "Nhật Bản, Hàn Quốc, ASEAN",
    deadline: "20/12/2026 (Đang mở đơn kỳ trao đổi Xuân - Thu 2027)",
    value: "Miễn 100% học phí tại trường đối tác + Trợ cấp 80.000 JPY/tháng (JASSO) trong 1–2 học kỳ",
    conditions: "Sinh viên Đại học năm 2, năm 3 đang theo học tại Việt Nam, GPA >= 3.0/4.0, IELTS >= 6.0",
    link: "https://www.jasso.go.jp/en/ryugaku/scholarship_j/shoreihi/index.html",
    category: "r3"
  },
  {
    name: "Chương trình Trại hè Nghiên cứu Khoa học Quốc tế EPFL / CERN / NII 2027",
    org: "EPFL Switzerland & National Institute of Informatics (NII Japan)",
    country: "Thụy Sĩ, Nhật Bản, Châu Âu",
    deadline: "05/02/2027 (Đang mở cổng nộp hồ sơ trực tuyến)",
    value: "Toàn phần ngắn hạn (8–12 tuần): Vé máy bay khứ hồi + 3.600 CHF hoặc 300.000 JPY sinh hoạt phí",
    conditions: "Sinh viên năm 3, năm 4 hoặc Cao học ngành Khoa học Máy tính, AI, Kỹ thuật; GPA >= 3.2; tiếng Anh học thuật tốt",
    link: "https://eesp.epfl.ch/",
    category: "r3"
  },
  // 1 học bổng mẫu có dấu hiệu hết hạn/link giả để minh chứng sức mạnh của Critic khi chạy Demo!
  {
    name: "Học bổng Toàn cầu Global Future Tech Grant 2024 (Tin cũ / Link trung gian)",
    org: "Blog Tổng Hợp Học Bổng Chưa Xác Thực",
    country: "Quốc tế",
    deadline: "15/08/2024 (Đã hết hạn từ năm 2024)",
    value: "10.000 USD",
    conditions: "Mọi ngành học, không yêu cầu GPA",
    link: "https://example.com/fake-scholarship-2024",
    category: "r3"
  }
];

/**
 * Bộ mô phỏng phản hồi thông minh khi chạy chế độ DEMO (không cần API key)
 */
async function simulateMetaResponse({ input, webSearch, nodeId, signal }) {
  const delay = ms => new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    if (signal) signal.addEventListener("abort", () => { clearTimeout(timer); reject(new DOMException("Aborted", "AbortError")); });
  });

  await delay(webSearch ? 620 : 380);

  if (nodeId === "supervisor" || input.includes("Bạn là Supervisor")) {
    return JSON.stringify({
      strategySummary: "Muse Wonder 1.0 phân bổ 3 mũi nhọn song song: (1) Học bổng Chính phủ & Liên minh Quốc tế giá trị lớn; (2) Học bổng Tập đoàn Công nghệ, Quỹ Học thuật & ĐH trong nước; (3) Chương trình Trao đổi & Nghiên cứu ngắn hạn quốc tế.",
      lanes: [
        {
          id: "r1",
          title: "🏛️ Chính phủ & Quốc tế",
          focus: "Học bổng toàn phần từ Chính phủ Nhật, Hàn, Úc, Pháp, EU đang mở chu kỳ 2026–2027",
          queries: ["MEXT GKS Australia Awards Eiffel Erasmus scholarship 2027 Vietnamese students", "học bổng chính phủ toàn phần 2027"]
        },
        {
          id: "r2",
          title: "🏢 Tập đoàn & Quỹ VN",
          focus: "Học bổng doanh nghiệp công nghệ (Samsung, Vingroup, AmCham) và quỹ học thuật (Vallet)",
          queries: ["học bổng Vingroup Samsung Talent AmCham Vallet 2026 2027", "STEM corporate scholarships Vietnam"]
        },
        {
          id: "r3",
          title: "✈️ Trao đổi & Research",
          focus: "Học bổng trao đổi sinh viên quốc tế (JASSO, AIMS) và trại hè nghiên cứu (EPFL, NII)",
          queries: ["JASSO student exchange EPFL summer research fellowship 2027", "học bổng trao đổi sinh viên quốc tế 2027"]
        }
      ]
    });
  }

  if (nodeId === "r1" || (webSearch && input.includes("Chính phủ"))) {
    return CURATED_SCHOLARSHIPS_2026_2027.filter(s => s.category === "r1")
      .map(s => `- ${s.name} | ${s.org} | ${s.country} | Hạn: ${s.deadline} | Giá trị: ${s.value} | Điều kiện: ${s.conditions} | Nguồn: ${s.link}`)
      .join("\n");
  }

  if (nodeId === "r2" || (webSearch && input.includes("Tập đoàn"))) {
    return CURATED_SCHOLARSHIPS_2026_2027.filter(s => s.category === "r2")
      .map(s => `- ${s.name} | ${s.org} | ${s.country} | Hạn: ${s.deadline} | Giá trị: ${s.value} | Điều kiện: ${s.conditions} | Nguồn: ${s.link}`)
      .join("\n");
  }

  if (nodeId === "r3" || webSearch) {
    return CURATED_SCHOLARSHIPS_2026_2027.filter(s => s.category === "r3")
      .map(s => `- ${s.name} | ${s.org} | ${s.country} | Hạn: ${s.deadline} | Giá trị: ${s.value} | Điều kiện: ${s.conditions} | Nguồn: ${s.link}`)
      .join("\n");
  }

  if (nodeId === "extractor" || input.includes("trích thành JSON array")) {
    return JSON.stringify(CURATED_SCHOLARSHIPS_2026_2027.map(({ category, ...rest }) => rest));
  }

  if (nodeId === "critic" || input.includes("Bạn là Critic")) {
    return JSON.stringify({
      verdicts: CURATED_SCHOLARSHIPS_2026_2027.map(s => {
        if (s.link.includes("example.com") || s.deadline.includes("2024")) {
          return {
            name: s.name,
            ok: false,
            reason: "Phát hiện hạn nộp đã qua từ năm 2024 và đường dẫn là tên miền giả lập (example.com), không phải nguồn học bổng chính thống."
          };
        }
        return {
          name: s.name,
          ok: true,
          reason: `Đã xác thực nguồn chính thức từ ${s.org}, thời hạn phù hợp với chu kỳ tuyển sinh 2026–2027.`
        };
      })
    });
  }

  if (nodeId === "matcher" || input.includes("Chấm điểm phù hợp 0–100")) {
    const valid = CURATED_SCHOLARSHIPS_2026_2027.filter(s => !s.link.includes("example.com"));
    const baseScores = [96, 93, 91, 89, 88, 86, 84, 82, 80, 78, 76];
    return JSON.stringify(
      valid.map((s, idx) => ({
        name: s.name,
        score: baseScores[idx % baseScores.length],
        subScores: {
          major: Math.min(100, baseScores[idx % baseScores.length] + 3),
          gpa: Math.min(100, baseScores[idx % baseScores.length] - 1),
          english: Math.min(100, baseScores[idx % baseScores.length] + 1),
          country: Math.min(100, baseScores[idx % baseScores.length] - 2),
        },
        reason: `Rất khớp với định hướng ngành học và năng lực GPA/ngoại ngữ hiện tại; chương trình thuộc nhóm uy tín hàng đầu tại ${s.country}.`
      }))
    );
  }

  if (nodeId === "drafter" || input.includes("DÀN Ý thư động lực")) {
    return `=== 1. MOTIVATION LETTER OUTLINE (BẢN TIẾNG ANH HỌC THUẬT & GỢI Ý CÁ NHÂN HÓA) ===

• Paragraph 1 — Opening & Personal Hook:
  - "Growing up amidst Vietnam's rapid digital transformation, I witnessed firsthand how intelligent systems can bridge socioeconomic gaps..."
  - [Gợi ý cá nhân hóa: Nêu 1 bài toán thực tế hoặc dự án đầu tiên khiến bạn đam mê ngành học của mình].

• Paragraph 2 — Academic Excellence & Technical Foundation:
  - "Throughout my studies with a cumulative GPA of [GPA của bạn]/4.0 and English proficiency ([Chứng chỉ của bạn]), I have focused on building rigorous analytical and practical foundations..."
  - [Điền thêm: 1–2 môn học điểm A+, đề tài nghiên cứu khoa học, hoặc sản phẩm thực tế đã thực hiện].

• Paragraph 3 — Alignment with the Scholarship & Host Institution:
  - "This scholarship program stands out not only for its academic prestige, but for its mission to cultivate cross-border innovation..."
  - [Điền thêm: Tên phòng Lab, Giáo sư hướng dẫn hoặc định hướng chiến lược của tổ chức cấp học bổng].

• Paragraph 4 — Leadership, Resilience & Unique Value ("Why Me"):
  - "Beyond technical metrics, my experience leading student teams and overcoming resource constraints has shaped my adaptability..."
  - [Điền thêm: Hoạt động ngoại khóa, giải thưởng Hackathon, hoặc hoàn cảnh vượt khó đặc biệt].

• Paragraph 5 — Post-Study Impact & Commitment to Vietnam:
  - "Upon completing the program, my 3-to-5-year roadmap is to return and contribute directly to Vietnam's high-tech ecosystem..."
  - [Kết bài khẳng định cam kết đóng góp lâu dài và lời cảm ơn Hội đồng tuyển chọn].

=== 2. LỘ TRÌNH & CHIẾN LƯỢC NỘP HỒ SƠ (ACTION PLAN) ===
• Giai đoạn 1 (Tuần 1–2): Liên hệ 02 Giảng viên hướng dẫn/Trưởng khoa để xin Thư giới thiệu (Letter of Recommendation) và sao y bảng điểm tiếng Anh.
• Giai đoạn 2 (Tuần 3–4): Hoàn thiện bản thảo Motivation Letter / Study Plan (nhờ Mentor hoặc cựu sinh viên học bổng đọc góp ý ít nhất 2 vòng).
• Giai đoạn 3 (Trước hạn nộp 7 ngày): Kiểm tra công chứng dịch thuật, ghép file PDF chuẩn dung lượng và nộp trực tuyến trên cổng chính thức.

=== 3. CÂU HỎI PHỎNG VẤN TRỌNG TÂM CẦN CHUẨN BỊ ===
1. "Why did you choose this specific country and program over other alternatives?" (Tại sao bạn chọn quốc gia và chương trình này?)
2. "How will your proposed study/research create measurable impact in Vietnam within 3 years of graduation?" (Kế hoạch tạo tác động thực tế tại Việt Nam sau khi tốt nghiệp?)
3. "Tell us about a technical or academic failure you experienced and how you resolved it." (Cách bạn vượt qua một thử thách học thuật/kỹ thuật thực tế?)`;
  }

  return "Phản hồi mô phỏng thành công.";
}
