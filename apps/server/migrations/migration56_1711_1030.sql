ALTER TABLE quote_translation_items ADD COLUMN IF NOT EXISTS word_count INTEGER;

ALTER TABLE quote_translation_items DROP CONSTRAINT IF EXISTS ck_quote_translation_items_word_count;
ALTER TABLE quote_translation_items
    ADD CONSTRAINT ck_quote_translation_items_word_count CHECK (word_count IS NULL OR word_count >= 0);
