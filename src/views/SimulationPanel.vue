<template>
  <div class="simulation-container">
    <h2>📡 GPS Simülasyon Paneli (Yazılım Ekibi)</h2>
    <p class="desc">İki nokta arasında sahte GPS verisi üretip sisteme gönderir.</p>

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
      <button @click="setContext" class="btn primary">Bağlamı Tanımla</button>
    </div>

    <div class="card">
      <h3>Güzergah</h3>
      <div class="input-row">
        <label>Başlangıç (Lat, Lng):</label>
        <input type="number" step="0.0001" v-model="startLat" placeholder="Enlem" />
        <input type="number" step="0.0001" v-model="startLng" placeholder="Boylam" />
      </div>
      <div class="input-row">
        <label>Bitiş (Lat, Lng):</label>
        <input type="number" step="0.0001" v-model="endLat" placeholder="Enlem" />
        <input type="number" step="0.0001" v-model="endLng" placeholder="Boylam" />
      </div>
      <div class="input-row">
        <label>Adım Sayısı (Çözünürlük):</label>
        <input type="number" v-model="steps" />
      </div>
      <div class="input-row">
        <label>Gönderim Hızı (ms):</label>
        <input type="number" v-model="intervalMs" />
      </div>
      
      <div class="actions">
        <button @click="startSimulation" :disabled="isSimulating" class="btn success">Simülasyonu Başlat</button>
        <button @click="stopSimulation" :disabled="!isSimulating" class="btn danger">Durdur</button>
      </div>
    </div>

    <div class="log-card">
      <h3>Loglar ({{ currentStep }}/{{ steps }})</h3>
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

export default {
  name: 'SimulationPanel',
  data() {
    return {
      courierId: 1,
      journeyId: 999,
      // Default: Kızılay'dan Çankaya'ya yaklaşık koordinatlar
      startLat: 39.9208,
      startLng: 32.8541,
      endLat: 39.8900,
      endLng: 32.8600,
      steps: 20,
      intervalMs: 1000,
      
      isSimulating: false,
      currentStep: 0,
      timer: null,
      logs: []
    }
  },
  methods: {
    addLog(msg) {
      this.logs.unshift(`[${new Date().toLocaleTimeString()}] ${msg}`);
      if(this.logs.length > 50) this.logs.pop();
    },
    setContext() {
      telemetry.setContext(this.courierId, this.journeyId);
      this.addLog(`Context ayarlandı: Kurye ${this.courierId}, Sefer ${this.journeyId}`);
    },
    startSimulation() {
      if(!this.startLat || !this.startLng || !this.endLat || !this.endLng) {
        alert("Lütfen tüm koordinatları girin!");
        return;
      }
      this.setContext();
      this.isSimulating = true;
      this.currentStep = 0;
      this.addLog("Simülasyon başlatıldı...");
      
      // İnterpolasyon adımlarını hesapla
      const latStep = (this.endLat - this.startLat) / this.steps;
      const lngStep = (this.endLng - this.startLng) / this.steps;

      this.timer = setInterval(() => {
        if (this.currentStep >= this.steps) {
          this.stopSimulation();
          this.addLog("Hedefe ulaşıldı. Simülasyon bitti.");
          return;
        }

        const currentLat = parseFloat(this.startLat) + (latStep * this.currentStep);
        const currentLng = parseFloat(this.startLng) + (lngStep * this.currentStep);
        
        // true = isFromMockProvider
        telemetry.addCoordinate(currentLat, currentLng, true);
        this.addLog(`Konum üretildi: ${currentLat.toFixed(5)}, ${currentLng.toFixed(5)}`);
        
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
h2 { color: #2196F3; }
.desc { color: #666; margin-bottom: 20px; }
.card, .log-card {
  background: #f9f9f9;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 20px;
}
.input-row {
  display: flex;
  margin-bottom: 10px;
  align-items: center;
}
.input-row label {
  width: 150px;
  font-weight: bold;
}
.input-row input {
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  margin-right: 10px;
  flex: 1;
}
.btn {
  padding: 10px 15px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
  color: white;
}
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
.primary { background-color: #2196F3; }
.success { background-color: #4CAF50; }
.danger { background-color: #f44336; }
.actions { display: flex; gap: 10px; margin-top: 15px; }
.log-box {
  background: #1e1e1e;
  color: #00ff00;
  font-family: monospace;
  padding: 10px;
  height: 200px;
  overflow-y: auto;
  border-radius: 4px;
  font-size: 12px;
}
.log-item { border-bottom: 1px dashed #333; padding: 4px 0; }
</style>
