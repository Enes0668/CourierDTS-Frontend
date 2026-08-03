<template>
  <div class="simulation-container">
    <h2>📡 Gerçekçi GPS Simülasyon Paneli</h2>
    <p class="desc">Veritabanındaki merkezler arasından seçim yapıp, OSRM (Leaflet Altyapısı) üzerinden gerçek yol haritasını çekerek sahte GPS verisi üretir.</p>

    <div class="card">
      <h3>🌍 Global Simülasyon Ayarları</h3>
      
      <div class="input-row" style="margin-bottom: 20px;">
        <label>Simülasyon Modu:</label>
        <button 
          @click="toggleSimulationMode" 
          class="btn" 
          :class="isGlobalSimulationOn ? 'success' : 'danger'"
          style="flex:none; padding: 10px 20px;"
        >
          {{ isGlobalSimulationOn ? 'AÇIK (Kurye sahte GPS dinliyor)' : 'KAPALI (Gerçek donanım)' }}
        </button>
      </div>

      <div class="input-row">
        <label>Başlangıca Işınla:</label>
        <select v-model="teleportLocation" style="flex: 2;">
          <option value="" disabled>Lütfen Merkez Seçin...</option>
          <option v-for="loc in locations" :key="'t-'+loc.id" :value="loc">
            {{ loc.name }}
          </option>
        </select>
        <button @click="teleportCourier" :disabled="!teleportLocation" class="btn primary" style="flex: 1; margin-left: 10px;">
          Işınla 🚀
        </button>
      </div>
      <p style="font-size: 12px; color: #666; margin-left: 160px; margin-top: -10px;">
        Seçilen merkezin koordinatlarını doğrudan LocalStorage'a yazar.
      </p>
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
        <label>Hız Çarpanı ({{ speedMultiplier }}x):</label>
        <div style="flex: 1; display: flex; align-items: center; gap: 10px;">
          <input type="range" min="1" max="100" v-model.number="speedMultiplier" style="flex: 1;" />
          <input type="number" min="1" max="500" v-model.number="speedMultiplier" style="width: 70px; flex: none;" />
        </div>
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
import { dataService } from '../services/dataService';

export default {
  name: 'SimulationPanel',
  data() {
    return {
      locations: [],
      startLocation: '',
      endLocation: '',
      
      isGlobalSimulationOn: localStorage.getItem('SIMULATION_MODE') === 'true',
      teleportLocation: '',
      speedMultiplier: 1,
      
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
  computed: {
    intervalMs() {
      // 1x = 1000ms (saniyede 1 nokta)
      // 100x = 10ms
      return Math.max(10, 1000 / this.speedMultiplier);
    }
  },
  watch: {
    speedMultiplier(newVal) {
      if (this.isSimulating) {
        this.addLog(`Hız çarpanı anlık olarak değiştirildi: ${newVal}x`);
        clearInterval(this.timer);
        this.runSimulationLoop();
      }
    }
  },
  methods: {
    toggleSimulationMode() {
      this.isGlobalSimulationOn = !this.isGlobalSimulationOn;
      localStorage.setItem('SIMULATION_MODE', this.isGlobalSimulationOn.toString());
      this.addLog(`Global Simülasyon Modu: ${this.isGlobalSimulationOn ? 'AÇIK' : 'KAPALI'}`);
    },
    teleportCourier() {
      if (this.teleportLocation) {
        const lat = this.teleportLocation.latitude || this.teleportLocation.lat;
        const lng = this.teleportLocation.longitude || this.teleportLocation.lng;
        localStorage.setItem('SIMULATED_LOCATION', JSON.stringify({ lat, lng }));
        this.addLog(`${this.teleportLocation.name} konumuna ışınlandı.`);
        alert("Başlangıç konumu ayarlandı! Kurye ekranı bu konumu okuyacaktır.");
      }
    },
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
        
        // Kurye ekranı (gpsProvider) buradan okuyacak
        localStorage.setItem('SIMULATED_LOCATION', JSON.stringify({ lat: currentLat, lng: currentLng }));
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
