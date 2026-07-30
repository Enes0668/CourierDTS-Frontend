import api from '@/api/index.js';

const cache = {
  locations: null,
  couriers: null,
  locationsTimestamp: 0,
  couriersTimestamp: 0,
  CACHE_DURATION: 5 * 60 * 1000 // 5 minutes
};

export const dataService = {
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
  async getAllPackages() {
    try {
        const response = await api.get('/packages');
        return response.data;
    } catch (error) {
        console.error("API Error (getAllPackages):", error);
        throw error;
    }
  },

  async getMyPackages(courierId) {
    try {
        const response = await api.get(`/packages/mypackages?courierId=${courierId}`);
        return response.data;
    } catch (error) {
        console.error("API Error (getMyPackages):", error);
        throw error;
    }
  },

  async createPackage(payload) {
    try {
      const response = await api.post('/packages', payload);
      return response.data;
    } catch (error) {
      console.error("API Error:", error);
      throw error;
    }
  },

  async assignPackageBulk(packageIds, courierId) {
    try {
      const response = await api.put(`/packages/bulk-assign`, { packageIds, courierId });
      return response.data;
    } catch (error) {
      console.error("API Error (assignPackageBulk):", error);
      throw error;
    }
  },

  async completeJourney(journeyId) {
    try {
      const response = await api.put(`/journeys/${journeyId}/complete`);
      return response.data;
    } catch (error) {
      console.error("API Error (completeJourney):", error);
      throw error;
    }
  },

  async startJourney(payload) {
    const response = await api.post('/journeys/start', payload);
    return response.data;
  },

  async getJourneys(courierId) {
    try {
      const response = await api.get(`/journeys?courierId=${courierId}`);
      return response.data;
    } catch (error) {
      console.error("API Error (getJourneys):", error);
      throw error;
    }
  },

  async getTourHistoryByBarcode(barcode) {
    try {
      const response = await api.get(`/packages/route?barcode=${barcode}`);
      return response.data; // Expected to return array of ActualPaths
    } catch (error) {
      console.error("API Error (getTourHistoryByBarcode):", error);
      throw error;
    }
  },

  async getTelemetry(journeyId) {
    try {
      const response = await api.get(`/telemetry?journeyId=${journeyId}`);
      return response.data;
    } catch (error) {
      console.error("API Error (getTelemetry):", error);
      throw error;
    }
  },

  async syncActions(payload) {
    const response = await api.post('/packages/syncactions', payload);
    return response.data;
  },
  
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

  async getVehicles() {
    try {
      const response = await api.get('/vehicles');
      return response.data?.items ? response.data.items : (response.data || []);
    } catch (error) {
      console.error("Vehicles fetch error", error);
      throw error;
    }
  },

  async setCourierActiveVehicle(courierId, vehicleId) {
    try {
      const payload = {
        courierId: parseInt(courierId),
        vehicleId: parseInt(vehicleId)
      };
      const response = await api.put('/courier/active', payload);
      return response.data;
    } catch (error) {
      console.error("Set courier active vehicle error", error);
      throw error;
    }
  }
};
