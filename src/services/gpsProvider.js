/**
 * GPS Sağlayıcı Servis (GPS Provider)
 * Bu servis kurye uygulamasının donanım GPS'i veya Simülasyon GPS'i arasında köprü kurar.
 */

class GpsProvider {
  constructor() {
    this.watchId = null;
    this.simulationInterval = null;
    this.isSimulating = false;
  }

  /**
   * GPS takibini başlatır.
   * @param {Function} onSuccess - Başarılı konum alındığında çalışacak callback (position objesi alır).
   * @param {Function} onError - Hata durumunda çalışacak callback.
   * @param {Object} options - Geolocation API ayarları.
   * @returns {number|string} - Watch ID
   */
  watchPosition(onSuccess, onError, options = { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }) {
    // Simülasyon modunda mıyız kontrol et
    const isSimulationMode = localStorage.getItem('SIMULATION_MODE') === 'true';
    this.isSimulating = isSimulationMode;

    if (isSimulationMode) {
      console.log("[GpsProvider] Simülasyon Modu Aktif. Konum LocalStorage'dan okunuyor...");
      
      // Simülasyon döngüsü (her saniye kontrol et)
      const simulatedWatchId = 'SIM_' + Date.now();
      
      this.simulationInterval = setInterval(() => {
        const storedLoc = localStorage.getItem('SIMULATED_LOCATION');
        if (storedLoc) {
          try {
            const parsedLoc = JSON.parse(storedLoc);
            if (parsedLoc && parsedLoc.lat !== undefined && parsedLoc.lng !== undefined) {
              const mockPosition = {
                coords: {
                  latitude: parsedLoc.lat,
                  longitude: parsedLoc.lng
                }
              };
              onSuccess(mockPosition);
            }
          } catch (e) {
            console.error("Simülasyon konum verisi parse edilemedi:", e);
          }
        }
      }, 1000); // Saniyede bir güncelle

      return simulatedWatchId;
    } else {
      // Gerçek Donanım (Hardware) GPS
      if ("geolocation" in navigator) {
        this.watchId = navigator.geolocation.watchPosition(onSuccess, onError, options);
        return this.watchId;
      } else {
        if (onError) onError(new Error("Cihazınız GPS desteklemiyor."));
        return null;
      }
    }
  }

  /**
   * GPS takibini durdurur.
   * @param {number|string} id - Durdurulacak Watch ID
   */
  clearWatch(id) {
    if (this.isSimulating && typeof id === 'string' && id.startsWith('SIM_')) {
      if (this.simulationInterval) {
        clearInterval(this.simulationInterval);
        this.simulationInterval = null;
      }
    } else {
      if (id !== null && "geolocation" in navigator) {
        navigator.geolocation.clearWatch(id);
      }
    }
  }
}

export const gpsProvider = new GpsProvider();
