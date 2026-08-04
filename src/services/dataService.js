import api from '@/api/index.js';

const cache = {
  locations: null,
  couriers: null,
  locationsTimestamp: 0,
  couriersTimestamp: 0,
  CACHE_DURATION: 5 * 60 * 1000 // 5 minutes
};

export const dataService = {
  /**
   * Tüm lokasyonları (teslimat noktaları, hastaneler vb.) getirir.
   * Önbellek (cache) mekanizması kullanır. 5 dakika boyunca önbellekten okur.
   * @param {boolean} forceRefresh - True verilirse önbelleği yok sayıp API'den güncel veriyi çeker.
   * @returns {Promise<Array>} Lokasyon nesnelerinin listesi.
   */
  async getLocations(forceRefresh = false) {
    const now = Date.now();
    if (!forceRefresh && cache.locations && (now - cache.locationsTimestamp < cache.CACHE_DURATION)) {
      return cache.locations;
    }
    try {
      const response = await api.get('/locations');
      const data = response.data?.items ? response.data.items : (response.data || []);
      cache.locations = data;
      cache.locationsTimestamp = now;
      return data;
    } catch (error) {
      console.error("Locations fetch error:", error);
      throw error;
    }
  },

  /**
   * Sistemdeki tüm paketleri getirir. (Admin yetkisi gerektirebilir).
   * Backend bu uçtan sayfalanmış (PagedResult, varsayılan pageSize 50) yanıt döner;
   * gerçekten tüm kayıtları almak için totalCount'a ulaşana kadar sayfalar gezilir.
   * @returns {Promise<Array>} Paketlerin listesi.
   */
  async getAllPackages() {
    try {
        const pageSize = 200; // Backend'in izin verdiği azami sayfa boyutu
        let page = 1;
        let items = [];
        let totalCount = Infinity;

        while (items.length < totalCount) {
          const response = await api.get('/packages', { params: { page, pageSize } });
          const data = response.data || {};
          const pageItems = Array.isArray(data.items) ? data.items : (Array.isArray(data) ? data : []);
          if (pageItems.length === 0) break;

          items = items.concat(pageItems);
          totalCount = typeof data.totalCount === 'number' ? data.totalCount : items.length;
          page += 1;
        }

        return items;
    } catch (error) {
        console.error("API Error (getAllPackages):", error);
        throw error;
    }
  },

  /**
   * Belirli bir kuryeye atanmış olan veya henüz havuza düşmüş (atanmamış) paketleri getirir.
   * @param {number|string} courierId - Paketleri çekilecek kuryenin ID'si.
   * @returns {Promise<Array>} Kuryenin görebileceği paketlerin listesi.
   */
  async getMyPackages(courierId) {
    try {
        const response = await api.get(`/packages/mypackages?courierId=${courierId}`);
        return response.data;
    } catch (error) {
        console.error("API Error (getMyPackages):", error);
        throw error;
    }
  },

  /**
   * Yeni bir paket oluşturur (Admin paneli üzerinden).
   * @param {Object} payload - Oluşturulacak paketin verileri.
   * @returns {Promise<Object>} Oluşturulan paketin verisi.
   */
  async createPackage(payload) {
    try {
      const response = await api.post('/packages', payload);
      return response.data;
    } catch (error) {
      console.error("API Error:", error);
      throw error;
    }
  },

  async updatePackage(id, payload) {
    try {
      const response = await api.put(`/packages/${id}`, payload);
      return response.data;
    } catch (error) {
      console.error("Package update error:", error);
      throw error;
    }
  },

  /**
   * Birden fazla paketi toplu olarak bir kuryeye atar.
   * @param {Array<number|string>} packageIds - Atanacak paketlerin ID listesi.
   * @param {number|string} courierId - Paketlerin atanacağı kuryenin ID'si.
   * @returns {Promise<Object>} İşlem sonucu.
   */
  async assignPackageBulk(packageIds, courierId) {
    try {
      const response = await api.put(`/packages/bulk-assign`, { packageIds, courierId });
      return response.data;
    } catch (error) {
      console.error("API Error (assignPackageBulk):", error);
      throw error;
    }
  },

  /**
   * Devam eden bir kurye turunu (journey) tamamlanmış olarak işaretler.
   * @param {string} journeyId - Tamamlanacak turun ID'si.
   * @returns {Promise<Object>} İşlem sonucu.
   */
  async completeJourney(journeyId) {
    try {
      const response = await api.put(`/journeys/${journeyId}/complete`);
      return response.data;
    } catch (error) {
      console.error("API Error (completeJourney):", error);
      throw error;
    }
  },

  /**
   * Devam eden bir kurye turunu (journey) iptal eder.
   * @param {string} journeyId - İptal edilecek turun ID'si.
   * @returns {Promise<Object>} İşlem sonucu.
   */
  async cancelJourney(journeyId) {
    try {
      const response = await api.put(`/journeys/${journeyId}/cancel`);
      return response.data;
    } catch (error) {
      console.error("API Error (cancelJourney):", error);
      throw error;
    }
  },

  /**
   * Kurye için yeni bir teslimat turu başlatır.
   * @param {Object} payload - { courierId, endLocationId, materialIds, plannedPath, plannedDistanceMeters }
   * @returns {Promise<Object>} Başlatılan turun verisi (içinde journeyId bulunur).
   */
  async startJourney(payload) {
    const response = await api.post('/journeys/start', payload);
    return response.data;
  },

  /**
   * Belirli bir kuryenin geçmişteki tüm turlarını listeler.
   * Backend bu uçtan sayfalanmış (PagedResult) yanıt döner, burada items dizisine açılır.
   * @param {number|string} courierId - Turları getirilecek kurye ID'si.
   * @returns {Promise<Array>} Turların listesi.
   */
  async getJourneys(courierId) {
    try {
      const response = await api.get(`/journeys?courierId=${courierId}`);
      return response.data?.items ? response.data.items : (response.data || []);
    } catch (error) {
      console.error("API Error (getJourneys):", error);
      throw error;
    }
  },

  /**
   * Bir paketin barkoduna göre kuryenin rotasını kırmızı çizgiyle haritaya çizdirmek için geçmiş rota datasını getirir.
   * @param {string} barcode - Aranan paketin barkodu.
   * @returns {Promise<Array>} Paket taşıma sırasındaki ActualPath (koordinat dizisi) verisi.
   */
  async getTourHistoryByBarcode(barcode) {
    try {
      const response = await api.get(`/packages/route?barcode=${barcode}`);
      const data = response.data?.items ? response.data.items : (response.data || []);
      return Array.isArray(data) ? data : (data.data || []);
    } catch (error) {
      console.error("API Error (getTourHistoryByBarcode):", error);
      throw error;
    }
  },

  /**
   * İlgili turun GPS telemetri (konum geçmişi) verilerini getirir.
   * @param {string} journeyId - Telemetrisi alınacak turun ID'si.
   * @returns {Promise<Array>} Koordinat noktalarının listesi.
   */
  async getTelemetry(journeyId) {
    try {
      const response = await api.get(`/telemetry?journeyId=${journeyId}`);
      const data = response.data?.items ? response.data.items : (response.data || []);
      return Array.isArray(data) ? data : (data.data || []);
    } catch (error) {
      console.error("API Error (getTelemetry):", error);
      throw error;
    }
  },

  /**
   * İnternet bağlantısı koptuğunda biriken (offline) işlemlerin backend ile senkronize edilmesini sağlar.
   * @param {Array<Object>} payload - Toplu eylem (pickup/dropoff) nesneleri dizisi.
   * @returns {Promise<Object>} Senkronizasyon işlem sonucu.
   */
  async syncActions(payload) {
    const response = await api.post('/packages/syncactions', payload);
    return response.data;
  },
  
  /**
   * Sistemdeki tüm kuryeleri getirir. C# backend'den farklı standartlarda gelebilecek casing (camelCase/PascalCase) 
   * sorunlarına karşı korumalı (robust) bir okuma yapar.
   * @returns {Promise<Array>} Kurye nesnelerinin normalize edilmiş listesi.
   */
  async getCouriers() {
    try {
      const response = await api.get('/couriers');
      const data = response.data?.items ? response.data.items : (response.data || []);
      
      if (!Array.isArray(data)) return [];
      
      return data.map(c => ({
        id: c.id || c.userId || c.Id || c.UserId,
        name: c.name || c.username || c.Name || c.Username || c.fullName || c.FullName || 'Bilinmeyen',
        lat: c.lastLat || c.LastLat,
        lng: c.lastLng || c.LastLng,
        status: (c.isActive === true || c.IsActive === true) ? "Aktif" : "Pasif"
      }));
    } catch (error) {
      console.error("Couriers fetch error", error);
      throw error;
    }
  },

  /**
   * Tüm araçları getirir (Admin kullanımı için).
   * @returns {Promise<Array>} Araç listesi.
   */
  async getVehicles() {
    try {
      const response = await api.get('/vehicles');
      return Array.isArray(response.data) ? response.data : (response.data?.items || []);
    } catch (error) {
      console.error("Vehicles fetch error", error);
      throw error;
    }
  },

  /**
   * Yeni araç ekler (Admin kullanımı için).
   * @param {Object} payload - Araç verileri (plateNumber, vehicleType, courierId)
   * @returns {Promise<Object>} Eklenen araç.
   */
  async addVehicle(payload) {
    try {
      const response = await api.post('/vehicles', payload);
      return response.data;
    } catch (error) {
      console.error("Vehicle add error", error);
      throw error;
    }
  },

  async deleteVehicle(id) {
    try {
      const response = await api.delete(`/vehicles/${id}`);
      return response.data;
    } catch (error) {
      console.error("Vehicle delete error", error);
      throw error;
    }
  },

  async updateVehicle(id, payload) {
    try {
      const response = await api.put(`/vehicles/${id}`, payload);
      return response.data;
    } catch (error) {
      console.error("Vehicle update error", error);
      throw error;
    }
  },

  /**
   * Belirli bir kuryenin atanmış araçlarını getirir.
   * @param {number|string} courierId - Kuryenin ID'si.
   * @returns {Promise<Array>} Araç listesi.
   */
  async getCourierVehicles(courierId) {
    try {
      const response = await api.get(`/courier/vehicles?courierId=${courierId}`);
      return response.data?.items ? response.data.items : (response.data || []);
    } catch (error) {
      console.error("Courier vehicles fetch error", error);
      throw error;
    }
  },

  /**
   * Kuryenin kullanacağı aktif aracı günceller.
   * @param {number|string} courierId - Aracı seçecek kuryenin ID'si.
   * @param {number|string} vehicleId - Seçilen aracın ID'si.
   * @returns {Promise<Object>} Güncelleme işlem sonucu.
   */
  async setCourierActiveVehicle(courierId, vehicleId) {
    try {
      const payload = {
        courierId: parseInt(courierId),
        vehicleId: parseInt(vehicleId)
      };
      const response = await api.put('/courier/active-vehicle', payload);
      return response.data;
    } catch (error) {
      console.error("Set courier active vehicle error", error);
      throw error;
    }
  },

  /**
   * Kuryenin vardiya durumunu (online/offline) değiştirir.
   * @param {number|string} courierId - Kuryenin ID'si.
   * @param {boolean} isActive - true = vardiyada, false = vardiya dışı.
   * @returns {Promise<Object>} Güncelleme işlem sonucu.
   */
  async setCourierActive(courierId, isActive) {
    try {
      const payload = {
        courierId: parseInt(courierId),
        isActive: Boolean(isActive)
      };
      const response = await api.put('/courier/active', payload);
      return response.data;
    } catch (error) {
      console.error("Set courier active error", error);
      throw error;
    }
  }
};

