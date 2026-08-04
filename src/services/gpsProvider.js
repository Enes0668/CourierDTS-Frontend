/**
 * GPS Sağlayıcı Servis (GPS Provider)
 * Bu servis kurye uygulamasının donanım GPS'i veya Simülasyon GPS'i arasında köprü kurar.
 */
import { Geolocation } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';

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
   * @returns {Promise<number|string>} - Watch ID
   */
  async watchPosition(onSuccess, onError, options = { enableHighAccuracy: true, timeout: 5000 }) {
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
    }

    // Gerçek Donanım (Hardware) GPS — Capacitor'ın native köprüsü üzerinden.
    // navigator.geolocation Android WebView'da native izin diyaloğunu tetiklemez;
    // AndroidManifest'te izin tanımlı olsa bile hiç konum dönmez.
    try {
      // requestPermissions() sadece native (Android/iOS) tarafta var; web'de
      // WebPlugin bunu "Not implemented" hatasıyla fırlatır. Web'de tarayıcı
      // kendi izin diyaloğunu watchPosition çağrısı sırasında zaten gösterir.
      if (Capacitor.isNativePlatform()) {
        let permStatus = await Geolocation.checkPermissions();
        if (permStatus.location !== 'granted' && permStatus.coarseLocation !== 'granted') {
          permStatus = await Geolocation.requestPermissions();
        }
        if (permStatus.location !== 'granted' && permStatus.coarseLocation !== 'granted') {
          if (onError) onError(new Error('Konum izni verilmedi.'));
          return null;
        }
      }

      this.watchId = await Geolocation.watchPosition(options, (position, err) => {
        if (err) {
          if (onError) onError(err);
          return;
        }
        onSuccess(position);
      });
      return this.watchId;
    } catch (e) {
      if (onError) onError(e);
      return null;
    }
  }

  /**
   * GPS takibini durdurur.
   * @param {number|string} id - Durdurulacak Watch ID
   */
  async clearWatch(id) {
    if (this.isSimulating && typeof id === 'string' && id.startsWith('SIM_')) {
      if (this.simulationInterval) {
        clearInterval(this.simulationInterval);
        this.simulationInterval = null;
      }
    } else if (id !== null) {
      await Geolocation.clearWatch({ id });
    }
  }
}

export const gpsProvider = new GpsProvider();
