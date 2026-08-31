-- Ruční částka Celkem u položky faktury / šablony
-- manual_total = TRUE -> hodnota "total" se použije místo qty * unit_price
-- Odpovídá polím item.manualTotal / item.total ve web/data/invoices/*.json

ALTER TABLE invoice_items
    ADD COLUMN IF NOT EXISTS manual_total BOOLEAN        NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS total        NUMERIC(14, 4) NOT NULL DEFAULT 0;

ALTER TABLE template_items
    ADD COLUMN IF NOT EXISTS manual_total BOOLEAN        NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS total        NUMERIC(14, 4) NOT NULL DEFAULT 0;

ALTER TABLE invoice_items
    DROP CONSTRAINT IF EXISTS invoice_items_total_non_negative,
    ADD CONSTRAINT invoice_items_total_non_negative CHECK (total >= 0);

ALTER TABLE template_items
    DROP CONSTRAINT IF EXISTS template_items_total_non_negative,
    ADD CONSTRAINT template_items_total_non_negative CHECK (total >= 0);
