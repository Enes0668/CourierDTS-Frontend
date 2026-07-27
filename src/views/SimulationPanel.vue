<template>
  <div class="simulation-container">
    <h2>📡 Gerçekçi GPS Simülasyon Paneli</h2>
    <p class="desc">Veritabanındaki merkezler arasından seçim yapıp, OSRM (Leaflet Altyapısı) üzerinden gerçek yol haritasını çekerek sahte GPS verisi üretir.</p>

    <div class="card">
      <h3>Bağlam (Context)</h3>
      <div class="input-row">
        <label>Kurye ID:</label>
        <input type="number" v-model="courierId" />
      </div>
      <div class="input-row">
        <label>Sefer (Tour/Journey) ID:</label>
        <input type="number" v-model="journeyId" />
      </div>
    </div>

    <div class="card">
      <h3>Gerçekçi Güzergah Seçimi</h3>
      <div class="input-row">
        <label>Başlangıç Merkezi:</label>
        <select v-model="startLocation">
          <option value="" disabled>Lütfen Merkez Seçin...</option>
          <option v-for="loc in locations" :key="'s-'+loc.id" :value="loc">
            {{ loc.name }}
          </option>
        </select>
      </div>
      <div class="input-row">
        <label>Bitiş Merkezi:</label>
        <select v-model="endLocation">
          <option value="" disabled>Lütfen Merkez Seçin...</option>
          <option v-for="loc in locations" :key="'e-'+loc.id" :value="loc" :disabled="startLocation && loc.id === startLocation.id">
            {{ loc.name }}
          </option>
        </select>
      </div>
      
      <div class="input-row">
        <label>Hız (Nokta/Saniye):</label>
        <select v-model="intervalMs">
          <option :value="2000">Yavaş (2 saniyede 1 nokta)</option>
          <option :value="1000">Normal (Saniyede 1 nokta)</option>
          <option :value="500">Hızlı (Saniyede 2 nokta)</option>
          <option :value="100">Çok Hızlı (Saniyede 10 nokta)</option>
        </select>
      </div>
      
      <div class="actions">
        <button @click="startSimulation" :disabled="isSimulating || !startLocation || !endLocation" class="btn success">Simülasyonu Başlat</button>
        <button @click="stopSimulation" :disabled="!isSimulating" class="btn danger">Durdur</button>
      </div>
    </div>

    <div class="log-card">
      <h3>Loglar ({{ currentStep }}/{{ totalSteps }})</h3>
      <div class="progress-bar" v-if="totalSteps > 0">
        <div class="progress-fill" :style="{ width: (currentStep / totalSteps * 100) + '%' }"></div>
      </div>
      <div class="log-box">
        <div v-for="(log, idx) in logs" :key="idx" class="log-item">
          {{ log }}
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { telemetry } from '../services/telemetryServices';
import { dataService } from '../services/dataService';

export default {
  name: 'SimulationPanel',
  data() {
    return {
      locations: [],
      startLocation: '',
      endLocation: '',
      
      courierId: 1,
      journeyId: 999,
      intervalMs: 1000,
      
      isSimulating: false,
      currentStep: 0,
      totalSteps: 0,
      timer: null,
      logs: [],
      routeCoordinates: [] // OSRM'den gelecek gerçek yol koordinatları
    }
  },
  async mounted() {
    try {
      this.locations = await dataService.getLocations();
      this.addLog("Veritabanından lokasyonlar başarıyla çekildi.");
    } catch (error) {
      this.addLog("HATA: Lokasyonlar çekilemedi!");
    }
  },
  methods: {
    addLog(msg) {
      this.logs.unshift(`[${new Date().toLocaleTimeString()}] ${msg}`);
      if(this.logs.length > 100) this.logs.pop();
    },
    async startSimulation() {
      if(!this.startLocation || !this.endLocation) return;
      
      this.isSimulating = true;
      this.currentStep = 0;
      this.routeCoordinates = [];
      this.logs = []; // Temizle
      
      // 1. Context Ayarla
      telemetry.setContext(this.courierId, this.journeyId);
      this.addLog(`Context ayarlandı: Kurye ${this.courierId}, Sefer ${this.journeyId}`);
      this.addLog("OSRM'den gerçek rota hesaplanıyor...");

      // 2. OSRM API'sinden Gerçek Yol Koordinatlarını Çek
      try {
        const startLng = this.startLocation.longitude || this.startLocation.lng;
        const startLat = this.startLocation.latitude || this.startLocation.lat;
        const endLng = this.endLocation.longitude || this.endLocation.lng;
        const endLat = this.endLocation.latitude || this.endLocation.lat;
        
        const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`;
        
        const response = await fetch(osrmUrl);
        const data = await response.json();
        
        if (data.code !== "Ok" || !data.routes || data.routes.length === 0) {
          throw new Error("OSRM Rota bulamadı.");
        }

        // OSRM GeoJSON formatında [Lng, Lat] döner
        this.routeCoordinates = data.routes[0].geometry.coordinates;
        this.totalSteps = this.routeCoordinates.length;
        
        this.addLog(`Rota başarıyla bulundu! Toplam ${this.totalSteps} kırılım noktası var.`);
        this.addLog("Simülasyon başlıyor...");
        
        // 3. Simülasyon Döngüsünü Başlat
        this.runSimulationLoop();

      } catch (error) {
        this.addLog("HATA: Rota alınamadı. " + error.message);
        this.isSimulating = false;
      }
    },
    runSimulationLoop() {
      this.timer = setInterval(() => {
        if (this.currentStep >= this.totalSteps) {
          this.stopSimulation();
          this.addLog("🏁 Hedefe ulaşıldı. Simülasyon bitti.");
          return;
        }

        const point = this.routeCoordinates[this.currentStep];
        const currentLng = point[0];
        const currentLat = point[1];
        
        // telemetry.addCoordinate(lat, lng, isFromMockProvider)
        // Ana sisteme hiçbir yan etkisi yoktur, sadece havuzuna sahte veri atar.
        telemetry.addCoordinate(currentLat, currentLng, true);
        this.addLog(`Konum yollanıyor: ${currentLat.toFixed(5)}, ${currentLng.toFixed(5)}`);
        
        this.currentStep++;
      }, this.intervalMs);
    },
    stopSimulation() {
      if(this.timer) {
        clearInterval(this.timer);
        this.timer = null;
      }
      this.isSimulating = false;
      this.addLog("Simülasyon durduruldu.");
    }
  },
  unmounted() {
    this.stopSimulation();
  }
}
</script>

<style scoped>
.simulation-container {
  padding: 20px;
  max-width: 600px;
  margin: 0 auto;
  font-family: Arial, sans-serif;
  color: #333;
}
h2 { color: #2196F3; margin-bottom: 5px; }
.desc { color: #666; margin-bottom: 20px; font-size: 14px; }
.card, .log-card {
  background: #f9f9f9;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 20px;
}
.input-row {
  display: flex;
  margin-bottom: 15px;
  align-items: center;
}
.input-row label {
  width: 150px;
  font-weight: bold;
}
.input-row input, .input-row select {
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  flex: 1;
}
.btn {
  padding: 12px 15px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
  color: white;
  flex: 1;
}
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
.primary { background-color: #2196F3; }
.success { background-color: #4CAF50; }
.danger { background-color: #f44336; }
.actions { display: flex; gap: 10px; margin-top: 15px; }

.progress-bar {
  width: 100%;
  height: 10px;
  background: #eee;
  border-radius: 5px;
  margin-bottom: 10px;
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  background: #4CAF50;
  transition: width 0.3s;
}

.log-box {
  background: #1e1e1e;
  color: #00ff00;
  font-family: monospace;
  padding: 10px;
  height: 250px;
  overflow-y: auto;
  border-radius: 4px;
  font-size: 12px;
}
.log-item { border-bottom: 1px dashed #333; padding: 4px 0; }
</style>
