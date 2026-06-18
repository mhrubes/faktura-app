let invoicePendingDelete = null;
let allInvoices = [];
let customerOptions = [];
let listFilters = null;
let exportFilters = null;
let sortState = { column: null, direction: "asc" };

const SORT_COLUMNS = ["number", "customer", "issue", "total"];

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatCustomerMeta(customer) {
  const parts = [];
  if (customer.ico) parts.push(`<span>IČ: ${escapeHtml(customer.ico)}</span>`);
  if (customer.dic) parts.push(`<span>DIČ: ${escapeHtml(customer.dic)}</span>`);
  return parts.join("");
}

function fillSelect(select, placeholder, values, formatter) {
  const current = select.value;
  select.innerHTML = `<option value="">${placeholder}</option>`;
  values.forEach((value) => {
    const option = document.createElement("option");
    option.value = String(value);
    option.textContent = formatter(value);
    select.appendChild(option);
  });
  select.value = values.map(String).includes(current) ? current : "";
}

function createFilterController(config) {
  const { ids, onChange } = config;
  let customerFilter = { query: "", selected: null };
  let dateFilter = { year: "", month: "", day: "" };
  let suggestionIndex = -1;

  const els = {
    customer: document.getElementById(ids.customer),
    clearCustomer: document.getElementById(ids.clearCustomer),
    suggestions: document.getElementById(ids.suggestions),
    year: document.getElementById(ids.year),
    month: document.getElementById(ids.month),
    day: document.getElementById(ids.day),
    clearDates: document.getElementById(ids.clearDates),
  };

  function getFiltered() {
    return InvoiceFilters.filterInvoices(allInvoices, customerFilter, dateFilter);
  }

  function updateDateSelects() {
    fillSelect(els.year, "Rok", InvoiceFilters.getAvailableYears(allInvoices), (y) => y);

    const hasYear = Boolean(dateFilter.year);
    els.month.disabled = !hasYear;
    els.day.disabled = !hasYear || !dateFilter.month;

    if (!hasYear) {
      dateFilter.month = "";
      dateFilter.day = "";
      els.month.innerHTML = '<option value="">Měsíc</option>';
      els.day.innerHTML = '<option value="">Den</option>';
    } else {
      fillSelect(
        els.month,
        "Měsíc",
        InvoiceFilters.getAvailableMonths(allInvoices, dateFilter.year),
        (m) => InvoiceFilters.MONTH_NAMES[m - 1]
      );
      dateFilter.month = els.month.value;

      if (!dateFilter.month) {
        dateFilter.day = "";
        els.day.innerHTML = '<option value="">Den</option>';
      } else {
        fillSelect(
          els.day,
          "Den",
          InvoiceFilters.getAvailableDays(allInvoices, dateFilter.year, dateFilter.month),
          (d) => d
        );
        dateFilter.day = els.day.value;
      }
    }

    els.year.value = dateFilter.year;
    if (hasYear) els.month.value = dateFilter.month;
    if (hasYear && dateFilter.month) els.day.value = dateFilter.day;

    els.clearDates.classList.toggle("hidden", !InvoiceFilters.hasDateFilter(dateFilter));
  }

  function closeSuggestions() {
    els.suggestions.classList.add("hidden");
    els.suggestions.innerHTML = "";
    els.customer.setAttribute("aria-expanded", "false");
    suggestionIndex = -1;
  }

  function renderSuggestions() {
    const suggestions = InvoiceFilters.getSuggestions(customerOptions, els.customer.value);
    if (!suggestions.length) {
      closeSuggestions();
      return;
    }

    els.suggestions.innerHTML = suggestions
      .map((customer, index) => {
        const name = customer.name || "Bez názvu";
        const meta = formatCustomerMeta(customer);
        return `
          <li class="filter-suggestion${index === suggestionIndex ? " is-active" : ""}" role="option" data-index="${index}">
            <div class="filter-suggestion-name">${escapeHtml(name)}</div>
            ${meta ? `<div class="filter-suggestion-meta">${meta}</div>` : ""}
          </li>
        `;
      })
      .join("");

    els.suggestions.classList.remove("hidden");
    els.customer.setAttribute("aria-expanded", "true");
  }

  function applySuggestion(index) {
    const suggestions = InvoiceFilters.getSuggestions(customerOptions, els.customer.value);
    const customer = suggestions[index];
    if (!customer) return;

    customerFilter.selected = customer;
    customerFilter.query = "";
    els.customer.value = customer.name || customer.ico || customer.dic || "";
    closeSuggestions();
    els.clearCustomer.classList.toggle("hidden", !InvoiceFilters.hasCustomerFilter(customerFilter));
    onChange();
  }

  function syncInputsFromState() {
    if (customerFilter.selected) {
      els.customer.value =
        customerFilter.selected.name ||
        customerFilter.selected.ico ||
        customerFilter.selected.dic ||
        "";
    } else {
      els.customer.value = customerFilter.query;
    }
    els.clearCustomer.classList.toggle("hidden", !InvoiceFilters.hasCustomerFilter(customerFilter));
    updateDateSelects();
  }

  function bind() {
    els.customer.addEventListener("input", () => {
      customerFilter.selected = null;
      customerFilter.query = els.customer.value;
      suggestionIndex = -1;
      els.clearCustomer.classList.remove("hidden");
      renderSuggestions();
      onChange();
    });

    els.customer.addEventListener("focus", () => {
      suggestionIndex = -1;
      renderSuggestions();
    });

    els.customer.addEventListener("keydown", (e) => {
      const suggestions = InvoiceFilters.getSuggestions(customerOptions, els.customer.value);
      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (!suggestions.length) return;
        suggestionIndex = Math.min(suggestionIndex + 1, suggestions.length - 1);
        renderSuggestions();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        suggestionIndex = Math.max(suggestionIndex - 1, 0);
        renderSuggestions();
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (suggestionIndex >= 0) applySuggestion(suggestionIndex);
        else closeSuggestions();
      } else if (e.key === "Escape") {
        closeSuggestions();
      }
    });

    els.suggestions.addEventListener("mousedown", (e) => {
      e.preventDefault();
      const item = e.target.closest(".filter-suggestion");
      if (item) applySuggestion(Number(item.dataset.index));
    });

    els.clearCustomer.addEventListener("click", () => {
      customerFilter = { query: "", selected: null };
      els.customer.value = "";
      closeSuggestions();
      els.clearCustomer.classList.add("hidden");
      onChange();
    });

    els.clearDates.addEventListener("click", () => {
      dateFilter = { year: "", month: "", day: "" };
      updateDateSelects();
      onChange();
    });

    els.year.addEventListener("change", () => {
      dateFilter.year = els.year.value;
      dateFilter.month = "";
      dateFilter.day = "";
      updateDateSelects();
      onChange();
    });

    els.month.addEventListener("change", () => {
      dateFilter.month = els.month.value;
      dateFilter.day = "";
      updateDateSelects();
      onChange();
    });

    els.day.addEventListener("change", () => {
      dateFilter.day = els.day.value;
      updateDateSelects();
      onChange();
    });
  }

  return {
    bind,
    getFiltered,
    getState() {
      return {
        customerFilter: InvoiceFilters.cloneCustomerFilter(customerFilter),
        dateFilter: InvoiceFilters.cloneDateFilter(dateFilter),
      };
    },
    closeSuggestions,
    updateDateSelects,
    syncFrom(source) {
      customerFilter = InvoiceFilters.cloneCustomerFilter(source.customerFilter);
      dateFilter = InvoiceFilters.cloneDateFilter(source.dateFilter);
      syncInputsFromState();
      onChange();
    },
    reset() {
      customerFilter = { query: "", selected: null };
      dateFilter = { year: "", month: "", day: "" };
      els.customer.value = "";
      closeSuggestions();
      els.clearCustomer.classList.add("hidden");
      updateDateSelects();
      onChange();
    },
    clearAll() {
      customerFilter = { query: "", selected: null };
      dateFilter = { year: "", month: "", day: "" };
      els.customer.value = "";
      closeSuggestions();
      els.clearCustomer.classList.add("hidden");
      updateDateSelects();
      onChange();
    },
  };
}

function updateListFilterCount() {
  const countEl = document.getElementById("filter-result-count");
  const filtered = listFilters.getFiltered();
  const total = allInvoices.length;
  const { customerFilter, dateFilter } = listFilters.getState();
  const hasFilter = InvoiceFilters.hasAnyFilter(customerFilter, dateFilter);

  if (!hasFilter) {
    countEl.textContent = total ? `${total} faktur celkem` : "";
  } else {
    countEl.textContent = `${filtered.length} z ${total} faktur`;
  }
}

function updateExportButtonState() {
  const btn = document.getElementById("btn-export");
  const hasInvoices = allInvoices.length > 0;
  btn.disabled = !hasInvoices;
}

function updateExportModalCount() {
  const count = exportFilters.getFiltered().length;
  const countEl = document.getElementById("export-filter-count");
  const confirmBtn = document.getElementById("export-modal-confirm");

  countEl.textContent =
    count === 0
      ? "Žádná faktura neodpovídá zvoleným filtrům"
      : count === 1
        ? "1 faktura k exportu"
        : `${count} faktur k exportu`;

  confirmBtn.disabled = count === 0;
}

function openExportModal() {
  exportFilters.syncFrom(listFilters.getState());
  document.getElementById("export-modal").classList.remove("hidden");
  document.body.classList.add("overflow-hidden");
  document.getElementById("export-filter-customer").focus();
}

function closeExportModal() {
  exportFilters.closeSuggestions();
  document.getElementById("export-modal").classList.add("hidden");
  document.body.classList.remove("overflow-hidden");
}

function confirmExport() {
  const invoices = exportFilters.getFiltered();
  if (!invoices.length) return;

  FakturaStorage.downloadInvoicesJson(invoices);
  showToast(
    invoices.length === 1
      ? "Faktura exportována do .json souboru."
      : `${invoices.length} faktur exportováno do jednoho .json souboru.`
  );
  closeExportModal();
}

function sortInvoices(invoices) {
  if (!sortState.column) return invoices;

  const { column, direction } = sortState;
  const factor = direction === "asc" ? 1 : -1;

  return [...invoices].sort((a, b) => {
    let cmp = 0;

    if (column === "number") {
      cmp = String(a.invoiceNumber || "").localeCompare(String(b.invoiceNumber || ""), "cs", {
        numeric: true,
      });
    } else if (column === "customer") {
      cmp = String(a.customer?.name || "").localeCompare(String(b.customer?.name || ""), "cs");
    } else if (column === "issue") {
      cmp = String(a.dates?.issue || "").localeCompare(String(b.dates?.issue || ""));
    } else if (column === "total") {
      cmp = InvoiceModel.calculateTotal(a) - InvoiceModel.calculateTotal(b);
    }

    return cmp * factor;
  });
}

function updateSortHeaderUi() {
  document.querySelectorAll(".sort-btn[data-sort]").forEach((btn) => {
    const isActive = btn.dataset.sort === sortState.column;
    btn.classList.toggle("is-sorted-asc", isActive && sortState.direction === "asc");
    btn.classList.toggle("is-sorted-desc", isActive && sortState.direction === "desc");
    btn.setAttribute("aria-sort", isActive ? sortState.direction + "ending" : "none");
  });
}

function handleSortClick(column) {
  if (!SORT_COLUMNS.includes(column)) return;

  if (sortState.column === column) {
    sortState.direction = sortState.direction === "asc" ? "desc" : "asc";
  } else {
    sortState.column = column;
    sortState.direction = column === "issue" || column === "total" ? "desc" : "asc";
  }

  updateSortHeaderUi();
  renderInvoiceRows();
}

function initSort() {
  document.querySelector(".invoice-list-table thead")?.addEventListener("click", (e) => {
    const btn = e.target.closest(".sort-btn[data-sort]");
    if (!btn) return;
    handleSortClick(btn.dataset.sort);
  });
  updateSortHeaderUi();
}

function renderInvoiceRows() {
  const tbody = document.getElementById("invoice-list");
  const listWrap = document.getElementById("invoice-list-wrap");
  const filterEmpty = document.getElementById("filter-empty-state");
  const invoices = sortInvoices(listFilters.getFiltered());
  const { customerFilter, dateFilter } = listFilters.getState();
  const hasFilter = InvoiceFilters.hasAnyFilter(customerFilter, dateFilter);

  if (!invoices.length && hasFilter) {
    tbody.innerHTML = "";
    listWrap.classList.add("hidden");
    filterEmpty.classList.remove("hidden");
    return;
  }

  filterEmpty.classList.add("hidden");
  listWrap.classList.remove("hidden");

  tbody.innerHTML = invoices
    .map((invoice) => {
      const summary = InvoiceModel.getSummary(invoice);
      const fileLabel = FakturaStorage.getInvoiceFileLabel(invoice);
      const customer = invoice.customer || {};
      const customerMeta = [customer.ico, customer.dic].filter(Boolean).join(" · ");
      return `
        <tr class="border-b border-neutral-100 hover:bg-neutral-50" data-id="${summary.id}">
          <td class="px-5 py-4 font-medium text-neutral-900">${escapeHtml(summary.invoiceNumber)}</td>
          <td class="px-5 py-4 text-neutral-700">
            <div>${escapeHtml(summary.customerName)}</div>
            ${customerMeta ? `<div class="mt-0.5 text-xs text-neutral-400">${escapeHtml(customerMeta)}</div>` : ""}
          </td>
          <td class="px-5 py-4 text-neutral-700">${escapeHtml(summary.issueDate)}</td>
          <td class="px-5 py-4 text-right font-medium tabular-nums text-neutral-900">${escapeHtml(summary.total)} Kč</td>
          <td class="px-5 py-4 text-neutral-500">
            <div>${escapeHtml(summary.savedAt)}</div>
            <div class="mt-0.5 text-xs text-neutral-400">${escapeHtml(fileLabel)}</div>
          </td>
          <td class="px-5 py-4">
            <div class="flex justify-end gap-2">
              <a href="invoice.html?id=${encodeURIComponent(summary.id)}" class="btn-table">Otevřít</a>
              <button type="button" class="btn-table btn-download" data-id="${summary.id}">Exportovat .json</button>
              <button type="button" class="btn-table btn-delete text-red-600 hover:bg-red-50 hover:text-red-700" data-id="${summary.id}">Smazat</button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");
}

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
  const emptyState = document.getElementById("empty-state");
  const filtersBar = document.getElementById("filters-bar");
  const filterEmpty = document.getElementById("filter-empty-state");
  const listWrap = document.getElementById("invoice-list-wrap");
  const templateBanner = document.getElementById("template-banner");
  const serverError = document.getElementById("server-error");

  try {
    allInvoices = await FakturaStorage.readInvoices();
    customerOptions = InvoiceFilters.buildCustomerOptions(allInvoices);
    const hasTemplate = await FakturaStorage.hasTemplate();

    serverError?.classList.add("hidden");
    templateBanner.classList.toggle("hidden", !hasTemplate);
    updateExportButtonState();

    if (!allInvoices.length) {
      emptyState.classList.remove("hidden");
      filtersBar.classList.add("hidden");
      filterEmpty.classList.add("hidden");
      listWrap.classList.add("hidden");
      return;
    }

    emptyState.classList.add("hidden");
    filtersBar.classList.remove("hidden");
    listFilters.updateDateSelects();
    updateListFilterCount();
    renderInvoiceRows();
  } catch (err) {
    showLoadError(err);
    document.getElementById("invoice-list").innerHTML = "";
    emptyState.classList.remove("hidden");
    filtersBar?.classList.add("hidden");
    filterEmpty.classList.add("hidden");
    listWrap.classList.add("hidden");
    updateExportButtonState();
  }
}

function initModals() {
  document.getElementById("btn-new-invoice").addEventListener("click", handleNewInvoice);
  document.getElementById("btn-new-empty").addEventListener("click", () => navigateToNewInvoice("empty"));
  document.getElementById("btn-export").addEventListener("click", openExportModal);

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

  document.getElementById("export-modal-cancel").addEventListener("click", closeExportModal);
  document.getElementById("export-modal-confirm").addEventListener("click", confirmExport);
  document.getElementById("export-modal-backdrop").addEventListener("click", closeExportModal);

  document.getElementById("btn-clear-filter").addEventListener("click", () => listFilters.clearAll());

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (!document.getElementById("export-modal").classList.contains("hidden")) closeExportModal();
    if (!document.getElementById("template-modal").classList.contains("hidden")) closeTemplateModal();
    if (!document.getElementById("delete-modal").classList.contains("hidden")) closeDeleteModal();
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest("#filter-customer") && !e.target.closest("#filter-suggestions")) {
      listFilters.closeSuggestions();
    }
    if (!e.target.closest("#export-filter-customer") && !e.target.closest("#export-filter-suggestions")) {
      exportFilters.closeSuggestions();
    }
  });
}

function initListActions() {
  document.getElementById("invoice-list").addEventListener("click", async (e) => {
    const downloadBtn = e.target.closest(".btn-download");
    if (downloadBtn) {
      try {
        const invoice = await FakturaStorage.getInvoice(downloadBtn.dataset.id);
        FakturaStorage.downloadInvoiceJson(invoice);
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
      const saved = await FakturaStorage.importInvoicesFromFile(file);
      showToast(
        saved.length === 1
          ? "1 faktura importována do data/invoices."
          : `${saved.length} faktur importováno do data/invoices.`
      );
      await renderInvoiceList();
    } catch (err) {
      alert(err.message || "Import se nezdařil.");
    }
  });
}

function initFilters() {
  listFilters = createFilterController({
    ids: {
      customer: "filter-customer",
      clearCustomer: "filter-clear-customer",
      suggestions: "filter-suggestions",
      year: "filter-year",
      month: "filter-month",
      day: "filter-day",
      clearDates: "filter-clear-dates",
    },
    onChange: () => {
      updateListFilterCount();
      renderInvoiceRows();
    },
  });

  exportFilters = createFilterController({
    ids: {
      customer: "export-filter-customer",
      clearCustomer: "export-filter-clear-customer",
      suggestions: "export-filter-suggestions",
      year: "export-filter-year",
      month: "export-filter-month",
      day: "export-filter-day",
      clearDates: "export-filter-clear-dates",
    },
    onChange: updateExportModalCount,
  });

  listFilters.bind();
  exportFilters.bind();
}

async function init() {
  initFilters();
  initSort();
  initModals();
  initListActions();
  initImport();
  await renderInvoiceList();
}

init();
