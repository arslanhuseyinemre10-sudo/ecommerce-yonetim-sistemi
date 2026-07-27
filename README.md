# E-Ticaret Yönetim Sistemi

MySQL, Node.js, HTML, CSS, JavaScript ve isteğe bağlı Elasticsearch kullanan e-ticaret yönetim projesi. Aynı arayüzün Cloudflare D1 ve R2 kullanan çevrim içi sürümü `online-site` klasöründedir.

## Özellikler

- Yönetici ve personel rolleri
- Güvenli kayıt, giriş, oturum kapatma ve parola değiştirme
- Hatalı giriş denemesi sınırlama
- Ürün ekleme, düzenleme ve arşivleme
- Kategori ekleme, düzenleme ve arşivleme
- Bilgisayardan kalıcı ürün fotoğrafı yükleme
- Çok ürünlü sipariş oluşturma
- Sipariş durumu ve iptal işlemleri
- Otomatik stok düşme ve iptalde stok iadesi
- Manuel stok hareketleri ve sistem logları
- Gerçek satış grafiği ve özet raporlar
- Arama, filtreleme ve sayfalama
- Ürün/sipariş CSV aktarımı ve JSON yedek
- Yerelde Elasticsearch araması, bağlantı yoksa MySQL yedeği

## Çalıştırma

En kolay yöntem `baslat.bat` dosyasına çift tıklamaktır. Sunucu hazır olduğunda:

`http://localhost:3000`

adresini açın. İlk çalıştırmada gerekli yeni veritabanı alanları otomatik hazırlanır.

Alternatif:

```powershell
npm start
```

## Yetkiler

- İlk oluşturulan hesap yönetici olur.
- Sonraki hesaplar personel olur.
- Yönetici ürün, kategori, stok, kullanıcı, log ve yedek işlemlerini yönetir.
- Personel ürünleri görüntüler; sipariş oluşturur ve sipariş durumunu günceller.

## Elasticsearch

Docker Desktop açıkken `elasticsearch-baslat.bat` dosyasına çift tıklayın. `.env` içinde `ELASTICSEARCH_ENABLED=true` olduğunda yerel ürün aramaları Elasticsearch ile yapılır. Elasticsearch kapalıysa sistem otomatik olarak MySQL aramasına döner.

## Önemli dosyalar

- `server-portable.js`: Kurulum gerektirmeyen yerel API
- `index.html`: Yönetim paneli
- `css/style.css`: Arayüz tasarımı
- `js/app.js`: Arayüz ve API işlemleri
- `database/migration.sql`: MySQL yükseltme betiği
- `online-site/`: Canlı Sites sürümü

`.env` dosyasını ve gerçek parolaları GitHub'a yüklemeyin.
