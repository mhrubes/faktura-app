# Faktura – HTML aplikace

Webová aplikace pro vyplnění faktury a stažení do PDF. Styly jsou postavené na **Tailwind CSS**.

## Instalace a spuštění

```bash
npm install
npm run build:css
```

Poté otevři `index.html` v prohlížeči.

Při úpravě stylů spusť sledování změn:

```bash
npm run watch:css
```

## Struktura

| Soubor / složka | Účel |
|-----------------|------|
| `index.html` | Struktura faktury (Tailwind třídy) |
| `src/input.css` | Tailwind vstup + vlastní komponenty |
| `css/tailwind.css` | Zkompilované CSS (generuje se buildem) |
| `tailwind.config.js` | Konfigurace Tailwindu |
| `app.js` | Výpočty, formátování, export PDF |

## Funkce

- Vyplnění dodavatele, odběratele, platebních údajů a položek
- Automatické součty a účetní formát čísel
- Export do PDF s patičkou (Vytiskl(a), číslo stránky)
