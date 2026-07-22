require('dotenv').config();

const path = require('path');
const express = require('express');
const pool = require('./src/db');
const { createToken, requireAuth } = require('./src/auth');
const elastic = require('./src/elastic');
const { hashPassword, verifyPassword } = require('./src/password');

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 24) {
  throw new Error('JWT_SECRET en az 24 karakter olmalıdır. .env dosyasını kontrol edin.');
}

const app = express();
const root = __dirname;

app.use(express.json({ limit: '100kb' }));
app.use('/css', express.static(path.join(root, 'css')));
app.use('/js', express.static(path.join(root, 'js')));
app.get('/', (_req, res) => res.sendFile(path.join(root, 'index.html')));

const asyncRoute = handler => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
const cleanText = (value, max) => String(value || '').trim().slice(0, max);

async function addLog(connection, userId, action, description) {
  await connection.execute(
    'INSERT INTO logs(user_id, action, description) VALUES (?, ?, ?)',
    [userId || null, action, description]
  );
}

app.get('/api/health', asyncRoute(async (_req, res) => {
  await pool.query('SELECT 1');
  res.json({
    ok: true,
    mysql: true,
    elasticsearch: await elastic.health(),
    elasticsearch_enabled: elastic.enabled()
  });
}));

app.post('/api/auth/register', asyncRoute(async (req, res) => {
  const username = cleanText(req.body.username, 50);
  const email = cleanText(req.body.email, 100).toLowerCase();
  const password = String(req.body.password || '');

  if (username.length < 3 || !email.includes('@') || password.length < 8) {
    return res.status(400).json({ message: 'Kullanıcı adı en az 3, parola en az 8 karakter olmalıdır.' });
  }

  const [existing] = await pool.execute(
    'SELECT id FROM users WHERE username = ? OR email = ? LIMIT 1',
    [username, email]
  );
  if (existing.length) return res.status(409).json({ message: 'Kullanıcı adı veya e-posta kullanılıyor.' });

  const passwordHash = await hashPassword(password);
  const [result] = await pool.execute(
    "INSERT INTO users(username, password, password_hash, email) VALUES (?, '', ?, ?)",
    [username, passwordHash, email]
  );
  const user = { id: result.insertId, username };
  await addLog(pool, user.id, 'REGISTER', `${username} hesabı oluşturuldu.`);
  res.status(201).json({ token: createToken(user), user });
}));

app.post('/api/auth/login', asyncRoute(async (req, res) => {
  const username = cleanText(req.body.username, 50);
  const password = String(req.body.password || '');
  const [rows] = await pool.execute(
    'SELECT id, username, password_hash FROM users WHERE username = ? LIMIT 1',
    [username]
  );
  const user = rows[0];
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return res.status(401).json({ message: 'Kullanıcı adı veya parola yanlış.' });
  }
  await addLog(pool, user.id, 'LOGIN', `${user.username} giriş yaptı.`);
  res.json({ token: createToken(user), user: { id: user.id, username: user.username } });
}));

app.get('/api/categories', requireAuth, asyncRoute(async (_req, res) => {
  const [rows] = await pool.query(`
    SELECT c.id, c.name, COUNT(p.id) AS product_count
    FROM categories c LEFT JOIN products p ON p.category_id = c.id
    GROUP BY c.id, c.name ORDER BY c.name
  `);
  res.json(rows);
}));

app.get('/api/products', requireAuth, asyncRoute(async (req, res) => {
  const q = cleanText(req.query.q, 100);
  const elasticRows = await elastic.searchProducts(q);
  if (elasticRows) return res.json(elasticRows);

  const sql = `SELECT p.id, p.name, p.price, p.stock, p.category_id,
    COALESCE(c.name, 'Kategorisiz') category
    FROM products p LEFT JOIN categories c ON c.id = p.category_id
    ${q ? 'WHERE p.name LIKE ?' : ''} ORDER BY p.id DESC`;
  const [rows] = await pool.execute(sql, q ? [`%${q}%`] : []);
  res.json(rows);
}));

app.post('/api/products', requireAuth, asyncRoute(async (req, res) => {
  const name = cleanText(req.body.name, 100);
  const price = Number(req.body.price);
  const stock = Number(req.body.stock);
  const categoryId = Number(req.body.categoryId);
  if (!name || price < 0 || !Number.isInteger(stock) || stock < 0 || !categoryId) {
    return res.status(400).json({ message: 'Ürün bilgileri geçersiz.' });
  }
  const [result] = await pool.execute(
    'INSERT INTO products(name, price, stock, category_id) VALUES (?, ?, ?, ?)',
    [name, price, stock, categoryId]
  );
  const [[product]] = await pool.execute(`
    SELECT p.id, p.name, p.price, p.stock, p.category_id,
      COALESCE(c.name, 'Kategorisiz') category
    FROM products p LEFT JOIN categories c ON c.id = p.category_id
    WHERE p.id = ?
  `, [result.insertId]);
  await addLog(pool, req.user.id, 'ADD_PRODUCT', `${name} ürünü eklendi.`);
  await elastic.indexProduct(product).catch(error => console.warn(error.message));
  res.status(201).json(product);
}));

app.delete('/api/products/:id', requireAuth, asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  const [result] = await pool.execute('DELETE FROM products WHERE id = ?', [id]);
  if (!result.affectedRows) return res.status(404).json({ message: 'Ürün bulunamadı.' });
  await addLog(pool, req.user.id, 'DELETE_PRODUCT', `#${id} ürünü silindi.`);
  await elastic.deleteProduct(id).catch(error => console.warn(error.message));
  res.status(204).end();
}));

app.get('/api/orders', requireAuth, asyncRoute(async (_req, res) => {
  const [rows] = await pool.query(`
    SELECT o.id, u.username, o.total, o.status, o.created_at,
      GROUP_CONCAT(CONCAT(p.name, ' x', oi.quantity) SEPARATOR ', ') products
    FROM orders o LEFT JOIN users u ON u.id = o.user_id
    LEFT JOIN order_items oi ON oi.order_id = o.id
    LEFT JOIN products p ON p.id = oi.product_id
    GROUP BY o.id, u.username, o.total, o.status, o.created_at
    ORDER BY o.id DESC
  `);
  res.json(rows);
}));

app.post('/api/orders', requireAuth, asyncRoute(async (req, res) => {
  const productId = Number(req.body.productId);
  const quantity = Number(req.body.quantity);
  if (!productId || !Number.isInteger(quantity) || quantity < 1) {
    return res.status(400).json({ message: 'Sipariş bilgileri geçersiz.' });
  }
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [products] = await connection.execute(
      'SELECT id, name, price, stock FROM products WHERE id = ? FOR UPDATE', [productId]
    );
    const product = products[0];
    if (!product || product.stock < quantity) throw Object.assign(new Error('Yetersiz stok.'), { status: 409 });
    const total = product.price * quantity;
    const [order] = await connection.execute(
      "INSERT INTO orders(user_id, total, status) VALUES (?, ?, 'Oluşturuldu')", [req.user.id, total]
    );
    await connection.execute(
      'INSERT INTO order_items(order_id, product_id, quantity, unit_price) VALUES (?, ?, ?, ?)',
      [order.insertId, productId, quantity, product.price]
    );
    await connection.execute('UPDATE products SET stock = stock - ? WHERE id = ?', [quantity, productId]);
    await connection.execute(
      "INSERT INTO stock_movements(product_id, user_id, quantity_change, reason) VALUES (?, ?, ?, 'Sipariş')",
      [productId, req.user.id, -quantity]
    );
    await addLog(connection, req.user.id, 'CREATE_ORDER', `${product.name} x${quantity} sipariş edildi.`);
    await connection.commit();
    res.status(201).json({ id: order.insertId, total });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}));

app.get('/api/stock-movements', requireAuth, asyncRoute(async (_req, res) => {
  const [rows] = await pool.query(`
    SELECT sm.id, p.name product, sm.quantity_change, sm.reason,
      u.username, sm.created_at
    FROM stock_movements sm JOIN products p ON p.id = sm.product_id
    LEFT JOIN users u ON u.id = sm.user_id ORDER BY sm.id DESC LIMIT 100
  `);
  res.json(rows);
}));

app.post('/api/stock-movements', requireAuth, asyncRoute(async (req, res) => {
  const productId = Number(req.body.productId);
  const change = Number(req.body.change);
  const reason = cleanText(req.body.reason, 50) || 'Manuel';
  if (!productId || !Number.isInteger(change) || change === 0) {
    return res.status(400).json({ message: 'Stok değişikliği geçersiz.' });
  }
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.execute('SELECT name, stock FROM products WHERE id = ? FOR UPDATE', [productId]);
    const product = rows[0];
    if (!product) throw Object.assign(new Error('Ürün bulunamadı.'), { status: 404 });
    if (product.stock + change < 0) throw Object.assign(new Error('Stok sıfırın altına düşemez.'), { status: 409 });
    await connection.execute('UPDATE products SET stock = stock + ? WHERE id = ?', [change, productId]);
    await connection.execute(
      'INSERT INTO stock_movements(product_id, user_id, quantity_change, reason) VALUES (?, ?, ?, ?)',
      [productId, req.user.id, change, reason]
    );
    await addLog(connection, req.user.id, 'STOCK_CHANGE', `${product.name} stoku ${change > 0 ? '+' : ''}${change} değiştirildi.`);
    await connection.commit();
    res.status(201).json({ productId, change });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}));

app.get('/api/logs', requireAuth, asyncRoute(async (_req, res) => {
  const [rows] = await pool.query(`
    SELECT l.id, l.action, l.description, u.username, l.created_at
    FROM logs l LEFT JOIN users u ON u.id = l.user_id
    ORDER BY l.id DESC LIMIT 100
  `);
  res.json(rows);
}));

app.get('/api/dashboard', requireAuth, asyncRoute(async (_req, res) => {
  const [[summary]] = await pool.query(`
    SELECT (SELECT COUNT(*) FROM products) product_count,
      (SELECT COALESCE(SUM(stock),0) FROM products) stock_count,
      (SELECT COUNT(*) FROM orders) order_count,
      (SELECT COALESCE(SUM(total),0) FROM orders) total_sales
  `);
  const [lowStock] = await pool.query(
    'SELECT id, name, stock FROM products ORDER BY stock ASC LIMIT 4'
  );
  res.json({ ...summary, lowStock });
}));

app.use((error, _req, res, _next) => {
  console.error(error);
  const duplicate = error.code === 'ER_DUP_ENTRY';
  res.status(error.status || (duplicate ? 409 : 500)).json({
    message: duplicate ? 'Bu kayıt zaten mevcut.' : (error.status ? error.message : 'Sunucu hatası oluştu.')
  });
});

const port = Number(process.env.PORT || 3000);
app.listen(port, async () => {
  try {
    await pool.query('SELECT 1');
    console.log(`Emre Commerce: http://localhost:${port}`);
    console.log('MySQL bağlantısı başarılı.');
    if (elastic.enabled()) {
      const [products] = await pool.query(`
        SELECT p.id, p.name, p.price, p.stock, p.category_id,
          COALESCE(c.name, 'Kategorisiz') category
        FROM products p LEFT JOIN categories c ON c.id = p.category_id
        ORDER BY p.id
      `);
      await elastic.replaceProducts(products);
      console.log(`Elasticsearch bağlantısı başarılı. ${products.length} ürün aktarıldı.`);
    }
  } catch (error) {
    console.error('Başlangıç bağlantı hatası:', error.message);
  }
});
