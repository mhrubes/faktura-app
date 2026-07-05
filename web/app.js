function formatCurrency(value) {
  return Number(value).toLocaleString("cs-CZ", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function parseNumber(value) {
  const cleaned = String(value).trim().replace(/\s/g, "").replace(",", ".");
  const num = parseFloat(cleaned);
  return Number.isFinite(num) ? num : 0;
}

function formatAccountingValue(value) {
  return formatCurrency(parseNumber(value));
}

function formatAccountingInput(input) {
  input.value = formatAccountingValue(input.value);
}

function formatUnitInput(input) {
  const val = input.value.trim();
  if (/^\d+([.,]\d+)?$/.test(val)) {
    const num = parseNumber(val);
    input.value = Number.isInteger(num) ? String(num) : formatAccountingValue(num);
  }
}

function onAccountingFocus(input) {
  const num = parseNumber(input.value);
  input.value = input.value.trim() === "" ? "" : String(num).replace(".", ",");
  input.select();
}

function formatRowNumericCells(row) {
  row.querySelectorAll(".qty, .unit-price").forEach(formatAccountingInput);
  const unit = row.querySelector(".unit");
  if (unit) formatUnitInput(unit);
}

function formatDateCs(isoDate) {
  if (!isoDate) return "";
  const [y, m, d] = isoDate.split("-");
  return `${d}.${m}.${y}`;
}

function showToast(message, type = "success") {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.remove("bg-neutral-800", "bg-red-600");
  toast.classList.add(type === "error" ? "bg-red-600" : "bg-neutral-800");
  toast.classList.remove("hidden");
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => toast.classList.add("hidden"), type === "error" ? 4000 : 2800);
}

function calculateRowTotal(row) {
  const qty = parseNumber(row.querySelector(".qty").value);
  const price = parseNumber(row.querySelector(".unit-price").value);
  const total = qty * price;
  row.querySelector(".row-total").textContent = formatCurrency(total);
  return total;
}

function calculateGrandTotal() {
  const rows = document.querySelectorAll(".item-row");
  let sum = 0;
  rows.forEach((row) => {
    sum += calculateRowTotal(row);
  });
  const formatted = formatCurrency(sum);
  document.getElementById("grand-total").textContent = `${formatted} Kč`;
  document.getElementById("payment-total").textContent = `${formatted} Kč`;
  PaymentQr.updatePaymentQr();
  return sum;
}

let rowPendingRemoval = null;

function openRemoveModal(row) {
  rowPendingRemoval = row;
  const desc = row.querySelector(".desc")?.value.trim();
  const textEl = document.getElementById("remove-modal-text");
  textEl.textContent = desc
    ? `Opravdu chcete odebrat položku „${desc}"?`
    : "Opravdu chcete odebrat tuto položku z faktury?";
  document.getElementById("remove-modal").classList.remove("hidden");
  document.body.classList.add("overflow-hidden");
  document.getElementById("remove-modal-confirm").focus();
}

function closeRemoveModal() {
  rowPendingRemoval = null;
  document.getElementById("remove-modal").classList.add("hidden");
  document.body.classList.remove("overflow-hidden");
}

function confirmRemoveRow() {
  if (rowPendingRemoval) {
    rowPendingRemoval.remove();
    calculateGrandTotal();
  }
  closeRemoveModal();
}

function initRemoveModal() {
  document.getElementById("remove-modal-cancel").addEventListener("click", closeRemoveModal);
  document.getElementById("remove-modal-confirm").addEventListener("click", confirmRemoveRow);
  document.getElementById("remove-modal-backdrop").addEventListener("click", closeRemoveModal);

  document.addEventListener("keydown", (e) => {
    const modal = document.getElementById("remove-modal");
    if (e.key === "Escape" && !modal.classList.contains("hidden")) {
      closeRemoveModal();
    }
  });
}

function createItemRowElement(item = {}) {
  const row = document.createElement("tr");
  row.className = "item-row";
  row.innerHTML = `
    <td class="border border-neutral-500 p-1.5 align-middle text-invoice-sm">
      <input type="text" class="desc" placeholder="Označení dodávky">
    </td>
    <td class="col-qty border border-neutral-500 p-1.5 align-middle text-invoice-sm">
      <input type="text" class="qty numeric-cell text-right" inputmode="decimal">
    </td>
    <td class="col-unit border border-neutral-500 p-1.5 align-middle text-invoice-sm">
      <input type="text" class="unit text-center">
    </td>
    <td class="col-price border border-neutral-500 p-1.5 align-middle text-invoice-sm">
      <input type="text" class="unit-price numeric-cell text-right" inputmode="decimal">
    </td>
    <td class="row-total border border-neutral-500 p-1.5 text-right text-invoice-sm font-bold tabular-nums">0,00</td>
    <td class="no-print cell-action">
      <button type="button" class="btn-remove h-6 w-6 cursor-pointer rounded border border-[#ccc] bg-white text-base leading-none text-red-600 hover:bg-red-50" title="Odebrat řádek" aria-label="Odebrat řádek">×</button>
    </td>
  `;

  row.querySelector(".desc").value = item.desc ?? "";
  row.querySelector(".qty").value = item.qty ?? "1,00";
  row.querySelector(".unit").value = item.unit ?? "ks";
  row.querySelector(".unit-price").value = item.unitPrice ?? "0,00";
  return row;
}

function createItemRow(item) {
  const tbody = document.getElementById("items-body");
  const row = createItemRowElement(item);
  tbody.appendChild(row);
  formatRowNumericCells(row);
  bindRowEvents(row);
  calculateGrandTotal();
}

function rebuildItemRows(items) {
  const tbody = document.getElementById("items-body");
  tbody.innerHTML = "";
  const list = items?.length ? items : [{ desc: "", qty: "1,00", unit: "ks", unitPrice: "0,00" }];
  list.forEach((item) => {
    const row = createItemRowElement(item);
    tbody.appendChild(row);
    formatRowNumericCells(row);
    bindRowEvents(row);
  });
  calculateGrandTotal();
}

function bindRowEvents(row) {
  row.querySelectorAll(".qty, .unit-price").forEach((input) => {
    input.addEventListener("input", calculateGrandTotal);
    input.addEventListener("focus", () => onAccountingFocus(input));
    input.addEventListener("blur", () => {
      formatAccountingInput(input);
      calculateGrandTotal();
    });
  });

  const unitInput = row.querySelector(".unit");
  if (unitInput) {
    unitInput.addEventListener("blur", () => formatUnitInput(unitInput));
  }

  const removeBtn = row.querySelector(".btn-remove");
  if (removeBtn) {
    removeBtn.addEventListener("click", () => {
      const rows = document.querySelectorAll(".item-row");
      if (rows.length <= 1) return;
      openRemoveModal(row);
    });
  }
}

function replaceInputWithSpan(input) {
  const span = document.createElement("span");
  span.className = "pdf-text-replacement";
  span.textContent = input.value;
  span.dataset.for = input.id || `input-${Math.random().toString(36).slice(2)}`;
  if (!input.id) input.id = span.dataset.for;
  input.style.display = "none";
  input.insertAdjacentElement("afterend", span);
  return span;
}

function fixSectionLabelsForPdf() {
  document.querySelectorAll(".section-label").forEach((label) => {
    const span = label.querySelector("span");
    if (!span) return;
    const rect = span.getBoundingClientRect();
    const needed = Math.ceil(Math.max(rect.width, rect.height)) + 4;
    label.style.minHeight = `${needed}px`;
  });
}

function resetSectionLabels() {
  document.querySelectorAll(".section-label").forEach((label) => {
    label.style.minHeight = "";
  });
}

let pdfPrevDark = false;
let pdfPrevColorScheme = "";
let pdfColorOverrides = [];
let pdfQrWasVisible = null;
let pdfExportPromise = null;

function forcePdfBarColors() {
  pdfColorOverrides = [];
  document.querySelectorAll("#invoice .payment-bar, #invoice .recap-bar").forEach((bar) => {
    pdfColorOverrides.push([bar, bar.getAttribute("style")]);
    bar.style.backgroundColor = "#00b5c8";
    bar.style.color = "#ffffff";
    bar.querySelectorAll("*").forEach((child) => {
      pdfColorOverrides.push([child, child.getAttribute("style")]);
      child.style.color = "#ffffff";
    });
  });
}

function restorePdfBarColors() {
  pdfColorOverrides.forEach(([el, style]) => {
    if (style === null) {
      el.removeAttribute("style");
    } else {
      el.setAttribute("style", style);
    }
  });
  pdfColorOverrides = [];
}

function prepareForPdf() {
  document.body.classList.add("pdf-exporting");
  pdfPrevDark = document.documentElement.classList.contains("dark");
  if (pdfPrevDark) document.documentElement.classList.remove("dark");
  pdfPrevColorScheme = document.documentElement.style.colorScheme;
  document.documentElement.style.colorScheme = "light";
  fixSectionLabelsForPdf();

  document.querySelectorAll(".item-row").forEach((row) => {
    row.querySelectorAll(".qty, .desc, .unit-price, .unit").forEach((input) => {
      if (input.matches(".qty, .unit-price")) {
        formatAccountingInput(input);
      } else if (input.matches(".unit")) {
        formatUnitInput(input);
      }
      input.setAttribute("value", input.value);
    });
  });

  document.querySelectorAll("input[type='text'], input[type='email'], input[type='number']").forEach((input) => {
    if (input.type === "date") return;
    input.setAttribute("value", input.value);
  });

  document.querySelectorAll("input[type='date']").forEach((input) => {
    const span = document.createElement("span");
    span.className = "pdf-date-replacement";
    span.textContent = formatDateCs(input.value);
    span.dataset.for = input.id;
    input.style.display = "none";
    input.insertAdjacentElement("afterend", span);
  });

  document.querySelectorAll(".payment-line input, .payment-select").forEach((el) => {
    if (el.tagName === "SELECT") {
      const span = document.createElement("span");
      span.className = "pdf-text-replacement";
      span.textContent = el.value;
      span.dataset.for = el.id;
      el.style.display = "none";
      el.insertAdjacentElement("afterend", span);
    } else if (el.offsetParent !== null) {
      replaceInputWithSpan(el);
    }
  });

  forcePdfBarColors();

  const includeQrInPdf =
    PaymentQr.shouldShowQr() && document.getElementById("pdf-include-qr")?.checked !== false;
  const qrWrap = document.getElementById("payment-qr-wrap");
  if (qrWrap && !includeQrInPdf) {
    pdfQrWasVisible = !qrWrap.classList.contains("hidden");
    qrWrap.classList.add("hidden");
  } else {
    pdfQrWasVisible = null;
  }
}

function formatPrintDate() {
  const today = new Date();
  const d = String(today.getDate()).padStart(2, "0");
  const m = String(today.getMonth() + 1).padStart(2, "0");
  const y = today.getFullYear();
  return `${d}.${m}.${y}`;
}

function addPdfFooters(pdf) {
  const totalPages = pdf.internal.getNumberOfPages();
  const printedBy = document.getElementById("supplier-name")?.value.trim() || "";
  const printDate = formatPrintDate();
  const leftText = printedBy
    ? `Vytiskl(a): ${printedBy}, ${printDate}`
    : `Vytiskl(a): , ${printDate}`;

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const footerY = pageHeight - 6;
  const lineY = footerY - 3;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(90, 90, 90);
  pdf.setDrawColor(210, 210, 210);
  pdf.setLineWidth(0.2);

  for (let page = 1; page <= totalPages; page += 1) {
    pdf.setPage(page);
    pdf.line(8, lineY, pageWidth - 8, lineY);
    pdf.text(leftText, 8, footerY);

    const pageText = `Strana ${page}/${totalPages}`;
    const pageTextWidth = pdf.getTextWidth(pageText);
    pdf.text(pageText, pageWidth - 8 - pageTextWidth, footerY);
  }
}

function restoreAfterPdf() {
  document.body.classList.remove("pdf-exporting");
  if (pdfPrevDark) document.documentElement.classList.add("dark");
  document.documentElement.style.colorScheme = pdfPrevColorScheme;
  restorePdfBarColors();
  resetSectionLabels();

  document.querySelectorAll(".pdf-date-replacement, .pdf-text-replacement").forEach((span) => {
    const input = document.getElementById(span.dataset.for);
    if (input) input.style.display = "";
    span.remove();
  });

  if (pdfQrWasVisible !== null) {
    const qrWrap = document.getElementById("payment-qr-wrap");
    if (qrWrap) qrWrap.classList.toggle("hidden", !pdfQrWasVisible);
    pdfQrWasVisible = null;
  }
}

function getInputDisplayValue(originalInput) {
  if (!originalInput) return "";
  const value = originalInput.value;
  if (originalInput.matches(".qty, .unit-price")) return formatAccountingValue(value);
  if (originalInput.matches(".unit")) {
    const val = value.trim();
    if (/^\d+([.,]\d+)?$/.test(val)) {
      const num = parseNumber(val);
      return Number.isInteger(num) ? String(num) : formatAccountingValue(num);
    }
    return val;
  }
  if (originalInput.type === "date") return formatDateCs(value);
  return value;
}

function replaceCloneFieldWithSpan(cloneField, originalField, className = "pdf-text-replacement") {
  if (!cloneField || !originalField) return;
  const span = document.createElement("span");
  span.className = className;
  span.textContent = getInputDisplayValue(originalField);
  cloneField.replaceWith(span);
}

function copySectionLabelHeights(fromRoot, toRoot) {
  const fromLabels = fromRoot.querySelectorAll(".section-label");
  const toLabels = toRoot.querySelectorAll(".section-label");
  toLabels.forEach((label, index) => {
    const sourceLabel = fromLabels[index];
    const sourceSpan = sourceLabel?.querySelector("span");
    if (!sourceSpan) return;
    const rect = sourceSpan.getBoundingClientRect();
    label.style.minHeight = `${Math.ceil(Math.max(rect.width, rect.height)) + 4}px`;
  });
}

function applyPdfBarColorsToRoot(root) {
  root.querySelectorAll(".payment-bar, .recap-bar").forEach((bar) => {
    bar.style.backgroundColor = "#00b5c8";
    bar.style.color = "#ffffff";
    bar.querySelectorAll("*").forEach((child) => {
      child.style.color = "#ffffff";
    });
  });
}

function prepareInvoiceCloneForPdf(invoiceEl) {
  const clone = invoiceEl.cloneNode(true);
  const originalCanvases = invoiceEl.querySelectorAll("canvas");
  const clonedCanvases = clone.querySelectorAll("canvas");

  clonedCanvases.forEach((canvas, index) => {
    const source = originalCanvases[index];
    if (!source) {
      canvas.remove();
      return;
    }

    try {
      const img = document.createElement("img");
      img.src = source.toDataURL("image/png");
      img.width = source.width;
      img.height = source.height;
      img.className = canvas.className;
      if (canvas.getAttribute("style")) img.setAttribute("style", canvas.getAttribute("style"));
      img.alt = canvas.getAttribute("aria-label") || "QR platba";
      canvas.replaceWith(img);
    } catch {
      canvas.remove();
    }
  });

  copySectionLabelHeights(invoiceEl, clone);

  clone.querySelectorAll("input[type='date']").forEach((input) => {
    const orig = input.id ? document.getElementById(input.id) : null;
    replaceCloneFieldWithSpan(input, orig, "pdf-date-replacement");
  });

  clone.querySelectorAll(".payment-line input, .payment-select").forEach((el) => {
    const orig = el.id ? document.getElementById(el.id) : null;
    if (el.tagName === "SELECT") {
      replaceCloneFieldWithSpan(el, orig);
      return;
    }
    if (orig && orig.offsetParent !== null) {
      replaceCloneFieldWithSpan(el, orig);
    }
  });

  const origRows = invoiceEl.querySelectorAll(".item-row");
  clone.querySelectorAll(".item-row").forEach((row, rowIndex) => {
    const origRow = origRows[rowIndex];
    if (!origRow) return;
    row.querySelectorAll(".qty, .desc, .unit-price, .unit").forEach((input) => {
      const fieldClass = ["qty", "desc", "unit-price", "unit"].find((name) => input.classList.contains(name));
      if (!fieldClass) return;
      replaceCloneFieldWithSpan(input, origRow.querySelector(`.${fieldClass}`));
    });
  });

  clone.querySelectorAll("input[type='text'], input[type='email'], input[type='number']").forEach((input) => {
    const orig = input.id ? document.getElementById(input.id) : null;
    if (!orig) return;
    input.setAttribute("value", getInputDisplayValue(orig));
  });

  applyPdfBarColorsToRoot(clone);

  ["payment-total", "grand-total"].forEach((id) => {
    const orig = document.getElementById(id);
    const cloneEl = clone.querySelector(`#${id}`);
    if (orig && cloneEl) cloneEl.textContent = orig.textContent;
  });

  const includeQrInPdf =
    PaymentQr.shouldShowQr() && document.getElementById("pdf-include-qr")?.checked !== false;
  const qrWrap = clone.querySelector("#payment-qr-wrap");
  const origQrWrap = invoiceEl.querySelector("#payment-qr-wrap");
  if (qrWrap && origQrWrap) {
    if (includeQrInPdf && !origQrWrap.classList.contains("hidden")) {
      qrWrap.classList.remove("hidden");
    } else if (!includeQrInPdf) {
      qrWrap.classList.add("hidden");
    }
  }

  return clone;
}

function buildPdfFooterLeftText() {
  const printedBy = document.getElementById("supplier-name")?.value.trim() || "";
  const printDate = formatPrintDate();
  return printedBy ? `Vytiskl(a): ${printedBy}, ${printDate}` : `Vytiskl(a): , ${printDate}`;
}

let cachedTailwindCssPromise = null;

function getTailwindCssText() {
  if (!cachedTailwindCssPromise) {
    cachedTailwindCssPromise = fetch(`${window.location.origin}/css/tailwind.css`).then((response) => {
      if (!response.ok) throw new Error("Nepodařilo se načíst styly pro PDF.");
      return response.text();
    });
  }
  return cachedTailwindCssPromise;
}

function escapePdfHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function buildInvoicePdfHtml(invoiceEl) {
  const cssText = await getTailwindCssText();
  const clone = prepareInvoiceCloneForPdf(invoiceEl);
  const number = document.getElementById("invoice-number")?.value.trim() || "faktura";
  const documentTitle = `Faktura ${number}`;
  return `<!DOCTYPE html>
<html lang="cs">
<head>
  <meta charset="utf-8">
  <title>${escapePdfHtml(documentTitle)}</title>
  <style>
    @page { size: A4; margin: 0; }
    html, body {
      margin: 0;
      padding: 0;
      background: #fff;
      font-family: "Segoe UI", Arial, Helvetica, sans-serif;
    }
    ${cssText}
  </style>
</head>
<body class="pdf-exporting">
${clone.outerHTML}
</body>
</html>`;
}

async function downloadPdfBlob(filename, blob) {
  const buffer = await blob.arrayBuffer();
  const downloadBlob = new Blob([buffer], { type: "application/octet-stream" });
  const url = URL.createObjectURL(downloadBlob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.cssText = "position:fixed;left:-9999px;top:-9999px;visibility:hidden;";
  document.body.appendChild(link);
  link.click();

  window.setTimeout(() => {
    link.remove();
    URL.revokeObjectURL(url);
  }, 2000);
}

async function downloadPdfViaServer(invoiceEl, filename, documentTitle) {
  const response = await fetch("/api/pdf", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      html: await buildInvoicePdfHtml(invoiceEl),
      footerLeft: buildPdfFooterLeftText(),
      filename,
      title: documentTitle,
    }),
  });

  if (!response.ok) {
    let message = "PDF se nepodařilo vygenerovat.";
    try {
      const data = await response.json();
      if (data?.error) message = data.error;
    } catch {
      // ignore parse errors
    }
    throw new Error(message);
  }

  const blob = await response.blob();
  await downloadPdfBlob(filename, blob);
}

function downloadPdfViaCanvas(invoiceEl, filename, documentTitle) {
  const optionsPdf = {
    margin: [0, 0, 14, 0],
    filename,
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      letterRendering: true,
      scrollX: 0,
      scrollY: 0,
    },
    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    pagebreak: { mode: ["avoid-all", "css", "legacy"] },
  };

  return html2pdf()
    .set(optionsPdf)
    .from(invoiceEl)
    .toPdf()
    .get("pdf")
    .then(async (pdf) => {
      addPdfFooters(pdf);
      if (documentTitle && typeof pdf.setProperties === "function") {
        pdf.setProperties({ title: documentTitle });
      }
      const blob = pdf.output("blob");
      await downloadPdfBlob(filename, blob);
    });
}

function notifyPdfExportResult(ok, message) {
  if (window.parent === window) return;
  window.parent.postMessage(
    {
      type: "faktura-pdf-export",
      ok,
      message: message || "",
      id: document.getElementById("invoice-root")?.dataset.invoiceId || "",
    },
    window.location.origin
  );
}

function downloadPdf(options = {}) {
  if (pdfExportPromise) return pdfExportPromise;

  pdfExportPromise = runDownloadPdf(options).finally(() => {
    pdfExportPromise = null;
  });

  return pdfExportPromise;
}

function runDownloadPdf(options = {}) {
  const { silent = false } = options;
  const btn = document.getElementById("btn-pdf");

  if (!silent && btn) {
    btn.disabled = true;
    btn.textContent = "Generuji PDF…";
  }

  const invoice = document.getElementById("invoice");
  const number = document.getElementById("invoice-number").value.trim() || "faktura";
  const filename = `faktura-${number.replace(/[/\\?%*:|"<>]/g, "-")}.pdf`;
  const documentTitle = `Faktura ${number}`;

  const finishOk = () => {
    restoreAfterPdf();
    if (!silent && btn) {
      btn.disabled = false;
      btn.textContent = "Stáhnout PDF";
    }
  };

  const finishErr = (err, usedFallback = false) => {
    restoreAfterPdf();
    if (!silent && btn) {
      btn.disabled = false;
      btn.textContent = "Stáhnout PDF";
      const message = usedFallback
        ? "PDF se nepodařilo vygenerovat. Zkus obnovit stránku."
        : err?.message || "PDF se nepodařilo vygenerovat. Zkus obnovit stránku.";
      alert(message);
    }
    throw err;
  };

  return downloadPdfViaServer(invoice, filename, documentTitle)
    .then(finishOk)
    .catch((serverErr) => {
      window.scrollTo(0, 0);
      prepareForPdf();
      return downloadPdfViaCanvas(invoice, filename, documentTitle)
        .then(finishOk)
        .catch((canvasErr) => finishErr(canvasErr || serverErr, true));
    });
}

async function validateInvoiceNumberOrToast() {
  const numberInput = document.getElementById("invoice-number");
  const number = (numberInput?.value || "").trim();

  if (!number) {
    showToast("Vyplň číslo faktury (pole Faktura).", "error");
    numberInput?.focus();
    return false;
  }

  const currentId = document.getElementById("invoice-root")?.dataset.invoiceId || null;

  try {
    const invoices = await FakturaStorage.readInvoices();
    const duplicate = invoices.some(
      (inv) =>
        inv.id !== currentId &&
        String(inv.invoiceNumber || "").trim().toLowerCase() === number.toLowerCase()
    );
    if (duplicate) {
      showToast(`Faktura s číslem ${number} už existuje.`, "error");
      numberInput?.focus();
      return false;
    }
  } catch (err) {
    showToast(err.message || "Nepodařilo se ověřit číslo faktury.", "error");
    return false;
  }

  return true;
}

async function saveInvoice() {
  const btn = document.getElementById("btn-save");

  if (!(await validateInvoiceNumberOrToast())) return;

  btn.disabled = true;
  btn.textContent = "Ukládám…";

  const data = InvoiceModel.collectFromForm();
  const root = document.getElementById("invoice-root");
  if (root?.dataset.invoiceId) {
    data.id = root.dataset.invoiceId;
  }
  data.resolved = root?.dataset.resolved === "1";

  FakturaStorage.saveInvoice(data)
    .then(async (saved) => {
      root.dataset.invoiceId = saved.id;
      const location = await FakturaStorage.getSaveLocationLabel();
      showToast(`Faktura uložena (${location})`);
      document.title = `Faktura ${saved.invoiceNumber || saved.id} – editor`;
    })
    .catch((err) => {
      alert(err.message || "Uložení se nezdařilo.");
    })
    .finally(() => {
      btn.disabled = false;
      btn.textContent = "Uložit fakturu";
    });
}

function templateExists(template) {
  return Boolean(
    template &&
      (template.supplier?.name ||
        template.customer?.name ||
        template.payment?.accountNumber ||
        template.sourceInvoiceNumber)
  );
}

function buildTemplateInfoItems(template) {
  const items = [];
  if (template.sourceInvoiceNumber) items.push(`Z faktury č.: ${template.sourceInvoiceNumber}`);
  if (template.supplier?.name) items.push(`Dodavatel: ${template.supplier.name}`);
  if (template.supplier?.ico) items.push(`IČ: ${template.supplier.ico}`);
  if (template.customer?.name) items.push(`Odběratel: ${template.customer.name}`);
  items.push(`Počet položek: ${template.items?.length || 0}`);
  if (template.savedAt) {
    const saved = new Date(template.savedAt);
    if (!Number.isNaN(saved.getTime())) {
      items.push(`Uloženo: ${saved.toLocaleString("cs-CZ")}`);
    }
  }
  return items;
}

function openTemplateSaveModal(existing) {
  const exists = templateExists(existing);
  const title = document.getElementById("template-save-modal-title");
  const text = document.getElementById("template-save-modal-text");
  const confirmBtn = document.getElementById("template-save-modal-confirm");
  const existingBox = document.getElementById("template-save-existing");
  const existingInfo = document.getElementById("template-save-existing-info");

  if (exists) {
    title.textContent = "Přepsat uloženou šablonu?";
    text.textContent =
      "Šablona už existuje. Chceš ji přepsat údaji z této faktury (dodavatel, odběratel, platba, položky)?";
    confirmBtn.textContent = "Přepsat";
    existingInfo.innerHTML = buildTemplateInfoItems(existing)
      .map((line) => `<li>${line.replace(/</g, "&lt;")}</li>`)
      .join("");
    existingBox.classList.remove("hidden");
  } else {
    title.textContent = "Uložit jako šablonu?";
    text.textContent =
      "Chceš uložit údaje z této faktury jako šablonu (dodavatel, odběratel, platba, položky)?";
    confirmBtn.textContent = "Uložit";
    existingInfo.innerHTML = "";
    existingBox.classList.add("hidden");
  }

  document.getElementById("template-save-modal").classList.remove("hidden");
  document.body.classList.add("overflow-hidden");
  confirmBtn.focus();
}

function closeTemplateSaveModal() {
  document.getElementById("template-save-modal").classList.add("hidden");
  document.body.classList.remove("overflow-hidden");
}

async function saveTemplate() {
  if (!(await validateInvoiceNumberOrToast())) return;

  try {
    const existing = await FakturaStorage.getTemplate();
    openTemplateSaveModal(existing);
  } catch (err) {
    alert(err.message || "Nepodařilo se načíst stávající šablonu.");
  }
}

async function confirmSaveTemplate() {
  const btn = document.getElementById("template-save-modal-confirm");
  btn.disabled = true;

  const data = InvoiceModel.collectFromForm();
  const template = InvoiceModel.extractTemplateFromInvoice(data);

  try {
    await FakturaStorage.saveTemplate(template);
    closeTemplateSaveModal();
    const location = await FakturaStorage.getSaveLocationLabel();
    showToast(
      (await FakturaStorage.getStorageStatus()).storage === "postgres"
        ? `Šablona uložena (${location})`
        : "Šablona uložena do data/sablona.json"
    );
  } catch (err) {
    alert(err.message || "Uložení šablony se nezdařilo.");
  } finally {
    btn.disabled = false;
  }
}

function initTemplateSaveModal() {
  document.getElementById("template-save-modal-cancel").addEventListener("click", closeTemplateSaveModal);
  document.getElementById("template-save-modal-confirm").addEventListener("click", confirmSaveTemplate);
  document.getElementById("template-save-modal-close").addEventListener("click", closeTemplateSaveModal);
  document.getElementById("template-save-modal-backdrop").addEventListener("click", closeTemplateSaveModal);

  document.addEventListener("keydown", (e) => {
    const modal = document.getElementById("template-save-modal");
    if (e.key === "Escape" && !modal.classList.contains("hidden")) {
      closeTemplateSaveModal();
    }
  });
}

async function loadInvoiceFromParams() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  const copyFrom = params.get("copyFrom");
  const mode = params.get("mode");

  try {
    if (copyFrom) {
      const source = await FakturaStorage.getInvoice(copyFrom);
      const invoice = InvoiceModel.cloneFromInvoice(source);
      InvoiceModel.applyToForm(invoice, { rebuildRows: rebuildItemRows });
      const root = document.getElementById("invoice-root");
      if (root) {
        delete root.dataset.invoiceId;
        delete root.dataset.resolved;
      }
      const label = source.invoiceNumber || source.id;
      document.title = label ? `Kopie faktury ${label} – nová faktura` : "Nová faktura (kopie)";
      return;
    }

    if (id) {
      const invoice = await FakturaStorage.getInvoice(id);
      InvoiceModel.applyToForm(invoice, { rebuildRows: rebuildItemRows });
      const root = document.getElementById("invoice-root");
      if (root) root.dataset.resolved = invoice.resolved ? "1" : "";
      document.title = `Faktura ${invoice.invoiceNumber || invoice.id} – editor`;
      return;
    }

    let invoice = InvoiceModel.defaultEmptyInvoice();

    if (mode === "template" && (await FakturaStorage.hasTemplate())) {
      const template = await FakturaStorage.getTemplate();
      invoice = InvoiceModel.applyTemplateToInvoice(invoice, template);
    }

    InvoiceModel.applyToForm(invoice, { rebuildRows: rebuildItemRows });
  } catch (err) {
    alert(err.message || "Načtení faktury se nezdařilo.");
    window.location.href = "index.html";
  }
}

async function init() {
  const params = new URLSearchParams(window.location.search);
  const isBlankInvoice =
    !params.get("id") && !params.get("copyFrom") && params.get("mode") !== "template";
  const autoPdf = params.get("pdf") === "1";
  const isCopy = Boolean(params.get("copyFrom"));

  await loadInvoiceFromParams();

  document.getElementById("items-body").addEventListener("input", (e) => {
    if (e.target.matches(".qty, .unit-price")) {
      calculateGrandTotal();
    }
  });

  document.getElementById("btn-add-row").addEventListener("click", () => createItemRow());
  document.getElementById("btn-pdf").addEventListener("click", () => {
    downloadPdf().catch(() => {});
  });
  document.getElementById("btn-save").addEventListener("click", saveInvoice);
  document.getElementById("btn-save-template").addEventListener("click", saveTemplate);
  initRemoveModal();
  initTemplateSaveModal();
  PartySetupModal.init(showToast);
  CustomerAres.init(showToast);
  PaymentQr.bindPaymentQrUpdates();
  await PaymentQr.updatePaymentQr();

  if (isBlankInvoice && !autoPdf) {
    await PartySetupModal.maybeOpen(showToast);
  }

  if (isCopy) {
    showToast("Kopie faktury — uprav údaje a ulož jako novou.");
  }

  if (autoPdf) {
    try {
      await downloadPdf({ silent: true });
      notifyPdfExportResult(true);
    } catch (err) {
      notifyPdfExportResult(false, err?.message || "PDF se nepodařilo vygenerovat.");
    }
    return;
  }

  const vs = document.getElementById("variable-symbol");
  const invoiceNumber = document.getElementById("invoice-number");

  invoiceNumber.addEventListener("input", () => {
    if (!vs.dataset.manual) {
      vs.value = invoiceNumber.value.replace(/\D/g, "").slice(0, 10);
    }
  });

  vs.addEventListener("input", () => {
    vs.dataset.manual = "1";
  });
}

init();
