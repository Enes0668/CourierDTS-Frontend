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
        const response = await api.get('/materials');
        return response.data;
    } catch (error) {
        console.error("API Error (getAllPackages):", error);
        return [];
    }
  },

  async getMyPackages(courierId) {
    try {
        const response = await api.get(`/materials/mymaterials?courierId=${courierId}`);
        return response.data;
    } catch (error) {
        console.error("API Error (getMyPackages):", error);
        return [];
    }
  },

  async createPackage(payload) {
    try {
      const response = await api.post('/materials', payload);
      return response.data;
    } catch (error) {
      console.error("API Error:", error);
      throw error;
    }
  },

  async assignPackageBulk(materialIds, targetCourierId) {
    try {
      const response = await api.post(`/materials/bulk-assign`, { materialIds, targetCourierId });
      return response.data;
    } catch (error) {
      console.error("API Error (assignPackageBulk):", error);
      throw error;
    }
  },

  async completeJourney(journeyId) {
    try {
      const response = await api.put(`/tours/${journeyId}/complete`);
      return response.data;
    } catch (error) {
      console.error("API Error (completeJourney):", error);
      throw error;
    }
  },

  async startJourney(payload) {
    const response = await api.post('/tours/start', payload);
    return response.data;
  },

  async getJourneys(courierId) {
    try {
      const response = await api.get(`/tours?courierId=${courierId}`);
      return response.data;
    } catch (error) {
      console.error("API Error (getJourneys):", error);
      return [];
    }
  },

  async getTourHistoryByBarcode(barcode) {
    try {
      const response = await api.get(`/tours/history?barcode=${barcode}`);
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

  async syncActions(actions) {
    const response = await api.post('/materials/sync', actions);
    return response.data;
  },
  
  async getCouriers() {
    try {
      const response = await api.get('/users?role=1');
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
