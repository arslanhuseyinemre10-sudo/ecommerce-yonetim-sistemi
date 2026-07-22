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
