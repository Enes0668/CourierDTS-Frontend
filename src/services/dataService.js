import api from '@/api/index.js';

/**
 * GPS/telemetri noktalarını her zaman { lat, lng } alan adlarına normalize eder.
 * Backend bazen "Latitude/Longitude" (PascalCase) ya da "latitude/longitude"
 * (camelCase, tam ad) döndürebilir — bunlar normalize edilmeden Leaflet'e geçilirse
 * koordinatlar NaN'a düşer ve harita çizimi (polyline/fitBounds) sert bir hata
 * fırlatıp tüm ekranı kaplayabilir. Dizi içinde dizi varsa (birden fazla tur) da
 * derinlemesine normalize eder.
 */
function normalizeGpsPoint(p) {
  if (Array.isArray(p)) return p.map(normalizeGpsPoint);
  if (!p || typeof p !== 'object') return p;
  const lat = p.lat ?? p.Lat ?? p.latitude ?? p.Latitude;
  const lng = p.lng ?? p.Lng ?? p.longitude ?? p.Longitude;
  return {
    ...p,
    lat: Number(lat),
    lng: Number(lng),
    timestamp: p.timestamp ?? p.Timestamp
  };
}

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
      console.error("API Error (updatePackage):", error);
      throw error;
    }
  },

  /**
   * Var olan bir paketi sistemden siler.
   * @param {number|string} id - Silinecek paketin ID'si.
   * @returns {Promise<Object>} API yanıtı.
   */
  async deletePackage(id) {
    try {
      const response = await api.delete(`/packages/${id}`);
      return response.data;
    } catch (error) {
      console.error("API Error (deletePackage):", error);
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
      // Backend courierId için null bekler (= havuza döndür); UI'da "0" pool'u
      // temsil ettiği için burada normalize ediyoruz, aksi halde backend
      // courierId=0 için kurye arayıp bulamaz ve 500 döner.
      const normalizedCourierId = courierId ? parseInt(courierId) : null;
      const response = await api.put(`/packages/bulk-assign`, { packageIds, courierId: normalizedCourierId });
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
  /**
   * @param {number|string} journeyId
   * @param {string} [notes] - Kuryenin iptal sebebi olarak yazdığı not (opsiyonel).
   *   Backend'de CancelJourneyRequest.notes (nullable string) olarak karşılığı var.
   */
  async cancelJourney(journeyId, notes) {
    try {
      const response = await api.put(`/journeys/${journeyId}/cancel`, { notes: notes || null });
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
   * Devam eden (henüz tamamlanmamış) bir seferin rotasını/hedefini günceller. Kurye aynı
   * sefer ("Sefer (Tour) Mantığı") içinde birden fazla durağı ziyaret ederken, her yeni
   * durak seçiminde tekrar /journeys/start çağırmak yerine bu uç kullanılır — aksi halde
   * "Aktif Sefer Kontrolü" kuralı (tek seferde tek aktif tur) ikinci start çağrısını reddeder
   * ve kuryenin üzerinde teslim edilmemiş materyal varken sefer tamamlanmaya zorlanmış olur.
   * @param {number|string} journeyId - Güncellenecek aktif seferin ID'si.
   * @param {Object} payload - { endLocationId, plannedPath, plannedDistanceMeters }
   * @returns {Promise<Object>} API yanıtı.
   */
  async replanJourney(journeyId, payload) {
    const response = await api.put(`/journeys/${journeyId}/replan`, payload);
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
      // Backend bu ucu (barkod hassas bir tanımlayıcı olduğu için) GET query'den
      // POST body'ye taşıdı — bkz. journeys-degisiklik-dokumani.md #4.
      const response = await api.post('/packages/route', { barcode });
      const data = response.data?.items ? response.data.items : (response.data || []);
      const points = Array.isArray(data) ? data : (data.data || []);
      return points.map(normalizeGpsPoint);
    } catch (error) {
      console.error("API Error (getTourHistoryByBarcode):", error);
      throw error;
    }
  },

  /**
   * İlgili turun GPS telemetri (konum geçmişi) verilerini getirir.
   * @param {string|number} journeyId - Telemetrisi alınacak turun ID'si.
   * @returns {Promise<Array>} Koordinat noktalarının listesi.
   */
  async getTelemetry(journeyId) {
    try {
      // bkz. journeys-degisiklik-dokumani.md #4 — GET'ten POST body'ye taşındı.
      const response = await api.post('/telemetry', { journeyId: parseInt(journeyId) });
      const data = response.data?.items ? response.data.items : (response.data || []);
      const points = Array.isArray(data) ? data : (data.data || []);
      return points.map(normalizeGpsPoint);
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
        phone: c.phone || c.Phone || '',
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
  },

  /**
   * Günlük özet istatistikleri getirir (toplam/yoldaki/teslim edilen materyal sayıları,
   * kurye doluluk oranları). Backend'in tam alan adları teyit edilmediği için AdminDashboard
   * bu veriyi bulamadığı alanlar için packages/couriers listesinden kendi hesapladığı
   * yedek (fallback) değerlerle tamamlar.
   * @returns {Promise<Object>} Dashboard özet nesnesi (backend şemasına göre).
   */
  async getDashboard() {
    try {
      const response = await api.get('/dashboard');
      return response.data?.data || response.data || {};
    } catch (error) {
      console.error("API Error (getDashboard):", error);
      throw error;
    }
  },

  /**
   * Aktif kuryelerin (veya tek bir kuryenin) o an elinde taşınan paketlerini getirir.
   * @param {number|string} [courierId] - Verilirse sadece o kuryeye filtrelenir.
   * @returns {Promise<Array>} Kuryelerin elindeki paketlerin listesi.
   */
  async getCourierOnHand(courierId) {
    try {
      const params = courierId ? { courierId } : {};
      const response = await api.get('/couriers/onhand', { params });
      const data = response.data?.items ? response.data.items : (response.data || []);
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error("API Error (getCourierOnHand):", error);
      throw error;
    }
  },

  /**
   * Yeni bir kurye (kullanıcı) oluşturur.
   * @param {Object} payload - { username, password, name, phone }
   * @returns {Promise<Object>} Oluşturulan kurye.
   */
  async addCourier(payload) {
    try {
      const response = await api.post('/couriers', payload);
      return response.data;
    } catch (error) {
      console.error("API Error (addCourier):", error);
      throw error;
    }
  },

  /**
   * Var olan bir kuryenin bilgilerini günceller.
   * @param {number|string} id - Güncellenecek kuryenin ID'si.
   * @param {Object} payload - Güncellenmiş kurye verileri.
   * @returns {Promise<Object>} API yanıtı.
   */
  async updateCourier(id, payload) {
    try {
      const response = await api.put(`/couriers/${id}`, payload);
      return response.data;
    } catch (error) {
      console.error("API Error (updateCourier):", error);
      throw error;
    }
  },

  /**
   * Bir kuryeyi sistemden siler.
   * @param {number|string} id - Silinecek kuryenin ID'si.
   * @returns {Promise<Object>} API yanıtı.
   */
  async deleteCourier(id) {
    try {
      const response = await api.delete(`/couriers/${id}`);
      return response.data;
    } catch (error) {
      console.error("API Error (deleteCourier):", error);
      throw error;
    }
  },

  /**
   * Kurye Devri (Nakil): Bir kuryenin üzerindeki sonuçlanmamış (henüz teslim edilmemiş)
   * tüm materyallerini tek istekte başka bir kuryeye devreder. Sahada kaza/arıza gibi acil
   * durumlarda "Bags" yapısına ihtiyaç duymadan kullanılmak üzere tasarlanmıştır.
   * @param {number|string} fromCourierId - Üzerindeki paketler devredilecek kurye.
   * @param {number|string} toCourierId - Paketlerin devredileceği yeni kurye.
   * @returns {Promise<Object>} API yanıtı.
   */
  async transferCourierPackages(fromCourierId, toCourierId) {
    try {
      const normalizedToId = parseInt(toCourierId);
      // Backend'in beklediği alan adı teyit edilmediğinden, olası isimlendirmelerin
      // hepsi aynı payload'da gönderiliyor (diğer uçlarda da kullanılan savunmacı desen).
      const payload = {
        toCourierId: normalizedToId,
        ToCourierId: normalizedToId,
        newCourierId: normalizedToId
      };
      const response = await api.put(`/couriers/${fromCourierId}/transfer`, payload);
      return response.data;
    } catch (error) {
      console.error("API Error (transferCourierPackages):", error);
      throw error;
    }
  },

  /**
   * Yeni bir lokasyon (merkez) oluşturur.
   * @param {Object} payload - { name, latitude, longitude }
   * @returns {Promise<Object>} Oluşturulan lokasyon.
   */
  async addLocation(payload) {
    try {
      const response = await api.post('/locations', payload);
      return response.data;
    } catch (error) {
      console.error("API Error (addLocation):", error);
      throw error;
    }
  },

  /**
   * Var olan bir lokasyonu günceller.
   * @param {number|string} id - Güncellenecek lokasyonun ID'si.
   * @param {Object} payload - Güncellenmiş lokasyon verileri.
   * @returns {Promise<Object>} API yanıtı.
   */
  async updateLocation(id, payload) {
    try {
      const response = await api.put(`/locations/${id}`, payload);
      return response.data;
    } catch (error) {
      console.error("API Error (updateLocation):", error);
      throw error;
    }
  },

  /**
   * Bir lokasyonu sistemden siler.
   * @param {number|string} id - Silinecek lokasyonun ID'si.
   * @returns {Promise<Object>} API yanıtı.
   */
  async deleteLocation(id) {
    try {
      const response = await api.delete(`/locations/${id}`);
      return response.data;
    } catch (error) {
      console.error("API Error (deleteLocation):", error);
      throw error;
    }
  },

  /**
   * Paketlerin gözetim zinciri (chain-of-custody) geçmişini getirir: her paketin
   * alınma/teslim/devir gibi hareketlerini zaman sırasıyla listeler (Raporlama ekranı).
   * @param {Object} [params] - Opsiyonel filtreler (örn. { packageId, barcode }).
   * @returns {Promise<Array>} Geçmiş kayıtlarının listesi.
   */
  async getPackageHistories(params = {}) {
    try {
      // bkz. journeys-degisiklik-dokumani.md #4 — GET query'den POST body'ye taşındı
      // (chain-of-custody geçmişi hassas kabul edildiği için).
      const response = await api.post('/packagehistories', params);
      const data = response.data?.items ? response.data.items : (response.data || []);
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error("API Error (getPackageHistories):", error);
      throw error;
    }
  }
};

