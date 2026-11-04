/* ==========================================================================
 * Học Bổng Hunter v3.0 — Interactive Multi-Agent Flowchart & Telemetry Inspector
 * File: js/flowchart.js
 * Tính năng nổi bật:
 *   - Vẽ đồ thị 10-Node Agentic Workflow bằng SVG với đường cong Bezier mượt.
 *   - Hiển thị trực tiếp Model Badge (Muse Wonder 1.0 / Muse Spark 1.3) & trạng thái.
 *   - Bấm vào bất kỳ Node nào trên sơ đồ để mở Agent Inspector (xem Input/Output,
 *     Latency ms, Tokens, Cost USD của đúng Agent đó).
 * ========================================================================== */

const FC_NODES = [
  { id: "profile",    x: 380, y: 38,  label: "👤 Profile Analyzer", sub: "Rule + CV Parser" },
  { id: "supervisor", x: 380, y: 114, label: "🧠 Supervisor",       sub: "Muse Wonder 1.0" },
  { id: "r1",         x: 135, y: 204, label: "🔎 Researcher 1",     sub: "Spark 1.3 · Web Search" },
  { id: "r2",         x: 380, y: 204, label: "🔎 Researcher 2",     sub: "Spark 1.3 · Web Search" },
  { id: "r3",         x: 625, y: 204, label: "🔎 Researcher 3",     sub: "Spark 1.3 · Web Search" },
  { id: "merge",      x: 380, y: 294, label: "🔀 Fan-in Merge",     sub: "0-Token Code Dedupe" },
  { id: "extractor",  x: 380, y: 370, label: "🧾 JSON Extractor",   sub: "Muse Spark 1.3" },
  { id: "critic",     x: 380, y: 446, label: "🛡️ Triple-Verify Critic", sub: "Wonder 1.0 + Verifier" },
  { id: "matcher",    x: 380, y: 522, label: "📊 Multi-Matcher",    sub: "Spark 1.3 · 4 Criteria" },
  { id: "drafter",    x: 380, y: 598, label: "✍️ Strategic Drafter", sub: "Muse Wonder 1.0" },
  { id: "done",       x: 380, y: 670, label: "✅ Hoàn tất Pipeline", sub: "Verified & Ranked" },
];

const FC_EDGES = [
  ["profile", "supervisor"],
  ["supervisor", "r1"], ["supervisor", "r2"], ["supervisor", "r3"],
  ["r1", "merge"], ["r2", "merge"], ["r3", "merge"],
  ["merge", "extractor"], ["extractor", "critic"],
  ["critic", "matcher"], ["matcher", "drafter"], ["drafter", "done"],
];

const FC_W = 760, FC_H = 710, FC_NW = 204, FC_NH = 52;

class Flowchart {
  constructor(svgEl, logEl, inspectorEl) {
    this.svg = svgEl;
    this.logEl = logEl;
    this.inspectorEl = inspectorEl || document.getElementById("agent-inspector");
    this.nodeEls = {};
    this.edgeEls = {};
    this.selectedNodeId = null;
    this._build();
  }

  _build() {
    const byId = Object.fromEntries(FC_NODES.map(n => [n.id, n]));
    let s = `<defs>
      <marker id="fcArrow" viewBox="0 0 10 10" refX="8" refY="5"
        markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse">
        <path d="M 0 1 L 10 5 L 0 9 z" fill="#8b9bb8"/>
      </marker>
      <linearGradient id="fcGradActive" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#6c8cff" stop-opacity="0.28"/>
        <stop offset="100%" stop-color="#22d3ee" stop-opacity="0.16"/>
      </linearGradient>
    </defs>`;

    for (const [a, b] of FC_EDGES) {
      const A = byId[a], B = byId[b];
      const x1 = A.x, y1 = A.y + FC_NH / 2;
      const x2 = B.x, y2 = B.y - FC_NH / 2;
      const cy = (y1 + y2) / 2;
      const d = x1 === x2
        ? `M ${x1} ${y1} L ${x2} ${y2}`
        : `M ${x1} ${y1} C ${x1} ${cy}, ${x2} ${cy}, ${x2} ${y2}`;
      s += `<path class="fc-edge" data-edge="${a}>${b}" d="${d}" fill="none" marker-end="url(#fcArrow)"/>`;
    }

    for (const n of FC_NODES) {
      const x = n.x - FC_NW / 2, y = n.y - FC_NH / 2;
      s += `<g class="fc-node idle" data-node="${n.id}" style="cursor:pointer" tabindex="0" role="button" aria-label="Xem chi tiết ${this._esc(n.label)}">
        <rect x="${x}" y="${y}" width="${FC_NW}" height="${FC_NH}" rx="13"/>
        <text class="fc-title" x="${n.x}" y="${n.y - 4}" text-anchor="middle" data-label>${this._esc(n.label)}</text>
        <text class="fc-sub" x="${n.x}" y="${n.y + 14}" text-anchor="middle" data-sub>${this._esc(n.sub)}</text>
      </g>`;
    }

    this.svg.setAttribute("viewBox", `0 0 ${FC_W} ${FC_H}`);
    this.svg.innerHTML = s;

    this.svg.querySelectorAll("[data-node]").forEach(g => {
      const nid = g.dataset.node;
      this.nodeEls[nid] = g;
      g.addEventListener("click", () => this.inspectNode(nid));
    });
    this.svg.querySelectorAll("[data-edge]").forEach(l => {
      this.edgeEls[l.dataset.edge] = l;
    });
  }

  _esc(t) {
    return String(t ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  }

  reset() {
    Object.values(this.nodeEls).forEach(g => g.setAttribute("class", "fc-node idle"));
    Object.values(this.edgeEls).forEach(l => {
      l.classList.remove("flow", "done-edge");
    });
    this.logEl.innerHTML = "";
    if (this.inspectorEl) {
      this.inspectorEl.classList.add("hidden");
    }
  }

  setState(id, state) {
    const g = this.nodeEls[id];
    if (!g) return;
    const isSel = this.selectedNodeId === id ? " selected-node" : "";
    g.setAttribute("class", `fc-node ${state}${isSel}`);

    // Cập nhật sub-label hiển thị thời gian chạy nếu đã xong
    const trace = typeof metaStats !== "undefined" ? metaStats.agentTraces[id] : null;
    if (trace && state === "done" && trace.latencyMs != null) {
      const subEl = g.querySelector("[data-sub]");
      if (subEl) {
        const shortModel = (trace.model || "").replace("muse-", "").slice(0, 18);
        subEl.textContent = `${shortModel} · ${(trace.latencyMs / 1000).toFixed(1)}s`;
      }
    }

    for (const key of Object.keys(this.edgeEls)) {
      if (key.startsWith(id + ">")) {
        this.edgeEls[key].classList.toggle("flow", state === "running");
        if (state === "done") this.edgeEls[key].classList.add("done-edge");
      }
    }

    if (this.selectedNodeId === id) {
      this.renderInspector(id);
    }
  }

  setLabel(id, label, subText) {
    const g = this.nodeEls[id];
    if (!g) return;
    const t = g.querySelector("[data-label]");
    const short = label.length > 23 ? label.slice(0, 22) + "…" : label;
    if (t) t.textContent = short;
    if (subText) {
      const subEl = g.querySelector("[data-sub]");
      if (subEl) subEl.textContent = subText.length > 28 ? subText.slice(0, 27) + "…" : subText;
    }
    g.querySelector("title")?.remove();
    const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
    title.textContent = `${label}${subText ? " — " + subText : ""}`;
    g.appendChild(title);
  }

  updateModelLabels(strategyId) {
    if (typeof ROUTING_STRATEGIES === "undefined") return;
    const strat = ROUTING_STRATEGIES[strategyId] || ROUTING_STRATEGIES["hybrid-wonder-spark"];
    if (!strat) return;
    for (const n of FC_NODES) {
      const m = strat.map[n.id];
      if (m) {
        const subEl = this.nodeEls[n.id]?.querySelector("[data-sub]");
        if (subEl) {
          const shortM = m.replace("muse-", "");
          subEl.textContent = n.id.startsWith("r") ? `${shortM} · Web Search` : shortM;
        }
      }
    }
  }

  inspectNode(id) {
    this.selectedNodeId = id;
    Object.entries(this.nodeEls).forEach(([nid, g]) => {
      g.classList.toggle("selected-node", nid === id);
    });
    this.renderInspector(id);
  }

  renderInspector(id) {
    const box = this.inspectorEl || document.getElementById("agent-inspector");
    if (!box) return;
    const nodeMeta = FC_NODES.find(n => n.id === id) || { id, label: id };
    const trace = (typeof metaStats !== "undefined" && metaStats.agentTraces[id]) || null;

    box.classList.remove("hidden");
    if (!trace) {
      box.innerHTML = `
        <div class="insp-head">
          <strong>🔍 Agent Inspector: ${this._esc(nodeMeta.label)}</strong>
          <span class="badge-pill">Chưa kích hoạt</span>
        </div>
        <p class="hint">Agent này chưa chạy trong phiên hiện tại. Hãy bấm <b>🚀 Săn học bổng</b> hoặc <b>⚡ Chạy Demo Thực Tế</b> để xem dữ liệu Telemetry trực tiếp.</p>
      `;
      return;
    }

    const latStr = trace.latencyMs != null ? `${trace.latencyMs} ms` : "Đang xử lý...";
    const tokStr = trace.tokens != null ? `${trace.tokens} tokens` : "0 tokens";
    const costStr = trace.costUSD != null ? `$${trace.costUSD.toFixed(5)}` : "$0.0000";

    box.innerHTML = `
      <div class="insp-head">
        <strong>🔍 Agent Inspector: ${this._esc(nodeMeta.label)}</strong>
        <div class="insp-badges">
          <span class="badge-pill brand">${this._esc(trace.model || nodeMeta.sub)}</span>
          <span class="badge-pill">${latStr}</span>
          <span class="badge-pill">${tokStr}</span>
          <span class="badge-pill ok">${costStr}</span>
        </div>
      </div>
      ${trace.promptPreview ? `<details><summary>📥 Xem Prompt đầu vào (Input Context)</summary><pre class="insp-pre">${this._esc(trace.promptPreview)}</pre></details>` : ""}
      ${trace.outputPreview ? `<details open><summary>📤 Xem Kết quả phản hồi (Agent Output)</summary><pre class="insp-pre">${this._esc(trace.outputPreview)}</pre></details>` : ""}
      ${trace.error ? `<p class="err-inline">❌ Lỗi: ${this._esc(trace.error)}</p>` : ""}
    `;
  }

  log(msg, type = "info") {
    const now = new Date();
    const ts = now.toTimeString().slice(0, 8);
    const div = document.createElement("div");
    div.className = `fc-log-line fc-log-${type}`;
    div.innerHTML = `<span class="fc-ts">[${ts}]</span> ${this._esc(msg)}`;
    this.logEl.appendChild(div);
    this.logEl.scrollTop = this.logEl.scrollHeight;
  }
}
