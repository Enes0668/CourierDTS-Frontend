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
    console.log("[Axios] createPackage çağrıldı", payload);
    try {
      const response = await api.post('/packages', payload);
      return response.data;
    } catch (error) {
      console.error("API Error:", error);
      throw error;
    }
  },

  async assignPackage(packageId, courierId) {
    try {
      // Enes'in yeni eklediği Atama (Assign) Endpoint'i
      const response = await api.put(`/packages/${packageId}/assign`, { courierId });
      return response.data;
    } catch (error) {
      console.error("API Error (assignPackage):", error);
      throw error;
    }
  },

  async setCourierActive(courierId, isActive) {
    try {
      const response = await api.put('/courier/active', { courierId, isActive });
      return response.data;
    } catch (error) {
      console.error("API Error (setCourierActive):", error);
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

  async startJourney(courierId, startLocationId, endLocationId) {
    console.log("[Axios] startJourney çağrıldı");
    const response = await api.post('/journeys/start', { courierId, startLocationId, endLocationId });
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

  async getTelemetry(journeyId) {
    try {
      const response = await api.get(`/telemetry?journeyId=${journeyId}`);
      return response.data;
    } catch (error) {
      console.error("API Error (getTelemetry):", error);
      return [];
    }
  },

  async syncActions(journeyId, actions) {
    console.log("[Axios] syncActions çağrıldı", actions);
    const response = await api.post('/packages/syncactions', { journeyId, actions });
    return response.data;
  },
  
  async getCouriers() {
    try {
      const response = await api.get('/couriers');
      return response.data.map(c => ({
        id: c.id,
        name: c.name + " " + c.surname,
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
