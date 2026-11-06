ALTER TABLE products
ADD COLUMN IF NOT EXISTS telegram_message_id integer;
