# Faktura – správa faktur

Projekt obsahuje dvě verze stejné aplikace:

| Složka | Typ | Popis |
|--------|-----|-------|
| [`web/`](web/) | Webová aplikace | Spustíš v prohlížeči přes lokální server |
| [`desktop/`](desktop/) | Desktopová aplikace | Electron — okno jako běžný program v PC |

Obě verze sdílejí stejné rozhraní, funkce i formát `.json` souborů.

---

## Webová verze (`web/`)

```bash
cd web
npm install
npm run build:css
npm start
```

Otevři **http://localhost:3000**

Data se ukládají do `web/data/invoices/` a šablona do `web/data/sablona.json`. Uživatelská data jsou v `.gitignore` — do gitu se necommitují.

---

## Desktopová verze (`desktop/`)

Nativní okno bez prohlížeče — vhodné pro běžné používání na PC.

### Vývoj / spuštění

```bash
cd web
npm install
npm run build:css

cd ../desktop
npm install
npm start
```

Data při vývoji: `desktop/data/`

### Sestavení instalovatelné aplikace (Windows)

```bash
cd web
npm run build:css

cd ../desktop
npm install
npm run dist
```

Výsledný soubor najdeš ve složce `desktop/dist/` (portable `.exe`).

Po instalaci se data ukládají do profilu uživatele (mimo složku programu).

---

## Rychlé příkazy z kořene projektu

```bash
npm run start:web      # spustí webovou verzi
npm run start:desktop  # spustí desktopovou verzi
npm run build:css      # zkompiluje Tailwind CSS
npm run dist:desktop   # sestaví desktop .exe
```

---

## Funkce

### Seznam faktur

- Přehled všech faktur s číslem, odběratelem, datem vystavení a částkou
- **Filtry** — odběratel (autocomplete podle jména, IČ, DIČ), datum (rok → měsíc → den)
- **Řazení** sloupců (číslo, odběratel, datum, částka)
- **Označení jako vyřízené** — u jedné faktury i hromadně pro více vybraných
- **Hromadné akce** — smazání, označení / zrušení vyřízeno u vybraných faktur
- **Import** jedné nebo více faktur ze `.json` (podporuje i starší exporty v `.txt`)
- **Export** s filtry — do jednoho `.json` souboru podle stejných kritérií jako na seznamu

### Editor faktury

- Dodavatel, odběratel, datumy, platební údaje a položky faktury
- Automatický výpočet řádků a celkové částky
- Variabilní symbol se doplňuje z čísla faktury (lze přepsat ručně)
- **Šablona** — uložení a opětovné použití dodavatele, odběratele, platebních údajů a položek
- V editoru jsou pole vizuálně oddělená podtržením; v PDF a v tabulce položek zůstává čistý vzhled
- **Export do PDF** včetně patičky se jménem a číslem stránky

### QR platba

- U způsobu platby **Převodem** se pod rekapitulací zobrazí **QR kód** ve formátu SPAYD (standard českých bank)
- Kód obsahuje účet (IBAN z pole nebo převod z čísla účtu), částku, VS, KS, datum splatnosti a zprávu
- Rámeček s nápisem **QR platba** podle běžného vzhledu platebního QR
- U platby **Hotově** nebo **Kartou** se QR nezobrazuje
- Přepínač u tlačítka **Stáhnout PDF** — volba, zda QR kód zahrnout i do exportovaného PDF

### Vzhled a data

- **Světlý / tmavý režim** na seznamu faktur (samotná faktura zůstává světlá jako dokument)
- Ukládání do `.json` v projektu (web) nebo v profilu uživatele (desktop po sestavení)
- Při startu serveru se staré soubory `.txt` automaticky přejmenují na `.json`
