# Faktura – správa faktur

Projekt obsahuje dvě verze stejné aplikace:

| Složka | Typ | Popis |
|--------|-----|-------|
| [`web/`](web/) | Webová aplikace | Spustíš v prohlížeči přes lokální server |
| [`desktop/`](desktop/) | Desktopová aplikace | Electron — okno jako běžný program v PC |

Obě verze sdílejí stejné rozhraní, funkce i formát `.txt` souborů.

---

## Webová verze (`web/`)

```bash
cd web
npm install
npm run build:css
npm start
```

Otevři **http://localhost:3000**

Data se ukládají do `web/data/invoices/` a šablona do `web/data/sablona.txt`.

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

- Seznam faktur s filtry (odběratel, IČ/DIČ, datum)
- Editor faktury a export do PDF
- Ukládání do `.txt` souborů v projektu / v desktopové aplikaci
- Šablona dodavatele a platebních údajů
- Import a export faktur
