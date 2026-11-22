# Faktura – webová verze

Spuštění v prohlížeči přes lokální Node.js server.

## Start

```bash
npm install
npm run build:css
npm start
```

Otevři **http://localhost:3000**

## Co webová verze umí

- seznam faktur s filtrováním (odběratel, datum vystavení a **stav**: bez omezení / vyřízené / nevyřízené, platí i v okně exportu), řazením, **stránkováním** a hromadnými akcemi (stránkování: 10 / 25 / 50 / 100 / vše na stránku, výchozí 25, lišta je nahoře i dole nad a pod seznamem, volba se pamatuje v prohlížeči; dělí se až výsledek po filtrech a řazení, takže funguje stejně v JSON i PostgreSQL režimu; do 10 faktur se lišta nezobrazí)
- editor faktury s výpočtem částek, šablonami a QR platbou
- ochranu před ztrátou neuložených změn při odchodu z editoru
- export do PDF přes serverové renderování, takže text v PDF zůstává označitelný
- ukládání do JSON souborů nebo do PostgreSQL podle konfigurace

## Data

### JSON režim

| Soubor / složka | Obsah |
|-----------------|-------|
| `data/invoices/*.json` | Uložené faktury |
| `data/sablona.json` | Šablona dodavatele |

### PostgreSQL režim

- nastav v kořeni projektu `.env` a `CONNECTION_TO_PG=true`
- spusť migrace příkazem `npm run db:migrate` z kořene projektu
- migrace jsou verzované ve složce `../pg-scripts/`

## PDF export

Webový server používá endpoint `POST /api/pdf`, který vyrenderuje fakturu v Chromium/Puppeteer. Díky tomu:

- text v PDF není rasterizovaný do obrázku
- PDF má správný název dokumentu
- lze volitelně zahrnout QR kód do PDF

Kořenový README popisuje i desktopovou verzi v `../desktop/`.
