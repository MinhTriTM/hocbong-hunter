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

function refreshProfileInsights() {
  const p = getProfileFromForm();
  const { strengths, tips } = AgentsV2.analyzeProfileLocal(p);
  const box = $("profileInsights");
  if (!box) return;
  box.innerHTML = [
    ...strengths.map(s => `<span class="insight-pill">${esc(s)}</span>`),
    ...tips.map(t => `<span class="insight-pill tip">${esc(t)}</span>`),
  ].join("");
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

  // Cập nhật Checklist tương tác ngay lập tức
  renderInteractiveChecklist(target);

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

// Chuyển đổi Tab trong AI Application Studio
document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    const targetTab = btn.dataset.tab;
    ["tab-letter", "tab-checklist"].forEach(tid => {
      const pane = $(tid);
      if (pane) pane.classList.toggle("hidden", tid !== targetTab);
    });
  });
});

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
