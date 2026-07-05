const fs = require("fs");

let puppeteerModule = null;
let browserPromise = null;

function loadPuppeteer() {
  if (puppeteerModule !== null) return puppeteerModule;
  try {
    puppeteerModule = require("puppeteer-core");
  } catch {
    puppeteerModule = false;
  }
  return puppeteerModule;
}

function resolveBrowserExecutable() {
  const fromEnv = process.env.PUPPETEER_EXECUTABLE_PATH || process.env.CHROME_PATH;
  if (fromEnv && fs.existsSync(fromEnv)) return fromEnv;

  const candidates = [];
  if (process.platform === "win32") {
    candidates.push(
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
      "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
    );
  } else if (process.platform === "darwin") {
    candidates.push(
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
      "/Applications/Chromium.app/Contents/MacOS/Chromium"
    );
  } else {
    candidates.push(
      "/usr/bin/google-chrome",
      "/usr/bin/google-chrome-stable",
      "/usr/bin/chromium",
      "/usr/bin/chromium-browser",
      "/snap/bin/chromium"
    );
  }

  return candidates.find((candidate) => fs.existsSync(candidate)) || null;
}

function escapeFooterText(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildFooterTemplate(footerLeft) {
  const left = escapeFooterText(footerLeft);
  return `<div style="box-sizing:border-box;width:100%;padding:2mm 8mm 0;font-size:9px;line-height:1.3;color:#5a5a5a;font-family:Arial,Helvetica,sans-serif;border-top:0.2mm solid #d2d2d2;display:flex;justify-content:space-between;align-items:flex-start;gap:8mm;">
  <span style="flex:1 1 auto;min-width:0;">${left}</span>
  <span style="flex:0 0 auto;white-space:nowrap;">Strana <span class="pageNumber"></span>/<span class="totalPages"></span></span>
</div>`;
}

function getPdfExportStatus() {
  const puppeteer = loadPuppeteer();
  const browserPath = resolveBrowserExecutable();
  return {
    available: Boolean(puppeteer && browserPath),
    engine: puppeteer && browserPath ? "chromium" : null,
    browserPath: browserPath || null,
  };
}

async function getBrowser() {
  const puppeteer = loadPuppeteer();
  const executablePath = resolveBrowserExecutable();
  if (!puppeteer || !executablePath) {
    throw new Error(
      "Pro PDF s výběrem textu je potřeba Google Chrome nebo Microsoft Edge (nebo proměnná PUPPETEER_EXECUTABLE_PATH)."
    );
  }

  if (!browserPromise) {
    browserPromise = puppeteer
      .launch({
        executablePath,
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox", "--font-render-hinting=none"],
      })
      .catch((err) => {
        browserPromise = null;
        throw err;
      });
  }

  return browserPromise;
}

async function renderHtmlToPdf({ html, footerLeft = "", title = "Faktura" }) {
  if (!html || typeof html !== "string") {
    throw new Error("Chybí HTML obsah faktury pro PDF.");
  }

  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    await page.setContent(html, {
      waitUntil: "load",
      timeout: 45000,
    });
    await page.evaluate((docTitle) => {
      document.title = docTitle;
    }, title);

    return await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: true,
      headerTemplate: "<span></span>",
      footerTemplate: buildFooterTemplate(footerLeft),
      tagged: true,
      margin: {
        top: "0mm",
        right: "0mm",
        bottom: "14mm",
        left: "0mm",
      },
    });
  } finally {
    await page.close();
  }
}

async function shutdownPdfBrowser() {
  if (!browserPromise) return;
  try {
    const browser = await browserPromise;
    await browser.close();
  } catch {
    // ignore shutdown errors
  } finally {
    browserPromise = null;
  }
}

module.exports = {
  getPdfExportStatus,
  renderHtmlToPdf,
  shutdownPdfBrowser,
};
