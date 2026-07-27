# E-Ticaret Yönetim Sistemi – Çevrim İçi Sürüm

Bu klasör E-Ticaret Yönetim Sisteminin Sites üzerinde çalışan sürümüdür.

- D1: hesaplar, ürünler, kategoriler, siparişler, stok ve loglar
- R2: bilgisayardan yüklenen ürün fotoğrafları
- Worker: API, yetkilendirme, raporlama ve statik arayüz
- Elasticsearch: ortam adresi verildiğinde kullanılır; aksi durumda veritabanı araması çalışır

## Kontrol

```powershell
node build-online.mjs
node tests/online-smoke.mjs
```

Testler; yönetici/personel yetkilerini, ürün ve kategori işlemlerini, fotoğraf yüklemeyi, çoklu ürün siparişini, sipariş durumlarını, raporları, dışa aktarmayı ve güvenli oturumu denetler.
