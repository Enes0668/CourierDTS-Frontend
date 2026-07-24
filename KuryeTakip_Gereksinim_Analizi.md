# Kurye Takip Sistemi - Kapsamlı Yazılım Gereksinim Spesifikasyonları (SRS)

## 1. Giriş ve Amaç
Bu doküman, Kurye Takip Sistemi'nin uçtan uca tüm katmanlarındaki (Web, Mobil, Frontend, Backend, Veritabanı) asıl üretim (production) gereksinimlerini tanımlar. Sistem; kesintiye uğrayabilen ağ koşullarında çalışan kuryeleri, gerçek zamanlı takip etmek isteyen yöneticileri ve kanuni kayıt zorunluluklarını kapsar.

---

## 2. Frontend (İstemci) Gereksinimleri

### 2.1. Web Arayüzü (Yönetici Paneli)
*   **[WEB-01] Responsive Tasarım:** Yönetici arayüzü masaüstü ve tablet ekranlarına uyumlu olmalı, ekranı küçülttüğünde harita ve paneller otomatik hizalanmalıdır.
*   **[WEB-02] Canlı Harita (Real-time Map):** Harita modülü, Backend'den gelen en son kurye koordinatlarını (Polling veya WebSocket ile) sayfa yenilenmeden canlı olarak işlemeli ve kurye pinlerini hareket ettirmelidir.
*   **[WEB-03] Toplu İşlem (Bulk Action):** Yönetici, "Atanmamış Paketler Havuzu"ndaki birden fazla paketi Checkbox ile seçip tek bir kuryeye saniyeler içinde zimmetleyebilmelidir.
*   **[WEB-04] Raporlama Arayüzü:** Yönetici; kurye bazlı, tarih bazlı veya durum bazlı (Teslim Edildi, Bekliyor vb.) geçmiş teslimat kayıtlarını listeleyebilmeli ve filtreleyebilmelidir.

### 2.2. Mobil Uygulama (Kurye Cihazı)
*   **[MOB-01] Native Sarım (Capacitor):** Kurye arayüzü, arka planda (kilit ekranında) kesintisiz GPS atabilmesi için Capacitor vb. araçlarla hem Android hem iOS native paketlerine (.apk / .ipa) dönüştürülmelidir.
*   **[MOB-02] Kamera İzni ve Barkod:** Uygulama, cihazın kamerasına erişim sağlayarak opsiyonel barkod veya QR kod okuma işlemini desteklemelidir.
*   **[MOB-03] Donanım Optimizasyonu (Batarya):** Arka plan GPS okumaları, cihazın şarjını hızla tüketmemesi için sabit saniye bazlı değil; ivmeölçer, hareket veya mesafe değişimine göre (Akıllı Polling) optimize edilmelidir.
*   **[MOB-04] Push Bildirimler:** İşletim sisteminin yerel bildirim (Push Notification) servisleri entegre edilerek, kuryeye yeni paket atandığında sesli ve titreşimli uyarı gönderilmelidir.

---

## 3. Çevrimdışı (Offline) Çalışma Gereksinimleri
*   **[OFF-01] Yerel Depolama (Local Queue):** Mobil cihaz internet bağlantısını kaybettiğinde, kuryenin yaptığı işlemler (Teslim Alma, Bırakma, İptal) engellenmemeli, cihazın yerel hafızasına (LocalStorage/IndexedDB) kaydedilmelidir.
*   **[OFF-02] Zaman Damgası Korunumu:** Çevrimdışı yapılan her eylem, yapıldığı anın zaman damgasını (ActionTime) güvenle saklamalıdır.
*   **[OFF-03] Toplu Senkronizasyon (Batch Sync):** Ağ bağlantısı (4G/Wi-Fi) tekrar sağlandığında, cihaz yereldeki kuyruğu gerçekleşme sırasına göre toplu bir paket halinde Backend'e göndermeli ve yerel kuyruğu temizlemelidir.

---

## 4. Backend (Sunucu ve API) Gereksinimleri
*   **[API-01] RESTful Mimari:** Tüm uç noktalar (Endpoints) .NET 8 üzerinde standart HTTP metodlarına (GET, POST, PUT) uygun olarak yapılandırılmalıdır.
*   **[API-02] Toplu İşlem Karşılama:** Sistem her GPS sinyali veya paket işlemi için ayrı istek açmak yerine, cihazlardan gelen "Toplu Dizi (Array)" isteklerini karşılayabilecek Batch endpoint'lere (Örn: `/api/telemetry/batch`) sahip olmalıdır.
*   **[API-03] Rol Bazlı Yetkilendirme (RBAC):** API; yönetici (Admin) istekleri ile kurye (Courier) isteklerini JWT (JSON Web Token) üzerinden ayırt etmeli ve yetkisiz işlemleri 403 Forbidden ile reddetmelidir.
*   **[API-04] Hata Toleransı ve Loglama:** API, kendi içindeki çökme veya hatalı veri durumlarında NLog vb. bir kütüphane ile hataları sunucu dosyasına yazmalıdır.

---

## 5. Veritabanı (DB) ve Veri Modeli Gereksinimleri
*   **[DB-01] İlişkisel Veri Bütünlüğü:** PostgreSQL kullanılmalı ve Entity Framework Core üzerinden tüm tablolar (Couriers, Packages, Journeys, Locations) Yabancı Anahtarlar (Foreign Key) ile birbirine sıkıca bağlanmalıdır. Boşta (Öksüz) kayıt oluşması engellenmelidir.
*   **[DB-02] Gözetim Zinciri (Chain of Custody):** `PackageHistories` (Paket Geçmişi) tablosu sadece yeni veri eklenebilir (Append-only) yapıda olmalıdır. Sistem üzerinden bu tablodan veri silmek (DELETE) fiziksel ve yazılımsal olarak yasaklanmalıdır.
*   **[DB-03] Mekansal (Spatial) Optimizasyon:** `TelemetryLogs` tablosu yoğun veri alacağı için Latitude ve Longitude kolonlarında (veya zaman damgasında) hızlı okuma (Index) optimizasyonları yapılmalıdır.

---

## 6. Güvenlik, Ağ ve KVKK Gereksinimleri
*   **[SEC-01] In-Transit Şifreleme:** İstemci (Mobil/Web) ile Backend sunucusu arasındaki tüm haberleşme zorunlu olarak HTTPS (TLS 1.2 veya üzeri) protokolüyle şifrelenmelidir.
*   **[SEC-02] At-Rest Şifreleme (KVKK):** Tıbbi numune veya hasta isimleri gibi Kişisel Verileri (PII) barındırma ihtimaline karşı, PostgreSQL veritabanındaki ilgili metin kolonları şifrelenmiş (Encrypted) olarak tutulmalıdır.
*   **[SEC-03] DDoS ve Rate Limiting:** Kötü niyetli saldırıları veya hatalı cihazların sunucuyu boğmasını önlemek için API üzerinde IP veya Token bazlı İstek Sınırlandırması (Rate Limiting) uygulanmalıdır.

---

## 7. Ölçeklenebilirlik (Scalability)
*   **[SCA-01] Hedef Yük Dağılımı:** Veritabanı ve API altyapısı, başlangıçta devasa sunucu kümelerine (Cluster) ihtiyaç duymadan, tek bir sunucuda maksimum 100 eşzamanlı aktif kurye (Concurrent User) trafiğini gecikmesiz işleyebilecek yapıda tasarlanmalıdır. Yatay büyümeye (Horizontal Scaling) açık olmalıdır.
