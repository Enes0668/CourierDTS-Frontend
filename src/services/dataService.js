import api from '@/api/index.js';

export const dataService = {
  async getLocations() {
    try {
      const response = await api.get('/locations');
      return response.data;
    } catch (error) {
      console.error("Locations fetch error:", error);
      return [];
    }
  },
  async getAllPackages() {
    try {
        const response = await api.get('/packages');
        return response.data;
    } catch (error) {
        console.error("API Error (getAllPackages):", error);
        return [];
    }
  },

  async getMyPackages(courierId) {
    try {
        const response = await api.get(`/packages/mypackages?courierId=${courierId}`);
        return response.data;
    } catch (error) {
        console.error("API Error (getMyPackages):", error);
        return [];
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
      return [];
    }
  },

  async getTourHistoryByBarcode(barcode) {
    try {
      const response = await api.get(`/packages/route?barcode=${barcode}`);
      return response.data; // Expected to return array of ActualPaths
    } catch (error) {
      console.error("API Error (getTourHistoryByBarcode):", error);
      return [];
    }
  },

  async getTelemetry(journeyId) {
    try {
      const response = await api.get(`/telemetry?journeyId=${journeyId}`);
      return response.data;
    } catch (error) {
      console.error("API Error (getTelemetry):", error);
      return [];
    }
  },

  async syncActions(payload) {
    const response = await api.post('/packages/syncactions', payload);
    return response.data;
  },
  
  async getCouriers() {
    try {
      const response = await api.get('/couriers');
      return response.data.map(c => ({
        id: c.id || c.userId,
        name: c.name || c.username,
        lat: c.lastLat,
        lng: c.lastLng,
        status: c.isActive ? "Aktif" : "Pasif"
      }));
    } catch (error) {
      console.error("Couriers fetch error", error);
      return [];
    }
  }
};
