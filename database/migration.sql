USE ecommerce;

SET @sql = IF(
  EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='ecommerce' AND table_name='users' AND column_name='password_hash'),
  'SELECT 1', 'ALTER TABLE users ADD COLUMN password_hash VARCHAR(255) NULL AFTER password'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='ecommerce' AND table_name='products' AND column_name='category_id'),
  'SELECT 1', 'ALTER TABLE products ADD COLUMN category_id INT NULL'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='ecommerce' AND table_name='orders' AND column_name='status'),
  'SELECT 1', "ALTER TABLE orders ADD COLUMN status VARCHAR(30) NOT NULL DEFAULT 'Oluşturuldu'"
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='ecommerce' AND table_name='logs' AND column_name='user_id'),
  'SELECT 1', 'ALTER TABLE logs ADD COLUMN user_id INT NULL'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

UPDATE products SET category_id = 1 WHERE category_id IS NULL;

ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'staff';
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified TINYINT NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version INT NOT NULL DEFAULT 0;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS active TINYINT NOT NULL DEFAULT 1;
ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url VARCHAR(700) NULL;
ALTER TABLE products ADD COLUMN IF NOT EXISTS active TINYINT NOT NULL DEFAULT 1;
ALTER TABLE products ADD COLUMN IF NOT EXISTS updated_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_name VARCHAR(80) NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS updated_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE IF NOT EXISTS revoked_tokens (
  jti VARCHAR(80) PRIMARY KEY,
  expires_at DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS files (
  object_key VARCHAR(255) PRIMARY KEY,
  owner_user_id INT NULL,
  original_name VARCHAR(150) NOT NULL,
  content_type VARCHAR(80) NOT NULL,
  size INT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

UPDATE users SET role='staff' WHERE role IS NULL OR role NOT IN ('admin','staff');
UPDATE users SET role='admin'
WHERE id=(SELECT first_id FROM (SELECT MIN(id) first_id FROM users) x)
  AND NOT EXISTS(SELECT 1 FROM (SELECT id FROM users WHERE role='admin') a);
UPDATE products SET active=1 WHERE active IS NULL;
UPDATE categories SET active=1 WHERE active IS NULL;
UPDATE products SET category_id=1
WHERE name LIKE '%MacBook%' OR name LIKE '%Monster Abra%' OR name LIKE '%MSI Thin%' OR name LIKE '%Acer Aspire%';
