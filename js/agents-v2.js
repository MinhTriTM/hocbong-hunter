/* ==========================================================================
 * Học Bổng Hunter v3.0 — Hệ Đa Agent (Multi-Agent Orchestration Pipeline)
 * File: js/agents-v2.js
 * Kiến trúc 9-Node Agentic Workflow trên Meta Model API (Muse Wonder 1.0 & Spark 1.3):
 *
 *   [1] Profile Analyzer & CV Parser (Chuẩn hóa & đánh giá năng lực hồ sơ)
 *         │
 *   [2] Supervisor Agent (Muse Wonder 1.0 ── Lập chiến lược 3 mũi nhọn tìm kiếm)
 *         │ fan-out (Promise.all song song)
 *      ┌──┼──┐
 *      ▼  ▼  ▼
 *   [3][4][5] R1, R2, R3 (Muse Spark 1.3 + Web Search Grounding ── 3 luồng độc lập)
 *      └──┼──┘
 *         │ fan-in
 *   [6] Merge & Deduplicator (Hợp nhất văn bản & lọc nguồn trích dẫn bằng thuật toán)
 *         │
 *   [7] Structured Extractor (Muse Spark 1.3 ── Bóc tách JSON + Khử trùng lặp tên)
 *         │
 *   [8] Triple-Verify Critic (Muse Wonder 1.0 Fresh Context + Deterministic VerifierEngine)
 *         │ approved pool
 *   [9] Multi-Criteria Matcher (Muse Spark 1.3 ── Chấm điểm 0-100 + 4 Sub-scores)
 *         │
 *  [10] Strategic Application Drafter (Muse Wonder 1.0 ── Motivation Letter + Action Plan + Interview)
 * ========================================================================== */

function profileText(p) {
  return [
    `Bậc học mục tiêu: ${p.level}`,
    `Ngành học: ${p.major}`,
    `GPA: ${p.gpa}/4.0`,
    `Năm học / Trạng thái: ${p.year}`,
    `Ngoại ngữ: ${p.english || "chưa có chứng chỉ"}`,
    `Loại học bổng mong muốn: ${p.kind}`,
    `Quốc gia / Khu vực ưu tiên: ${p.countries || "không giới hạn"}`,
    p.note ? `Thành tích / Hoàn cảnh đặc biệt: ${p.note}` : "",
  ].filter(Boolean).join(" | ");
}

function normalizeNameKey(name) {
  return String(name || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

// 3 luồng dự phòng chất lượng cao nếu JSON của Supervisor gặp sự cố
const DEFAULT_LANES = [
  {
    id: "r1",
    title: "🏛️ Chính phủ & Quốc tế",
    focus: "Học bổng chính phủ các nước & liên minh quốc tế (MEXT, GKS, Australia Awards, Eiffel, Chevening, Fulbright, Erasmus Mundus...)",
    queries: ["government scholarship Vietnamese students 2027", "học bổng chính phủ du học toàn phần 2027"]
  },
  {
    id: "r2",
    title: "🏢 Tập đoàn & Quỹ VN",
    focus: "Học bổng tập đoàn công nghệ, quỹ học thuật uy tín và đại học trong/ngoài nước (Vingroup, Samsung Talent, Vallet, AmCham...)",
    queries: ["học bổng sinh viên đại học Việt Nam 2026 2027", "corporate STEM scholarship Vietnam students 2027"]
  },
  {
    id: "r3",
    title: "✈️ Trao đổi & Research",
    focus: "Học bổng trao đổi sinh viên quốc tế, thực tập nghiên cứu ngắn hạn (JASSO, AIMS, EPFL, CERN, NII...)",
    queries: ["student exchange research internship scholarship Asia Europe 2027", "học bổng trao đổi sinh viên quốc tế 2027"]
  },
];

const AgentsV2 = {
  // ── 0) PROFILE ANALYZER & CV PARSER ──
  analyzeProfileLocal(p) {
    const gpaNum = parseFloat(String(p.gpa || "0").replace(",", "."));
    const engStr = String(p.english || "").toUpperCase();
    const strengths = [];
    const tips = [];

    if (gpaNum >= 3.6) strengths.push("🌟 GPA Xuất sắc (≥ 3.6) — Lợi thế cực lớn cho học bổng Merit & Chính phủ");
    else if (gpaNum >= 3.2) strengths.push("✅ GPA Giỏi (≥ 3.2) — Đủ điều kiện hầu hết học bổng toàn phần quốc tế");
    else if (gpaNum >= 2.8) tips.push("💡 GPA Khá — Nên nhấn mạnh dự án thực tế, NCKH hoặc hoạt động lãnh đạo để bù đắp");
    else tips.push("⚠️ GPA cần cải thiện — Ưu tiên học bổng trao đổi, doanh nghiệp hoặc hỗ trợ tài chính");

    if (engStr.includes("IELTS") || engStr.includes("TOEFL") || engStr.includes("JLPT") || engStr.includes("TOPIK")) {
      strengths.push(`🗣️ Đã có chứng chỉ ngoại ngữ (${p.english})`);
    } else {
      tips.push("📌 Chưa ghi chứng chỉ ngoại ngữ — Nhiều học bổng (như GKS, MEXT) vẫn cho phép nộp hoặc học dự bị tiếng");
    }

    if (p.note && p.note.trim().length > 3) {
      strengths.push(`🏅 Điểm nhấn cá nhân: ${p.note.trim()}`);
    }

    metaStats.recordTrace("profile", {
      status: "done",
      model: "Rule + Profile Engine",
      latencyMs: 5,
      tokens: 0,
      costUSD: 0,
      outputPreview: `Hồ sơ chuẩn hóa:\n${profileText(p)}\n\nĐiểm mạnh:\n- ${strengths.join("\n- ") || "Đang phân tích"}\nKhuyến nghị:\n- ${tips.join("\n- ") || "Hồ sơ cân đối, sẵn sàng săn học bổng!"}`,
    });

    return { strengths, tips };
  },

  async parseCV(apiKey, rawCvText, signal) {
    const input =
`Trích xuất thông tin hồ sơ ứng viên từ nội dung CV/Bảng điểm dưới đây thành ĐÚNG JSON object (không thêm chữ ngoài JSON):
{
  "level": "Đại học" | "Cao học (Thạc sĩ)" | "Tiến sĩ" | "THPT",
  "major": "Ngành học chính (tiếng Việt)",
  "gpa": "Điểm GPA quy đổi thang 4.0 (VD: 3.45)",
  "year": "Năm học hiện tại hoặc Đã tốt nghiệp (VD: Năm 3, Năm 4, Đã tốt nghiệp)",
  "english": "Chứng chỉ ngoại ngữ cao nhất (VD: IELTS 7.0, TOEIC 850, JLPT N2...)",
  "kind": "Du học toàn phần" | "Du học bán phần" | "Trong nước" | "Ngắn hạn / trao đổi",
  "countries": "Các quốc gia phù hợp gợi ý (VD: Nhật, Hàn, Úc, châu Âu)",
  "note": "Tóm tắt ngắn gọn (dưới 120 ký tự) các giải thưởng, NCKH, dự án nổi bật hoặc hoàn cảnh đặc biệt"
}

NỘI DUNG CV:
${String(rawCvText || "").slice(0, 6000)}`;
    const resText = await metaRespond({ apiKey, input, effort: "minimal", signal, nodeId: "profile" });
    return extractJson(resText);
  },

  // ── 1) SUPERVISOR: Chia 3 hướng tìm kiếm chuyên biệt theo hồ sơ (Muse Wonder 1.0) ──
  async supervise(apiKey, p, signal) {
    const input =
`Bạn là Supervisor Agent (chạy trên Meta Muse Wonder) của hệ đa agent săn học bổng cho sinh viên Việt Nam.
Hồ sơ ứng viên: ${profileText(p)}

Nhiệm vụ:
1. Đưa ra nhận định chiến lược ngắn gọn (1 câu tiếng Việt) về hướng săn học bổng tối ưu nhất cho hồ sơ này.
2. Chia việc tìm kiếm thành ĐÚNG 3 hướng (lane) bổ trợ nhau, KHÔNG trùng lặp, điều chỉnh sát theo hồ sơ (ngành ${p.major}, GPA ${p.gpa}, ngoại ngữ ${p.english}, nguyện vọng ${p.kind} tại ${p.countries}).

Trả về ĐÚNG JSON object, không thêm chữ nào ngoài JSON:
{
  "strategySummary": "1 câu tóm tắt chiến lược phân tích hồ sơ",
  "lanes": [
    {"id":"r1","title":"tên ngắn ≤ 22 ký tự, có emoji","focus":"1 câu mô tả hướng tìm kiếm","queries":["2-3 câu query web search tiếng Anh/Việt"]},
    {"id":"r2","title":"...","focus":"...","queries":["..."]},
    {"id":"r3","title":"...","focus":"...","queries":["..."]}
  ]
}`;
    try {
      const raw = await metaRespond({ apiKey, input, effort: "low", signal, nodeId: "supervisor" });
      const plan = extractJson(raw);
      if (plan && Array.isArray(plan.lanes) && plan.lanes.length === 3 &&
          plan.lanes.every(l => l && l.title && Array.isArray(l.queries))) {
        const lanes = plan.lanes.map((l, i) => ({
          ...DEFAULT_LANES[i],
          ...l,
          id: DEFAULT_LANES[i].id,
        }));
        lanes.strategySummary = plan.strategySummary || "Phân bổ 3 luồng tìm kiếm song song theo sát hồ sơ ứng viên.";
        return lanes;
      }
    } catch (e) {
      if (e.name === "AbortError") throw e;
    }
    const fallback = DEFAULT_LANES.map(l => ({ ...l }));
    fallback.strategySummary = "Sử dụng 3 luồng chiến lược tiêu chuẩn (Chính phủ Quốc tế · Tập đoàn/Quỹ VN · Trao đổi/Ngắn hạn).";
    return fallback;
  },

  // ── 2) RESEARCHER: 1 lane, Web Search Grounding (Muse Spark 1.3) ──
  async researchLane(apiKey, p, lane, signal) {
    const input =
`Bạn là Researcher Agent chuyên trách hướng "${lane.title}" trong hệ đa agent săn học bổng.
Hướng tìm kiếm: ${lane.focus}
Gợi ý truy vấn: ${(lane.queries || []).join(" | ")}

DÙNG WEB SEARCH để tìm các học bổng THẬT (đang mở đơn cuối năm 2026 / đầu năm 2027 hoặc có chu kỳ tuyển sinh thường niên) PHÙ HỢP với hồ sơ:
${profileText(p)}

Yêu cầu nghiêm ngặt:
- CHỈ tìm đúng hướng "${lane.title}", lấy từ 4 đến 7 học bổng chất lượng nhất.
- Ưu tiên học bổng còn hạn nộp từ hôm nay (${META_CONFIG.todayStr}) trở đi hoặc sắp mở đợt 2027.
- TUYỆT ĐỐI KHÔNG bịa tên học bổng hay URL. Mỗi học bổng bắt buộc kèm URL trang chính thức hoặc nguồn uy tín.
- Trình bày rõ từng học bổng: Tên học bổng | Tổ chức cấp | Quốc gia | Hạn nộp | Giá trị tài trợ | Điều kiện chính (GPA, IELTS, Ngành) | Link nguồn (URL đầy đủ).`;
    return metaRespond({
      apiKey,
      input,
      webSearch: true,
      effort: "minimal",
      signal,
      nodeId: lane.id,
    });
  },

  // ── 3) FAN-IN MERGE: Gộp 3 lane + lọc sơ bộ bằng thuật toán (0 token AI) ──
  mergeLanes(laneResults) {
    const t0 = performance.now();
    const good = laneResults.filter(r => r.ok && r.text && r.text.trim());
    const merged = good.map(r => `=== [HƯỚNG NGHIÊN CỨU: ${r.lane.title} — ${r.lane.focus}] ===\n${r.text.trim()}`).join("\n\n");

    // Đếm sơ bộ số URL xuất hiện trong kết quả tìm kiếm
    const urlMatches = merged.match(/https?:\/\/[^\s)\]"'>]+/gi) || [];
    const dt = Math.round(performance.now() - t0);

    metaStats.recordTrace("merge", {
      status: "done",
      model: "Deterministic Code Engine (0 Token)",
      latencyMs: dt,
      tokens: 0,
      costUSD: 0,
      outputPreview: `Đã gộp ${good.length}/${laneResults.length} luồng Researcher.\nTổng độ dài văn bản: ${merged.length.toLocaleString("vi-VN")} ký tự.\nPhát hiện ${urlMatches.length} đường dẫn URL nguồn để chuyển cho Extractor & Critic.`,
    });

    return { merged, okCount: good.length, totalCount: laneResults.length, urlCount: urlMatches.length };
  },

  // ── 4) EXTRACTOR: Bóc tách cấu trúc JSON chuẩn & Khử trùng lặp (Muse Spark 1.3) ──
  async extract(apiKey, mergedText, signal) {
    const input =
`Từ kết quả tìm kiếm học bổng dưới đây (gộp từ 3 Researcher chạy song song), hãy trích xuất thành ĐÚNG JSON array, KHỬ TRÙNG theo tên học bổng (nếu trùng thì gộp thông tin đầy đủ nhất).
Mỗi phần tử trong mảng JSON có đúng các trường sau:
{
  "name": "Tên đầy đủ của học bổng",
  "org": "Tổ chức / Chính phủ / Trường đại học cấp",
  "country": "Quốc gia / Khu vực",
  "deadline": "Hạn nộp cụ thể (VD: 15/01/2027 hoặc Chu kỳ tháng 04/2027)",
  "value": "Giá trị học bổng (VD: Toàn phần 100% học phí + sinh hoạt phí...)",
  "conditions": "Tóm tắt điều kiện chính (Bậc học, Ngành, GPA, IELTS/ngoại ngữ)",
  "link": "URL trang chính thức đầy đủ (https://...)"
}

Quy tắc:
- Chỉ dùng thông tin có trong văn bản kết quả tìm kiếm, không tự bịa thêm.
- Trả về ĐÚNG JSON array ([...]), không thêm bất kỳ lời dẫn hay giải thích nào ngoài JSON.

VĂN BẢN TÌM KIẾM:
${mergedText}`;

    const raw = await metaRespond({ apiKey, input, effort: "minimal", signal, nodeId: "extractor" });
    const list = extractJson(raw);
    if (!Array.isArray(list)) throw new Error("Extractor không trả về định dạng mảng JSON hợp lệ.");

    // Khử trùng lặp lần 2 bằng chuẩn hóa khóa tên (Normalized Key Deduplication)
    const seen = new Set();
    const out = [];
    for (const s of list) {
      if (!s || !s.name) continue;
      const key = normalizeNameKey(s.name);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push({
        name: String(s.name || "").trim(),
        org: String(s.org || "Tổ chức giáo dục").trim(),
        country: String(s.country || "Quốc tế").trim(),
        deadline: String(s.deadline || "Xem trên website").trim(),
        value: String(s.value || "Theo quy định chương trình").trim(),
        conditions: String(s.conditions || "Đáp ứng tiêu chuẩn học thuật").trim(),
        link: String(s.link || "").trim(),
      });
    }
    return out;
  },

  // ── 5) TRIPLE-VERIFY CRITIC: Fresh Context AI Critic + Deterministic VerifierEngine ──
  async critic(apiKey, p, scholarships, signal) {
    const input =
`Bạn là Critic Agent — Kiểm định viên ĐỘC LẬP (Fresh Context) chạy trên Meta Muse.
Hôm nay là ngày ${META_CONFIG.todayStr} (Mùa săn học bổng niên khóa 2026–2027).

Danh sách học bổng cần kiểm định (JSON):
${JSON.stringify(scholarships)}

Nhiệm vụ kiểm chứng nghiêm ngặt:
1. Kiểm tra tính xác thực: Tên học bổng và tổ chức cấp có tồn tại thật không?
2. Kiểm tra thời hạn (Temporal Check): Hạn nộp đã quá cũ (VD: từ năm 2022–2024 mà không còn mở) hay vẫn hợp lệ cho chu kỳ 2026–2027?
3. Kiểm tra đường dẫn (URL Check): Link có phải tên miền mẫu giả lập (như example.com) hoặc không liên quan không?

Chỉ đánh dấu "ok": false khi phát hiện dấu hiệu giả mạo, link fake, hoặc chương trình đã ngừng vĩnh viễn từ lâu. Các học bổng thường niên uy tín (dù đang chờ mở đợt mới 2027) vẫn đánh dấu "ok": true và ghi chú rõ chu kỳ.

Trả về ĐÚNG JSON object, không thêm chữ ngoài JSON:
{
  "verdicts": [
    {"name": "Tên học bổng", "ok": true, "reason": "1 câu tiếng Việt nhận định ngắn gọn, sắc bén về độ tin cậy & nguồn"}
  ]
}`;

    let verdicts = [];
    try {
      const raw = await metaRespond({ apiKey, input, effort: "low", signal, nodeId: "critic" });
      const parsed = extractJson(raw);
      if (parsed && Array.isArray(parsed.verdicts)) {
        verdicts = parsed.verdicts;
      } else if (Array.isArray(parsed)) {
        verdicts = parsed;
      }
    } catch (e) {
      if (e.name === "AbortError") throw e;
    }

    const verdictByName = new Map(
      verdicts.map(x => [normalizeNameKey(x.name), x])
    );

    const approved = [];
    const rejected = [];

    for (const s of scholarships) {
      const key = normalizeNameKey(s.name);
      const aiVerdict = verdictByName.get(key) || null;
      // Chạy Giao thức Kiểm chứng 3 Tầng (URL/Domain + Deadline + Eligibility + AI Critic)
      const audited = VerifierEngine.auditScholarship(p, s, aiVerdict);
      if (audited.isRejected) {
        rejected.push(audited);
      } else {
        approved.push(audited);
      }
    }

    return { approved, rejected };
  },

  // ── 6) MULTI-CRITERIA MATCHER: Chấm 0–100 + 4 Sub-scores (Muse Spark 1.3) ──
  async rank(apiKey, p, scholarships, signal) {
    const input =
`Hồ sơ ứng viên: ${profileText(p)}

Danh sách học bổng ĐÃ QUA KIỂM ĐỊNH (JSON):
${JSON.stringify(scholarships.map(({ verification, isRejected, rejectReason, ...core }) => core))}

Hãy chấm điểm mức độ phù hợp từ 0 đến 100 cho từng học bổng, đồng thời chấm 4 điểm thành phần (subScores từ 0 đến 100):
- "major": Độ khớp ngành học (${p.major})
- "gpa": Độ khả thi về GPA (${p.gpa}/4.0)
- "english": Độ khớp yêu cầu ngoại ngữ (${p.english})
- "country": Độ khớp quốc gia (${p.countries}) & loại học bổng (${p.kind})

Trả về ĐÚNG JSON array, sắp xếp giảm dần theo score, không thêm chữ ngoài JSON:
[
  {
    "name": "Tên học bổng",
    "score": 92,
    "subScores": {"major": 95, "gpa": 90, "english": 92, "country": 90},
    "reason": "1-2 câu tiếng Việt phân tích cụ thể vì sao ứng viên này có cơ hội trúng tuyển cao hoặc cần lưu ý gì"
  }
]`;

    let rankedRaw = [];
    try {
      const resText = await metaRespond({ apiKey, input, effort: "minimal", signal, nodeId: "matcher" });
      rankedRaw = extractJson(resText);
    } catch (e) {
      if (e.name === "AbortError") throw e;
    }

    const byKey = new Map(scholarships.map(s => [normalizeNameKey(s.name), s]));
    const matchedKeys = new Set();
    const result = [];

    if (Array.isArray(rankedRaw)) {
      for (const r of rankedRaw) {
        if (!r || !r.name) continue;
        const key = normalizeNameKey(r.name);
        const orig = byKey.get(key);
        if (!orig || matchedKeys.has(key)) continue;
        matchedKeys.add(key);

        const totalScore = Math.max(10, Math.min(100, Number(r.score) || 80));
        const sub = r.subScores || {};
        result.push({
          ...orig,
          score: totalScore,
          subScores: {
            major: Math.min(100, Number(sub.major) || totalScore),
            gpa: Math.min(100, Number(sub.gpa) || totalScore),
            english: Math.min(100, Number(sub.english) || totalScore),
            country: Math.min(100, Number(sub.country) || totalScore),
          },
          reason: r.reason || "Phù hợp tốt với định hướng học thuật và tiêu chí hồ sơ của bạn.",
        });
      }
    }

    // Đảm bảo không bỏ sót học bổng nào đã qua kiểm định nếu AI trả thiếu tên
    for (const s of scholarships) {
      const key = normalizeNameKey(s.name);
      if (!matchedKeys.has(key)) {
        result.push({
          ...s,
          score: 75,
          subScores: { major: 78, gpa: 75, english: 75, country: 72 },
          reason: "Đạt tiêu chuẩn kiểm định độc lập; phù hợp để đưa vào danh sách cân nhắc nộp đơn.",
        });
      }
    }

    return result.sort((a, b) => b.score - a.score);
  },

  // ── 7) DRAFTER: Soạn bộ hồ sơ chiến lược (Motivation Letter + Action Plan + Interview) ──
  async draftLetter(apiKey, p, target, signal) {
    const input =
`Bạn là Cố vấn Học bổng Quốc tế Cấp cao (chạy trên Meta Muse Wonder 1.0).
Hồ sơ ứng viên: ${profileText(p)}
Học bổng mục tiêu: ${target.name} — ${target.org} (${target.country})
Giá trị: ${target.value} | Hạn nộp: ${target.deadline} | Điều kiện: ${target.conditions}

Hãy soạn bộ tài liệu hướng dẫn cá nhân hóa gồm 3 phần rõ ràng:

=== 1. MOTIVATION LETTER OUTLINE (TIẾNG ANH HỌC THUẬT + GỢI Ý CÁ NHÂN HÓA TIẾNG VIỆT) ===
- Gồm 5 đoạn (Opening Hook, Academic & Technical Excellence, Why This Program & ${target.org}, Leadership & Unique Value, Post-Study Impact in Vietnam).
- Mỗi đoạn viết 2–3 câu mẫu tiếng Anh chuẩn học thuật sắc bén gắn với ngành ${p.major} (GPA ${p.gpa}) và mở ngoặc vuông [Gợi ý tiếng Việt] ở những chỗ ứng viên cần điền số liệu/dự án thực tế.

=== 2. LỘ TRÌNH CHUẨN BỊ HỒ SƠ (TIMELINE 3 GIAI ĐOẠN) ===
- Giai đoạn 1: Chuẩn bị giấy tờ học thuật & Thư giới thiệu (LOR).
- Giai đoạn 2: Tinh chỉnh bài luận & Minh chứng thành tích.
- Giai đoạn 3: Kiểm tra chéo & Nộp trước hạn (${target.deadline}).

=== 3. BỘ 3 CÂU HỎI PHỎNG VẤN TRỌNG TÂM & GỢI Ý TRẢ LỜI ===
- Nêu 3 câu hỏi hội đồng giám khảo ${target.org} thường hỏi nhất và chiến lược trả lời ghi điểm tuyệt đối.

Giữ văn phong súc tích, chuyên nghiệp, truyền cảm hứng và không bịa đặt thành tích chưa có của ứng viên.`;
    return metaRespond({ apiKey, input, effort: "low", signal, nodeId: "drafter" });
  },

  // ── 8) CHECKLIST GENERATOR: Tạo danh sách hồ sơ cần chuẩn bị theo đặc thù học bổng ──
  buildInteractiveChecklist(p, target) {
    const items = [
      { id: "chk_form", label: `Đơn đăng ký trực tuyến trên cổng chính thức của ${target.org}`, category: "Bắt buộc" },
      { id: "chk_transcript", label: `Bảng điểm học tập (GPA hiện tại: ${p.gpa}/4.0) dịch thuật công chứng tiếng Anh`, category: "Học thuật" },
      { id: "chk_degree", label: `Bằng tốt nghiệp hoặc Giấy chứng nhận sinh viên (${p.year})`, category: "Học thuật" },
      { id: "chk_english", label: `Chứng chỉ ngoại ngữ quốc tế còn hạn (${p.english || "IELTS / TOEFL / JLPT / TOPIK"})`, category: "Ngoại ngữ" },
      { id: "chk_letter", label: `Motivation Letter / Personal Statement cá nhân hóa cho ${target.name}`, category: "Bài luận" },
      { id: "chk_lor", label: "02 Thư giới thiệu (Letters of Recommendation) từ Giảng viên hướng dẫn / Trưởng khoa", category: "Thư giới thiệu" },
      { id: "chk_cv", label: `CV Học thuật (Academic CV) nhấn mạnh chuyên ngành ${p.major} và các dự án`, category: "Hồ sơ" },
      { id: "chk_passport", label: "Hộ chiếu phổ thông còn hạn ít nhất 12–18 tháng / CCCD gắn chip", category: "Pháp lý" },
    ];

    const condLower = `${target.conditions || ""} ${target.name || ""}`.toLowerCase();
    if (condLower.includes("thạc sĩ") || condLower.includes("tiến sĩ") || condLower.includes("mext") || condLower.includes("research") || p.level.includes("Cao học") || p.level.includes("Tiến sĩ")) {
      items.push({ id: "chk_proposal", label: "Đề cương nghiên cứu (Research Proposal / Study Plan) từ 1.500–2.500 từ", category: "Nghiên cứu" });
    }
    if (p.note && p.note.trim()) {
      items.push({ id: "chk_extra", label: `Minh chứng thành tích / hoàn cảnh đặc biệt (${p.note})`, category: "Ưu tiên" });
    }
    return items;
  }
};
