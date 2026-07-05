-- Uložení volby „Zahrnout QR kód do PDF“ u faktury

ALTER TABLE invoices
    ADD COLUMN IF NOT EXISTS pdf_include_qr BOOLEAN NOT NULL DEFAULT FALSE;
