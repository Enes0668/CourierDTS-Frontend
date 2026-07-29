<template>
  <div class="admin-dashboard-modern">
    <!-- Top Navigation Tabs -->
    <div class="top-nav-tabs">
      <h2>👑 Yönetici Paneli</h2>
      <div class="tabs-container">
        <button :class="{ active: activeTab === 'live' }" @click="setTab('live')">📍 Canlı İzleme</button>
        <button :class="{ active: activeTab === 'pool' }" @click="setTab('pool')">📦 Paket Havuzu</button>
        <button :class="{ active: activeTab === 'new' }" @click="setTab('new')">➕ Yeni Paket</button>
      </div>
      <button @click="logout" class="logout-btn-top">Güvenli Çıkış</button>
    </div>

    <!-- TAB: CANLI İZLEME -->
    <div class="tab-content live-tab" v-if="activeTab === 'live'">
      <div class="sidebar">
        <!-- Courier List -->
        <div class="section-block">
          <h3>Sahadaki Kuryeler</h3>
          <ul class="courier-list">
            <li 
              v-for="courier in couriers" 
              :key="courier.id" 
              :class="{ active: selectedCourierId === courier.id }"
              @click="selectedCourierId = courier.id"
            >
              🛵 {{ courier.name }}
            </li>
          </ul>
        </div>
        
        <!-- Courier's Current Packages -->
        <div class="section-block package-form">
          <h3>🎒 Kuryedeki Paketler</h3>
          
          <div v-if="courierPackagesInTransit.length === 0 && courierPackagesPending.length === 0" class="no-data">
            Bu kuryeye atanmış paket yok.
          </div>

          <div v-if="courierPackagesInTransit.length > 0">
            <h4 class="sub-heading">🚚 Üzerindeki (Alınmış) Paketler</h4>
            <ul class="detailed-pkg-list transit-list">
              <li v-for="pkg in courierPackagesInTransit" :key="pkg.id">
                <div class="pkg-main">
                  <strong>{{ pkg.barcode || 'İsimsiz' }}</strong> (P{{ pkg.priority }})
                </div>
                <div class="pkg-sub">
                  {{ pkg.description }}<br>
                  <small>Alış: {{ getLocationName(pkg.pickupLocId) }} ➔ Hedef: {{ getLocationName(pkg.dropoffLocId) }}</small>
                </div>
              </li>
            </ul>
          </div>

          <div v-if="courierPackagesPending.length > 0">
            <h4 class="sub-heading">⏳ Atanmış Ancak Alınmamış</h4>
            <ul class="detailed-pkg-list pending-list">
              <li v-for="pkg in courierPackagesPending" :key="pkg.id">
                <div class="pkg-main">
                  <strong>{{ pkg.barcode || 'İsimsiz' }}</strong> (P{{ pkg.priority }})
                </div>
                <div class="pkg-sub">
                  {{ pkg.description }}<br>
                  <small>Alış: {{ getLocationName(pkg.pickupLocId) }} ➔ Hedef: {{ getLocationName(pkg.dropoffLocId) }}</small>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <!-- Map & Telemetry Area -->
      <div class="map-area" :class="{ 'collapsed-mobile': !isMapVisibleOnMobile }">
        <div class="map-header" @click="isMapVisibleOnMobile = !isMapVisibleOnMobile">
          <div class="map-header-title">
            <h3>📍 Canlı Kurye İzleme & Rota Arama</h3>
            <span class="polling-badge">🔴 Canlı (Son Güncelleme: {{ lastUpdate }})</span>
          </div>
          
          <div class="search-bar" @click.stop>
            <input type="text" v-model="barcodeSearch" placeholder="Barkod ile ara (Geçmiş Rota)" @keyup.enter="searchTourHistory" />
            <button @click="searchTourHistory">Ara</button>
          </div>
          <span class="mobile-toggle-icon">{{ isMapVisibleOnMobile ? '🔽' : '▶️' }}</span>
        </div>
        
        <div class="map-collapsible-content">
          <div class="map-container">
            <!-- Harita Bileşeni -->
            <MapView :courierPosition="mockAdminPosition" :telemetryRoute="activeCourierRoute" />
          </div>
        </div>
      </div>
    </div>

    <!-- TAB: PAKET HAVUZU -->
    <div class="tab-content pool-tab" v-if="activeTab === 'pool'">
      <div class="section-block package-form centered-panel full-width">
        <div class="panel-header-flex">
          <h3>📥 Atanmamış Paketler (Havuz)</h3>
          <button @click="loadPoolData" class="refresh-btn">🔄 Yenile</button>
        </div>
        
        <div class="input-group">
          <input type="text" v-model="poolFilterText" placeholder="Havuzda ara (Barkod, İçerik...)" />
        </div>

        <div v-if="filteredPendingPool.length === 0" class="no-data">
          Filtreye uygun atanmamış paket yok.
        </div>
        
        <div v-else>
          <div class="pool-select-all">
            <input type="checkbox" id="selectAll" @change="toggleSelectAllFiltered" :checked="isAllFilteredSelected" />
            <label for="selectAll">Tümünü Seç ({{ filteredPendingPool.length }} Paket)</label>
          </div>
          
          <div class="pool-list grid-layout">
            <div v-for="pkg in filteredPendingPool" :key="pkg.id || pkg.Id" class="pool-item">
              <input type="checkbox" :value="pkg.id || pkg.Id" v-model="selectedPoolPackages" />
              <div class="pool-info">
                <strong>{{ pkg.barcode || pkg.Barcode || 'İsimsiz' }}</strong> (P{{ pkg.priority || pkg.Priority }})
                <div class="pool-desc">{{ pkg.description || pkg.Description }}</div>
              </div>
            </div>
          </div>
        </div>

        <div class="assignment-actions" style="margin-top: 15px;">
          <select v-model="selectedAssignCourierId" class="full-width-select">
            <option value="0">🌍 Genel Atama (Tüm Kuryeler - Havuz)</option>
            <option v-for="c in couriers" :key="c.id" :value="c.id">🛵 {{ c.name }}</option>
          </select>

          <button @click="assignSelectedToCourier" class="assign-btn" :disabled="selectedPoolPackages.length === 0">
            Seçilenleri Ata ({{ selectedPoolPackages.length }})
          </button>
        </div>
      </div>
    </div>

    <!-- TAB: YENİ PAKET EKLE -->
    <div class="tab-content new-tab" v-if="activeTab === 'new'">
      <div class="section-block package-form centered-panel">
        <h3>📦 Sisteme Yeni Paket Ekle</h3>
        
        <div class="input-group">
          <label>Barkod (Opsiyonel - Boşsa sistem üretir)</label>
          <input type="text" v-model="newPkg.barcode" placeholder="Örn: HAST-1234">
        </div>

        <div class="input-group">
          <label>İçerik / Başlık</label>
          <input type="text" v-model="newPkg.description" placeholder="Örn: Kan Örneği">
        </div>

        <div class="input-group">
          <label>Öncelik (1 Normal, 10 Acil)</label>
          <input type="number" v-model="newPkg.priority" min="1" max="10">
        </div>

        <div class="input-group">
          <label>Alınacak Nokta (Pickup)</label>
          <select v-model="newPkg.pickupLocationId">
            <option value="" disabled>Seçiniz...</option>
            <option v-for="loc in locations" :key="'p-'+loc.id" :value="loc.id">{{ loc.name }}</option>
          </select>
        </div>

        <div class="input-group">
          <label>Teslim Edilecek Nokta (Dropoff)</label>
          <select v-model="newPkg.dropoffLocationId">
            <option value="" disabled>Seçiniz...</option>
            <option v-for="loc in locations" :key="'d-'+loc.id" :value="loc.id" :disabled="loc.id === newPkg.pickupLocationId">{{ loc.name }}</option>
          </select>
        </div>

        <button @click="createPackageToPool" class="assign-btn" :disabled="!isFormValid">
          Havuza Ekle
        </button>
      </div>
    </div>

  </div>
</template>

<script>
import MapView from '../components/MapView.vue';
import { toast } from '../services/toast';
import { dataService } from '../services/dataService';

export default {
  name: 'AdminDashboard',
  components: { MapView },
  data() {
    return {
      activeTab: 'live',
      locations: [],
      couriers: [],
      packages: [],
      selectedCourierId: 1,
      selectedAssignCourierId: '0', // 0 means General
      selectedPoolPackages: [],
      poolFilterText: '',
      barcodeSearch: '',
      newPkg: {
        barcode: '',
        description: '',
        priority: 1,
        pickupLocationId: '',
        dropoffLocationId: ''
      },
      isMapVisibleOnMobile: false,

      // Telemetry Data
      lastUpdate: 'Henüz güncellenmedi',
      pollingTimer: null,
      mockAdminPosition: null, 
      activeCourierRoute: null
    }
  },
  computed: {
    pendingPool() {
      if (!Array.isArray(this.packages)) return [];
      return this.packages.filter(p => {
        const courierId = p.assignedCourierId !== undefined ? p.assignedCourierId : p.AssignedCourierId;
        return !courierId || courierId === '' || courierId === 0;
      });
    },
    filteredPendingPool() {
      if (!Array.isArray(this.pendingPool)) return [];
      const lowerFilter = (this.poolFilterText || '').toLowerCase();
      if (!lowerFilter) return this.pendingPool;
      return this.pendingPool.filter(p => {
        const barcode = p.barcode || p.Barcode || '';
        const desc = p.description || p.Description || '';
        return String(barcode).toLowerCase().includes(lowerFilter) || 
               String(desc).toLowerCase().includes(lowerFilter);
      });
    },
    isAllFilteredSelected() {
      if (this.filteredPendingPool.length === 0) return false;
      // Are all filtered items inside selectedPoolPackages?
      return this.filteredPendingPool.every(p => this.selectedPoolPackages.includes(p.id));
    },
    courierPackagesInTransit() {
      if (!Array.isArray(this.packages)) return [];
      return this.packages.filter(p => {
        const courierId = p.assignedCourierId !== undefined ? p.assignedCourierId : p.AssignedCourierId;
        const status = p.status || p.Status;
        return courierId === this.selectedCourierId && status === 'InTransit';
      });
    },
    courierPackagesPending() {
      if (!Array.isArray(this.packages)) return [];
      return this.packages.filter(p => {
        const courierId = p.assignedCourierId !== undefined ? p.assignedCourierId : p.AssignedCourierId;
        const status = p.status || p.Status;
        return courierId === this.selectedCourierId && status === 'Pending';
      });
    },
    isFormValid() {
      return this.newPkg.description && 
             this.newPkg.pickupLocationId && 
             this.newPkg.dropoffLocationId && 
             this.newPkg.priority > 0;
    }
  },
  async mounted() {
    this.lastUpdate = new Date().toLocaleTimeString();
    await this.setTab('live');
  },
  beforeUnmount() {
    if (this.pollingTimer) {
      clearTimeout(this.pollingTimer);
    }
  },
  methods: {
    async setTab(tabName) {
      this.activeTab = tabName;
      
      if (tabName === 'live') {
        try { this.locations = await dataService.getLocations(); } catch(e){ console.warn(e); }
        try { 
          let res = await dataService.getAllPackages(); 
          if (res && res.data && Array.isArray(res.data)) this.packages = res.data;
          else if (Array.isArray(res)) this.packages = res;
          else this.packages = [];
        } catch(e){ console.warn(e); this.packages = []; }
        try { this.couriers = await dataService.getCouriers(); } catch(e){ console.warn(e); }
        this.startPolling();
      } else {
        if (this.pollingTimer) {
          clearTimeout(this.pollingTimer);
          this.pollingTimer = null;
        }
      }

      if (tabName === 'pool') {
        await this.loadPoolData();
      }

      if (tabName === 'new') {
        if (this.locations.length === 0) {
          try { this.locations = await dataService.getLocations(); } catch (e) { console.warn(e); }
        }
      }
    },
    async loadPoolData() {
      try { 
        let res = await dataService.getAllPackages(); 
        // Backend wrapper checks
        if (res && res.data && Array.isArray(res.data)) {
          this.packages = res.data;
        } else if (Array.isArray(res)) {
          this.packages = res;
        } else {
          this.packages = [];
        }
      } catch (e) { console.warn("Packages failed"); this.packages = []; }
      
      if (this.couriers.length === 0) {
        try { this.couriers = await dataService.getCouriers(); } catch (e) { console.warn("Couriers failed"); }
      }
    },
    toggleSelectAllFiltered(event) {
      const isChecked = event.target.checked;
      if (isChecked) {
        // Add all filtered items that are not already selected
        this.filteredPendingPool.forEach(p => {
          if (!this.selectedPoolPackages.includes(p.id)) {
            this.selectedPoolPackages.push(p.id);
          }
        });
      } else {
        // Remove all filtered items from selectedPoolPackages
        const filteredIds = this.filteredPendingPool.map(p => p.id);
        this.selectedPoolPackages = this.selectedPoolPackages.filter(id => !filteredIds.includes(id));
      }
    },
    async fetchData() {
      // Periyodik olarak paketleri (ve kurye konumlarını) yenile
      this.packages = await dataService.getAllPackages();
      this.couriers = await dataService.getCouriers();
    },
    getLocationName(id) {
      const loc = this.locations.find(l => l.id == id);
      return loc ? loc.name : 'Bilinmeyen Konum';
    },
    startPolling() {
      const poll = async () => {
        try {
          const now = new Date();
          this.lastUpdate = now.toLocaleTimeString();
          
          this.couriers = await dataService.getCouriers();
          const selected = this.couriers.find(c => c.id === this.selectedCourierId);
          
          if (selected && selected.lat && selected.lng) {
             this.mockAdminPosition = { lat: selected.lat, lng: selected.lng };
          }

          // Fetch active route for selected courier
          const journeys = await dataService.getJourneys(this.selectedCourierId);
          // Assuming backend returns an array and active journey is the latest or has status 'Active'
          const activeJourney = journeys.find(j => j.status === 'Active') || journeys[journeys.length - 1];
          if (activeJourney) {
            const telemetryData = await dataService.getTelemetry(activeJourney.id);
            this.activeCourierRoute = telemetryData;
          } else {
            this.activeCourierRoute = null;
          }

        } catch (error) {
          console.warn("Canlı izleme verisi çekilemedi (Simülasyon devam ediyor).");
        }
        
        if (this.activeTab === 'live') {
          this.pollingTimer = setTimeout(poll, 10000); // 10s live polling
        }
      };
      // Start the first poll after 10 seconds since mounted() already fetched data
      if (this.activeTab === 'live') {
        this.pollingTimer = setTimeout(poll, 10000);
      }
    },
    async searchTourHistory() {
      if (!this.barcodeSearch.trim()) {
        toast.error("Lütfen bir barkod girin.");
        return;
      }
      try {
        const historyData = await dataService.getTourHistoryByBarcode(this.barcodeSearch.trim());
        if (historyData && historyData.length > 0) {
          // Flatten if multiple tours exist, or just show the first one
          this.activeCourierRoute = historyData.flat();
          toast.success("Geçmiş rota haritaya çizildi.");
        } else {
          toast.error("Bu barkoda ait rota geçmişi bulunamadı.");
        }
      } catch (error) {
        toast.error("Rota aranırken bir hata oluştu.");
      }
    },
    async assignSelectedToCourier() {
      let courierName = "Genel Havuz (Tüm Kuryeler)";
      let assignId = parseInt(this.selectedAssignCourierId);
      
      if (assignId !== 0) {
        const courier = this.couriers.find(c => c.id === assignId);
        if(!courier) return;
        courierName = courier.name;
      }

      try {
        await dataService.assignPackageBulk(this.selectedPoolPackages, assignId);
        
        toast.success(`${this.selectedPoolPackages.length} paket ${courierName} hedefine atandı!`);
        this.selectedPoolPackages = []; // Reset selection
        
        // Atamalar bittikten sonra en güncel listeyi sunucudan çekiyoruz
        await this.fetchData();
      } catch (error) {
        toast.error("Paketleri atarken bir hata oluştu.");
      }
    },
    async createPackageToPool() {
      const payload = {
        barcode: this.newPkg.barcode.trim() || `SYS-${Date.now().toString().slice(-4)}`,
        description: this.newPkg.description,
        priority: this.newPkg.priority,
        pickupLocationId: this.newPkg.pickupLocationId,
        dropoffLocationId: this.newPkg.dropoffLocationId,
        assignedCourierId: null // Boş gönderiyoruz ki Havuza düşsün
      };
      
      await dataService.createPackage(payload);
      await this.fetchData();
      
      this.newPkg = {
        barcode: '',
        description: '',
        priority: 1,
        pickupLocationId: '',
        dropoffLocationId: ''
      };
      
      toast.info("Yeni paket kuryeye eklendi!");
    },
    logout() {
      localStorage.clear();
      this.$router.push({ name: 'login' });
    }
  }
}
</script>

<style scoped>
.admin-container {
  display: flex;
  height: 100vh;
  background-color: #121212;
  color: #fff;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

/* Sidebar Styling */
.sidebar {
  width: 350px;
  background-color: #1a1a1a;
  border-right: 1px solid #333;
  padding: 20px;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}
.sidebar h2 {
  margin-top: 0;
  color: #4CAF50;
  border-bottom: 2px solid #333;
  padding-bottom: 15px;
  margin-bottom: 20px;
}
.section-block {
  margin-bottom: 30px;
}
.section-block h3 {
  font-size: 14px;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 10px;
}

/* Courier List */
.courier-list {
  list-style: none;
  padding: 0;
  margin: 0;
}
.courier-list li {
  padding: 15px;
  background: #252525;
  margin-bottom: 8px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-weight: 500;
}
.courier-list li:hover {
  background: #2a2a2a;
}
.courier-list li.active {
  border-left: 5px solid #4CAF50;
  background: #1f3a20;
  color: #a5d6a7;
}

/* Form Styling */
.package-form {
  background: #222;
  padding: 15px;
  border-radius: 8px;
  border: 1px solid #333;
}
.input-group {
  margin-bottom: 12px;
}
.input-group label {
  display: block;
  font-size: 12px;
  color: #aaa;
  margin-bottom: 5px;
}
.input-group input, .input-group select {
  width: 100%;
  padding: 10px;
  background: #111;
  border: 1px solid #444;
  color: #fff;
  border-radius: 4px;
  box-sizing: border-box;
}
.input-group input:focus, .input-group select:focus {
  border-color: #4CAF50;
  outline: none;
}
.assign-btn {
  width: 100%;
  padding: 12px;
  background-color: #2196F3;
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: bold;
  cursor: pointer;
  margin-top: 10px;
}
.assign-btn:disabled {
  background-color: #444;
  cursor: not-allowed;
  color: #777;
}
.logout-btn {
  background-color: transparent;
  color: #ff5252;
  border: 1px solid #ff5252;
  padding: 10px;
  border-radius: 6px;
  cursor: pointer;
  margin-top: auto;
  font-weight: bold;
}

/* Map Area */
.map-area {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  background-color: #111;
  padding: 20px;
  height: 100vh;
  box-sizing: border-box;
}
.map-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}
.map-header h3 {
  margin: 0;
  color: #ddd;
}
.polling-badge {
  background: #330000;
  color: #ffcccc;
  padding: 5px 12px;
  border-radius: 15px;
  font-size: 12px;
  font-weight: bold;
  border: 1px solid #ff5252;
}
.map-container {
  flex-grow: 1;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid #333;
  min-height: 400px;
}

/* Logs Area */
.logs-area {
  margin-top: 20px;
  background: #1a1a1a;
  padding: 15px;
  border-radius: 8px;
  border: 1px solid #333;
  height: 150px;
  display: flex;
  flex-direction: column;
}
.logs-area h4 {
  margin-top: 0;
  margin-bottom: 10px;
  color: #888;
  font-size: 13px;
}
.log-list {
  flex-grow: 1;
  overflow-y: auto;
}
.log-item {
  padding: 8px;
  background: #222;
  border-left: 3px solid #2196F3;
  margin-bottom: 5px;
  font-size: 13px;
  border-radius: 4px;
}
.map-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.map-header-title {
  display: flex;
  align-items: center;
  gap: 15px;
}
.search-bar {
  display: flex;
  gap: 5px;
}
.search-bar input {
  padding: 8px;
  border-radius: 4px;
  border: 1px solid #444;
  background: #222;
  color: white;
}
.search-bar button {
  padding: 8px 12px;
  background: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
.mobile-toggle-icon {
  display: none;
}

/* Mobil Uyum (Responsive Design) */
@media (max-width: 768px) {
  .admin-container {
    flex-direction: column;
    height: auto;
    min-height: 100vh;
  }
  .sidebar {
    width: 100%;
    border-right: none;
    border-bottom: 1px solid #333;
    max-height: none;
  }
  .map-area {
    height: auto !important;
    padding: 10px;
  }
  .map-header {
    cursor: pointer;
    background: #1e1e1e;
    padding: 12px;
    border-radius: 8px;
    margin-bottom: 10px;
  }
  .map-header-title {
    flex-direction: column;
    align-items: flex-start;
    gap: 5px;
  }
  .mobile-toggle-icon {
    display: block;
    font-size: 20px;
  }
  .collapsed-mobile .map-collapsible-content {
    display: none;
  }
  .map-area:not(.collapsed-mobile) .map-collapsible-content {
    height: 50vh;
    display: flex;
    flex-direction: column;
  }
  .map-area:not(.collapsed-mobile) .map-container {
    flex-grow: 1;
    min-height: 250px;
  }
}

.sub-heading {
  font-size: 14px;
  color: #aaa;
  margin-top: 15px;
  margin-bottom: 8px;
  border-bottom: 1px solid #333;
  padding-bottom: 4px;
}
.detailed-pkg-list {
  list-style: none;
  padding: 0;
  margin: 0 0 10px 0;
}
.detailed-pkg-list li {
  padding: 10px;
  background: #111;
  margin-bottom: 8px;
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.transit-list li {
  border-left: 3px solid #4CAF50;
}
.pending-list li {
  border-left: 3px solid #FF9800;
}
.pkg-main {
  font-size: 14px;
  color: #fff;
}
.pkg-sub {
  font-size: 12px;
  color: #888;
}
.pkg-sub small {
  color: #bbb;
  display: block;
  margin-top: 3px;
}

.pool-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.pool-item {
  display: flex;
  align-items: center;
  gap: 10px;
  background: #1e1e1e;
  padding: 10px;
  border-radius: 6px;
  border: 1px solid #333;
}
.pool-item input {
  transform: scale(1.3);
}
.pool-info {
  flex-grow: 1;
}
.pool-desc {
  font-size: 12px;
  color: #aaa;
  margin-top: 4px;
}
.no-data {
  color: #777;
  font-size: 13px;
  font-style: italic;
  margin-bottom: 10px;
}

/* Tab Architecture Styles */
.admin-dashboard-modern {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #121212;
  color: #fff;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.top-nav-tabs {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #1a1a1a;
  border-bottom: 1px solid #333;
  padding: 0 20px;
  height: 60px;
}
.top-nav-tabs h2 {
  color: #4CAF50;
  margin: 0;
  font-size: 18px;
}

.tabs-container {
  display: flex;
  gap: 10px;
}
.tabs-container button {
  background: transparent;
  border: none;
  color: #888;
  padding: 10px 15px;
  font-size: 14px;
  cursor: pointer;
  border-bottom: 3px solid transparent;
  transition: all 0.2s ease;
  font-weight: bold;
}
.tabs-container button:hover {
  color: #fff;
}
.tabs-container button.active {
  color: #4CAF50;
  border-bottom: 3px solid #4CAF50;
}

.logout-btn-top {
  background-color: transparent;
  color: #ff5252;
  border: 1px solid #ff5252;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
}

.tab-content {
  flex-grow: 1;
  display: flex;
  overflow: hidden;
}

/* Specific Tab Layouts */
.live-tab {
  flex-direction: row;
}

.pool-tab, .new-tab {
  padding: 20px;
  overflow-y: auto;
  align-items: flex-start;
  justify-content: center;
}

.centered-panel {
  max-width: 600px;
  width: 100%;
  margin: 0 auto;
}

.full-width {
  max-width: 900px;
  width: 100%;
}

.panel-header-flex {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}
.panel-header-flex h3 {
  margin: 0;
}

.refresh-btn {
  background: #333;
  color: white;
  border: none;
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
}
.refresh-btn:hover {
  background: #444;
}

.grid-layout {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 15px;
}
</style>
