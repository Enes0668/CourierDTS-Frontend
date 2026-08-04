<template>
  <div class="admin-dashboard-modern">
    <!-- Top Navigation Tabs -->
    <div class="top-nav-tabs">
      <h2>👑 Yönetici Paneli</h2>
      <div class="tabs-container">
        <button :class="{ active: activeTab === 'live' }" @click="setTab('live')">📍 Canlı Takip</button>
        <button :class="{ active: activeTab === 'pool' }" @click="setTab('pool')">📦 Paket Havuzu</button>
        <button :class="{ active: activeTab === 'new' }" @click="setTab('new')">➕ Yeni Görev</button>
        <button :class="{ active: activeTab === 'vehicles' }" @click="setTab('vehicles')">🛵 Araç Yönetimi</button>
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
              v-for="(courier, index) in couriers" 
              :key="'c-' + (courier.id || index)" 
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
          <div style="font-size: 11px; color: #888; text-align: right;">
            Debug: Toplam: {{ packages.length }} | Havuz: {{ pendingPool.length }} | Filtrelenmiş: {{ filteredPendingPool.length }}
          </div>
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
            <AdminPackageCard
              v-for="(pkg, index) in filteredPendingPool"
              :key="'pool-' + (pkg.id || pkg.Id || index)"
              :pkg="pkg"
              type="pool"
              :selected="selectedPoolPackages.includes(pkg.id || pkg.Id)"
              @toggle="togglePackageSelection"
              @edit-package="openEditPackageModal"
            />
          </div>
        </div>

        <div class="assignment-actions" style="margin-top: 15px;">
          <select v-model="selectedAssignCourierId" class="full-width-select">
            <option value="0">🌐 Genel Atama (Tüm Kuryeler - Havuz)</option>
            <option v-for="c in couriers" :key="c.id" :value="c.id">🛵 {{ c.name }}</option>
          </select>

          <button @click="assignSelectedToCourier" class="assign-btn" :disabled="selectedPoolPackages.length === 0">
            Seçilenleri Ata ({{ selectedPoolPackages.length }})
          </button>
        </div>
      </div>

      <!-- GENEL ATANMIŞLAR LİSTESİ -->
      <div class="section-block package-form centered-panel full-width">
        <div class="panel-header-flex">
          <h3>📋 Atanmış (Bekleyen) Paketler</h3>
        </div>
        
        <div v-if="filteredAssignedPendingPool.length === 0" class="no-data">
          Filtreye uygun atanmış ve bekleyen paket yok.
        </div>
        
        <div v-else class="pool-list grid-layout" style="margin-top: 10px;">
          <AdminPackageCard
            v-for="(pkg, index) in filteredAssignedPendingPool"
            :key="'pending-' + (pkg.id || pkg.Id || index)"
            :pkg="pkg"
            type="pending"
            :courierName="getCourierName(pkg.assignedCourierId || pkg.AssignedCourierId)"
            @edit-package="openEditPackageModal"
          />
        </div>
      </div>

      <!-- KURYELERİN ÜZERİNDEKİ PAKETLER -->
      <div class="section-block package-form centered-panel full-width">
        <div class="panel-header-flex">
          <h3>🚚 Kuryedeki (Taşıma Aşamasında) Paketler</h3>
        </div>
        
        <div v-if="filteredInTransitPool.length === 0" class="no-data">
          Filtreye uygun taşınan paket yok.
        </div>
        
        <div v-else class="pool-list grid-layout" style="margin-top: 10px;">
          <AdminPackageCard
            v-for="(pkg, index) in filteredInTransitPool"
            :key="'transit-' + (pkg.id || pkg.Id || index)"
            :pkg="pkg"
            type="transit"
            :courierName="getCourierName(pkg.assignedCourierId || pkg.AssignedCourierId)"
            @edit-package="openEditPackageModal"
          />
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

    <!-- VEHICLES TAB -->
    <div class="tab-content vehicles-tab" v-if="activeTab === 'vehicles'">
      <div class="section-block add-vehicle-section">
        <h3>🛵 Yeni Araç Ekle</h3>
        <form @submit.prevent="submitNewVehicle" class="new-vehicle-form">
          <div class="form-group">
            <label>Plaka Numarası</label>
            <input type="text" v-model="newVehicle.plateNumber" placeholder="34 ABC 123" required />
          </div>
          
          <div class="form-group">
            <label>Araç Tipi</label>
            <select v-model="newVehicle.vehicleType" required>
              <option value="" disabled>Seçiniz...</option>
              <option value="Motosiklet">Motosiklet</option>
              <option value="Otomobil">Otomobil</option>
              <option value="Minivan">Minivan</option>
            </select>
          </div>
          
          <div class="form-group">
            <label>Atanacak Kurye (Opsiyonel)</label>
            <select v-model="newVehicle.courierId">
              <option value="">-- Havuza Bırak (Boşta) --</option>
              <option v-for="(c, index) in couriers" :key="'nv-c-' + (c.id || index)" :value="c.id">{{ c.name || c.fullName || c.username }}</option>
            </select>
          </div>
          
          <button type="submit" class="primary-btn" style="align-self: flex-end;">Araç Ekle</button>
        </form>
      </div>

      <div class="section-block vehicles-list-section" style="margin-top: 20px;">
        <h3>📋 Mevcut Araçlar ({{ allVehicles.length }})</h3>
        <div v-if="allVehicles.length === 0" class="no-data">Sistemde kayıtlı araç yok.</div>
        <div class="grid-layout">
          <div v-for="v in allVehicles" :key="v.id" class="pool-item premium-card read-only-item">
            <div class="pool-info">
              <div class="pool-header">
                <strong>{{ v.plateNumber || v.PlateNumber }}</strong>
                <span class="badge" style="background-color: #607d8b; color: white;">{{ v.vehicleType || v.VehicleType }}</span>
              </div>
              <div class="pool-meta mt-2">
                <span class="chip" :class="(v.courierId || v.CourierId) ? 'chip-success' : 'chip-warning'">
                  <i class="icon">👤</i> 
                  {{ (v.courierId || v.CourierId) ? getCourierName(v.courierId || v.CourierId) : 'Atanmamış' }}
                </span>
              </div>
            </div>
            <div class="pool-actions">
              <button @click="openEditVehicleModal(v)" class="icon-btn edit-btn" title="Aracı Düzenle">✏️</button>
              <button @click="removeVehicle(v.id || v.Id)" class="icon-btn delete-btn" title="Aracı Sil">🗑️</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- EDIT PACKAGE MODAL -->
    <div v-if="showEditPackageModal" class="modal-overlay" @click.self="showEditPackageModal = false">
      <div class="modal-content">
        <h3>✏️ Paket Düzenle</h3>
        <form @submit.prevent="savePackageEdit" class="new-vehicle-form edit-form">
          <div class="form-group" style="width: 100%">
            <label>Barkod</label>
            <input type="text" v-model="editingPackage.barcode" required />
          </div>
          <div class="form-group" style="width: 100%">
            <label>İçerik (Açıklama)</label>
            <input type="text" v-model="editingPackage.description" />
          </div>
          <div class="form-group" style="width: 100%">
            <label>Durum</label>
            <select v-model="editingPackage.status" required>
              <option value="Pending">Bekliyor (Pending)</option>
              <option value="PickedUp">Alındı (PickedUp)</option>
              <option value="InTransit">Yolda (InTransit)</option>
              <option value="Delivered">Teslim Edildi (Delivered)</option>
              <option value="Damaged">Hasarlı (Damaged)</option>
              <option value="Lost">Kayıp (Lost)</option>
              <option value="Cancelled">İptal Edildi (Cancelled)</option>
            </select>
          </div>
          <div class="form-group" style="width: 100%">
            <label>Atanan Kurye</label>
            <select v-model="editingPackage.assignedCourierId">
              <option :value="null">-- Havuza Bırak (Boşta) --</option>
              <option v-for="(c, index) in couriers" :key="'ep-c-' + (c.id || index)" :value="c.id">{{ c.name || c.fullName || c.username }}</option>
            </select>
          </div>
          <div class="modal-actions" style="margin-top: 20px; display: flex; justify-content: flex-end; gap: 10px; width: 100%">
            <button type="button" class="logout-btn-top" @click="showEditPackageModal = false">İptal</button>
            <button type="submit" class="primary-btn">Kaydet</button>
          </div>
        </form>
      </div>
    </div>

    <!-- EDIT VEHICLE MODAL -->
    <div v-if="showEditVehicleModal" class="modal-overlay" @click.self="showEditVehicleModal = false">
      <div class="modal-content">
        <h3>✏️ Araç Düzenle</h3>
        <form @submit.prevent="saveVehicleEdit" class="new-vehicle-form edit-form">
          <div class="form-group" style="width: 100%">
            <label>Plaka Numarası</label>
            <input type="text" v-model="editingVehicle.plateNumber" required />
          </div>
          <div class="form-group" style="width: 100%">
            <label>Araç Tipi</label>
            <select v-model="editingVehicle.vehicleType" required>
              <option value="Motosiklet">Motosiklet</option>
              <option value="Otomobil">Otomobil</option>
              <option value="Minivan">Minivan</option>
            </select>
          </div>
          <div class="form-group" style="width: 100%">
            <label>Atanan Kurye</label>
            <select v-model="editingVehicle.courierId">
              <option :value="null">-- Havuza Bırak (Boşta) --</option>
              <option v-for="(c, index) in couriers" :key="'ev-c-' + (c.id || index)" :value="c.id">{{ c.name || c.fullName || c.username }}</option>
            </select>
          </div>
          <div class="modal-actions" style="margin-top: 20px; display: flex; justify-content: flex-end; gap: 10px; width: 100%">
            <button type="button" class="logout-btn-top" @click="showEditVehicleModal = false">İptal</button>
            <button type="submit" class="primary-btn">Kaydet</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
import { dataService } from '@/services/dataService.js';
import MapView from '@/components/MapView.vue';
import AdminPackageCard from '@/components/admin/AdminPackageCard.vue';
import { toast } from '@/services/toast.js';

export default {
  name: 'AdminDashboard',
  components: { MapView, AdminPackageCard },
  data() {
    return {
      activeTab: 'live',
      locations: [],
      couriers: [],
      allVehicles: [],
      showEditVehicleModal: false,
      showEditPackageModal: false,
      editingVehicle: {
        id: null,
        plateNumber: '',
        vehicleType: '',
        courierId: null
      },
      editingPackage: {
        id: null,
        barcode: '',
        description: '',
        status: '',
        assignedCourierId: null,
        originalCourierId: null
      },
      newVehicle: {
        plateNumber: '',
        vehicleType: '',
        courierId: ''
      },
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
        return !courierId || courierId === '' || courierId == 0 || courierId === 'null' || courierId === '0' || courierId == -1 || courierId === '-1';
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
    assignedPendingPool() {
      if (!Array.isArray(this.packages)) return [];
      return this.packages.filter(p => {
        const courierId = p.assignedCourierId !== undefined ? p.assignedCourierId : p.AssignedCourierId;
        const isAssigned = courierId && courierId !== '' && courierId != 0 && courierId !== 'null' && courierId !== '0' && courierId != -1 && courierId !== '-1';
        const status = p.status || p.Status;
        return isAssigned && status === 'Pending';
      });
    },
    inTransitPool() {
      if (!Array.isArray(this.packages)) return [];
      return this.packages.filter(p => {
        const courierId = p.assignedCourierId !== undefined ? p.assignedCourierId : p.AssignedCourierId;
        const isAssigned = courierId && courierId !== '' && courierId != 0 && courierId !== 'null' && courierId !== '0' && courierId != -1 && courierId !== '-1';
        const status = p.status || p.Status;
        return isAssigned && (status === 'PickedUp' || status === 'InTransit');
      });
    },
    filteredAssignedPendingPool() {
      if (!Array.isArray(this.assignedPendingPool)) return [];
      const lowerFilter = (this.poolFilterText || '').toLowerCase();
      if (!lowerFilter) return this.assignedPendingPool;
      return this.assignedPendingPool.filter(p => {
        const barcode = p.barcode || p.Barcode || '';
        const desc = p.description || p.Description || '';
        return String(barcode).toLowerCase().includes(lowerFilter) || 
               String(desc).toLowerCase().includes(lowerFilter);
      });
    },
    filteredInTransitPool() {
      if (!Array.isArray(this.inTransitPool)) return [];
      const lowerFilter = (this.poolFilterText || '').toLowerCase();
      if (!lowerFilter) return this.inTransitPool;
      return this.inTransitPool.filter(p => {
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
          else if (res && res.items && Array.isArray(res.items)) this.packages = res.items;
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

      if (tabName === 'vehicles') {
        if (this.couriers.length === 0) {
          try { this.couriers = await dataService.getCouriers(); } catch (e) { console.warn(e); }
        }
        await this.loadVehicles();
      }
    },
    async loadVehicles() {
      try {
        this.allVehicles = await dataService.getVehicles();
      } catch (err) {
        toast.error("Araçlar yüklenemedi");
      }
    },
    async submitNewVehicle() {
      try {
        const payload = { ...this.newVehicle };
        if (!payload.courierId) {
          payload.courierId = null;
        } else {
          payload.courierId = parseInt(payload.courierId);
        }
        await dataService.addVehicle(payload);
        toast.success("Araç başarıyla eklendi");
        this.newVehicle = { plateNumber: '', vehicleType: '', courierId: '' };
        await this.loadVehicles();
      } catch (err) {
        toast.error("Araç eklenirken hata oluştu");
      }
    },
    async removeVehicle(id) {
      if (!confirm("Bu aracı silmek istediğinize emin misiniz?")) return;
      try {
        await dataService.deleteVehicle(id);
        toast.success("Araç başarıyla silindi");
        await this.loadVehicles();
      } catch (err) {
        let msg = "Araç silinirken hata oluştu";
        if (err.response && err.response.data) {
          if (typeof err.response.data === 'string') msg = err.response.data;
          else if (err.response.data.message) msg = err.response.data.message;
          else if (err.response.data.title) msg = err.response.data.title;
        }
        toast.error(msg);
      }
    },
    openEditVehicleModal(vehicle) {
      this.editingVehicle = {
        id: vehicle.id || vehicle.Id,
        plateNumber: vehicle.plateNumber || vehicle.PlateNumber,
        vehicleType: vehicle.vehicleType || vehicle.VehicleType,
        courierId: vehicle.courierId || vehicle.CourierId || null
      };
      this.showEditVehicleModal = true;
    },
    async saveVehicleEdit() {
      try {
        const payload = { ...this.editingVehicle };
        if (!payload.courierId || payload.courierId === 'null' || payload.courierId === '') {
          payload.courierId = null;
        } else {
          payload.courierId = parseInt(payload.courierId);
        }
        
        await dataService.updateVehicle(payload.id, payload);
        toast.success("Araç başarıyla güncellendi");
        this.showEditVehicleModal = false;
        await this.loadVehicles();
      } catch (err) {
        let msg = "Araç güncellenirken hata oluştu";
        if (err.response && err.response.data) {
          if (typeof err.response.data === 'string') msg = err.response.data;
          else if (err.response.data.message) msg = err.response.data.message;
          else if (err.response.data.title) msg = err.response.data.title;
        }
        toast.error(msg);
      }
    },
    openEditPackageModal(pkg) {
      this.editingPackage = {
        id: pkg.id || pkg.Id,
        barcode: pkg.barcode || pkg.Barcode,
        description: pkg.description || pkg.Description,
        status: pkg.status || pkg.Status || 'Pending',
        assignedCourierId: pkg.assignedCourierId || pkg.AssignedCourierId || null,
        originalCourierId: pkg.assignedCourierId || pkg.AssignedCourierId || null,
        priority: pkg.priority || pkg.Priority,
        pickupLocationId: pkg.pickupLocationId || pkg.PickupLocationId,
        dropoffLocationId: pkg.dropoffLocationId || pkg.DropoffLocationId
      };
      this.showEditPackageModal = true;
    },
    async savePackageEdit() {
      try {
        const payload = { ...this.editingPackage };
        if (!payload.assignedCourierId || payload.assignedCourierId === 'null' || payload.assignedCourierId === '') {
          payload.assignedCourierId = null;
        } else {
          payload.assignedCourierId = parseInt(payload.assignedCourierId);
        }
        
        await dataService.updatePackage(payload.id, payload);
        
        // If courier changed, try to assign it explicitly via bulk assign endpoint just in case
        if (payload.assignedCourierId !== payload.originalCourierId) {
            await dataService.assignPackageBulk([payload.id], payload.assignedCourierId || 0);
        }
        
        toast.success("Paket başarıyla güncellendi");
        this.showEditPackageModal = false;
        await this.loadPoolData();
        await this.fetchData();
      } catch (err) {
        let msg = "Paket güncellenirken hata oluştu";
        if (err.response && err.response.data) {
          if (typeof err.response.data === 'string') msg = err.response.data;
          else if (err.response.data.message) msg = err.response.data.message;
          else if (err.response.data.title) msg = err.response.data.title;
        }
        toast.error(msg);
      }
    },
    async loadPoolData() {
      try { 
        let res = await dataService.getAllPackages(); 
        // Backend wrapper checks
        if (res && res.data && Array.isArray(res.data)) {
          this.packages = res.data;
        } else if (res && res.items && Array.isArray(res.items)) {
          this.packages = res.items;
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
    togglePackageSelection(packageId, isSelected) {
      if (isSelected) {
        if (!this.selectedPoolPackages.includes(packageId)) {
          this.selectedPoolPackages.push(packageId);
        }
      } else {
        this.selectedPoolPackages = this.selectedPoolPackages.filter(id => id !== packageId);
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
      try {
        let res = await dataService.getAllPackages();
        if (res && res.data && Array.isArray(res.data)) this.packages = res.data;
        else if (res && res.items && Array.isArray(res.items)) this.packages = res.items;
        else if (Array.isArray(res)) this.packages = res;
      } catch(e) {
        console.warn("Polling packages failed", e);
      }
      try {
        this.couriers = await dataService.getCouriers();
      } catch(e) {
        console.warn("Polling couriers failed", e);
      }
    },
    getLocationName(id) {
      const loc = this.locations.find(l => l.id == id);
      return loc ? loc.name : 'Bilinmeyen Konum';
    },
    getCourierName(id) {
      const courier = this.couriers.find(c => c.id == id);
      return courier ? courier.name : 'Bilinmeyen Kurye';
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
          if (this.selectedCourierId) {
            const journeys = await dataService.getJourneys(this.selectedCourierId);
            // JourneyStatus enum'ında "Active" yok; devam eden sefer "InProgress"tir.
            const activeJourney = journeys.find(j => j.status === 'InProgress') || journeys[journeys.length - 1];
            if (activeJourney) {
              const telemetryData = await dataService.getTelemetry(activeJourney.id);
              this.activeCourierRoute = telemetryData;
            } else {
              this.activeCourierRoute = null;
            }
          }

        } catch (error) {
          console.warn("Canlı izleme verisi çekilemedi (Simülasyon devam ediyor).", error);
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
  gap: 12px;
  background: rgba(30, 30, 30, 0.7);
  backdrop-filter: blur(10px);
  padding: 14px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.3s ease;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}
.pool-item.premium-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 15px rgba(0, 0, 0, 0.3);
  border-color: rgba(255, 255, 255, 0.2);
}
.pool-item.read-only-item {
  border-left-width: 4px;
}
.pool-item.pending-border {
  border-left-color: #d35400;
}
.pool-item.transit-border {
  border-left-color: #27ae60;
}
.pool-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}
.pool-header strong {
  font-size: 1.05rem;
  color: #fff;
}
.badge {
  padding: 3px 8px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.5px;
}
.badge-priority {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  box-shadow: 0 2px 4px rgba(118, 75, 162, 0.3);
}
.pool-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
}
.flex-gap {
  gap: 8px;
}
.mt-2 {
  margin-top: 8px;
}
.chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 16px;
  font-size: 0.75rem;
  font-weight: 600;
}
.chip-warning {
  background: rgba(211, 84, 0, 0.15);
  color: #e67e22;
  border: 1px solid rgba(230, 126, 34, 0.3);
}
.chip-success {
  background: rgba(39, 174, 96, 0.15);
  color: #2ecc71;
  border: 1px solid rgba(46, 204, 113, 0.3);
}
.chip-outline {
  background: transparent;
  color: #aaa;
  border: 1px solid #555;
}
.custom-checkbox {
  width: 18px;
  height: 18px;
  cursor: pointer;
  accent-color: #667eea;
}
.pool-item input[type="checkbox"] {
  transform: none; /* override old css */
}
.pool-info {
  flex-grow: 1;
}
.pool-desc {
  font-size: 13px;
  color: #bbb;
  line-height: 1.4;
}
.no-data {
  color: #777;
  font-size: 13px;
  font-style: italic;
  margin-bottom: 10px;
}

.pool-actions {
  display: flex;
  align-items: center;
}
.icon-btn {
  background: transparent;
  border: none;
  font-size: 18px;
  cursor: pointer;
  opacity: 0.8;
  transition: transform 0.2s, opacity 0.2s;
  padding: 5px;
}
.icon-btn:hover {
  opacity: 1;
  transform: scale(1.1);
}
.delete-btn:hover {
  filter: hue-rotate(-30deg) brightness(1.2);
}
.edit-btn:hover {
  filter: hue-rotate(90deg) brightness(1.2);
}

.modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(3px);
}
.modal-content {
  background: #1a1a1a;
  padding: 25px;
  border-radius: 12px;
  width: 90%;
  max-width: 400px;
  border: 1px solid #333;
  box-shadow: 0 10px 25px rgba(0,0,0,0.5);
}
.modal-content h3 {
  margin-top: 0;
  color: #4CAF50;
  border-bottom: 1px solid #333;
  padding-bottom: 10px;
  margin-bottom: 15px;
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
.pool-tab {
  flex-wrap: wrap;
  align-items: flex-start;
  align-content: flex-start;
  gap: 20px;
  overflow-y: auto;
  padding: 20px;
}
.pool-tab > .section-block {
  flex: 1 1 350px;
  min-width: 300px;
  max-width: none;
  margin: 0 !important;
}

/* Specific Tab Layouts */
.live-tab {
  flex-direction: row;
}

.pool-tab, .new-tab, .vehicles-tab {
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
.primary-btn:hover {
  background-color: #4338ca;
}

/* Vehicles Tab Form */
.new-vehicle-form {
  display: flex;
  gap: 15px;
  align-items: flex-end;
  flex-wrap: wrap;
}
.new-vehicle-form .form-group {
  flex: 1;
  min-width: 200px;
}
.new-vehicle-form .primary-btn {
  height: 42px;
  padding: 0 20px;
  border-radius: 8px;
}

.grid-layout {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  margin-top: 15px;
  gap: 15px;
}
.read-only-item { 
  border-left: 4px solid #d35400; 
}

/* Mobil Uyum (Responsive Design) */
@media (max-width: 768px) {
  .admin-dashboard-modern {
    height: auto;
    min-height: 100vh;
  }
  .top-nav-tabs {
    flex-direction: column;
    height: auto;
    padding: 10px;
    gap: 10px;
  }
  .tabs-container {
    flex-wrap: wrap;
    justify-content: center;
  }
  .tab-content {
    overflow-y: auto;
  }
  .live-tab, .vehicles-tab, .pool-tab, .new-tab {
    flex-direction: column;
    padding: 10px;
    align-items: stretch;
  }
  .sidebar {
    width: 100%;
    border-right: none;
    border-bottom: 1px solid #333;
    max-height: none;
    padding: 10px;
    box-sizing: border-box;
  }
  .map-area {
    height: auto !important;
    padding: 10px;
    flex-grow: unset;
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
  .search-bar {
    width: 100%;
    margin-top: 10px;
  }
  .search-bar input {
    flex-grow: 1;
  }
  .mobile-toggle-icon {
    display: block;
    font-size: 20px;
    position: absolute;
    right: 20px;
    top: 20px;
  }
  .map-header {
    position: relative;
  }
  .collapsed-mobile .map-collapsible-content {
    display: none;
  }
  .map-area:not(.collapsed-mobile) .map-collapsible-content {
    height: 60vh;
    display: flex;
    flex-direction: column;
  }
  .map-area:not(.collapsed-mobile) .map-container {
    flex-grow: 1;
    min-height: 350px;
  }
}
</style>
