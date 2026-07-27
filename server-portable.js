const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');
const { hashPassword, verifyPassword } = require('./src/password');
const elastic = require('./src/elastic');

const root = __dirname;
const uploadsRoot = path.join(root, 'uploads');
const ORDER_STATUSES = ['Oluşturuldu', 'Hazırlanıyor', 'Kargoya Verildi', 'Teslim Edildi', 'İptal Edildi'];
const loginAttempts = new Map();

function loadEnv() {
  const envPath = path.join(root, '.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([^#=]+?)\s*=\s*(.*)\s*$/);
    if (match && process.env[match[1]] === undefined) process.env[match[1]] = match[2];
  }
}

loadEnv();

const port = Number(process.env.PORT || 3000);
const mysqlExe = process.env.MYSQL_EXE || 'C:\\Program Files\\MySQL\\MySQL Server 9.7\\bin\\mysql.exe';
const jwtSecret = process.env.JWT_SECRET || '';

if (jwtSecret.length < 24) throw new Error('JWT_SECRET en az 24 karakter olmalıdır.');
if (!fs.existsSync(mysqlExe)) throw new Error(`MySQL aracı bulunamadı: ${mysqlExe}`);

function sqlText(value) {
  return `'${String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/\0/g, '\\0')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\x1a/g, '\\Z')
    .replace(/'/g, "\\'")}'`;
}

function mysql(sql) {
  return new Promise((resolve, reject) => {
    const args = [
      '-h', process.env.DB_HOST || '127.0.0.1',
      '-P', process.env.DB_PORT || '3306',
      '-u', process.env.DB_USER || 'root',
      '-D', process.env.DB_NAME || 'ecommerce',
      '--default-character-set=utf8mb4', '--batch', '--raw', '--skip-column-names',
      '--execute', sql
    ];
    const child = spawn(mysqlExe, args, {
      windowsHide: true,
      env: { ...process.env, MYSQL_PWD: process.env.DB_PASSWORD || '' }
    });
    let output = '';
    let error = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', chunk => { output += chunk; });
    child.stderr.on('data', chunk => { error += chunk; });
    child.on('error', reject);
    child.on('close', code => {
      if (code !== 0) return reject(Object.assign(new Error(error.trim() || 'MySQL işlemi başarısız.'), { code }));
      resolve(output.trim());
    });
  });
}

async function mysqlJson(sql) {
  const output = await mysql(sql);
  if (!output) return null;
  const line = output.split(/\r?\n/).filter(Boolean).at(-1);
  return JSON.parse(line);
}

async function ensureSchema() {
  await mysql(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255) NULL;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'staff';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified TINYINT NOT NULL DEFAULT 0;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version INT NOT NULL DEFAULT 0;
    ALTER TABLE categories ADD COLUMN IF NOT EXISTS active TINYINT NOT NULL DEFAULT 1;
    ALTER TABLE products ADD COLUMN IF NOT EXISTS category_id INT NULL;
    ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url VARCHAR(700) NULL;
    ALTER TABLE products ADD COLUMN IF NOT EXISTS active TINYINT NOT NULL DEFAULT 1;
    ALTER TABLE products ADD COLUMN IF NOT EXISTS updated_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP;
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_name VARCHAR(80) NULL;
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS status VARCHAR(30) NOT NULL DEFAULT 'Oluşturuldu';
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS updated_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP;
    ALTER TABLE logs ADD COLUMN IF NOT EXISTS user_id INT NULL;
    CREATE TABLE IF NOT EXISTS revoked_tokens (
      jti VARCHAR(80) PRIMARY KEY, expires_at DATETIME NOT NULL
    );
    CREATE TABLE IF NOT EXISTS files (
      object_key VARCHAR(255) PRIMARY KEY, owner_user_id INT NULL, original_name VARCHAR(150) NOT NULL,
      content_type VARCHAR(80) NOT NULL, size INT NOT NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    UPDATE users SET role='staff' WHERE role IS NULL OR role NOT IN ('admin','staff');
    UPDATE users SET role='admin' WHERE id=(SELECT first_id FROM (SELECT MIN(id) first_id FROM users) x)
      AND NOT EXISTS(SELECT 1 FROM (SELECT id FROM users WHERE role='admin') a);
    UPDATE products SET active=1 WHERE active IS NULL;
    UPDATE categories SET active=1 WHERE active IS NULL;
    UPDATE products SET category_id=1
      WHERE name LIKE '%MacBook%' OR name LIKE '%Monster Abra%' OR name LIKE '%MSI Thin%' OR name LIKE '%Acer Aspire%';
    DELETE FROM revoked_tokens WHERE expires_at<NOW();
  `);
  await fs.promises.mkdir(uploadsRoot, { recursive: true });
}

function base64url(value) {
  return Buffer.from(value).toString('base64url');
}

function createToken(user) {
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = base64url(JSON.stringify({
    id: user.id,
    username: user.username,
    tokenVersion: Number(user.tokenVersion || 0),
    jti: crypto.randomUUID(),
    exp: Math.floor(Date.now() / 1000) + 8 * 60 * 60
  }));
  const signature = crypto.createHmac('sha256', jwtSecret).update(`${header}.${payload}`).digest('base64url');
  return `${header}.${payload}.${signature}`;
}

function readToken(req) {
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const expected = crypto.createHmac('sha256', jwtSecret).update(`${parts[0]}.${parts[1]}`).digest('base64url');
  const actualBuffer = Buffer.from(parts[2]);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(actualBuffer, expectedBuffer)) return null;
  try {
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    return payload.exp > Math.floor(Date.now() / 1000) ? payload : null;
  } catch {
    return null;
  }
}

async function authenticatedUser(req) {
  const token = readToken(req);
  if (!token) return null;
  const user = await mysqlJson(`
    SELECT JSON_OBJECT('id',u.id,'username',u.username,'email',u.email,'role',u.role,
      'emailVerified',u.email_verified,'tokenVersion',u.token_version)
    FROM users u WHERE u.id=${Number(token.id)} LIMIT 1
  `);
  if (!user || Number(user.tokenVersion) !== Number(token.tokenVersion || 0)) return null;
  const revoked = await mysqlJson(`SELECT JSON_OBJECT('count',COUNT(*)) FROM revoked_tokens WHERE jti=${sqlText(token.jti || '')}`);
  return Number(revoked.count) ? null : { ...user, token };
}

function publicUser(user) {
  return {
    id: Number(user.id),
    username: user.username,
    email: user.email,
    role: user.role,
    emailVerified: Boolean(user.emailVerified)
  };
}

function sendJson(res, status, body) {
  const data = Buffer.from(JSON.stringify(body));
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': data.length,
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff'
  });
  res.end(data);
}

function sendEmpty(res, status = 204) {
  res.writeHead(status);
  res.end();
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.setEncoding('utf8');
    req.on('data', chunk => {
      data += chunk;
      if (data.length > 250000) reject(Object.assign(new Error('İstek çok büyük.'), { status: 413 }));
    });
    req.on('end', () => {
      try { resolve(data ? JSON.parse(data) : {}); }
      catch { reject(Object.assign(new Error('Geçersiz JSON.'), { status: 400 })); }
    });
    req.on('error', reject);
  });
}

function readBinary(req, maxBytes = 5 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', chunk => {
      size += chunk.length;
      if (size > maxBytes) {
        reject(Object.assign(new Error('Dosya en fazla 5 MB olabilir.'), { status: 413 }));
        req.destroy();
      } else chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function cleanText(value, max) {
  return String(value || '').trim().slice(0, max);
}

function pagination(url, defaultLimit = 10, maxLimit = 100) {
  const page = Math.max(1, Number.parseInt(url.searchParams.get('page') || '1', 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, Number.parseInt(url.searchParams.get('limit') || String(defaultLimit), 10) || defaultLimit));
  return { page, limit, offset: (page - 1) * limit };
}

function paged(items, total, page, limit, extra = {}) {
  return { items, total: Number(total || 0), page, pages: Math.max(1, Math.ceil(Number(total || 0) / limit)), ...extra };
}

function csvCell(value) {
  return `"${String(value ?? '').replaceAll('"', '""')}"`;
}

function sendCsv(res, rows, columns, fileName) {
  const content = `\ufeff${[
    columns.map(column => csvCell(column.label)).join(','),
    ...rows.map(row => columns.map(column => csvCell(row[column.key])).join(','))
  ].join('\r\n')}`;
  const data = Buffer.from(content);
  res.writeHead(200, {
    'content-type': 'text/csv; charset=utf-8',
    'content-length': data.length,
    'content-disposition': `attachment; filename="${fileName}"`,
    'cache-control': 'no-store'
  });
  res.end(data);
}

async function addLog(userId, action, description) {
  await mysql(`INSERT INTO logs(user_id,action,description) VALUES (${Number(userId) || 'NULL'},${sqlText(action)},${sqlText(description)})`);
}

async function serveFile(res, relative, type, cache = false) {
  const filePath = path.join(root, relative);
  const data = await fs.promises.readFile(filePath);
  res.writeHead(200, {
    'content-type': type,
    'content-length': data.length,
    'cache-control': cache ? 'public, max-age=31536000, immutable' : 'no-cache',
    'x-content-type-options': 'nosniff'
  });
  res.end(data);
}

function requireAdmin(res, user) {
  if (user.role === 'admin') return true;
  sendJson(res, 403, { message: 'Bu işlem için yönetici yetkisi gerekiyor.' });
  return false;
}

function imageUrlIsValid(value) {
  return !value || value.startsWith('https://') || value.startsWith('/uploads/');
}

async function getProduct(id) {
  return mysqlJson(`
    SELECT JSON_OBJECT('id',p.id,'name',p.name,'price',p.price,'stock',p.stock,
      'category_id',p.category_id,'image_url',p.image_url,'active',p.active,
      'category',COALESCE(c.name,'Kategorisiz'))
    FROM products p LEFT JOIN categories c ON c.id=p.category_id WHERE p.id=${Number(id)} LIMIT 1
  `);
}

async function handleApi(req, res, url) {
  if (req.method === 'GET' && url.pathname === '/api/health') {
    await mysql('SELECT 1');
    return sendJson(res, 200, {
      ok: true, mysql: true, storage: true,
      search: await elastic.health() ? 'elasticsearch' : 'database-fallback',
      elasticsearch_enabled: elastic.enabled(), mode: 'portable', release: 'management-suite'
    });
  }

  if (req.method === 'POST' && url.pathname === '/api/auth/register') {
    const body = await readBody(req);
    const username = cleanText(body.username, 50);
    const email = cleanText(body.email, 100).toLowerCase();
    const password = String(body.password || '');
    if (username.length < 3 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 8) {
      return sendJson(res, 400, { message: 'Geçerli e-posta kullan; kullanıcı adı en az 3, parola en az 8 karakter olmalıdır.' });
    }
    const existing = await mysqlJson(`SELECT JSON_OBJECT('count',COUNT(*)) FROM users WHERE username=${sqlText(username)} OR email=${sqlText(email)}`);
    if (Number(existing.count)) return sendJson(res, 409, { message: 'Kullanıcı adı veya e-posta kullanılıyor.' });
    const count = await mysqlJson("SELECT JSON_OBJECT('count',COUNT(*)) FROM users");
    const role = Number(count.count) === 0 ? 'admin' : 'staff';
    const passwordHash = await hashPassword(password);
    const created = await mysqlJson(`
      INSERT INTO users(username,password,password_hash,email,role) VALUES (${sqlText(username)},'',${sqlText(passwordHash)},${sqlText(email)},${sqlText(role)});
      SELECT JSON_OBJECT('id',LAST_INSERT_ID(),'username',${sqlText(username)},'email',${sqlText(email)},
        'role',${sqlText(role)},'emailVerified',0,'tokenVersion',0);
    `);
    await addLog(created.id, 'REGISTER', `${username} hesabı ${role === 'admin' ? 'yönetici' : 'personel'} olarak oluşturuldu.`);
    return sendJson(res, 201, { token: createToken(created), user: publicUser(created) });
  }

  if (req.method === 'POST' && url.pathname === '/api/auth/login') {
    const body = await readBody(req);
    const username = cleanText(body.username, 50);
    const password = String(body.password || '');
    const attemptKey = `${req.socket.remoteAddress || 'local'}:${username.toLowerCase()}`;
    const attempt = loginAttempts.get(attemptKey);
    if (attempt?.blockedUntil > Date.now()) {
      return sendJson(res, 429, { message: 'Çok fazla hatalı deneme yapıldı. 15 dakika sonra tekrar dene.' });
    }
    const user = await mysqlJson(`
      SELECT JSON_OBJECT('id',id,'username',username,'email',email,'password_hash',password_hash,
        'role',role,'emailVerified',email_verified,'tokenVersion',token_version)
      FROM users WHERE username=${sqlText(username)} LIMIT 1
    `);
    if (!user || !(await verifyPassword(password, user.password_hash))) {
      const count = Number(attempt?.count || 0) + 1;
      loginAttempts.set(attemptKey, { count, blockedUntil: count >= 5 ? Date.now() + 15 * 60 * 1000 : 0 });
      return sendJson(res, 401, { message: 'Kullanıcı adı veya parola yanlış.' });
    }
    loginAttempts.delete(attemptKey);
    await addLog(user.id, 'LOGIN', `${user.username} giriş yaptı.`);
    return sendJson(res, 200, { token: createToken(user), user: publicUser(user) });
  }

  const user = await authenticatedUser(req);
  if (!user) return sendJson(res, 401, { message: 'Oturum geçersiz veya süresi dolmuş.' });

  if (req.method === 'GET' && url.pathname === '/api/auth/me') {
    return sendJson(res, 200, { user: publicUser(user) });
  }

  if (req.method === 'POST' && url.pathname === '/api/auth/logout') {
    await mysql(`INSERT IGNORE INTO revoked_tokens(jti,expires_at) VALUES (${sqlText(user.token.jti)},FROM_UNIXTIME(${Number(user.token.exp)}))`);
    return sendEmpty(res);
  }

  if (req.method === 'POST' && url.pathname === '/api/auth/change-password') {
    const body = await readBody(req);
    const current = await mysqlJson(`SELECT JSON_OBJECT('password_hash',password_hash) FROM users WHERE id=${user.id}`);
    if (!(await verifyPassword(String(body.currentPassword || ''), current.password_hash))) {
      return sendJson(res, 400, { message: 'Mevcut parola yanlış.' });
    }
    const nextPassword = String(body.newPassword || '');
    if (nextPassword.length < 8) return sendJson(res, 400, { message: 'Yeni parola en az 8 karakter olmalıdır.' });
    await mysql(`UPDATE users SET password_hash=${sqlText(await hashPassword(nextPassword))},token_version=token_version+1 WHERE id=${user.id}`);
    await addLog(user.id, 'CHANGE_PASSWORD', `${user.username} parolasını değiştirdi.`);
    return sendJson(res, 200, { ok: true });
  }

  if (req.method === 'GET' && url.pathname === '/api/users') {
    if (!requireAdmin(res, user)) return;
    const rows = await mysqlJson(`
      SELECT COALESCE(JSON_ARRAYAGG(JSON_OBJECT('id',id,'username',username,'email',email,'role',role,
        'email_verified',email_verified,'created_at',created_at)),JSON_ARRAY())
      FROM (SELECT id,username,email,role,email_verified,DATE_FORMAT(created_at,'%Y-%m-%dT%H:%i:%s') created_at FROM users ORDER BY id) x
    `);
    return sendJson(res, 200, rows || []);
  }

  if (req.method === 'GET' && url.pathname === '/api/export/products') {
    if (!requireAdmin(res, user)) return;
    const rows = await mysqlJson(`
      SELECT COALESCE(JSON_ARRAYAGG(JSON_OBJECT('id',id,'name',name,'category',category,'price',price,
        'stock',stock,'status',status,'image_url',image_url)),JSON_ARRAY())
      FROM (SELECT p.id,p.name,c.name category,p.price,p.stock,
        IF(p.active=1,'Aktif','Arşiv') status,p.image_url
        FROM products p LEFT JOIN categories c ON c.id=p.category_id ORDER BY p.id) x
    `) || [];
    return sendCsv(res, rows, [
      { key: 'id', label: 'ID' }, { key: 'name', label: 'Ürün' }, { key: 'category', label: 'Kategori' },
      { key: 'price', label: 'Fiyat' }, { key: 'stock', label: 'Stok' }, { key: 'status', label: 'Durum' },
      { key: 'image_url', label: 'Fotoğraf' }
    ], 'e-ticaret-urunler.csv');
  }

  if (req.method === 'GET' && url.pathname === '/api/export/orders') {
    if (!requireAdmin(res, user)) return;
    const rows = await mysqlJson(`
      SELECT COALESCE(JSON_ARRAYAGG(JSON_OBJECT('id',id,'customer_name',customer_name,'products',products,
        'total',total,'status',status,'created_at',created_at)),JSON_ARRAY())
      FROM (SELECT o.id,o.customer_name,GROUP_CONCAT(CONCAT(p.name,' x',oi.quantity) SEPARATOR ', ') products,
        o.total,o.status,DATE_FORMAT(o.created_at,'%Y-%m-%dT%H:%i:%s') created_at
        FROM orders o LEFT JOIN order_items oi ON oi.order_id=o.id LEFT JOIN products p ON p.id=oi.product_id
        GROUP BY o.id,o.customer_name,o.total,o.status,o.created_at ORDER BY o.id) x
    `) || [];
    return sendCsv(res, rows, [
      { key: 'id', label: 'Sipariş No' }, { key: 'customer_name', label: 'Müşteri' },
      { key: 'products', label: 'Ürünler' }, { key: 'total', label: 'Toplam' },
      { key: 'status', label: 'Durum' }, { key: 'created_at', label: 'Tarih' }
    ], 'e-ticaret-siparisler.csv');
  }

  if (req.method === 'GET' && url.pathname === '/api/export/backup') {
    if (!requireAdmin(res, user)) return;
    const backup = await mysqlJson(`
      SELECT JSON_OBJECT(
        'exportedAt',DATE_FORMAT(NOW(),'%Y-%m-%dT%H:%i:%s'),
        'categories',(SELECT COALESCE(JSON_ARRAYAGG(JSON_OBJECT('id',id,'name',name,'active',active)),JSON_ARRAY()) FROM categories),
        'products',(SELECT COALESCE(JSON_ARRAYAGG(JSON_OBJECT('id',id,'name',name,'price',price,'stock',stock,
          'category_id',category_id,'image_url',image_url,'active',active)),JSON_ARRAY()) FROM products),
        'orders',(SELECT COALESCE(JSON_ARRAYAGG(JSON_OBJECT('id',id,'user_id',user_id,'customer_name',customer_name,
          'total',total,'status',status,'created_at',created_at)),JSON_ARRAY()) FROM orders),
        'orderItems',(SELECT COALESCE(JSON_ARRAYAGG(JSON_OBJECT('id',id,'order_id',order_id,'product_id',product_id,
          'quantity',quantity,'unit_price',unit_price)),JSON_ARRAY()) FROM order_items),
        'stockMovements',(SELECT COALESCE(JSON_ARRAYAGG(JSON_OBJECT('id',id,'product_id',product_id,'user_id',user_id,
          'quantity_change',quantity_change,'reason',reason,'created_at',created_at)),JSON_ARRAY()) FROM stock_movements)
      )
    `);
    const data = Buffer.from(JSON.stringify(backup, null, 2));
    res.writeHead(200, {
      'content-type': 'application/json; charset=utf-8',
      'content-length': data.length,
      'content-disposition': 'attachment; filename="e-ticaret-yedek.json"',
      'cache-control': 'no-store'
    });
    res.end(data);
    return;
  }

  const roleMatch = url.pathname.match(/^\/api\/users\/(\d+)\/role$/);
  if (req.method === 'PATCH' && roleMatch) {
    if (!requireAdmin(res, user)) return;
    const body = await readBody(req);
    const role = body.role === 'admin' ? 'admin' : body.role === 'staff' ? 'staff' : '';
    if (!role) return sendJson(res, 400, { message: 'Geçersiz kullanıcı rolü.' });
    const targetId = Number(roleMatch[1]);
    if (targetId === Number(user.id) && role !== 'admin') {
      const admins = await mysqlJson("SELECT JSON_OBJECT('count',COUNT(*)) FROM users WHERE role='admin'");
      if (Number(admins.count) < 2) return sendJson(res, 409, { message: 'Sistemde en az bir yönetici kalmalıdır.' });
    }
    const result = await mysqlJson(`UPDATE users SET role=${sqlText(role)} WHERE id=${targetId}; SELECT JSON_OBJECT('affected',ROW_COUNT());`);
    if (!Number(result.affected)) return sendJson(res, 404, { message: 'Kullanıcı bulunamadı.' });
    await addLog(user.id, 'CHANGE_ROLE', `#${targetId} kullanıcısının rolü ${role} yapıldı.`);
    return sendJson(res, 200, { id: targetId, role });
  }

  if (req.method === 'GET' && url.pathname === '/api/categories') {
    const showAll = user.role === 'admin' && url.searchParams.get('all') === '1';
    const rows = await mysqlJson(`
      SELECT COALESCE(JSON_ARRAYAGG(JSON_OBJECT('id',id,'name',name,'active',active,'product_count',product_count)),JSON_ARRAY())
      FROM (SELECT c.id,c.name,c.active,COUNT(p.id) product_count FROM categories c
      LEFT JOIN products p ON p.category_id=c.id AND p.active=1
      ${showAll ? '' : 'WHERE c.active=1'} GROUP BY c.id,c.name,c.active ORDER BY c.name) x
    `);
    return sendJson(res, 200, rows || []);
  }

  if (req.method === 'POST' && url.pathname === '/api/categories') {
    if (!requireAdmin(res, user)) return;
    const name = cleanText((await readBody(req)).name, 60);
    if (name.length < 2) return sendJson(res, 400, { message: 'Kategori adı en az 2 karakter olmalıdır.' });
    const category = await mysqlJson(`INSERT INTO categories(name,active) VALUES (${sqlText(name)},1);
      SELECT JSON_OBJECT('id',LAST_INSERT_ID(),'name',${sqlText(name)},'active',1,'product_count',0);`);
    await addLog(user.id, 'ADD_CATEGORY', `${name} kategorisi eklendi.`);
    return sendJson(res, 201, category);
  }

  const categoryMatch = url.pathname.match(/^\/api\/categories\/(\d+)$/);
  if (req.method === 'PUT' && categoryMatch) {
    if (!requireAdmin(res, user)) return;
    const body = await readBody(req);
    const name = cleanText(body.name, 60);
    const active = body.active === false || body.active === 0 ? 0 : 1;
    if (name.length < 2) return sendJson(res, 400, { message: 'Kategori adı en az 2 karakter olmalıdır.' });
    const result = await mysqlJson(`UPDATE categories SET name=${sqlText(name)},active=${active} WHERE id=${Number(categoryMatch[1])};
      SELECT JSON_OBJECT('affected',ROW_COUNT());`);
    if (!Number(result.affected)) return sendJson(res, 404, { message: 'Kategori bulunamadı.' });
    await addLog(user.id, 'UPDATE_CATEGORY', `${name} kategorisi güncellendi.`);
    return sendJson(res, 200, { id: Number(categoryMatch[1]), name, active });
  }

  if (req.method === 'DELETE' && categoryMatch) {
    if (!requireAdmin(res, user)) return;
    const id = Number(categoryMatch[1]);
    const used = await mysqlJson(`SELECT JSON_OBJECT('count',COUNT(*)) FROM products WHERE category_id=${id} AND active=1`);
    if (Number(used.count)) return sendJson(res, 409, { message: 'İçinde aktif ürün bulunan kategori arşivlenemez.' });
    const result = await mysqlJson(`UPDATE categories SET active=0 WHERE id=${id}; SELECT JSON_OBJECT('affected',ROW_COUNT());`);
    if (!Number(result.affected)) return sendJson(res, 404, { message: 'Kategori bulunamadı.' });
    await addLog(user.id, 'ARCHIVE_CATEGORY', `#${id} kategorisi arşivlendi.`);
    return sendEmpty(res);
  }

  if (req.method === 'POST' && url.pathname === '/api/uploads/product-image') {
    if (!requireAdmin(res, user)) return;
    const types = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };
    const contentType = cleanText(req.headers['content-type'], 80).toLowerCase();
    if (!types[contentType]) return sendJson(res, 400, { message: 'JPG, PNG, WEBP veya GIF dosyası seçmelisin.' });
    const bytes = await readBinary(req);
    if (!bytes.length) return sendJson(res, 400, { message: 'Dosya boş.' });
    const originalName = cleanText(decodeURIComponent(req.headers['x-file-name'] || 'urun-gorseli'), 150);
    const fileName = `${crypto.randomUUID()}.${types[contentType]}`;
    await fs.promises.writeFile(path.join(uploadsRoot, fileName), bytes);
    await mysql(`INSERT INTO files(object_key,owner_user_id,original_name,content_type,size)
      VALUES (${sqlText(fileName)},${user.id},${sqlText(originalName)},${sqlText(contentType)},${bytes.length})`);
    await addLog(user.id, 'UPLOAD_IMAGE', `${originalName} görseli yüklendi.`);
    return sendJson(res, 201, { url: `/uploads/${fileName}` });
  }

  if (req.method === 'GET' && url.pathname === '/api/products') {
    const { page, limit, offset } = pagination(url, 10, 100);
    const q = cleanText(url.searchParams.get('q'), 100);
    const showAll = user.role === 'admin' && url.searchParams.get('status') === 'all';
    const elasticRows = await elastic.searchProducts(q);
    if (elasticRows) {
      const activeRows = showAll ? elasticRows : elasticRows.filter(item => Number(item.active ?? 1));
      return sendJson(res, 200, paged(activeRows.slice(offset, offset + limit), activeRows.length, page, limit, { searchEngine: 'elasticsearch' }));
    }
    const search = q ? `AND (p.name LIKE ${sqlText(`%${q}%`)} OR c.name LIKE ${sqlText(`%${q}%`)})` : '';
    const active = showAll ? '' : 'AND p.active=1';
    const total = await mysqlJson(`SELECT JSON_OBJECT('count',COUNT(*)) FROM products p LEFT JOIN categories c ON c.id=p.category_id WHERE 1=1 ${active} ${search}`);
    const rows = await mysqlJson(`
      SELECT COALESCE(JSON_ARRAYAGG(JSON_OBJECT('id',id,'name',name,'price',price,'stock',stock,
        'category_id',category_id,'image_url',image_url,'active',active,'category',category)),JSON_ARRAY())
      FROM (SELECT p.id,p.name,p.price,p.stock,p.category_id,p.image_url,p.active,COALESCE(c.name,'Kategorisiz') category
        FROM products p LEFT JOIN categories c ON c.id=p.category_id WHERE 1=1 ${active} ${search}
        ORDER BY p.id DESC LIMIT ${limit} OFFSET ${offset}) x
    `);
    return sendJson(res, 200, paged(rows || [], total.count, page, limit, { searchEngine: 'database' }));
  }

  if (req.method === 'POST' && url.pathname === '/api/products') {
    if (!requireAdmin(res, user)) return;
    const body = await readBody(req);
    const name = cleanText(body.name, 120);
    const price = Number(body.price);
    const stock = Number(body.stock);
    const categoryId = Number(body.categoryId);
    const imageUrl = cleanText(body.imageUrl, 700);
    const active = body.active === false || body.active === 0 ? 0 : 1;
    if (!name || !Number.isFinite(price) || price < 0 || !Number.isInteger(stock) || stock < 0 ||
        !Number.isInteger(categoryId) || !imageUrlIsValid(imageUrl)) {
      return sendJson(res, 400, { message: 'Ürün bilgileri geçersiz.' });
    }
    const product = await mysqlJson(`
      INSERT INTO products(name,price,stock,category_id,image_url,active,updated_at)
      VALUES (${sqlText(name)},${price},${stock},${categoryId},${imageUrl ? sqlText(imageUrl) : 'NULL'},${active},NOW());
      SELECT JSON_OBJECT('id',LAST_INSERT_ID(),'name',${sqlText(name)},'price',${price},'stock',${stock},
        'category_id',${categoryId},'image_url',${imageUrl ? sqlText(imageUrl) : 'NULL'},'active',${active},
        'category',(SELECT COALESCE(name,'Kategorisiz') FROM categories WHERE id=${categoryId}));
    `);
    await addLog(user.id, 'ADD_PRODUCT', `${name} ürünü eklendi.`);
    await elastic.indexProduct(product).catch(error => console.warn(error.message));
    return sendJson(res, 201, product);
  }

  const productMatch = url.pathname.match(/^\/api\/products\/(\d+)$/);
  if (req.method === 'PUT' && productMatch) {
    if (!requireAdmin(res, user)) return;
    const id = Number(productMatch[1]);
    const old = await getProduct(id);
    if (!old) return sendJson(res, 404, { message: 'Ürün bulunamadı.' });
    const body = await readBody(req);
    const name = cleanText(body.name, 120);
    const price = Number(body.price);
    const stock = Number(body.stock);
    const categoryId = Number(body.categoryId);
    const imageUrl = cleanText(body.imageUrl, 700);
    const active = body.active === false || body.active === 0 ? 0 : 1;
    if (!name || !Number.isFinite(price) || price < 0 || !Number.isInteger(stock) || stock < 0 ||
        !Number.isInteger(categoryId) || !imageUrlIsValid(imageUrl)) {
      return sendJson(res, 400, { message: 'Ürün bilgileri geçersiz.' });
    }
    await mysql(`START TRANSACTION;
      UPDATE products SET name=${sqlText(name)},price=${price},stock=${stock},category_id=${categoryId},
        image_url=${imageUrl ? sqlText(imageUrl) : 'NULL'},active=${active},updated_at=NOW() WHERE id=${id};
      ${Number(old.stock) !== stock ? `INSERT INTO stock_movements(product_id,user_id,quantity_change,reason)
        VALUES (${id},${user.id},${stock - Number(old.stock)},'Ürün düzenleme');` : ''}
      COMMIT;`);
    const product = await getProduct(id);
    await addLog(user.id, 'UPDATE_PRODUCT', `${name} ürünü güncellendi.`);
    await elastic.indexProduct(product).catch(error => console.warn(error.message));
    return sendJson(res, 200, product);
  }

  if (req.method === 'DELETE' && productMatch) {
    if (!requireAdmin(res, user)) return;
    const id = Number(productMatch[1]);
    const result = await mysqlJson(`UPDATE products SET active=0,updated_at=NOW() WHERE id=${id} AND active=1;
      SELECT JSON_OBJECT('affected',ROW_COUNT());`);
    if (!Number(result.affected)) return sendJson(res, 404, { message: 'Ürün bulunamadı.' });
    await addLog(user.id, 'ARCHIVE_PRODUCT', `#${id} ürünü arşivlendi.`);
    await elastic.deleteProduct(id).catch(error => console.warn(error.message));
    return sendEmpty(res);
  }

  if (req.method === 'GET' && url.pathname === '/api/orders') {
    const { page, limit, offset } = pagination(url, 10, 100);
    const q = cleanText(url.searchParams.get('q'), 80);
    const status = cleanText(url.searchParams.get('status'), 30);
    const filters = [
      q ? `(o.customer_name LIKE ${sqlText(`%${q}%`)} OR CAST(o.id AS CHAR) LIKE ${sqlText(`%${q}%`)})` : '',
      status ? `o.status=${sqlText(status)}` : ''
    ].filter(Boolean);
    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const total = await mysqlJson(`SELECT JSON_OBJECT('count',COUNT(*)) FROM orders o ${where}`);
    const rows = await mysqlJson(`
      SELECT COALESCE(JSON_ARRAYAGG(JSON_OBJECT('id',id,'username',username,'total',total,'status',status,
        'created_at',created_at,'updated_at',updated_at,'products',products)),JSON_ARRAY())
      FROM (SELECT o.id,COALESCE(NULLIF(o.customer_name,''),u.username) username,o.total,o.status,
        DATE_FORMAT(o.created_at,'%Y-%m-%dT%H:%i:%s') created_at,DATE_FORMAT(o.updated_at,'%Y-%m-%dT%H:%i:%s') updated_at,
        GROUP_CONCAT(CONCAT(p.name,' x',oi.quantity) SEPARATOR ', ') products
      FROM orders o LEFT JOIN users u ON u.id=o.user_id LEFT JOIN order_items oi ON oi.order_id=o.id
      LEFT JOIN products p ON p.id=oi.product_id ${where}
      GROUP BY o.id,o.customer_name,u.username,o.total,o.status,o.created_at,o.updated_at
      ORDER BY o.id DESC LIMIT ${limit} OFFSET ${offset}) x
    `);
    return sendJson(res, 200, paged(rows || [], total.count, page, limit, { statuses: ORDER_STATUSES }));
  }

  if (req.method === 'POST' && url.pathname === '/api/orders') {
    const body = await readBody(req);
    const customerName = cleanText(body.customerName, 80) || user.username;
    const requestedDate = cleanText(body.orderDate, 10);
    if (requestedDate && (!/^\d{4}-\d{2}-\d{2}$/.test(requestedDate) || requestedDate > new Date().toISOString().slice(0, 10))) {
      return sendJson(res, 400, { message: 'Sipariş tarihi geçersiz.' });
    }
    const rawItems = Array.isArray(body.items) ? body.items : [{ productId: body.productId, quantity: body.quantity }];
    const combined = new Map();
    for (const item of rawItems.slice(0, 25)) {
      const productId = Number(item.productId);
      const quantity = Number(item.quantity);
      if (!Number.isInteger(productId) || productId < 1 || !Number.isInteger(quantity) || quantity < 1) {
        return sendJson(res, 400, { message: 'Sipariş ürünleri geçersiz.' });
      }
      combined.set(productId, (combined.get(productId) || 0) + quantity);
    }
    const items = [];
    for (const [productId, quantity] of combined) {
      const product = await getProduct(productId);
      if (!product || !Number(product.active) || Number(product.stock) < quantity) {
        return sendJson(res, 409, { message: `${product?.name || 'Seçilen ürün'} için yeterli stok yok.` });
      }
      items.push({ ...product, quantity });
    }
    if (!items.length) return sendJson(res, 400, { message: 'Siparişe en az bir ürün eklemelisin.' });
    const total = items.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);
    const createdAt = requestedDate ? `${requestedDate} 12:00:00` : null;
    const statements = [`START TRANSACTION`,
      `INSERT INTO orders(user_id,customer_name,total,status,created_at,updated_at)
       VALUES (${user.id},${sqlText(customerName)},${total},'Oluşturuldu',${createdAt ? sqlText(createdAt) : 'NOW()'},NOW())`,
      'SET @order_id=LAST_INSERT_ID()'
    ];
    for (const item of items) {
      statements.push(
        `INSERT INTO order_items(order_id,product_id,quantity,unit_price) VALUES (@order_id,${item.id},${item.quantity},${Number(item.price)})`,
        `UPDATE products SET stock=stock-${item.quantity},updated_at=NOW() WHERE id=${item.id} AND stock>=${item.quantity}`,
        `INSERT INTO stock_movements(product_id,user_id,quantity_change,reason)
          VALUES (${item.id},${user.id},${-item.quantity},CONCAT('Sipariş #',@order_id))`
      );
    }
    statements.push('COMMIT', `SELECT JSON_OBJECT('id',@order_id,'total',${total},'status','Oluşturuldu')`);
    const order = await mysqlJson(statements.join(';\n'));
    await addLog(user.id, 'CREATE_ORDER', `#${order.id} siparişi ${items.length} ürün çeşidiyle oluşturuldu.`);
    return sendJson(res, 201, order);
  }

  const orderMatch = url.pathname.match(/^\/api\/orders\/(\d+)$/);
  if (req.method === 'GET' && orderMatch) {
    const id = Number(orderMatch[1]);
    const order = await mysqlJson(`
      SELECT JSON_OBJECT('id',o.id,'username',COALESCE(NULLIF(o.customer_name,''),u.username),'total',o.total,
        'status',o.status,'created_at',DATE_FORMAT(o.created_at,'%Y-%m-%dT%H:%i:%s'))
      FROM orders o LEFT JOIN users u ON u.id=o.user_id WHERE o.id=${id}
    `);
    if (!order) return sendJson(res, 404, { message: 'Sipariş bulunamadı.' });
    order.items = await mysqlJson(`
      SELECT COALESCE(JSON_ARRAYAGG(JSON_OBJECT('product_id',product_id,'name',name,'quantity',quantity,'unit_price',unit_price)),JSON_ARRAY())
      FROM (SELECT oi.product_id,p.name,oi.quantity,oi.unit_price FROM order_items oi
        LEFT JOIN products p ON p.id=oi.product_id WHERE oi.order_id=${id}) x
    `) || [];
    return sendJson(res, 200, order);
  }

  if (req.method === 'PATCH' && orderMatch) {
    const id = Number(orderMatch[1]);
    const status = cleanText((await readBody(req)).status, 30);
    if (!ORDER_STATUSES.includes(status)) return sendJson(res, 400, { message: 'Geçersiz sipariş durumu.' });
    const order = await mysqlJson(`SELECT JSON_OBJECT('status',status) FROM orders WHERE id=${id}`);
    if (!order) return sendJson(res, 404, { message: 'Sipariş bulunamadı.' });
    if (order.status === 'İptal Edildi' && status !== order.status) {
      return sendJson(res, 409, { message: 'İptal edilen sipariş yeniden açılamaz.' });
    }
    if (status === 'İptal Edildi' && order.status !== status) {
      await mysql(`
        START TRANSACTION;
        UPDATE products p JOIN order_items oi ON oi.product_id=p.id SET p.stock=p.stock+oi.quantity,p.updated_at=NOW()
          WHERE oi.order_id=${id};
        INSERT INTO stock_movements(product_id,user_id,quantity_change,reason)
          SELECT product_id,${user.id},quantity,${sqlText(`Sipariş iptali #${id}`)} FROM order_items WHERE order_id=${id};
        UPDATE orders SET status='İptal Edildi',updated_at=NOW() WHERE id=${id};
        COMMIT;
      `);
    } else {
      await mysql(`UPDATE orders SET status=${sqlText(status)},updated_at=NOW() WHERE id=${id}`);
    }
    await addLog(user.id, 'UPDATE_ORDER', `#${id} sipariş durumu "${status}" yapıldı.`);
    return sendJson(res, 200, { id, status });
  }

  if (req.method === 'GET' && url.pathname === '/api/stock-movements') {
    const { page, limit, offset } = pagination(url, 15, 100);
    const total = await mysqlJson("SELECT JSON_OBJECT('count',COUNT(*)) FROM stock_movements");
    const rows = await mysqlJson(`
      SELECT COALESCE(JSON_ARRAYAGG(JSON_OBJECT('id',id,'product',product,'quantity_change',quantity_change,
        'reason',reason,'username',username,'created_at',created_at)),JSON_ARRAY())
      FROM (SELECT sm.id,p.name product,sm.quantity_change,sm.reason,u.username,
        DATE_FORMAT(sm.created_at,'%Y-%m-%dT%H:%i:%s') created_at
      FROM stock_movements sm JOIN products p ON p.id=sm.product_id LEFT JOIN users u ON u.id=sm.user_id
      ORDER BY sm.id DESC LIMIT ${limit} OFFSET ${offset}) x
    `);
    return sendJson(res, 200, paged(rows || [], total.count, page, limit));
  }

  if (req.method === 'POST' && url.pathname === '/api/stock-movements') {
    if (!requireAdmin(res, user)) return;
    const body = await readBody(req);
    const productId = Number(body.productId);
    const change = Number(body.change);
    const reason = cleanText(body.reason, 50) || 'Manuel';
    if (!Number.isInteger(productId) || productId < 1 || !Number.isInteger(change) || change === 0) {
      return sendJson(res, 400, { message: 'Stok değişikliği geçersiz.' });
    }
    const product = await getProduct(productId);
    if (!product) return sendJson(res, 404, { message: 'Ürün bulunamadı.' });
    if (Number(product.stock) + change < 0) return sendJson(res, 409, { message: 'Stok sıfırın altına düşemez.' });
    await mysql(`START TRANSACTION;
      UPDATE products SET stock=stock+${change},updated_at=NOW() WHERE id=${productId};
      INSERT INTO stock_movements(product_id,user_id,quantity_change,reason)
        VALUES (${productId},${user.id},${change},${sqlText(reason)});
      COMMIT;`);
    await addLog(user.id, 'STOCK_CHANGE', `${product.name} stoku ${change > 0 ? '+' : ''}${change} değiştirildi.`);
    return sendJson(res, 201, { productId, change });
  }

  if (req.method === 'GET' && url.pathname === '/api/logs') {
    if (!requireAdmin(res, user)) return;
    const { page, limit, offset } = pagination(url, 20, 100);
    const total = await mysqlJson("SELECT JSON_OBJECT('count',COUNT(*)) FROM logs");
    const rows = await mysqlJson(`
      SELECT COALESCE(JSON_ARRAYAGG(JSON_OBJECT('id',id,'action',action,'description',description,
        'username',username,'created_at',created_at)),JSON_ARRAY())
      FROM (SELECT l.id,l.action,l.description,u.username,DATE_FORMAT(l.created_at,'%Y-%m-%dT%H:%i:%s') created_at
      FROM logs l LEFT JOIN users u ON u.id=l.user_id ORDER BY l.id DESC LIMIT ${limit} OFFSET ${offset}) x
    `);
    return sendJson(res, 200, paged(rows || [], total.count, page, limit));
  }

  if (req.method === 'GET' && url.pathname === '/api/dashboard') {
    const days = [7, 30, 90].includes(Number(url.searchParams.get('days'))) ? Number(url.searchParams.get('days')) : 7;
    const data = await mysqlJson(`
      SELECT JSON_OBJECT(
        'product_count',(SELECT COUNT(*) FROM products WHERE active=1),
        'stock_count',(SELECT COALESCE(SUM(stock),0) FROM products WHERE active=1),
        'order_count',(SELECT COUNT(*) FROM orders),
        'total_sales',(SELECT COALESCE(SUM(total),0) FROM orders WHERE status<>'İptal Edildi'),
        'lowStock',(SELECT COALESCE(JSON_ARRAYAGG(JSON_OBJECT('id',id,'name',name,'stock',stock)),JSON_ARRAY())
          FROM (SELECT id,name,stock FROM products WHERE active=1 ORDER BY stock ASC LIMIT 5) low_rows),
        'salesSeries',(SELECT COALESCE(JSON_ARRAYAGG(JSON_OBJECT('day',day,'total',total)),JSON_ARRAY())
          FROM (SELECT DATE_FORMAT(created_at,'%Y-%m-%d') day,SUM(total) total FROM orders
            WHERE status<>'İptal Edildi' AND created_at>=DATE_SUB(CURDATE(),INTERVAL ${days - 1} DAY)
            GROUP BY DATE(created_at) ORDER BY day) sales_rows),
        'orderStatuses',(SELECT COALESCE(JSON_ARRAYAGG(JSON_OBJECT('status',status,'count',count)),JSON_ARRAY())
          FROM (SELECT status,COUNT(*) count FROM orders GROUP BY status ORDER BY count DESC) status_rows),
        'categoryTotals',(SELECT COALESCE(JSON_ARRAYAGG(JSON_OBJECT('category',category,'count',count)),JSON_ARRAY())
          FROM (SELECT COALESCE(c.name,'Kategorisiz') category,COUNT(p.id) count FROM products p
            LEFT JOIN categories c ON c.id=p.category_id WHERE p.active=1 GROUP BY c.name ORDER BY count DESC) category_rows)
      )
    `);
    return sendJson(res, 200, { ...data, days });
  }

  return sendJson(res, 404, { message: 'Adres bulunamadı.' });
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    if (url.pathname.startsWith('/api/')) return await handleApi(req, res, url);
    if (req.method !== 'GET') return sendJson(res, 405, { message: 'Yöntem desteklenmiyor.' });
    if (url.pathname === '/') return await serveFile(res, 'index.html', 'text/html; charset=utf-8');
    if (/^\/css\/[a-zA-Z0-9._-]+\.css$/.test(url.pathname)) return await serveFile(res, url.pathname.slice(1), 'text/css; charset=utf-8');
    if (/^\/js\/[a-zA-Z0-9._-]+\.js$/.test(url.pathname)) return await serveFile(res, url.pathname.slice(1), 'application/javascript; charset=utf-8');
    if (/^\/uploads\/[a-zA-Z0-9._-]+$/.test(url.pathname)) {
      const extension = path.extname(url.pathname).toLowerCase();
      const types = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif' };
      return await serveFile(res, path.join('uploads', path.basename(url.pathname)), types[extension] || 'application/octet-stream', true);
    }
    return sendJson(res, 404, { message: 'Adres bulunamadı.' });
  } catch (error) {
    console.error(error);
    const duplicate = /Duplicate entry/i.test(error.message);
    const missing = error.code === 'ENOENT';
    sendJson(res, error.status || (missing ? 404 : duplicate ? 409 : 500), {
      message: missing ? 'Dosya bulunamadı.' : duplicate ? 'Bu kayıt zaten mevcut.' : (error.status ? error.message : 'Sunucu hatası oluştu.')
    });
  }
});

let elasticRetryTimer = null;

async function syncElasticsearch() {
  if (!elastic.enabled()) return;
  const products = await mysqlJson(`
    SELECT COALESCE(JSON_ARRAYAGG(JSON_OBJECT('id',id,'name',name,'price',price,'stock',stock,
      'category_id',category_id,'image_url',image_url,'active',active,'category',category)),JSON_ARRAY())
    FROM (SELECT p.id,p.name,p.price,p.stock,p.category_id,p.image_url,p.active,COALESCE(c.name,'Kategorisiz') category
      FROM products p LEFT JOIN categories c ON c.id=p.category_id WHERE p.active=1 ORDER BY p.id) x
  `) || [];
  await elastic.replaceProducts(products);
  console.log(`Elasticsearch bağlantısı başarılı. ${products.length} ürün aktarıldı.`);
  if (elasticRetryTimer) {
    clearInterval(elasticRetryTimer);
    elasticRetryTimer = null;
  }
}

async function connectElasticsearch() {
  if (!elastic.enabled()) return;
  try {
    await syncElasticsearch();
  } catch (error) {
    console.warn(`Elasticsearch henüz hazır değil: ${error.message}`);
    if (!elasticRetryTimer) {
      elasticRetryTimer = setInterval(() => syncElasticsearch().catch(() => {}), 15000);
      elasticRetryTimer.unref();
    }
  }
}

async function start() {
  await ensureSchema();
  server.listen(port, '127.0.0.1', async () => {
    try {
      await mysql('SELECT 1');
      console.log(`E-Ticaret Yönetim Sistemi: http://localhost:${port}`);
      console.log('MySQL bağlantısı başarılı. Taşınabilir mod çalışıyor.');
      await connectElasticsearch();
    } catch (error) {
      console.error('Başlangıç bağlantı hatası:', error.message);
    }
  });
}

start().catch(error => {
  console.error('Sunucu başlatılamadı:', error.message);
  process.exitCode = 1;
});
