# Faktura – HTML aplikace

Webová aplikace pro správu faktur, vyplnění a export do PDF. Styly jsou postavené na **Tailwind CSS**.

## Instalace a spuštění

```bash
npm install
npm run build:css
npm start
```

Poté otevři v prohlížeči: **http://localhost:3000**

> Aplikace musí běžet přes lokální server (`npm start`). Přímé otevření `index.html` z disku nefunguje — prohlížeč nemůže zapisovat soubory do projektu.

Při úpravě stylů spusť sledování změn:

```bash
npm run watch:css
```

## Kde se ukládají data

| Soubor / složka | Obsah |
|-----------------|-------|
| `data/invoices/*.txt` | Jedna faktura = jeden `.txt` soubor (JSON uvnitř) |
| `data/sablona.txt` | Uložená šablona dodavatele a platebních údajů |

## Struktura

| Soubor / složka | Účel |
|-----------------|------|
| `server.js` | Lokální server + API pro zápis souborů |
| `index.html` | Hlavní stránka – seznam faktur |
| `invoice.html` | Editor faktury |
| `app-list.js` | Logika seznamu a importu |
| `app.js` | Výpočty, formátování, export PDF |
| `js/storage.js` | Komunikace s API serveru |
| `js/invoice-model.js` | Serializace a načítání dat faktury |
| `src/input.css` | Tailwind vstup + vlastní komponenty |
| `css/tailwind.css` | Zkompilované CSS (generuje se buildem) |

## Funkce

- Seznam faktur načtených ze složky `data/invoices/`
- Uložení faktury přímo do `.txt` souboru v projektu
- Import faktury ze souboru `.txt`
- Uložení šablony do `data/sablona.txt`
- Při nové faktuře volba: použít šablonu nebo prázdný formulář
- Export do PDF s patičkou (Vytiskl(a), číslo stránky)
