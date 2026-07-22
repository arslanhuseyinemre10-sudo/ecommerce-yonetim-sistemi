const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');
const { hashPassword, verifyPassword } = require('./src/password');
const elastic = require('./src/elastic');

const root = __dirname;

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

function base64url(value) {
  return Buffer.from(value).toString('base64url');
}

function createToken(user) {
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = base64url(JSON.stringify({
    id: user.id,
    username: user.username,
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

function sendJson(res, status, body) {
  const data = Buffer.from(JSON.stringify(body));
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': data.length,
    'cache-control': 'no-store'
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
      if (data.length > 100000) reject(Object.assign(new Error('İstek çok büyük.'), { status: 413 }));
    });
    req.on('end', () => {
      try { resolve(data ? JSON.parse(data) : {}); }
      catch { reject(Object.assign(new Error('Geçersiz JSON.'), { status: 400 })); }
    });
    req.on('error', reject);
  });
}

function cleanText(value, max) {
  return String(value || '').trim().slice(0, max);
}

async function addLog(userId, action, description) {
  const id = Number(userId) || 'NULL';
  await mysql(`INSERT INTO logs(user_id, action, description) VALUES (${id}, ${sqlText(action)}, ${sqlText(description)})`);
}

async function serveFile(res, relative, type) {
  const filePath = path.join(root, relative);
  const data = await fs.promises.readFile(filePath);
  res.writeHead(200, { 'content-type': `${type}; charset=utf-8`, 'content-length': data.length });
  res.end(data);
}

async function handleApi(req, res, url) {
  if (req.method === 'GET' && url.pathname === '/api/health') {
    await mysql('SELECT 1');
    return sendJson(res, 200, {
      ok: true,
      mysql: true,
      elasticsearch: await elastic.health(),
      elasticsearch_enabled: elastic.enabled(),
      mode: 'portable'
    });
  }

  if (req.method === 'POST' && url.pathname === '/api/auth/register') {
    const body = await readBody(req);
    const username = cleanText(body.username, 50);
    const email = cleanText(body.email, 100).toLowerCase();
    const password = String(body.password || '');
    if (username.length < 3 || !email.includes('@') || password.length < 8) {
      return sendJson(res, 400, { message: 'Kullanıcı adı en az 3, parola en az 8 karakter olmalıdır.' });
    }
    const existing = await mysqlJson(`SELECT JSON_OBJECT('count', COUNT(*)) FROM users WHERE username=${sqlText(username)} OR email=${sqlText(email)}`);
    if (Number(existing.count)) return sendJson(res, 409, { message: 'Kullanıcı adı veya e-posta kullanılıyor.' });
    const passwordHash = await hashPassword(password);
    const created = await mysqlJson(`
      INSERT INTO users(username, password, password_hash, email) VALUES (${sqlText(username)}, '', ${sqlText(passwordHash)}, ${sqlText(email)});
      SELECT JSON_OBJECT('id', LAST_INSERT_ID(), 'username', ${sqlText(username)});
    `);
    await addLog(created.id, 'REGISTER', `${username} hesabı oluşturuldu.`);
    return sendJson(res, 201, { token: createToken(created), user: created });
  }

  if (req.method === 'POST' && url.pathname === '/api/auth/login') {
    const body = await readBody(req);
    const username = cleanText(body.username, 50);
    const password = String(body.password || '');
    const user = await mysqlJson(`
      SELECT JSON_OBJECT('id', id, 'username', username, 'password_hash', password_hash)
      FROM users WHERE username=${sqlText(username)} LIMIT 1
    `);
    if (!user || !(await verifyPassword(password, user.password_hash))) {
      return sendJson(res, 401, { message: 'Kullanıcı adı veya parola yanlış.' });
    }
    await addLog(user.id, 'LOGIN', `${user.username} giriş yaptı.`);
    const publicUser = { id: user.id, username: user.username };
    return sendJson(res, 200, { token: createToken(publicUser), user: publicUser });
  }

  const user = readToken(req);
  if (!user) return sendJson(res, 401, { message: 'Oturum geçersiz veya süresi dolmuş.' });

  if (req.method === 'GET' && url.pathname === '/api/categories') {
    const rows = await mysqlJson(`
      SELECT COALESCE(JSON_ARRAYAGG(JSON_OBJECT('id', id, 'name', name, 'product_count', product_count)), JSON_ARRAY())
      FROM (SELECT c.id, c.name, COUNT(p.id) product_count FROM categories c
      LEFT JOIN products p ON p.category_id=c.id GROUP BY c.id, c.name ORDER BY c.name) x
    `);
    return sendJson(res, 200, rows || []);
  }

  if (req.method === 'GET' && url.pathname === '/api/products') {
    const q = cleanText(url.searchParams.get('q'), 100);
    const elasticRows = await elastic.searchProducts(q);
    if (elasticRows) return sendJson(res, 200, elasticRows);
    const where = q ? `WHERE p.name LIKE ${sqlText(`%${q}%`)}` : '';
    const rows = await mysqlJson(`
      SELECT COALESCE(JSON_ARRAYAGG(JSON_OBJECT('id', id, 'name', name, 'price', price, 'stock', stock,
        'category_id', category_id, 'category', category)), JSON_ARRAY())
      FROM (SELECT p.id, p.name, p.price, p.stock, p.category_id, COALESCE(c.name, 'Kategorisiz') category
      FROM products p LEFT JOIN categories c ON c.id=p.category_id ${where} ORDER BY p.id DESC) x
    `);
    return sendJson(res, 200, rows || []);
  }

  if (req.method === 'POST' && url.pathname === '/api/products') {
    const body = await readBody(req);
    const name = cleanText(body.name, 100);
    const price = Number(body.price);
    const stock = Number(body.stock);
    const categoryId = Number(body.categoryId);
    if (!name || !Number.isFinite(price) || price < 0 || !Number.isInteger(stock) || stock < 0 || !Number.isInteger(categoryId) || categoryId < 1) {
      return sendJson(res, 400, { message: 'Ürün bilgileri geçersiz.' });
    }
    const product = await mysqlJson(`
      INSERT INTO products(name, price, stock, category_id) VALUES (${sqlText(name)}, ${price}, ${stock}, ${categoryId});
      SELECT JSON_OBJECT('id', LAST_INSERT_ID(), 'name', ${sqlText(name)}, 'price', ${price}, 'stock', ${stock},
        'category_id', ${categoryId}, 'category', (SELECT COALESCE(name, 'Kategorisiz') FROM categories WHERE id=${categoryId}));
    `);
    await addLog(user.id, 'ADD_PRODUCT', `${name} ürünü eklendi.`);
    await elastic.indexProduct(product).catch(error => console.warn(error.message));
    return sendJson(res, 201, product);
  }

  const productDelete = url.pathname.match(/^\/api\/products\/(\d+)$/);
  if (req.method === 'DELETE' && productDelete) {
    const id = Number(productDelete[1]);
    const result = await mysqlJson(`DELETE FROM products WHERE id=${id}; SELECT JSON_OBJECT('affected', ROW_COUNT());`);
    if (!Number(result.affected)) return sendJson(res, 404, { message: 'Ürün bulunamadı.' });
    await addLog(user.id, 'DELETE_PRODUCT', `#${id} ürünü silindi.`);
    await elastic.deleteProduct(id).catch(error => console.warn(error.message));
    return sendEmpty(res);
  }

  if (req.method === 'GET' && url.pathname === '/api/orders') {
    const rows = await mysqlJson(`
      SELECT COALESCE(JSON_ARRAYAGG(JSON_OBJECT('id', id, 'username', username, 'total', total,
        'status', status, 'created_at', created_at, 'products', products)), JSON_ARRAY())
      FROM (SELECT o.id, u.username, o.total, o.status, DATE_FORMAT(o.created_at, '%Y-%m-%dT%H:%i:%s') created_at,
        GROUP_CONCAT(CONCAT(p.name, ' x', oi.quantity) SEPARATOR ', ') products
      FROM orders o LEFT JOIN users u ON u.id=o.user_id LEFT JOIN order_items oi ON oi.order_id=o.id
      LEFT JOIN products p ON p.id=oi.product_id GROUP BY o.id, u.username, o.total, o.status, o.created_at ORDER BY o.id DESC) x
    `);
    return sendJson(res, 200, rows || []);
  }

  if (req.method === 'POST' && url.pathname === '/api/orders') {
    const body = await readBody(req);
    const productId = Number(body.productId);
    const quantity = Number(body.quantity);
    if (!Number.isInteger(productId) || productId < 1 || !Number.isInteger(quantity) || quantity < 1) {
      return sendJson(res, 400, { message: 'Sipariş bilgileri geçersiz.' });
    }
    const product = await mysqlJson(`SELECT JSON_OBJECT('id', id, 'name', name, 'price', price, 'stock', stock) FROM products WHERE id=${productId}`);
    if (!product || Number(product.stock) < quantity) return sendJson(res, 409, { message: 'Yetersiz stok.' });
    const total = Number(product.price) * quantity;
    const order = await mysqlJson(`
      START TRANSACTION;
      INSERT INTO orders(user_id, total, status) VALUES (${Number(user.id)}, ${total}, 'Oluşturuldu');
      SET @order_id=LAST_INSERT_ID();
      INSERT INTO order_items(order_id, product_id, quantity, unit_price) VALUES (@order_id, ${productId}, ${quantity}, ${Number(product.price)});
      UPDATE products SET stock=stock-${quantity} WHERE id=${productId} AND stock>=${quantity};
      INSERT INTO stock_movements(product_id, user_id, quantity_change, reason) VALUES (${productId}, ${Number(user.id)}, ${-quantity}, 'Sipariş');
      INSERT INTO logs(user_id, action, description) VALUES (${Number(user.id)}, 'CREATE_ORDER', ${sqlText(`${product.name} x${quantity} sipariş edildi.`)});
      COMMIT;
      SELECT JSON_OBJECT('id', @order_id, 'total', ${total});
    `);
    return sendJson(res, 201, order);
  }

  if (req.method === 'GET' && url.pathname === '/api/stock-movements') {
    const rows = await mysqlJson(`
      SELECT COALESCE(JSON_ARRAYAGG(JSON_OBJECT('id', id, 'product', product, 'quantity_change', quantity_change,
        'reason', reason, 'username', username, 'created_at', created_at)), JSON_ARRAY())
      FROM (SELECT sm.id, p.name product, sm.quantity_change, sm.reason, u.username,
        DATE_FORMAT(sm.created_at, '%Y-%m-%dT%H:%i:%s') created_at
      FROM stock_movements sm JOIN products p ON p.id=sm.product_id LEFT JOIN users u ON u.id=sm.user_id
      ORDER BY sm.id DESC LIMIT 100) x
    `);
    return sendJson(res, 200, rows || []);
  }

  if (req.method === 'POST' && url.pathname === '/api/stock-movements') {
    const body = await readBody(req);
    const productId = Number(body.productId);
    const change = Number(body.change);
    const reason = cleanText(body.reason, 50) || 'Manuel';
    if (!Number.isInteger(productId) || productId < 1 || !Number.isInteger(change) || change === 0) {
      return sendJson(res, 400, { message: 'Stok değişikliği geçersiz.' });
    }
    const product = await mysqlJson(`SELECT JSON_OBJECT('name', name, 'stock', stock) FROM products WHERE id=${productId}`);
    if (!product) return sendJson(res, 404, { message: 'Ürün bulunamadı.' });
    if (Number(product.stock) + change < 0) return sendJson(res, 409, { message: 'Stok sıfırın altına düşemez.' });
    await mysql(`
      START TRANSACTION;
      UPDATE products SET stock=stock+${change} WHERE id=${productId};
      INSERT INTO stock_movements(product_id, user_id, quantity_change, reason) VALUES (${productId}, ${Number(user.id)}, ${change}, ${sqlText(reason)});
      INSERT INTO logs(user_id, action, description) VALUES (${Number(user.id)}, 'STOCK_CHANGE', ${sqlText(`${product.name} stoku ${change > 0 ? '+' : ''}${change} değiştirildi.`)});
      COMMIT;
    `);
    return sendJson(res, 201, { productId, change });
  }

  if (req.method === 'GET' && url.pathname === '/api/logs') {
    const rows = await mysqlJson(`
      SELECT COALESCE(JSON_ARRAYAGG(JSON_OBJECT('id', id, 'action', action, 'description', description,
        'username', username, 'created_at', created_at)), JSON_ARRAY())
      FROM (SELECT l.id, l.action, l.description, u.username, DATE_FORMAT(l.created_at, '%Y-%m-%dT%H:%i:%s') created_at
      FROM logs l LEFT JOIN users u ON u.id=l.user_id ORDER BY l.id DESC LIMIT 100) x
    `);
    return sendJson(res, 200, rows || []);
  }

  if (req.method === 'GET' && url.pathname === '/api/dashboard') {
    const data = await mysqlJson(`
      SELECT JSON_OBJECT(
        'product_count', (SELECT COUNT(*) FROM products),
        'stock_count', (SELECT COALESCE(SUM(stock),0) FROM products),
        'order_count', (SELECT COUNT(*) FROM orders),
        'total_sales', (SELECT COALESCE(SUM(total),0) FROM orders),
        'lowStock', (SELECT COALESCE(JSON_ARRAYAGG(JSON_OBJECT('id', id, 'name', name, 'stock', stock)), JSON_ARRAY())
          FROM (SELECT id, name, stock FROM products ORDER BY stock ASC LIMIT 4) low_rows)
      )
    `);
    return sendJson(res, 200, data);
  }

  return sendJson(res, 404, { message: 'Adres bulunamadı.' });
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    if (url.pathname.startsWith('/api/')) return await handleApi(req, res, url);
    if (req.method !== 'GET') return sendJson(res, 405, { message: 'Yöntem desteklenmiyor.' });
    if (url.pathname === '/') return await serveFile(res, 'index.html', 'text/html');
    if (/^\/css\/[a-zA-Z0-9._-]+\.css$/.test(url.pathname)) return await serveFile(res, url.pathname.slice(1), 'text/css');
    if (/^\/js\/[a-zA-Z0-9._-]+\.js$/.test(url.pathname)) return await serveFile(res, url.pathname.slice(1), 'application/javascript');
    return sendJson(res, 404, { message: 'Adres bulunamadı.' });
  } catch (error) {
    console.error(error);
    const duplicate = /Duplicate entry/i.test(error.message);
    sendJson(res, error.status || (duplicate ? 409 : 500), {
      message: duplicate ? 'Bu kayıt zaten mevcut.' : (error.status ? error.message : 'Sunucu hatası oluştu.')
    });
  }
});

let elasticRetryTimer = null;

async function syncElasticsearch() {
  if (!elastic.enabled()) return;
  const products = await mysqlJson(`
    SELECT COALESCE(JSON_ARRAYAGG(JSON_OBJECT('id', id, 'name', name, 'price', price, 'stock', stock,
      'category_id', category_id, 'category', category)), JSON_ARRAY())
    FROM (SELECT p.id, p.name, p.price, p.stock, p.category_id, COALESCE(c.name, 'Kategorisiz') category
      FROM products p LEFT JOIN categories c ON c.id=p.category_id ORDER BY p.id) x
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

server.listen(port, '127.0.0.1', async () => {
  try {
    await mysql('SELECT 1');
    console.log(`Emre Commerce: http://localhost:${port}`);
    console.log('MySQL bağlantısı başarılı. Taşınabilir mod çalışıyor.');
    await connectElasticsearch();
  } catch (error) {
    console.error('MySQL bağlantısı başarısız:', error.message);
  }
});
