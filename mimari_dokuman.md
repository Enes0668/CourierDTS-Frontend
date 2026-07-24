# Kurye Takip Projesi Mimari Dökümanı

**Adım 1: Uygulamaya Giriş ve Kimlik Tespiti (Mobil Katman)**
* **Teknoloji:** Vue 3 (Options API, Saf JavaScript) + Capacitor.
* **İşleyiş:** Kurye, native gibi görünen ama aslında Capacitor WebView içinde çalışan mobil uygulamayı açar. Giriş yaptığında sistem, Firebase Cloud Messaging (FCM) altyapısı için `fcm_token` ve cihaz tanıma için `deviceId` bilgilerini okuyarak backend'e iletir. İletişim güvenliği, oturum boyunca JWT (JSON Web Token) ile sağlanır.

**Adım 2: Teslimatın Başlaması ve Konum Okuma (Mobil Katman)**
* **Teknoloji:** `@capacitor/geolocation`.
* **İşleyiş:** Kurye uygulamadan rotayı seçip başlattığında, sistem `session_id` üreterek `DELIVERY_STARTED` olayını (event) fırlatır. Kurye yola çıktığında, cihazın GPS donanımı arka planda koordinatları okumaya başlar.

**Adım 3: Akıllı Sepet ve Çevrimdışı Kuyruk (Optimizasyon Katmanı)**
* **İşleyiş:** Uygulama şarjı ve sunucuyu korumak için okuduğu koordinatları anında merkeze göndermez.
  * **Akıllı Sepet (Batching):** GPS verileri biriktirilir. Yalnızca 30 saniye geçtiğinde veya 50 koordinat biriktiğinde `DELIVERY_ROUTE_UPDATE` olayı olarak paketlenir.
  * **Çevrimdışı Kuyruk (Offline Queue):** Kuryenin interneti kesilirse (asansör, tünel vb.), bu veri paketleri cihazın yerel hafızasına zaman damgasıyla yazılır. İnternet geri geldiğinde, JWT geçerliliği kontrol edilip tüm paketler sırasıyla backend'e fırlatılır (Flush).

**Adım 4: Verinin Karşılanması (API Katmanı)**
* **Teknoloji:** .NET Core 8 Web API.
* **İşleyiş:** Mobilden gelen veri paketi (HTTP POST), backend'deki Controller'a ulaşır. Controller kesinlikle iş mantığına karışmaz; soket (SignalR) yapıları da olmadığı için gelen isteği doğrudan ilgili işlemciye (Handler) yönlendirir.

**Adım 5: İş Kuralları ve Veritabanı Kaydı (Application ve Data Katmanı)**
* **Teknoloji:** MediatR, SqlKata, Npgsql, PostgreSQL.
* **İşleyiş:** İstek, MediatR Handler sınıfının içine düşer. Burada verinin dönüşümü (Entity ↔ DTO) ve validasyonları gerçekleştirilir (Bu işlemler ekibin kararına göre manuel if/else ile ya da AutoMapper/FluentValidation kütüphaneleriyle yapılır). İşlemi biten veriler, klasik Repository kullanılmadan doğrudan SqlKata QueryFactory ile üretilen sorgular üzerinden PostgreSQL veritabanına kaydedilir.

**Adım 6: Teslimatın Bitişi ve Analiz (Backend Hesaplaması)**
* **İşleyiş:** Kurye hedefe ulaştığında mobil cihaz sadece `DELIVERY_COMPLETED` sinyali gönderir. Cihaz GPS sapmaları nedeniyle kendi mesafesini hesaplamaz. Backend, bu bitiş sinyalini aldığında kuryenin tüm rotasını analiz eder, sapmaları düzeltir (Smoothing) ve `actual_distance` (gerçekleşen mesafe) değerini kendisi hesaplayarak veritabanına işler.

**Adım 7: Yöneticinin Kuryeyi İzlemesi (Web Katmanı)**
* **Teknoloji:** Vue 3 (Options API, Saf JavaScript), Leaflet / Google Maps / Mapbox.
* **İşleyiş:** Yönetici web panelini açtığında, tüm veriler `App.vue` içindeki `data()` bloğunda tutulur (Pinia/Vuex yasaktır) ve alt bileşenlere `props` ile dağıtılır.
  * **Canlı İzleme (Polling):** Panel, SignalR kullanmaz. Bunun yerine arka planda çalışan tekrarlı `setTimeout` yapısıyla her 5-10 saniyede bir backend'e HTTP GET isteği atarak seçili kuryenin en son konumunu çeker. Gelen bu taze koordinat verisi harita (Leaflet vb.) bileşenine aktarılır ve kurye ikonu haritada hareket eder.
