/* Điều khiển UI v2: key → profile → Supervisor → fan-out 3 Researchers →
 * merge (code) → Extractor → Critic → Matcher → Drafter, với flowchart live. */
const $ = (id) => document.getElementById(id);
const KEY_LS = "hbh_meta_api_key";
let fc = null;

function status(t) { $("stepStatus").textContent = t; }
function fail(msg) {
  $("error").textContent = "❌ " + msg;
  Object.keys(fc ? fc.nodeEls : {}).forEach(id => {
    const g = fc.nodeEls[id];
    if (g.getAttribute("class").includes("running")) fc.setState(id, "failed");
  });
  $("hunt").disabled = false;
}

// --- API key ---
function refreshKeyStatus() {
  const k = localStorage.getItem(KEY_LS);
  $("keyStatus").textContent = k ? "Đã có key (lưu trong trình duyệt này)." : "Chưa có key.";
  if (k) $("apiKey").value = k;
}
$("saveKey").onclick = () => {
  const v = $("apiKey").value.trim();
  if (!v) { $("keyStatus").textContent = "Key trống — chưa lưu."; return; }
  localStorage.setItem(KEY_LS, v);
  $("keyStatus").textContent = "Đã lưu key vào trình duyệt. Không gửi đi đâu ngoài api.meta.ai khi bạn bấm Săn.";
};
refreshKeyStatus();
fc = new Flowchart($("flowsvg"), $("flowlog"));

// --- Main flow v2 ---
$("hunt").onclick = async () => {
  $("error").textContent = "";
  const apiKey = (localStorage.getItem(KEY_LS) || "").trim();
  if (!apiKey) { fail("Chưa có API key. Dán key ở ô phía trên rồi bấm Lưu key."); return; }
  const p = {
    level: $("level").value, major: $("major").value.trim(), gpa: $("gpa").value.trim(),
    year: $("year").value.trim(), english: $("english").value.trim(), kind: $("kind").value,
    countries: $("countries").value.trim(), note: $("note").value.trim(),
  };
  if (!p.major || !p.gpa) { fail("Điền ngành học và GPA trước đã."); return; }

  $("hunt").disabled = true;
  fc.reset();
  ["pipeline-card", "results-card", "letter-card"].forEach(id => $(id).classList.remove("hidden"));
  $("results").innerHTML = ""; $("letter").textContent = "";
  const ctl = new AbortController();

  try {
    // 1) SUPERVISOR — chia 3 hướng tìm kiếm theo hồ sơ
    fc.setState("profile", "done");
    fc.setState("supervisor", "running");
    fc.log("🧠 Supervisor: phân tích hồ sơ, chia 3 hướng tìm kiếm…");
    status("Supervisor — đang lên kế hoạch 3 hướng tìm kiếm…");
    const lanes = await AgentsV2.supervise(apiKey, p, ctl.signal);
    lanes.forEach((l, i) => fc.setLabel(["r1", "r2", "r3"][i], l.title));
    fc.setState("supervisor", "done");
    fc.log("🧠 Supervisor: chốt 3 lane → " + lanes.map(l => l.title).join(" | "));

    // 2) FAN-OUT — 3 Researchers chạy song song
    status("3 Researchers — đang tìm song song trên web…");
    const lanePromises = lanes.map(async (lane, i) => {
      const nid = ["r1", "r2", "r3"][i];
      fc.setState(nid, "running");
      fc.log(`🔎 ${lane.title}: bắt đầu tìm (web search grounding)…`);
      try {
        const text = await AgentsV2.researchLane(apiKey, p, lane, ctl.signal);
        fc.setState(nid, "done");
        fc.log(`🔎 ${lane.title}: xong (~${Math.round(text.length / 100) / 10}k ký tự).`);
        return { lane, ok: true, text };
      } catch (e) {
        fc.setState(nid, "failed");
        fc.log(`🔎 ${lane.title}: LỖI — ${e.message}`);
        return { lane, ok: false, text: "" };
      }
    });
    const laneResults = await Promise.all(lanePromises);
    if (!laneResults.some(r => r.ok)) throw new Error("Cả 3 researcher đều lỗi — kiểm tra key/API rồi thử lại.");

    // 3) FAN-IN — gộp + khử trùng bằng code (không tốn AI)
    fc.setState("merge", "running"); status("Merge — gộp kết quả 3 lane…");
    const { merged, okCount } = AgentsV2.mergeLanes(laneResults);
    fc.setState("merge", "done");
    fc.log(`🔀 Merge: gộp ${okCount}/3 lane bằng code (không tốn token AI).`);

    // 4) EXTRACTOR
    fc.setState("extractor", "running"); status("Extractor — bóc deadline, điều kiện, link…");
    fc.log("🧾 Extractor: bóc JSON từ text gộp…");
    const list = await AgentsV2.extract(apiKey, merged, ctl.signal);
    if (!list.length) throw new Error("Không trích được học bổng nào — thử lại.");
    fc.setState("extractor", "done");
    fc.log(`🧾 Extractor: ${list.length} học bổng (đã khử trùng).`);

    // 5) CRITIC — fresh context, loại tin dỏm
    fc.setState("critic", "running"); status("Critic — kiểm định độc lập…");
    fc.log("🛡️ Critic (fresh context, không thấy hồ sơ): kiểm tra deadline/link/tên…");
    const { approved, rejected } = await AgentsV2.critic(apiKey, list, ctl.signal);
    fc.setState("critic", "done");
    if (rejected.length) {
      fc.log(`🛡️ Critic: LOẠI ${rejected.length} tin → ` +
        rejected.map(r => `${r.name} (${r.rejectReason})`).join(" | "));
    } else {
      fc.log("🛡️ Critic: tất cả đều qua kiểm định.");
    }
    const pool = approved.length >= 3 ? approved
      : approved.length ? approved
      : (fc.log("🛡️ Critic: không chắc chắn — giữ nguyên, bạn xác minh tay nhé."), list);

    // 6) MATCHER
    fc.setState("matcher", "running"); status("Matcher — chấm điểm phù hợp…");
    fc.log("📊 Matcher: chấm 0–100 theo hồ sơ…");
    const ranked = await AgentsV2.rank(apiKey, p, pool, ctl.signal);
    fc.setState("matcher", "done");
    fc.log(`📊 Matcher: top 1 = ${ranked[0] ? ranked[0].name + " (" + ranked[0].score + "đ)" : "?"}.`);
    renderResults(ranked, rejected);

    // 7) DRAFTER
    fc.setState("drafter", "running"); status("Drafter — soạn dàn ý thư động lực…");
    fc.log("✍️ Drafter: viết dàn ý thư cho top 1…");
    const letter = await AgentsV2.draftLetter(apiKey, p, ranked[0], ctl.signal);
    fc.setState("drafter", "done");
    $("letterFor").textContent = "cho: " + ranked[0].name;
    $("letter").textContent = letter;

    fc.setState("done", "done");
    fc.log("✅ Xong toàn bộ pipeline 7 agent.");
    status("Xong! " + usageHint());
  } catch (e) {
    fail(e.message || String(e));
  } finally {
    $("hunt").disabled = false;
  }
};

function renderResults(ranked, rejected) {
  let html = ranked.map((s, i) => `
    <div class="sch">
      <h3>#${i + 1} ${esc(s.name)}</h3>
      <div class="meta">
        <span class="score">${s.score ?? "?"} điểm</span>
        <span class="tag">${esc(s.org || "")}</span>
        <span class="tag">${esc(s.country || "")}</span>
        <span class="tag">⏰ ${esc(s.deadline || "chưa rõ")}</span>
        ${s.value ? `<span class="tag">💰 ${esc(s.value)}</span>` : ""}
      </div>
      ${s.reason ? `<p><b>Vì sao hợp:</b> ${esc(s.reason)}</p>` : ""}
      ${s.conditions ? `<p><b>Điều kiện:</b> ${esc(s.conditions)}</p>` : ""}
      ${s.link ? `<p><a href="${esc(s.link)}" target="_blank" rel="noopener">🔗 Nguồn / nộp hồ sơ</a></p>` : ""}
    </div>`).join("");
  if (rejected && rejected.length) {
    html += `<details class="critic-rejected"><summary>🛡️ ${rejected.length} tin bị Critic loại (bấm để xem lý do)</summary>` +
      rejected.map(r => `<p><b>${esc(r.name)}</b> — ${esc(r.rejectReason || "")}</p>`).join("") + `</details>`;
  }
  $("results").innerHTML = html;
}

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

$("copyLetter").onclick = async () => {
  try { await navigator.clipboard.writeText($("letter").textContent); $("copyLetter").textContent = "✅ Đã copy!"; }
  catch { $("copyLetter").textContent = "Copy tay giúp mình nhé (Ctrl+C)."; }
  setTimeout(() => $("copyLetter").textContent = "📋 Copy dàn ý", 2000);
};
