class CourierMock {
  constructor() {
    this.intervalId = null;
    this.isSimulating = false;
  }

  // İki koordinat arasındaki mesafeyi metre cinsinden bulan Haversine Formülü
  getDistanceInMeters(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Dünyanın metre cinsinden yarıçapı
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Metre cinsinden sonuç döner
  }

  // startRoute: Başlangıç objesi (lat, lng)
  // endRoute: Bitiş objesi (lat, lng)
  // onTick: Her yeni koordinat üretildiğinde çalışacak fonksiyon
  // onFinish: Kurye hedefe vardığında çalışacak fonksiyon
startSimulation(pathCoordinates, onTick, onFinish) {
    if (this.isSimulating) return;
    
    // Eğer gelen yol verisi boşsa veya hatalıysa motoru çalıştırma
    if (!pathCoordinates || pathCoordinates.length === 0) return;

    this.isSimulating = true;
    let deliveryTriggered = false; 

    let currentIndex = 0;
    const totalPoints = pathCoordinates.length;

    // Hedef noktamız her zaman OSRM dizisinin en son elemanıdır
    const finalDest = pathCoordinates[totalPoints - 1];

    // Motor yola çıkıyor! Her 150 milisaniyede bir sonraki OSRM koordinatına atlıyoruz
    this.intervalId = setInterval(() => {
      // Eğer yol bittiyse motoru durdur
      if (currentIndex >= totalPoints) {
        this.stopSimulation();
        return;
      }

      // Kuryenin şu an bulunması gereken koordinat
      const currentPos = pathCoordinates[currentIndex];

      // 1. Arayüze (MapView) kuryenin yeni konumunu gönder
      onTick(currentPos);

      // 2. Hedefe olan mesafeyi kontrol et (100 metre kuralı)
      const remainingDistance = this.getDistanceInMeters(
        currentPos.lat, currentPos.lng,
        finalDest.lat, finalDest.lng
      );

      // Hedefin 100 metre yakınına girdiysek yeşil butonu göster
      if (remainingDistance <= 100 && !deliveryTriggered) {
        deliveryTriggered = true; 
        if (onFinish) onFinish(); 
      }

      currentIndex++; // Bir sonraki sokağa/koordinata geç
    }, 150); // Simülasyon hızı: Daha düşük değer daha hızlı hareket demektir
  }

  stopSimulation() {
    if (this.intervalId) {
      clearInterval(this.intervalId); // Sayacı temizle
      this.intervalId = null;
    }
    this.isSimulating = false;
  }
}

// Servisi her yerden kullanabilmek için dışarı aktarıyoruz
export const courierMock = new CourierMock();