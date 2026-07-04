const PartySetupModal = (() => {
  const ARES_VALUE = "__ares__";
  let allPartyOptions = [];
  let showToastFn = () => {};
  let supplierCombobox = null;
  let customerCombobox = null;

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function normalizeText(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function partyHasData(party) {
    return Boolean(party && (party.name || party.ico));
  }

  function partyKey(party) {
    return (party.ico || party.name || "").trim().toLowerCase();
  }

  function mergeParty(a, b) {
    return {
      name: a.name || b.name || "",
      address: a.address || b.address || "",
      city: a.city || b.city || "",
      country: a.country || b.country || "Česká republika",
      ico: a.ico || b.ico || "",
      dic: a.dic || b.dic || "",
      email: a.email || b.email || "",
      phone: a.phone || b.phone || "",
    };
  }

  function buildAllPartyOptions(invoices) {
    const map = new Map();
    for (const inv of invoices) {
      for (const party of [inv.supplier, inv.customer]) {
        if (!partyHasData(party)) continue;
        const key = partyKey(party);
        if (!key) continue;
        const copy = {
          name: party.name || "",
          address: party.address || "",
          city: party.city || "",
          country: party.country || "Česká republika",
          ico: party.ico || "",
          dic: party.dic || "",
          email: party.email || "",
          phone: party.phone || "",
        };
        map.set(key, map.has(key) ? mergeParty(map.get(key), copy) : copy);
      }
    }
    return [...map.values()].sort((a, b) =>
      String(a.name || "").localeCompare(String(b.name || ""), "cs")
    );
  }

  function partyMatchesQuery(party, query) {
    const q = normalizeText(query);
    if (!q) return true;
    return [party.name, party.ico, party.dic, party.address, party.city].some((field) =>
      normalizeText(field).includes(q)
    );
  }

  function partyPreviewText(party) {
    return [
      party.name,
      party.address,
      party.city,
      party.ico && `IČ ${party.ico}`,
      party.dic && `DIČ ${party.dic}`,
    ]
      .filter(Boolean)
      .join(" • ");
  }

  function formatPartyMeta(party) {
    return [party.ico && `IČ ${party.ico}`, party.dic && `DIČ ${party.dic}`, party.city]
      .filter(Boolean)
      .join(" · ");
  }

  function getSuggestions(query, limit = 10) {
    const q = query.trim();
    if (!q) return allPartyOptions.slice(0, limit);
    return allPartyOptions.filter((party) => partyMatchesQuery(party, q)).slice(0, limit);
  }

  function createPartyCombobox(config) {
    const { inputId, clearId, suggestionsId, onSelect } = config;
    const input = document.getElementById(inputId);
    const clearBtn = document.getElementById(clearId);
    const suggestions = document.getElementById(suggestionsId);
    let selected = null;
    let suggestionIndex = -1;

    function closeSuggestions() {
      suggestions.classList.add("hidden");
      suggestions.innerHTML = "";
      input.setAttribute("aria-expanded", "false");
      suggestionIndex = -1;
    }

    function renderSuggestions() {
      const items = getSuggestions(input.value);
      if (!items.length) {
        closeSuggestions();
        return;
      }

      suggestions.innerHTML = items
        .map((party, index) => {
          const name = party.name || "Bez názvu";
          const meta = formatPartyMeta(party);
          return `
            <li class="filter-suggestion${index === suggestionIndex ? " is-active" : ""}" role="option" data-index="${index}">
              <div class="filter-suggestion-name">${escapeHtml(name)}</div>
              ${meta ? `<div class="filter-suggestion-meta">${escapeHtml(meta)}</div>` : ""}
            </li>
          `;
        })
        .join("");

      suggestions.classList.remove("hidden");
      input.setAttribute("aria-expanded", "true");
    }

    function applySuggestion(index) {
      const items = getSuggestions(input.value);
      const party = items[index];
      if (!party) return;
      selected = party;
      input.value = party.name || party.ico || "";
      clearBtn.classList.remove("hidden");
      closeSuggestions();
      onSelect(party);
    }

    function reset() {
      selected = null;
      input.value = "";
      clearBtn.classList.add("hidden");
      closeSuggestions();
    }

    input.addEventListener("input", () => {
      selected = null;
      clearBtn.classList.remove("hidden");
      suggestionIndex = -1;
      renderSuggestions();
      onSelect(null);
    });

    input.addEventListener("focus", () => {
      suggestionIndex = -1;
      renderSuggestions();
    });

    input.addEventListener("keydown", (e) => {
      const items = getSuggestions(input.value);
      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (!items.length) return;
        suggestionIndex = Math.min(suggestionIndex + 1, items.length - 1);
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

    suggestions.addEventListener("mousedown", (e) => {
      e.preventDefault();
      const item = e.target.closest(".filter-suggestion");
      if (item) applySuggestion(Number(item.dataset.index));
    });

    clearBtn.addEventListener("click", () => {
      reset();
      onSelect(null);
    });

    document.addEventListener("click", (e) => {
      if (!input.contains(e.target) && !suggestions.contains(e.target)) {
        closeSuggestions();
      }
    });

    return {
      reset,
      closeSuggestions,
      getSelected() {
        if (selected) return selected;
        const query = input.value.trim();
        if (!query) return null;
        const matches = allPartyOptions.filter((party) => partyMatchesQuery(party, query));
        const exact = matches.filter(
          (party) =>
            normalizeText(party.name) === normalizeText(query) ||
            String(party.ico || "").replace(/\D/g, "") === query.replace(/\D/g, "")
        );
        if (exact.length === 1) return exact[0];
        if (matches.length === 1) return matches[0];
        return null;
      },
    };
  }

  function setPanelVisible(partyKey, panel, visible) {
    const el = document.getElementById(`setup-${partyKey}-${panel}`);
    if (el) el.classList.toggle("hidden", !visible);
  }

  function updatePreview(partyKey, party) {
    const preview = document.getElementById(`setup-${partyKey}-preview`);
    const previewText = document.getElementById(`setup-${partyKey}-preview-text`);
    if (!preview || !previewText) return;
    if (party) {
      previewText.textContent = partyPreviewText(party);
      preview.classList.remove("hidden");
    } else {
      preview.classList.add("hidden");
    }
  }

  function updatePartyUi(partyKey) {
    const source = document.getElementById(`setup-${partyKey}-source`)?.value || "";
    setPanelVisible(partyKey, "ares", source === ARES_VALUE);
    setPanelVisible(partyKey, "existing-panel", source === "existing");

    if (source !== "existing") {
      updatePreview(partyKey, null);
    }
  }

  async function loadOptions() {
    const invoices = await FakturaStorage.readInvoices();
    allPartyOptions = buildAllPartyOptions(invoices);
  }

  function updateEmptyHints() {
    const empty = allPartyOptions.length === 0;
    document.querySelectorAll('#setup-supplier-source option[value="existing"], #setup-customer-source option[value="existing"]').forEach((opt) => {
      opt.disabled = empty;
    });
    document.getElementById("setup-supplier-existing-empty")?.classList.toggle("hidden", !empty);
    document.getElementById("setup-customer-existing-empty")?.classList.toggle("hidden", !empty);
  }

  async function applyPartyFromSetup(partyKey) {
    const source = document.getElementById(`setup-${partyKey}-source`)?.value || "";
    if (!source) return;

    if (source === "existing") {
      const combobox = partyKey === "supplier" ? supplierCombobox : customerCombobox;
      const party = combobox?.getSelected();
      if (party) InvoiceModel.applyPartyToForm(partyKey, party);
      return;
    }

    if (source === ARES_VALUE) {
      const ico = document.getElementById(`setup-${partyKey}-ares-ico`)?.value || "";
      const data = await PartyAres.lookup(ico);
      PartyAres.applyToForm(partyKey, data);
    }
  }

  async function loadAresPreview(partyKey) {
    const btn = document.getElementById(`setup-${partyKey}-ares-btn`);
    const ico = document.getElementById(`setup-${partyKey}-ares-ico`)?.value || "";

    btn.disabled = true;
    try {
      const data = await PartyAres.lookup(ico);
      updatePreview(partyKey, data);
      showToastFn(
        partyKey === "supplier" ? "Náhled dodavatele načten z ARES." : "Náhled odběratele načten z ARES."
      );
    } catch (err) {
      showToastFn(err.message || "Vyhledání v ARES se nezdařilo.", "error");
    } finally {
      btn.disabled = false;
    }
  }

  function open() {
    document.getElementById("party-setup-modal").classList.remove("hidden");
    document.body.classList.add("overflow-hidden");
    document.getElementById("party-setup-step-intro").classList.remove("hidden");
    document.getElementById("party-setup-step-form").classList.add("hidden");
    document.getElementById("party-setup-intro-yes").focus();
  }

  function close() {
    supplierCombobox?.closeSuggestions();
    customerCombobox?.closeSuggestions();
    document.getElementById("party-setup-modal").classList.add("hidden");
    document.body.classList.remove("overflow-hidden");
  }

  function showFormStep() {
    document.getElementById("party-setup-step-intro").classList.add("hidden");
    document.getElementById("party-setup-step-form").classList.remove("hidden");
    document.getElementById("setup-supplier-source").focus();
  }

  function resetForm() {
    ["supplier", "customer"].forEach((partyKey) => {
      const source = document.getElementById(`setup-${partyKey}-source`);
      if (source) source.value = "";
      const aresIco = document.getElementById(`setup-${partyKey}-ares-ico`);
      if (aresIco) aresIco.value = "";
      updatePartyUi(partyKey);
    });
    supplierCombobox?.reset();
    customerCombobox?.reset();
  }

  function resolveSelection(partyKey) {
    const source = document.getElementById(`setup-${partyKey}-source`)?.value || "";
    if (!source) return null;

    if (source === "existing") {
      const combobox = partyKey === "supplier" ? supplierCombobox : customerCombobox;
      return combobox?.getSelected() || null;
    }

    if (source === ARES_VALUE) {
      const ico = String(document.getElementById(`setup-${partyKey}-ares-ico`)?.value || "").replace(/\D/g, "");
      if (ico.length === 8) return { ico, name: "" };
    }

    return null;
  }

  function partiesAreSame(a, b) {
    if (!a || !b) return false;
    const icoA = String(a.ico || "").replace(/\D/g, "");
    const icoB = String(b.ico || "").replace(/\D/g, "");
    if (icoA.length === 8 && icoB.length === 8) return icoA === icoB;
    const nameA = normalizeText(a.name);
    const nameB = normalizeText(b.name);
    return Boolean(nameA && nameB && nameA === nameB);
  }

  function formatSamePartyLabel(party) {
    const parts = [party.name || "—"];
    if (party.ico) parts.push(`IČ ${party.ico}`);
    return parts.join(", ");
  }

  function openSamePartyConfirm(party) {
    const text = document.getElementById("party-same-confirm-text");
    if (text) {
      text.textContent = `Dodavatel i odběratel jsou stejný subjekt (${formatSamePartyLabel(party)}). Opravdu to tak chceš?`;
    }
    document.getElementById("party-same-confirm-modal").classList.remove("hidden");
    document.getElementById("party-same-confirm-yes").focus();
  }

  function closeSamePartyConfirm() {
    document.getElementById("party-same-confirm-modal").classList.add("hidden");
  }

  async function applySetupConfirmed() {
    await applyPartyFromSetup("supplier");
    await applyPartyFromSetup("customer");
    closeSamePartyConfirm();
    close();
    showToastFn("Údaje dodavatele a odběratele doplněny.");
    if (typeof PaymentQr !== "undefined") PaymentQr.updatePaymentQr();
  }

  function validateBeforeApply() {
    for (const partyKey of ["supplier", "customer"]) {
      const source = document.getElementById(`setup-${partyKey}-source`)?.value || "";
      if (!source) continue;

      if (source === "existing") {
        const party = resolveSelection(partyKey);
        if (!party) {
          throw new Error(
            partyKey === "supplier"
              ? "Vyber dodavatele ze seznamu (klikni na návrh)."
              : "Vyber odběratele ze seznamu (klikni na návrh)."
          );
        }
      }

      if (source === ARES_VALUE) {
        const ico = String(document.getElementById(`setup-${partyKey}-ares-ico`)?.value || "").replace(/\D/g, "");
        if (ico.length !== 8) {
          throw new Error(
            partyKey === "supplier"
              ? "Zadej platné IČO dodavatele (8 číslic)."
              : "Zadej platné IČO odběratele (8 číslic)."
          );
        }
      }
    }
  }

  async function confirmSetup() {
    const confirmBtn = document.getElementById("party-setup-confirm");
    confirmBtn.disabled = true;
    try {
      validateBeforeApply();
      const supplier = resolveSelection("supplier");
      const customer = resolveSelection("customer");

      if (partiesAreSame(supplier, customer)) {
        openSamePartyConfirm(supplier?.name ? supplier : customer);
        return;
      }

      await applySetupConfirmed();
    } catch (err) {
      showToastFn(err.message || "Doplnění údajů se nezdařilo.", "error");
    } finally {
      confirmBtn.disabled = false;
    }
  }

  async function confirmSamePartySetup() {
    const btn = document.getElementById("party-same-confirm-yes");
    btn.disabled = true;
    document.getElementById("party-setup-confirm").disabled = true;
    try {
      await applySetupConfirmed();
    } catch (err) {
      showToastFn(err.message || "Doplnění údajů se nezdařilo.", "error");
    } finally {
      btn.disabled = false;
      document.getElementById("party-setup-confirm").disabled = false;
    }
  }

  function bindEvents() {
    document.getElementById("party-setup-intro-skip").addEventListener("click", close);
    document.getElementById("party-setup-intro-yes").addEventListener("click", showFormStep);
    document.getElementById("party-setup-skip").addEventListener("click", close);
    document.getElementById("party-setup-confirm").addEventListener("click", confirmSetup);
    document.getElementById("party-setup-modal-close").addEventListener("click", close);
    document.getElementById("party-setup-modal-backdrop").addEventListener("click", close);

    document.getElementById("party-same-confirm-cancel").addEventListener("click", closeSamePartyConfirm);
    document.getElementById("party-same-confirm-yes").addEventListener("click", confirmSamePartySetup);
    document.getElementById("party-same-confirm-close").addEventListener("click", closeSamePartyConfirm);
    document.getElementById("party-same-confirm-backdrop").addEventListener("click", closeSamePartyConfirm);

    supplierCombobox = createPartyCombobox({
      inputId: "setup-supplier-search",
      clearId: "setup-supplier-search-clear",
      suggestionsId: "setup-supplier-suggestions",
      onSelect: (party) => updatePreview("supplier", party),
    });

    customerCombobox = createPartyCombobox({
      inputId: "setup-customer-search",
      clearId: "setup-customer-search-clear",
      suggestionsId: "setup-customer-suggestions",
      onSelect: (party) => updatePreview("customer", party),
    });

    ["supplier", "customer"].forEach((partyKey) => {
      document.getElementById(`setup-${partyKey}-source`).addEventListener("change", () => {
        updatePartyUi(partyKey);
      });
      document.getElementById(`setup-${partyKey}-ares-btn`).addEventListener("click", () => {
        loadAresPreview(partyKey);
      });
      document.getElementById(`setup-${partyKey}-ares-ico`).addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          loadAresPreview(partyKey);
        }
      });
    });

    document.addEventListener("keydown", (e) => {
      const sameModal = document.getElementById("party-same-confirm-modal");
      if (e.key === "Escape" && sameModal && !sameModal.classList.contains("hidden")) {
        closeSamePartyConfirm();
        return;
      }
      const modal = document.getElementById("party-setup-modal");
      if (e.key === "Escape" && modal && !modal.classList.contains("hidden")) {
        close();
      }
    });
  }

  async function maybeOpen(showToast) {
    showToastFn = showToast;
    try {
      await loadOptions();
      updateEmptyHints();
      resetForm();
      open();
    } catch (err) {
      showToast(err.message || "Načtení údajů pro modal se nezdařilo.", "error");
    }
  }

  function init(showToast) {
    showToastFn = showToast;
    bindEvents();
  }

  return { init, maybeOpen, open, close };
})();
