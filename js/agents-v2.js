/* Học bổng Hunter v2 — pipeline 7 agent (Agentic Workflows).
 *
 *   Profile
 *     │
 *   Supervisor ── lên kế hoạch 3 hướng tìm kiếm theo đúng hồ sơ
 *     │ fan-out (chạy song song)
 *   ┌─┼─┐
 *   ▼ ▼ ▼
 *  R1 R2 R3  ← 3 Researchers (web search grounding, mỗi lane 1 hướng)
 *   └─┼─┘
 *     │ fan-in: gộp + khử trùng bằng code (không tốn AI)
 *     ▼
 *  Extractor ── bóc JSON: deadline, điều kiện, giá trị, link
 *     ▼
 *  Critic ✕ ── fresh context (KHÔNG thấy profile/search text):
 *              loại tin hết hạn, link dỏm, tên bịa — kèm lý do
 *     ▼ approved
 *  Matcher ── chấm 0–100 theo hồ sơ
 *     ▼
 *  Drafter ── dàn ý thư động lực tiếng Anh cho top 1
 *
 * Vì sao pattern này (đã đối chiếu research):
 * - Fan-out 3 researchers (map-reduce): 1 luồng tìm kiếm bỏ sót nguồn;
 *   3 luồng song song tăng độ phủ VÀ chạy nhanh hơn nối tiếp.
 * - Critic với fresh context: đọc độc lập bắt lỗi tốt hơn tự critique;
 *   là "người gác cổng" trước khi chấm điểm — demo nhìn rất thuyết phục.
 * - Supervisor: thay vì hardcode 3 hướng, để AI tự chia theo profile
 *   (VD: có IELTS → thêm luồng "học bổng yêu cầu tiếng Anh").
 */

function profileText(p) {
  return [
    `Bậc học: ${p.level}`, `Ngành: ${p.major}`, `GPA: ${p.gpa}/4.0`,
    `Năm học: ${p.year}`, `Tiếng Anh: ${p.english || "chưa có"}`,
    `Loại học bổng mong muốn: ${p.kind}`, `Quốc gia ưu tiên: ${p.countries || "không giới hạn"}`,
    p.note ? `Hoàn cảnh đặc biệt: ${p.note}` : "",
  ].filter(Boolean).join(" | ");
}

// Phòng thủ: nếu Supervisor trả JSON hỏng, dùng 3 lane mặc định để demo không chết.
const DEFAULT_LANES = [
  { id: "r1", title: "Chính phủ & quốc tế", focus: "học bổng chính phủ các nước (MEXT, KGSP/GKS, Australia Awards, Chevening, Fulbright, Eiffel...)", queries: ["government scholarship Vietnamese students 2027", "học bổng chính phủ du học 2027"] },
  { id: "r2", title: "ĐH & tổ chức VN", focus: "học bổng trong nước, học bổng trường đại học Việt Nam và tổ chức/doanh nghiệp", queries: ["học bổng đại học Việt Nam 2026 2027", "scholarship Vietnam university students"] },
  { id: "r3", title: "Trao đổi & ngắn hạn", focus: "học bổng trao đổi ngắn hạn, summer school, chương trình quốc tế cho sinh viên", queries: ["student exchange scholarship Asia 2027", "học bổng trao đổi sinh viên 2027"] },
];

const AgentsV2 = {
  // ── SUPERVISOR: chia 3 hướng tìm kiếm theo hồ sơ ──
  async supervise(apiKey, p, signal) {
    const input =
`Bạn là Supervisor của hệ đa agent săn học bổng cho sinh viên Việt Nam.
Hồ sơ ứng viên: ${profileText(p)}

Nhiệm vụ: chia việc tìm kiếm thành ĐÚNG 3 hướng (lane) bổ trợ nhau, KHÔNG trùng lặp, điều chỉnh theo hồ sơ.
Ví dụ: ứng viên có IELTS → 1 lane "học bổng yêu cầu tiếng Anh"; GPA cao → 1 lane merit-based; muốn trong nước → 1 lane học bổng ĐH Việt Nam; ngành CNTT → 1 lane học bổng công nghệ.

Trả về ĐÚNG JSON, không thêm chữ nào ngoài JSON:
{"lanes":[
 {"id":"r1","title":"tên ngắn ≤ 24 ký tự, có emoji","focus":"1 câu mô tả hướng tìm kiếm","queries":["2-3 câu query web search tiếng Anh/Việt"]},
 {"id":"r2","title":"...","focus":"...","queries":[...]},
 {"id":"r3","title":"...","focus":"...","queries":[...]}
]}`;
    try {
      const plan = extractJson(await metaRespond({ apiKey, input, effort: "low", signal }));
      if (plan && Array.isArray(plan.lanes) && plan.lanes.length === 3 &&
          plan.lanes.every(l => l && l.id && l.title && Array.isArray(l.queries))) {
        return plan.lanes.map((l, i) => ({ ...DEFAULT_LANES[i], ...l, id: DEFAULT_LANES[i].id }));
      }
    } catch (e) { /* rơi xuống fallback bên dưới */ }
    return DEFAULT_LANES.map(l => ({ ...l }));
  },

  // ── RESEARCHER: 1 lane, web search grounding ──
  async researchLane(apiKey, p, lane, signal) {
    const input =
`Bạn là Researcher chuyên trách hướng "${lane.title}" trong hệ đa agent săn học bổng.
Hướng tìm kiếm: ${lane.focus}
Gợi ý query: ${(lane.queries || []).join(" | ")}

DÙNG WEB SEARCH để tìm các học bổng THẬT (đang mở hoặc có chu kỳ hằng năm) PHÙ HỢP với hồ sơ:
${profileText(p)}

Yêu cầu:
- CHỈ tìm đúng hướng được giao, tối đa 8 học bổng.
- Ưu tiên học bổng còn hạn nộp từ hôm nay (3/11/2026) trở đi; hết hạn thì ghi rõ.
- KHÔNG bịa tên, deadline hay link. Mỗi học bổng kèm nguồn (tên trang + URL) từ kết quả tìm kiếm.
- Mỗi học bổng 3–5 dòng: tên | tổ chức | quốc gia | hạn nộp | giá trị | link nguồn.`;
    return metaRespond({ apiKey, input, webSearch: true, effort: "minimal", signal });
  },

  // ── FAN-IN: gộp 3 lane + khử trùng bằng code (không tốn AI) ──
  mergeLanes(laneResults) {
    // laneResults: [{lane, ok, text}]
    const good = laneResults.filter(r => r.ok && r.text && r.text.trim());
    const merged = good.map(r => `[HƯỚNG: ${r.lane.title}]\n${r.text.trim()}`).join("\n\n");
    return { merged, okCount: good.length, totalCount: laneResults.length };
  },

  // ── EXTRACTOR: bóc JSON ──
  async extract(apiKey, mergedText, signal) {
    const input =
`Từ kết quả tìm kiếm học bổng dưới đây (gộp từ 3 hướng tìm kiếm song song, có thể trùng lặp), trích thành JSON array, KHỬ TRÙNG theo tên học bổng (giữ 1 bản đầy đủ nhất). Mỗi phần tử có đúng các field:
{"name": "...", "org": "...", "country": "...", "deadline": "...", "value": "...", "conditions": "...", "link": "..."}
- "deadline": ghi đúng như nguồn (VD "31/01/2027" hoặc "đã hết hạn đợt 2026, kỳ tiếp theo dự kiến ..."); không rõ thì "chưa rõ".
- "conditions": tóm tắt 1 dòng điều kiện chính (GPA, tiếng Anh, ngành...).
- Chỉ dùng thông tin có trong text, không bịa thêm. Trả về ĐÚNG JSON array, không thêm chữ nào ngoài JSON.

TEXT:
${mergedText}`;
    const list = extractJson(await metaRespond({ apiKey, input, effort: "minimal", signal }));
    if (!Array.isArray(list)) throw new Error("Extractor trả về không phải JSON array.");
    // Khử trùng lần nữa bằng code cho chắc (chuẩn hoá tên).
    const seen = new Set(), out = [];
    for (const s of list) {
      const key = String(s.name || "").toLowerCase().replace(/[^a-z0-9à-ỹ]/gi, "");
      if (!key || seen.has(key)) continue;
      seen.add(key); out.push(s);
    }
    return out;
  },

  // ── CRITIC: fresh context — KHÔNG thấy profile, KHÔNG thấy search text ──
  async critic(apiKey, scholarships, signal) {
    const input =
`Bạn là Critic — kiểm định viên ĐỘC LẬP. Bạn không biết hồ sơ ứng viên, chỉ nhận danh sách học bổng đã trích xuất.
Hôm nay là 3/11/2026.

Danh sách (JSON):
${JSON.stringify(scholarships)}

Với từng học bổng, đánh giá độ tin cậy:
- "deadline" đã qua hoặc phi lý? (VD: deadline 2024 trong khi đang cuối 2026)
- "link" có phải domain chính thức (edu/gov/site của tổ chức) hay blog trung gian?
- tên học bổng có thật không, hay nghe như bịa?
Nghiêm khắc nhưng công bằng: chỉ loại khi có dấu hiệu rõ ràng.

Trả về ĐÚNG JSON, không thêm chữ nào ngoài JSON:
{"verdicts":[{"name":"...","ok":true/false,"reason":"1 câu tiếng Việt giải thích"}]}`;
    const v = extractJson(await metaRespond({ apiKey, input, effort: "low", signal }));
    const verdicts = Array.isArray(v.verdicts) ? v.verdicts : [];
    const verdictByName = new Map(verdicts.map(x => [String(x.name || "").toLowerCase().replace(/[^a-z0-9à-ỹ]/gi, ""), x]));
    const approved = [], rejected = [];
    for (const s of scholarships) {
      const key = String(s.name || "").toLowerCase().replace(/[^a-z0-9à-ỹ]/gi, "");
      const vd = verdictByName.get(key);
      if (vd && vd.ok === false) rejected.push({ ...s, rejectReason: vd.reason || "không đạt kiểm định" });
      else approved.push(s);
    }
    return { approved, rejected };
  },

  // ── MATCHER: chấm 0–100 theo hồ sơ ──
  async rank(apiKey, p, scholarships, signal) {
    const input =
`Hồ sơ ứng viên: ${profileText(p)}

Danh sách học bổng ĐÃ QUA KIỂM ĐỊNH (JSON):
${JSON.stringify(scholarships)}

Chấm điểm phù hợp 0–100 cho từng học bổng dựa trên: khớp ngành, đủ/khả thi về GPA và tiếng Anh, khớp bậc học và loại học bổng mong muốn, còn hạn nộp (hết hạn bị trừ nặng).
Trả về ĐÚNG JSON array, mỗi phần tử: {"name": "...", "score": 0-100, "reason": "1-2 câu tiếng Việt giải thích"}. Sắp xếp giảm dần theo score. Không thêm chữ ngoài JSON.`;
    const ranked = extractJson(await metaRespond({ apiKey, input, effort: "minimal", signal }));
    const byName = Object.fromEntries(scholarships.map(s => [String(s.name).toLowerCase(), s]));
    return ranked
      .filter(r => r && r.name && byName[String(r.name).toLowerCase()])
      .map(r => ({ ...byName[String(r.name).toLowerCase()], score: r.score, reason: r.reason }))
      .sort((a, b) => b.score - a.score);
  },

  // ── DRAFTER: dàn ý thư động lực cho top 1 ──
  async draftLetter(apiKey, p, top, signal) {
    const input =
`Viết DÀN Ý thư động lực (motivation letter) bằng TIẾNG ANH cho ứng viên có hồ sơ:
${profileText(p)}
Ứng tuyển học bổng: ${top.name} — ${top.org} (${top.country}), giá trị: ${top.value}.

Dàn ý gồm 5 phần, mỗi phần 2–3 bullet ngắn (tiếng Anh, kèm gợi ý tiếng Việt trong ngoặc đơn cho chỗ cần cá nhân hoá):
1. Opening — hook cá nhân gắn với ngành ${p.major}
2. Academic background — nêu GPA ${p.gpa}, thành tích liên quan
3. Why this scholarship — nối mục tiêu nghề nghiệp với giá trị của ${top.org}
4. Why me — điểm mạnh + hoàn cảnh (nếu có: ${p.note || "không"})
5. Closing — cam kết đóng góp sau khi học xong
Giữ tổng dưới 400 từ. Không bịa thành tích cụ thể của ứng viên — để chỗ trống [điền].`;
    return metaRespond({ apiKey, input, effort: "low", signal });
  },
};
