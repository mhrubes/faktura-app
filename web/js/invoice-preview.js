const InvoicePreview = (() => {
  const LOUPE_SCALE = 0.78;
  const MINI_SCALE_MIN = 0.26;
  const MINI_SCALE_MAX = 0.44;
  const MINI_FIT_RATIO = 0.78;
  const DOC_WIDTH_MM = 210;
  const DOC_HEIGHT_MM = 297;

  function mmToPx(mm) {
    return mm * (96 / 25.4);
  }

  function getMiniScale(viewport) {
    if (!viewport) return MINI_SCALE_MIN;
    const container = viewport.parentElement;
    const available = Math.max(120, container?.clientWidth || viewport.clientWidth);
    const docWidthPx = mmToPx(DOC_WIDTH_MM);
    const fitScale = (available / docWidthPx) * MINI_FIT_RATIO;
    return Math.min(MINI_SCALE_MAX, Math.max(MINI_SCALE_MIN, fitScale));
  }

  function applyMiniScale(viewport, miniHost) {
    if (!viewport || !miniHost) return MINI_SCALE_MIN;
    const scale = getMiniScale(viewport);
    const frame = miniHost.querySelector(".invoice-preview-doc-frame");
    if (frame) {
      frame.style.setProperty("--preview-scale", String(scale));
    }
    viewport.dataset.previewScale = String(scale);
    return scale;
  }

  function esc(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function parseAmount(value) {
    const cleaned = String(value || "")
      .trim()
      .replace(/\s/g, "")
      .replace(",", ".");
    const num = parseFloat(cleaned);
    return Number.isFinite(num) ? num : 0;
  }

  function formatMoney(value) {
    return parseAmount(value).toLocaleString("cs-CZ", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  function formatDate(iso) {
    if (typeof InvoiceModel !== "undefined" && InvoiceModel.formatDateCs) {
      return InvoiceModel.formatDateCs(iso, "");
    }
    if (!iso) return "";
    const [y, m, d] = iso.split("-");
    return `${d}.${m}.${y}`;
  }

  function line(value, className = "party-line") {
    const text = esc(value || "");
    return text ? `<span class="${className}">${text}</span>` : "";
  }

  function buildItemsRows(items) {
    const list = items?.length ? items : [];
    if (!list.length) {
      return `<tr><td class="border border-neutral-500 p-1.5 text-invoice-sm" colspan="5">Bez položek</td></tr>`;
    }

    return list
      .map((item) => {
        const total = formatMoney(
          item.manualTotal
            ? parseAmount(item.total)
            : parseAmount(item.qty) * parseAmount(item.unitPrice)
        );
        return `
          <tr>
            <td class="border border-neutral-500 p-1.5 text-invoice-sm">${esc(item.desc || "")}</td>
            <td class="border border-neutral-500 p-1.5 text-right text-invoice-sm tabular-nums">${esc(item.qty || "")}</td>
            <td class="border border-neutral-500 p-1.5 text-center text-invoice-sm">${esc(item.unit || "")}</td>
            <td class="border border-neutral-500 p-1.5 text-right text-invoice-sm tabular-nums">${esc(item.unitPrice || "")}</td>
            <td class="border border-neutral-500 p-1.5 text-right text-invoice-sm font-bold tabular-nums">${esc(total)}</td>
          </tr>
        `;
      })
      .join("");
  }

  function buildDocumentHtml(invoice) {
    if (!invoice) return "";

    const supplier = invoice.supplier || {};
    const customer = invoice.customer || {};
    const payment = invoice.payment || {};
    const dates = invoice.dates || {};
    const grandTotal =
      typeof InvoiceModel !== "undefined" && InvoiceModel.calculateTotal
        ? formatMoney(InvoiceModel.calculateTotal(invoice))
        : formatMoney(0);

    return `
      <div class="invoice invoice-preview-sheet w-[210mm] min-h-[297mm] bg-white py-[12mm] pl-[8mm] pr-[10mm] pb-[14mm] text-neutral-900 shadow-none">
        <section class="inv-section mb-3.5 grid grid-cols-[30px_1fr] items-stretch gap-2 overflow-visible">
          <div class="section-label"><span>IDENTIFIKAČNÍ ÚDAJE</span></div>
          <div class="section-body min-w-0">
            <div class="ident-columns">
              <div class="supplier-top">
                <h3 class="mb-1.5 text-invoice font-bold">Dodavatel</h3>
                ${line(supplier.name, "party-name")}
                ${line(supplier.address)}
                ${line(supplier.city)}
                ${line(supplier.country || "Česká republika")}
                <div class="party-ids">
                  <span>IČO:</span>
                  <span class="inline-short">${esc(supplier.ico || "")}</span>
                </div>
              </div>
              <div class="invoice-header-row">
                <span class="text-invoice-title font-normal leading-none">Faktura</span>
                <span class="invoice-number-box">${esc(invoice.invoiceNumber || "")}</span>
              </div>
              <div class="contact-sub">
                <strong class="mb-1 block text-invoice">Kontaktní údaje</strong>
                <div class="contact-row">
                  <span class="whitespace-nowrap">E-mail:</span>
                  <span>${esc(supplier.email || "")}</span>
                </div>
                <div class="contact-row">
                  <span class="whitespace-nowrap">Telefon:</span>
                  <span>${esc(supplier.phone || "")}</span>
                </div>
              </div>
              <div class="customer-details">
                <h3 class="mb-1.5 mt-0 text-invoice font-bold">Odběratel</h3>
                ${line(customer.name, "party-name")}
                ${line(customer.address)}
                ${line(customer.city)}
                ${line(customer.country || "Česká republika")}
                <div class="party-ids">
                  <span>IČO:</span>
                  <span class="inline-short">${esc(customer.ico || "")}</span>
                  <span class="ml-2">DIČ:</span>
                  <span class="inline-short">${esc(customer.dic || "")}</span>
                </div>
              </div>
            </div>
            <div class="flex flex-wrap gap-6 border-t border-[#ccc] pt-2.5 text-invoice">
              <div class="date-item flex items-center gap-1.5">
                <span>Datum vystavení:</span>
                <strong>${esc(formatDate(dates.issue))}</strong>
              </div>
              <div class="date-item flex items-center gap-1.5">
                <span>Datum splatnosti:</span>
                <strong>${esc(formatDate(dates.due))}</strong>
              </div>
              <div class="date-item flex items-center gap-1.5">
                <span>Číslo objednávky:</span>
                <strong>${esc(dates.orderNumber || "")}</strong>
              </div>
            </div>
          </div>
        </section>

        <section class="inv-section mb-3.5 grid grid-cols-[30px_1fr] items-stretch gap-2 overflow-visible">
          <div class="section-label"><span>PLATEBNÍ ÚDAJE</span></div>
          <div class="section-body min-w-0">
            <div class="payment-bar grid min-w-0 max-w-full grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,0.9fr)_auto] items-center gap-2 bg-brand px-3.5 py-2.5 text-white">
              <div class="payment-col">
                <div class="payment-line mb-0.5 flex items-center gap-1.5 whitespace-nowrap text-invoice-sm">
                  <span>Bankovní účet:</span>
                  <span class="inv-preview-payment-value">${esc(payment.accountNumber || "")}</span>
                </div>
                <div class="payment-line mb-0.5 flex items-center gap-1.5 whitespace-nowrap text-invoice-sm">
                  <span>IBAN:</span>
                  <span class="inv-preview-payment-value">${esc(payment.iban || "")}</span>
                </div>
                <div class="payment-line mb-0.5 flex items-center gap-1.5 whitespace-nowrap text-invoice-sm">
                  <span>SWIFT:</span>
                  <span class="inv-preview-payment-value">${esc(payment.swift || "")}</span>
                </div>
              </div>
              <div class="payment-col">
                <div class="payment-line mb-0.5 flex items-center gap-1.5 whitespace-nowrap text-invoice-sm">
                  <span>Symbol</span>
                </div>
                <div class="payment-line indent mb-0.5 flex items-center gap-1.5 whitespace-nowrap pl-2.5 text-invoice-sm">
                  <span>variabilní:</span>
                  <span class="inv-preview-payment-value">${esc(payment.variableSymbol || "")}</span>
                </div>
                <div class="payment-line indent mb-0.5 flex items-center gap-1.5 whitespace-nowrap pl-2.5 text-invoice-sm">
                  <span>konstantní:</span>
                  <span class="inv-preview-payment-value">${esc(payment.constantSymbol || "")}</span>
                </div>
              </div>
              <div class="payment-col">
                <div class="payment-line mb-0.5 flex items-center gap-1.5 whitespace-nowrap text-invoice-sm">
                  <span>Způsob platby:</span>
                  <span class="inv-preview-payment-value">${esc(payment.method || "Převodem")}</span>
                </div>
              </div>
              <div class="payment-total-col min-w-[110px] border-l border-white/40 pl-3 text-right">
                <span class="mb-0.5 block text-invoice-sm">K úhradě</span>
                <span class="whitespace-nowrap text-xl font-bold">${esc(grandTotal)} Kč</span>
              </div>
            </div>
          </div>
        </section>

        <section class="inv-section mb-3.5 grid grid-cols-[30px_1fr] items-stretch gap-2 overflow-visible">
          <div class="section-label"><span>FAKTURUJEME VÁM</span></div>
          <div class="section-body min-w-0">
            <p class="mb-2 text-invoice">Fakturujeme Vám za dodané zboží či služby:</p>
            <table class="items-table w-full table-fixed border-collapse">
              <thead>
                <tr>
                  <th class="col-desc border border-neutral-500 bg-white p-1.5 text-left text-invoice-sm font-bold">Označení dodávky</th>
                  <th class="col-qty border border-neutral-500 bg-white p-1.5 text-invoice-sm font-bold">Počet</th>
                  <th class="col-unit border border-neutral-500 bg-white p-1.5 text-invoice-sm font-bold">m. j.</th>
                  <th class="col-price border border-neutral-500 bg-white p-1.5 text-invoice-sm font-bold">Cena za m.j.</th>
                  <th class="col-total border border-neutral-500 bg-white p-1.5 text-invoice-sm font-bold">Celkem</th>
                </tr>
              </thead>
              <tbody>${buildItemsRows(invoice.items)}</tbody>
            </table>
          </div>
        </section>

        <section class="section-recap inv-section mt-5 grid grid-cols-[30px_1fr] items-stretch gap-2 overflow-visible">
          <div class="section-label"><span>REKAPITULACE</span></div>
          <div class="section-body flex min-w-0 flex-col items-end gap-2">
            <div class="recap-bar flex items-center gap-2.5 bg-brand px-5 py-2 text-sm text-white">
              <span>Celkem k úhradě:</span>
              <strong class="text-base">${esc(grandTotal)} Kč</strong>
            </div>
          </div>
        </section>
      </div>
    `;
  }

  function render(miniHost, loupePan, invoice, viewport) {
    if (!miniHost || !loupePan) return;

    if (!invoice) {
      miniHost.innerHTML = `<div class="invoice-preview-empty">Vyber fakturu ze seznamu.</div>`;
      loupePan.innerHTML = "";
      if (viewport) delete viewport.dataset.previewScale;
      return;
    }

    const html = buildDocumentHtml(invoice);
    miniHost.innerHTML = `
      <div class="invoice-preview-doc-frame invoice-preview-paper-zone">
        <div class="invoice-preview-doc-scaler">${html}</div>
      </div>
    `;
    loupePan.innerHTML = html;

    if (viewport) {
      requestAnimationFrame(() => applyMiniScale(viewport, miniHost));
    }
  }

  function positionFloatingLoupe(viewport, loupe) {
    const modalPanel = document.getElementById("existing-invoice-modal")?.querySelector(".max-w-3xl");
    const vr = viewport.getBoundingClientRect();
    const mr = modalPanel?.getBoundingClientRect();
    const gap = 16;
    const margin = 12;

    let left = (mr?.right ?? vr.right) + gap;
    let width = Math.min(520, window.innerWidth - left - margin);

    if (width < 280) {
      left = Math.max(margin, window.innerWidth - 520 - margin);
      width = Math.min(520, window.innerWidth - left - margin);
    }

    const height = Math.min(620, Math.max(360, vr.height + 40));
    let top = vr.top - 8;
    top = Math.max(margin, Math.min(top, window.innerHeight - height - margin));

    loupe.style.left = `${left}px`;
    loupe.style.top = `${top}px`;
    loupe.style.width = `${width}px`;
    loupe.style.height = `${height}px`;
  }

  function bindMagnifier({ viewport, loupe, loupePan, getInvoice }) {
    if (!viewport || !loupe || !loupePan) return;

    const loupeViewport = loupe.querySelector(".invoice-preview-loupe-viewport");
    const miniHost = document.getElementById("existing-invoice-preview-mini");

    const readMiniScale = () => {
      const scale = parseFloat(viewport.dataset.previewScale || "");
      return Number.isFinite(scale) && scale > 0 ? scale : getMiniScale(viewport);
    };

    const hideLoupe = () => {
      loupe.classList.add("hidden");
      loupe.setAttribute("aria-hidden", "true");
    };

    const showLoupe = () => {
      if (!getInvoice()) return;
      positionFloatingLoupe(viewport, loupe);
      loupe.classList.remove("hidden");
      loupe.setAttribute("aria-hidden", "false");
    };

    const updateLoupe = (e) => {
      const invoice = getInvoice();
      if (!invoice || !loupeViewport) return;

      const miniScale = readMiniScale();
      const rect = viewport.getBoundingClientRect();
      const frame = miniHost?.querySelector(".invoice-preview-doc-frame");
      const frameRect = frame?.getBoundingClientRect();
      const frameLeft = frameRect ? frameRect.left - rect.left + viewport.scrollLeft : 0;
      const frameTop = frameRect ? frameRect.top - rect.top + viewport.scrollTop : 0;

      const x = Math.max(0, e.clientX - rect.left + viewport.scrollLeft - frameLeft);
      const y = Math.max(0, e.clientY - rect.top + viewport.scrollTop - frameTop);

      const docX = x / miniScale;
      const docY = y / miniScale;

      const lw = loupeViewport.clientWidth;
      const lh = loupeViewport.clientHeight;

      const tx = lw / 2 - docX * LOUPE_SCALE;
      const ty = lh / 2 - docY * LOUPE_SCALE;

      loupePan.style.transform = `translate(${tx}px, ${ty}px) scale(${LOUPE_SCALE})`;
    };

    const onViewportEnter = () => {
      applyMiniScale(viewport, miniHost);
      showLoupe();
    };

    const onLeavePreview = (e) => {
      const next = e.relatedTarget;
      if (next && (viewport.contains(next) || loupe.contains(next))) return;
      hideLoupe();
    };

    viewport.addEventListener("mouseenter", onViewportEnter);
    viewport.addEventListener("mouseleave", onLeavePreview);
    viewport.addEventListener("mousemove", updateLoupe);
    loupe.addEventListener("mouseleave", onLeavePreview);

    window.addEventListener("resize", () => {
      if (!loupe.classList.contains("hidden")) {
        applyMiniScale(viewport, miniHost);
        positionFloatingLoupe(viewport, loupe);
      }
    });
  }

  return {
    LOUPE_SCALE,
    applyMiniScale,
    buildDocumentHtml,
    render,
    bindMagnifier,
  };
})();
