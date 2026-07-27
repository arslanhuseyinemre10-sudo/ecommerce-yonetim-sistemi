import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import worker from '../dist/server/index.js';

const workerSource = await readFile(new URL('../dist/server/index.js', import.meta.url), 'utf8');
const pbkdf2Iterations = Number(workerSource.match(/PBKDF2_ITERATIONS\s*=\s*(\d+)/)?.[1]);
assert.ok(pbkdf2Iterations > 0 && pbkdf2Iterations <= 100000);

class Statement {
  constructor(database, sql, values = []) {
    this.database = database;
    this.sql = sql;
    this.values = values;
  }

  bind(...values) {
    return new Statement(this.database, this.sql, values);
  }

  async run() {
    const result = this.database.prepare(this.sql).run(...this.values);
    return { results: [], meta: { changes: Number(result.changes), last_row_id: Number(result.lastInsertRowid) } };
  }

  async all() {
    return { results: this.database.prepare(this.sql).all(...this.values) };
  }

  async first() {
    return this.database.prepare(this.sql).get(...this.values) || null;
  }
}

class D1Mock {
  constructor() {
    this.database = new DatabaseSync(':memory:');
    this.database.exec('PRAGMA foreign_keys = ON');
  }

  prepare(sql) {
    return new Statement(this.database, sql);
  }

  async batch(statements) {
    this.database.exec('BEGIN');
    try {
      const output = [];
      for (const statement of statements) {
        if (/^\s*(SELECT|WITH|PRAGMA)/i.test(statement.sql)) output.push(await statement.all());
        else output.push(await statement.run());
      }
      this.database.exec('COMMIT');
      return output;
    } catch (error) {
      this.database.exec('ROLLBACK');
      throw error;
    }
  }
}

class R2Mock {
  objects = new Map();

  async put(key, value, options = {}) {
    this.objects.set(key, { bytes: new Uint8Array(value), options });
  }

  async get(key) {
    const object = this.objects.get(key);
    if (!object) return null;
    return {
      body: object.bytes,
      httpEtag: `"${object.bytes.byteLength}"`,
      writeHttpMetadata(headers) {
        headers.set('content-type', object.options.httpMetadata?.contentType || 'application/octet-stream');
      }
    };
  }
}

const env = { DB: new D1Mock(), FILES: new R2Mock() };
const call = (path, options) => worker.fetch(new Request(`https://example.test${path}`, options), env);

const page = await call('/');
assert.equal(page.status, 200);
assert.match(await page.text(), /E-Ticaret Yönetim Sistemi/);

const healthResponse = await call('/api/health');
assert.equal(healthResponse.status, 200);
assert.deepEqual(await healthResponse.json(), {
  ok: true,
  database: true,
  storage: true,
  search: 'database-fallback',
  mode: 'online',
  release: 'management-suite',
  productCount: 6,
  productImageCount: 6
});

const adminRegistration = await call('/api/auth/register', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ username: 'adminuser', email: 'admin@example.com', password: 'Test12345!' })
});
assert.equal(adminRegistration.status, 201);
const adminSession = await adminRegistration.json();
assert.equal(adminSession.user.role, 'admin');
const adminHeaders = { authorization: `Bearer ${adminSession.token}`, 'content-type': 'application/json' };

const staffRegistration = await call('/api/auth/register', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ username: 'staffuser', email: 'staff@example.com', password: 'Test12345!' })
});
assert.equal(staffRegistration.status, 201);
const staffSession = await staffRegistration.json();
assert.equal(staffSession.user.role, 'staff');
const staffHeaders = { authorization: `Bearer ${staffSession.token}`, 'content-type': 'application/json' };

const forbiddenProduct = await call('/api/products', {
  method: 'POST',
  headers: staffHeaders,
  body: JSON.stringify({ name: 'Yetkisiz ürün', price: 1, stock: 1, categoryId: 1 })
});
assert.equal(forbiddenProduct.status, 403);

const categoryResponse = await call('/api/categories', {
  method: 'POST',
  headers: adminHeaders,
  body: JSON.stringify({ name: 'Tablet' })
});
assert.equal(categoryResponse.status, 201);
const category = await categoryResponse.json();

const uploadResponse = await call('/api/uploads/product-image', {
  method: 'POST',
  headers: {
    authorization: `Bearer ${adminSession.token}`,
    'content-type': 'image/png',
    'x-file-name': 'tablet.png'
  },
  body: new Uint8Array([137, 80, 78, 71])
});
assert.equal(uploadResponse.status, 201);
const uploadedImage = await uploadResponse.json();
assert.match(uploadedImage.url, /^\/uploads\/product-images\//);
assert.equal((await call(uploadedImage.url)).status, 200);

const productResponse = await call('/api/products', {
  method: 'POST',
  headers: adminHeaders,
  body: JSON.stringify({
    name: 'Test Tablet',
    price: 10000,
    stock: 8,
    categoryId: category.id,
    imageUrl: uploadedImage.url
  })
});
assert.equal(productResponse.status, 201);
const product = await productResponse.json();
assert.equal(product.category, 'Tablet');

const updateProductResponse = await call(`/api/products/${product.id}`, {
  method: 'PUT',
  headers: adminHeaders,
  body: JSON.stringify({
    name: 'Test Tablet Pro',
    price: 12000,
    stock: 10,
    categoryId: category.id,
    imageUrl: uploadedImage.url,
    active: true
  })
});
assert.equal(updateProductResponse.status, 200);
assert.equal((await updateProductResponse.json()).name, 'Test Tablet Pro');

const productsResponse = await call('/api/products?q=Tablet&limit=5', { headers: staffHeaders });
assert.equal(productsResponse.status, 200);
const productPage = await productsResponse.json();
assert.equal(productPage.total, 1);
assert.equal(productPage.items[0].name, 'Test Tablet Pro');

const orderResponse = await call('/api/orders', {
  method: 'POST',
  headers: staffHeaders,
  body: JSON.stringify({
    customerName: 'Ayşe Yılmaz',
    orderDate: new Date().toISOString().slice(0, 10),
    items: [
      { productId: 4, quantity: 1 },
      { productId: 7, quantity: 1 }
    ]
  })
});
assert.equal(orderResponse.status, 201);
const order = await orderResponse.json();
assert.equal(order.total, 111000);

const orderDetailResponse = await call(`/api/orders/${order.id}`, { headers: staffHeaders });
assert.equal(orderDetailResponse.status, 200);
assert.equal((await orderDetailResponse.json()).items.length, 2);

const statusResponse = await call(`/api/orders/${order.id}`, {
  method: 'PATCH',
  headers: staffHeaders,
  body: JSON.stringify({ status: 'Hazırlanıyor' })
});
assert.equal(statusResponse.status, 200);

const cancelResponse = await call(`/api/orders/${order.id}`, {
  method: 'PATCH',
  headers: staffHeaders,
  body: JSON.stringify({ status: 'İptal Edildi' })
});
assert.equal(cancelResponse.status, 200);

const ordersResponse = await call('/api/orders?status=İptal%20Edildi', { headers: staffHeaders });
assert.equal(ordersResponse.status, 200);
assert.equal((await ordersResponse.json()).total, 1);

const dashboardResponse = await call('/api/dashboard?days=30', { headers: staffHeaders });
assert.equal(dashboardResponse.status, 200);
const dashboard = await dashboardResponse.json();
assert.equal(dashboard.order_count, 1);
assert.equal(dashboard.total_sales, 0);
assert.ok(Array.isArray(dashboard.salesSeries));

const usersResponse = await call('/api/users', { headers: adminHeaders });
assert.equal(usersResponse.status, 200);
assert.equal((await usersResponse.json()).length, 2);
assert.equal((await call('/api/logs', { headers: staffHeaders })).status, 403);
const productExport = await call('/api/export/products', { headers: adminHeaders });
assert.equal(productExport.status, 200);
assert.match(productExport.headers.get('content-type'), /text\/csv/);
assert.match(await productExport.text(), /Test Tablet Pro/);
const backupExport = await call('/api/export/backup', { headers: adminHeaders });
assert.equal(backupExport.status, 200);
assert.ok(Array.isArray((await backupExport.json()).products));

const logoutResponse = await call('/api/auth/logout', { method: 'POST', headers: staffHeaders });
assert.equal(logoutResponse.status, 204);
assert.equal((await call('/api/auth/me', { headers: staffHeaders })).status, 401);

const configuredImages = [...workerSource.matchAll(/name:\s*'[^']+',\s*url:\s*'https:\/\/[^']+'/g)];
assert.equal(configuredImages.length, 27);

console.log('Yetki, ürün, kategori, fotoğraf, çoklu sipariş, rapor ve oturum testleri başarılı.');
