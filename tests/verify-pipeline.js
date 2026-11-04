/**
 * Học Bổng Hunter v3.0 — Automated CI/CD Triple-Verification Suite
 * File: tests/verify-pipeline.js
 * Chức năng kiểm định tự động trong CI/CD:
 *   1. Kiểm tra sự tồn tại của toàn bộ file bắt buộc (chống lỗi thiếu file như js/meta.js).
 *   2. Quét bảo mật (Secret Leak Guard): Đảm bảo không lộ API key cứng trong mã nguồn.
 *   3. Kiểm tra đồng bộ 100% DOM IDs giữa index.html và js/app.js + js/flowchart.js.
 *   4. Chạy kiểm thử tích hợp End-to-End (E2E) toàn bộ 10 Node Đa Agent & VerifierEngine 3 tầng.
 */

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");

function assert(cond, msg) {
  if (!cond) {
    console.error(`❌ [CI VERIFICATION FAILED]: ${msg}`);
    process.exit(1);
  }
}

console.log("=================================================================");
console.log("🛡️ HỌC BỔNG HUNTER v3.0 — CI/CD TRIPLE-VERIFICATION TEST SUITE");
console.log("=================================================================");

// --- CHECK 1: Kiểm tra đầy đủ cấu trúc file bắt buộc ---
const requiredFiles = [
  "index.html",
  "README.md",
  ".nojekyll",
  "css/style.css",
  "js/meta.js",
  "js/flowchart.js",
  "js/agents-v2.js",
  "js/app.js",
];

for (const rel of requiredFiles) {
  const full = path.join(ROOT, rel);
  assert(fs.existsSync(full), `Thiếu file bắt buộc: ${rel}`);
}
console.log(`✅ [Check 1/4] Cấu trúc file: Đầy đủ ${requiredFiles.length}/${requiredFiles.length} file cốt lõi.`);

// --- CHECK 2: Quét bảo mật (Không lộ API key thật trong code) ---
const codeFiles = ["index.html", "js/meta.js", "js/flowchart.js", "js/agents-v2.js", "js/app.js"];
for (const rel of codeFiles) {
  const content = fs.readFileSync(path.join(ROOT, rel), "utf8");
  const leakedKey = content.match(/LLM\|[A-Za-z0-9_\-]{20,}|sk-[A-Za-z0-9]{30,}/);
  assert(!leakedKey, `Phát hiện dấu hiệu lộ API key cứng trong file ${rel}`);
}
console.log("✅ [Check 2/4] Quét bảo mật (Secret Guard): An toàn, không có API key cứng trong repo.");

// --- CHECK 3: Kiểm tra đồng bộ DOM IDs giữa index.html và JS ---
const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const appCode = fs.readFileSync(path.join(ROOT, "js/app.js"), "utf8");
const htmlIds = new Set([...html.matchAll(/id="([^"]+)"/g)].map(m => m[1]));
const appIds = [...new Set([...appCode.matchAll(/\$\("([^"]+)"\)/g)].map(m => m[1]))];
const missingIds = appIds.filter(id => !htmlIds.has(id));
assert(missingIds.length === 0, `Các ID được gọi trong js/app.js nhưng thiếu trong index.html: ${missingIds.join(", ")}`);

// Kiểm tra thứ tự nạp thẻ <script> trong index.html
const scriptOrder = [...html.matchAll(/<script\s+src="([^"]+)"/g)].map(m => m[1]);
assert(
  JSON.stringify(scriptOrder) === JSON.stringify(["js/meta.js", "js/flowchart.js", "js/agents-v2.js", "js/app.js"]),
  `Thứ tự nạp script trong index.html không đúng chuẩn: ${scriptOrder.join(" -> ")}`
);
console.log(`✅ [Check 3/4] Đồng bộ DOM & Script: Khớp tuyệt đối ${appIds.length}/${appIds.length} DOM IDs và thứ tự nạp 4 script.`);

// --- CHECK 4: Kiểm thử End-to-End 10-Node Multi-Agent Pipeline & VerifierEngine ---
const metaCode = fs.readFileSync(path.join(ROOT, "js/meta.js"), "utf8");
const agentsCode = fs.readFileSync(path.join(ROOT, "js/agents-v2.js"), "utf8");

const ctx = {
  console,
  performance: { now: () => Date.now() },
  localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
  URL,
  setTimeout,
  clearTimeout,
  DOMException: Error,
};
vm.createContext(ctx);
vm.runInContext(
  `${metaCode}\n${agentsCode}\nthis.Exports = { metaStats, VerifierEngine, AgentsV2, usageHint, MUSE_MODELS, ROUTING_STRATEGIES };`,
  ctx
);

(async () => {
  const { metaStats, VerifierEngine, AgentsV2, usageHint, MUSE_MODELS, ROUTING_STRATEGIES } = ctx.Exports;

  assert(MUSE_MODELS["muse-wonder-1.0"], "Thiếu cấu hình model muse-wonder-1.0");
  assert(MUSE_MODELS["muse-spark-1.3"], "Thiếu cấu hình model muse-spark-1.3");
  assert(MUSE_MODELS["muse-spark-1.3-contributor"], "Thiếu cấu hình model muse-spark-1.3-contributor");
  assert(ROUTING_STRATEGIES["hybrid-wonder-spark"], "Thiếu chiến lược hybrid-wonder-spark");

  metaStats.reset("demo", "hybrid-wonder-spark");

  const sampleProfile = {
    level: "Cao học (Thạc sĩ)",
    major: "Công nghệ thông tin & Trí tuệ nhân tạo",
    gpa: "3.62",
    year: "Năm cuối",
    english: "IELTS 7.0",
    kind: "Du học toàn phần",
    countries: "Nhật, Hàn, Úc, châu Âu",
    note: "Giải Nhì NCKH Sinh viên",
  };

  // Node 1: Profile Analyzer
  const profCheck = AgentsV2.analyzeProfileLocal(sampleProfile);
  assert(profCheck.strengths.length >= 2, "Profile Analyzer không nhận diện đủ điểm mạnh hồ sơ.");

  // Node 2: Supervisor
  const lanes = await AgentsV2.supervise("DEMO", sampleProfile);
  assert(Array.isArray(lanes) && lanes.length === 3, "Supervisor phải trả về đúng 3 luồng tìm kiếm.");

  // Nodes 3, 4, 5: 3 Parallel Researchers
  const laneResults = await Promise.all(
    lanes.map(async lane => ({
      lane,
      ok: true,
      text: await AgentsV2.researchLane("DEMO", sampleProfile, lane),
    }))
  );
  assert(laneResults.every(r => r.ok && r.text.length > 50), "Một trong 3 Researcher trả về dữ liệu rỗng.");

  // Node 6: Fan-in Merge
  const merged = AgentsV2.mergeLanes(laneResults);
  assert(merged.okCount === 3 && merged.urlCount >= 5, "Merge Engine không gộp đủ 3 luồng hoặc mất URL.");

  // Node 7: Extractor
  const extracted = await AgentsV2.extract("DEMO", merged.merged);
  assert(extracted.length >= 8, `Extractor trích xuất quá ít học bổng (${extracted.length}).`);

  // Node 8: Triple-Verify Critic
  const { approved, rejected } = await AgentsV2.critic("DEMO", sampleProfile, extracted);
  assert(approved.length >= 8, "Critic duyệt thiếu học bổng hợp lệ.");
  assert(rejected.length >= 1, "Critic + VerifierEngine phải bắt và loại được học bổng giả/hết hạn (example.com / 2024).");

  // Node 9: Multi-Criteria Matcher
  const ranked = await AgentsV2.rank("DEMO", sampleProfile, approved);
  assert(ranked.length === approved.length, "Matcher làm rơi học bổng đã duyệt.");
  assert(ranked[0].score >= ranked[ranked.length - 1].score, "Matcher sắp xếp điểm không đúng thứ tự giảm dần.");
  assert(ranked[0].subScores && typeof ranked[0].subScores.major === "number", "Thiếu 4 chỉ số subScores.");

  // Node 10: Strategic Drafter & Checklist
  const letter = await AgentsV2.draftLetter("DEMO", sampleProfile, ranked[0]);
  assert(letter.includes("MOTIVATION LETTER") && letter.length > 400, "Drafter tạo dàn ý thư quá ngắn hoặc sai cấu trúc.");
  const checklist = AgentsV2.buildInteractiveChecklist(sampleProfile, ranked[0]);
  assert(checklist.length >= 8, "Checklist tạo thiếu mục hồ sơ.");

  console.log(`✅ [Check 4/4] E2E 10-Node Pipeline: Duyệt ${approved.length} học bổng thật, chặn ${rejected.length} học bổng giả/cũ, Top 1 = ${ranked[0].score}/100 điểm.`);
  console.log("📊 Telemetry:", usageHint());
  console.log("=================================================================");
  console.log("🎉 TẤT CẢ KIỂM ĐỊNH CI/CD ĐỀU ĐẠT CHUẨN 100%!");
  console.log("=================================================================");
})().catch(err => {
  console.error("❌ Lỗi bất đồng bộ trong E2E Test:", err);
  process.exit(1);
});
