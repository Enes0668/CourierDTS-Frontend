<template>
  <div id="app">
    <h1 class="title">Kurye Takip Simülasyonu</h1>
    
    <ControlPanel 
      :is-delivered="isDelivered"
      @route-planned="handleRoutePlanned" 
      @selection-changed="handleSelectionChanged"
      @delivery-success="handleDeliverySuccess"
      @delivery-cancelled="handleDeliveryCancelled"
    />
    
    <MapView 
      :route="currentRoute" 
      :live-selections="currentSelections" 
      :courier-position="courierPosition"
      :is-delivered="isDelivered"
    />
  </div>
</template>

<script>
import ControlPanel from './components/ControlPanel.vue';
import MapView from './components/MapView.vue';
import { courierMock } from './services/courierMock'; 
import { telemetry } from './services/telemetryServices.js';

export default {
  name: 'App',
  components: {
    ControlPanel,
    MapView
  },
  data() {
    return {
      currentRoute: null,
      currentSelections: { start: null, end: null },
      courierPosition: null,
      isDelivered: false,
      plannedDistanceCache: -1
    };
  },
  mounted() {
    const currentCourierId = "SIM_COURIER_" + Math.floor(Math.random() * 1000); 
    const currentDeliveryId = "SIM_ORDER_" + Date.now();
    telemetry.setContext(currentCourierId, currentDeliveryId);
  },
  methods: {
    async fetchRouteFromOSRM(start, end) {
      const url = `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`;

      try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.routes && data.routes.length > 0) {
          const routeData = data.routes[0];
          
          const coordinates = routeData.geometry.coordinates.map(coord => ({
            lat: coord[1],
            lng: coord[0]
          }));
          
          return { coordinates: coordinates, distance: routeData.distance || -1 };
        }
      } catch (error) {
        console.error("OSRM API'den yol verisi alınırken hata oluştu:", error);
        telemetry.trackError('OSRM_FETCH_FAILED', error);
      }
      return null;
    },
    async handleRoutePlanned(routeSelection) {
      const osrmData = await this.fetchRouteFromOSRM(routeSelection.start, routeSelection.end);

      if (!osrmData || !osrmData.coordinates) {
        alert("Gerçek yol rotası hesaplanamadı. Lütfen farklı noktalar deneyin.");
        return;
      }

      const pathCoordinates = osrmData.coordinates;
      this.plannedDistanceCache = osrmData.distance;

      this.currentRoute = {
        start: routeSelection.start,
        end: routeSelection.end,
        coordinates: pathCoordinates 
      };
      
      this.isDelivered = false;

      const startName = routeSelection.start?.name || "UNKNOWN_START";
      const endName = routeSelection.end?.name || "UNKNOWN_END";
      const safePath = Array.isArray(pathCoordinates) ? pathCoordinates : [];
      
      telemetry.startDelivery(startName, endName, this.plannedDistanceCache, safePath);

      courierMock.startSimulation(
        pathCoordinates, 
        (newPosition) => {
          this.courierPosition = newPosition; 
          
          if (newPosition && newPosition.lat && newPosition.lng) {
            telemetry.addCoordinate(newPosition.lat, newPosition.lng);
          }
        },
        () => {
          console.log("Motosiklet hedefe ulaştı. Kullanıcı onayı bekleniyor...");
          this.isDelivered = true;
          telemetry.courierArrived();
        }
      );
    },
    handleSelectionChanged(selections) {
      this.currentSelections = selections;
    },
    handleDeliverySuccess() {
      telemetry.completeDelivery(this.plannedDistanceCache);
      this.resetUI();
    },
    handleDeliveryCancelled() {
      telemetry.cancelDelivery('USER_CLEARED_ROUTE', -1);
      this.resetUI();
    },
    resetUI() {
      this.currentRoute = null;
      this.currentSelections = { start: null, end: null };
      this.isDelivered = false; 
      courierMock.stopSimulation();
      this.courierPosition = null;
      this.plannedDistanceCache = -1;
    }
  }
};
</script>

<style>
/* Tüm uygulamayı etkileyecek global stiller */
body {
  margin: 0;
  padding: 0;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background-color: #f0f2f5;
}

#app {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.title {
  text-align: center;
  color: #2c3e50;
  margin-bottom: 30px;
  font-weight: 600;
}
</style>