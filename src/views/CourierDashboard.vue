<template>
  <div class="courier-container">
    <div class="header">
      <div class="header-left">
        <h2>Kurye Paneli</h2>
        
        <div class="vehicle-select" v-if="!isDeliveryStarted">
          <select v-model="activeVehicleId" @change="updateVehicle">
            <option value="" disabled>Araç Seçin</option>
            <option v-for="v in vehicles" :key="v.id" :value="v.id">{{ v.plateNumber }} - {{ v.vehicleType }}</option>
          </select>
        </div>


      </div>
      <button @click="logout" class="logout-btn">Çıkış Yap</button>
    </div>

    <!-- Modals for Location Actions -->
    <div v-if="showPickupModal" class="modal-overlay">
      <div class="modal-content">
        <h3>📦 Teslim Alınacaklar</h3>
        <p class="subtitle">{{ selectedNextStop?.name }}</p>
        
        <button @click="simulateScan('pickup')" class="action-btn scan-btn-global" style="margin-bottom:15px; background-color:#2196F3;">📷 Genel Barkod Okut</button>

        <div v-if="packagesToPickup.length === 0" class="no-data">Bu duraktan alınacak paket kalmadı.</div>
        <CourierPackageCard
          v-for="pkg in packagesToPickup"
          :key="pkg.id"
          :pkg="pkg"
          :isModal="true"
          :selected="selectedPickupPackages.includes(pkg.id)"
          @toggle="togglePickupSelection"
        />
        
        <textarea v-model="actionNotes" placeholder="İşlem notu ekleyin... (Opsiyonel)" class="note-input"></textarea>
        
        <div style="display:flex; gap:10px;">
          <button @click="closeModals" class="close-btn" style="flex:1;">İptal</button>
          <button @click="processSelectedPickups" class="action-btn pickup" style="flex:2;" :disabled="selectedPickupPackages.length === 0">Seçilenleri Teslim Al ({{ selectedPickupPackages.length }})</button>
        </div>
      </div>
    </div>

    <div v-if="showDropoffModal" class="modal-overlay">
      <div class="modal-content">
        <h3>✅ Teslim Edilecekler</h3>
        <p class="subtitle">{{ selectedNextStop?.name }}</p>

        <button @click="simulateScan('dropoff')" class="action-btn scan-btn-global" style="margin-bottom:15px; background-color:#4CAF50;">📷 Genel Barkod Okut</button>

        <div v-if="packagesToDropoff.length === 0" class="no-data">Bu durağa verilecek paket kalmadı.</div>
        <CourierPackageCard
          v-for="pkg in packagesToDropoff"
          :key="pkg.id"
          :pkg="pkg"
          :isModal="true"
          :selected="selectedDropoffPackages.includes(pkg.id)"
          @toggle="toggleDropoffSelection"
        />
        
        <textarea v-model="actionNotes" placeholder="İşlem notu ekleyin... (Opsiyonel)" class="note-input"></textarea>
        
        <div style="display:flex; gap:10px;">
          <button @click="closeModals" class="close-btn" style="flex:1;">İptal</button>
          <button @click="processSelectedDropoffs" class="action-btn dropoff" style="flex:2;" :disabled="selectedDropoffPackages.length === 0">Seçilenleri Teslim Et ({{ selectedDropoffPackages.length }})</button>
        </div>
      </div>
    </div>

    <!-- Journey Selection & Lists -->
    <div class="content" v-if="!isDeliveryStarted">
      <div class="selection-card">
        <h3 class="selection-title">📍 Sonraki Durak</h3>
        <p class="current-loc">Mevcut Konum: <strong>{{ currentLocation?.name }}</strong></p>
        <div class="input-group">
          <select id="next-stop" v-model="selectedNextStop">
            <option value="" disabled>Gidilecek Konumu Seçin...</option>
            <option v-for="loc in availableNextStops" :key="loc.id" :value="loc">
              {{ loc.name }}
            </option>
          </select>
        </div>
        <button 
          @click="startJourney" 
          class="scan-btn"
          :disabled="!selectedNextStop || !activeVehicleId"
        >
          {{ !activeVehicleId ? 'Araç Seçmelisiniz' : '🏍️ Yola Çık' }}
        </button>
      </div>

      <!-- Package Lists -->
      <div class="package-lists">
        <div class="list-section">
          <h3>🎒 Üzerimdeki Paketler ({{ myPackages.length }})</h3>
          <div v-if="myPackages.length === 0" class="no-data">Üzerinizde paket yok.</div>
          <CourierPackageCard
            v-for="pkg in myPackages"
            :key="pkg.id"
            :pkg="pkg"
            type="my"
            :targetName="getLocationName(pkg.dropoffLocId)"
            :showUndo="currentLocation && pkg.pickupLocId === currentLocation.id"
            @undo="undoPickup"
          />
        </div>

        <div class="list-section">
          <h3>📥 Bekleyen / Teslim Alınacak ({{ pendingPackages.length }})</h3>
          <div v-if="pendingPackages.length === 0" class="no-data">Bekleyen atama yok.</div>
          <CourierPackageCard
            v-for="pkg in pendingPackages"
            :key="pkg.id"
            :pkg="pkg"
            type="pending"
            :pickupName="getLocationName(pkg.pickupLocId)"
            :targetName="getLocationName(pkg.dropoffLocId)"
          />
        </div>
      </div>
    </div>

    <!-- Active Delivery / Map -->
    <div v-else class="active-delivery-section">
      <div class="status-card">
        <h3>🏍️ Yoldayım -> {{ selectedNextStop?.name }}</h3>
        <p v-if="isOffline" class="offline-warning">
          ⚠️ İnternet Yok. Veriler cihazda bekletiliyor.
        </p>

        <!-- Actions at Stop -->
        <div v-if="isDelivered" class="stop-actions">
          <h4 class="arrived-text">📍 Durağa Varıldı</h4>
          <div class="action-buttons">
            <button class="pickup-btn" @click="showPickupModal = true">📦 Paket Al ({{ packagesToPickup.length }})</button>
            <button class="dropoff-btn" @click="showDropoffModal = true">✅ Teslim Et ({{ packagesToDropoff.length }})</button>
          </div>
          <button class="finish-btn" @click="endJourneyAtStop">İşlemleri Bitir & Yeni Rota Seç</button>
        </div>
      </div>
      
      <div class="map-container">
        <MapView :route="routeData" :courierPosition="mockPosition" />
      </div>

      <div class="action-area" style="width: 100%;">
        <button 
          v-if="isNearTarget && !isDelivered && !showConfirmation" 
          class="skip-btn" 
          @click="markAsArrived"
        >
          📍 Hedefe Ulaştım
        </button>

        <button 
          v-if="!showConfirmation"
          class="cancel-btn" 
          @click="showConfirmation = true"
        >
          Rotayı İptal Et (Vazgeç)
        </button>

        <div v-if="showConfirmation" class="confirmation-dialog">
          <span class="confirm-text">Bu rotaya gitmekten vazgeçiyor musunuz?</span>
          <textarea v-model="actionNotes" placeholder="İptal sebebi..." class="note-input"></textarea>
          <div class="confirm-actions">
            <button class="btn-no" @click="handleCancelChoice(false)">Hayır, Devam</button>
            <button class="btn-yes" @click="handleCancelChoice(true)">Evet, İptal Et</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import MapView from '../components/MapView.vue';
import CourierPackageCard from '../components/courier/CourierPackageCard.vue';
import { dataService } from '../services/dataService';
import { telemetry } from '../services/telemetryServices';
import { actionQueue } from '../services/actionQueueService';
import { toast } from '../services/toast';
import { gpsProvider } from '../services/gpsProvider';

export default {
  name: 'CourierDashboard',
  components: { MapView, CourierPackageCard },
  data() {
    return {
      locations: [],
      packages: [],
      currentLocation: null,
      selectedNextStop: '',
      isDeliveryStarted: false,
      isShiftActive: true, // Always active
      isOffline: !navigator.onLine,
      routeData: null,
      mockPosition: null,
      showConfirmation: false,
      isDelivered: false,
      isNearTarget: false,
      
      showPickupModal: false,
      showDropoffModal: false,
      actionNotes: "",
      selectedPickupPackages: [],
      selectedDropoffPackages: [],
      currentJourneyId: null,
      vehicles: [],
      activeVehicleId: '',
      gpsWatcherId: null
    }
  },
  computed: {
    myPackages() {
      return this.packages.filter(p => p.status === 'InTransit').sort((a, b) => b.priority - a.priority);
    },
    pendingPackages() {
      return this.packages.filter(p => p.status === 'Pending').sort((a, b) => b.priority - a.priority);
    },
    packagesToPickup() {
      if(!this.selectedNextStop) return [];
      return this.pendingPackages.filter(p => p.pickupLocId === this.selectedNextStop.id);
    },
    packagesToDropoff() {
      if(!this.selectedNextStop) return [];
      return this.myPackages.filter(p => p.dropoffLocId === this.selectedNextStop.id);
    },
    availableNextStops() {
      const targetLocationIds = new Set();
      this.pendingPackages.forEach(pkg => targetLocationIds.add(pkg.pickupLocId));
      this.myPackages.forEach(pkg => targetLocationIds.add(pkg.dropoffLocId));
      
      return this.locations.filter(loc => 
        loc.id !== this.currentLocation?.id && targetLocationIds.has(loc.id)
      );
    }
  },
  async mounted() {
    try {
      const courierId = localStorage.getItem('courier_id') || 1;
      this.vehicles = await dataService.getCourierVehicles(courierId);
    } catch(e) { console.warn("Vehicles fetch failed", e); }

    try {
      this.locations = await dataService.getLocations();
      // Kuryenin konumunu ilk açılışta körü körüne 0. elemana atamıyoruz.
      // GPS'ten (startGpsTracking) konum geldiğinde en yakın merkez atanacak.
      this.currentLocation = null;
    } catch(e) { console.warn("Locations failed", e); }
    
    try {
      const courierId = localStorage.getItem('courier_id') || 1;
      this.packages = await dataService.getMyPackages(courierId);
    } catch(e) { console.warn("Packages failed", e); }
    
    try {
      window.addEventListener('offline', this.updateOnlineStatus);
      window.addEventListener('online', this.updateOnlineStatus);
      window.addEventListener('telemetry_arrived', this.handleTelemetryArrived);
      
      // Uygulama açılır açılmaz GPS takibini başlat ki
      // Başlangıç konumu null iken GPS'ten (autoDetectInitialLocation) bulunsun.
      this.startGpsTracking();
    } catch(e) { console.warn(e); }
  },
  beforeUnmount() {
    window.removeEventListener('offline', this.updateOnlineStatus);
    window.removeEventListener('online', this.updateOnlineStatus);
    window.removeEventListener('telemetry_arrived', this.handleTelemetryArrived);
    this.stopGpsTracking();
  },
  methods: {
    updateOnlineStatus() {
      this.isOffline = !navigator.onLine;
    },
    async toggleShift() {
      try {
        const courierId = localStorage.getItem('courier_id') || 1;
        await dataService.setCourierActive(courierId, this.isShiftActive);
        toast.success(this.isShiftActive ? 'Vardiya başlatıldı.' : 'Vardiya kapatıldı.');
      } catch (error) {
        this.isShiftActive = !this.isShiftActive; // revert on fail
        toast.error('Vardiya durumu güncellenemedi.');
      }
    },
    getLocationName(id) {
      const loc = this.locations.find(l => l.id === id);
      return loc ? loc.name : 'Bilinmeyen Konum';
    },
    async updateVehicle() {
      try {
        const courierId = localStorage.getItem('courier_id') || 1;
        await dataService.setCourierActiveVehicle(courierId, this.activeVehicleId);
        toast.info("Aktif aracınız güncellendi.");
      } catch (e) {
        console.error(e);
        toast.error("Araç güncellenirken hata oluştu.");
      }
    },
    handleTelemetryArrived() {
      if (this.isDeliveryStarted && !this.isDelivered) {
        this.isNearTarget = true;
      }
    },
    calculateDistance(lat1, lon1, lat2, lon2) {
      const R = 6371e3; // meters
      const phi1 = lat1 * Math.PI / 180;
      const phi2 = lat2 * Math.PI / 180;
      const deltaPhi = (lat2 - lat1) * Math.PI / 180;
      const deltaLambda = (lon2 - lon1) * Math.PI / 180;

      const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
                Math.cos(phi1) * Math.cos(phi2) *
                Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

      return R * c;
    },
    autoDetectInitialLocation(lat, lng) {
      if (this.currentLocation || this.locations.length === 0) return;
      
      let closestLoc = null;
      let minDistance = Infinity;
      
      for (const loc of this.locations) {
        const locLat = loc.latitude || loc.lat;
        const locLng = loc.longitude || loc.lng;
        
        if (locLat && locLng) {
          const dist = this.calculateDistance(lat, lng, locLat, locLng);
          if (dist < minDistance) {
            minDistance = dist;
            closestLoc = loc;
          }
        }
      }
      
      if (closestLoc && minDistance < 5000) { // 5km içindeyse eşleştir
        this.currentLocation = closestLoc;
        toast.info(`Başlangıç noktanız GPS ile belirlendi: ${closestLoc.name}`);
      }
    },
    startGpsTracking() {
      this.gpsWatcherId = gpsProvider.watchPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          this.mockPosition = { lat, lng };
          
          if (!this.currentLocation && !this.isDeliveryStarted) {
            this.autoDetectInitialLocation(lat, lng);
          }
          
          // Pass coordinate to Telemetry Service which buffers and sends it
          telemetry.addCoordinate(lat, lng, false);
        },
        (error) => console.warn("GPS Hatası:", error),
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
      );
      
      if (!this.gpsWatcherId && !gpsProvider.isSimulating) {
        toast.error("Cihazınız GPS desteklemiyor veya konum alınamadı!");
      }
    },
    stopGpsTracking() {
      if (this.gpsWatcherId !== null) {
        gpsProvider.clearWatch(this.gpsWatcherId);
        this.gpsWatcherId = null;
      }
    },
    undoPickup(pkg) {
      if (confirm(`"${pkg.barcode}" numaralı paketi geri bırakmak istediğinize emin misiniz?`)) {
        pkg.status = 'Pending';
        const courierId = localStorage.getItem('courier_id') || 5;
        actionQueue.queueAction({
          packageId: pkg.id,
          locationId: this.currentLocation.id,
          latitude: this.mockPosition ? this.mockPosition.lat : 0,
          longitude: this.mockPosition ? this.mockPosition.lng : 0,
          actionType: 'Cancelled',
          actionTime: new Date().toISOString(),
          notes: 'Kurye yanlış alımı iptal etti.'
        }, courierId, this.currentJourneyId);
        toast.info("Paket geri bırakıldı.");
      }
    },
    async startJourney() {
      if (!this.currentLocation || !this.selectedNextStop) {
        toast.error("Yolculuk başlatılamadı: Konum bilgisi eksik.");
        return;
      }

      try {
        this.isDeliveryStarted = true;
        this.isDelivered = false;
        this.showConfirmation = false;
        
        const courierId = localStorage.getItem('courier_id') || 1;
        
        let coordinates = [];
        let plannedDistanceMeters = 0;
        let startLng, startLat, endLng, endLat;

        try {
          startLng = this.currentLocation.longitude || this.currentLocation.lng;
          startLat = this.currentLocation.latitude || this.currentLocation.lat;
          endLng = this.selectedNextStop.longitude || this.selectedNextStop.lng;
          endLat = this.selectedNextStop.latitude || this.selectedNextStop.lat;
          
          const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`;
          const res = await fetch(osrmUrl);
          const data = await res.json();
          
          if(data.routes && data.routes.length > 0) {
              coordinates = data.routes[0].geometry.coordinates.map(c => ({ lat: c[1], lng: c[0] }));
              plannedDistanceMeters = data.routes[0].distance || 0;
          }
        } catch(e) {
          console.warn("OSRM rotası alınamadı.", e);
        }

        try {
          const payload = {
            courierId: parseInt(courierId),
            endLocationId: this.selectedNextStop.id,
            materialIds: this.myPackages.map(p => p.id || p.Id).filter(id => id != null),
            plannedPath: coordinates,
            plannedDistanceMeters: plannedDistanceMeters
          };
          const resp = await dataService.startJourney(payload);
          this.currentJourneyId = resp.journeyId;
        } catch (e) {
          console.warn("API ulaşılamadı, mock JourneyId üretiliyor.");
          this.currentJourneyId = Math.floor(Math.random() * 1000);
        }
        
        telemetry.setContext(courierId, this.currentJourneyId);
        telemetry.startDelivery(this.currentLocation.name, this.selectedNextStop.name, plannedDistanceMeters, coordinates);

        try {
          
          // OSRM verisi geldikten sonra routeData'yı TEK SEFERDE atıyoruz.
          // Bu sayede MapView içindeki "watch" mekanizması tetiklenir.
          this.routeData = {
            start: {
              ...this.currentLocation,
              lat: startLat,
              lng: startLng
            },
            end: {
              ...this.selectedNextStop,
              lat: endLat,
              lng: endLng
            },
            coordinates: coordinates
          };
          
        } catch(e) { 
          console.error("OSRM Hatası", e); 
          // Hata durumunda boş çizgi atayalım ki harita çökmesin
          this.routeData = {
            start: { lat: this.currentLocation.latitude || this.currentLocation.lat, lng: this.currentLocation.longitude || this.currentLocation.lng },
            end: { lat: this.selectedNextStop.latitude || this.selectedNextStop.lat, lng: this.selectedNextStop.longitude || this.selectedNextStop.lng },
            coordinates: []
          };
        }
        
        // Kuryeyi başlangıç noktasına yerleştir
        this.mockPosition = { 
          lat: this.currentLocation.latitude || this.currentLocation.lat, 
          lng: this.currentLocation.longitude || this.currentLocation.lng 
        };

      } catch (error) {
        console.error("API Hatası:", error);
        toast.error("Sistemsel bir hata oluştu.");
      }
    },
    markAsArrived() {
      this.isDelivered = true;
      telemetry.courierArrived();
      toast.success("Hedefe ulaşıldı!");
    },
    closeModals() {
      this.showPickupModal = false;
      this.showDropoffModal = false;
      this.actionNotes = "";
      this.selectedPickupPackages = [];
      this.selectedDropoffPackages = [];
    },
    simulateScan(type) {
      // Simülasyon: Kameradan okunan barkodun listedeki ilk seçilmemiş paketi seçmesi
      const list = type === 'pickup' ? this.packagesToPickup : this.packagesToDropoff;
      const selected = type === 'pickup' ? this.selectedPickupPackages : this.selectedDropoffPackages;
      
      const unselected = list.find(p => !selected.includes(p.id));
      if (unselected) {
        selected.push(unselected.id);
        toast.success(`Kamera ile Okundu: ${unselected.barcode}`);
      } else {
        toast.error("Okunacak/Seçilecek paket kalmadı!");
      }
    },
    togglePickupSelection(packageId, isSelected) {
      if (isSelected) {
        if (!this.selectedPickupPackages.includes(packageId)) {
          this.selectedPickupPackages.push(packageId);
        }
      } else {
        this.selectedPickupPackages = this.selectedPickupPackages.filter(id => id !== packageId);
      }
    },
    toggleDropoffSelection(packageId, isSelected) {
      if (isSelected) {
        if (!this.selectedDropoffPackages.includes(packageId)) {
          this.selectedDropoffPackages.push(packageId);
        }
      } else {
        this.selectedDropoffPackages = this.selectedDropoffPackages.filter(id => id !== packageId);
      }
    },
    processSelectedPickups() {
      const courierId = localStorage.getItem('courier_id') || 5;
      const lat = this.mockPosition ? this.mockPosition.lat : 0;
      const lng = this.mockPosition ? this.mockPosition.lng : 0;
      
      this.selectedPickupPackages.forEach(pkgId => {
        const pkg = this.packages.find(p => p.id === pkgId);
        if(pkg) {
          pkg.status = 'InTransit';
          actionQueue.queueAction({
            packageId: pkg.id,
            locationId: this.currentLocation.id,
            latitude: lat,
            longitude: lng,
            actionType: 'PickedUp',
            actionTime: new Date().toISOString(),
            notes: this.actionNotes
          }, courierId, this.currentJourneyId);
        }
      });
      this.closeModals();
    },
    processSelectedDropoffs() {
      const courierId = localStorage.getItem('courier_id') || 5;
      const lat = this.mockPosition ? this.mockPosition.lat : 0;
      const lng = this.mockPosition ? this.mockPosition.lng : 0;
      
      this.selectedDropoffPackages.forEach(pkgId => {
        const pkg = this.packages.find(p => p.id === pkgId);
        if(pkg) {
          pkg.status = 'Delivered';
          actionQueue.queueAction({
            packageId: pkg.id,
            locationId: this.currentLocation.id,
            latitude: lat,
            longitude: lng,
            actionType: 'Delivered',
            actionTime: new Date().toISOString(),
            notes: this.actionNotes
          }, courierId, this.currentJourneyId);
        }
      });
      this.closeModals();
    },
    async endJourneyAtStop() {
      try {
        if (this.currentJourneyId) {
          await dataService.completeJourney(this.currentJourneyId);
        }
        
        telemetry.completeDelivery(0);
        this.stopGpsTracking();
        
        // Update current location to where we just arrived
        this.currentLocation = this.selectedNextStop;
        this.resetJourneyState();
      } catch (error) {
        toast.error("İşlem reddedildi. Üzerinizde bu durağa ait teslim edilmemiş paket olabilir.");
      }
    },
    async handleCancelChoice(isConfirmed) {
      if (isConfirmed) {
        try {
          if (this.currentJourneyId) {
            await dataService.cancelJourney(this.currentJourneyId);
          }
          telemetry.cancelDelivery(`Rota İptal: ${this.actionNotes}`, 0);
          this.stopGpsTracking();
          this.resetJourneyState();
        } catch (error) {
          toast.error("İptal işlemi başarısız oldu. Lütfen tekrar deneyin.");
        }
      } else {
        this.showConfirmation = false;
      }
    },
    resetJourneyState() {
      this.isDeliveryStarted = false;
      this.routeData = null;
      this.mockPosition = null;
      this.selectedNextStop = '';
      this.actionNotes = "";
      this.isNearTarget = false;
    },
    logout() {
      localStorage.clear();
      this.$router.push({ name: 'login' });
    }
  }
}
</script>

<style scoped>
.courier-container {
  padding: 15px;
  background-color: #121212;
  color: #fff;
  min-height: 100vh;
}
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  border-bottom: 1px solid #333;
  padding-bottom: 10px;
}
.header-left {
  display: flex;
  align-items: center;
  gap: 20px;
}
.header h2 {
  margin: 0;
}
.shift-toggle {
  display: flex;
  align-items: center;
  gap: 10px;
}
.vehicle-select select {
  background: #222;
  color: white;
  border: 1px solid #444;
  padding: 8px;
  border-radius: 4px;
}
.active-text {
  color: #4CAF50;
  font-weight: bold;
}
/* The switch - the box around the slider */
.switch {
  position: relative;
  display: inline-block;
  width: 50px;
  height: 24px;
}
.switch input { 
  opacity: 0;
  width: 0;
  height: 0;
}
.slider {
  position: absolute;
  cursor: pointer;
  top: 0; left: 0; right: 0; bottom: 0;
  background-color: #f44336;
  transition: .4s;
}
.slider:before {
  position: absolute;
  content: "";
  height: 16px;
  width: 16px;
  left: 4px;
  bottom: 4px;
  background-color: white;
  transition: .4s;
}
input:checked + .slider {
  background-color: #4CAF50;
}
input:checked + .slider:before {
  transform: translateX(26px);
}
.slider.round {
  border-radius: 24px;
}
.slider.round:before {
  border-radius: 50%;
}

.logout-btn {
  background-color: transparent;
  color: #ff5252;
  border: 1px solid #ff5252;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
}
.content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.selection-card {
  background: rgba(30, 30, 30, 0.8);
  padding: 20px;
  border-radius: 12px;
  border: 1px solid #333;
  width: 100%;
}
.selection-title {
  margin-top: 0;
  color: #4CAF50;
  margin-bottom: 5px;
}
.current-loc {
  font-size: 13px;
  color: #aaa;
  margin-bottom: 15px;
}
.input-group {
  margin-bottom: 15px;
}
select {
  width: 100%;
  padding: 12px;
  border-radius: 6px;
  border: 1px solid #444;
  background-color: #222;
  color: white;
  font-size: 16px;
  outline: none;
}
select:focus {
  border-color: #4CAF50;
}
.scan-btn {
  background-color: #2196F3;
  color: white;
  border: none;
  padding: 15px 20px;
  font-size: 16px;
  border-radius: 8px;
  font-weight: bold;
  cursor: pointer;
  width: 100%;
  box-shadow: 0 4px 15px rgba(33, 150, 243, 0.3);
}
.scan-btn:disabled {
  background-color: #555;
  box-shadow: none;
  cursor: not-allowed;
  opacity: 0.5;
}

/* Package Lists */
.package-lists {
  display: flex;
  flex-direction: column;
  gap: 15px;
}
.list-section {
  background: rgba(20, 20, 20, 0.9);
  border: 1px solid #333;
  border-radius: 8px;
  padding: 15px;
}
.list-section h3 {
  margin-top: 0;
  font-size: 16px;
  color: #ddd;
  border-bottom: 1px solid #444;
  padding-bottom: 8px;
  margin-bottom: 10px;
}
.pkg-item {
  background: #222;
  padding: 10px;
  border-radius: 6px;
  margin-bottom: 8px;
  border-left: 3px solid #555;
}
.pkg-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 5px;
}
.barcode {
  font-family: monospace;
  font-weight: bold;
  color: #4CAF50;
}
.priority-badge {
  font-size: 11px;
  padding: 3px 6px;
  border-radius: 12px;
  font-weight: bold;
}
.p-1 { background: #555; color: #fff; }
.p-5 { background: #FF9800; color: #000; }
.p-10 { background: #F44336; color: #fff; }
.no-data {
  color: #777;
  font-size: 13px;
  font-style: italic;
}
.undo-btn {
  background-color: transparent;
  color: #ff5252;
  border: 1px solid #ff5252;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  margin-top: 10px;
  font-size: 12px;
  display: block;
  width: 100%;
}

/* Active Delivery */
.status-card {
  background: rgba(30, 30, 30, 0.8);
  padding: 10px 15px;
  border-radius: 8px;
  text-align: center;
  border: 1px solid #4CAF50;
  margin-bottom: 15px;
}
.stop-actions {
  margin-top: 15px;
  padding-top: 15px;
  border-top: 1px dashed #555;
}
.arrived-text {
  color: #4CAF50;
  margin: 0 0 10px 0;
}
.action-buttons {
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
}
.pickup-btn, .dropoff-btn {
  flex: 1;
  padding: 12px;
  border: none;
  border-radius: 6px;
  font-weight: bold;
  cursor: pointer;
  color: white;
}
.pickup-btn { background-color: #2196F3; }
.dropoff-btn { background-color: #4CAF50; }
.finish-btn {
  background-color: #333;
  color: white;
  border: 1px solid #555;
  padding: 10px;
  border-radius: 6px;
  cursor: pointer;
  width: 100%;
}

.map-container {
  width: 100%;
  margin-bottom: 20px;
}
.action-area {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.skip-btn {
  width: 100%;
  padding: 15px;
  background-color: #2196F3;
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: bold;
  cursor: pointer;
}
.cancel-btn {
  background-color: transparent;
  color: #ff5252;
  border: 1px solid #ff5252;
  padding: 15px;
  font-size: 16px;
  border-radius: 6px;
  cursor: pointer;
  width: 100%;
  font-weight: bold;
}
.note-input {
  width: 100%;
  background: #111;
  color: #fff;
  border: 1px solid #444;
  padding: 10px;
  border-radius: 4px;
  margin-bottom: 15px;
  resize: vertical;
  min-height: 60px;
}

/* Modals */
.modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 20px;
}
.modal-content {
  background: #1e1e1e;
  padding: 20px;
  border-radius: 12px;
  width: 100%;
  max-width: 400px;
  max-height: 80vh;
  overflow-y: auto;
  border: 1px solid #444;
}
.modal-content h3 { margin-top: 0; margin-bottom: 5px; }
.subtitle { color: #aaa; font-size: 13px; margin-bottom: 20px; border-bottom: 1px solid #333; padding-bottom: 10px; }
.pkg-card {
  background: #2a2a2a;
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 15px;
}
.pkg-desc { margin: 10px 0; font-size: 14px; }
.action-btn {
  width: 100%;
  padding: 10px;
  border: none;
  border-radius: 6px;
  font-weight: bold;
  cursor: pointer;
  color: white;
}
.action-btn.pickup { background-color: #2196F3; }
.action-btn.dropoff { background-color: #4CAF50; }
.close-btn {
  width: 100%;
  padding: 12px;
  background: #333;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

/* Mobil Uyum (Responsive Design) */
@media (max-width: 768px) {
  .courier-container {
    padding: 10px;
  }
  .header h2 {
    font-size: 18px;
  }
  .action-buttons {
    flex-direction: column;
  }
  .modal-content {
    width: 95%;
    padding: 15px;
  }
  .pkg-card {
    padding: 10px;
  }
  .pkg-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 5px;
  }
}
</style>
