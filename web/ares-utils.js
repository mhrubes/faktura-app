const ARES_BASE = "https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty";

function normalizeIco(value) {
  const digits = String(value || "").replace(/\D/g, "");
  return digits.length === 8 ? digits : "";
}

function buildStreetFromSidlo(sidlo) {
  if (!sidlo) return "";
  const ulice = sidlo.nazevUlice || "";
  let cislo = "";
  if (sidlo.cisloDomovni != null) cislo = String(sidlo.cisloDomovni);
  if (sidlo.cisloOrientacni != null) {
    cislo += cislo ? `/${sidlo.cisloOrientacni}` : String(sidlo.cisloOrientacni);
    if (sidlo.cisloOrientacniPismeno) cislo += sidlo.cisloOrientacniPismeno;
  }
  if (ulice && cislo) return `${ulice} ${cislo}`;
  if (ulice) return ulice;
  return sidlo.textovaAdresa?.split(",")[0]?.trim() || "";
}

function buildCityFromSidlo(sidlo) {
  if (!sidlo) return "";
  const psc = sidlo.psc ? String(sidlo.psc) : "";
  const obec = sidlo.nazevObce || sidlo.nazevSpravnihoObvodu || "";
  if (psc && obec) return `${psc}, ${obec}`;
  return psc || obec || "";
}

function mapAresToCustomer(data) {
  const sidlo = data?.sidlo || {};
  const dor = data?.adresaDorucovaci;

  let address = buildStreetFromSidlo(sidlo);
  let city = buildCityFromSidlo(sidlo);

  if (dor?.radekAdresy1) {
    address = dor.radekAdresy1.trim();
  }
  if (!city && dor?.radekAdresy3) {
    city = dor.radekAdresy3.trim();
  }

  return {
    name: data?.obchodniJmeno || "",
    address,
    city,
    country: sidlo.nazevStatu || "Česká republika",
    ico: data?.ico || "",
    dic: data?.dic || "",
  };
}

async function fetchAresByIco(ico) {
  const normalized = normalizeIco(ico);
  if (!normalized) {
    const err = new Error("Neplatné IČ — musí mít 8 číslic.");
    err.status = 400;
    throw err;
  }

  const response = await fetch(`${ARES_BASE}/${normalized}`);
  if (response.status === 404) {
    const err = new Error("Subjekt v ARES nebyl nalezen.");
    err.status = 404;
    throw err;
  }
  if (!response.ok) {
    const err = new Error("ARES API neodpovídá.");
    err.status = 502;
    throw err;
  }

  const data = await response.json();
  return mapAresToCustomer(data);
}

module.exports = {
  ARES_BASE,
  normalizeIco,
  mapAresToCustomer,
  fetchAresByIco,
};
