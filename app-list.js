let invoicePendingDelete = null;

function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.remove("hidden");
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => toast.classList.add("hidden"), 2800);
}

function showLoadError(err) {
  const message = err?.message || "Nepodařilo se načíst data.";
  const banner = document.getElementById("server-error");
  if (banner) {
    banner.textContent = message;
    banner.classList.remove("hidden");
  } else {
    alert(message);
  }
}

function navigateToNewInvoice(mode) {
  window.location.href = `invoice.html?mode=${mode}`;
}

function openTemplateModal() {
  document.getElementById("template-modal").classList.remove("hidden");
  document.body.classList.add("overflow-hidden");
  document.getElementById("template-modal-use").focus();
}

function closeTemplateModal() {
  document.getElementById("template-modal").classList.add("hidden");
  document.body.classList.remove("overflow-hidden");
}

async function handleNewInvoice() {
  try {
    if (await FakturaStorage.hasTemplate()) {
      openTemplateModal();
    } else {
      navigateToNewInvoice("empty");
    }
  } catch (err) {
    showLoadError(err);
  }
}

function openDeleteModal(invoice) {
  invoicePendingDelete = invoice;
  const text = document.getElementById("delete-modal-text");
  const label = invoice.invoiceNumber || invoice.customer?.name || "tuto fakturu";
  text.textContent = `Opravdu chcete smazat fakturu „${label}"?`;
  document.getElementById("delete-modal").classList.remove("hidden");
  document.body.classList.add("overflow-hidden");
  document.getElementById("delete-modal-confirm").focus();
}

function closeDeleteModal() {
  invoicePendingDelete = null;
  document.getElementById("delete-modal").classList.add("hidden");
  document.body.classList.remove("overflow-hidden");
}

async function confirmDelete() {
  if (!invoicePendingDelete?.id) {
    closeDeleteModal();
    return;
  }

  try {
    await FakturaStorage.deleteInvoice(invoicePendingDelete.id);
    showToast("Faktura smazána ze složky data/invoices.");
    await renderInvoiceList();
  } catch (err) {
    alert(err.message || "Smazání se nezdařilo.");
  }

  closeDeleteModal();
}

async function renderInvoiceList() {
  const tbody = document.getElementById("invoice-list");
  const emptyState = document.getElementById("empty-state");
  const listWrap = document.getElementById("invoice-list-wrap");
  const templateBanner = document.getElementById("template-banner");
  const serverError = document.getElementById("server-error");

  try {
    const invoices = await FakturaStorage.readInvoices();
    const hasTemplate = await FakturaStorage.hasTemplate();

    serverError?.classList.add("hidden");
    templateBanner.classList.toggle("hidden", !hasTemplate);

    if (!invoices.length) {
      tbody.innerHTML = "";
      emptyState.classList.remove("hidden");
      listWrap.classList.add("hidden");
      return;
    }

    emptyState.classList.add("hidden");
    listWrap.classList.remove("hidden");

    tbody.innerHTML = invoices
      .map((invoice) => {
        const summary = InvoiceModel.getSummary(invoice);
        const fileLabel = FakturaStorage.getInvoiceFileLabel(invoice);
        return `
        <tr class="border-b border-neutral-100 hover:bg-neutral-50" data-id="${summary.id}">
          <td class="px-5 py-4 font-medium text-neutral-900">${escapeHtml(summary.invoiceNumber)}</td>
          <td class="px-5 py-4 text-neutral-700">${escapeHtml(summary.customerName)}</td>
          <td class="px-5 py-4 text-neutral-700">${escapeHtml(summary.issueDate)}</td>
          <td class="px-5 py-4 text-right font-medium tabular-nums text-neutral-900">${escapeHtml(summary.total)} Kč</td>
          <td class="px-5 py-4 text-neutral-500">
            <div>${escapeHtml(summary.savedAt)}</div>
            <div class="mt-0.5 text-xs text-neutral-400">${escapeHtml(fileLabel)}</div>
          </td>
          <td class="px-5 py-4">
            <div class="flex justify-end gap-2">
              <a href="invoice.html?id=${encodeURIComponent(summary.id)}" class="btn-table">Otevřít</a>
              <button type="button" class="btn-table btn-download" data-id="${summary.id}">Exportovat .txt</button>
              <button type="button" class="btn-table btn-delete text-red-600 hover:bg-red-50 hover:text-red-700" data-id="${summary.id}">Smazat</button>
            </div>
          </td>
        </tr>
      `;
      })
      .join("");
  } catch (err) {
    showLoadError(err);
    tbody.innerHTML = "";
    emptyState.classList.remove("hidden");
    listWrap.classList.add("hidden");
  }
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function initModals() {
  document.getElementById("btn-new-invoice").addEventListener("click", handleNewInvoice);
  document.getElementById("btn-new-empty").addEventListener("click", () => navigateToNewInvoice("empty"));

  document.getElementById("template-modal-use").addEventListener("click", () => {
    closeTemplateModal();
    navigateToNewInvoice("template");
  });
  document.getElementById("template-modal-empty").addEventListener("click", () => {
    closeTemplateModal();
    navigateToNewInvoice("empty");
  });
  document.getElementById("template-modal-backdrop").addEventListener("click", closeTemplateModal);

  document.getElementById("delete-modal-cancel").addEventListener("click", closeDeleteModal);
  document.getElementById("delete-modal-confirm").addEventListener("click", confirmDelete);
  document.getElementById("delete-modal-backdrop").addEventListener("click", closeDeleteModal);

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (!document.getElementById("template-modal").classList.contains("hidden")) closeTemplateModal();
    if (!document.getElementById("delete-modal").classList.contains("hidden")) closeDeleteModal();
  });
}

function initListActions() {
  document.getElementById("invoice-list").addEventListener("click", async (e) => {
    const downloadBtn = e.target.closest(".btn-download");
    if (downloadBtn) {
      try {
        const invoice = await FakturaStorage.getInvoice(downloadBtn.dataset.id);
        FakturaStorage.downloadInvoiceTxt(invoice);
        showToast("Kopie faktury exportována.");
      } catch (err) {
        alert(err.message || "Export se nezdařil.");
      }
      return;
    }

    const deleteBtn = e.target.closest(".btn-delete");
    if (deleteBtn) {
      try {
        const invoice = await FakturaStorage.getInvoice(deleteBtn.dataset.id);
        openDeleteModal(invoice);
      } catch (err) {
        alert(err.message || "Načtení faktury se nezdařilo.");
      }
    }
  });
}

function initImport() {
  const input = document.getElementById("import-file");
  input.addEventListener("change", async () => {
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;

    try {
      await FakturaStorage.importInvoiceFromFile(file);
      showToast("Faktura importována do data/invoices.");
      await renderInvoiceList();
    } catch (err) {
      alert(err.message || "Import se nezdařil.");
    }
  });
}

async function init() {
  initModals();
  initListActions();
  initImport();
  await renderInvoiceList();
}

init();
