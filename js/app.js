/**
 * Hoc bong Hunter — agentic pipeline on Meta Muse Spark (Meta Model API).
 * 4 agents: Researcher (Responses API + web_search grounding) -> Extractor
 * -> Matcher -> Drafter (Chat Completions). API key lives in localStorage only.
 */
const API_BASE = 'https://api.meta.ai/v1';
const MODEL = 'muse-spark-1.3';
const KEY_NAME = 'hbhunter_meta_key';

const $ = (id) => document.getElementById(id);
const state = { key: '', raw: '', scholarships: [], ranked: [], letter: '' };

/* ---------------- API ---------------- */

function getKey() {
  try { return localStorage.getItem(KEY_NAME) || ''; } catch (e) { return ''; }
}

/** Responses API — the only Meta endpoint with web_search grounding. */
async function callResponses(input, maxOutput = 2500) {
  const res = await fetch(API_BASE + '/responses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + state.key },
    body: JSON.stringify({
      model: MODEL,
      input: input,
      tools: [{ type: 'web_search' }],
      max_output_tokens: maxOutput
    })
  });
  if (!res.ok) throw new Error('API ' + res.status);
  const data = await res.json();
  return extractResponsesText(data);
}

/** Walk the Responses API output array defensively and concat text parts. */
function extractResponsesText(data) {
  const out = data && data.output;
  if (!Array.isArray(out)) {
    if (typeof data.output_text === 'string') return data.output_text;
    throw new Error('unexpected-responses-shape');
  }
  const parts = [];
  for (const item of out) {
    if (!item || !item.content) continue;
    const blocks = Array.isArray(item.content) ? item.content : [item.content];
    for (const b of blocks) {
      if (typeof b === 'string') parts.push(b);
      else if (b && typeof b.text === 'string') parts.push(b.text);
    }
  }
  const text = parts.join('\n').trim();
  if (!text) throw new Error('empty-response');
  return text;
}

/** Chat Completions — OpenAI-compatible, for structured follow-up agents. */
async function callChat(system, user, maxTokens = 2000) {
  const res = await fetch(API_BASE + '/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + state.key },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user }
      ],
      max_tokens: maxTokens,
      temperature: 0.4
    })
  });
  if (!res.ok) throw new Error('API ' + res.status);
  const data = await res.json();
  const c = data.choices && data.choices[0];
  const text = c && c.message && c.message.content;
  if (!text || !text.trim()) throw new Error('empty-response');
  return text.trim();
}

/** Extract the first JSON array/object from a model reply. */
function extractJSON(text) {
  const fenced = text.match(/```json\s*([\s\S]*?)```/i) || text.match(/```\s*([\s\S]*?)```/);
  const cand = fenced ? fenced[1] : text;
  const start = cand.search(/[\[{]/);
  if (start < 0) throw new Error('no-json');
  let depth = 0, inStr = false, esc = false, end = -1;
  const open = cand[start];
  const close = open === '[' ? ']' : '}';
  for (let i = start; i < cand.length; i++) {
    const ch = cand[i];
    if (inStr) { if (esc) esc = false; else if (ch === '\\') esc = true; else if (ch === '"') inStr = false; }
    else if (ch === '"') inStr = true;
    else if (ch === '[' || ch === '{') depth++;
    else if (ch === ']' || ch === '}') { depth--; if (depth === 0 && ch === close) { end = i; break; } }
  }
  if (end < 0) throw new Error('no-json');
  return JSON.parse(cand.slice(start, end + 1));
}

/* ---------------- Pipeline ---------------- */

function profileText() {
  const types = [...document.querySelectorAll('#f-types input:checked')].map(e => e.value).join(', ');
  const notes = $('f-notes').value.trim();
  return [
    'Bậc học: ' + $('f-level').value,
    'Ngành: ' + ($('f-major').value.trim() || 'chưa rõ'),
    'GPA: ' + ($('f-gpa').value.trim() || 'chưa rõ'),
    'Năm học: ' + ($('f-year').value.trim() || 'chưa rõ'),
    'Loại học bổng quan tâm: ' + (types || 'mọi loại')
  ].join('\n') + (notes ? '\nĐiểm đặc biệt: ' + notes : '');
}

function setStep(n, cls) {
  const el = $('st-' + n);
  el.classList.remove('active', 'done');
  if (cls) el.classList.add(cls);
}
function say(msg, cls) {
  const el = $('pipe-msg');
  el.textContent = msg;
  el.className = 'status' + (cls ? ' ' + cls : '');
}

async function runPipeline() {
  if (!state.key) { say('Bạn cần lưu API key trước.', 'err'); return; }
  $('pipeline-card').classList.remove('hidden');
  $('results-card').classList.add('hidden');
  $('letter-card').classList.add('hidden');
  [1, 2, 3, 4].forEach(n => setStep(n));
  $('hunt').disabled = true;

  const profile = profileText();
  try {
    // 1. Researcher — web-grounded search
    setStep(1, 'active'); say('Researcher đang tìm học bổng đang mở trên web...');
    state.raw = await callResponses(
      'Bạn là trợ lý săn học bổng cho sinh viên Việt Nam.\nHồ sơ ứng viên:\n' + profile +
      '\n\nHãy tìm trên web các học bổng HIỆN ĐANG MỞ (năm 2026) phù hợp với hồ sơ trên. ' +
      'Liệt kê tối đa 8 học bổng, mỗi cái gồm: tên học bổng, tổ chức cấp, quốc gia, giá trị, ' +
      'hạn nộp (deadline), 2-3 điều kiện chính, và link trang chính thức. ' +
      'Ưu tiên nguồn chính thức (trang .edu, .gov, website tổ chức). ' +
      'Trả lời bằng tiếng Việt, ngắn gọn, kèm citation cho từng mục.'
    );
    setStep(1, 'done');

    // 2. Extractor — structured JSON
    setStep(2, 'active'); say('Extractor đang bóc tách thông tin...');
    state.scholarships = await extractJSON(await callChat(
      'Bạn trích xuất thông tin thành JSON. Chỉ trả về JSON, không giải thích.',
      'Từ danh sách học bổng sau, trích xuất thành mảng JSON, mỗi phần tử có đúng các trường: ' +
      '{"name": "...", "org": "...", "country": "...", "amount": "...", "deadline": "...", ' +
      '"requirements": ["...", "..."], "link": "..."}. ' +
      'Nếu thiếu thông tin, ghi "chưa rõ". Danh sách:\n\n' + state.raw
    ));
    if (!Array.isArray(state.scholarships) || !state.scholarships.length) throw new Error('no-scholarships');
    setStep(2, 'done');

    // 3. Matcher — score fit
    setStep(3, 'active'); say('Matcher đang chấm điểm phù hợp...');
    const scores = await extractJSON(await callChat(
      'Bạn chấm điểm phù hợp. Chỉ trả về JSON, không giải thích.',
      'Hồ sơ ứng viên:\n' + profile + '\n\nDanh sách học bổng (JSON):\n' +
      JSON.stringify(state.scholarships) +
      '\n\nChấm điểm phù hợp 0-100 cho từng học bổng, trả về mảng JSON: ' +
      '[{"name": "...", "score": 85, "reason": "..."}]. "reason" tối đa 1 câu tiếng Việt.'
    ));
    const scoreMap = {};
    scores.forEach(s => { scoreMap[s.name] = s; });
    state.ranked = state.scholarships.map(s => ({
      ...s,
      score: (scoreMap[s.name] && scoreMap[s.name].score) || 0,
      reason: (scoreMap[s.name] && scoreMap[s.name].reason) || ''
    })).sort((a, b) => b.score - a.score);
    setStep(3, 'done');

    // 4. Drafter — letter outline + checklist for top 1
    setStep(4, 'active'); say('Drafter đang soạn dàn ý thư động lực...');
    const top = state.ranked[0];
    state.letter = await callChat(
      'Bạn là cố vấn viết hồ sơ học bổng. Trả lời bằng tiếng Việt, trình bày rõ ràng.',
      'Hồ sơ ứng viên:\n' + profile + '\n\nHọc bổng mục tiêu: ' + top.name +
      ' (' + top.org + ', giá trị: ' + top.amount + ', deadline: ' + top.deadline + ').\n\n' +
      'Hãy soạn: (1) dàn ý thư động lực 5-7 gạch đầu dòng, cá nhân hoá theo hồ sơ; ' +
      '(2) checklist hồ sơ cần chuẩn bị (giấy tờ, chứng chỉ, thời hạn).'
    );
    state.letterFor = top.name;
    setStep(4, 'done');

    renderResults();
    say('Xong! Tìm thấy ' + state.ranked.length + ' học bổng.', 'ok');
  } catch (e) {
    say('Lỗi ở pipeline: ' + e.message + '. Hãy kiểm tra API key và thử lại.', 'err');
  }
  $('hunt').disabled = false;
}

/* ---------------- Render ---------------- */

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function renderResults() {
  $('results-card').classList.remove('hidden');
  $('res-count').textContent = '(' + state.ranked.length + ')';
  const box = $('results');
  box.innerHTML = '';
  state.ranked.forEach(s => {
    const d = document.createElement('div');
    d.className = 'sch';
    d.innerHTML =
      '<h3>' + esc(s.name) + '</h3>' +
      '<div class="meta">' +
      '<span class="pill score">Phù hợp: ' + esc(s.score) + '/100</span>' +
      '<span class="pill">' + esc(s.org) + '</span>' +
      '<span class="pill">' + esc(s.amount) + '</span>' +
      '<span class="pill deadline">Hạn: ' + esc(s.deadline) + '</span>' +
      '</div>' +
      (s.reason ? '<p class="muted small">→ ' + esc(s.reason) + '</p>' : '') +
      '<ul>' + (s.requirements || []).map(r => '<li>' + esc(r) + '</li>').join('') + '</ul>' +
      (s.link && s.link !== 'chưa rõ' ? '<p class="small"><a href="' + esc(s.link) + '" target="_blank" rel="noopener">🔗 Trang chính thức (xác minh lại trước khi nộp)</a></p>' : '');
    box.appendChild(d);
  });
  $('letter-card').classList.remove('hidden');
  $('letter-for').textContent = 'cho: ' + state.letterFor;
  $('letter').textContent = state.letter;
}

/* ---------------- Wire up ---------------- */

function refreshKeyStatus() {
  const has = !!getKey();
  const el = $('key-status');
  el.textContent = has ? '✓ Đã lưu key.' : 'Chưa có key.';
  el.className = 'status ' + (has ? 'ok' : '');
  if (has) $('api-key').value = '';
}

$('save-key').onclick = () => {
  const v = $('api-key').value.trim();
  if (!v) return;
  try { localStorage.setItem(KEY_NAME, v); } catch (e) { /* ignore */ }
  state.key = v;
  refreshKeyStatus();
};
$('hunt').onclick = runPipeline;
$('copy-letter').onclick = () => {
  navigator.clipboard.writeText(state.letter).catch(() => {});
};
$('dl-json').onclick = () => {
  const blob = new Blob([JSON.stringify({ profile: profileText(), results: state.ranked }, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'hocbong-hunter-results.json';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
};

state.key = getKey();
refreshKeyStatus();
