const { getToken, getUser, setSession, clearSession } = window.AppStorage;

let authMode = 'login';
let currentUser = null;
let products = [];
let productCatalog = [];
let categories = [];
const pageState = { products: 1, orders: 1, stock: 1, logs: 1 };

const byId = id => document.getElementById(id);
const money = value => new Intl.NumberFormat('tr-TR', {
  style: 'currency', currency: 'TRY'
}).format(Number(value || 0));
const dateText = value => value ? new Date(value).toLocaleString('tr-TR') : '-';
const shortDate = value => new Date(`${value}T12:00:00`).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' });
const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
})[char]);
const isAdmin = () => currentUser?.role === 'admin';

function debounce(callback, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => callback(...args), delay);
  };
}

async function api(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (options.body && typeof options.body === 'string') headers['content-type'] = 'application/json';
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
  const box = byId('statusMessage');
  box.textContent = message;
  box.classList.add('show');
  clearTimeout(showMessage.timer);
  showMessage.timer = setTimeout(() => box.classList.remove('show'), 3500);
}

function applyRole() {
  document.querySelectorAll('.admin-only').forEach(element => {
    element.classList.toggle('role-hidden', !isAdmin());
  });
  byId('profileRole').textContent = isAdmin() ? 'Yönetici' : 'Personel';
  byId('accountRole').textContent = isAdmin() ? 'Yönetici' : 'Personel';
}

function showApp(user) {
  currentUser = user;
  byId('authScreen').classList.add('hidden');
  byId('appRoot').classList.remove('hidden');
  byId('profileName').textContent = user.username;
  byId('profileLetter').textContent = user.username.charAt(0).toLocaleUpperCase('tr');
  byId('accountUsername').textContent = user.username;
  byId('accountEmail').textContent = user.email || '-';
  applyRole();
  loadAll();
}

function showAuth() {
  currentUser = null;
  byId('appRoot').classList.add('hidden');
  byId('authScreen').classList.remove('hidden');
  byId('authForm').reset();
  byId('authError').style.display = 'none';
}

async function loadAll() {
  try {
    const tasks = [
      loadCategories(),
      loadProductCatalog(),
      loadProducts(),
      loadDashboard(),
      loadOrders(),
      loadStock()
    ];
    if (isAdmin()) tasks.push(loadUsers(), loadLogs());
    await Promise.all(tasks);
  } catch (error) {
    showMessage(error.message);
  }
}

function renderPager(id, data, handler) {
  const container = byId(id);
  if (!data || data.pages <= 1) {
    container.innerHTML = data ? `<span>${data.total} kayıt</span>` : '';
    return;
  }
  container.innerHTML = `
    <button class="btn" data-page="${data.page - 1}" ${data.page <= 1 ? 'disabled' : ''}>← Önceki</button>
    <span>${data.page} / ${data.pages} · ${data.total} kayıt</span>
    <button class="btn" data-page="${data.page + 1}" ${data.page >= data.pages ? 'disabled' : ''}>Sonraki →</button>`;
  container.onclick = event => {
    const button = event.target.closest('[data-page]');
    if (button && !button.disabled) handler(Number(button.dataset.page));
  };
}

async function loadCategories() {
  categories = await api(`/categories${isAdmin() ? '?all=1' : ''}`);
  const activeCategories = categories.filter(category => Number(category.active) === 1);
  byId('pCategory').innerHTML = activeCategories.map(category =>
    `<option value="${category.id}">${escapeHtml(category.name)}</option>`
  ).join('');
  byId('categoryCards').innerHTML = categories.map(category => `
    <div class="card category-card ${Number(category.active) ? '' : 'inactive'}">
      <div><h2>${escapeHtml(category.name)}</h2><strong>${category.product_count} ürün</strong>
      <small>${Number(category.active) ? 'Aktif' : 'Arşivlenmiş'}</small></div>
      ${isAdmin() ? `<div class="row-actions">
        <button class="link" data-edit-category="${category.id}">Düzenle</button>
        ${Number(category.active) ? `<button class="link danger" data-delete-category="${category.id}">Arşivle</button>` : ''}
      </div>` : ''}
    </div>`).join('') || '<div class="empty">Kategori bulunamadı.</div>';
}

async function loadProductCatalog() {
  const data = await api('/products?limit=100&status=active');
  productCatalog = data.items;
  const options = productCatalog.map(product =>
    `<option value="${product.id}">${escapeHtml(product.name)} (${product.stock} stok)</option>`
  ).join('');
  byId('stockProduct').innerHTML = options;
}

async function loadProducts(page = pageState.products) {
  pageState.products = page;
  const query = byId('productSearch').value.trim();
  const status = isAdmin() ? byId('productStatus').value : 'active';
  const data = await api(`/products?page=${page}&limit=10&status=${encodeURIComponent(status)}&q=${encodeURIComponent(query)}`);
  products = data.items;
  byId('searchSource').textContent = query
    ? `Arama motoru: ${data.searchEngine === 'elasticsearch' ? 'Elasticsearch' : 'veritabanı yedeği'}`
    : '';
  byId('productRows').innerHTML = products.map(product => `
    <tr class="${Number(product.active) ? '' : 'inactive-row'}">
      <td>#${product.id}</td>
      <td><div class="product-cell">
        ${product.image_url
          ? `<img class="product-thumb" src="${escapeHtml(product.image_url)}" alt="${escapeHtml(product.name)}" loading="lazy">`
          : `<span class="product-placeholder" aria-hidden="true">${escapeHtml(product.name).charAt(0)}</span>`}
        <b>${escapeHtml(product.name)}</b>
      </div></td>
      <td>${escapeHtml(product.category)}</td><td>${money(product.price)}</td><td>${product.stock}</td>
      <td><span class="pill ${!Number(product.active) ? 'red' : product.stock < 5 ? 'low' : ''}">
        ${!Number(product.active) ? 'Arşiv' : product.stock < 5 ? 'Stok az' : 'Aktif'}</span></td>
      <td>${isAdmin() ? `<div class="row-actions"><button class="link" data-edit-product="${product.id}">Düzenle</button>
        ${Number(product.active) ? `<button class="link danger" data-delete-product="${product.id}">Arşivle</button>` : ''}</div>` : '-'}</td>
    </tr>`).join('') || '<tr><td colspan="7" class="empty">Ürün bulunamadı.</td></tr>';
  renderPager('productPager', data, next => loadProducts(next).catch(error => showMessage(error.message)));
}

async function loadDashboard() {
  const days = Number(byId('reportDays').value);
  const data = await api(`/dashboard?days=${days}`);
  byId('productCount').textContent = data.product_count;
  byId('stockCount').textContent = data.stock_count;
  byId('orderCount').textContent = data.order_count;
  byId('salesTotal').textContent = money(data.total_sales);
  byId('lowStock').innerHTML = data.lowStock.map(product => `
    <div class="stock-row"><span>${escapeHtml(product.name)}<small> · ${product.stock} adet</small></span>
    <b>${product.stock}</b><div class="progress"><i style="width:${Math.min(100, product.stock * 8)}%"></i></div></div>
  `).join('') || '<div class="empty">Ürün bulunamadı.</div>';

  const totals = new Map(data.salesSeries.map(item => [item.day, Number(item.total)]));
  const series = [];
  for (let index = days - 1; index >= 0; index--) {
    const date = new Date(Date.now() - index * 86400000).toISOString().slice(0, 10);
    series.push({ day: date, total: totals.get(date) || 0 });
  }
  const max = Math.max(1, ...series.map(item => item.total));
  const labelEvery = days <= 7 ? 1 : days <= 30 ? 5 : 15;
  byId('salesChart').innerHTML = series.map((item, index) => `
    <div class="bar" style="height:${Math.max(4, item.total / max * 100)}%"
      data-day="${index % labelEvery === 0 || index === series.length - 1 ? shortDate(item.day) : ''}"
      title="${shortDate(item.day)}: ${money(item.total)}"></div>`).join('');
  const periodTotal = series.reduce((sum, item) => sum + item.total, 0);
  byId('chartSummary').textContent = `Son ${days} gün: ${money(periodTotal)}`;
  byId('statusSummary').innerHTML = data.orderStatuses.map(item =>
    `<div><span>${escapeHtml(item.status)}</span><b>${item.count}</b></div>`
  ).join('') || '<div class="empty">Sipariş yok.</div>';
  byId('categorySummary').innerHTML = data.categoryTotals.map(item =>
    `<div><span>${escapeHtml(item.category)}</span><b>${item.count}</b></div>`
  ).join('') || '<div class="empty">Kategori verisi yok.</div>';
}

async function loadOrders(page = pageState.orders) {
  pageState.orders = page;
  const q = byId('orderSearch').value.trim();
  const status = byId('orderStatus').value;
  const data = await api(`/orders?page=${page}&limit=10&q=${encodeURIComponent(q)}&status=${encodeURIComponent(status)}`);
  if (byId('orderStatus').options.length <= 1) {
    byId('orderStatus').innerHTML = '<option value="">Tüm durumlar</option>' + data.statuses.map(item =>
      `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`
    ).join('');
  }
  byId('orderRows').innerHTML = data.items.map(order => `
    <tr><td>#${order.id}</td><td>${escapeHtml(order.username || '-')}</td>
    <td>${escapeHtml(order.products || '-')}</td><td>${money(order.total)}</td>
    <td><select class="status-select" data-order-status="${order.id}" aria-label="Sipariş durumu">
      ${data.statuses.map(item => `<option ${item === order.status ? 'selected' : ''}>${escapeHtml(item)}</option>`).join('')}
    </select></td><td>${dateText(order.created_at)}</td>
    <td><button class="link" data-order-detail="${order.id}">Detay</button></td></tr>
  `).join('') || '<tr><td colspan="7" class="empty">Sipariş bulunamadı.</td></tr>';
  renderPager('orderPager', data, next => loadOrders(next).catch(error => showMessage(error.message)));
}

async function loadStock(page = pageState.stock) {
  pageState.stock = page;
  const data = await api(`/stock-movements?page=${page}&limit=15`);
  byId('stockRows').innerHTML = data.items.map(row => `
    <tr><td>${escapeHtml(row.product)}</td><td class="${row.quantity_change < 0 ? 'negative' : 'positive'}">
    ${row.quantity_change > 0 ? '+' : ''}${row.quantity_change}</td><td>${escapeHtml(row.reason)}</td>
    <td>${escapeHtml(row.username || '-')}</td><td>${dateText(row.created_at)}</td></tr>
  `).join('') || '<tr><td colspan="5" class="empty">Stok hareketi bulunamadı.</td></tr>';
  renderPager('stockPager', data, next => loadStock(next).catch(error => showMessage(error.message)));
}

async function loadLogs(page = pageState.logs) {
  if (!isAdmin()) return;
  pageState.logs = page;
  const data = await api(`/logs?page=${page}&limit=20`);
  byId('logRows').innerHTML = data.items.map(row => `
    <tr><td><b>${escapeHtml(row.action)}</b></td><td>${escapeHtml(row.description)}</td>
    <td>${escapeHtml(row.username || '-')}</td><td>${dateText(row.created_at)}</td></tr>
  `).join('') || '<tr><td colspan="4" class="empty">Log bulunamadı.</td></tr>';
  renderPager('logPager', data, next => loadLogs(next).catch(error => showMessage(error.message)));
}

async function loadUsers() {
  if (!isAdmin()) return;
  const rows = await api('/users');
  byId('userRows').innerHTML = rows.map(user => `
    <tr><td>#${user.id}</td><td><b>${escapeHtml(user.username)}</b></td><td>${escapeHtml(user.email)}</td>
    <td><select class="compact" data-user-role="${user.id}">
      <option value="staff" ${user.role === 'staff' ? 'selected' : ''}>Personel</option>
      <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Yönetici</option>
    </select></td><td>${dateText(user.created_at)}</td></tr>
  `).join('');
}

function openProduct(product = null) {
  byId('productForm').reset();
  byId('pId').value = product?.id || '';
  byId('productDialogTitle').textContent = product ? 'Ürünü düzenle' : 'Yeni ürün ekle';
  byId('pName').value = product?.name || '';
  byId('pPrice').value = product?.price ?? '';
  byId('pStock').value = product?.stock ?? '';
  byId('pCategory').value = product?.category_id || categories.find(item => Number(item.active))?.id || '';
  byId('pImage').value = product?.image_url?.startsWith('https://') ? product.image_url : '';
  byId('pActive').checked = product ? Boolean(Number(product.active)) : true;
  byId('productDialog').showModal();
}

function openCategory(category = null) {
  byId('categoryForm').reset();
  byId('cId').value = category?.id || '';
  byId('categoryDialogTitle').textContent = category ? 'Kategoriyi düzenle' : 'Yeni kategori';
  byId('cName').value = category?.name || '';
  byId('cActive').checked = category ? Boolean(Number(category.active)) : true;
  byId('categoryDialog').showModal();
}

function orderProductOptions() {
  return productCatalog.map(product =>
    `<option value="${product.id}">${escapeHtml(product.name)} · ${money(product.price)} · ${product.stock} stok</option>`
  ).join('');
}

function addOrderItemRow() {
  const row = document.createElement('div');
  row.className = 'order-item';
  row.innerHTML = `<select class="order-item-product" required>${orderProductOptions()}</select>
    <input class="order-item-quantity" required type="number" min="1" value="1" aria-label="Adet">
    <button type="button" class="link danger remove-order-item">Kaldır</button>`;
  byId('orderItems').append(row);
}

async function uploadImage(file) {
  const response = await fetch('/api/uploads/product-image', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${getToken()}`,
      'content-type': file.type,
      'x-file-name': encodeURIComponent(file.name)
    },
    body: file
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message || 'Fotoğraf yüklenemedi.');
  return body.url;
}

async function downloadExport(path, fallbackName) {
  const response = await fetch(`/api/export/${path}`, {
    headers: { authorization: `Bearer ${getToken()}` }
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message || 'Dosya indirilemedi.');
  }
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = (response.headers.get('content-disposition')?.match(/filename="([^"]+)"/)?.[1]) || fallbackName;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}

byId('authSwitch').addEventListener('click', () => {
  authMode = authMode === 'login' ? 'register' : 'login';
  const register = authMode === 'register';
  byId('authTitle').textContent = register ? 'Yeni hesap oluştur' : 'Tekrar hoş geldin';
  byId('authDesc').textContent = register ? 'Yeni hesaplar personel yetkisiyle açılır.' : 'Devam etmek için hesabına giriş yap.';
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

byId('logout').addEventListener('click', async () => {
  try { await api('/auth/logout', { method: 'POST' }); } catch {}
  clearSession();
  showAuth();
});

byId('refreshButton').addEventListener('click', loadAll);
byId('menuBtn').addEventListener('click', () => byId('side').classList.toggle('open'));
byId('reportDays').addEventListener('change', () => loadDashboard().catch(error => showMessage(error.message)));
byId('productSearch').addEventListener('input', debounce(() => loadProducts(1).catch(error => showMessage(error.message))));
byId('productStatus').addEventListener('change', () => loadProducts(1).catch(error => showMessage(error.message)));
byId('orderSearch').addEventListener('input', debounce(() => loadOrders(1).catch(error => showMessage(error.message))));
byId('orderStatus').addEventListener('change', () => loadOrders(1).catch(error => showMessage(error.message)));
byId('exportProducts').addEventListener('click', () => downloadExport('products', 'urunler.csv').catch(error => showMessage(error.message)));
byId('exportOrders').addEventListener('click', () => downloadExport('orders', 'siparisler.csv').catch(error => showMessage(error.message)));
byId('downloadBackup').addEventListener('click', () => downloadExport('backup', 'yedek.json').catch(error => showMessage(error.message)));

byId('addProduct').addEventListener('click', () => openProduct());
byId('addProductTop').addEventListener('click', () => openProduct());
byId('cancelProduct').addEventListener('click', () => byId('productDialog').close());
byId('addCategory').addEventListener('click', () => openCategory());
byId('cancelCategory').addEventListener('click', () => byId('categoryDialog').close());
byId('changeStock').addEventListener('click', () => byId('stockDialog').showModal());
byId('cancelStock').addEventListener('click', () => byId('stockDialog').close());
byId('changePassword').addEventListener('click', () => byId('passwordDialog').showModal());
byId('cancelPassword').addEventListener('click', () => byId('passwordDialog').close());

byId('addOrder').addEventListener('click', () => {
  byId('orderForm').reset();
  byId('orderDate').value = new Date().toISOString().slice(0, 10);
  byId('orderItems').innerHTML = '';
  addOrderItemRow();
  byId('orderDialog').showModal();
});
byId('addOrderItem').addEventListener('click', addOrderItemRow);
byId('cancelOrder').addEventListener('click', () => byId('orderDialog').close());
byId('orderItems').addEventListener('click', event => {
  const button = event.target.closest('.remove-order-item');
  if (!button) return;
  if (byId('orderItems').children.length === 1) return showMessage('Siparişte en az bir ürün olmalı.');
  button.closest('.order-item').remove();
});

byId('productRows').addEventListener('click', async event => {
  const edit = event.target.closest('[data-edit-product]');
  if (edit) return openProduct(products.find(item => Number(item.id) === Number(edit.dataset.editProduct)));
  const remove = event.target.closest('[data-delete-product]');
  if (!remove || !confirm('Bu ürün arşivlensin mi?')) return;
  try {
    await api(`/products/${remove.dataset.deleteProduct}`, { method: 'DELETE' });
    await loadAll();
    showMessage('Ürün arşivlendi.');
  } catch (error) { showMessage(error.message); }
});

byId('categoryCards').addEventListener('click', async event => {
  const edit = event.target.closest('[data-edit-category]');
  if (edit) return openCategory(categories.find(item => Number(item.id) === Number(edit.dataset.editCategory)));
  const remove = event.target.closest('[data-delete-category]');
  if (!remove || !confirm('Bu kategori arşivlensin mi?')) return;
  try {
    await api(`/categories/${remove.dataset.deleteCategory}`, { method: 'DELETE' });
    await loadCategories();
    showMessage('Kategori arşivlendi.');
  } catch (error) { showMessage(error.message); }
});

byId('productForm').addEventListener('submit', async event => {
  event.preventDefault();
  const id = byId('pId').value;
  const file = byId('pImageFile').files[0];
  const button = byId('saveProduct');
  button.disabled = true;
  button.textContent = file ? 'Fotoğraf yükleniyor...' : 'Kaydediliyor...';
  try {
    let imageUrl = byId('pImage').value.trim();
    if (file) imageUrl = await uploadImage(file);
    if (id && !imageUrl) {
      const existing = products.find(item => Number(item.id) === Number(id));
      imageUrl = existing?.image_url || '';
    }
    await api(id ? `/products/${id}` : '/products', {
      method: id ? 'PUT' : 'POST',
      body: JSON.stringify({
        name: byId('pName').value,
        price: Number(byId('pPrice').value),
        stock: Number(byId('pStock').value),
        categoryId: Number(byId('pCategory').value),
        imageUrl,
        active: byId('pActive').checked
      })
    });
    byId('productDialog').close();
    await loadAll();
    showMessage(id ? 'Ürün güncellendi.' : 'Ürün eklendi.');
  } catch (error) {
    showMessage(error.message);
  } finally {
    button.disabled = false;
    button.textContent = 'Ürünü kaydet';
  }
});

byId('categoryForm').addEventListener('submit', async event => {
  event.preventDefault();
  const id = byId('cId').value;
  try {
    await api(id ? `/categories/${id}` : '/categories', {
      method: id ? 'PUT' : 'POST',
      body: JSON.stringify({ name: byId('cName').value, active: byId('cActive').checked })
    });
    byId('categoryDialog').close();
    await Promise.all([loadCategories(), loadProductCatalog()]);
    showMessage(id ? 'Kategori güncellendi.' : 'Kategori eklendi.');
  } catch (error) { showMessage(error.message); }
});

byId('orderForm').addEventListener('submit', async event => {
  event.preventDefault();
  const items = [...document.querySelectorAll('.order-item')].map(row => ({
    productId: Number(row.querySelector('.order-item-product').value),
    quantity: Number(row.querySelector('.order-item-quantity').value)
  }));
  try {
    await api('/orders', { method: 'POST', body: JSON.stringify({
      customerName: byId('orderCustomer').value,
      orderDate: byId('orderDate').value,
      items
    }) });
    byId('orderDialog').close();
    await loadAll();
    showMessage('Sipariş oluşturuldu.');
  } catch (error) { showMessage(error.message); }
});

byId('orderRows').addEventListener('change', async event => {
  const select = event.target.closest('[data-order-status]');
  if (!select) return;
  try {
    await api(`/orders/${select.dataset.orderStatus}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: select.value })
    });
    await loadAll();
    showMessage('Sipariş durumu güncellendi.');
  } catch (error) {
    showMessage(error.message);
    await loadOrders();
  }
});

byId('orderRows').addEventListener('click', async event => {
  const button = event.target.closest('[data-order-detail]');
  if (!button) return;
  try {
    const order = await api(`/orders/${button.dataset.orderDetail}`);
    const lines = order.items.map(item => `${item.name} × ${item.quantity} — ${money(item.unit_price * item.quantity)}`).join('\n');
    alert(`Sipariş #${order.id}\nMüşteri: ${order.username}\nDurum: ${order.status}\n\n${lines}\n\nToplam: ${money(order.total)}`);
  } catch (error) { showMessage(error.message); }
});

byId('stockForm').addEventListener('submit', async event => {
  event.preventDefault();
  try {
    await api('/stock-movements', { method: 'POST', body: JSON.stringify({
      productId: Number(byId('stockProduct').value),
      change: Number(byId('stockChange').value),
      reason: byId('stockReason').value
    }) });
    byId('stockDialog').close();
    event.target.reset();
    await loadAll();
    showMessage('Stok güncellendi.');
  } catch (error) { showMessage(error.message); }
});

byId('userRows').addEventListener('change', async event => {
  const select = event.target.closest('[data-user-role]');
  if (!select) return;
  try {
    await api(`/users/${select.dataset.userRole}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role: select.value })
    });
    if (Number(select.dataset.userRole) === Number(currentUser.id)) {
      const result = await api('/auth/me');
      currentUser = result.user;
      setSession(getToken(), currentUser);
      applyRole();
    }
    await loadUsers();
    showMessage('Kullanıcı rolü güncellendi.');
  } catch (error) {
    showMessage(error.message);
    await loadUsers();
  }
});

byId('passwordForm').addEventListener('submit', async event => {
  event.preventDefault();
  try {
    await api('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({
        currentPassword: byId('currentPassword').value,
        newPassword: byId('newPassword').value
      })
    });
    byId('passwordDialog').close();
    event.target.reset();
    showMessage('Parola güncellendi; diğer oturumlar kapatıldı.');
  } catch (error) { showMessage(error.message); }
});

const titles = {
  dashboard: ['Dashboard', 'E-ticaret sisteminin genel durumu'],
  products: ['Ürünler', 'Ürün kataloğunu, fiyatları ve stokları yönet'],
  categories: ['Kategoriler', 'Ürün gruplarını yönet'],
  orders: ['Siparişler', 'Müşteri siparişlerini takip et'],
  stock: ['Stok Hareketleri', 'Tüm stok değişikliklerini incele'],
  users: ['Kullanıcılar', 'Yönetici ve personel yetkilerini belirle'],
  logs: ['Sistem Logları', 'Kullanıcı işlemlerini denetle'],
  settings: ['Hesabım', 'Hesap ve güvenlik ayarları']
};

byId('nav').addEventListener('click', event => {
  const button = event.target.closest('button[data-page]');
  if (!button || button.classList.contains('role-hidden')) return;
  document.querySelectorAll('.nav button').forEach(item => item.classList.remove('active'));
  document.querySelectorAll('.page').forEach(item => item.classList.remove('active'));
  button.classList.add('active');
  byId(button.dataset.page).classList.add('active');
  byId('title').textContent = titles[button.dataset.page][0];
  byId('subtitle').textContent = titles[button.dataset.page][1];
  byId('side').classList.remove('open');
});

async function bootstrap() {
  if (!getToken()) return showAuth();
  try {
    const result = await api('/auth/me');
    setSession(getToken(), result.user);
    showApp(result.user);
  } catch {
    clearSession();
    showAuth();
  }
}

bootstrap();
