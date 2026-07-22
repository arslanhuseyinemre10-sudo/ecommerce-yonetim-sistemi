const { getToken, getUser, setSession, clearSession } = window.AppStorage;

let authMode = 'login';
let products = [];
let categories = [];

const byId = id => document.getElementById(id);
const money = value => new Intl.NumberFormat('tr-TR', {
  style: 'currency', currency: 'TRY'
}).format(Number(value || 0));
const dateText = value => value ? new Date(value).toLocaleString('tr-TR') : '-';
const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
})[char]);

async function api(path, options = {}) {
  const headers = { 'content-type': 'application/json', ...(options.headers || {}) };
  const token = getToken();
  if (token) headers.authorization = `Bearer ${token}`;
  const response = await fetch(`/api${path}`, { ...options, headers });
  if (response.status === 204) return null;
  const body = await response.json().catch(() => ({}));
  if (response.status === 401) {
    clearSession();
    showAuth();
  }
  if (!response.ok) throw new Error(body.message || 'İşlem başarısız.');
  return body;
}

function showMessage(message) {
  byId('statusMessage').textContent = message;
  byId('statusMessage').classList.add('show');
  setTimeout(() => byId('statusMessage').classList.remove('show'), 3000);
}

function showApp(user) {
  byId('authScreen').classList.add('hidden');
  byId('appRoot').classList.remove('hidden');
  byId('profileName').textContent = user.username;
  byId('profileLetter').textContent = user.username.charAt(0).toLocaleUpperCase('tr');
  loadAll();
}

function showAuth() {
  byId('appRoot').classList.add('hidden');
  byId('authScreen').classList.remove('hidden');
  byId('authForm').reset();
  byId('authError').style.display = 'none';
}

async function loadAll() {
  try {
    await Promise.all([loadCategories(), loadProducts(), loadDashboard(), loadOrders(), loadStock(), loadLogs()]);
  } catch (error) {
    showMessage(error.message);
  }
}

async function loadCategories() {
  categories = await api('/categories');
  byId('pCategory').innerHTML = categories.map(category =>
    `<option value="${category.id}">${escapeHtml(category.name)}</option>`
  ).join('');
  byId('categoryCards').innerHTML = categories.map(category =>
    `<div class="card"><h2>${escapeHtml(category.name)}</h2><strong>${category.product_count} ürün</strong></div>`
  ).join('') || '<div class="empty">Kategori bulunamadı.</div>';
}

async function loadProducts(query = '') {
  products = await api(`/products${query ? `?q=${encodeURIComponent(query)}` : ''}`);
  byId('productRows').innerHTML = products.map(product => `
    <tr>
      <td>#${product.id}</td><td><b>${escapeHtml(product.name)}</b></td>
      <td>${escapeHtml(product.category)}</td><td>${money(product.price)}</td><td>${product.stock}</td>
      <td><span class="pill ${product.stock < 5 ? 'low' : ''}">${product.stock < 5 ? 'Stok az' : 'Aktif'}</span></td>
      <td><button class="link" data-delete-product="${product.id}">Sil</button></td>
    </tr>`).join('') || '<tr><td colspan="7" class="empty">Ürün bulunamadı.</td></tr>';
  if (!query) {
    const options = products.map(product =>
      `<option value="${product.id}">${escapeHtml(product.name)} (${product.stock} stok)</option>`
    ).join('');
    byId('orderProduct').innerHTML = options;
    byId('stockProduct').innerHTML = options;
  }
}

async function loadDashboard() {
  const data = await api('/dashboard');
  byId('productCount').textContent = data.product_count;
  byId('stockCount').textContent = data.stock_count;
  byId('orderCount').textContent = data.order_count;
  byId('salesTotal').textContent = money(data.total_sales);
  byId('lowStock').innerHTML = data.lowStock.map(product => `
    <div class="stock-row"><span>${escapeHtml(product.name)}<small> · ${product.stock} adet</small></span>
    <b>${product.stock}</b><div class="progress"><i style="width:${Math.min(100, product.stock * 8)}%"></i></div></div>
  `).join('') || '<div class="empty">Ürün bulunamadı.</div>';
}

async function loadOrders() {
  const orders = await api('/orders');
  byId('orderRows').innerHTML = orders.map(order => `
    <tr><td>#${order.id}</td><td>${escapeHtml(order.username || '-')}</td>
    <td>${escapeHtml(order.products || '-')}</td><td>${money(order.total)}</td>
    <td><span class="pill">${escapeHtml(order.status)}</span></td><td>${dateText(order.created_at)}</td></tr>
  `).join('') || '<tr><td colspan="6" class="empty">Sipariş bulunamadı.</td></tr>';
}

async function loadStock() {
  const rows = await api('/stock-movements');
  byId('stockRows').innerHTML = rows.map(row => `
    <tr><td>${escapeHtml(row.product)}</td><td class="${row.quantity_change < 0 ? 'negative' : 'positive'}">
    ${row.quantity_change > 0 ? '+' : ''}${row.quantity_change}</td><td>${escapeHtml(row.reason)}</td>
    <td>${escapeHtml(row.username || '-')}</td><td>${dateText(row.created_at)}</td></tr>
  `).join('') || '<tr><td colspan="5" class="empty">Stok hareketi bulunamadı.</td></tr>';
}

async function loadLogs() {
  const rows = await api('/logs');
  byId('logRows').innerHTML = rows.map(row => `
    <tr><td><b>${escapeHtml(row.action)}</b></td><td>${escapeHtml(row.description)}</td>
    <td>${escapeHtml(row.username || '-')}</td><td>${dateText(row.created_at)}</td></tr>
  `).join('') || '<tr><td colspan="4" class="empty">Log bulunamadı.</td></tr>';
}

byId('authSwitch').addEventListener('click', () => {
  authMode = authMode === 'login' ? 'register' : 'login';
  const register = authMode === 'register';
  byId('authTitle').textContent = register ? 'Yeni hesap oluştur' : 'Tekrar hoş geldin';
  byId('authDesc').textContent = register ? 'Bilgilerini girerek sisteme katıl.' : 'Devam etmek için hesabına giriş yap.';
  byId('emailField').classList.toggle('hidden', !register);
  byId('authEmail').required = register;
  byId('authPassword').minLength = register ? 8 : 1;
  byId('authSubmit').textContent = register ? 'Kayıt ol' : 'Giriş yap';
  byId('switchText').textContent = register ? 'Zaten hesabın var mı?' : 'Hesabın yok mu?';
  byId('authSwitch').textContent = register ? 'Giriş yap' : 'Kayıt ol';
  byId('authError').style.display = 'none';
});

byId('authForm').addEventListener('submit', async event => {
  event.preventDefault();
  try {
    const payload = {
      username: byId('authUsername').value.trim(),
      password: byId('authPassword').value,
      email: byId('authEmail').value.trim()
    };
    const result = await api(`/auth/${authMode}`, { method: 'POST', body: JSON.stringify(payload) });
    setSession(result.token, result.user);
    showApp(result.user);
  } catch (error) {
    byId('authError').textContent = error.message;
    byId('authError').style.display = 'block';
  }
});

byId('logout').addEventListener('click', () => { clearSession(); showAuth(); });
byId('refreshButton').addEventListener('click', loadAll);
byId('menuBtn').addEventListener('click', () => byId('side').classList.toggle('open'));
byId('productSearch').addEventListener('input', event => loadProducts(event.target.value).catch(error => showMessage(error.message)));
byId('addProduct').addEventListener('click', () => byId('productDialog').showModal());
byId('addProductTop').addEventListener('click', () => byId('productDialog').showModal());
byId('cancel').addEventListener('click', () => byId('productDialog').close());
byId('addOrder').addEventListener('click', () => byId('orderDialog').showModal());
byId('cancelOrder').addEventListener('click', () => byId('orderDialog').close());
byId('changeStock').addEventListener('click', () => byId('stockDialog').showModal());
byId('cancelStock').addEventListener('click', () => byId('stockDialog').close());

byId('productRows').addEventListener('click', async event => {
  const button = event.target.closest('[data-delete-product]');
  if (!button || !confirm('Bu ürün silinsin mi?')) return;
  try {
    await api(`/products/${button.dataset.deleteProduct}`, { method: 'DELETE' });
    await loadAll();
    showMessage('Ürün silindi.');
  } catch (error) { showMessage(error.message); }
});

byId('productForm').addEventListener('submit', async event => {
  event.preventDefault();
  try {
    await api('/products', {
      method: 'POST',
      body: JSON.stringify({
        name: byId('pName').value,
        price: Number(byId('pPrice').value),
        stock: Number(byId('pStock').value),
        categoryId: Number(byId('pCategory').value)
      })
    });
    event.target.reset();
    byId('productDialog').close();
    await loadAll();
    showMessage('Ürün eklendi.');
  } catch (error) { showMessage(error.message); }
});

byId('orderForm').addEventListener('submit', async event => {
  event.preventDefault();
  try {
    await api('/orders', { method: 'POST', body: JSON.stringify({
      productId: Number(byId('orderProduct').value), quantity: Number(byId('orderQuantity').value)
    }) });
    byId('orderDialog').close();
    event.target.reset();
    await loadAll();
    showMessage('Sipariş oluşturuldu.');
  } catch (error) { showMessage(error.message); }
});

byId('stockForm').addEventListener('submit', async event => {
  event.preventDefault();
  try {
    await api('/stock-movements', { method: 'POST', body: JSON.stringify({
      productId: Number(byId('stockProduct').value),
      change: Number(byId('stockChange').value), reason: byId('stockReason').value
    }) });
    byId('stockDialog').close();
    event.target.reset();
    await loadAll();
    showMessage('Stok güncellendi.');
  } catch (error) { showMessage(error.message); }
});

const titles = {
  dashboard: ['Dashboard', 'E-ticaret sisteminin genel durumu'],
  products: ['Ürünler', 'Ürün kataloğunu ve stokları yönet'],
  categories: ['Kategoriler', 'Ürün gruplarını görüntüle'],
  orders: ['Siparişler', 'Müşteri siparişlerini takip et'],
  stock: ['Stok Hareketleri', 'Tüm stok değişikliklerini incele'],
  logs: ['Sistem Logları', 'Kullanıcı işlemlerini denetle']
};

byId('nav').addEventListener('click', event => {
  const button = event.target.closest('button[data-page]');
  if (!button) return;
  document.querySelectorAll('.nav button').forEach(item => item.classList.remove('active'));
  document.querySelectorAll('.page').forEach(item => item.classList.remove('active'));
  button.classList.add('active');
  byId(button.dataset.page).classList.add('active');
  byId('title').textContent = titles[button.dataset.page][0];
  byId('subtitle').textContent = titles[button.dataset.page][1];
  byId('side').classList.remove('open');
});

const activeUser = getUser();
if (getToken() && activeUser) showApp(activeUser); else showAuth();
