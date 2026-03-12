const http = require("http");
const https = require("https");
const path = require("path");
const fs = require("fs");
const { URL } = require("url");

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
const PUBLIC_DIR = path.join(__dirname, "public");

function sendJson(res, statusCode, body) {
  const payload = JSON.stringify(body);
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Content-Length": Buffer.byteLength(payload),
  });
  res.end(payload);
}

function contentTypeFor(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".html") return "text/html; charset=utf-8";
  if (ext === ".js") return "text/javascript; charset=utf-8";
  if (ext === ".css") return "text/css; charset=utf-8";
  if (ext === ".json") return "application/json; charset=utf-8";
  if (ext === ".svg") return "image/svg+xml";
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  return "application/octet-stream";
}

function safeJoinPublic(urlPath) {
  const cleaned = (urlPath || "/").split("?")[0];
  const rel = cleaned === "/" ? "/index.html" : cleaned;
  const resolved = path.resolve(PUBLIC_DIR, "." + rel);
  if (!resolved.startsWith(path.resolve(PUBLIC_DIR))) return null;
  return resolved;
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (resp) => {
        let raw = "";
        resp.setEncoding("utf8");
        resp.on("data", (chunk) => (raw += chunk));
        resp.on("end", () => {
          try {
            const parsed = JSON.parse(raw);
            resolve({ statusCode: resp.statusCode || 0, body: parsed });
          } catch (err) {
            reject(err);
          }
        });
      })
      .on("error", reject);
  });
}

async function handleCepApi(req, res, urlObj) {
  const cepParam = (urlObj.searchParams.get("cep") || "").trim();
  const cepDigits = cepParam.replace(/\D/g, "");

  if (cepDigits.length !== 8) {
    sendJson(res, 400, { error: "CEP invalido. Use 8 numeros." });
    return;
  }

  const viaCepUrl = `https://viacep.com.br/ws/${cepDigits}/json/`;

  try {
    const { statusCode, body } = await fetchJson(viaCepUrl);
    if (statusCode < 200 || statusCode >= 300) {
      sendJson(res, 502, { error: "ViaCEP indisponivel no momento." });
      return;
    }
    if (body && body.erro) {
      sendJson(res, 404, { error: "CEP nao encontrado." });
      return;
    }
    sendJson(res, 200, body);
  } catch (_) {
    sendJson(res, 502, { error: "Falha ao consultar ViaCEP." });
  }
}

const server = http.createServer(async (req, res) => {
  const urlObj = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

  if (req.method === "GET" && urlObj.pathname === "/api/cep") {
    await handleCepApi(req, res, urlObj);
    return;
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Method Not Allowed");
    return;
  }

  const filePath = safeJoinPublic(urlObj.pathname);
  if (!filePath) {
    res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Bad Request");
    return;
  }

  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not Found");
      return;
    }

    res.writeHead(200, {
      "Content-Type": contentTypeFor(filePath),
      "Cache-Control": filePath.endsWith("index.html")
        ? "no-store"
        : "public, max-age=300",
    });

    if (req.method === "HEAD") {
      res.end();
      return;
    }

    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
