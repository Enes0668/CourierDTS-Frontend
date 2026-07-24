# CourierDTS Uçtan Uca İşleyiş ve Senaryo Özeti

Bu doküman, CourierDTS kurye takip simülasyon sisteminin mobil uygulamadan veritabanına ve yönetici paneline kadar uzanan tüm yaşam döngüsünü, mimari teknoloji seçimlerini ve yaşanabilecek olası kriz senaryolarına karşı alınan teknik önlemleri listeler.

---

## FAZ 1: Mesai Başlangıcı ve Cihaz Kaydı (Mobil Katman)

**Aksiyon:** Kurye, Vue 3 (Options API) kodunun Capacitor ile sarmalandığı mobil uygulamayı açar.
**Kullanılan Teknoloji:** Vue 3, Capacitor, `@capacitor/push-notifications`, JWT.

### İşleyiş & Kriz Senaryoları:
* **İdeal İşleyiş:** Kurye giriş yapar. Sistem, cihazı tanımak için `deviceId` ve Apple/Google üzerinden bildirim atabilmek için `fcm_token` bilgisini alır, backend'e iletir. Backend, oturum yönetimi için JWT döner.

> [!WARNING]
> **Kriz (İzin Reddi):** Kurye konum iznini reddederse, Options API `mounted()` kancasında bu durum yakalanır ve işlem durdurulur.

> [!CAUTION]
> **Kriz (Token Düşmesi):** JWT süresi bitmişse, uygulama `401 Unauthorized` hatası aldığında arka planda kullanıcıyı hissettirmeden otomatik olarak Refresh Token ile oturumu yeniler.

---

## FAZ 2: Teslimatın Başlatılması (Mobil ➔ Backend)

**Aksiyon:** Kurye atanmış rotayı seçer ve "Yola Çık" butonuna basar.

### İşleyiş & Kriz Senaryoları:
* **İdeal İşleyiş:** Sistem benzersiz bir `session_id` üretir ve `DELIVERY_STARTED` paketini backend'e fırlatır.

> [!WARNING]
> **Kriz (İnternet Yok):** Kurye kapalı otoparkta "Yola Çık" butonuna basarsa veri paketi fırlatılamaz. Uygulama bu paketi LocalStorage'a (Yerel Kuyruk) yazar ve kuryeyi ekranda bekletmeden teslimat işlemini başlatır.

**Örnek JSON Paketi (DELIVERY_STARTED):**
```json
{
    "event_name": "DELIVERY_STARTED",
    "timestamp": "2026-07-20T08:30:15.102Z",
    "context": {
        "courier_id": "SIM_COURIER_776",
        "delivery_id": "SIM_ORDER_1784530221031",
        "session_id": "d1fed007-fac4-43d3-b5a6-5758f61b7a16"
    },
    "payload": {
        "start_location_name": "Depo A",
        "end_location_name": "Tunalı Hilmi Caddesi",
        "planned_distance": 2963.1,
        "planned_path": [
            { "lat": 39.92086, "lng": 32.854104 },
            { "lat": 39.920869, "lng": 32.853909 }
        ]
    }
}
```

---

## FAZ 3: Sahada Hareket ve "Akıllı Sepet" (Telemetri)

**Aksiyon:** Kurye trafikte ilerler, uygulama her saniye konum okur ancak merkeze anında göndermez.
**Kullanılan Teknoloji:** `@capacitor/geolocation`, Capacitor Network, LocalStorage.

### İşleyiş & Kriz Senaryoları:
* **İdeal İşleyiş (Akıllı Sepet):** Telefon bataryasını ve sunucuyu korumak için veriler cihazda biriktirilir. 30 saniye geçtiğinde veya 50 koordinat dolduğunda dizi halinde `DELIVERY_ROUTE_UPDATE` paketi fırlatılır.

> [!IMPORTANT]
> **Kriz (Tünel/Asansör Kesintisi):** Kurye tünele girdi. Sepet doldu ama internet yok. Uygulama paketi silmez, zaman damgasıyla cihazın yerel hafızasına ekler. Tünel çıkışında internet geldiğinde, JWT süresi kontrol edilir (dolduysa yenilenir) ve bekleyen tüm paketler backend'e fırlatılır (Flush).

**Örnek JSON Paketi (DELIVERY_ROUTE_UPDATE):**
```json
{
    "event_name": "DELIVERY_ROUTE_UPDATE",
    "timestamp": "2026-07-20T08:35:45.155Z",
    "context": {
        "courier_id": "SIM_COURIER_776",
        "delivery_id": "SIM_ORDER_1784530221031",
        "session_id": "d1fed007-fac4-43d3-b5a6-5758f61b7a16"
    },
    "payload": {
        "actual_path_segment": [
            { "lat": 39.905481, "lng": 32.857963 },
            { "lat": 39.904513, "lng": 32.858393 },
            { "lat": 39.904303, "lng": 32.858482 }
        ]
    }
}
```

---

## FAZ 4: Verinin Backend'de Karşılanması ve Kaydedilmesi

**Aksiyon:** Paketler sunucuya ulaşır.
**Kullanılan Teknoloji:** .NET Core 8 Web API, MediatR, SqlKata, PostgreSQL.

### İşleyiş & Kriz Senaryoları:
* **İdeal İşleyiş:** Controller paketi alır, iş mantığına girmeden doğrudan MediatR Handler'ına iletir. Handler; manuel validasyon/mapping işlemlerini yapar ve veriyi hantal Repository kalıplarını kullanmadan, yüksek performanslı SqlKata ile doğrudan PostgreSQL'e yazar.

> [!TIP]
> **Kriz Çözümü (Sırasız Paketler):** Çevrimdışı kuyruktan gelen 10 paket aynı anda sunucuya yığılırsa; Backend, paketlerin varış sırasına göre değil, içindeki `timestamp` değerine göre (Order By Timestamp) kaydı gerçekleştirir. Bu sayede rota bütünlüğü asla bozulmaz.

---

## FAZ 5: Web Panelinde Canlı İzleme (Yönetici)

**Aksiyon:** Yönetici kuryeyi haritadan canlı izler.
**Kullanılan Teknoloji:** Vue 3 (Options API), Leaflet/Mapbox, REST API.

### İşleyiş & Kriz Senaryoları:
* **İdeal İşleyiş:** Web paneli maliyetli SignalR/WebSocket mimarisi kullanmaz. `App.vue` (Single Source) içinde tekrarlı `setTimeout` çalışır. Her 5-10 saniyede bir backend'den son konum çekilir ve `props` ile harita bileşenine aktarılarak kurye simgesinin hareket etmesi sağlanır.

> [!IMPORTANT]
> **Kriz Çözümü (Sunucu Gecikmesi):** Sunucu 7 saniyede cevap verirse, klasik `setInterval` kullanımı istekleri üst üste bindirip tarayıcıyı kilitler. Tekrarlı `setTimeout` mimarisi ise önceki cevap gelmeden yeni bir istek atmayacağı için panelin donmasını engeller.

---

## FAZ 6: Teslimatın Bitişi ve Mesafe Analizi (Backend)

**Aksiyon:** Kurye teslimatı başarıyla bitirir veya iptal eder.
**Kullanılan Teknoloji:** MediatR Handler Algoritması.

### İşleyiş & Kriz Senaryoları:
* **Kriz (Hatalı Mobil Hesaplama):** GPS sekmeleri (jitter) yüzünden mobil cihaz kendi mesafesini hesaplaması güvensizdir. Cihaz sadece kapanış sinyali yollar.
* **Backend Analizi:** Bitiş sinyalini alan MediatR Handler'ı; o `session_id`'ye ait tüm koordinatları veritabanından çeker. Hatalı sekmeleri algılayıp düzeltir (Smoothing Algoritması) ve gerçeğe en yakın `actual_distance` değerini hesaplayarak güvenli veritabanı kaydını oluşturur.

**Örnek JSON Paketi (DELIVERY_COMPLETED):**
```json
{
    "event_name": "DELIVERY_COMPLETED",
    "timestamp": "2026-07-20T08:45:12.852Z",
    "context": {
        "courier_id": "SIM_COURIER_776",
        "delivery_id": "SIM_ORDER_1784530221031",
        "session_id": "d1fed007-fac4-43d3-b5a6-5758f61b7a16"
    },
    "payload": { "status": "SUCCESS" }
}
```

---

## FAZ 7: Dashboard ve Raporlama (Geçmiş Veri İncelemesi)

**Aksiyon:** Yönetici biten siparişin detaylı raporuna tıklar.
**Kullanılan Teknoloji:** Vue 3 (Options API), Leaflet.

### İşleyiş ve Görselleştirme:
Panel, backend'e HTTP GET isteği atar. Backend; süreyi, planlanan/gerçekleşen mesafeyi, sapma yüzdesini ve haritada çizdirilmek üzere iki farklı koordinat dizisini gönderir.

Web arayüzü `App.vue`'ya gelen bu JSON'ı okuyarak:
1. **Metrik Kartlarına:** "Teslimat Süresi: 14.9 dk", "Sapma: %4.8" gibi özet verileri yazar.
2. **Harita Üzerine:** Planlanan rotayı (`planned_path`) **mavi kesik çizgi** olarak, kuryenin gerçekten gittiği ve backend tarafından temizlenmiş rotayı (`actual_smoothed_path`) **kırmızı kalın çizgi** olarak çizer.

**Dashboard JSON Örneği (Backend ➔ Web):**
```json
{
    "delivery_id": "SIM_ORDER_1784530221031",
    "timeline": {
        "started_at": "2026-07-20T08:30:15.102Z",
        "completed_at": "2026-07-20T08:45:12.852Z",
        "total_duration_minutes": 14.9
    },
    "metrics": {
        "planned_distance": 2963.1,
        "actual_distance": 3105.4,
        "deviation_percentage": 4.8
    },
    "visualization": {
        "planned_path": [ { "lat": 39.92086, "lng": 32.854104 }, { "lat": 39.921, "lng": 32.855 } ],
        "actual_smoothed_path": [ { "lat": 39.92087, "lng": 32.854110 }, { "lat": 39.921, "lng": 32.8549 } ]
    }
}
```
