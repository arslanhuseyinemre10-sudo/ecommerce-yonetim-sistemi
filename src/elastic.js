const enabled = () => process.env.ELASTICSEARCH_ENABLED === 'true';
const baseUrl = () => (process.env.ELASTICSEARCH_URL || 'http://127.0.0.1:9200').replace(/\/$/, '');
const indexName = () => process.env.ELASTICSEARCH_INDEX || 'products';

async function request(path, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    return await fetch(`${baseUrl()}${path}`, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function health() {
  if (!enabled()) return false;
  try {
    const response = await request('/_cluster/health');
    return response.ok;
  } catch {
    return false;
  }
}

async function createIndex() {
  const response = await request(`/${encodeURIComponent(indexName())}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      mappings: {
        properties: {
          id: { type: 'integer' },
          name: { type: 'text', fields: { keyword: { type: 'keyword' } } },
          category: { type: 'text', fields: { keyword: { type: 'keyword' } } },
          category_id: { type: 'integer' },
          price: { type: 'double' },
          stock: { type: 'integer' }
        }
      }
    })
  });
  if (!response.ok) throw new Error(`Elasticsearch indeks oluşturma hatası: ${response.status}`);
}

async function ensureIndex() {
  if (!enabled()) return false;
  const response = await request(`/${encodeURIComponent(indexName())}`, { method: 'HEAD' });
  if (response.status === 404) await createIndex();
  else if (!response.ok) throw new Error(`Elasticsearch indeks kontrol hatası: ${response.status}`);
  return true;
}

async function replaceProducts(products) {
  if (!enabled()) return false;
  const index = encodeURIComponent(indexName());
  const existing = await request(`/${index}`, { method: 'HEAD' });
  if (existing.ok) {
    const removed = await request(`/${index}`, { method: 'DELETE' });
    if (!removed.ok && removed.status !== 404) {
      throw new Error(`Elasticsearch eski indeks silme hatası: ${removed.status}`);
    }
  } else if (existing.status !== 404) {
    throw new Error(`Elasticsearch indeks kontrol hatası: ${existing.status}`);
  }

  await createIndex();
  if (!products.length) return true;

  const body = products.flatMap(product => [
    JSON.stringify({ index: { _index: indexName(), _id: String(product.id) } }),
    JSON.stringify(product)
  ]).join('\n') + '\n';

  const response = await request('/_bulk?refresh=true', {
    method: 'POST',
    headers: { 'content-type': 'application/x-ndjson' },
    body
  });
  if (!response.ok) throw new Error(`Elasticsearch toplu aktarım hatası: ${response.status}`);
  const result = await response.json();
  if (result.errors) throw new Error('Elasticsearch bazı ürünleri indeksleyemedi.');
  return true;
}

async function indexProduct(product) {
  if (!enabled()) return false;
  await ensureIndex();
  const response = await request(`/${encodeURIComponent(indexName())}/_doc/${Number(product.id)}?refresh=true`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(product)
  });
  if (!response.ok) throw new Error(`Elasticsearch ürün ekleme hatası: ${response.status}`);
  return true;
}

async function deleteProduct(id) {
  if (!enabled()) return false;
  const response = await request(`/${encodeURIComponent(indexName())}/_doc/${Number(id)}?refresh=true`, { method: 'DELETE' });
  if (!response.ok && response.status !== 404) {
    throw new Error(`Elasticsearch ürün silme hatası: ${response.status}`);
  }
  return true;
}

async function searchProducts(query) {
  if (!enabled() || !query) return null;
  try {
    const response = await request(`/${encodeURIComponent(indexName())}/_search`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        size: 50,
        query: {
          multi_match: {
            query,
            fields: ['name^3', 'category'],
            fuzziness: 'AUTO'
          }
        },
        sort: [{ _score: 'desc' }, { id: 'desc' }]
      })
    });
    if (!response.ok) return null;
    const result = await response.json();
    return result.hits.hits.map(hit => hit._source);
  } catch {
    return null;
  }
}

module.exports = {
  enabled,
  health,
  ensureIndex,
  replaceProducts,
  indexProduct,
  deleteProduct,
  searchProducts
};
