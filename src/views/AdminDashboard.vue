<template>
  <div class="admin-dashboard-modern">
    <!-- Top Navigation Tabs -->
    <div class="top-nav-tabs">
      <h2>👑 Yönetici Paneli</h2>
      <div class="tabs-container">
        <button :class="{ active: activeTab === 'dashboard' }" @click="setTab('dashboard')">📊 Özet</button>
        <button :class="{ active: activeTab === 'live' }" @click="setTab('live')">📍 Canlı Takip</button>
        <button :class="{ active: activeTab === 'pool' }" @click="setTab('pool')">📦 Paket Havuzu</button>
        <button :class="{ active: activeTab === 'new' }" @click="setTab('new')">📝 İş Emri Oluştur</button>
        <button :class="{ active: activeTab === 'vehicles' }" @click="setTab('vehicles')">🛵 Araç Yönetimi</button>
        <button :class="{ active: activeTab === 'couriers' }" @click="setTab('couriers')">👥 Kuryeler</button>
        <button :class="{ active: activeTab === 'locations' }" @click="setTab('locations')">📍 Lokasyonlar</button>
        <button :class="{ active: activeTab === 'reports' }" @click="setTab('reports')">📜 Raporlama</button>
      </div>
      <button @click="logout" class="logout-btn-top">Güvenli Çıkış</button>
    </div>

    <!-- TAB: ÖZET (DASHBOARD) -->
    <div class="tab-content dashboard-tab" v-if="activeTab === 'dashboard'">
      <div class="dashboard-grid">
        <div class="stat-card">
          <div class="stat-icon">📦</div>
          <div class="stat-value">{{ statTotalPackages }}</div>
          <div class="stat-label">Toplam Materyal</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">🚚</div>
          <div class="stat-value">{{ statInTransit }}</div>
          <div class="stat-label">Yolda</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">✅</div>
          <div class="stat-value">{{ statDelivered }}</div>
          <div class="stat-label">Teslim Edildi</div>
        </div>
        <div class="stat-card stat-card-warning">
          <div class="stat-icon">⚠️</div>
          <div class="stat-value">{{ statDamagedOrLost }}</div>
          <div class="stat-label">Hasarlı / Kayıp</div>
        </div>
      </div>

      <div class="section-block package-form full-width" style="margin-top: 20px;">
        <div class="panel-header-flex">
          <h3>🛵 Kurye Doluluk Oranları</h3>
          <button @click="loadDashboard" class="refresh-btn">🔄 Yenile</button>
        </div>
        <div v-if="courierOccupancy.length === 0" class="no-data">Sahada kurye bulunmuyor.</div>
        <ul v-else class="occupancy-list">
          <li v-for="row in courierOccupancy" :key="'occ-' + row.courierId" class="occupancy-row">
            <span class="occupancy-name">🛵 {{ row.name }}</span>
            <div class="occupancy-bar-track">
              <div class="occupancy-bar-fill" :style="{ width: row.rate + '%' }"></div>
            </div>
            <span class="occupancy-count">{{ row.count }} paket</span>
          </li>
        </ul>
        <p class="hint-text">
          Not: Backend'in <code>/dashboard</code> ucu bu alanları döndürmediyse (veya farklı bir formatta döndürdüyse)
          değerler mevcut paket/kurye listesinden anlık olarak hesaplanır.
        </p>
      </div>
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

          <!-- Kurye Devri (Nakil): Acil durumda kuryenin üzerindeki tüm paketleri tek tuşla başka kuryeye devret -->
          <div v-if="courierPackagesInTransit.length > 0 || courierPackagesPending.length > 0" class="transfer-box">
            <h4 class="sub-heading">🔁 Kurye Devri (Acil Durum)</h4>
            <select v-model="transferToCourierId" class="filter-select" style="width: 100%; margin-bottom: 8px;">
              <option value="">-- Devredilecek kurye seçin --</option>
              <option v-for="c in couriers.filter(c => c.id !== selectedCourierId)" :key="'tr-' + c.id" :value="c.id">🛵 {{ c.name }}</option>
            </select>
            <button @click="doTransferCourierPackages" class="assign-btn" style="background-color: #e67e22;" :disabled="!transferToCourierId">
              Tüm Paketleri Devret
            </button>
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
        
        <div class="input-group" style="display: flex; gap: 10px; margin-bottom: 15px;">
          <input type="text" v-model="poolFilterText" placeholder="Havuzda ara (Barkod, İçerik...)" style="flex: 1;" />
          <select v-model="poolPickupFilter" style="flex: 1;" class="filter-select">
            <option value="">-- Tüm Alınacak Noktalar --</option>
            <option v-for="loc in locations" :key="'pf-'+loc.id" :value="loc.id">{{ loc.name }}</option>
          </select>
          <select v-model="poolDropoffFilter" style="flex: 1;" class="filter-select">
            <option value="">-- Tüm Bırakılacak Noktalar --</option>
            <option v-for="loc in locations" :key="'df-'+loc.id" :value="loc.id">{{ loc.name }}</option>
          </select>
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
              :pickupName="getLocationName(pkg.pickupLocationId || pkg.PickupLocationId || pkg.pickupLocId || pkg.PickupLocId)"
              :dropoffName="getLocationName(pkg.dropoffLocationId || pkg.DropoffLocationId || pkg.dropoffLocId || pkg.DropoffLocId)"
              @toggle="togglePackageSelection"
              @edit-package="openEditPackageModal"
              @delete-package="removePackage"
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
        
        <div v-if="groupedAssignedPool.length === 0" class="no-data">
          Filtreye uygun atanmış ve bekleyen paket yok.
        </div>
        
        <div v-else>
          <div v-for="group in groupedAssignedPool" :key="'assigned-group-' + group.courierId" class="courier-package-group">
            <h4 class="group-header">🛵 {{ group.courierName }} <span class="badge" style="background-color: #f39c12; color: #fff;">{{ group.packages.length }} Paket</span></h4>
            <div class="pool-list grid-layout" style="margin-top: 10px;">
              <AdminPackageCard
                v-for="(pkg, index) in group.packages"
                :key="'pending-' + (pkg.id || pkg.Id || index)"
                :pkg="pkg"
                type="pending"
                :courierName="group.courierName"
                :pickupName="getLocationName(pkg.pickupLocationId || pkg.PickupLocationId || pkg.pickupLocId || pkg.PickupLocId)"
                :dropoffName="getLocationName(pkg.dropoffLocationId || pkg.DropoffLocationId || pkg.dropoffLocId || pkg.DropoffLocId)"
                @edit-package="openEditPackageModal"
                @delete-package="removePackage"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- KURYELERİN ÜZERİNDEKİ PAKETLER -->
      <div class="section-block package-form centered-panel full-width">
        <div class="panel-header-flex">
          <h3>🚚 Kuryedeki (Taşıma Aşamasında) Paketler</h3>
        </div>
        
        <div v-if="groupedInTransitPool.length === 0" class="no-data">
          Filtreye uygun taşınan paket yok.
        </div>
        
        <div v-else>
          <div v-for="group in groupedInTransitPool" :key="'transit-group-' + group.courierId" class="courier-package-group">
            <h4 class="group-header">🚚 {{ group.courierName }} <span class="badge" style="background-color: #27ae60; color: #fff;">{{ group.packages.length }} Paket</span></h4>
            <div class="pool-list grid-layout" style="margin-top: 10px;">
              <AdminPackageCard
                v-for="(pkg, index) in group.packages"
                :key="'transit-' + (pkg.id || pkg.Id || index)"
                :pkg="pkg"
                type="transit"
                :courierName="group.courierName"
                :pickupName="getLocationName(pkg.pickupLocationId || pkg.PickupLocationId || pkg.pickupLocId || pkg.PickupLocId)"
                :dropoffName="getLocationName(pkg.dropoffLocationId || pkg.DropoffLocationId || pkg.dropoffLocId || pkg.DropoffLocId)"
                @edit-package="openEditPackageModal"
                @delete-package="removePackage"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB: İŞ EMRİ OLUŞTUR -->
    <div class="tab-content new-tab" v-if="activeTab === 'new'">
      <div class="section-block package-form centered-panel">
        <h3>📝 Yeni İş Emri Oluştur</h3>
        <p class="hint-text" style="margin-top: -5px; margin-bottom: 15px;">
          "X noktasından alınacak, Y noktasına teslim edilecek" kurallı bir görev tanımlayın.
        </p>

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

        <div class="input-group">
          <label>Doğrudan Ata (Opsiyonel)</label>
          <select v-model="newPkg.assignedCourierId">
            <option value="">-- Havuza Bırak (Sonra Atanacak) --</option>
            <option v-for="c in couriers" :key="'newpkg-c-' + c.id" :value="c.id">🛵 {{ c.name }}</option>
          </select>
        </div>

        <p v-if="newPkgSummary" class="hint-text" style="background:#111; padding:10px; border-radius:6px; margin-top: 10px;">
          📋 {{ newPkgSummary }}
        </p>

        <button @click="createPackageToPool" class="assign-btn" :disabled="!isFormValid">
          İş Emrini Oluştur
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
                <span class="badge" style="background-color: #607d8b; color: white; padding: 3px 8px; border-radius: 5px; font-size: 0.85em;">{{ v.vehicleType || v.VehicleType }}</span>
              </div>
              <div class="pool-meta mt-2">
                <span class="chip" :class="(v.courierId || v.CourierId) ? 'chip-success' : 'chip-warning'" style="padding: 4px 10px; border-radius: 15px; font-size: 0.85em; display: inline-block;">
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

    <!-- TAB: KURYELER (KULLANICI TANIMLAMA) -->
    <div class="tab-content couriers-tab" v-if="activeTab === 'couriers'">
      <div class="section-block add-vehicle-section">
        <h3>👤 Yeni Kurye Ekle</h3>
        <form @submit.prevent="submitNewCourier" class="new-vehicle-form">
          <div class="form-group">
            <label>Kullanıcı Adı</label>
            <input type="text" v-model="newCourier.username" placeholder="Örn: kurye01" required />
          </div>
          <div class="form-group">
            <label>Şifre</label>
            <input type="password" v-model="newCourier.password" placeholder="******" required />
          </div>
          <div class="form-group">
            <label>Ad Soyad</label>
            <input type="text" v-model="newCourier.name" placeholder="Örn: Ahmet Yılmaz" required />
          </div>
          <div class="form-group">
            <label>Telefon (Opsiyonel)</label>
            <input type="text" v-model="newCourier.phone" placeholder="05xx xxx xx xx" />
          </div>
          <button type="submit" class="primary-btn" style="align-self: flex-end;">Kurye Ekle</button>
        </form>
      </div>

      <div class="section-block vehicles-list-section" style="margin-top: 20px;">
        <h3>📋 Mevcut Kuryeler ({{ couriers.length }})</h3>
        <div v-if="couriers.length === 0" class="no-data">Sistemde kayıtlı kurye yok.</div>
        <div class="grid-layout">
          <div v-for="c in couriers" :key="'crlist-' + c.id" class="pool-item premium-card read-only-item">
            <div class="pool-info">
              <div class="pool-header">
                <strong>{{ c.name }}</strong>
                <span class="badge" :style="{ backgroundColor: c.status === 'Aktif' ? '#27ae60' : '#607d8b', color: '#fff' }">{{ c.status }}</span>
              </div>
              <div class="pool-meta mt-2">
                <span class="chip chip-outline">🎒 {{ courierOnHandCounts[c.id] || 0 }} paket üzerinde</span>
              </div>
            </div>
            <div class="pool-actions">
              <button @click="openEditCourierModal(c)" class="icon-btn edit-btn" title="Kuryeyi Düzenle">✏️</button>
              <button @click="removeCourier(c.id)" class="icon-btn delete-btn" title="Kuryeyi Sil">🗑️</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB: LOKASYONLAR -->
    <div class="tab-content locations-tab" v-if="activeTab === 'locations'">
      <div class="section-block add-vehicle-section">
        <h3>📍 Yeni Lokasyon Ekle</h3>
        <form @submit.prevent="submitNewLocation" class="new-vehicle-form">
          <div class="form-group">
            <label>Ad (Hastane / Lab / Merkez)</label>
            <input type="text" v-model="newLocation.name" placeholder="Örn: AYBÜ Hastanesi" required />
          </div>
          <div class="form-group">
            <label>Enlem (Latitude)</label>
            <input type="number" step="any" v-model="newLocation.latitude" placeholder="39.9208" required />
          </div>
          <div class="form-group">
            <label>Boylam (Longitude)</label>
            <input type="number" step="any" v-model="newLocation.longitude" placeholder="32.8541" required />
          </div>
          <button type="submit" class="primary-btn" style="align-self: flex-end;">Lokasyon Ekle</button>
        </form>
      </div>

      <div class="section-block vehicles-list-section" style="margin-top: 20px;">
        <div class="panel-header-flex">
          <h3>📋 Mevcut Lokasyonlar ({{ locations.length }})</h3>
          <button @click="loadLocationsTab" class="refresh-btn">🔄 Yenile</button>
        </div>
        <div v-if="locations.length === 0" class="no-data">Sistemde kayıtlı lokasyon yok.</div>
        <div class="grid-layout">
          <div v-for="loc in locations" :key="'loclist-' + loc.id" class="pool-item premium-card read-only-item">
            <div class="pool-info">
              <div class="pool-header">
                <strong>{{ loc.name }}</strong>
              </div>
              <div class="pool-meta mt-2">
                <span class="chip chip-outline">🌐 {{ loc.latitude || loc.lat }}, {{ loc.longitude || loc.lng }}</span>
              </div>
            </div>
            <div class="pool-actions">
              <button @click="openEditLocationModal(loc)" class="icon-btn edit-btn" title="Lokasyonu Düzenle">✏️</button>
              <button @click="removeLocation(loc.id)" class="icon-btn delete-btn" title="Lokasyonu Sil">🗑️</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB: RAPORLAMA -->
    <div class="tab-content reports-tab" v-if="activeTab === 'reports'">
      <div class="section-block package-form centered-panel full-width">
        <div class="panel-header-flex">
          <h3>📜 Materyal Hareket Geçmişi (Chain-of-Custody)</h3>
          <button @click="loadReports" class="refresh-btn">🔄 Yenile</button>
        </div>
        <div class="input-group" style="display: flex; gap: 10px; margin-bottom: 15px;">
          <input type="text" v-model="historyFilterBarcode" placeholder="Barkod ile filtrele..." style="flex: 1;" @keyup.enter="loadReports" />
          <button @click="loadReports" class="assign-btn" style="width: auto; padding: 10px 20px; margin-top: 0;">Filtrele</button>
        </div>

        <div v-if="historyLoading" class="no-data">Yükleniyor...</div>
        <div v-else-if="packageHistories.length === 0" class="no-data">Kayıt bulunamadı.</div>
        <ul v-else class="detailed-pkg-list">
          <li v-for="(h, index) in packageHistories" :key="'hist-' + (h.id || h.Id || index)">
            <div class="pkg-main">
              <strong>{{ h.actionType || h.ActionType || h.action || 'İşlem' }}</strong>
              — Paket #{{ h.packageId || h.PackageId }}
            </div>
            <div class="pkg-sub">
              <small>
                🕒 {{ formatHistoryDate(h.actionTime || h.ActionTime) }}
                <span v-if="h.notes || h.Notes"> · 📝 {{ h.notes || h.Notes }}</span>
              </small>
            </div>
          </li>
        </ul>
      </div>
    </div>

    <!-- EDIT COURIER MODAL -->
    <div v-if="showEditCourierModal" class="modal-overlay" @click.self="showEditCourierModal = false">
      <div class="modal-content">
        <h3>✏️ Kurye Düzenle</h3>
        <form @submit.prevent="saveCourierEdit" class="new-vehicle-form edit-form">
          <div class="form-group" style="width: 100%">
            <label>Ad Soyad</label>
            <input type="text" v-model="editingCourier.name" required />
          </div>
          <div class="form-group" style="width: 100%">
            <label>Telefon</label>
            <input type="text" v-model="editingCourier.phone" />
          </div>
          <div class="form-group" style="width: 100%">
            <label>Durum</label>
            <select v-model="editingCourier.isActive">
              <option :value="true">Aktif</option>
              <option :value="false">Pasif</option>
            </select>
          </div>
          <div class="modal-actions" style="margin-top: 20px; display: flex; justify-content: flex-end; gap: 10px; width: 100%">
            <button type="button" class="logout-btn-top" @click="showEditCourierModal = false">İptal</button>
            <button type="submit" class="primary-btn">Kaydet</button>
          </div>
        </form>
      </div>
    </div>

    <!-- EDIT LOCATION MODAL -->
    <div v-if="showEditLocationModal" class="modal-overlay" @click.self="showEditLocationModal = false">
      <div class="modal-content">
        <h3>✏️ Lokasyon Düzenle</h3>
        <form @submit.prevent="saveLocationEdit" class="new-vehicle-form edit-form">
          <div class="form-group" style="width: 100%">
            <label>Ad</label>
            <input type="text" v-model="editingLocation.name" required />
          </div>
          <div class="form-group" style="width: 100%">
            <label>Enlem (Latitude)</label>
            <input type="number" step="any" v-model="editingLocation.latitude" required />
          </div>
          <div class="form-group" style="width: 100%">
            <label>Boylam (Longitude)</label>
            <input type="number" step="any" v-model="editingLocation.longitude" required />
          </div>
          <div class="modal-actions" style="margin-top: 20px; display: flex; justify-content: flex-end; gap: 10px; width: 100%">
            <button type="button" class="logout-btn-top" @click="showEditLocationModal = false">İptal</button>
            <button type="submit" class="primary-btn">Kaydet</button>
          </div>
        </form>
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
            <label>Alınacak Nokta</label>
            <select v-model="editingPackage.pickupLocationId" required>
              <option v-for="loc in locations" :key="'e-p-' + loc.id" :value="loc.id">{{ loc.name }}</option>
            </select>
          </div>
          <div class="form-group" style="width: 100%">
            <label>Bırakılacak Nokta</label>
            <select v-model="editingPackage.dropoffLocationId" required>
              <option v-for="loc in locations" :key="'e-d-' + loc.id" :value="loc.id">{{ loc.name }}</option>
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
      activeTab: 'dashboard',
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
      poolPickupFilter: '',
      poolDropoffFilter: '',
      barcodeSearch: '',
      newPkg: {
        barcode: '',
        description: '',
        priority: 1,
        pickupLocationId: '',
        dropoffLocationId: '',
        assignedCourierId: ''
      },
      isMapVisibleOnMobile: false,

      // Telemetry Data
      lastUpdate: 'Henüz güncellenmedi',
      pollingTimer: null,
      mockAdminPosition: null,
      activeCourierRoute: null,

      // Dashboard (Özet) verisi — /dashboard'dan gelen ham veri, şema teyit edilemediği için
      // computed alanlar bunu okuyamazsa packages/couriers listesinden hesaplanmış değere düşer.
      dashboardStats: null,

      // Kurye Devri (Nakil)
      transferToCourierId: '',

      // Kuryeler (Kullanıcı Tanımlama)
      showEditCourierModal: false,
      newCourier: { username: '', password: '', name: '', phone: '' },
      editingCourier: { id: null, name: '', phone: '', isActive: true },

      // Lokasyonlar
      showEditLocationModal: false,
      newLocation: { name: '', latitude: '', longitude: '' },
      editingLocation: { id: null, name: '', latitude: '', longitude: '' },

      // Raporlama
      packageHistories: [],
      historyFilterBarcode: '',
      historyLoading: false,

      // Kuryelerin o an üzerinde taşıdığı paket sayısı (GET /couriers/onhand)
      courierOnHandCounts: {}
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
      const pickupFilter = this.poolPickupFilter;
      const dropoffFilter = this.poolDropoffFilter;
      
      return this.pendingPool.filter(p => {
        const barcode = p.barcode || p.Barcode || '';
        const desc = p.description || p.Description || '';
        const matchesText = !lowerFilter || String(barcode).toLowerCase().includes(lowerFilter) || String(desc).toLowerCase().includes(lowerFilter);
        
        const pickupLoc = p.pickupLocationId || p.PickupLocationId;
        const matchesPickup = !pickupFilter || String(pickupLoc) === String(pickupFilter);
        
        const dropoffLoc = p.dropoffLocationId || p.DropoffLocationId;
        const matchesDropoff = !dropoffFilter || String(dropoffLoc) === String(dropoffFilter);
        
        return matchesText && matchesPickup && matchesDropoff;
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
    groupedAssignedPool() {
      const groups = {};
      this.filteredAssignedPendingPool.forEach(pkg => {
        const courierId = pkg.assignedCourierId || pkg.AssignedCourierId;
        if (!groups[courierId]) {
          groups[courierId] = {
            courierId,
            courierName: this.getCourierName(courierId),
            packages: []
          };
        }
        groups[courierId].packages.push(pkg);
      });
      return Object.values(groups).sort((a, b) => a.courierName.localeCompare(b.courierName));
    },
    groupedInTransitPool() {
      const groups = {};
      this.filteredInTransitPool.forEach(pkg => {
        const courierId = pkg.assignedCourierId || pkg.AssignedCourierId;
        if (!groups[courierId]) {
          groups[courierId] = {
            courierId,
            courierName: this.getCourierName(courierId),
            packages: []
          };
        }
        groups[courierId].packages.push(pkg);
      });
      return Object.values(groups).sort((a, b) => a.courierName.localeCompare(b.courierName));
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
        // PackageStatus enum'ında kuryenin elindeki paket için hem "PickedUp" hem
        // "InTransit" geçerli (bkz. inTransitPool) — sadece InTransit'e bakınca
        // henüz InTransit'e geçmemiş yeni alınmış paketler listeden düşüyordu.
        return courierId === this.selectedCourierId && (status === 'PickedUp' || status === 'InTransit');
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
    },
    newPkgSummary() {
      if (!this.newPkg.pickupLocationId || !this.newPkg.dropoffLocationId) return '';
      const pickup = this.getLocationName(this.newPkg.pickupLocationId);
      const dropoff = this.getLocationName(this.newPkg.dropoffLocationId);
      const assignPart = this.newPkg.assignedCourierId
        ? ` ve doğrudan ${this.getCourierName(this.newPkg.assignedCourierId)} kuryesine atanacak.`
        : ' ve havuza düşecek (sonra atanabilir).';
      return `${pickup} noktasından alınacak, ${dropoff} noktasına teslim edilecek${assignPart}`;
    },

    // --- Dashboard (Özet) istatistikleri ---
    // Backend /dashboard'un tam alan adları teyit edilemediğinden, önce ham cevaptaki
    // olası alan adları denenir; bulunamazsa packages listesinden anlık hesaplanır.
    statTotalPackages() {
      const d = this.dashboardStats;
      const fromApi = d && (d.totalPackages ?? d.TotalPackages ?? d.total);
      if (typeof fromApi === 'number') return fromApi;
      return Array.isArray(this.packages) ? this.packages.length : 0;
    },
    statInTransit() {
      const d = this.dashboardStats;
      const fromApi = d && (d.inTransit ?? d.InTransit ?? d.onTheWay);
      if (typeof fromApi === 'number') return fromApi;
      if (!Array.isArray(this.packages)) return 0;
      return this.packages.filter(p => {
        const status = p.status || p.Status;
        return status === 'PickedUp' || status === 'InTransit';
      }).length;
    },
    statDelivered() {
      const d = this.dashboardStats;
      const fromApi = d && (d.delivered ?? d.Delivered);
      if (typeof fromApi === 'number') return fromApi;
      if (!Array.isArray(this.packages)) return 0;
      return this.packages.filter(p => (p.status || p.Status) === 'Delivered').length;
    },
    statDamagedOrLost() {
      const d = this.dashboardStats;
      const fromApi = d && (d.damagedOrLost ?? d.DamagedOrLost ?? ((d.damaged ?? 0) + (d.lost ?? 0)));
      if (typeof fromApi === 'number' && fromApi > 0) return fromApi;
      if (!Array.isArray(this.packages)) return 0;
      return this.packages.filter(p => {
        const status = p.status || p.Status;
        return status === 'Damaged' || status === 'Lost';
      }).length;
    },
    courierOccupancy() {
      const d = this.dashboardStats;
      const fromApi = d && (d.courierOccupancy || d.CourierOccupancy);
      if (Array.isArray(fromApi) && fromApi.length > 0) {
        return fromApi.map(row => ({
          courierId: row.courierId ?? row.CourierId,
          name: row.name ?? row.Name ?? row.courierName ?? 'Bilinmeyen',
          count: row.count ?? row.Count ?? row.activeCount ?? 0,
          rate: row.rate ?? row.Rate ?? row.occupancyRate ?? 0
        }));
      }
      // Yedek: her kuryenin o an üzerinde taşıdığı (PickedUp/InTransit) paket sayısını,
      // en yoğun kuryeye göre orantılayarak bir doluluk çubuğu üretir.
      if (!Array.isArray(this.couriers) || this.couriers.length === 0) return [];
      const counts = this.couriers.map(c => {
        const count = Array.isArray(this.packages) ? this.packages.filter(p => {
          const courierId = p.assignedCourierId !== undefined ? p.assignedCourierId : p.AssignedCourierId;
          const status = p.status || p.Status;
          return courierId === c.id && (status === 'PickedUp' || status === 'InTransit');
        }).length : 0;
        return { courierId: c.id, name: c.name, count };
      });
      const maxCount = Math.max(1, ...counts.map(c => c.count));
      return counts.map(c => ({ ...c, rate: Math.round((c.count / maxCount) * 100) }));
    }
  },
  async mounted() {
    this.lastUpdate = new Date().toLocaleTimeString();
    await this.setTab('dashboard');
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
        if (this.couriers.length === 0) {
          try { this.couriers = await dataService.getCouriers(); } catch (e) { console.warn(e); }
        }
      }

      if (tabName === 'vehicles') {
        if (this.couriers.length === 0) {
          try { this.couriers = await dataService.getCouriers(); } catch (e) { console.warn(e); }
        }
        await this.loadVehicles();
      }

      if (tabName === 'dashboard') {
        if (this.couriers.length === 0) {
          try { this.couriers = await dataService.getCouriers(); } catch (e) { console.warn(e); }
        }
        if (this.packages.length === 0) {
          try {
            let res = await dataService.getAllPackages();
            this.packages = Array.isArray(res) ? res : (res?.items || res?.data || []);
          } catch (e) { console.warn(e); }
        }
        await this.loadDashboard();
      }

      if (tabName === 'couriers') {
        try { this.couriers = await dataService.getCouriers(); } catch (e) { console.warn(e); toast.error("Kuryeler yüklenemedi"); }
        await this.loadCourierOnHandCounts();
      }

      if (tabName === 'locations') {
        await this.loadLocationsTab();
      }

      if (tabName === 'reports') {
        await this.loadReports();
      }
    },
    async loadCourierOnHandCounts() {
      try {
        const onHand = await dataService.getCourierOnHand();
        const counts = {};
        onHand.forEach(pkg => {
          const courierId = pkg.courierId ?? pkg.CourierId ?? pkg.assignedCourierId ?? pkg.AssignedCourierId;
          if (courierId === undefined || courierId === null) return;
          counts[courierId] = (counts[courierId] || 0) + 1;
        });
        this.courierOnHandCounts = counts;
      } catch (e) {
        console.warn("Kuryelerin üzerindeki paketler (onhand) çekilemedi.", e);
        this.courierOnHandCounts = {};
      }
    },
    async loadDashboard() {
      try {
        this.dashboardStats = await dataService.getDashboard();
      } catch (e) {
        console.warn("Dashboard özet verisi çekilemedi, yerel hesaplamaya geçiliyor.", e);
        this.dashboardStats = null;
      }
    },
    async doTransferCourierPackages() {
      if (!this.transferToCourierId) return;
      const fromCourier = this.getCourierName(this.selectedCourierId);
      const toCourier = this.getCourierName(this.transferToCourierId);
      if (!confirm(`"${fromCourier}" kuryesindeki TÜM sonuçlanmamış paketler "${toCourier}" kuryesine devredilecek. Onaylıyor musunuz?`)) return;

      try {
        await dataService.transferCourierPackages(this.selectedCourierId, this.transferToCourierId);
        toast.success(`Paketler ${toCourier} kuryesine devredildi.`);
        this.transferToCourierId = '';
        await this.fetchData();
      } catch (err) {
        let msg = "Kurye devri sırasında bir hata oluştu";
        if (err.response && err.response.data) {
          if (typeof err.response.data === 'string') msg = err.response.data;
          else if (err.response.data.message) msg = err.response.data.message;
          else if (err.response.data.title) msg = err.response.data.title;
        }
        toast.error(msg);
      }
    },
    async submitNewCourier() {
      try {
        const payload = { ...this.newCourier };
        await dataService.addCourier(payload);
        toast.success("Kurye başarıyla eklendi");
        this.newCourier = { username: '', password: '', name: '', phone: '' };
        this.couriers = await dataService.getCouriers();
      } catch (err) {
        let msg = "Kurye eklenirken hata oluştu";
        if (err.response && err.response.data) {
          if (typeof err.response.data === 'string') msg = err.response.data;
          else if (err.response.data.message) msg = err.response.data.message;
          else if (err.response.data.title) msg = err.response.data.title;
        }
        toast.error(msg);
      }
    },
    async removeCourier(id) {
      if (!confirm("Bu kuryeyi silmek istediğinize emin misiniz?")) return;
      try {
        await dataService.deleteCourier(id);
        toast.success("Kurye başarıyla silindi");
        this.couriers = await dataService.getCouriers();
      } catch (err) {
        let msg = "Kurye silinirken hata oluştu (ilişkili kaydı olabilir)";
        if (err.response && err.response.data) {
          if (typeof err.response.data === 'string') msg = err.response.data;
          else if (err.response.data.message) msg = err.response.data.message;
          else if (err.response.data.title) msg = err.response.data.title;
        }
        toast.error(msg);
      }
    },
    openEditCourierModal(courier) {
      this.editingCourier = {
        id: courier.id,
        name: courier.name,
        phone: courier.phone || '',
        isActive: courier.status === 'Aktif'
      };
      this.showEditCourierModal = true;
    },
    async saveCourierEdit() {
      try {
        await dataService.updateCourier(this.editingCourier.id, { ...this.editingCourier });
        toast.success("Kurye başarıyla güncellendi");
        this.showEditCourierModal = false;
        this.couriers = await dataService.getCouriers();
      } catch (err) {
        let msg = "Kurye güncellenirken hata oluştu";
        if (err.response && err.response.data) {
          if (typeof err.response.data === 'string') msg = err.response.data;
          else if (err.response.data.message) msg = err.response.data.message;
          else if (err.response.data.title) msg = err.response.data.title;
        }
        toast.error(msg);
      }
    },
    async loadLocationsTab() {
      try {
        this.locations = await dataService.getLocations(true);
      } catch (e) {
        console.warn(e);
        toast.error("Lokasyonlar yüklenemedi");
      }
    },
    async submitNewLocation() {
      try {
        const payload = {
          name: this.newLocation.name,
          latitude: parseFloat(this.newLocation.latitude),
          longitude: parseFloat(this.newLocation.longitude)
        };
        await dataService.addLocation(payload);
        toast.success("Lokasyon başarıyla eklendi");
        this.newLocation = { name: '', latitude: '', longitude: '' };
        await this.loadLocationsTab();
      } catch (err) {
        let msg = "Lokasyon eklenirken hata oluştu";
        if (err.response && err.response.data) {
          if (typeof err.response.data === 'string') msg = err.response.data;
          else if (err.response.data.message) msg = err.response.data.message;
          else if (err.response.data.title) msg = err.response.data.title;
        }
        toast.error(msg);
      }
    },
    async removeLocation(id) {
      if (!confirm("Bu lokasyonu silmek istediğinize emin misiniz?")) return;
      try {
        await dataService.deleteLocation(id);
        toast.success("Lokasyon başarıyla silindi");
        await this.loadLocationsTab();
      } catch (err) {
        let msg = "Lokasyon silinirken hata oluştu (ilişkili kaydı olabilir)";
        if (err.response && err.response.data) {
          if (typeof err.response.data === 'string') msg = err.response.data;
          else if (err.response.data.message) msg = err.response.data.message;
          else if (err.response.data.title) msg = err.response.data.title;
        }
        toast.error(msg);
      }
    },
    openEditLocationModal(loc) {
      this.editingLocation = {
        id: loc.id,
        name: loc.name,
        latitude: loc.latitude ?? loc.lat,
        longitude: loc.longitude ?? loc.lng
      };
      this.showEditLocationModal = true;
    },
    async saveLocationEdit() {
      try {
        const payload = {
          name: this.editingLocation.name,
          latitude: parseFloat(this.editingLocation.latitude),
          longitude: parseFloat(this.editingLocation.longitude)
        };
        await dataService.updateLocation(this.editingLocation.id, payload);
        toast.success("Lokasyon başarıyla güncellendi");
        this.showEditLocationModal = false;
        await this.loadLocationsTab();
      } catch (err) {
        let msg = "Lokasyon güncellenirken hata oluştu";
        if (err.response && err.response.data) {
          if (typeof err.response.data === 'string') msg = err.response.data;
          else if (err.response.data.message) msg = err.response.data.message;
          else if (err.response.data.title) msg = err.response.data.title;
        }
        toast.error(msg);
      }
    },
    async loadReports() {
      this.historyLoading = true;
      try {
        const params = this.historyFilterBarcode.trim() ? { barcode: this.historyFilterBarcode.trim() } : {};
        this.packageHistories = await dataService.getPackageHistories(params);
      } catch (e) {
        console.warn(e);
        toast.error("Raporlama verisi yüklenemedi");
        this.packageHistories = [];
      } finally {
        this.historyLoading = false;
      }
    },
    formatHistoryDate(dateStr) {
      if (!dateStr) return '-';
      const d = new Date(dateStr);
      return isNaN(d.getTime()) ? dateStr : d.toLocaleString('tr-TR');
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
    async removePackage(id) {
      if (!confirm("Bu paketi tamamen silmek istediğinize emin misiniz?")) return;
      try {
        await dataService.deletePackage(id);
        toast.success("Paket başarıyla silindi");
        await this.loadPoolData();
      } catch (err) {
        let msg = "Paket silinirken hata oluştu";
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
        pickupLocationId: pkg.pickupLocationId || pkg.PickupLocationId || pkg.pickupLocId || pkg.PickupLocId,
        dropoffLocationId: pkg.dropoffLocationId || pkg.DropoffLocationId || pkg.dropoffLocId || pkg.DropoffLocId
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
        
        // Ensure locations are integers
        payload.pickupLocationId = parseInt(payload.pickupLocationId);
        payload.dropoffLocationId = parseInt(payload.dropoffLocationId);
        
        // Ensure PascalCase equivalents are present to satisfy strict backend binders
        payload.PickupLocationId = payload.pickupLocationId;
        payload.DropoffLocationId = payload.dropoffLocationId;
        
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
      const assignedCourierId = this.newPkg.assignedCourierId ? parseInt(this.newPkg.assignedCourierId) : null;
      const payload = {
        barcode: this.newPkg.barcode.trim() || `SYS-${Date.now().toString().slice(-4)}`,
        description: this.newPkg.description,
        priority: this.newPkg.priority,
        pickupLocationId: this.newPkg.pickupLocationId,
        dropoffLocationId: this.newPkg.dropoffLocationId,
        assignedCourierId // Boşsa Havuza düşer, doluysa doğrudan o kuryeye atanır
      };

      await dataService.createPackage(payload);
      await this.fetchData();

      this.newPkg = {
        barcode: '',
        description: '',
        priority: 1,
        pickupLocationId: '',
        dropoffLocationId: '',
        assignedCourierId: ''
      };

      toast.info(assignedCourierId ? "İş emri oluşturuldu ve kuryeye atandı!" : "İş emri oluşturuldu ve havuza eklendi!");
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

.pool-tab, .new-tab, .vehicles-tab, .dashboard-tab, .couriers-tab, .locations-tab, .reports-tab {
  padding: 20px;
  overflow-y: auto;
  align-items: flex-start;
  justify-content: center;
}
.dashboard-tab, .couriers-tab, .locations-tab, .reports-tab {
  flex-direction: column;
  width: 100%;
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
/* Kurye Grupları için Stiller */
.courier-package-group {
  margin-bottom: 25px;
  background: rgba(40, 40, 40, 0.6);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
  padding: 15px;
}

.group-header {
  font-size: 16px;
  font-weight: 700;
  color: #fff;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 2px solid rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  gap: 10px;
}

.filter-select {
  padding: 10px 14px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  background: #2a2a2a;
  font-size: 14px;
  color: #fff;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
  cursor: pointer;
}
.filter-select:focus {
  border-color: #4CAF50;
  box-shadow: 0 0 0 3px rgba(76, 175, 80, 0.2);
}

.vehicles-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
  margin-top: 20px;
}
.vehicle-card {
  background: rgba(30, 30, 30, 0.7);
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  flex-direction: column;
  transition: transform 0.2s, box-shadow 0.2s;
}
.vehicle-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
  border-color: rgba(255, 255, 255, 0.2);
}
.vehicle-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}
.vehicle-plate {
  font-size: 18px;
  font-weight: 700;
  color: #fff;
}
.vehicle-status {
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 20px;
  font-weight: 600;
}
.status-active { background: #1f3a20; color: #a5d6a7; }
.status-inactive { background: #3d2613; color: #f39c12; }

.vehicle-body {
  flex: 1;
  font-size: 14px;
  color: #bbb;
  margin-bottom: 15px;
}
.vehicle-info-row {
  display: flex;
  margin-bottom: 8px;
}
.vehicle-info-label {
  font-weight: 600;
  width: 70px;
  color: #888;
}

.vehicle-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
.btn-icon {
  background: #333;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  color: #fff;
}
.btn-icon:hover {
  background: #444;
  transform: scale(1.05);
}
.btn-icon.delete:hover {
  background: #5a2a2a;
  border-color: #ffcccc;
}

/* Dashboard (Özet) Sekmesi */
.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 15px;
  width: 100%;
  max-width: 900px;
}
.stat-card {
  background: rgba(30, 30, 30, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 20px;
  text-align: center;
}
.stat-card-warning {
  border-color: rgba(255, 152, 0, 0.4);
}
.stat-icon {
  font-size: 26px;
  margin-bottom: 8px;
}
.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: #fff;
}
.stat-label {
  font-size: 12px;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-top: 4px;
}
.occupancy-list {
  list-style: none;
  padding: 0;
  margin: 0;
}
.occupancy-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
}
.occupancy-name {
  width: 160px;
  flex-shrink: 0;
  font-size: 13px;
  color: #ddd;
}
.occupancy-bar-track {
  flex-grow: 1;
  height: 10px;
  background: #111;
  border-radius: 5px;
  overflow: hidden;
}
.occupancy-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #4CAF50, #8bc34a);
  border-radius: 5px;
  transition: width 0.3s ease;
}
.occupancy-count {
  width: 70px;
  flex-shrink: 0;
  text-align: right;
  font-size: 12px;
  color: #aaa;
}
.hint-text {
  margin-top: 15px;
  font-size: 11px;
  color: #666;
  font-style: italic;
}

/* Kurye Devri Kutusu */
.transfer-box {
  margin-top: 15px;
  padding-top: 15px;
  border-top: 1px dashed #444;
}
</style>
