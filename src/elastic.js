const enabled = () => process.env.ELASTICSEARCH_ENABLED === 'true';
const baseUrl = () => (process.env.ELASTICSEARCH_URL || 'http://127.0.0.1:9200').replace(/\/$/, '');
const indexName = () => process.env.ELASTICSEARCH_INDEX || 'products';

async function indexProduct(product) {
  if (!enabled()) return;
  const response = await fetch(`${baseUrl()}/${indexName()}/_doc/${product.id}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(product)
  });
  if (!response.ok) throw new Error(`Elasticsearch: ${response.status}`);
}

async function deleteProduct(id) {
  if (!enabled()) return;
  const response = await fetch(`${baseUrl()}/${indexName()}/_doc/${id}`, { method: 'DELETE' });
  if (!response.ok && response.status !== 404) throw new Error(`Elasticsearch: ${response.status}`);
}

async function searchProducts(query) {
  if (!enabled() || !query) return null;
  const response = await fetch(`${baseUrl()}/${indexName()}/_search`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query: { match: { name: query } }, size: 50 })
  });
  if (!response.ok) return null;
  const result = await response.json();
  return result.hits.hits.map(hit => hit._source);
}

module.exports = { indexProduct, deleteProduct, searchProducts };
