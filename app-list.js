let invoicePendingDelete = null;
let allInvoices = [];
let customerOptions = [];
let customerFilter = { query: "", selected: null };
let dateFilter = { year: "", month: "", day: "" };
let suggestionIndex = -1;

const MONTH_NAMES = [
  "Leden", "Únor", "Březen", "Duben", "Květen", "Červen",
  "Červenec", "Srpen", "Září", "Říjen", "Listopad", "Prosinec",
];

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function customerKey(customer = {}) {
  return [customer.name || "", customer.ico || "", customer.dic || ""].join("|");
}

function buildCustomerOptions(invoices) {
  const map = new Map();
  invoices.forEach((invoice) => {
    const customer = invoice.customer || {};
    if (!customer.name && !customer.ico && !customer.dic) return;
    const key = customerKey(customer);
    if (!map.has(key)) {
      map.set(key, {
        name: customer.name || "",
        ico: customer.ico || "",
        dic: customer.dic || "",
      });
    }
  });
  return Array.from(map.values()).sort((a, b) =>
    normalizeText(a.name).localeCompare(normalizeText(b.name), "cs")
  );
}

function customerMatchesQuery(customer, query) {
  const q = normalizeText(query);
  if (!q) return true;
  return [customer.name, customer.ico, customer.dic].some((field) =>
    normalizeText(field).includes(q)
  );
}

function customerEquals(a, b) {
  return customerKey(a) === customerKey(b);
}

function getInvoiceIssueParts(invoice) {
  const iso = invoice.dates?.issue;
  if (!iso) return null;
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) return null;
  return { year, month, day };
}

function matchesCustomerFilter(invoice) {
  if (customerFilter.selected) {
    return customerEquals(invoice.customer || {}, customerFilter.selected);
  }
  const query = customerFilter.query.trim();
  if (!query) return true;
  return customerMatchesQuery(invoice.customer || {}, query);
}

function matchesDateFilter(invoice) {
  if (!dateFilter.year && !dateFilter.month && !dateFilter.day) return true;

  const parts = getInvoiceIssueParts(invoice);
  if (!parts) return false;

  if (dateFilter.year && parts.year !== Number(dateFilter.year)) return false;
  if (dateFilter.month && parts.month !== Number(dateFilter.month)) return false;
  if (dateFilter.day && parts.day !== Number(dateFilter.day)) return false;
  return true;
}

function hasCustomerFilter() {
  return Boolean(customerFilter.selected || customerFilter.query.trim());
}

function hasDateFilter() {
  return Boolean(dateFilter.year || dateFilter.month || dateFilter.day);
}

function hasAnyFilter() {
  return hasCustomerFilter() || hasDateFilter();
}

function getFilteredInvoices() {
  return allInvoices.filter(
    (invoice) => matchesCustomerFilter(invoice) && matchesDateFilter(invoice)
  );
}

function getAvailableYears() {
  const years = new Set();
  allInvoices.forEach((invoice) => {
    const parts = getInvoiceIssueParts(invoice);
    if (parts) years.add(parts.year);
  });
  return Array.from(years).sort((a, b) => b - a);
}

function getAvailableMonths(year) {
  const months = new Set();
  allInvoices.forEach((invoice) => {
    const parts = getInvoiceIssueParts(invoice);
    if (parts && parts.year === Number(year)) months.add(parts.month);
  });
  return Array.from(months).sort((a, b) => a - b);
}

function getAvailableDays(year, month) {
  const days = new Set();
  allInvoices.forEach((invoice) => {
    const parts = getInvoiceIssueParts(invoice);
    if (parts && parts.year === Number(year) && parts.month === Number(month)) {
      days.add(parts.day);
    }
  });
  return Array.from(days).sort((a, b) => a - b);
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
  if (values.map(String).includes(current)) {
    select.value = current;
  } else {
    select.value = "";
  }
}

function updateDateSelects() {
  const yearSelect = document.getElementById("filter-year");
  const monthSelect = document.getElementById("filter-month");
  const daySelect = document.getElementById("filter-day");
  const clearDatesBtn = document.getElementById("filter-clear-dates");

  fillSelect(yearSelect, "Rok", getAvailableYears(), (y) => y);

  const hasYear = Boolean(dateFilter.year);
  monthSelect.disabled = !hasYear;
  daySelect.disabled = !hasYear || !dateFilter.month;

  if (!hasYear) {
    dateFilter.month = "";
    dateFilter.day = "";
    monthSelect.innerHTML = '<option value="">Měsíc</option>';
    daySelect.innerHTML = '<option value="">Den</option>';
    monthSelect.value = "";
    daySelect.value = "";
  } else {
    fillSelect(monthSelect, "Měsíc", getAvailableMonths(dateFilter.year), (m) => MONTH_NAMES[m - 1]);
    dateFilter.month = monthSelect.value;

    if (!dateFilter.month) {
      dateFilter.day = "";
      daySelect.innerHTML = '<option value="">Den</option>';
      daySelect.value = "";
    } else {
      fillSelect(daySelect, "Den", getAvailableDays(dateFilter.year, dateFilter.month), (d) => d);
      dateFilter.day = daySelect.value;
    }
  }

  yearSelect.value = dateFilter.year;
  if (hasYear) monthSelect.value = dateFilter.month;
  if (hasYear && dateFilter.month) daySelect.value = dateFilter.day;

  clearDatesBtn.classList.toggle("hidden", !hasDateFilter());
}

function getSuggestions(query) {
  const q = query.trim();
  if (!q) return customerOptions.slice(0, 8);
  return customerOptions.filter((customer) => customerMatchesQuery(customer, q)).slice(0, 8);
}

function formatCustomerMeta(customer) {
  const parts = [];
  if (customer.ico) parts.push(`<span>IČ: ${escapeHtml(customer.ico)}</span>`);
  if (customer.dic) parts.push(`<span>DIČ: ${escapeHtml(customer.dic)}</span>`);
  return parts.join("");
}

function updateFilterUi() {
  const input = document.getElementById("filter-customer");
  const clearBtn = document.getElementById("filter-clear-customer");
  const countEl = document.getElementById("filter-result-count");

  clearBtn.classList.toggle("hidden", !hasCustomerFilter());
  updateDateSelects();

  const filtered = getFilteredInvoices();
  const total = allInvoices.length;
  if (!hasAnyFilter()) {
    countEl.textContent = total ? `${total} faktur celkem` : "";
  } else {
    countEl.textContent = `${filtered.length} z ${total} faktur`;
  }

  if (customerFilter.selected) {
    const label =
      customerFilter.selected.name ||
      customerFilter.selected.ico ||
      customerFilter.selected.dic;
    if (input && document.activeElement !== input) {
      input.value = label;
    }
  }
}

function closeSuggestions() {
  const list = document.getElementById("filter-suggestions");
  const input = document.getElementById("filter-customer");
  list.classList.add("hidden");
  list.innerHTML = "";
  input?.setAttribute("aria-expanded", "false");
  suggestionIndex = -1;
}

function renderSuggestions() {
  const list = document.getElementById("filter-suggestions");
  const input = document.getElementById("filter-customer");
  const suggestions = getSuggestions(input.value);

  if (!suggestions.length) {
    closeSuggestions();
    return;
  }

  list.innerHTML = suggestions
    .map((customer, index) => {
      const name = customer.name || "Bez názvu";
      const meta = formatCustomerMeta(customer);
      return `
        <li
          class="filter-suggestion${index === suggestionIndex ? " is-active" : ""}"
          role="option"
          data-index="${index}"
          aria-selected="${index === suggestionIndex}"
        >
          <div class="filter-suggestion-name">${escapeHtml(name)}</div>
          ${meta ? `<div class="filter-suggestion-meta">${meta}</div>` : ""}
        </li>
      `;
    })
    .join("");

  list.classList.remove("hidden");
  input.setAttribute("aria-expanded", "true");
}

function applySelectedSuggestion(index) {
  const input = document.getElementById("filter-customer");
  const suggestions = getSuggestions(input.value);
  const customer = suggestions[index];
  if (!customer) return;

  customerFilter.selected = customer;
  customerFilter.query = "";
  input.value = customer.name || customer.ico || customer.dic || "";
  closeSuggestions();
  updateFilterUi();
  renderInvoiceRows();
}

function clearCustomerFilter() {
  customerFilter = { query: "", selected: null };
  const input = document.getElementById("filter-customer");
  if (input) input.value = "";
  closeSuggestions();
  updateFilterUi();
  renderInvoiceRows();
}

function clearDateFilter() {
  dateFilter = { year: "", month: "", day: "" };
  updateFilterUi();
  renderInvoiceRows();
}

function clearAllFilters() {
  customerFilter = { query: "", selected: null };
  dateFilter = { year: "", month: "", day: "" };
  const input = document.getElementById("filter-customer");
  if (input) input.value = "";
  closeSuggestions();
  updateFilterUi();
  renderInvoiceRows();
}

function initFilters() {
  const input = document.getElementById("filter-customer");
  const clearCustomerBtn = document.getElementById("filter-clear-customer");
  const clearDatesBtn = document.getElementById("filter-clear-dates");
  const yearSelect = document.getElementById("filter-year");
  const monthSelect = document.getElementById("filter-month");
  const daySelect = document.getElementById("filter-day");
  const list = document.getElementById("filter-suggestions");
  const clearFilterBtn = document.getElementById("btn-clear-filter");

  input.addEventListener("input", () => {
    customerFilter.selected = null;
    customerFilter.query = input.value;
    suggestionIndex = -1;
    updateFilterUi();
    renderSuggestions();
    renderInvoiceRows();
  });

  input.addEventListener("focus", () => {
    suggestionIndex = -1;
    renderSuggestions();
  });

  input.addEventListener("keydown", (e) => {
    const suggestions = getSuggestions(input.value);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!suggestions.length) return;
      suggestionIndex = Math.min(suggestionIndex + 1, suggestions.length - 1);
      renderSuggestions();
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      suggestionIndex = Math.max(suggestionIndex - 1, 0);
      renderSuggestions();
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (suggestionIndex >= 0) {
        applySelectedSuggestion(suggestionIndex);
      } else {
        closeSuggestions();
        renderInvoiceRows();
      }
      return;
    }
    if (e.key === "Escape") {
      closeSuggestions();
    }
  });

  list.addEventListener("mousedown", (e) => {
    e.preventDefault();
    const item = e.target.closest(".filter-suggestion");
    if (!item) return;
    applySelectedSuggestion(Number(item.dataset.index));
  });

  clearCustomerBtn.addEventListener("click", clearCustomerFilter);
  clearDatesBtn.addEventListener("click", clearDateFilter);
  clearFilterBtn.addEventListener("click", clearAllFilters);

  yearSelect.addEventListener("change", () => {
    dateFilter.year = yearSelect.value;
    dateFilter.month = "";
    dateFilter.day = "";
    updateFilterUi();
    renderInvoiceRows();
  });

  monthSelect.addEventListener("change", () => {
    dateFilter.month = monthSelect.value;
    dateFilter.day = "";
    updateFilterUi();
    renderInvoiceRows();
  });

  daySelect.addEventListener("change", () => {
    dateFilter.day = daySelect.value;
    updateFilterUi();
    renderInvoiceRows();
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".filter-combobox")) {
      closeSuggestions();
    }
  });
}

function renderInvoiceRows() {
  const tbody = document.getElementById("invoice-list");
  const listWrap = document.getElementById("invoice-list-wrap");
  const filterEmpty = document.getElementById("filter-empty-state");
  const invoices = getFilteredInvoices();
  const hasFilter = hasAnyFilter();

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
              <button type="button" class="btn-table btn-download" data-id="${summary.id}">Exportovat .txt</button>
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
    customerOptions = buildCustomerOptions(allInvoices);
    const hasTemplate = await FakturaStorage.hasTemplate();

    serverError?.classList.add("hidden");
    templateBanner.classList.toggle("hidden", !hasTemplate);

    if (!allInvoices.length) {
      emptyState.classList.remove("hidden");
      filtersBar.classList.add("hidden");
      filterEmpty.classList.add("hidden");
      listWrap.classList.add("hidden");
      return;
    }

    emptyState.classList.add("hidden");
    filtersBar.classList.remove("hidden");
    updateFilterUi();
    renderInvoiceRows();
  } catch (err) {
    showLoadError(err);
    document.getElementById("invoice-list").innerHTML = "";
    emptyState.classList.remove("hidden");
    filtersBar?.classList.add("hidden");
    filterEmpty.classList.add("hidden");
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
  initFilters();
  initListActions();
  initImport();
  await renderInvoiceList();
}

init();
