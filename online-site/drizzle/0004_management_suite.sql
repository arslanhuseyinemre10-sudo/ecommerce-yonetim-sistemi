ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'staff';
ALTER TABLE users ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 0;
ALTER TABLE categories ADD COLUMN active INTEGER NOT NULL DEFAULT 1;
ALTER TABLE products ADD COLUMN active INTEGER NOT NULL DEFAULT 1;
ALTER TABLE products ADD COLUMN updated_at TEXT;
ALTER TABLE orders ADD COLUMN updated_at TEXT;

CREATE TABLE IF NOT EXISTS login_attempts (
  attempt_key TEXT PRIMARY KEY,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  blocked_until TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS files (
  object_key TEXT PRIMARY KEY,
  owner_user_id INTEGER,
  original_name TEXT NOT NULL,
  content_type TEXT NOT NULL,
  size INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(owner_user_id) REFERENCES users(id)
);

UPDATE users SET role='staff' WHERE role IS NULL OR role NOT IN ('admin','staff');
UPDATE users SET role='admin'
WHERE id=(SELECT MIN(id) FROM users)
  AND NOT EXISTS(SELECT 1 FROM users WHERE role='admin');
UPDATE products SET active=1 WHERE active IS NULL;
UPDATE categories SET active=1 WHERE active IS NULL;
UPDATE products SET updated_at=COALESCE(updated_at,CURRENT_TIMESTAMP);
UPDATE orders SET updated_at=COALESCE(updated_at,created_at,CURRENT_TIMESTAMP);
UPDATE products SET category_id=1
WHERE name LIKE '%MacBook%' OR name LIKE '%Monster Abra%' OR name LIKE '%MSI Thin%'
   OR name LIKE '%Acer Aspire%';

CREATE INDEX IF NOT EXISTS products_active_name_idx ON products(active,name);
CREATE INDEX IF NOT EXISTS orders_status_created_idx ON orders(status,created_at);
CREATE INDEX IF NOT EXISTS logs_created_idx ON logs(created_at);
