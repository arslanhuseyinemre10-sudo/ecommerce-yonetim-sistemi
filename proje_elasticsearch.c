
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <mysql/mysql.h>
#include <curl/curl.h>

#define DB_HOST "127.0.0.1"
#define DB_USER "root"
#define DB_PASSWORD (getenv("ECOMMERCE_DB_PASSWORD") ? getenv("ECOMMERCE_DB_PASSWORD") : "")
#define DB_NAME "ecommerce"
#define DB_PORT 3306

/* Yerel Elasticsearch için: http://localhost:9200
   Elastic Cloud kullanıyorsan kendi endpoint adresini yaz. */
#define ES_URL "http://localhost:9200"
#define ES_INDEX "products"
#define ES_API_KEY ""   /* Elastic Cloud API key kullanıyorsan buraya yaz. */
#define ES_ENABLED 1

typedef struct {
    char *data;
    size_t size;
} Memory;

void giris_temizle(void);
void metin_oku(const char *mesaj, char *hedef, size_t boyut);
int tamsayi_oku(const char *mesaj, int min);
double ondalik_oku(const char *mesaj, double min);
void mysql_escape(MYSQL *conn, const char *kaynak, char *hedef, size_t hedef_boyutu);

MYSQL *veritabanina_baglan(void);


void log_ekle(MYSQL *conn, int user_id, const char *action, const char *description);
void loglari_listele(MYSQL *conn);


int kullanici_kayit(MYSQL *conn);
int kullanici_giris(MYSQL *conn, char *aktif_kullanici, size_t boyut);

void kategori_ekle(MYSQL *conn, int user_id);
void kategorileri_listele(MYSQL *conn);

void urun_ekle(MYSQL *conn, int user_id);
void urunleri_listele(MYSQL *conn);
void urun_ara_like(MYSQL *conn, int user_id);
void urun_guncelle(MYSQL *conn, int user_id);
void urun_sil(MYSQL *conn, int user_id);
void stok_guncelle(MYSQL *conn, int user_id);


void siparis_olustur(MYSQL *conn, int user_id);
void siparisleri_listele(MYSQL *conn, int user_id);

void dashboard_goster(MYSQL *conn);


size_t curl_yazma_callback(void *contents, size_t size, size_t nmemb, void *userp);
int es_istek(const char *method, const char *url, const char *json, Memory *response);
void es_urun_indeksle(long long id, const char *name, double price, int stock, int category_id);
void es_urun_sil(long long id);
void es_urun_ara(MYSQL *conn, int user_id);
void es_tum_urunleri_senkronize_et(MYSQL *conn, int user_id);
void es_urunu_mysql_den_senkronize_et(MYSQL *conn, int product_id);
void json_metni_kacir(const char *kaynak, char *hedef, size_t hedef_boyutu);

int main(void)
{
    MYSQL *conn = veritabanina_baglan();
    if (conn == NULL) return 1;

    curl_global_init(CURL_GLOBAL_DEFAULT);

    int aktif_user_id = 0;
    char aktif_kullanici[100] = "";

    while (aktif_user_id == 0)
    {
        printf("\n====================================\n");
        printf("          KULLANICI SISTEMI\n");
        printf("====================================\n");
        printf("1 - Giris yap\n");
        printf("2 - Kayit ol\n");
        printf("0 - Cikis\n");

        int secim = tamsayi_oku("Seciminiz: ", 0);

        if (secim == 1)
            aktif_user_id = kullanici_giris(conn, aktif_kullanici, sizeof(aktif_kullanici));
        else if (secim == 2)
            kullanici_kayit(conn);
        else if (secim == 0)
        {
            mysql_close(conn);
            curl_global_cleanup();
            return 0;
        }
        else
            printf("Gecersiz secim.\n");
    }

    int secim = -1;
    do
    {
        printf("\n================================================\n");
        printf(" LOG TABANLI E-TICARET - Kullanici: %s\n", aktif_kullanici);
        printf("================================================\n");
        printf(" 1 - Urun ekle\n");
        printf(" 2 - Urunleri listele\n");
        printf(" 3 - Urun ara (MySQL LIKE)\n");
        printf(" 4 - Urun ara (Elasticsearch)\n");
        printf(" 5 - Urun guncelle\n");
        printf(" 6 - Urun sil\n");
        printf(" 7 - Stok guncelle\n");
        printf(" 8 - Kategori ekle\n");
        printf(" 9 - Kategorileri listele\n");
        printf("10 - Siparis olustur\n");
        printf("11 - Siparislerimi listele\n");
        printf("12 - Dashboard\n");
        printf("13 - Loglari listele\n");
        printf("14 - Tum urunleri Elasticsearch'e aktar\n");
        printf(" 0 - Cikis\n");

        secim = tamsayi_oku("Seciminiz: ", 0);

        switch (secim)
        {
            case 1: urun_ekle(conn, aktif_user_id); break;
            case 2: urunleri_listele(conn); break;
            case 3: urun_ara_like(conn, aktif_user_id); break;
            case 4: es_urun_ara(conn, aktif_user_id); break;
            case 5: urun_guncelle(conn, aktif_user_id); break;
            case 6: urun_sil(conn, aktif_user_id); break;
            case 7: stok_guncelle(conn, aktif_user_id); break;
            case 8: kategori_ekle(conn, aktif_user_id); break;
            case 9: kategorileri_listele(conn); break;
            case 10: siparis_olustur(conn, aktif_user_id); break;
            case 11: siparisleri_listele(conn, aktif_user_id); break;
            case 12: dashboard_goster(conn); break;
            case 13: loglari_listele(conn); break;
            case 14: es_tum_urunleri_senkronize_et(conn, aktif_user_id); break;
            case 0:
                log_ekle(conn, aktif_user_id, "LOGOUT", "Kullanici cikis yapti.");
                printf("Program kapatiliyor.\n");
                break;
            default: printf("Gecersiz secim.\n");
        }
    } while (secim != 0);

    mysql_close(conn);
    curl_global_cleanup();
    return 0;
}



void giris_temizle(void)
{
    int c;
    while ((c = getchar()) != '\n' && c != EOF) {}
}

void metin_oku(const char *mesaj, char *hedef, size_t boyut)
{
    printf("%s", mesaj);
    if (fgets(hedef, (int)boyut, stdin) == NULL)
    {
        hedef[0] = '\0';
        return;
    }
    hedef[strcspn(hedef, "\r\n")] = '\0';
}

int tamsayi_oku(const char *mesaj, int min)
{
    int deger;
    for (;;)
    {
        printf("%s", mesaj);
        if (scanf("%d", &deger) == 1 && deger >= min)
        {
            giris_temizle();
            return deger;
        }
        printf("Gecersiz sayi.\n");
        giris_temizle();
    }
}

double ondalik_oku(const char *mesaj, double min)
{
    double deger;
    for (;;)
    {
        printf("%s", mesaj);
        if (scanf("%lf", &deger) == 1 && deger >= min)
        {
            giris_temizle();
            return deger;
        }
        printf("Gecersiz sayi.\n");
        giris_temizle();
    }
}

void mysql_escape(MYSQL *conn, const char *kaynak, char *hedef, size_t hedef_boyutu)
{
    size_t gerekli = strlen(kaynak) * 2 + 1;
    if (gerekli > hedef_boyutu)
    {
        hedef[0] = '\0';
        return;
    }
    mysql_real_escape_string(conn, hedef, kaynak, (unsigned long)strlen(kaynak));
}



MYSQL *veritabanina_baglan(void)
{
    MYSQL *conn = mysql_init(NULL);
    if (!conn)
    {
        printf("MySQL baslatilamadi.\n");
        return NULL;
    }

    my_bool ssl_zorunlu = 0;
    my_bool sertifika_dogrula = 0;
    mysql_options(conn, MYSQL_OPT_SSL_ENFORCE, &ssl_zorunlu);
    mysql_options(conn, MYSQL_OPT_SSL_VERIFY_SERVER_CERT, &sertifika_dogrula);

    if (!mysql_real_connect(conn, DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT, NULL, 0))
    {
        printf("Baglanti hatasi: %s\n", mysql_error(conn));
        mysql_close(conn);
        return NULL;
    }

    mysql_set_character_set(conn, "utf8mb4");
    printf("MySQL baglantisi basarili.\n");
    return conn;
}



void log_ekle(MYSQL *conn, int user_id, const char *action, const char *description)
{
    char ea[201], ed[1001], sql[1500];
    mysql_escape(conn, action, ea, sizeof(ea));
    mysql_escape(conn, description, ed, sizeof(ed));

    snprintf(sql, sizeof(sql),
        "INSERT INTO logs(user_id, action, description) VALUES(%s, '%s', '%s')",
        user_id > 0 ? "LAST_INSERT_ID()" : "NULL", ea, ed);

    /* LAST_INSERT_ID burada kullanıcı ID'si için uygun değil; aşağıda gerçek sorguyu kuruyoruz. */
    if (user_id > 0)
        snprintf(sql, sizeof(sql),
            "INSERT INTO logs(user_id, action, description) VALUES(%d, '%s', '%s')",
            user_id, ea, ed);
    else
        snprintf(sql, sizeof(sql),
            "INSERT INTO logs(user_id, action, description) VALUES(NULL, '%s', '%s')",
            ea, ed);

    if (mysql_query(conn, sql))
        printf("Log hatasi: %s\n", mysql_error(conn));
}

void loglari_listele(MYSQL *conn)
{
    const char *sql =
        "SELECT l.id, COALESCE(u.username,'-'), l.action, l.description, l.created_at "
        "FROM logs l LEFT JOIN users u ON u.id=l.user_id ORDER BY l.id DESC LIMIT 100";

    if (mysql_query(conn, sql))
    {
        printf("Log listeleme hatasi: %s\n", mysql_error(conn));
        return;
    }

    MYSQL_RES *res = mysql_store_result(conn);
    MYSQL_ROW row;

    printf("\n%-5s %-15s %-20s %-45s %-20s\n", "ID", "KULLANICI", "ISLEM", "ACIKLAMA", "TARIH");
    printf("-------------------------------------------------------------------------------------------------------------\n");
    while ((row = mysql_fetch_row(res)))
        printf("%-5s %-15s %-20s %-45s %-20s\n",
               row[0], row[1], row[2], row[3], row[4]);
    mysql_free_result(res);
}



int kullanici_kayit(MYSQL *conn)
{
    char username[100], password[100], email[150];
    char eu[201], ep[201], ee[301], sql[1000];

    metin_oku("Kullanici adi: ", username, sizeof(username));
    metin_oku("Parola: ", password, sizeof(password));
    metin_oku("E-posta: ", email, sizeof(email));

    mysql_escape(conn, username, eu, sizeof(eu));
    mysql_escape(conn, password, ep, sizeof(ep));
    mysql_escape(conn, email, ee, sizeof(ee));

    snprintf(sql, sizeof(sql),
        "INSERT INTO users(username,password,email) VALUES('%s','%s','%s')",
        eu, ep, ee);

    if (mysql_query(conn, sql))
    {
        printf("Kayit hatasi: %s\n", mysql_error(conn));
        return 0;
    }

    printf("Kullanici kaydi basarili.\n");
    log_ekle(conn, (int)mysql_insert_id(conn), "REGISTER", "Yeni kullanici kaydoldu.");
    return 1;
}

int kullanici_giris(MYSQL *conn, char *aktif_kullanici, size_t boyut)
{
    char username[100], password[100], eu[201], ep[201], sql[700];

    metin_oku("Kullanici adi: ", username, sizeof(username));
    metin_oku("Parola: ", password, sizeof(password));

    mysql_escape(conn, username, eu, sizeof(eu));
    mysql_escape(conn, password, ep, sizeof(ep));

    snprintf(sql, sizeof(sql),
        "SELECT id, username FROM users WHERE username='%s' AND password='%s' LIMIT 1",
        eu, ep);

    if (mysql_query(conn, sql))
    {
        printf("Giris sorgusu hatasi: %s\n", mysql_error(conn));
        return 0;
    }

    MYSQL_RES *res = mysql_store_result(conn);
    MYSQL_ROW row = mysql_fetch_row(res);

    if (!row)
    {
        printf("Kullanici adi veya parola yanlis.\n");
        mysql_free_result(res);
        return 0;
    }

    int id = atoi(row[0]);
    snprintf(aktif_kullanici, boyut, "%s", row[1]);
    mysql_free_result(res);

    printf("Giris basarili.\n");
    log_ekle(conn, id, "LOGIN", "Kullanici giris yapti.");
    return id;
}



void kategori_ekle(MYSQL *conn, int user_id)
{
    char name[100], ename[201], sql[500], aciklama[300];
    metin_oku("Kategori adi: ", name, sizeof(name));
    mysql_escape(conn, name, ename, sizeof(ename));

    snprintf(sql, sizeof(sql), "INSERT INTO categories(name) VALUES('%s')", ename);
    if (mysql_query(conn, sql))
    {
        printf("Kategori ekleme hatasi: %s\n", mysql_error(conn));
        return;
    }

    printf("Kategori eklendi.\n");
    snprintf(aciklama, sizeof(aciklama), "%s kategorisi eklendi.", name);
    log_ekle(conn, user_id, "ADD_CATEGORY", aciklama);
}

void kategorileri_listele(MYSQL *conn)
{
    if (mysql_query(conn, "SELECT id,name FROM categories ORDER BY name"))
    {
        printf("Kategori listeleme hatasi: %s\n", mysql_error(conn));
        return;
    }

    MYSQL_RES *res = mysql_store_result(conn);
    MYSQL_ROW row;
    printf("\n%-5s %-30s\n", "ID", "KATEGORI");
    while ((row = mysql_fetch_row(res)))
        printf("%-5s %-30s\n", row[0], row[1]);
    mysql_free_result(res);
}



void urunleri_listele(MYSQL *conn)
{
    const char *sql =
        "SELECT p.id,p.name,p.price,p.stock,COALESCE(c.name,'-') "
        "FROM products p LEFT JOIN categories c ON c.id=p.category_id ORDER BY p.id";

    if (mysql_query(conn, sql))
    {
        printf("Listeleme hatasi: %s\n", mysql_error(conn));
        return;
    }

    MYSQL_RES *res = mysql_store_result(conn);
    MYSQL_ROW row;

    printf("\n%-5s %-25s %-12s %-8s %-20s\n", "ID", "URUN", "FIYAT", "STOK", "KATEGORI");
    printf("---------------------------------------------------------------------------\n");
    while ((row = mysql_fetch_row(res)))
        printf("%-5s %-25s %-12s %-8s %-20s\n",
               row[0], row[1], row[2], row[3], row[4]);
    mysql_free_result(res);
}

void urun_ekle(MYSQL *conn, int user_id)
{
    char name[120], ename[241], sql[1000], aciklama[500];
    double price;
    int stock, category_id;

    kategorileri_listele(conn);
    metin_oku("Urun adi: ", name, sizeof(name));
    price = ondalik_oku("Fiyat: ", 0);
    stock = tamsayi_oku("Stok: ", 0);
    category_id = tamsayi_oku("Kategori ID (yoksa 0): ", 0);

    mysql_escape(conn, name, ename, sizeof(ename));

    if (category_id == 0)
        snprintf(sql, sizeof(sql),
            "INSERT INTO products(name,price,stock,category_id) VALUES('%s',%.2f,%d,NULL)",
            ename, price, stock);
    else
        snprintf(sql, sizeof(sql),
            "INSERT INTO products(name,price,stock,category_id) VALUES('%s',%.2f,%d,%d)",
            ename, price, stock, category_id);

    if (mysql_query(conn, sql))
    {
        printf("Urun ekleme hatasi: %s\n", mysql_error(conn));
        return;
    }

    long long id = (long long)mysql_insert_id(conn);
    printf("Urun eklendi. ID: %lld\n", id);

    snprintf(aciklama, sizeof(aciklama), "%s urunu eklendi.", name);
    log_ekle(conn, user_id, "ADD_PRODUCT", aciklama);
    es_urun_indeksle(id, name, price, stock, category_id);
}

void urun_ara_like(MYSQL *conn, int user_id)
{
    char kelime[100], ek[201], sql[700], aciklama[300];
    metin_oku("Aranacak kelime: ", kelime, sizeof(kelime));
    mysql_escape(conn, kelime, ek, sizeof(ek));

    snprintf(sql, sizeof(sql),
        "SELECT id,name,price,stock FROM products WHERE name LIKE '%%%s%%' ORDER BY name", ek);

    if (mysql_query(conn, sql))
    {
        printf("Arama hatasi: %s\n", mysql_error(conn));
        return;
    }

    MYSQL_RES *res = mysql_store_result(conn);
    MYSQL_ROW row;
    printf("\n%-5s %-25s %-12s %-8s\n", "ID", "URUN", "FIYAT", "STOK");
    while ((row = mysql_fetch_row(res)))
        printf("%-5s %-25s %-12s %-8s\n", row[0], row[1], row[2], row[3]);
    mysql_free_result(res);

    snprintf(aciklama, sizeof(aciklama), "LIKE ile '%s' arandi.", kelime);
    log_ekle(conn, user_id, "SEARCH_PRODUCT_MYSQL", aciklama);
}

void urun_guncelle(MYSQL *conn, int user_id)
{
    urunleri_listele(conn);
    int id = tamsayi_oku("Guncellenecek urun ID: ", 1);

    char name[120], ename[241], sql[1000], aciklama[500];
    double price;
    int stock, category_id;

    metin_oku("Yeni urun adi: ", name, sizeof(name));
    price = ondalik_oku("Yeni fiyat: ", 0);
    stock = tamsayi_oku("Yeni stok: ", 0);
    category_id = tamsayi_oku("Yeni kategori ID (yoksa 0): ", 0);
    mysql_escape(conn, name, ename, sizeof(ename));

    if (category_id == 0)
        snprintf(sql, sizeof(sql),
            "UPDATE products SET name='%s',price=%.2f,stock=%d,category_id=NULL WHERE id=%d",
            ename, price, stock, id);
    else
        snprintf(sql, sizeof(sql),
            "UPDATE products SET name='%s',price=%.2f,stock=%d,category_id=%d WHERE id=%d",
            ename, price, stock, category_id, id);

    if (mysql_query(conn, sql))
    {
        printf("Guncelleme hatasi: %s\n", mysql_error(conn));
        return;
    }
    if (mysql_affected_rows(conn) == 0)
    {
        printf("Urun bulunamadi veya bilgiler degismedi.\n");
        return;
    }

    printf("Urun guncellendi.\n");
    snprintf(aciklama, sizeof(aciklama), "ID %d urunu guncellendi.", id);
    log_ekle(conn, user_id, "UPDATE_PRODUCT", aciklama);
    es_urun_indeksle(id, name, price, stock, category_id);
}

void urun_sil(MYSQL *conn, int user_id)
{
    urunleri_listele(conn);
    int id = tamsayi_oku("Silinecek urun ID: ", 1);
    char sql[200], aciklama[300];

    snprintf(sql, sizeof(sql), "DELETE FROM products WHERE id=%d", id);
    if (mysql_query(conn, sql))
    {
        printf("Silme hatasi: %s\n", mysql_error(conn));
        return;
    }
    if (mysql_affected_rows(conn) == 0)
    {
        printf("Urun bulunamadi.\n");
        return;
    }

    printf("Urun silindi.\n");
    snprintf(aciklama, sizeof(aciklama), "ID %d urunu silindi.", id);
    log_ekle(conn, user_id, "DELETE_PRODUCT", aciklama);
    es_urun_sil(id);
}

void stok_guncelle(MYSQL *conn, int user_id)
{
    urunleri_listele(conn);
    int id = tamsayi_oku("Urun ID: ", 1);
    int miktar;

    printf("Stok degisimi (+ ekle, - azalt): ");
    if (scanf("%d", &miktar) != 1)
    {
        giris_temizle();
        printf("Gecersiz miktar.\n");
        return;
    }
    giris_temizle();

    char sql[600];
    snprintf(sql, sizeof(sql),
        "UPDATE products SET stock=stock+(%d) WHERE id=%d AND stock+(%d)>=0",
        miktar, id, miktar);

    if (mysql_query(conn, sql))
    {
        printf("Stok hatasi: %s\n", mysql_error(conn));
        return;
    }
    if (mysql_affected_rows(conn) == 0)
    {
        printf("Urun bulunamadi veya stok sifirin altina inerdi.\n");
        return;
    }

    snprintf(sql, sizeof(sql),
        "INSERT INTO stock_movements(product_id,user_id,quantity_change,reason) "
        "VALUES(%d,%d,%d,'MANUAL')", id, user_id, miktar);
    mysql_query(conn, sql);

    printf("Stok guncellendi.\n");
    log_ekle(conn, user_id, "UPDATE_STOCK", "Manuel stok hareketi olusturuldu.");
    es_urunu_mysql_den_senkronize_et(conn, id);
}



void siparis_olustur(MYSQL *conn, int user_id)
{
    urunleri_listele(conn);
    int product_id = tamsayi_oku("Urun ID: ", 1);
    int quantity = tamsayi_oku("Adet: ", 1);

    char sql[1000];
    snprintf(sql, sizeof(sql),
        "SELECT price,stock,name FROM products WHERE id=%d", product_id);

    if (mysql_query(conn, sql)) { printf("Hata: %s\n", mysql_error(conn)); return; }
    MYSQL_RES *res = mysql_store_result(conn);
    MYSQL_ROW row = mysql_fetch_row(res);

    if (!row)
    {
        printf("Urun bulunamadi.\n");
        mysql_free_result(res);
        return;
    }

    double price = atof(row[0]);
    int stock = atoi(row[1]);
    char product_name[120];
    snprintf(product_name, sizeof(product_name), "%s", row[2]);
    mysql_free_result(res);

    if (stock < quantity)
    {
        printf("Yetersiz stok. Mevcut: %d\n", stock);
        return;
    }

    double total = price * quantity;

    if (mysql_query(conn, "START TRANSACTION")) { printf("Transaction hatasi.\n"); return; }

    snprintf(sql, sizeof(sql),
        "INSERT INTO orders(user_id,total,status) VALUES(%d,%.2f,'CREATED')",
        user_id, total);
    if (mysql_query(conn, sql)) goto rollback;

    long long order_id = (long long)mysql_insert_id(conn);

    snprintf(sql, sizeof(sql),
        "INSERT INTO order_items(order_id,product_id,quantity,unit_price) VALUES(%lld,%d,%d,%.2f)",
        order_id, product_id, quantity, price);
    if (mysql_query(conn, sql)) goto rollback;

    snprintf(sql, sizeof(sql),
        "UPDATE products SET stock=stock-%d WHERE id=%d AND stock>=%d",
        quantity, product_id, quantity);
    if (mysql_query(conn, sql) || mysql_affected_rows(conn) == 0) goto rollback;

    snprintf(sql, sizeof(sql),
        "INSERT INTO stock_movements(product_id,user_id,quantity_change,reason) "
        "VALUES(%d,%d,-%d,'ORDER')", product_id, user_id, quantity);
    if (mysql_query(conn, sql)) goto rollback;

    if (mysql_query(conn, "COMMIT")) goto rollback;

    printf("Siparis olusturuldu. Siparis ID: %lld, Toplam: %.2f\n", order_id, total);
    char aciklama[500];
    snprintf(aciklama, sizeof(aciklama), "%s x%d siparis edildi. Toplam %.2f", product_name, quantity, total);
    log_ekle(conn, user_id, "CREATE_ORDER", aciklama);
    es_urunu_mysql_den_senkronize_et(conn, product_id);
    return;

rollback:
    printf("Siparis hatasi: %s\n", mysql_error(conn));
    mysql_query(conn, "ROLLBACK");
}

void siparisleri_listele(MYSQL *conn, int user_id)
{
    char sql[700];
    snprintf(sql, sizeof(sql),
        "SELECT o.id,o.total,o.status,o.created_at,"
        "GROUP_CONCAT(CONCAT(p.name,' x',oi.quantity) SEPARATOR ', ') "
        "FROM orders o "
        "JOIN order_items oi ON oi.order_id=o.id "
        "JOIN products p ON p.id=oi.product_id "
        "WHERE o.user_id=%d GROUP BY o.id ORDER BY o.id DESC", user_id);

    if (mysql_query(conn, sql))
    {
        printf("Siparis listeleme hatasi: %s\n", mysql_error(conn));
        return;
    }

    MYSQL_RES *res = mysql_store_result(conn);
    MYSQL_ROW row;
    printf("\n%-5s %-12s %-12s %-20s %-40s\n", "ID", "TOPLAM", "DURUM", "TARIH", "URUNLER");
    while ((row = mysql_fetch_row(res)))
        printf("%-5s %-12s %-12s %-20s %-40s\n", row[0], row[1], row[2], row[3], row[4]);
    mysql_free_result(res);
}



void dashboard_goster(MYSQL *conn)
{
    const char *sql =
        "SELECT "
        "(SELECT COUNT(*) FROM products),"
        "(SELECT COALESCE(SUM(stock),0) FROM products),"
        "(SELECT COUNT(*) FROM users),"
        "(SELECT COUNT(*) FROM orders),"
        "(SELECT COALESCE(SUM(total),0) FROM orders),"
        "(SELECT COUNT(*) FROM logs)";

    if (mysql_query(conn, sql))
    {
        printf("Dashboard hatasi: %s\n", mysql_error(conn));
        return;
    }

    MYSQL_RES *res = mysql_store_result(conn);
    MYSQL_ROW row = mysql_fetch_row(res);

    printf("\n================ DASHBOARD ================\n");
    printf("Toplam urun         : %s\n", row[0]);
    printf("Toplam stok         : %s\n", row[1]);
    printf("Toplam kullanici    : %s\n", row[2]);
    printf("Toplam siparis      : %s\n", row[3]);
    printf("Toplam satis tutari : %s\n", row[4]);
    printf("Toplam log          : %s\n", row[5]);
    printf("===========================================\n");
    mysql_free_result(res);

    if (!mysql_query(conn,
        "SELECT name,stock FROM products ORDER BY stock ASC LIMIT 5"))
    {
        res = mysql_store_result(conn);
        printf("\nStogu en dusuk urunler:\n");
        while ((row = mysql_fetch_row(res)))
            printf("- %s: %s\n", row[0], row[1]);
        mysql_free_result(res);
    }
}



size_t curl_yazma_callback(void *contents, size_t size, size_t nmemb, void *userp)
{
    size_t toplam = size * nmemb;
    Memory *mem = (Memory *)userp;
    char *yeni = realloc(mem->data, mem->size + toplam + 1);
    if (!yeni) return 0;
    mem->data = yeni;
    memcpy(&(mem->data[mem->size]), contents, toplam);
    mem->size += toplam;
    mem->data[mem->size] = 0;
    return toplam;
}

int es_istek(const char *method, const char *url, const char *json, Memory *response)
{
    response->data = NULL;
    response->size = 0;
    if (!ES_ENABLED) return 0;

    CURL *curl = curl_easy_init();
    if (!curl) return 0;

    struct curl_slist *headers = NULL;
    headers = curl_slist_append(headers, "Content-Type: application/json");

    char auth_header[1200];
    if (strlen(ES_API_KEY) > 0)
    {
        snprintf(auth_header, sizeof(auth_header), "Authorization: ApiKey %s", ES_API_KEY);
        headers = curl_slist_append(headers, auth_header);
    }

    response->data = malloc(1);
    if (!response->data)
    {
        curl_slist_free_all(headers);
        curl_easy_cleanup(curl);
        return 0;
    }
    response->data[0] = '\0';

    curl_easy_setopt(curl, CURLOPT_URL, url);
    curl_easy_setopt(curl, CURLOPT_CUSTOMREQUEST, method);
    curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
    curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, curl_yazma_callback);
    curl_easy_setopt(curl, CURLOPT_WRITEDATA, response);
    curl_easy_setopt(curl, CURLOPT_TIMEOUT, 10L);

    if (json)
        curl_easy_setopt(curl, CURLOPT_POSTFIELDS, json);

    CURLcode rc = curl_easy_perform(curl);
    long http_code = 0;
    curl_easy_getinfo(curl, CURLINFO_RESPONSE_CODE, &http_code);

    curl_slist_free_all(headers);
    curl_easy_cleanup(curl);

    return rc == CURLE_OK && http_code >= 200 && http_code < 300;
}

void json_metni_kacir(const char *kaynak, char *hedef, size_t hedef_boyutu)
{
    size_t j = 0;
    if (hedef_boyutu == 0) return;
    for (size_t i = 0; kaynak[i] != '\0' && j + 1 < hedef_boyutu; i++)
    {
        const char *ek = NULL;
        switch ((unsigned char)kaynak[i])
        {
            case '"': ek = "\\\""; break;
            case '\\': ek = "\\\\"; break;
            case '\n': ek = "\\n"; break;
            case '\r': ek = "\\r"; break;
            case '\t': ek = "\\t"; break;
            default:
                if ((unsigned char)kaynak[i] < 0x20) continue;
                hedef[j++] = kaynak[i];
                continue;
        }
        size_t uzunluk = strlen(ek);
        if (j + uzunluk >= hedef_boyutu) break;
        memcpy(hedef + j, ek, uzunluk);
        j += uzunluk;
    }
    hedef[j] = '\0';
}

void es_urun_indeksle(long long id, const char *name, double price, int stock, int category_id)
{
    if (!ES_ENABLED) return;

    char url[1000], json[1200], guvenli_name[500];
    snprintf(url, sizeof(url), "%s/%s/_doc/%lld", ES_URL, ES_INDEX, id);

    json_metni_kacir(name, guvenli_name, sizeof(guvenli_name));
    snprintf(json, sizeof(json),
        "{\"name\":\"%s\",\"price\":%.2f,\"stock\":%d,\"category_id\":%d}",
        guvenli_name, price, stock, category_id);

    Memory response = {NULL, 0};
    if (!es_istek("PUT", url, json, &response))
        printf("Elasticsearch indeksleme basarisiz. Elasticsearch acik mi?\n");
    free(response.data);
}

void es_urun_sil(long long id)
{
    if (!ES_ENABLED) return;
    char url[1000];
    snprintf(url, sizeof(url), "%s/%s/_doc/%lld", ES_URL, ES_INDEX, id);
    Memory response = {NULL, 0};
    es_istek("DELETE", url, NULL, &response);
    free(response.data);
}

void es_urun_ara(MYSQL *conn, int user_id)
{
    if (!ES_ENABLED)
    {
        printf("Elasticsearch devre disi.\n");
        return;
    }

    char kelime[100], guvenli_kelime[500], url[1000], json[1000], aciklama[300];
    metin_oku("Elasticsearch aranacak kelime: ", kelime, sizeof(kelime));
    json_metni_kacir(kelime, guvenli_kelime, sizeof(guvenli_kelime));

    snprintf(url, sizeof(url), "%s/%s/_search?pretty=true&filter_path=hits.total,hits.hits._id,hits.hits._source", ES_URL, ES_INDEX);
    snprintf(json, sizeof(json),
        "{\"query\":{\"match\":{\"name\":\"%s\"}},\"size\":20}", guvenli_kelime);

    Memory response = {NULL, 0};
    if (!es_istek("POST", url, json, &response))
    {
        printf("Elasticsearch arama basarisiz. ES_URL, API key ve sunucuyu kontrol et.\n");
        free(response.data);
        return;
    }

    printf("\nElasticsearch cevabi:\n%s\n", response.data);
    free(response.data);

    snprintf(aciklama, sizeof(aciklama), "Elasticsearch ile '%s' arandi.", kelime);
    log_ekle(conn, user_id, "SEARCH_PRODUCT_ES", aciklama);
}

void es_urunu_mysql_den_senkronize_et(MYSQL *conn, int product_id)
{
    if (!ES_ENABLED) return;

    char sql[300];
    snprintf(sql, sizeof(sql),
        "SELECT name,price,stock,COALESCE(category_id,0) FROM products WHERE id=%d",
        product_id);

    if (mysql_query(conn, sql))
    {
        printf("Elasticsearch senkron sorgusu hatasi: %s\n", mysql_error(conn));
        return;
    }

    MYSQL_RES *res = mysql_store_result(conn);
    MYSQL_ROW row = mysql_fetch_row(res);
    if (row)
        es_urun_indeksle(product_id, row[0], atof(row[1]), atoi(row[2]), atoi(row[3]));
    mysql_free_result(res);
}

void es_tum_urunleri_senkronize_et(MYSQL *conn, int user_id)
{
    if (!ES_ENABLED)
    {
        printf("Elasticsearch devre disi.\n");
        return;
    }

    const char *sql =
        "SELECT id,name,price,stock,COALESCE(category_id,0) FROM products ORDER BY id";
    if (mysql_query(conn, sql))
    {
        printf("Urun senkronizasyon sorgusu hatasi: %s\n", mysql_error(conn));
        return;
    }

    MYSQL_RES *res = mysql_store_result(conn);
    MYSQL_ROW row;
    int adet = 0;
    while ((row = mysql_fetch_row(res)))
    {
        es_urun_indeksle(atoll(row[0]), row[1], atof(row[2]), atoi(row[3]), atoi(row[4]));
        adet++;
    }
    mysql_free_result(res);

    char aciklama[200];
    snprintf(aciklama, sizeof(aciklama), "%d urun Elasticsearch'e aktarildi.", adet);
    log_ekle(conn, user_id, "SYNC_PRODUCTS_ES", aciklama);
    printf("%d urun icin Elasticsearch senkronizasyonu tamamlandi.\n", adet);
}
