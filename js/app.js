/* ==========================================================================
 * Học Bổng Hunter v3.0 — Main Application Controller & Interactive Studio
 * File: js/app.js
 * ========================================================================== */

const $ = (id) => document.getElementById(id);
const KEY_LS = "hbh_meta_api_key";
const STRAT_LS = "hbh_model_strategy";
const SAVED_LS = "hbh_saved_scholarships";
const CHK_LS = "hbh_checklist_state";

// Trạng thái toàn cục của phiên săn học bổng
const appState = {
  profile: null,
  extractedList: [],
  approvedList: [],
  rejectedList: [],
  rankedList: [],
  selectedCompare: new Set(),
  savedKeys: new Set(JSON.parse(localStorage.getItem(SAVED_LS) || "[]")),
  checklistState: JSON.parse(localStorage.getItem(CHK_LS) || "{}"),
  currentTargetIdx: 0,
  letterCache: {},
  activeSessionKey: null,
};

// 4 Bộ Hồ sơ mẫu 1-Click
const PROFILE_PRESETS = {
  "it-master": {
    level: "Cao học (Thạc sĩ)",
    major: "Công nghệ thông tin & Trí tuệ nhân tạo",
    gpa: "3.62",
    year: "Năm cuối / Đã tốt nghiệp",
    english: "IELTS 7.0",
    kind: "Du học toàn phần",
    countries: "Nhật, Hàn, Úc, châu Âu",
    note: "Giải Nhì NCKH Sinh viên, 1 bài báo khoa học quốc tế, dự án AI mã nguồn mở",
  },
  "biz-gov": {
    level: "Cao học (Thạc sĩ)",
    major: "Kinh tế Quốc tế & Quản trị Kinh doanh",
    gpa: "3.42",
    year: "Đã tốt nghiệp (1 năm kinh nghiệm)",
    english: "IELTS 6.5",
    kind: "Du học toàn phần",
    countries: "Úc, Anh, Pháp, Hàn Quốc",
    note: "Chủ tịch CLB Sinh viên, 2 năm hoạt động dự án cộng đồng & khởi nghiệp",
  },
  "stem-phd": {
    level: "Tiến sĩ",
    major: "Khoa học Máy tính & Thị giác Máy tính (Computer Vision)",
    gpa: "3.78",
    year: "Thạc sĩ / Nghiên cứu viên",
    english: "IELTS 7.5",
    kind: "Du học toàn phần",
    countries: "Mỹ, Thụy Sĩ, Nhật, Pháp, Singapore",
    note: "02 công bố Q1/Hội nghị quốc tế, kinh nghiệm tối ưu mô hình Deep Learning",
  },
  "exchange-ug": {
    level: "Đại học",
    major: "Kỹ thuật Phần mềm",
    gpa: "3.28",
    year: "Năm 2",
    english: "IELTS 6.0",
    kind: "Ngắn hạn / trao đổi",
    countries: "Nhật Bản, Hàn Quốc, ASEAN, Việt Nam",
    note: "Vượt khó học giỏi, thành viên tích cực CLB Học thuật Khoa CNTT",
  },
};

let fc = null;

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

function getProfileFromForm() {
  return {
    level: $("level").value,
    major: $("major").value.trim(),
    gpa: $("gpa").value.trim(),
    year: $("year").value.trim(),
    english: $("english").value.trim(),
    kind: $("kind").value,
    countries: $("countries").value.trim(),
    note: $("note").value.trim(),
  };
}

function setProfileToForm(p) {
  if (!p) return;
  if (p.level) $("level").value = p.level;
  if (p.major != null) $("major").value = p.major;
  if (p.gpa != null) $("gpa").value = p.gpa;
  if (p.year != null) $("year").value = p.year;
  if (p.english != null) $("english").value = p.english;
  if (p.kind) $("kind").value = p.kind;
  if (p.countries != null) $("countries").value = p.countries;
  if (p.note != null) $("note").value = p.note;
  refreshProfileInsights();
}

function renderRadarSvg(p) {
  const svg = $("radarSvg");
  if (!svg || typeof AgentsV2.computeRadarMetrics !== "function") return;
  const { axes, overallReadiness } = AgentsV2.computeRadarMetrics(p);
  const cx = 130, cy = 112, maxR = 72;
  const n = axes.length;
  const angleOf = (i) => -Math.PI / 2 + (i * 2 * Math.PI) / n;
  const ptOf = (i, val) => {
    const r = (Math.max(0, Math.min(100, val)) / 100) * maxR;
    const a = angleOf(i);
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  };

  let gridHtml = "";
  for (const lv of [35, 70, 100]) {
    const pts = axes.map((_, i) => ptOf(i, lv).map(v => v.toFixed(1)).join(",")).join(" ");
    gridHtml += `<polygon points="${pts}" fill="none" stroke="rgba(148,163,184,0.22)" stroke-width="1"/>`;
  }

  let axisLines = "";
  let labelsHtml = "";
  axes.forEach((ax, i) => {
    const [x2, y2] = ptOf(i, 100);
    axisLines += `<line x1="${cx}" y1="${cy}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="rgba(148,163,184,0.22)" stroke-width="1"/>`;
    const [lx, ly] = ptOf(i, 124);
    const shortLbl = ax.label.split("(")[0].trim();
    labelsHtml += `<text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="middle" fill="#cbd5e1" font-size="9.5" font-weight="600">${esc(shortLbl)} (${ax.user})</text>`;
  });

  const targetPts = axes.map((ax, i) => ptOf(i, ax.target).map(v => v.toFixed(1)).join(",")).join(" ");
  const userPts = axes.map((ax, i) => ptOf(i, ax.user).map(v => v.toFixed(1)).join(",")).join(" ");

  svg.innerHTML = `
    ${gridHtml}
    ${axisLines}
    <polygon points="${targetPts}" fill="rgba(251,191,36,0.08)" stroke="#fbbf24" stroke-width="1.5" stroke-dasharray="4 3"/>
    <polygon points="${userPts}" fill="rgba(34,211,238,0.28)" stroke="#22d3ee" stroke-width="2.2"/>
    ${labelsHtml}
  `;

  if ($("radarLegendText")) {
    $("radarLegendText").innerHTML = `📊 <b>Chỉ số Sẵn sàng Săn Học bổng (Readiness Score): <span style="color:#22d3ee">${overallReadiness}/100</span></b> &nbsp;·&nbsp; <span style="color:#22d3ee">■ Hồ sơ của bạn</span> vs <span style="color:#fbbf24">┈ Chuẩn Học bổng Toàn phần</span>`;
  }
}

function refreshProfileInsights() {
  const p = getProfileFromForm();
  const { strengths, tips } = AgentsV2.analyzeProfileLocal(p);
  const box = $("profileInsights");
  if (box) {
    box.innerHTML = [
      ...strengths.map(s => `<span class="insight-pill">${esc(s)}</span>`),
      ...tips.map(t => `<span class="insight-pill tip">${esc(t)}</span>`),
    ].join("");
  }
  renderRadarSvg(p);
}

function updateKPIs() {
  if ($("kpiFound")) $("kpiFound").textContent = String(appState.extractedList.length);
  if ($("kpiVerified")) $("kpiVerified").textContent = String(appState.approvedList.length);
  if ($("kpiCost")) {
    $("kpiCost").textContent = metaStats.mode === "demo"
      ? "$0.0000 (Demo)"
      : `$${metaStats.estimatedCostUSD.toFixed(4)}`;
  }
}

function status(t) {
  if ($("stepStatus")) $("stepStatus").textContent = t;
}

function fail(msg) {
  const errEl = $("error");
  if (errEl) {
    errEl.textContent = "❌ " + msg;
    errEl.classList.remove("hidden");
  }
  Object.keys(fc ? fc.nodeEls : {}).forEach(id => {
    const g = fc.nodeEls[id];
    if (g && g.getAttribute("class").includes("running")) fc.setState(id, "failed");
  });
  $("hunt").disabled = false;
  if ($("huntDemo")) $("huntDemo").disabled = false;
}

// --- Khởi tạo API Key, QuotaGuard (5 lượt / IP & MAC) & Chiến lược Model ---
function refreshQuotaUI() {
  if (typeof QuotaGuard === "undefined") return;
  const st = QuotaGuard.getStatus();
  if ($("quotaIpText")) $("quotaIpText").textContent = st.ip;
  if ($("quotaMacText")) $("quotaMacText").textContent = st.mac;
  if ($("quotaTurnsText")) {
    $("quotaTurnsText").textContent = st.exhausted
      ? `Hết lượt miễn phí (Đã dùng ${st.used}/${st.maxTurns})`
      : `Còn ${st.remaining}/${st.maxTurns} lượt hỏi Live AI`;
    $("quotaTurnsText").classList.toggle("exhausted", st.exhausted);
  }
  if ($("quotaBarFill")) {
    const pct = Math.max(0, Math.min(100, Math.round((st.remaining / st.maxTurns) * 100)));
    $("quotaBarFill").style.width = `${pct}%`;
  }
}

function refreshKeyStatus() {
  const maskedKey = typeof CryptoVault !== "undefined" ? CryptoVault.hasStoredKey() : null;
  const strat = localStorage.getItem(STRAT_LS) || META_CONFIG.defaultStrategy;
  if ($("modelStrategy")) $("modelStrategy").value = strat;

  refreshQuotaUI();
  const qSt = typeof QuotaGuard !== "undefined" ? QuotaGuard.getStatus() : { remaining: 5, maxTurns: 5, exhausted: false };

  if (maskedKey) {
    $("apiKey").value = "";
    $("apiKey").placeholder = `🔐 Đã mã hóa AES-GCM 256-bit (${maskedKey})`;
    $("keyStatus").textContent = `✅ Đã lưu khóa API cá nhân dưới dạng mã hóa chuẩn quân sự AES-GCM 256-bit (${maskedKey}) — Không bao giờ lưu chữ rõ!`;
    if ($("keyBadge")) $("keyBadge").textContent = "🔐 AES-GCM Vault Active";
  } else if (!qSt.exhausted) {
    $("keyStatus").textContent = `🛡️ Zero-Exposure Active: Bạn còn ${qSt.remaining}/${qSt.maxTurns} lượt hỏi cho IP (${qSt.ip}) & Thiết bị MAC (${qSt.mac}).`;
    if ($("keyBadge")) $("keyBadge").textContent = `🛡️ Còn ${qSt.remaining}/${qSt.maxTurns} lượt`;
  } else {
    $("keyStatus").textContent = "⚠️ Đã dùng hết 5/5 lượt hỏi cho IP & MAC này. Hãy nhập API key cá nhân (sẽ được mã hóa AES-GCM) hoặc bấm '⚡ Chạy Demo Thực Tế (0 Credit)'.";
    if ($("keyBadge")) $("keyBadge").textContent = "🔴 Hết 5/5 lượt";
  }

  if (fc) fc.updateModelLabels(strat);
  if ($("activeStrategyBadge") && typeof ROUTING_STRATEGIES !== "undefined") {
    const sObj = ROUTING_STRATEGIES[strat] || ROUTING_STRATEGIES[META_CONFIG.defaultStrategy];
    $("activeStrategyBadge").textContent = sObj.name.split(":")[0];
  }
}

$("saveKey").onclick = async () => {
  const v = $("apiKey").value.trim();
  if (typeof CryptoVault !== "undefined") {
    await CryptoVault.saveEncryptedKey(v);
  }
  $("apiKey").value = "";
  refreshKeyStatus();
};

if ($("modelStrategy")) {
  $("modelStrategy").onchange = () => {
    const val = $("modelStrategy").value;
    localStorage.setItem(STRAT_LS, val);
    refreshKeyStatus();
  };
}

// Khởi tạo Đa ngôn ngữ (50 ngôn ngữ), Flowchart & QuotaGuard (xác định IP + MAC)
function initLanguageSelector() {
  if (typeof I18N === "undefined" || !$("langSelect")) return;
  const langs = I18N.getLanguages();
  $("langSelect").innerHTML = langs.map((l, idx) =>
    `<option value="${l.code}">${idx + 1}. ${l.flag} ${l.native} (${l.name})</option>`
  ).join("");
  I18N.init();
  $("langSelect").value = I18N.currentLang;
  $("langSelect").onchange = () => {
    I18N.setLanguage($("langSelect").value);
  };
}

initLanguageSelector();
fc = new Flowchart($("flowsvg"), $("flowlog"), $("agent-inspector"));
refreshKeyStatus();
refreshProfileInsights();
if (typeof QuotaGuard !== "undefined") {
  QuotaGuard.init().then(() => refreshKeyStatus());
}

// Gắn sự kiện thay đổi form để cập nhật Profile Insights
["level", "major", "gpa", "year", "english", "kind", "countries", "note"].forEach(id => {
  const el = $(id);
  if (el) el.addEventListener("input", refreshProfileInsights);
});

// Gắn sự kiện 4 nút Hồ sơ mẫu 1-Click
document.querySelectorAll("[data-preset]").forEach(btn => {
  btn.addEventListener("click", () => {
    const key = btn.dataset.preset;
    if (PROFILE_PRESETS[key]) {
      setProfileToForm(PROFILE_PRESETS[key]);
    }
  });
});

// --- Tiện ích AI Đọc CV / Bảng điểm tự động ---
if ($("cvFileInput")) {
  $("cvFileInput").addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    $("cvRawInput").value = text;
    $("cvStatus").textContent = `Đã tải file ${file.name} (${text.length} ký tự). Bấm nút AI Trích xuất để điền form.`;
  });
}

if ($("parseCvBtn")) {
  $("parseCvBtn").onclick = async () => {
    const raw = ($("cvRawInput")?.value || "").trim();
    if (!raw) {
      $("cvStatus").textContent = "⚠️ Hãy dán nội dung CV hoặc chọn file trước.";
      return;
    }
    $("parseCvBtn").disabled = true;
    $("cvStatus").textContent = "⏳ Agent Profile Analyzer đang bóc tách thông tin CV...";
    try {
      const vaultKey = typeof CryptoVault !== "undefined" ? await CryptoVault.unlockPersonalKey() : "";
      let apiKey = vaultKey || appState.activeSessionKey;
      if (!apiKey && typeof QuotaGuard !== "undefined") {
        const q = await QuotaGuard.consumeTurnAndGetKey();
        if (q.ok) {
          apiKey = q.apiKey;
          appState.activeSessionKey = q.apiKey;
          refreshKeyStatus();
        }
      }
      if (apiKey && apiKey !== "DEMO") {
        const parsed = await AgentsV2.parseCV(apiKey, raw);
        setProfileToForm(parsed);
      } else {
        // Bóc tách thông minh bằng Regex cục bộ nếu chưa nhập API key
        const gpaM = raw.match(/gpa\s*[:=-]?\s*([234]\.\d{1,2})/i);
        const ieltsM = raw.match(/(ielts\s*\d(?:\.\d)?|toefl\s*\d+|toeic\s*\d+|jlpt\s*n[1-5]|topik\s*[1-6])/i);
        setProfileToForm({
          gpa: gpaM ? gpaM[1] : $("gpa").value,
          english: ieltsM ? ieltsM[1].toUpperCase() : $("english").value,
          note: raw.slice(0, 110).replace(/\s+/g, " "),
        });
      }
      $("cvStatus").textContent = "✅ Đã trích xuất và cập nhật vào Hồ sơ của bạn!";
    } catch (e) {
      $("cvStatus").textContent = "❌ Lỗi trích xuất: " + e.message;
    } finally {
      $("parseCvBtn").disabled = false;
    }
  };
}

// --- LUỒNG CHẠY PIPELINE 10-NODE ĐA AGENT ---
async function executePipeline(forceDemo = false) {
  const errEl = $("error");
  if (errEl) {
    errEl.textContent = "";
    errEl.classList.add("hidden");
  }

  const p = getProfileFromForm();
  if (!p.major || !p.gpa) {
    fail("Vui lòng điền Ngành học và GPA trước khi chạy.");
    return;
  }

  const directInputKey = $("apiKey").value.trim();
  if (directInputKey && typeof CryptoVault !== "undefined") {
    await CryptoVault.saveEncryptedKey(directInputKey);
    $("apiKey").value = "";
    refreshKeyStatus();
  }
  const savedKey = typeof CryptoVault !== "undefined" ? await CryptoVault.unlockPersonalKey() : "";
  const strategyId = $("modelStrategy")?.value || META_CONFIG.defaultStrategy;
  let effectiveKey = "DEMO";
  let runMode = "demo";
  let quotaLogMsg = null;

  if (forceDemo) {
    effectiveKey = "DEMO";
    runMode = "demo";
  } else if (savedKey) {
    effectiveKey = savedKey;
    runMode = "live";
    appState.activeSessionKey = savedKey;
  } else if (typeof QuotaGuard !== "undefined") {
    const qRes = await QuotaGuard.consumeTurnAndGetKey();
    refreshKeyStatus();
    if (!qRes.ok) {
      fail(`${qRes.reason} Vui lòng dán Meta Model API key cá nhân ở mục 🔒 phía trên hoặc bấm nút "⚡ Chạy Demo Thực Tế (0 Credit)" để tiếp tục.`);
      return;
    }
    effectiveKey = qRes.apiKey;
    runMode = effectiveKey === "DEMO" ? "demo" : "sponsor";
    appState.activeSessionKey = qRes.apiKey;
    quotaLogMsg = `🛡️ QuotaGuard: Đã cấp phát lượt hỏi (#${qRes.status.used}/${qRes.status.maxTurns} — Còn lại: ${qRes.status.remaining} lượt) cho IP [${qRes.status.ip}] & Thiết bị MAC [${qRes.status.mac}].`;
  }

  appState.profile = p;
  appState.extractedList = [];
  appState.approvedList = [];
  appState.rejectedList = [];
  appState.rankedList = [];
  appState.letterCache = {};
  appState.selectedCompare.clear();
  updateCompareButton();

  $("hunt").disabled = true;
  if ($("huntDemo")) $("huntDemo").disabled = true;

  metaStats.reset(runMode, strategyId);
  fc.reset();
  fc.updateModelLabels(strategyId);
  updateKPIs();

  ["pipeline-card", "results-card", "letter-card"].forEach(id => $(id).classList.remove("hidden"));
  $("results").innerHTML = `<p class="hint">⏳ Hệ đa agent đang truy tìm và kiểm chứng học bổng...</p>`;
  $("letter").textContent = "Đang chờ kết quả xếp hạng từ Matcher Agent...";

  const ctl = new AbortController();

  try {
    // 0) PROFILE ANALYZER
    fc.setState("profile", "running");
    const { strengths } = AgentsV2.analyzeProfileLocal(p);
    fc.setState("profile", "done");
    fc.log(`👤 Profile Analyzer: Chuẩn hóa hồ sơ (${p.level} · ${p.major} · GPA ${p.gpa} · ${p.english}). Phát hiện ${strengths.length} lợi thế cạnh tranh.`);
    if (quotaLogMsg) {
      fc.log(quotaLogMsg);
    } else if (effectiveKey === "DEMO") {
      fc.log("⚡ Đang chạy ở Chế độ Demo Mô phỏng Thực tế (Không tiêu tốn lượt hỏi Quota IP/MAC).");
    }

    // 1) SUPERVISOR — Chia 3 hướng tìm kiếm theo hồ sơ (Muse Wonder 1.0)
    fc.setState("supervisor", "running");
    const supModel = metaStats.resolveModelForNode("supervisor");
    fc.log(`🧠 Supervisor [${supModel}]: Phân tích hồ sơ & lập kế hoạch 3 mũi nhọn tìm kiếm…`);
    status(`Supervisor (${supModel}) — đang lên kế hoạch 3 hướng tìm kiếm…`);
    const lanes = await AgentsV2.supervise(effectiveKey, p, ctl.signal);
    lanes.forEach((l, i) => fc.setLabel(["r1", "r2", "r3"][i], l.title));
    fc.setState("supervisor", "done");
    fc.log(`🧠 Supervisor: Chốt chiến lược → ${lanes.map(l => l.title).join(" | ")}`);
    updateKPIs();

    // 2) FAN-OUT — 3 Researchers chạy song song (Muse Spark 1.3 + Web Search Grounding)
    const rModel = metaStats.resolveModelForNode("r1");
    status(`3 Researchers (${rModel} + Web Search) — đang tìm kiếm song song…`);
    const lanePromises = lanes.map(async (lane, i) => {
      const nid = ["r1", "r2", "r3"][i];
      fc.setState(nid, "running");
      fc.log(`🔎 ${lane.title} [${rModel}]: Bắt đầu quét dữ liệu (web_search grounding)…`);
      try {
        const text = await AgentsV2.researchLane(effectiveKey, p, lane, ctl.signal);
        fc.setState(nid, "done");
        fc.log(`🔎 ${lane.title}: Hoàn tất (~${(text.length / 1000).toFixed(1)}k ký tự).`);
        updateKPIs();
        return { lane, ok: true, text };
      } catch (e) {
        fc.setState(nid, "failed");
        fc.log(`🔎 ${lane.title}: LỖI — ${e.message}`);
        return { lane, ok: false, text: "" };
      }
    });

    const laneResults = await Promise.all(lanePromises);
    if (!laneResults.some(r => r.ok)) {
      throw new Error("Cả 3 Researcher đều gặp lỗi kết nối — hãy kiểm tra API key hoặc bấm '⚡ Chạy Demo Thực Tế'.");
    }

    // 3) FAN-IN MERGE — Gộp + khử trùng bằng thuật toán (0 Token)
    fc.setState("merge", "running");
    status("Merge Engine — đang hợp nhất kết quả 3 luồng…");
    const { merged, okCount, urlCount } = AgentsV2.mergeLanes(laneResults);
    fc.setState("merge", "done");
    fc.log(`🔀 Fan-in Merge: Đã gộp ${okCount}/3 luồng (${urlCount} URL nguồn) bằng thuật toán (0 token AI).`);

    // 4) EXTRACTOR — Bóc tách cấu trúc JSON
    const extModel = metaStats.resolveModelForNode("extractor");
    fc.setState("extractor", "running");
    status(`Extractor (${extModel}) — đang bóc tách cấu trúc JSON & khử trùng…`);
    fc.log(`🧾 Extractor [${extModel}]: Bóc tách tên, tổ chức, hạn nộp, giá trị, điều kiện & URL…`);
    const list = await AgentsV2.extract(effectiveKey, merged, ctl.signal);
    if (!list.length) throw new Error("Không trích xuất được học bổng nào — vui lòng thử lại.");
    appState.extractedList = list;
    fc.setState("extractor", "done");
    fc.log(`🧾 Extractor: Trích xuất thành công ${list.length} học bổng độc lập.`);
    updateKPIs();

    // 5) TRIPLE-VERIFY CRITIC — Kiểm chứng độc lập 3 tầng (Muse Wonder 1.0 + VerifierEngine)
    const critModel = metaStats.resolveModelForNode("critic");
    fc.setState("critic", "running");
    status(`Triple-Verify Critic (${critModel}) — đang kiểm định tên miền, hạn nộp & độ tin cậy…`);
    fc.log(`🛡️ Critic [${critModel} + VerifierEngine]: Kiểm chứng độc lập 3 tầng (URL Domain · Hạn nộp 2026–2027 · Chống ảo giác)…`);
    const { approved, rejected } = await AgentsV2.critic(effectiveKey, p, list, ctl.signal);
    appState.approvedList = approved;
    appState.rejectedList = rejected;
    fc.setState("critic", "done");
    updateKPIs();

    if (rejected.length) {
      fc.log(`🛡️ Critic: ĐÃ LOẠI ${rejected.length} tin không đạt chuẩn → ` +
        rejected.map(r => `${r.name} (${r.rejectReason})`).join(" | "));
    } else {
      fc.log(`🛡️ Critic: Toàn bộ ${approved.length} học bổng đều vượt qua Kiểm chứng 3 Tầng.`);
    }

    const pool = approved.length ? approved : list;

    // 6) MULTI-CRITERIA MATCHER — Chấm 0–100 + 4 Sub-scores
    const matchModel = metaStats.resolveModelForNode("matcher");
    fc.setState("matcher", "running");
    status(`Matcher (${matchModel}) — đang chấm điểm đa tiêu chí (Ngành, GPA, Ngoại ngữ, Khu vực)…`);
    fc.log(`📊 Multi-Matcher [${matchModel}]: Chấm điểm 0–100 và phân tích 4 tiêu chí thành phần…`);
    const ranked = await AgentsV2.rank(effectiveKey, p, pool, ctl.signal);
    appState.rankedList = ranked;
    fc.setState("matcher", "done");
    fc.log(`📊 Matcher: Top 1 = ${ranked[0] ? `${ranked[0].name} (${ranked[0].score}/100 điểm · Tin cậy ${ranked[0].verification?.trustScore || 90}%)` : "N/A"}.`);
    updateKPIs();

    populateTargetScholarshipDropdown(ranked);
    renderFilteredResults();

    // 7) STRATEGIC DRAFTER — Soạn dàn ý Motivation Letter, Lộ trình & Phỏng vấn cho Top 1
    const draftModel = metaStats.resolveModelForNode("drafter");
    fc.setState("drafter", "running");
    status(`Strategic Drafter (${draftModel}) — đang soạn dàn ý Motivation Letter & Checklist cho Top 1…`);
    fc.log(`✍️ Drafter [${draftModel}]: Soạn bộ hồ sơ chiến lược cho "${ranked[0].name}"…`);
    await generateStudioForScholarship(0, effectiveKey, ctl.signal);
    fc.setState("drafter", "done");

    fc.setState("done", "done");
    fc.log("✅ Hoàn tất toàn bộ pipeline 10-Node Đa Agent! Bấm vào bất kỳ Node nào trên sơ đồ để xem Telemetry.");
    status("✅ Hoàn tất! " + usageHint());
    updateKPIs();
  } catch (e) {
    fail(e.message || String(e));
  } finally {
    $("hunt").disabled = false;
    if ($("huntDemo")) $("huntDemo").disabled = false;
  }
}

$("hunt").onclick = () => executePipeline(false);
if ($("huntDemo")) {
  $("huntDemo").onclick = () => executePipeline(true);
}

// --- HIỂN THỊ KẾT QUẢ, BỘ LỌC, SẮP XẾP & SO SÁNH ---
function getFilteredAndSortedScholarships() {
  const q = ($("searchFilter")?.value || "").trim().toLowerCase();
  const tier = $("tierFilter")?.value || "all";
  const sortBy = $("sortBy")?.value || "score";

  let items = [...appState.rankedList];

  if (q) {
    items = items.filter(s =>
      `${s.name} ${s.org} ${s.country} ${s.conditions} ${s.value}`.toLowerCase().includes(q)
    );
  }

  if (tier === "official") {
    items = items.filter(s => s.verification?.urlTier === "official");
  } else if (tier === "open") {
    items = items.filter(s => ["open", "urgent"].includes(s.verification?.deadlineStatus));
  } else if (tier === "saved") {
    items = items.filter(s => appState.savedKeys.has(normalizeNameKey(s.name)));
  }

  if (sortBy === "trust") {
    items.sort((a, b) => (b.verification?.trustScore || 0) - (a.verification?.trustScore || 0));
  } else if (sortBy === "deadline") {
    items.sort((a, b) => {
      const da = a.verification?.daysLeft ?? 9999;
      const db = b.verification?.daysLeft ?? 9999;
      return da - db;
    });
  } else {
    items.sort((a, b) => (b.score || 0) - (a.score || 0));
  }

  return items;
}

function renderFilteredResults() {
  const items = getFilteredAndSortedScholarships();
  const rejected = appState.rejectedList || [];

  if ($("resultsSummaryCount")) {
    $("resultsSummaryCount").textContent = `— Hiển thị ${items.length}/${appState.rankedList.length} học bổng đạt chuẩn (${rejected.length} tin bị Critic loại)`;
  }

  let html = items.map((s, i) => {
    const key = normalizeNameKey(s.name);
    const isSaved = appState.savedKeys.has(key);
    const isCompared = appState.selectedCompare.has(key);
    const v = s.verification || {};
    const sub = s.subScores || { major: s.score || 85, gpa: s.score || 82, english: s.score || 84, country: s.score || 80 };
    const origIdx = appState.rankedList.findIndex(x => normalizeNameKey(x.name) === key);

    return `
    <div class="sch" data-key="${esc(key)}">
      <div class="sch-top">
        <h3>#${i + 1} ${esc(s.name)}</h3>
        <div class="sch-scores-badges">
          <span class="score">🎯 Phù hợp: ${s.score ?? "?"}/100</span>
          <span class="trust-badge" title="Điểm Tin Cậy từ Giao thức Kiểm chứng 3 Tầng">🛡️ Tin cậy: ${v.trustScore ?? 85}%</span>
        </div>
      </div>

      <div class="meta">
        <span class="tag">🏢 ${esc(s.org || "Tổ chức cấp")}</span>
        <span class="tag">🌍 ${esc(s.country || "Quốc tế")}</span>
        <span class="tag">${esc(v.deadlineBadge || "⏰ " + (s.deadline || "Xem trên web"))}</span>
        ${s.value ? `<span class="tag">💰 ${esc(s.value)}</span>` : ""}
      </div>

      <!-- Biểu đồ 4 chỉ số thành phần (Multi-Criteria Sub-scores) -->
      <div class="subscore-grid">
        <div class="sub-item">
          <span>Ngành học: <b>${sub.major}%</b></span>
          <div class="sub-bar-track"><div class="sub-bar-fill" style="width:${sub.major}%"></div></div>
        </div>
        <div class="sub-item">
          <span>GPA: <b>${sub.gpa}%</b></span>
          <div class="sub-bar-track"><div class="sub-bar-fill" style="width:${sub.gpa}%"></div></div>
        </div>
        <div class="sub-item">
          <span>Ngoại ngữ: <b>${sub.english}%</b></span>
          <div class="sub-bar-track"><div class="sub-bar-fill" style="width:${sub.english}%"></div></div>
        </div>
        <div class="sub-item">
          <span>Khu vực & Loại HB: <b>${sub.country}%</b></span>
          <div class="sub-bar-track"><div class="sub-bar-fill" style="width:${sub.country}%"></div></div>
        </div>
      </div>

      ${s.reason ? `<p><b>💡 Phân tích độ khớp:</b> ${esc(s.reason)}</p>` : ""}
      ${s.conditions ? `<p><b>📋 Điều kiện chính:</b> ${esc(s.conditions)}</p>` : ""}

      <!-- Hộp Kiểm chứng 3 Tầng (Triple-Verification Box) -->
      <div class="verify-box">
        <div class="verify-tags">
          <span class="v-pill ok">${esc(v.urlBadge || "🌐 Đã kiểm tra URL")}</span>
          ${(v.eligMatches || []).map(m => `<span class="v-pill ok">✓ ${esc(m)}</span>`).join("")}
          ${(v.eligWarnings || []).map(w => `<span class="v-pill warn">⚠️ ${esc(w)}</span>`).join("")}
        </div>
        <div><b>🛡️ Nhận định Critic Agent:</b> ${esc(v.criticNote || "Học bổng hợp lệ.")}</div>
      </div>

      <div class="sch-actions">
        <button type="button" class="sm-btn" onclick="selectScholarshipForStudio(${origIdx})">✍️ Soạn Thư &amp; Checklist</button>
        <button type="button" class="sm-btn" onclick="toggleCompare('${esc(key)}')">${isCompared ? "✅ Đang so sánh" : "⚖️ Chọn so sánh"}</button>
        <button type="button" class="sm-btn" onclick="toggleSaveScholarship('${esc(key)}')">${isSaved ? "⭐ Đã lưu" : "☆ Lưu yêu thích"}</button>
        ${s.link ? `<a class="sm-btn" href="${esc(s.link)}" target="_blank" rel="noopener">🔗 Cổng chính thức (${esc(v.domain || "Mở link")}) ↗</a>` : ""}
      </div>
    </div>`;
  }).join("");

  if (!items.length && appState.rankedList.length) {
    html = `<p class="hint">Không có học bổng nào khớp với bộ lọc hiện tại. Hãy thử đổi từ khóa hoặc chọn "Tất cả nguồn đã duyệt".</p>`;
  }

  if (rejected.length) {
    html += `
      <details class="critic-rejected" open>
        <summary>🛡️ Báo cáo Kiểm định: ${rejected.length} học bổng đã bị Critic Agent &amp; VerifierEngine loại bỏ (Bấm để ẩn/hiện)</summary>
        ${rejected.map(r => `
          <p style="margin:8px 0">
            <b>🚫 ${esc(r.name)}</b> (${esc(r.org || "Nguồn chưa xác thực")})<br>
            <span style="color:#fcd34d">→ Lý do loại: ${esc(r.rejectReason || "Không đạt tiêu chuẩn kiểm chứng 3 tầng")}</span>
          </p>
        `).join("")}
      </details>`;
  }

  $("results").innerHTML = html;
}

["searchFilter", "tierFilter", "sortBy"].forEach(id => {
  const el = $(id);
  if (el) el.addEventListener("input", renderFilteredResults);
});

// --- LƯU YÊU THÍCH & SO SÁNH HỌC BỔNG ---
window.toggleSaveScholarship = function (key) {
  if (appState.savedKeys.has(key)) appState.savedKeys.delete(key);
  else appState.savedKeys.add(key);
  localStorage.setItem(SAVED_LS, JSON.stringify([...appState.savedKeys]));
  renderFilteredResults();
};

function updateCompareButton() {
  if ($("compareCount")) $("compareCount").textContent = String(appState.selectedCompare.size);
}

window.toggleCompare = function (key) {
  if (appState.selectedCompare.has(key)) {
    appState.selectedCompare.delete(key);
  } else {
    if (appState.selectedCompare.size >= 4) {
      alert("Bạn có thể chọn tối đa 4 học bổng cùng lúc để bảng so sánh hiển thị đẹp nhất.");
      return;
    }
    appState.selectedCompare.add(key);
  }
  updateCompareButton();
  renderComparePanel();
  renderFilteredResults();
};

function renderComparePanel() {
  const panel = $("compare-panel");
  if (!panel) return;
  if (appState.selectedCompare.size === 0) {
    panel.classList.add("hidden");
    return;
  }

  const selectedItems = appState.rankedList.filter(s =>
    appState.selectedCompare.has(normalizeNameKey(s.name))
  );

  panel.classList.remove("hidden");
  panel.innerHTML = `
    <div class="card-head-row" style="margin-bottom:10px">
      <strong>⚖️ Bàn Cân So Sánh Học Bổng Trực Tiếp (${selectedItems.length} chương trình)</strong>
      <button type="button" class="sm-btn" onclick="clearCompare()">✕ Đóng bảng so sánh</button>
    </div>
    <table class="compare-table">
      <thead>
        <tr>
          <th>Tiêu chí</th>
          ${selectedItems.map(s => `<th>${esc(s.name)}</th>`).join("")}
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><b>🎯 Điểm Phù Hợp</b></td>
          ${selectedItems.map(s => `<td><b style="color:#34d399">${s.score}/100</b></td>`).join("")}
        </tr>
        <tr>
          <td><b>🛡️ Độ Tin Cậy (Trust)</b></td>
          ${selectedItems.map(s => `<td>${s.verification?.trustScore || 85}% (${esc(s.verification?.urlBadge || "")})</td>`).join("")}
        </tr>
        <tr>
          <td><b>🌍 Quốc gia / Tổ chức</b></td>
          ${selectedItems.map(s => `<td>${esc(s.country)} — ${esc(s.org)}</td>`).join("")}
        </tr>
        <tr>
          <td><b>💰 Giá trị tài trợ</b></td>
          ${selectedItems.map(s => `<td>${esc(s.value)}</td>`).join("")}
        </tr>
        <tr>
          <td><b>⏰ Hạn nộp</b></td>
          ${selectedItems.map(s => `<td>${esc(s.deadline)}</td>`).join("")}
        </tr>
        <tr>
          <td><b>📋 Điều kiện chính</b></td>
          ${selectedItems.map(s => `<td>${esc(s.conditions)}</td>`).join("")}
        </tr>
      </tbody>
    </table>
  `;
}

window.clearCompare = function () {
  appState.selectedCompare.clear();
  updateCompareButton();
  renderComparePanel();
  renderFilteredResults();
};

if ($("openCompareBtn")) {
  $("openCompareBtn").onclick = () => {
    if (appState.selectedCompare.size === 0 && appState.rankedList.length >= 2) {
      // Tự động chọn Top 3 học bổng đầu tiên nếu người dùng bấm nút So sánh ngay
      appState.rankedList.slice(0, 3).forEach(s => appState.selectedCompare.add(normalizeNameKey(s.name)));
      updateCompareButton();
      renderComparePanel();
      renderFilteredResults();
    } else {
      const panel = $("compare-panel");
      if (panel) panel.classList.toggle("hidden");
    }
  };
}

// --- AI APPLICATION STUDIO (DÀN Ý THƯ + INTERACTIVE CHECKLIST CHO MỌI HỌC BỔNG) ---
function populateTargetScholarshipDropdown(ranked) {
  const sel = $("targetScholarshipSelect");
  if (!sel) return;
  sel.innerHTML = ranked.map((s, idx) =>
    `<option value="${idx}">#${idx + 1} (${s.score}đ) ${esc(s.name)}</option>`
  ).join("");
  sel.value = "0";
}

async function generateStudioForScholarship(idx, apiKeyOverride, signal) {
  const target = appState.rankedList[idx];
  if (!target) return;
  appState.currentTargetIdx = idx;

  if ($("targetScholarshipSelect")) $("targetScholarshipSelect").value = String(idx);
  $("letterFor").textContent = `— Đang chọn: #${idx + 1} ${target.name}`;

  // Cập nhật Checklist tương tác & Bộ câu hỏi phỏng vấn ngay lập tức
  renderInteractiveChecklist(target);
  populateInterviewQuestions(target);

  const key = normalizeNameKey(target.name);
  if (appState.letterCache[key]) {
    $("letter").textContent = appState.letterCache[key];
    return;
  }

  $("letter").textContent = `⏳ Drafter Agent đang biên soạn Motivation Letter Outline, Lộ trình nộp đơn & Câu hỏi phỏng vấn riêng cho "${target.name}"...`;
  const vaultKey = typeof CryptoVault !== "undefined" ? await CryptoVault.unlockPersonalKey() : "";
  const effectiveKey = apiKeyOverride || vaultKey || appState.activeSessionKey || "DEMO";
  const letterText = await AgentsV2.draftLetter(effectiveKey, appState.profile || getProfileFromForm(), target, signal);
  appState.letterCache[key] = letterText;
  $("letter").textContent = letterText;
}

window.selectScholarshipForStudio = async function (idx) {
  if (idx < 0 || idx >= appState.rankedList.length) return;
  $("letter-card").scrollIntoView({ behavior: "smooth", block: "start" });
  try {
    await generateStudioForScholarship(idx);
  } catch (e) {
    $("letter").textContent = "❌ Lỗi khi soạn dàn ý: " + e.message;
  }
};

if ($("regenerateLetterBtn")) {
  $("regenerateLetterBtn").onclick = () => {
    const idx = parseInt($("targetScholarshipSelect")?.value || "0", 10);
    window.selectScholarshipForStudio(idx);
  };
}

if ($("targetScholarshipSelect")) {
  $("targetScholarshipSelect").onchange = () => {
    const idx = parseInt($("targetScholarshipSelect").value || "0", 10);
    window.selectScholarshipForStudio(idx);
  };
}

function renderInteractiveChecklist(target) {
  const box = $("checklistBox");
  if (!box) return;
  const p = appState.profile || getProfileFromForm();
  const sKey = normalizeNameKey(target.name);
  const items = AgentsV2.buildInteractiveChecklist(p, target);
  const savedMap = appState.checklistState[sKey] || {};

  let doneCount = 0;
  box.innerHTML = items.map(item => {
    const checked = !!savedMap[item.id];
    if (checked) doneCount++;
    return `
      <label class="chk-row ${checked ? "checked" : ""}">
        <input type="checkbox" data-chk-id="${esc(item.id)}" ${checked ? "checked" : ""}>
        <span class="badge-pill">${esc(item.category)}</span>
        <span style="flex:1">${esc(item.label)}</span>
      </label>
    `;
  }).join("");

  if ($("chkProgressText")) {
    $("chkProgressText").textContent = `${doneCount}/${items.length}`;
  }

  box.querySelectorAll("input[type='checkbox']").forEach(inp => {
    inp.addEventListener("change", () => {
      const cid = inp.dataset.chkId;
      if (!appState.checklistState[sKey]) appState.checklistState[sKey] = {};
      appState.checklistState[sKey][cid] = inp.checked;
      localStorage.setItem(CHK_LS, JSON.stringify(appState.checklistState));
      renderInteractiveChecklist(target);
    });
  });
}

// Chuyển đổi 4 Tab trong AI Application Studio
document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    const targetTab = btn.dataset.tab;
    ["tab-letter", "tab-checklist", "tab-interview", "tab-essay"].forEach(tid => {
      const pane = $(tid);
      if (pane) pane.classList.toggle("hidden", tid !== targetTab);
    });
  });
});

// --- AGENT #11: PHÒNG PHỎNG VẤN AI GIẢ LẬP + THU ÂM GIỌNG NÓI ---
function populateInterviewQuestions(target) {
  const sel = $("interviewQuestionSelect");
  if (!sel || typeof AgentsV2.getInterviewQuestionsForTarget !== "function") return;
  const qs = AgentsV2.getInterviewQuestionsForTarget(target);
  sel.innerHTML = qs.map((q, i) => `<option value="${esc(q)}">${esc(q)}</option>`).join("");
}

if ($("sampleInterviewBtn")) {
  $("sampleInterviewBtn").onclick = () => {
    const p = appState.profile || getProfileFromForm();
    $("interviewUserAnswer").value =
      `I am applying for this scholarship because it aligns closely with my academic background in ${p.major} (GPA ${p.gpa}/4.0). During my university studies, I led a research project where we solved key technical challenges and won a student research award. After graduating, I plan to return to Vietnam to apply these advanced methodologies to local industry and education.`;
  };
}

if ($("voiceRecordBtn")) {
  $("voiceRecordBtn").onclick = () => {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) {
      alert("Trình duyệt hiện tại không hỗ trợ Web Speech API trực tiếp. Bạn có thể gõ câu trả lời hoặc bấm '💡 Điền câu trả lời thử nghiệm'.");
      return;
    }
    const rec = new SpeechRec();
    rec.lang = I18N.currentLang === "vi" ? "vi-VN" : "en-US";
    rec.interimResults = false;
    $("voiceRecordBtn").textContent = "🔴 Đang nghe... Hãy nói vào Mic";
    rec.onresult = (e) => {
      const transcript = e.results?.[0]?.[0]?.transcript || "";
      const cur = $("interviewUserAnswer").value.trim();
      $("interviewUserAnswer").value = cur ? `${cur} ${transcript}` : transcript;
    };
    rec.onerror = () => {
      $("voiceRecordBtn").textContent = "🎤 Trả lời bằng Giọng nói (Mic)";
    };
    rec.onend = () => {
      $("voiceRecordBtn").textContent = "🎤 Trả lời bằng Giọng nói (Mic)";
    };
    rec.start();
  };
}

if ($("evalInterviewBtn")) {
  $("evalInterviewBtn").onclick = async () => {
    const ans = ($("interviewUserAnswer")?.value || "").trim();
    if (!ans) {
      $("interviewFeedbackBox").textContent = "⚠️ Hãy nhập câu trả lời phỏng vấn hoặc bấm '💡 Điền câu trả lời thử nghiệm' trước khi chấm điểm.";
      return;
    }
    const target = appState.rankedList[appState.currentTargetIdx] || CURATED_SCHOLARSHIPS_2026_2027[0];
    const question = $("interviewQuestionSelect")?.value || "Why did you choose this scholarship program?";
    $("evalInterviewBtn").disabled = true;
    $("interviewFeedbackBox").textContent = "⏳ Giám khảo AI (Agent #11 · Muse Wonder 1.0) đang phân tích và chấm điểm câu trả lời của bạn theo phương pháp STAR...";
    try {
      const vaultKey = typeof CryptoVault !== "undefined" ? await CryptoVault.unlockPersonalKey() : "";
      const effectiveKey = vaultKey || appState.activeSessionKey || "DEMO";
      const feedback = await AgentsV2.evaluateInterviewAnswer(
        effectiveKey,
        appState.profile || getProfileFromForm(),
        target,
        question,
        ans
      );
      $("interviewFeedbackBox").textContent = feedback;
    } catch (e) {
      $("interviewFeedbackBox").textContent = "❌ Lỗi khi chấm điểm phỏng vấn: " + e.message;
    } finally {
      $("evalInterviewBtn").disabled = false;
    }
  };
}

// --- AGENT #12: CHUYÊN GIA PHẢN BIỆN & NÂNG CẤP BÀI LUẬN (ESSAY CRITIC) ---
if ($("sampleEssayBtn")) {
  $("sampleEssayBtn").onclick = () => {
    const p = appState.profile || getProfileFromForm();
    $("essayDraftInput").value =
      `Dear Selection Committee,\nSince I was a child, I have always been passionate about ${p.major}. Throughout my undergraduate studies, I worked very hard and achieved a GPA of ${p.gpa}/4.0 with ${p.english}. I also participated in student research and won an award. I want to apply for this scholarship because your university is very famous and will help me have a good career in the future. After finishing my degree, I will come back to Vietnam to help my country develop.`;
  };
}

if ($("reviewEssayBtn")) {
  $("reviewEssayBtn").onclick = async () => {
    const draft = ($("essayDraftInput")?.value || "").trim();
    if (!draft) {
      $("essayReviewBox").textContent = "⚠️ Hãy dán bản nháp bài luận hoặc bấm '📄 Nạp đoạn bài luận mẫu để thử' trước khi phân tích.";
      return;
    }
    const target = appState.rankedList[appState.currentTargetIdx] || CURATED_SCHOLARSHIPS_2026_2027[0];
    $("reviewEssayBtn").disabled = true;
    $("essayReviewBox").textContent = "⏳ Chuyên gia Phản biện Bài luận (Agent #12 · Muse Wonder 1.0) đang chấm điểm 4 tiêu chí, kiểm tra lỗi sáo rỗng (Cliché Check) và viết lại bản nâng cấp...";
    try {
      const vaultKey = typeof CryptoVault !== "undefined" ? await CryptoVault.unlockPersonalKey() : "";
      const effectiveKey = vaultKey || appState.activeSessionKey || "DEMO";
      const review = await AgentsV2.reviewEssayDraft(
        effectiveKey,
        appState.profile || getProfileFromForm(),
        target,
        draft
      );
      $("essayReviewBox").textContent = review;
    } catch (e) {
      $("essayReviewBox").textContent = "❌ Lỗi khi phản biện bài luận: " + e.message;
    } finally {
      $("reviewEssayBtn").disabled = false;
    }
  };
}

// --- CHUYỂN ĐỔI GIAO DIỆN SÁNG/TỐI, IN PDF & XUẤT LỊCH .ICS (RFC 5545) ---
if ($("themeToggleBtn")) {
  $("themeToggleBtn").onclick = () => {
    document.body.classList.toggle("light-theme");
  };
}

if ($("printPdfBtn")) {
  $("printPdfBtn").onclick = () => {
    window.print();
  };
}

if ($("exportIcs")) {
  $("exportIcs").onclick = () => {
    const list = appState.rankedList.length ? appState.rankedList : CURATED_SCHOLARSHIPS_2026_2027.slice(0, 5);
    const nowStamp = "20261104T090000Z";
    const events = list.map((s, idx) => {
      const dmy = String(s.deadline || "").match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](202\d)/);
      const dtStr = dmy
        ? `${dmy[3]}${String(dmy[2]).padStart(2, "0")}${String(dmy[1]).padStart(2, "0")}`
        : `202701${String(15 + (idx % 12)).padStart(2, "0")}`;
      const cleanDesc = `To chuc: ${s.org} (${s.country})\\nGia tri: ${s.value}\\nDieu kien: ${s.conditions}\\nLink: ${s.link || ""}`.replace(/[\r\n]+/g, "\\n");
      return [
        "BEGIN:VEVENT",
        `UID:hbh-v4-${idx}-${Date.now()}@hocbonghunter.ai`,
        `DTSTAMP:${nowStamp}`,
        `DTSTART;VALUE=DATE:${dtStr}`,
        `SUMMARY:🎓 Hạn nộp: ${s.name} (${s.score || 90}/100đ)`,
        `DESCRIPTION:${cleanDesc}`,
        `URL:${s.link || "https://minhtritm.github.io/hocbong-hunter/"}`,
        "BEGIN:VALARM",
        "TRIGGER:-P14D",
        "ACTION:DISPLAY",
        "DESCRIPTION:Nhắc nhở trước 14 ngày hạn nộp học bổng",
        "END:VALARM",
        "END:VEVENT",
      ].join("\r\n");
    });

    const icsContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Hoc Bong Hunter v4.0//Multi-Agent Scholarship Calendar//VI",
      "CALSCALE:GREGORIAN",
      ...events,
      "END:VCALENDAR",
    ].join("\r\n");

    triggerDownload("Lich-San-Hoc-Bong-2026-2027.ics", icsContent, "text/calendar;charset=utf-8");
  };
}

// --- COPY & XUẤT BÁO CÁO ĐA ĐỊNH DẠNG (JSON, CSV, MARKDOWN) ---
$("copyLetter").onclick = async () => {
  try {
    await navigator.clipboard.writeText($("letter").textContent);
    $("copyLetter").textContent = "✅ Đã copy vào Clipboard!";
  } catch {
    $("copyLetter").textContent = "Hãy bôi đen và bấm Ctrl+C.";
  }
  setTimeout(() => ($("copyLetter").textContent = "📋 Copy toàn bộ dàn ý"), 2200);
};

function triggerDownload(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

if ($("downloadLetterMd")) {
  $("downloadLetterMd").onclick = () => {
    const target = appState.rankedList[appState.currentTargetIdx] || { name: "Scholarship" };
    const md = `# Hồ Sơ Chiến Lược & Dàn Ý Motivation Letter\n**Học bổng mục tiêu:** ${target.name}\n\n${$("letter").textContent}\n`;
    triggerDownload("Motivation-Letter-Plan.md", md, "text/markdown;charset=utf-8");
  };
}

if ($("exportJson")) {
  $("exportJson").onclick = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      telemetry: {
        calls: metaStats.calls,
        webSearches: metaStats.webSearches,
        inputTokens: metaStats.inputTokens,
        outputTokens: metaStats.outputTokens,
        estimatedCostUSD: metaStats.estimatedCostUSD,
        strategy: metaStats.strategyId,
      },
      profile: appState.profile || getProfileFromForm(),
      approvedScholarships: appState.rankedList,
      rejectedByCritic: appState.rejectedList,
    };
    triggerDownload("hocbong-hunter-v3-report.json", JSON.stringify(payload, null, 2), "application/json;charset=utf-8");
  };
}

if ($("exportCsv")) {
  $("exportCsv").onclick = () => {
    const headers = ["Hạng", "Tên Học Bổng", "Tổ Chức", "Quốc Gia", "Điểm Phù Hợp", "Độ Tin Cậy (%)", "Hạn Nộp", "Giá Trị", "Điều Kiện", "Link Chính Thức"];
    const rows = appState.rankedList.map((s, i) => [
      i + 1,
      s.name,
      s.org,
      s.country,
      s.score,
      s.verification?.trustScore || 85,
      s.deadline,
      s.value,
      s.conditions,
      s.link,
    ].map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","));
    // Thêm UTF-8 BOM (\uFEFF) để mở trực tiếp bằng Microsoft Excel không bị lỗi font tiếng Việt
    const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\r\n");
    triggerDownload("hocbong-hunter-v3-excel.csv", csvContent, "text/csv;charset=utf-8");
  };
}

if ($("exportMd")) {
  $("exportMd").onclick = () => {
    const p = appState.profile || getProfileFromForm();
    const lines = [
      `# 🎯 BÁO CÁO SĂN HỌC BỔNG ĐA AGENT — HỌC BỔNG HUNTER v3.0`,
      `- **Ngày trích xuất:** ${META_CONFIG.todayStr}`,
      `- **Hồ sơ ứng viên:** ${profileText(p)}`,
      `- **Thống kê Telemetry:** ${usageHint()}`,
      ``,
      `## 🏆 Danh sách Học bổng Đã Kiểm chứng & Xếp hạng (${appState.rankedList.length})`,
      ``,
      ...appState.rankedList.map((s, i) => [
        `### #${i + 1}. ${s.name} (Phù hợp: ${s.score}/100 · Tin cậy: ${s.verification?.trustScore || 85}%)`,
        `- **Tổ chức:** ${s.org} (${s.country})`,
        `- **Giá trị:** ${s.value}`,
        `- **Hạn nộp:** ${s.deadline} (${s.verification?.deadlineBadge || ""})`,
        `- **Điều kiện:** ${s.conditions}`,
        `- **Phân tích độ khớp:** ${s.reason || ""}`,
        `- **Kiểm chứng Critic:** ${s.verification?.urlBadge || ""} — ${s.verification?.criticNote || ""}`,
        `- **Link gốc:** ${s.link || "Chưa rõ"}`,
        ``
      ].join("\n")),
      `## ✍️ Dàn ý Motivation Letter & Chiến lược Ứng tuyển`,
      ``,
      $("letter").textContent || "",
    ];
    triggerDownload("Bao-Cao-Hoc-Bong-Hunter-v3.md", lines.join("\n"), "text/markdown;charset=utf-8");
  };
}

// --- TRÌNH THUYẾT TRÌNH TỰ ĐỘNG 3 PHÚT (AUTO-PITCH TTS + SUBTITLES + AUTO UI CHOREOGRAPHY) ---
const PITCH_MANIFEST = {
  totalDuration: 173.93,
  audioSrc: "demo_voiceover/hocbong_hunter_3min_pitch_full.mp3",
  segments: [
    {
      index: 1,
      id: "01_intro_apology",
      title: "🎬 [1/6] Intro & Polite Apology for Using TTS",
      action: "intro",
      startTime: 0.0,
      endTime: 30.53,
      text: "Hello Meta and Cerebral Valley judges! My name is Doan Minh Tri, an indie developer from Vietnam. First, please accept my sincere apologies: because my spoken English is not very fluent yet, I kindly ask for your permission to use AI Text-to-Speech so I can present my project clearly within the three-minute limit. Today, I am excited to introduce Hoc Bong Hunter version 4.0 — an open-source, 12-node multi-agent scholarship ecosystem powered by Meta Muse Wonder 1.0 and Muse Spark 1.3."
    },
    {
      index: 2,
      id: "02_problem_and_i18n",
      title: "🌍 [2/6] Problem Statement, 50 Languages & QuotaGuard Security",
      action: "switch_lang_and_theme",
      startTime: 31.13,
      endTime: 58.76,
      text: "Every year, millions of students miss out on life-changing international scholarships because portals are scattered across languages, commercial agencies charge thousands of dollars, and standard LLMs often hallucinate expired deadlines or fake links. To solve this for students worldwide, Hoc Bong Hunter supports 50 global languages with automatic right-to-left layout, Light and Dark themes, and five free sponsored live API runs per IP and device MAC address via our QuotaGuard security engine."
    },
    {
      index: 3,
      id: "03_profile_and_radar",
      title: "🕸️ [3/6] AI CV Parser, 1-Click Presets & 5-Axis SVG Radar Chart",
      action: "select_preset_and_radar",
      startTime: 59.36,
      endTime: 81.54,
      text: "Let's see how it works in real time. A student can either paste their raw resume into our AI CV Parser powered by Muse Spark 1.3, or select a one-click student preset. Immediately, Node 1 analyzes their academic profile and renders a live 5-Axis SVG Radar Chart, comparing their GPA, IELTS score, and research experience against a Full Scholarship Benchmark."
    },
    {
      index: 4,
      id: "04_multi_agent_pipeline",
      title: "🧠 [4/6] 12-Node Pipeline & Muse Wonder 1.0 + Spark 1.3 Routing",
      action: "run_pipeline_and_inspect",
      startTime: 82.14,
      endTime: 115.81,
      text: "Now, when we trigger the 12-node pipeline, our Heterogeneous Router pairs Meta's newest models over the official v1 responses API. Node 2, powered by Muse Wonder 1.0, acts as the Supervisor and designs a three-lane search strategy. It then fans out to three parallel Muse Spark 1.3 Researcher agents executing concurrent web searches. Clicking any node on our interactive SVG flowchart opens the live Telemetry Inspector — showing the exact input prompt, JSON output, model ID, token usage, latency, and USD cost."
    },
    {
      index: 5,
      id: "05_triple_verification",
      title: "🛡️ [5/6] Triple-Verification Protocol & Side-by-Side Comparison",
      action: "show_verification_and_compare",
      startTime: 116.41,
      endTime: 144.10,
      text: "To completely eliminate AI hallucinations, Node 8 runs our Triple-Verification Engine. Using Muse Wonder 1.0 in a fresh context window alongside deterministic checks, it audits official dot-gov and dot-edu domains, validates 2026 to 2027 deadlines, and cross-checks GPA and language requirements to compute a transparent Trust Score up to 99 percent. Students can also select multiple verified cards to compare them side-by-side."
    },
    {
      index: 6,
      id: "06_studio_and_outro",
      title: "🎙️ [6/6] AI Mock Interviewer (#11), Essay Critic (#12) & Export",
      action: "run_studio_interview_and_essay",
      startTime: 144.70,
      endTime: 173.93,
      text: "Finally, in our AI Application Studio, Muse Wonder 1.0 drafts a tailored Motivation Letter and a three-stage roadmap. Agent 11 serves as an AI Mock Interview Coach with voice recognition and STAR method grading, while Agent 12 acts as an AI Essay Critic that detects clichés and rewrites weak drafts into polished academic English. Students can export deadlines to Google or Apple Calendar via dot-ICS or print an A4 PDF report. Thank you Meta and Cerebral Valley for this incredible hackathon!"
    }
  ]
};

let pitchAudio = null;
let pitchTriggeredActions = new Set();

function formatClock(sec) {
  const s = Math.max(0, Math.floor(sec || 0));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

function triggerPitchChoreography(action) {
  if (pitchTriggeredActions.has(action)) return;
  pitchTriggeredActions.add(action);

  if (action === "intro") {
    window.scrollTo({ top: 0, behavior: "smooth" });
  } else if (action === "switch_lang_and_theme") {
    if (typeof I18nEngine !== "undefined") {
      I18nEngine.applyLanguage("en");
      if ($("langSelect")) $("langSelect").value = "en";
    }
    const keyCard = $("key-card");
    if (keyCard) keyCard.scrollIntoView({ behavior: "smooth", block: "center" });
  } else if (action === "select_preset_and_radar") {
    const presetBtn = document.querySelector('.chip-btn[data-preset="stem-phd"]') || document.querySelector(".chip-btn");
    if (presetBtn) presetBtn.click();
    const radarCard = $("radarSvg");
    if (radarCard) radarCard.scrollIntoView({ behavior: "smooth", block: "center" });
  } else if (action === "run_pipeline_and_inspect") {
    const flowCard = $("pipeline-card");
    if (flowCard) flowCard.scrollIntoView({ behavior: "smooth", block: "start" });
    if (!appState.running && appState.rankedList.length === 0) {
      runPipeline(true);
    }
    setTimeout(() => {
      if (typeof Flowchart !== "undefined" && typeof Flowchart.selectNode === "function") {
        Flowchart.selectNode("supervisor");
      }
    }, 3500);
  } else if (action === "show_verification_and_compare") {
    const resCard = $("results-card");
    if (resCard) resCard.scrollIntoView({ behavior: "smooth", block: "start" });
    setTimeout(() => {
      if ($("openCompareBtn") && appState.rankedList.length >= 2) {
        $("openCompareBtn").click();
      }
    }, 3000);
  } else if (action === "run_studio_interview_and_essay") {
    const letterCard = $("letter-card");
    if (letterCard) letterCard.scrollIntoView({ behavior: "smooth", block: "start" });
    const tabIntBtn = document.querySelector('.tab-btn[data-tab="tab-interview"]');
    if (tabIntBtn) tabIntBtn.click();
    setTimeout(() => {
      if ($("sampleInterviewBtn")) $("sampleInterviewBtn").click();
      if ($("evalInterviewBtn")) $("evalInterviewBtn").click();
    }, 1500);
    setTimeout(() => {
      const tabEssayBtn = document.querySelector('.tab-btn[data-tab="tab-essay"]');
      if (tabEssayBtn) tabEssayBtn.click();
      if ($("sampleEssayBtn")) $("sampleEssayBtn").click();
      if ($("reviewEssayBtn")) $("reviewEssayBtn").click();
    }, 7500);
  }
}

function startAutoPitch() {
  const teleprompter = $("pitchTeleprompter");
  if (teleprompter) teleprompter.classList.remove("hidden");

  if (!pitchAudio) {
    pitchAudio = new Audio(PITCH_MANIFEST.audioSrc);
    pitchAudio.addEventListener("timeupdate", () => {
      const cur = pitchAudio.currentTime;
      const tot = pitchAudio.duration || PITCH_MANIFEST.totalDuration;
      if ($("pitchTimerText")) {
        $("pitchTimerText").textContent = `${formatClock(cur)} / ${formatClock(tot)}`;
      }
      if ($("pitchProgressBar")) {
        $("pitchProgressBar").style.width = `${Math.min(100, (cur / tot) * 100).toFixed(1)}%`;
      }
      const activeSeg = PITCH_MANIFEST.segments.find(s => cur >= s.startTime && cur <= s.endTime + 0.6)
        || PITCH_MANIFEST.segments[PITCH_MANIFEST.segments.length - 1];
      if (activeSeg) {
        if ($("pitchSegTitle")) $("pitchSegTitle").textContent = activeSeg.title;
        if ($("pitchSubtitleText")) $("pitchSubtitleText").textContent = `"${activeSeg.text}"`;
        triggerPitchChoreography(activeSeg.action);
      }
    });
    pitchAudio.addEventListener("ended", () => {
      if ($("pitchPlayPauseBtn")) $("pitchPlayPauseBtn").textContent = "🔄 Phát lại";
    });
  }

  pitchTriggeredActions.clear();
  pitchAudio.currentTime = 0;
  pitchAudio.play().then(() => {
    if ($("pitchPlayPauseBtn")) $("pitchPlayPauseBtn").textContent = "⏸️ Tạm dừng";
    triggerPitchChoreography("intro");
  }).catch(err => {
    setError("Không thể tự động phát file MP3: " + err.message);
  });
}

if ($("autoPitchBtn")) {
  $("autoPitchBtn").onclick = () => startAutoPitch();
}

if ($("pitchPlayPauseBtn")) {
  $("pitchPlayPauseBtn").onclick = () => {
    if (!pitchAudio) {
      startAutoPitch();
      return;
    }
    if (pitchAudio.paused) {
      pitchAudio.play();
      $("pitchPlayPauseBtn").textContent = "⏸️ Tạm dừng";
    } else {
      pitchAudio.pause();
      $("pitchPlayPauseBtn").textContent = "▶️ Tiếp tục";
    }
  };
}

if ($("pitchCloseBtn")) {
  $("pitchCloseBtn").onclick = () => {
    if (pitchAudio) pitchAudio.pause();
    if ($("pitchTeleprompter")) $("pitchTeleprompter").classList.add("hidden");
  };
}
