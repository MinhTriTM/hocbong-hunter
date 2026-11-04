/**
 * Học Bổng Hunter v3.0 — Zero-Exposure Backend Secure Proxy & Rate-Limiter Server
 * File: server.js
 * Bảo mật tuyệt đối API Key:
 *   - Đọc MODEL_API_KEY từ biến môi trường / file .env phía Server (Client F12 không bao giờ thấy Key).
 *   - Giới hạn cứng 5 lần hỏi (5 Sessions) cho mỗi Địa chỉ IP và mỗi Định danh MAC (X-Device-MAC) ngay trên Server.
 *   - Phục vụ luôn giao diện tĩnh (index.html, css/, js/) tại http://localhost:8080.
 */

const http = require("http");
const fs = require("fs");
const path = require("path");

// Đọc file .env cục bộ (nếu có) mà không cần thư viện ngoài
function loadDotEnv() {
  const envPath = path.join(__dirname, ".env");
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx > 0) {
      const k = trimmed.slice(0, eqIdx).trim();
      const v = trimmed.slice(eqIdx + 1).trim();
      if (!process.env[k]) process.env[k] = v;
    }
  }
}
loadDotEnv();

const PORT = Number(process.env.PORT || 8080);
const MAX_TURNS = Number(process.env.MAX_QUERIES_PER_IP_MAC || 5);
const SERVER_API_KEY = process.env.MODEL_API_KEY || "";

// Bộ nhớ lưu vết Quota phía Server theo IP, MAC và Session Token
const serverLedger = {
  ipCounts: new Map(),
  macCounts: new Map(),
  activeSessions: new Map(), // sessionId -> { ip, mac, expiresAt }
};

function getClientIP(req) {
  const xff = req.headers["x-forwarded-for"];
  if (xff) return String(xff).split(",")[0].trim();
  const cf = req.headers["cf-connecting-ip"];
  if (cf) return String(cf).trim();
  return req.socket?.remoteAddress || "127.0.0.1";
}

function getQuotaStatus(ip, mac) {
  const usedIp = serverLedger.ipCounts.get(ip) || 0;
  const usedMac = serverLedger.macCounts.get(mac) || 0;
  const used = Math.max(usedIp, usedMac);
  const remaining = Math.max(0, MAX_TURNS - used);
  return { ip, mac, used, remaining, maxTurns: MAX_TURNS, exhausted: remaining <= 0 };
}

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".md": "text/markdown; charset=utf-8",
};

const server = http.createServer(async (req, res) => {
  const urlObj = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const ip = getClientIP(req);
  const mac = String(req.headers["x-device-mac"] || "00:00:00:00:00:00").trim();

  // 1. Endpoint kiểm tra trạng thái Quota từ phía Server
  if (urlObj.pathname === "/api/quota-status" && req.method === "GET") {
    const st = getQuotaStatus(ip, mac);
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ proxyAvailable: !!SERVER_API_KEY, ...st }));
    return;
  }

  // 2. Endpoint mở 1 phiên hỏi (Tiêu thụ 1/5 lượt của IP & MAC trên Server)
  if (urlObj.pathname === "/api/start-session" && req.method === "POST") {
    if (!SERVER_API_KEY) {
      res.writeHead(503, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ ok: false, error: "Server chưa cấu hình MODEL_API_KEY trong .env." }));
      return;
    }
    const st = getQuotaStatus(ip, mac);
    if (st.exhausted) {
      res.writeHead(429, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({
        ok: false,
        status: st,
        error: `IP (${ip}) và MAC (${mac}) đã sử dụng hết ${MAX_TURNS}/${MAX_TURNS} lượt hỏi miễn phí.`,
      }));
      return;
    }

    const nextUsed = st.used + 1;
    serverLedger.ipCounts.set(ip, nextUsed);
    serverLedger.macCounts.set(mac, nextUsed);

    const sessionId = "sess_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
    serverLedger.activeSessions.set(sessionId, {
      ip,
      mac,
      expiresAt: Date.now() + 10 * 60 * 1000, // Phiên hợp lệ trong 10 phút cho 10 Node Agent chạy xong
    });

    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ ok: true, sessionId, status: getQuotaStatus(ip, mac) }));
    return;
  }

  // 3. Endpoint Proxy chuyển tiếp tới Meta Model API (Không bao giờ lộ API Key về trình duyệt)
  if (urlObj.pathname === "/api/meta-proxy" && req.method === "POST") {
    const sessionId = String(req.headers["x-hunter-session"] || "").trim();
    const sess = serverLedger.activeSessions.get(sessionId);
    if (!sess || sess.expiresAt < Date.now()) {
      res.writeHead(403, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ error: "Phiên truy vấn không hợp lệ hoặc đã hết hạn." }));
      return;
    }

    let bodyStr = "";
    req.on("data", chunk => { bodyStr += chunk; });
    req.on("end", async () => {
      try {
        const parsed = JSON.parse(bodyStr || "{}");
        const endpoint = parsed.endpoint === "chat/completions" ? "chat/completions" : "responses";
        const upstreamRes = await fetch(`https://api.meta.ai/v1/${endpoint}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${SERVER_API_KEY}`,
          },
          body: JSON.stringify(parsed.payload || {}),
        });
        const respText = await upstreamRes.text();
        res.writeHead(upstreamRes.status, { "Content-Type": "application/json; charset=utf-8" });
        res.end(respText);
      } catch (e) {
        res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // 4. Phục vụ file tĩnh của ứng dụng
  let safePath = path.normalize(decodeURIComponent(urlObj.pathname)).replace(/^(\.\.[\/\\])+/, "");
  if (safePath === "/" || safePath === "\\") safePath = "/index.html";

  // Chặn tuyệt đối truy cập vào .env hoặc server.js từ trình duyệt
  if (safePath.includes(".env") || safePath.includes("server.js") || safePath.includes(".git")) {
    res.writeHead(403);
    res.end("403 Forbidden — Zero-Exposure Security Guard");
    return;
  }

  const filePath = path.join(__dirname, safePath);
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { "Content-Type": MIME_TYPES[ext] || "application/octet-stream" });
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.writeHead(404);
    res.end("404 Not Found");
  }
});

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`🔒 Học Bổng Hunter v3.0 — Zero-Exposure Secure Server đang chạy tại http://localhost:${PORT}`);
    console.log(`🛡️ Hạn mức: ${MAX_TURNS} lần hỏi / mỗi IP & MAC · Trạng thái Key: ${SERVER_API_KEY ? "ĐÃ NẠP AN TOÀN TỪ .ENV" : "CHƯA CẤU HÌNH"}`);
  });
}

module.exports = { server, getQuotaStatus };
