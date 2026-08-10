const PartyAres = (() => {
  const PARTIES = {
    supplier: {
      btnId: "btn-supplier-ares",
      icoId: "supplier-ico",
      toastOk: "Údaje dodavatele načteny z ARES.",
      fields: {
        name: "supplier-name",
        address: "supplier-address",
        city: "supplier-city",
        country: "supplier-country",
        ico: "supplier-ico",
      },
    },
    customer: {
      btnId: "btn-customer-ares",
      icoId: "customer-ico",
      toastOk: "Údaje odběratele načteny z ARES.",
      fields: {
        name: "customer-name",
        address: "customer-address",
        city: "customer-city",
        country: "customer-country",
        ico: "customer-ico",
        dic: "customer-dic",
      },
    },
  };

  function applyToForm(partyKey, data) {
    const fields = PARTIES[partyKey].fields;
    document.getElementById(fields.name).value = data.name || "";
    document.getElementById(fields.address).value = data.address || "";
    document.getElementById(fields.city).value = data.city || "";
    document.getElementById(fields.country).value = data.country || "Česká republika";
    document.getElementById(fields.ico).value = data.ico || "";
    if (fields.dic) {
      document.getElementById(fields.dic).value = data.dic || "";
    }
    document.dispatchEvent(new CustomEvent("invoice-form-changed"));
  }

  async function lookup(ico) {
    const cleaned = String(ico || "").replace(/\D/g, "");
    if (cleaned.length !== 8) {
      throw new Error("Zadej platné IČO (8 číslic).");
    }

    const response = await fetch(`/api/ares/${encodeURIComponent(cleaned)}`);
    const payload = await response.json().catch(() => ({}));

    if (response.status === 404) {
      throw new Error("Subjekt v ARES nebyl nalezen.");
    }
    if (!response.ok) {
      throw new Error(payload.error || "Vyhledání v ARES se nezdařilo.");
    }

    return payload;
  }

  function bindParty(partyKey, showToast) {
    const party = PARTIES[partyKey];
    const btn = document.getElementById(party.btnId);
    const icoInput = document.getElementById(party.icoId);
    if (!btn || !icoInput) return;

    const run = async () => {
      btn.disabled = true;
      btn.setAttribute("aria-busy", "true");
      try {
        const data = await lookup(icoInput.value);
        applyToForm(partyKey, data);
        showToast(party.toastOk);
      } catch (err) {
        showToast(err.message || "Vyhledání v ARES se nezdařilo.", "error");
      } finally {
        btn.disabled = false;
        btn.removeAttribute("aria-busy");
      }
    };

    btn.addEventListener("click", run);
    icoInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        run();
      }
    });
  }

  function init(showToast) {
    bindParty("supplier", showToast);
    bindParty("customer", showToast);
  }

  return { init, lookup, applyToForm };
})();
