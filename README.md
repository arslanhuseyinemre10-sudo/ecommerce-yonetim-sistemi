# E-Commerce Yönetim Sistemi

C, MySQL, Node.js, HTML, CSS, JavaScript ve isteğe bağlı Elasticsearch kullanılan modüler e-ticaret yönetim projesi.

## Tamamlanan özellikler

- Güvenli kullanıcı kayıt ve giriş sistemi (bcrypt + JWT)
- MySQL bağlantılı ürün ve kategori yönetimi
- Transaction kullanan sipariş oluşturma
- Otomatik ve manuel stok hareketleri
- Gerçek sistem logları ve dashboard değerleri
- Modüler HTML, CSS ve JavaScript arayüzü
- İsteğe bağlı Elasticsearch ürün araması
- Docker desteği

## Klasör yapısı

- `server.js`: API sunucusu
- `src/`: Veritabanı, oturum ve Elasticsearch modülleri
- `index.html`: Yönetim paneli
- `css/style.css`: Arayüz tasarımı
- `js/app.js`: API'ye bağlı arayüz işlemleri
- `js/storage.js`: Güvenli oturum bilgileri
- `database/migration.sql`: Mevcut veritabanını güncelleme dosyası
- `proje.c`: Konsol uygulaması
- `proje_elasticsearch.c`: Elasticsearch destekli konsol uygulaması

## İlk kurulum

1. Node.js LTS sürümünü kurun.
2. MySQL Workbench'te `database/migration.sql` dosyasını çalıştırın.
3. `.env.example` dosyasının kopyasını `.env` adıyla oluşturun.
4. `.env` içindeki `DB_PASSWORD` ve `JWT_SECRET` değerlerini doldurun.
5. Proje klasöründe terminal açıp aşağıdaki komutları çalıştırın:

```powershell
npm install
npm start
```

6. Tarayıcıdan `http://localhost:3000` adresini açın.

`index.html` dosyasını doğrudan açmak artık yeterli değildir; gerçek MySQL bağlantısı için uygulama `npm start` ile çalıştırılmalıdır.

## Docker ile çalıştırma

`.env` dosyası hazırlandıktan sonra:

```powershell
docker compose up --build
```

Elasticsearch kullanılmayacaksa `.env` içinde `ELASTICSEARCH_ENABLED=false` bırakın. Kullanılacaksa `true` yapın.

## Güvenlik

- MySQL parolası ve JWT anahtarı GitHub'a yüklenmez.
- Kullanıcı parolaları düz metin olarak değil bcrypt hash olarak saklanır.
- API uçları giriş tokenı olmadan kullanılamaz.
- SQL sorguları parametreli çalışır.
