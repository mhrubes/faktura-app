const http = require("http");
const fs = require("fs").promises;
const path = require("path");

const DATA_VERSION = 1;

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".ico": "image/x-icon",
};

function createFakturaServer(options = {}) {
  const staticRoot = options.staticRoot || __dirname;
  const dataRoot = options.dataRoot || __dirname;
  const invoicesDir = path.join(dataRoot, "data", "invoices");
  const templateFile = path.join(dataRoot, "data", "sablona.json");
  let listenPort =
    options.port !== undefined ? Number(options.port) : Number(process.env.PORT) || 3000;

  function sendJson(res, status, data) {
    res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify(data));
  }

  function sendError(res, status, message) {
    sendJson(res, status, { error: message });
  }

  function parseBody(req) {
    return new Promise((resolve, reject) => {
      let body = "";
      req.on("data", (chunk) => {
        body += chunk;
      });
      req.on("end", () => {
        try {
          resolve(body ? JSON.parse(body) : null);
        } catch {
          reject(new Error("Neplatný JSON v těle požadavku."));
        }
      });
      req.on("error", reject);
    });
  }

  function safeId(id) {
    return String(id || "").replace(/[^a-zA-Z0-9_-]/g, "");
  }

  function invoiceFilePath(id) {
    const safe = safeId(id);
    if (!safe) throw new Error("Chybí ID faktury.");
    return path.join(invoicesDir, `${safe}.json`);
  }

  function legacyInvoiceFilePath(id) {
    const safe = safeId(id);
    if (!safe) throw new Error("Chybí ID faktury.");
    return path.join(invoicesDir, `${safe}.txt`);
  }

  function invoiceToJsonContent(invoice) {
    return JSON.stringify(
      {
        type: "faktura-app-invoice",
        version: DATA_VERSION,
        exportedAt: new Date().toISOString(),
        data: invoice,
      },
      null,
      2
    );
  }

  function templateToJsonContent(template) {
    return JSON.stringify(
      {
        type: "faktura-app-template",
        version: DATA_VERSION,
        savedAt: new Date().toISOString(),
        data: template,
      },
      null,
      2
    );
  }

  function parseInvoiceContent(text) {
    const parsed = JSON.parse(text);
    if (parsed?.type === "faktura-app-invoice" && parsed.data) return parsed.data;
    if (parsed?.invoiceNumber || parsed?.supplier) return parsed;
    throw new Error("Neplatný formát souboru faktury.");
  }

  function parseTemplateContent(text) {
    const parsed = JSON.parse(text);
    if (parsed?.type === "faktura-app-template" && parsed.data) return parsed.data;
    if (parsed?.supplier || parsed?.payment) return parsed;
    throw new Error("Neplatný formát šablony.");
  }

  async function ensureDataDirs() {
    await fs.mkdir(invoicesDir, { recursive: true });
  }

  async function migrateLegacyDataFiles() {
    const legacyTemplate = path.join(dataRoot, "data", "sablona.txt");
    try {
      await fs.access(legacyTemplate);
      try {
        await fs.access(templateFile);
      } catch {
        await fs.rename(legacyTemplate, templateFile);
      }
    } catch {
      // žádná stará šablona
    }

    let files = [];
    try {
      files = await fs.readdir(invoicesDir);
    } catch {
      return;
    }

    for (const file of files) {
      if (!file.endsWith(".txt")) continue;
      const jsonName = file.replace(/\.txt$/i, ".json");
      const from = path.join(invoicesDir, file);
      const to = path.join(invoicesDir, jsonName);
      try {
        await fs.access(to);
        await fs.unlink(from);
      } catch {
        await fs.rename(from, to);
      }
    }
  }

  async function readInvoiceById(id) {
    try {
      const content = await fs.readFile(invoiceFilePath(id), "utf-8");
      return parseInvoiceContent(content);
    } catch (err) {
      if (err.code !== "ENOENT") throw err;
      const content = await fs.readFile(legacyInvoiceFilePath(id), "utf-8");
      return parseInvoiceContent(content);
    }
  }

  async function listInvoices() {
    const files = await fs.readdir(invoicesDir);
    const invoices = [];
    const seen = new Set();

    for (const file of files) {
      if (!file.endsWith(".json") && !file.endsWith(".txt")) continue;
      try {
        const invoice = parseInvoiceContent(
          await fs.readFile(path.join(invoicesDir, file), "utf-8")
        );
        if (seen.has(invoice.id)) continue;
        seen.add(invoice.id);
        invoices.push(invoice);
      } catch {
        // poškozený soubor přeskočíme
      }
    }

    invoices.sort((a, b) => {
      const aTime = new Date(a.updatedAt || a.savedAt || 0).getTime();
      const bTime = new Date(b.updatedAt || b.savedAt || 0).getTime();
      return bTime - aTime;
    });

    return invoices;
  }

  async function saveInvoiceRecord(invoice) {
    const now = new Date().toISOString();
    const id = safeId(invoice.id) || `inv-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    let createdAt = now;

    try {
      const existing = await readInvoiceById(id);
      createdAt = existing.createdAt || now;
    } catch {
      // nová faktura
    }

    const record = {
      ...invoice,
      id,
      version: DATA_VERSION,
      createdAt,
      savedAt: now,
      updatedAt: now,
    };

    await fs.writeFile(invoiceFilePath(id), invoiceToJsonContent(record), "utf-8");

    try {
      await fs.unlink(legacyInvoiceFilePath(id));
    } catch {
      // starý .txt soubor nemusí existovat
    }

    return record;
  }

  async function deleteInvoiceById(id) {
    try {
      await fs.unlink(invoiceFilePath(id));
    } catch (err) {
      if (err.code !== "ENOENT") throw err;
    }
    try {
      await fs.unlink(legacyInvoiceFilePath(id));
    } catch (err) {
      if (err.code !== "ENOENT") throw err;
    }
  }

  async function readTemplate() {
    try {
      const content = await fs.readFile(templateFile, "utf-8");
      return parseTemplateContent(content);
    } catch (err) {
      if (err.code === "ENOENT") return null;
      throw err;
    }
  }

  async function saveTemplateRecord(template) {
    const record = {
      ...template,
      version: DATA_VERSION,
      savedAt: new Date().toISOString(),
    };
    await fs.mkdir(path.dirname(templateFile), { recursive: true });
    await fs.writeFile(templateFile, templateToJsonContent(record), "utf-8");

    const legacyTemplate = path.join(dataRoot, "data", "sablona.txt");
    try {
      await fs.unlink(legacyTemplate);
    } catch {
      // starý .txt soubor nemusí existovat
    }

    return record;
  }

  async function serveStatic(req, res) {
    const urlPath = decodeURIComponent(req.url.split("?")[0]);
    const filePath = path.join(staticRoot, urlPath === "/" ? "index.html" : urlPath.replace(/^\//, ""));

    if (!filePath.startsWith(staticRoot)) {
      sendError(res, 403, "Přístup odepřen.");
      return;
    }

    try {
      const stat = await fs.stat(filePath);
      if (!stat.isFile()) {
        sendError(res, 404, "Soubor nenalezen.");
        return;
      }

      const ext = path.extname(filePath).toLowerCase();
      const content = await fs.readFile(filePath);
      res.writeHead(200, { "Content-Type": MIME_TYPES[ext] || "application/octet-stream" });
      res.end(content);
    } catch (err) {
      if (err.code === "ENOENT") {
        sendError(res, 404, "Soubor nenalezen.");
        return;
      }
      throw err;
    }
  }

  async function handleApi(req, res) {
    const url = new URL(req.url, `http://localhost:${listenPort}`);
    const parts = url.pathname.split("/").filter(Boolean);

    if (parts[0] !== "api") {
      sendError(res, 404, "Endpoint nenalezen.");
      return;
    }

    try {
      if (parts[1] === "invoices" && parts.length === 2 && req.method === "GET") {
        sendJson(res, 200, await listInvoices());
        return;
      }

      if (parts[1] === "invoices" && parts.length === 2 && req.method === "POST") {
        const body = await parseBody(req);
        const saved = await saveInvoiceRecord(body || {});
        sendJson(res, 201, saved);
        return;
      }

      if (parts[1] === "invoices" && parts.length === 3 && req.method === "GET") {
        const invoice = await readInvoiceById(parts[2]);
        sendJson(res, 200, invoice);
        return;
      }

      if (parts[1] === "invoices" && parts.length === 3 && req.method === "PUT") {
        const body = await parseBody(req);
        const saved = await saveInvoiceRecord({ ...body, id: parts[2] });
        sendJson(res, 200, saved);
        return;
      }

      if (parts[1] === "invoices" && parts.length === 3 && req.method === "DELETE") {
        await deleteInvoiceById(parts[2]);
        res.writeHead(204);
        res.end();
        return;
      }

      if (parts[1] === "template" && req.method === "GET") {
        sendJson(res, 200, await readTemplate());
        return;
      }

      if (parts[1] === "template" && req.method === "PUT") {
        const body = await parseBody(req);
        const saved = await saveTemplateRecord(body || {});
        sendJson(res, 200, saved);
        return;
      }

      sendError(res, 404, "Endpoint nenalezen.");
    } catch (err) {
      const status = err.code === "ENOENT" ? 404 : 400;
      sendError(res, status, err.message || "Chyba API.");
    }
  }

  const server = http.createServer(async (req, res) => {
    try {
      if (req.url.startsWith("/api/")) {
        await handleApi(req, res);
        return;
      }
      await serveStatic(req, res);
    } catch (err) {
      console.error(err);
      sendError(res, 500, "Interní chyba serveru.");
    }
  });

  return {
    server,
    get port() {
      return listenPort;
    },
    get invoicesDir() {
      return invoicesDir;
    },
    async start() {
      await ensureDataDirs();
      await migrateLegacyDataFiles();
      return new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen(listenPort, () => {
          listenPort = server.address().port;
          resolve({ port: listenPort, invoicesDir, dataRoot, staticRoot });
        });
      });
    },
    stop() {
      return new Promise((resolve) => {
        server.close(() => resolve());
      });
    },
  };
}

module.exports = { createFakturaServer };

if (require.main === module) {
  const instance = createFakturaServer();
  instance.start().then(({ port, invoicesDir }) => {
    console.log(`Faktura-app běží na http://localhost:${port}`);
    console.log(`Faktury se ukládají do: ${invoicesDir}`);
  });
}
