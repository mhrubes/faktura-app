const FakturaStorage = (() => {
  const API_BASE = "/api";
  const DATA_VERSION = 1;

  class StorageError extends Error {
    constructor(message, cause) {
      super(message);
      this.name = "StorageError";
      this.cause = cause;
    }
  }

  function generateId() {
    return `inv-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  async function apiFetch(path, options = {}) {
    try {
      const res = await fetch(`${API_BASE}${path}`, {
        headers: { "Content-Type": "application/json", ...(options.headers || {}) },
        ...options,
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new StorageError(payload.error || `Chyba serveru (${res.status}).`);
      }

      if (res.status === 204) return null;
      return res.json();
    } catch (err) {
      if (err instanceof StorageError) throw err;
      throw new StorageError(
        "Server neběží. Spusť aplikaci příkazem: npm start",
        err
      );
    }
  }

  async function readInvoices() {
    return apiFetch("/invoices");
  }

  async function getInvoice(id) {
    return apiFetch(`/invoices/${encodeURIComponent(id)}`);
  }

  async function saveInvoice(invoice) {
    const payload = { ...invoice, version: DATA_VERSION };
    if (payload.id) {
      return apiFetch(`/invoices/${encodeURIComponent(payload.id)}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
    }
    return apiFetch("/invoices", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async function deleteInvoice(id) {
    await apiFetch(`/invoices/${encodeURIComponent(id)}`, { method: "DELETE" });
  }

  async function getTemplate() {
    return apiFetch("/template");
  }

  async function saveTemplate(template) {
    return apiFetch("/template", {
      method: "PUT",
      body: JSON.stringify({ ...template, version: DATA_VERSION }),
    });
  }

  async function hasTemplate() {
    const template = await getTemplate();
    return Boolean(template && (template.supplier?.name || template.payment?.accountNumber));
  }

  function sanitizeFilename(value) {
    return String(value || "faktura").replace(/[/\\?%*:|"<>]/g, "-").trim() || "faktura";
  }

  function invoiceToTxtContent(invoice) {
    const payload = {
      type: "faktura-app-invoice",
      version: DATA_VERSION,
      exportedAt: new Date().toISOString(),
      data: invoice,
    };
    return JSON.stringify(payload, null, 2);
  }

  function downloadTxt(filename, content) {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  function downloadInvoiceTxt(invoice) {
    const number = sanitizeFilename(invoice.invoiceNumber);
    const filename = `faktura-${number}.txt`;
    downloadTxt(filename, invoiceToTxtContent(invoice));
  }

  function parseTxtContent(text) {
    const parsed = JSON.parse(text);
    if (parsed?.type === "faktura-app-invoice" && parsed.data) {
      return parsed.data;
    }
    if (parsed?.invoiceNumber || parsed?.supplier) {
      return parsed;
    }
    throw new Error("Neplatný formát souboru faktury.");
  }

  async function importInvoiceFromFile(file) {
    const text = await file.text();
    const invoice = parseTxtContent(text);
    if (!invoice.id) invoice.id = generateId();
    return saveInvoice(invoice);
  }

  function getInvoiceFileLabel(invoice) {
    return `${invoice.id}.txt`;
  }

  return {
    StorageError,
    generateId,
    getInvoice,
    saveInvoice,
    deleteInvoice,
    readInvoices,
    getTemplate,
    saveTemplate,
    hasTemplate,
    downloadInvoiceTxt,
    downloadTxt,
    importInvoiceFromFile,
    parseTxtContent,
    getInvoiceFileLabel,
  };
})();
