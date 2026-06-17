# Faktura – desktopová verze

Electron aplikace se stejným rozhraním jako webová verze v `../web/`.

## Spuštění

Nejdřív zkompiluj CSS ve webové složce:

```bash
cd ../web
npm install
npm run build:css
```

Poté spusť desktop:

```bash
cd ../desktop
npm install
npm start
```

## Sestavení .exe pro Windows

```bash
cd ../web && npm run build:css
cd ../desktop && npm run dist
```

Výstup: `desktop/dist/Faktura-1.0.0-portable.exe`

Instalační verze: `npm run dist:installer`

## Data

| Režim | Kde se ukládají faktury |
|-------|-------------------------|
| Vývoj (`npm start`) | `desktop/data/invoices/` |
| Sestavená aplikace | Složka uživatelských dat Windows |
