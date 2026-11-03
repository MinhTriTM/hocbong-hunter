/* Flowchart live — vẽ graph pipeline v2 bằng SVG ngay trong app.
 * Node đang chạy: sáng + pulse; xong: xanh; lỗi: đỏ.
 * Mũi tên có animation chảy khi node nguồn đang chạy.
 * Kèm log realtime từng agent — giám khảo NHÌN THẤY hệ đa agent hoạt động.
 */
const FC_NODES = [
  { id: "profile",    x: 360, y: 36,  label: "👤 Profile" },
  { id: "supervisor", x: 360, y: 106, label: "🧠 Supervisor" },
  { id: "r1",         x: 125, y: 190, label: "🔎 Researcher 1" },
  { id: "r2",         x: 360, y: 190, label: "🔎 Researcher 2" },
  { id: "r3",         x: 595, y: 190, label: "🔎 Researcher 3" },
  { id: "merge",      x: 360, y: 274, label: "🔀 Merge + khử trùng" },
  { id: "extractor",  x: 360, y: 344, label: "🧾 Extractor" },
  { id: "critic",     x: 360, y: 414, label: "🛡️ Critic" },
  { id: "matcher",    x: 360, y: 484, label: "📊 Matcher" },
  { id: "drafter",    x: 360, y: 554, label: "✍️ Drafter" },
  { id: "done",       x: 360, y: 624, label: "✅ Xong" },
];
const FC_EDGES = [
  ["profile", "supervisor"],
  ["supervisor", "r1"], ["supervisor", "r2"], ["supervisor", "r3"],
  ["r1", "merge"], ["r2", "merge"], ["r3", "merge"],
  ["merge", "extractor"], ["extractor", "critic"],
  ["critic", "matcher"], ["matcher", "drafter"], ["drafter", "done"],
];
const FC_W = 720, FC_H = 660, FC_NW = 178, FC_NH = 46;

class Flowchart {
  constructor(svgEl, logEl) {
    this.svg = svgEl; this.logEl = logEl;
    this.nodeEls = {}; this.edgeEls = {};
    this._build();
  }
  _build() {
    const NS = "http://www.w3.org/2000/svg";
    const byId = Object.fromEntries(FC_NODES.map(n => [n.id, n]));
    let s = `<defs><marker id="fcArrow" viewBox="0 0 10 10" refX="9" refY="5"
      markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#94a3b8"/></marker></defs>`;
    for (const [a, b] of FC_EDGES) {
      const A = byId[a], B = byId[b];
      s += `<line class="fc-edge" data-edge="${a}>${b}"
        x1="${A.x}" y1="${A.y + FC_NH / 2}" x2="${B.x}" y2="${B.y - FC_NH / 2}"
        marker-end="url(#fcArrow)"/>`;
    }
    for (const n of FC_NODES) {
      const x = n.x - FC_NW / 2, y = n.y - FC_NH / 2;
      s += `<g class="fc-node idle" data-node="${n.id}">
        <rect x="${x}" y="${y}" width="${FC_NW}" height="${FC_NH}" rx="12"/>
        <text x="${n.x}" y="${n.y + 5}" text-anchor="middle" data-label>${this._esc(n.label)}</text>
      </g>`;
    }
    this.svg.setAttribute("viewBox", `0 0 ${FC_W} ${FC_H}`);
    this.svg.innerHTML = s;
    this.svg.querySelectorAll("[data-node]").forEach(g => this.nodeEls[g.dataset.node] = g);
    this.svg.querySelectorAll("[data-edge]").forEach(l => this.edgeEls[l.dataset.edge] = l);
  }
  _esc(t) { return String(t).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c])); }
  reset() {
    Object.values(this.nodeEls).forEach(g => g.setAttribute("class", "fc-node idle"));
    Object.values(this.edgeEls).forEach(l => l.classList.remove("flow"));
    this.logEl.innerHTML = "";
  }
  setState(id, state) {
    const g = this.nodeEls[id]; if (!g) return;
    g.setAttribute("class", `fc-node ${state}`);
    // Mũi tên chảy khi node nguồn đang chạy
    for (const key of Object.keys(this.edgeEls)) {
      if (key.startsWith(id + ">")) this.edgeEls[key].classList.toggle("flow", state === "running");
    }
  }
  setLabel(id, label) {
    const g = this.nodeEls[id]; if (!g) return;
    const t = g.querySelector("[data-label]");
    const short = label.length > 22 ? label.slice(0, 21) + "…" : label;
    t.textContent = short;
    g.querySelector("title")?.remove();
    const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
    title.textContent = label; g.appendChild(title);
  }
  log(msg) {
    const now = new Date();
    const ts = now.toTimeString().slice(0, 8);
    const div = document.createElement("div");
    div.innerHTML = `<span class="fc-ts">[${ts}]</span> ${this._esc(msg)}`;
    this.logEl.appendChild(div);
    this.logEl.scrollTop = this.logEl.scrollHeight;
  }
}
