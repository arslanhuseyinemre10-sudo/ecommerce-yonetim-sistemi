const INDEX_HTML = __INDEX_HTML__;
const STYLE_CSS = __STYLE_CSS__;
const STORAGE_JS = __STORAGE_JS__;
const APP_JS = __APP_JS__;
const OG_BASE64 = __OG_BASE64__;

const encoder = new TextEncoder();
const PBKDF2_ITERATIONS = 100000;
const PRODUCT_IMAGES = Object.freeze([
  {
    name: 'Asus',
    url: 'https://dlcdnwebimgs.asus.com/gain/282fa6b1-5d9e-4950-ab46-1da2defbe6a3/'
  },
  {
    name: 'Iphone 16',
    url: 'https://www.apple.com/newsroom/images/2024/09/apple-introduces-iphone-16-and-iphone-16-plus/article/Apple-iPhone-16-lineup-240909_big.jpg.large.jpg'
  },
  {
    name: 'Monster',
    url: 'https://assets.mmsrg.com/isr/166325/c1/-/ASSET_MMS_171543010/fee_786_587_png'
  },
  {
    name: 'Iphone 15',
    url: 'https://www.apple.com/newsroom/images/2023/09/apple-debuts-iphone-15-and-iphone-15-plus/tile/Apple-iPhone-15-lineup-hero-230912.jpg.og.jpg'
  },
  {
    name: 'Rampage RM-K90 Vector RGB Gaming Mikrofonlu Kulaklık',
    url: 'https://www.rampage.com.tr/cdn/shop/files/6108.png?v=1719569415'
  },
  {
    name: 'Airpod',
    url: 'https://www.apple.com/v/airpods-4/g/images/meta/airpods-4__gnjh1t3yjxm6_og.png?202606221042'
  },
  {
    name: 'Apple iPhone 16 128 GB',
    url: 'https://www.apple.com/newsroom/images/2024/09/apple-introduces-iphone-16-and-iphone-16-plus/article/Apple-iPhone-16-lineup-240909_big.jpg.large.jpg'
  },
  {
    name: 'Apple iPhone 15 128 GB',
    url: 'https://www.apple.com/newsroom/images/2023/09/apple-debuts-iphone-15-and-iphone-15-plus/tile/Apple-iPhone-15-lineup-hero-230912.jpg.og.jpg'
  },
  {
    name: 'Samsung Galaxy S25 256 GB',
    url: 'https://images.samsung.com/tr/smartphones/galaxy-s25/images/galaxy-s25-features-kv.jpg?imbypass=true'
  },
  {
    name: 'Samsung Galaxy A56 5G 256 GB',
    url: 'https://images.samsung.com/is/image/samsung/p6pim/in/sm-a566ezagins/gallery/in-galaxy-a56-5g-sm-a566-539175-sm-a566ezagins-thumb-545213579?%24684_547_PNG%24'
  },
  {
    name: 'Xiaomi 14T 12GB 256GB',
    url: 'https://i02.appmifile.com/318_item_tr/07/01/2025/32e436acf1fca695512f637954351845.png'
  },
  {
    name: 'Redmi Note 14 Pro 5G 12GB 512GB',
    url: 'https://i02.appmifile.com/452_item_tr/07/01/2025/49f223d3d10622ce01a3d5713381d89c.png'
  },
  {
    name: 'Honor 400 256 GB',
    url: 'https://www-file.honor.com/content/dam/honor/common/events/2025/honor-400/400.png'
  },
  {
    name: 'Apple MacBook Air 13 M4 256 GB',
    url: 'https://www.apple.com/v/macbook-air/z/images/overview/design/color/design_top_skyblue__eepkvlvjzcia_large.jpg'
  },
  {
    name: 'Apple MacBook Air 15 M4 256 GB',
    url: 'https://www.apple.com/v/macbook-air/z/images/overview/design/color/design_top_skyblue__eepkvlvjzcia_large.jpg'
  },
  {
    name: 'Monster Abra A5 V21.6.6',
    url: 'https://assets.mmsrg.com/isr/166325/c1/-/ASSET_MMS_171543010/fee_786_587_png'
  },
  {
    name: 'Monster Abra A5 V21.5',
    url: 'https://assets.mmsrg.com/isr/166325/c1/-/ASSET_MMS_171543010/fee_786_587_png'
  },
  {
    name: 'Monster Abra A5 V21.8.2',
    url: 'https://assets.mmsrg.com/isr/166325/c1/-/ASSET_MMS_171543010/fee_786_587_png'
  },
  {
    name: 'Acer Aspire Lite AL16-51P-55L6',
    url: 'https://reimg-teknosa-cloud-prod.mncdn.com/mnresize/600/600/productimage/125035213/125035213_0_MC/96657448.jpg'
  },
  {
    name: 'MSI Thin 15 B12UC-1478XTR',
    url: 'https://storage-asset.msi.com/global/picture/image/feature/nb/Thin/Thin15-B13V/images/kv-bg-top.jpg'
  },
  {
    name: 'Apple AirPods 4',
    url: 'https://www.apple.com/v/airpods-4/g/images/meta/airpods-4__gnjh1t3yjxm6_og.png?202606221042'
  },
  {
    name: 'Samsung Galaxy Buds3',
    url: 'https://images.samsung.com/is/image/samsung/p6pim/tr/2407/gallery/tr-galaxy-buds3-r530-sm-r530nzwatur-542191950?%241164_776_PNG%24'
  },
  {
    name: 'Logitech K380 Bluetooth Klavye',
    url: 'https://cyberegalos.com.pe/cdn/shop/products/Cyber-Peru-Regalos-Teclado-Bluetooth-Logitech-K380-Wireless-Gris-Grey-Frontal.jpg?v=1664769769&width=360'
  },
  {
    name: 'JBL Tune 520BT',
    url: 'https://global.jbl.com/dw/image/v2/BFND_PRD/on/demandware.static/-/Sites-masterCatalog_Harman/default/dwc23d813b/01.JBL_Tune_520BT_ProductImage_Hero_Black.png?sh=535&sw=535'
  },
  {
    name: 'Logitech G102 Lightsync',
    url: 'https://resource.logitechg.com/w_544%2Ch_466%2Car_7%3A6%2Cc_pad%2Cq_auto%2Cf_auto%2Cdpr_1.0/d_transparent.gif/content/dam/gaming/en/products/refreshed-g203/2025-update/g203-mouse-top-angle-black-gallery-1.png'
  },
  {
    name: 'Samsung Portable SSD T7 1TB',
    url: 'https://images.samsung.com/is/image/samsung/p6pim/us/mu-pc1t0t-am/gallery/us-portable-ssd-t7-mu-pc1t0t-am-552408754?%24product-details-jpg%24='
  },
  {
    name: 'UGREEN Revodok 4-in-1 USB-C Hub',
    url: 'https://us.ugreen.com/cdn/shop/files/ugreen-revodok-7-in-1-usb-c-hub-4k-hdmi-100w-charging-1048449.png?v=1773372971'
  }
]);
let schemaPromise;

const ORDER_STATUSES = Object.freeze([
  'Oluşturuldu',
  'Hazırlanıyor',
  'Kargoya Verildi',
  'Teslim Edildi',
  'İptal Edildi'
]);

function json(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
      ...extraHeaders
    }
  });
}

function asset(body, type) {
  return new Response(body, {
    headers: {
      'content-type': `${type}; charset=utf-8`,
      'cache-control': 'public, max-age=300',
      'x-content-type-options': 'nosniff',
      'referrer-policy': 'strict-origin-when-cross-origin'
    }
  });
}

function bytesToBase64url(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64urlToBytes(value) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(normalized + '='.repeat((4 - normalized.length % 4) % 4));
  return Uint8Array.from(binary, char => char.charCodeAt(0));
}

async function sha256(value) {
  return bytesToBase64url(new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value))));
}

async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({
    name: 'PBKDF2', hash: 'SHA-256', salt, iterations: PBKDF2_ITERATIONS
  }, key, 256);
  return `pbkdf2$${bytesToBase64url(salt)}$${bytesToBase64url(new Uint8Array(bits))}`;
}

async function verifyPassword(password, stored) {
  const [method, saltText, expected] = String(stored || '').split('$');
  if (method !== 'pbkdf2' || !saltText || !expected) return false;
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({
    name: 'PBKDF2', hash: 'SHA-256', salt: base64urlToBytes(saltText), iterations: PBKDF2_ITERATIONS
  }, key, 256);
  return bytesToBase64url(new Uint8Array(bits)) === expected;
}

async function addColumnIfMissing(env, table, column, definition) {
  const columns = await env.DB.prepare(`PRAGMA table_info(${table})`).all();
  if (!columns.results.some(item => item.name === column)) {
    await env.DB.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`).run();
  }
}

async function ensureSchema(env) {
  if (!schemaPromise) schemaPromise = env.DB.batch([
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL, email TEXT NOT NULL UNIQUE,
      role TEXT NOT NULL DEFAULT 'staff', email_verified INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL,
      expires_at TEXT NOT NULL, FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE)`),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS login_attempts (
      attempt_key TEXT PRIMARY KEY, attempt_count INTEGER NOT NULL DEFAULT 0,
      blocked_until TEXT, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE, active INTEGER NOT NULL DEFAULT 1)`),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL,
      price REAL NOT NULL DEFAULT 0, stock INTEGER NOT NULL DEFAULT 0,
      category_id INTEGER, image_url TEXT, active INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(category_id) REFERENCES categories(id))`),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY, user_id INTEGER, customer_name TEXT, total REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'Oluşturuldu', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id))`),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT, order_id INTEGER NOT NULL, product_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL, unit_price REAL NOT NULL,
      FOREIGN KEY(order_id) REFERENCES orders(id), FOREIGN KEY(product_id) REFERENCES products(id))`),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS stock_movements (
      id INTEGER PRIMARY KEY AUTOINCREMENT, product_id INTEGER NOT NULL, user_id INTEGER,
      quantity_change INTEGER NOT NULL, reason TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(product_id) REFERENCES products(id), FOREIGN KEY(user_id) REFERENCES users(id))`),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, action TEXT NOT NULL,
      description TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id))`),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS files (
      object_key TEXT PRIMARY KEY, owner_user_id INTEGER, original_name TEXT NOT NULL,
      content_type TEXT NOT NULL, size INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(owner_user_id) REFERENCES users(id))`),
    env.DB.prepare("INSERT OR IGNORE INTO categories(id,name) VALUES (1,'Bilgisayar'),(2,'Telefon'),(3,'Aksesuar')"),
    env.DB.prepare(`INSERT OR IGNORE INTO products(id,name,price,stock,category_id) VALUES
      (4,'Asus',39000,21,1),(7,'Iphone 16',72000,3,2),(8,'Monster',49000,3,1),
      (9,'Iphone 15',44000,7,2),(10,'Rampage RM-K90 Vector RGB Gaming Mikrofonlu Kulaklık',725,4,3),
      (11,'Airpod',3200,12,3)`)
  ]).then(async result => {
    await addColumnIfMissing(env, 'users', 'role', "TEXT NOT NULL DEFAULT 'staff'");
    await addColumnIfMissing(env, 'users', 'email_verified', 'INTEGER NOT NULL DEFAULT 0');
    await addColumnIfMissing(env, 'categories', 'active', 'INTEGER NOT NULL DEFAULT 1');
    await addColumnIfMissing(env, 'products', 'image_url', 'TEXT');
    await addColumnIfMissing(env, 'products', 'active', 'INTEGER NOT NULL DEFAULT 1');
    await addColumnIfMissing(env, 'products', 'updated_at', 'TEXT');
    await addColumnIfMissing(env, 'orders', 'customer_name', 'TEXT');
    await addColumnIfMissing(env, 'orders', 'updated_at', 'TEXT');
    await env.DB.batch([
      env.DB.prepare("UPDATE users SET role='staff' WHERE role IS NULL OR role NOT IN ('admin','staff')"),
      env.DB.prepare(`UPDATE users SET role='admin'
        WHERE id=(SELECT MIN(id) FROM users)
        AND NOT EXISTS(SELECT 1 FROM users WHERE role='admin')`),
      env.DB.prepare("UPDATE products SET active=1 WHERE active IS NULL"),
      env.DB.prepare("UPDATE categories SET active=1 WHERE active IS NULL"),
      env.DB.prepare("UPDATE products SET updated_at=COALESCE(updated_at,CURRENT_TIMESTAMP)"),
      env.DB.prepare("UPDATE orders SET updated_at=COALESCE(updated_at,created_at,CURRENT_TIMESTAMP)"),
      env.DB.prepare(`UPDATE products SET category_id=1
        WHERE name LIKE '%MacBook%' OR name LIKE '%Monster Abra%' OR name LIKE '%MSI Thin%'
        OR name LIKE '%Acer Aspire%'`),
      env.DB.prepare('CREATE INDEX IF NOT EXISTS products_active_name_idx ON products(active,name)'),
      env.DB.prepare('CREATE INDEX IF NOT EXISTS orders_status_created_idx ON orders(status,created_at)'),
      env.DB.prepare('CREATE INDEX IF NOT EXISTS logs_created_idx ON logs(created_at)')
    ]);
    await env.DB.batch(PRODUCT_IMAGES.map(product =>
      env.DB.prepare("UPDATE products SET image_url=? WHERE name=? AND COALESCE(image_url,'')=''")
        .bind(product.url, product.name)
    ));
    return result;
  }).catch(error => {
    schemaPromise = null;
    throw error;
  });
  return schemaPromise;
}

async function readBody(request) {
  const length = Number(request.headers.get('content-length') || 0);
  if (length > 250000) throw Object.assign(new Error('İstek çok büyük.'), { status: 413 });
  return request.json().catch(() => {
    throw Object.assign(new Error('Geçersiz istek.'), { status: 400 });
  });
}

function cleanText(value, max) {
  return String(value || '').trim().slice(0, max);
}

function getPagination(url, defaultLimit = 10, maxLimit = 100) {
  const page = Math.max(1, Number.parseInt(url.searchParams.get('page') || '1', 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, Number.parseInt(url.searchParams.get('limit') || String(defaultLimit), 10) || defaultLimit));
  return { page, limit, offset: (page - 1) * limit };
}

function paged(items, total, page, limit, extra = {}) {
  return {
    items,
    total: Number(total || 0),
    page,
    pages: Math.max(1, Math.ceil(Number(total || 0) / limit)),
    ...extra
  };
}

function hasRole(user, roles) {
  return roles.includes(user?.role);
}

function forbidden() {
  return json({ message: 'Bu işlem için yönetici yetkisi gerekiyor.' }, 403);
}

function csvCell(value) {
  return `"${String(value ?? '').replaceAll('"', '""')}"`;
}

function csvResponse(rows, columns, fileName) {
  const lines = [
    columns.map(column => csvCell(column.label)).join(','),
    ...rows.map(row => columns.map(column => csvCell(row[column.key])).join(','))
  ];
  return new Response(`\ufeff${lines.join('\r\n')}`, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="${fileName}"`,
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff'
    }
  });
}

async function addLog(env, userId, action, description) {
  await env.DB.prepare('INSERT INTO logs(user_id,action,description) VALUES(?,?,?)')
    .bind(userId || null, action, description).run();
}

async function createSession(env, user) {
  const token = bytesToBase64url(crypto.getRandomValues(new Uint8Array(32)));
  const expires = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString();
  await env.DB.prepare('INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,?)')
    .bind(await sha256(token), user.id, expires).run();
  return token;
}

function bearerToken(request) {
  return String(request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
}

async function requireUser(request, env) {
  const token = bearerToken(request);
  if (!token) return null;
  return env.DB.prepare(`SELECT u.id,u.username,u.email,u.role,u.email_verified
    FROM sessions s JOIN users u ON u.id=s.user_id
    WHERE s.token_hash=? AND s.expires_at>? LIMIT 1`)
    .bind(await sha256(token), new Date().toISOString()).first();
}

function publicUser(row) {
  return {
    id: Number(row.id),
    username: row.username,
    email: row.email,
    role: row.role,
    emailVerified: Boolean(row.email_verified)
  };
}

function loginKey(request, username) {
  const ip = cleanText(request.headers.get('cf-connecting-ip') || 'local', 64);
  return `${ip}:${String(username).toLowerCase()}`;
}

async function registerFailedLogin(env, key) {
  const current = await env.DB.prepare('SELECT attempt_count FROM login_attempts WHERE attempt_key=?').bind(key).first();
  const attempts = Number(current?.attempt_count || 0) + 1;
  const blockedUntil = attempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000).toISOString() : null;
  await env.DB.prepare(`INSERT INTO login_attempts(attempt_key,attempt_count,blocked_until,updated_at)
    VALUES(?,?,?,CURRENT_TIMESTAMP)
    ON CONFLICT(attempt_key) DO UPDATE SET attempt_count=excluded.attempt_count,
    blocked_until=excluded.blocked_until,updated_at=CURRENT_TIMESTAMP`)
    .bind(key, attempts, blockedUntil).run();
}

function imageUrlIsValid(value) {
  return !value || value.startsWith('https://') || value.startsWith('/uploads/');
}

async function validateProductInput(env, body) {
  const product = {
    name: cleanText(body.name, 120),
    price: Number(body.price),
    stock: Number(body.stock),
    categoryId: Number(body.categoryId),
    imageUrl: cleanText(body.imageUrl, 700),
    active: body.active === false || body.active === 0 ? 0 : 1
  };
  if (!product.name || !Number.isFinite(product.price) || product.price < 0 ||
      !Number.isInteger(product.stock) || product.stock < 0 ||
      !Number.isInteger(product.categoryId) || !imageUrlIsValid(product.imageUrl)) {
    throw Object.assign(new Error('Ürün bilgileri geçersiz.'), { status: 400 });
  }
  const category = await env.DB.prepare('SELECT id FROM categories WHERE id=? AND active=1')
    .bind(product.categoryId).first();
  if (!category) throw Object.assign(new Error('Geçerli bir kategori seçmelisin.'), { status: 400 });
  return product;
}

async function fetchProduct(env, id) {
  return env.DB.prepare(`SELECT p.id,p.name,p.price,p.stock,p.category_id,p.image_url,p.active,p.updated_at,
    COALESCE(c.name,'Kategorisiz') category
    FROM products p LEFT JOIN categories c ON c.id=p.category_id WHERE p.id=?`).bind(id).first();
}

async function syncElasticProduct(env, product) {
  if (!env.ELASTICSEARCH_URL || !product) return;
  const headers = { 'content-type': 'application/json' };
  if (env.ELASTICSEARCH_API_KEY) headers.authorization = `ApiKey ${env.ELASTICSEARCH_API_KEY}`;
  await fetch(`${String(env.ELASTICSEARCH_URL).replace(/\/$/, '')}/products/_doc/${product.id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(product)
  }).catch(() => null);
}

async function deleteElasticProduct(env, id) {
  if (!env.ELASTICSEARCH_URL) return;
  const headers = {};
  if (env.ELASTICSEARCH_API_KEY) headers.authorization = `ApiKey ${env.ELASTICSEARCH_API_KEY}`;
  await fetch(`${String(env.ELASTICSEARCH_URL).replace(/\/$/, '')}/products/_doc/${id}`, {
    method: 'DELETE',
    headers
  }).catch(() => null);
}

async function elasticProductIds(env, query, page, limit) {
  if (!env.ELASTICSEARCH_URL || !query) return null;
  const headers = { 'content-type': 'application/json' };
  if (env.ELASTICSEARCH_API_KEY) headers.authorization = `ApiKey ${env.ELASTICSEARCH_API_KEY}`;
  try {
    const response = await fetch(`${String(env.ELASTICSEARCH_URL).replace(/\/$/, '')}/products/_search`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        from: (page - 1) * limit,
        size: limit,
        query: { multi_match: { query, fields: ['name^3', 'category'] } }
      })
    });
    if (!response.ok) return null;
    const data = await response.json();
    return {
      ids: data.hits.hits.map(hit => Number(hit._id)).filter(Number.isInteger),
      total: Number(data.hits.total?.value || 0)
    };
  } catch {
    return null;
  }
}

async function handleApi(request, env, url) {
  if (request.method === 'GET' && url.pathname === '/api/health') {
    const catalog = await env.DB.prepare(`SELECT COUNT(*) product_count,
      SUM(CASE WHEN COALESCE(TRIM(image_url),'') <> '' THEN 1 ELSE 0 END) product_image_count
      FROM products WHERE active=1`).first();
    return json({
      ok: true,
      database: true,
      storage: Boolean(env.FILES),
      search: env.ELASTICSEARCH_URL ? 'elasticsearch' : 'database-fallback',
      mode: 'online',
      release: 'management-suite',
      productCount: Number(catalog.product_count || 0),
      productImageCount: Number(catalog.product_image_count || 0)
    });
  }

  if (request.method === 'POST' && url.pathname === '/api/auth/register') {
    const body = await readBody(request);
    const username = cleanText(body.username, 50);
    const email = cleanText(body.email, 100).toLowerCase();
    const password = String(body.password || '');
    if (username.length < 3 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 8) {
      return json({ message: 'Geçerli e-posta kullan; kullanıcı adı en az 3, parola en az 8 karakter olmalıdır.' }, 400);
    }
    const existing = await env.DB.prepare('SELECT id FROM users WHERE username=? OR email=? LIMIT 1')
      .bind(username, email).first();
    if (existing) return json({ message: 'Kullanıcı adı veya e-posta kullanılıyor.' }, 409);
    const count = await env.DB.prepare('SELECT COUNT(*) count FROM users').first();
    const role = Number(count.count) === 0 ? 'admin' : 'staff';
    const result = await env.DB.prepare('INSERT INTO users(username,password_hash,email,role) VALUES(?,?,?,?)')
      .bind(username, await hashPassword(password), email, role).run();
    const user = { id: Number(result.meta.last_row_id), username, email, role, email_verified: 0 };
    await addLog(env, user.id, 'REGISTER', `${username} hesabı ${role === 'admin' ? 'yönetici' : 'personel'} olarak oluşturuldu.`);
    return json({ token: await createSession(env, user), user: publicUser(user) }, 201);
  }

  if (request.method === 'POST' && url.pathname === '/api/auth/login') {
    const body = await readBody(request);
    const username = cleanText(body.username, 50);
    const key = loginKey(request, username);
    const attempt = await env.DB.prepare('SELECT blocked_until FROM login_attempts WHERE attempt_key=?').bind(key).first();
    if (attempt?.blocked_until && attempt.blocked_until > new Date().toISOString()) {
      return json({ message: 'Çok fazla hatalı deneme yapıldı. 15 dakika sonra tekrar dene.' }, 429);
    }
    const row = await env.DB.prepare('SELECT id,username,email,password_hash,role,email_verified FROM users WHERE username=? LIMIT 1')
      .bind(username).first();
    if (!row || !(await verifyPassword(String(body.password || ''), row.password_hash))) {
      await registerFailedLogin(env, key);
      return json({ message: 'Kullanıcı adı veya parola yanlış.' }, 401);
    }
    await env.DB.prepare('DELETE FROM login_attempts WHERE attempt_key=?').bind(key).run();
    const user = publicUser(row);
    await addLog(env, user.id, 'LOGIN', `${user.username} giriş yaptı.`);
    return json({ token: await createSession(env, user), user });
  }

  const userRow = await requireUser(request, env);
  if (!userRow) return json({ message: 'Oturum geçersiz veya süresi dolmuş.' }, 401);
  const user = publicUser(userRow);

  if (request.method === 'GET' && url.pathname === '/api/auth/me') return json({ user });

  if (request.method === 'POST' && url.pathname === '/api/auth/logout') {
    await env.DB.prepare('DELETE FROM sessions WHERE token_hash=?').bind(await sha256(bearerToken(request))).run();
    return new Response(null, { status: 204 });
  }

  if (request.method === 'POST' && url.pathname === '/api/auth/change-password') {
    const body = await readBody(request);
    const currentPassword = String(body.currentPassword || '');
    const newPassword = String(body.newPassword || '');
    const row = await env.DB.prepare('SELECT password_hash FROM users WHERE id=?').bind(user.id).first();
    if (!(await verifyPassword(currentPassword, row.password_hash))) {
      return json({ message: 'Mevcut parola yanlış.' }, 400);
    }
    if (newPassword.length < 8) return json({ message: 'Yeni parola en az 8 karakter olmalıdır.' }, 400);
    await env.DB.prepare('UPDATE users SET password_hash=? WHERE id=?').bind(await hashPassword(newPassword), user.id).run();
    await env.DB.prepare('DELETE FROM sessions WHERE user_id=? AND token_hash<>?')
      .bind(user.id, await sha256(bearerToken(request))).run();
    await addLog(env, user.id, 'CHANGE_PASSWORD', `${user.username} parolasını değiştirdi.`);
    return json({ ok: true });
  }

  if (request.method === 'GET' && url.pathname === '/api/users') {
    if (!hasRole(user, ['admin'])) return forbidden();
    const rows = await env.DB.prepare(`SELECT id,username,email,role,email_verified,created_at
      FROM users ORDER BY id`).all();
    return json(rows.results);
  }

  if (request.method === 'GET' && url.pathname === '/api/export/products') {
    if (!hasRole(user, ['admin'])) return forbidden();
    const rows = await env.DB.prepare(`SELECT p.id,p.name,c.name category,p.price,p.stock,
      CASE WHEN p.active=1 THEN 'Aktif' ELSE 'Arşiv' END status,p.image_url
      FROM products p LEFT JOIN categories c ON c.id=p.category_id ORDER BY p.id`).all();
    return csvResponse(rows.results, [
      { key: 'id', label: 'ID' }, { key: 'name', label: 'Ürün' }, { key: 'category', label: 'Kategori' },
      { key: 'price', label: 'Fiyat' }, { key: 'stock', label: 'Stok' }, { key: 'status', label: 'Durum' },
      { key: 'image_url', label: 'Fotoğraf' }
    ], 'e-ticaret-urunler.csv');
  }

  if (request.method === 'GET' && url.pathname === '/api/export/orders') {
    if (!hasRole(user, ['admin'])) return forbidden();
    const rows = await env.DB.prepare(`SELECT o.id,o.customer_name,o.total,o.status,o.created_at,
      GROUP_CONCAT(p.name || ' x' || oi.quantity, ', ') products FROM orders o
      LEFT JOIN order_items oi ON oi.order_id=o.id LEFT JOIN products p ON p.id=oi.product_id
      GROUP BY o.id,o.customer_name,o.total,o.status,o.created_at ORDER BY o.id`).all();
    return csvResponse(rows.results, [
      { key: 'id', label: 'Sipariş No' }, { key: 'customer_name', label: 'Müşteri' },
      { key: 'products', label: 'Ürünler' }, { key: 'total', label: 'Toplam' },
      { key: 'status', label: 'Durum' }, { key: 'created_at', label: 'Tarih' }
    ], 'e-ticaret-siparisler.csv');
  }

  if (request.method === 'GET' && url.pathname === '/api/export/backup') {
    if (!hasRole(user, ['admin'])) return forbidden();
    const [categoryRows, productRows, orderRows, orderItemRows, stockRows] = await env.DB.batch([
      env.DB.prepare('SELECT * FROM categories ORDER BY id'),
      env.DB.prepare('SELECT * FROM products ORDER BY id'),
      env.DB.prepare('SELECT * FROM orders ORDER BY id'),
      env.DB.prepare('SELECT * FROM order_items ORDER BY id'),
      env.DB.prepare('SELECT * FROM stock_movements ORDER BY id')
    ]);
    return new Response(JSON.stringify({
      exportedAt: new Date().toISOString(),
      categories: categoryRows.results,
      products: productRows.results,
      orders: orderRows.results,
      orderItems: orderItemRows.results,
      stockMovements: stockRows.results
    }, null, 2), {
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'content-disposition': 'attachment; filename="e-ticaret-yedek.json"',
        'cache-control': 'no-store'
      }
    });
  }

  const userRoleMatch = url.pathname.match(/^\/api\/users\/(\d+)\/role$/);
  if (request.method === 'PATCH' && userRoleMatch) {
    if (!hasRole(user, ['admin'])) return forbidden();
    const targetId = Number(userRoleMatch[1]);
    const body = await readBody(request);
    const role = body.role === 'admin' ? 'admin' : body.role === 'staff' ? 'staff' : '';
    if (!role) return json({ message: 'Geçersiz kullanıcı rolü.' }, 400);
    if (targetId === user.id && role !== 'admin') {
      const admins = await env.DB.prepare("SELECT COUNT(*) count FROM users WHERE role='admin'").first();
      if (Number(admins.count) < 2) return json({ message: 'Sistemde en az bir yönetici kalmalıdır.' }, 409);
    }
    const result = await env.DB.prepare('UPDATE users SET role=? WHERE id=?').bind(role, targetId).run();
    if (!result.meta.changes) return json({ message: 'Kullanıcı bulunamadı.' }, 404);
    await addLog(env, user.id, 'CHANGE_ROLE', `#${targetId} kullanıcısının rolü ${role} yapıldı.`);
    return json({ id: targetId, role });
  }

  if (request.method === 'GET' && url.pathname === '/api/categories') {
    const showAll = hasRole(user, ['admin']) && url.searchParams.get('all') === '1';
    const rows = await env.DB.prepare(`SELECT c.id,c.name,c.active,COUNT(p.id) product_count FROM categories c
      LEFT JOIN products p ON p.category_id=c.id AND p.active=1
      WHERE (?=1 OR c.active=1) GROUP BY c.id,c.name,c.active ORDER BY c.name`)
      .bind(showAll ? 1 : 0).all();
    return json(rows.results);
  }

  if (request.method === 'POST' && url.pathname === '/api/categories') {
    if (!hasRole(user, ['admin'])) return forbidden();
    const name = cleanText((await readBody(request)).name, 60);
    if (name.length < 2) return json({ message: 'Kategori adı en az 2 karakter olmalıdır.' }, 400);
    try {
      const result = await env.DB.prepare('INSERT INTO categories(name,active) VALUES(?,1)').bind(name).run();
      await addLog(env, user.id, 'ADD_CATEGORY', `${name} kategorisi eklendi.`);
      return json({ id: Number(result.meta.last_row_id), name, active: 1, product_count: 0 }, 201);
    } catch {
      return json({ message: 'Bu kategori zaten var.' }, 409);
    }
  }

  const categoryMatch = url.pathname.match(/^\/api\/categories\/(\d+)$/);
  if (request.method === 'PUT' && categoryMatch) {
    if (!hasRole(user, ['admin'])) return forbidden();
    const body = await readBody(request);
    const name = cleanText(body.name, 60);
    const active = body.active === false || body.active === 0 ? 0 : 1;
    if (name.length < 2) return json({ message: 'Kategori adı en az 2 karakter olmalıdır.' }, 400);
    const result = await env.DB.prepare('UPDATE categories SET name=?,active=? WHERE id=?')
      .bind(name, active, Number(categoryMatch[1])).run();
    if (!result.meta.changes) return json({ message: 'Kategori bulunamadı.' }, 404);
    await addLog(env, user.id, 'UPDATE_CATEGORY', `${name} kategorisi güncellendi.`);
    return json({ id: Number(categoryMatch[1]), name, active });
  }

  if (request.method === 'DELETE' && categoryMatch) {
    if (!hasRole(user, ['admin'])) return forbidden();
    const id = Number(categoryMatch[1]);
    const used = await env.DB.prepare('SELECT COUNT(*) count FROM products WHERE category_id=? AND active=1').bind(id).first();
    if (Number(used.count)) return json({ message: 'İçinde aktif ürün bulunan kategori arşivlenemez.' }, 409);
    const result = await env.DB.prepare('UPDATE categories SET active=0 WHERE id=?').bind(id).run();
    if (!result.meta.changes) return json({ message: 'Kategori bulunamadı.' }, 404);
    await addLog(env, user.id, 'ARCHIVE_CATEGORY', `#${id} kategorisi arşivlendi.`);
    return new Response(null, { status: 204 });
  }

  if (request.method === 'POST' && url.pathname === '/api/uploads/product-image') {
    if (!hasRole(user, ['admin'])) return forbidden();
    if (!env.FILES) return json({ message: 'Dosya depolama hizmeti henüz bağlı değil.' }, 503);
    const contentType = cleanText(request.headers.get('content-type'), 80).toLowerCase();
    const allowed = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };
    const bytes = await request.arrayBuffer();
    const size = bytes.byteLength;
    if (!allowed[contentType] || size < 1 || size > 5 * 1024 * 1024) {
      return json({ message: 'JPG, PNG, WEBP veya GIF biçiminde en fazla 5 MB dosya yükleyebilirsin.' }, 400);
    }
    const originalName = cleanText(decodeURIComponent(request.headers.get('x-file-name') || 'urun-gorseli'), 150);
    const key = `product-images/${crypto.randomUUID()}.${allowed[contentType]}`;
    await env.FILES.put(key, bytes, {
      httpMetadata: { contentType },
      customMetadata: { owner: String(user.id), originalName }
    });
    await env.DB.prepare('INSERT INTO files(object_key,owner_user_id,original_name,content_type,size) VALUES(?,?,?,?,?)')
      .bind(key, user.id, originalName, contentType, size).run();
    await addLog(env, user.id, 'UPLOAD_IMAGE', `${originalName} görseli yüklendi.`);
    return json({ url: `/uploads/${key}` }, 201);
  }

  if (request.method === 'GET' && url.pathname === '/api/products') {
    const { page, limit, offset } = getPagination(url, 10, 100);
    const q = cleanText(url.searchParams.get('q'), 100);
    const status = url.searchParams.get('status') || 'active';
    const activeClause = status === 'all' && hasRole(user, ['admin']) ? '1=1' : 'p.active=1';
    const elastic = await elasticProductIds(env, q, page, limit);
    if (elastic) {
      if (!elastic.ids.length) return json(paged([], elastic.total, page, limit, { searchEngine: 'elasticsearch' }));
      const placeholders = elastic.ids.map(() => '?').join(',');
      const rows = await env.DB.prepare(`SELECT p.id,p.name,p.price,p.stock,p.category_id,p.image_url,p.active,p.updated_at,
        COALESCE(c.name,'Kategorisiz') category FROM products p LEFT JOIN categories c ON c.id=p.category_id
        WHERE p.id IN (${placeholders}) AND ${activeClause}`).bind(...elastic.ids).all();
      return json(paged(rows.results, elastic.total, page, limit, { searchEngine: 'elasticsearch' }));
    }
    const searchClause = q ? ' AND (p.name LIKE ? OR c.name LIKE ?)' : '';
    const bindings = q ? [`%${q}%`, `%${q}%`] : [];
    const count = await env.DB.prepare(`SELECT COUNT(*) count FROM products p LEFT JOIN categories c ON c.id=p.category_id
      WHERE ${activeClause}${searchClause}`).bind(...bindings).first();
    const rows = await env.DB.prepare(`SELECT p.id,p.name,p.price,p.stock,p.category_id,p.image_url,p.active,p.updated_at,
      COALESCE(c.name,'Kategorisiz') category FROM products p LEFT JOIN categories c ON c.id=p.category_id
      WHERE ${activeClause}${searchClause} ORDER BY p.id DESC LIMIT ? OFFSET ?`)
      .bind(...bindings, limit, offset).all();
    return json(paged(rows.results, count.count, page, limit, { searchEngine: 'database' }));
  }

  if (request.method === 'POST' && url.pathname === '/api/products') {
    if (!hasRole(user, ['admin'])) return forbidden();
    const productInput = await validateProductInput(env, await readBody(request));
    const result = await env.DB.prepare(`INSERT INTO products(name,price,stock,category_id,image_url,active,updated_at)
      VALUES(?,?,?,?,?,?,CURRENT_TIMESTAMP)`)
      .bind(productInput.name, productInput.price, productInput.stock, productInput.categoryId, productInput.imageUrl || null, productInput.active).run();
    const product = await fetchProduct(env, result.meta.last_row_id);
    await addLog(env, user.id, 'ADD_PRODUCT', `${productInput.name} ürünü eklendi.`);
    await syncElasticProduct(env, product);
    return json(product, 201);
  }

  const productMatch = url.pathname.match(/^\/api\/products\/(\d+)$/);
  if (request.method === 'PUT' && productMatch) {
    if (!hasRole(user, ['admin'])) return forbidden();
    const id = Number(productMatch[1]);
    const old = await fetchProduct(env, id);
    if (!old) return json({ message: 'Ürün bulunamadı.' }, 404);
    const input = await validateProductInput(env, await readBody(request));
    await env.DB.prepare(`UPDATE products SET name=?,price=?,stock=?,category_id=?,image_url=?,active=?,
      updated_at=CURRENT_TIMESTAMP WHERE id=?`)
      .bind(input.name, input.price, input.stock, input.categoryId, input.imageUrl || null, input.active, id).run();
    if (Number(old.stock) !== input.stock) {
      await env.DB.prepare(`INSERT INTO stock_movements(product_id,user_id,quantity_change,reason)
        VALUES(?,?,?,'Ürün düzenleme')`).bind(id, user.id, input.stock - Number(old.stock)).run();
    }
    const product = await fetchProduct(env, id);
    await addLog(env, user.id, 'UPDATE_PRODUCT', `${input.name} ürünü güncellendi.`);
    await syncElasticProduct(env, product);
    return json(product);
  }

  if (request.method === 'DELETE' && productMatch) {
    if (!hasRole(user, ['admin'])) return forbidden();
    const id = Number(productMatch[1]);
    const result = await env.DB.prepare('UPDATE products SET active=0,updated_at=CURRENT_TIMESTAMP WHERE id=? AND active=1').bind(id).run();
    if (!result.meta.changes) return json({ message: 'Ürün bulunamadı.' }, 404);
    await addLog(env, user.id, 'ARCHIVE_PRODUCT', `#${id} ürünü arşivlendi.`);
    await deleteElasticProduct(env, id);
    return new Response(null, { status: 204 });
  }

  if (request.method === 'GET' && url.pathname === '/api/orders') {
    const { page, limit, offset } = getPagination(url, 10, 100);
    const status = cleanText(url.searchParams.get('status'), 30);
    const q = cleanText(url.searchParams.get('q'), 80);
    const where = [];
    const bindings = [];
    if (status) { where.push('o.status=?'); bindings.push(status); }
    if (q) { where.push("(o.customer_name LIKE ? OR CAST(o.id AS TEXT) LIKE ?)"); bindings.push(`%${q}%`, `%${q}%`); }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const count = await env.DB.prepare(`SELECT COUNT(*) count FROM orders o ${whereSql}`).bind(...bindings).first();
    const rows = await env.DB.prepare(`SELECT o.id,COALESCE(NULLIF(o.customer_name,''),u.username) username,
      o.total,o.status,o.created_at,o.updated_at,
      GROUP_CONCAT(p.name || ' x' || oi.quantity, ', ') products FROM orders o
      LEFT JOIN users u ON u.id=o.user_id LEFT JOIN order_items oi ON oi.order_id=o.id
      LEFT JOIN products p ON p.id=oi.product_id ${whereSql}
      GROUP BY o.id,o.customer_name,u.username,o.total,o.status,o.created_at,o.updated_at
      ORDER BY o.id DESC LIMIT ? OFFSET ?`).bind(...bindings, limit, offset).all();
    return json(paged(rows.results, count.count, page, limit, { statuses: ORDER_STATUSES }));
  }

  if (request.method === 'POST' && url.pathname === '/api/orders') {
    const body = await readBody(request);
    const customerName = cleanText(body.customerName, 80) || user.username;
    const requestedDate = cleanText(body.orderDate, 10);
    let createdAt = new Date().toISOString();
    if (requestedDate) {
      const timestamp = Date.parse(`${requestedDate}T12:00:00.000Z`);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(requestedDate) || Number.isNaN(timestamp)) {
        return json({ message: 'Sipariş tarihi geçersiz.' }, 400);
      }
      if (requestedDate > new Date().toISOString().slice(0, 10)) {
        return json({ message: 'Sipariş tarihi gelecekte olamaz.' }, 400);
      }
      createdAt = `${requestedDate}T12:00:00.000Z`;
    }
    const rawItems = Array.isArray(body.items) ? body.items : [{ productId: body.productId, quantity: body.quantity }];
    const combined = new Map();
    for (const item of rawItems.slice(0, 25)) {
      const productId = Number(item.productId);
      const quantity = Number(item.quantity);
      if (!Number.isInteger(productId) || productId < 1 || !Number.isInteger(quantity) || quantity < 1) {
        return json({ message: 'Sipariş ürünleri geçersiz.' }, 400);
      }
      combined.set(productId, (combined.get(productId) || 0) + quantity);
    }
    if (!combined.size) return json({ message: 'Siparişe en az bir ürün eklemelisin.' }, 400);
    const items = [];
    for (const [productId, quantity] of combined) {
      const product = await env.DB.prepare('SELECT id,name,price,stock FROM products WHERE id=? AND active=1')
        .bind(productId).first();
      if (!product || Number(product.stock) < quantity) {
        return json({ message: `${product?.name || 'Seçilen ürün'} için yeterli stok yok.` }, 409);
      }
      items.push({ ...product, quantity });
    }
    const orderId = Date.now();
    const total = items.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);
    const reason = `Sipariş #${orderId}`;
    const statements = [
      env.DB.prepare(`INSERT INTO orders(id,user_id,customer_name,total,status,created_at,updated_at)
        VALUES(?,?,?,?,'Oluşturuldu',?,?)`).bind(orderId, user.id, customerName, total, createdAt, createdAt)
    ];
    for (const item of items) {
      statements.push(
        env.DB.prepare('INSERT INTO order_items(order_id,product_id,quantity,unit_price) VALUES(?,?,?,?)')
          .bind(orderId, item.id, item.quantity, item.price),
        env.DB.prepare('UPDATE products SET stock=stock-?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND stock>=?')
          .bind(item.quantity, item.id, item.quantity),
        env.DB.prepare('INSERT INTO stock_movements(product_id,user_id,quantity_change,reason) VALUES(?,?,?,?)')
          .bind(item.id, user.id, -item.quantity, reason)
      );
    }
    const results = await env.DB.batch(statements);
    const failed = items.some((item, index) => Number(results[2 + index * 3]?.meta?.changes || 0) !== 1);
    if (failed) {
      const rollback = [
        env.DB.prepare('DELETE FROM stock_movements WHERE reason=?').bind(reason),
        ...items.map((item, index) => Number(results[2 + index * 3]?.meta?.changes || 0) === 1
          ? env.DB.prepare('UPDATE products SET stock=stock+? WHERE id=?').bind(item.quantity, item.id)
          : env.DB.prepare('SELECT 1')),
        env.DB.prepare('DELETE FROM order_items WHERE order_id=?').bind(orderId),
        env.DB.prepare('DELETE FROM orders WHERE id=?').bind(orderId)
      ];
      await env.DB.batch(rollback);
      return json({ message: 'Stok aynı anda değişti. Siparişi tekrar dene.' }, 409);
    }
    await addLog(env, user.id, 'CREATE_ORDER', `#${orderId} siparişi ${items.length} ürün çeşidiyle oluşturuldu.`);
    return json({ id: orderId, total, status: 'Oluşturuldu' }, 201);
  }

  const orderMatch = url.pathname.match(/^\/api\/orders\/(\d+)$/);
  if (request.method === 'GET' && orderMatch) {
    const id = Number(orderMatch[1]);
    const order = await env.DB.prepare(`SELECT o.*,COALESCE(NULLIF(o.customer_name,''),u.username) username
      FROM orders o LEFT JOIN users u ON u.id=o.user_id WHERE o.id=?`).bind(id).first();
    if (!order) return json({ message: 'Sipariş bulunamadı.' }, 404);
    const items = await env.DB.prepare(`SELECT oi.product_id,p.name,oi.quantity,oi.unit_price
      FROM order_items oi LEFT JOIN products p ON p.id=oi.product_id WHERE oi.order_id=?`).bind(id).all();
    return json({ ...order, items: items.results });
  }

  if (request.method === 'PATCH' && orderMatch) {
    const id = Number(orderMatch[1]);
    const status = cleanText((await readBody(request)).status, 30);
    if (!ORDER_STATUSES.includes(status)) return json({ message: 'Geçersiz sipariş durumu.' }, 400);
    const order = await env.DB.prepare('SELECT id,status FROM orders WHERE id=?').bind(id).first();
    if (!order) return json({ message: 'Sipariş bulunamadı.' }, 404);
    if (order.status === 'İptal Edildi' && status !== order.status) {
      return json({ message: 'İptal edilen sipariş yeniden açılamaz.' }, 409);
    }
    if (status === 'İptal Edildi' && order.status !== status) {
      const items = await env.DB.prepare('SELECT product_id,quantity FROM order_items WHERE order_id=?').bind(id).all();
      const reason = `Sipariş iptali #${id}`;
      await env.DB.batch(items.results.flatMap(item => [
        env.DB.prepare('UPDATE products SET stock=stock+?,updated_at=CURRENT_TIMESTAMP WHERE id=?')
          .bind(item.quantity, item.product_id),
        env.DB.prepare('INSERT INTO stock_movements(product_id,user_id,quantity_change,reason) VALUES(?,?,?,?)')
          .bind(item.product_id, user.id, item.quantity, reason)
      ]));
    }
    await env.DB.prepare('UPDATE orders SET status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(status, id).run();
    await addLog(env, user.id, 'UPDATE_ORDER', `#${id} sipariş durumu "${status}" yapıldı.`);
    return json({ id, status });
  }

  if (request.method === 'GET' && url.pathname === '/api/stock-movements') {
    const { page, limit, offset } = getPagination(url, 15, 100);
    const count = await env.DB.prepare('SELECT COUNT(*) count FROM stock_movements').first();
    const rows = await env.DB.prepare(`SELECT sm.id,p.name product,sm.quantity_change,sm.reason,u.username,sm.created_at
      FROM stock_movements sm JOIN products p ON p.id=sm.product_id LEFT JOIN users u ON u.id=sm.user_id
      ORDER BY sm.id DESC LIMIT ? OFFSET ?`).bind(limit, offset).all();
    return json(paged(rows.results, count.count, page, limit));
  }

  if (request.method === 'POST' && url.pathname === '/api/stock-movements') {
    if (!hasRole(user, ['admin'])) return forbidden();
    const body = await readBody(request);
    const productId = Number(body.productId);
    const change = Number(body.change);
    const reason = cleanText(body.reason, 50) || 'Manuel';
    if (!Number.isInteger(productId) || productId < 1 || !Number.isInteger(change) || change === 0) {
      return json({ message: 'Stok değişikliği geçersiz.' }, 400);
    }
    const product = await env.DB.prepare('SELECT name,stock FROM products WHERE id=?').bind(productId).first();
    if (!product) return json({ message: 'Ürün bulunamadı.' }, 404);
    if (Number(product.stock) + change < 0) return json({ message: 'Stok sıfırın altına düşemez.' }, 409);
    await env.DB.batch([
      env.DB.prepare('UPDATE products SET stock=stock+?,updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(change, productId),
      env.DB.prepare('INSERT INTO stock_movements(product_id,user_id,quantity_change,reason) VALUES(?,?,?,?)')
        .bind(productId, user.id, change, reason)
    ]);
    await addLog(env, user.id, 'STOCK_CHANGE', `${product.name} stoku ${change > 0 ? '+' : ''}${change} değiştirildi.`);
    return json({ productId, change }, 201);
  }

  if (request.method === 'GET' && url.pathname === '/api/logs') {
    if (!hasRole(user, ['admin'])) return forbidden();
    const { page, limit, offset } = getPagination(url, 20, 100);
    const count = await env.DB.prepare('SELECT COUNT(*) count FROM logs').first();
    const rows = await env.DB.prepare(`SELECT l.id,l.action,l.description,u.username,l.created_at FROM logs l
      LEFT JOIN users u ON u.id=l.user_id ORDER BY l.id DESC LIMIT ? OFFSET ?`).bind(limit, offset).all();
    return json(paged(rows.results, count.count, page, limit));
  }

  if (request.method === 'GET' && url.pathname === '/api/dashboard') {
    const days = [7, 30, 90].includes(Number(url.searchParams.get('days'))) ? Number(url.searchParams.get('days')) : 7;
    const start = new Date(Date.now() - (days - 1) * 86400000).toISOString().slice(0, 10);
    const [summary, low, sales, statuses, categories] = await env.DB.batch([
      env.DB.prepare(`SELECT (SELECT COUNT(*) FROM products WHERE active=1) product_count,
        (SELECT COALESCE(SUM(stock),0) FROM products WHERE active=1) stock_count,
        (SELECT COUNT(*) FROM orders) order_count,
        (SELECT COALESCE(SUM(total),0) FROM orders WHERE status<>'İptal Edildi') total_sales`),
      env.DB.prepare('SELECT id,name,stock FROM products WHERE active=1 ORDER BY stock ASC LIMIT 5'),
      env.DB.prepare(`SELECT substr(created_at,1,10) day,COALESCE(SUM(total),0) total
        FROM orders WHERE status<>'İptal Edildi' AND substr(created_at,1,10)>=?
        GROUP BY substr(created_at,1,10) ORDER BY day`).bind(start),
      env.DB.prepare('SELECT status,COUNT(*) count FROM orders GROUP BY status ORDER BY count DESC'),
      env.DB.prepare(`SELECT COALESCE(c.name,'Kategorisiz') category,COUNT(p.id) count
        FROM products p LEFT JOIN categories c ON c.id=p.category_id WHERE p.active=1
        GROUP BY c.name ORDER BY count DESC`)
    ]);
    return json({
      ...summary.results[0],
      lowStock: low.results,
      salesSeries: sales.results,
      orderStatuses: statuses.results,
      categoryTotals: categories.results,
      days
    });
  }

  return json({ message: 'Adres bulunamadı.' }, 404);
}

async function serveUpload(request, env, url) {
  if (!env.FILES) return json({ message: 'Dosya bulunamadı.' }, 404);
  const key = decodeURIComponent(url.pathname.replace(/^\/uploads\//, ''));
  if (!key.startsWith('product-images/') || key.includes('..')) return json({ message: 'Dosya bulunamadı.' }, 404);
  const object = await env.FILES.get(key);
  if (!object) return json({ message: 'Dosya bulunamadı.' }, 404);
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);
  headers.set('cache-control', 'public, max-age=31536000, immutable');
  headers.set('x-content-type-options', 'nosniff');
  if (request.headers.get('if-none-match') === object.httpEtag) return new Response(null, { status: 304, headers });
  return new Response(object.body, { headers });
}

export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);
      if (request.method === 'GET' && url.pathname.startsWith('/uploads/')) return serveUpload(request, env, url);
      await ensureSchema(env);
      if (url.pathname.startsWith('/api/')) return handleApi(request, env, url);
      if (request.method !== 'GET') return json({ message: 'Yöntem desteklenmiyor.' }, 405);
      if (url.pathname === '/') return asset(INDEX_HTML.replaceAll('__SITE_ORIGIN__', url.origin), 'text/html');
      if (url.pathname === '/css/style.css') return asset(STYLE_CSS, 'text/css');
      if (url.pathname === '/js/storage.js') return asset(STORAGE_JS, 'application/javascript');
      if (url.pathname === '/js/app.js') return asset(APP_JS, 'application/javascript');
      if (url.pathname === '/og.png' && OG_BASE64) {
        const binary = atob(OG_BASE64);
        return new Response(Uint8Array.from(binary, char => char.charCodeAt(0)), {
          headers: { 'content-type': 'image/png', 'cache-control': 'public, max-age=86400' }
        });
      }
      if (url.pathname === '/favicon.ico') return new Response(null, { status: 204 });
      return json({ message: 'Adres bulunamadı.' }, 404);
    } catch (error) {
      const message = error?.status ? error.message : 'Sunucu hatası oluştu.';
      return json({ message }, error?.status || 500);
    }
  }
};
