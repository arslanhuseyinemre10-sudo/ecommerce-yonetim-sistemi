# E-Commerce Yönetim Sistemi

C, MySQL, HTML, CSS ve JavaScript kullanılarak geliştirilen modüler e-ticaret yönetim projesidir.

## Özellikler

- Kullanıcı kayıt ve giriş sistemi
- Ürün ve kategori yönetimi
- Sipariş oluşturma
- Stok hareketleri
- Sistem logları
- Yönetim paneli arayüzü
- İsteğe bağlı Elasticsearch entegrasyonu

## Proje yapısı

- `index.html`: Yönetim panelinin HTML yapısı
- `css/style.css`: Arayüz tasarımı
- `js/app.js`: Arayüz işlemleri
- `js/storage.js`: Tarayıcı veri ve oturum işlemleri
- `proje.c`: Ana C uygulaması
- `proje_elasticsearch.c`: Elasticsearch destekli C uygulaması
- `Dump20260721.sql`: MySQL veritabanı yapısı

## Veritabanı parolası

MySQL parolası kaynak kodda tutulmaz. Programı çalıştırmadan önce PowerShell'de ortam değişkenini ayarlayın:

```powershell
$env:ECOMMERCE_DB_PASSWORD="MYSQL_PAROLANIZ"
```

Ardından programı aynı terminal üzerinden çalıştırın.

## Arayüzü çalıştırma

`index.html` dosyasını tarayıcıda açın. Arayüz şu anda tarayıcının yerel depolama alanını kullanır; C/MySQL uygulamasına doğrudan bağlı değildir.
