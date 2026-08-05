<template>
  <div class="pool-item premium-card" :class="cardClasses">
    
    <!-- Havuz (Checkbox'lı) Görünümü -->
    <input 
      v-if="type === 'pool'" 
      type="checkbox" 
      :value="packageId" 
      :checked="selected" 
      @change="onToggle" 
      class="custom-checkbox" 
    />

    <div class="pool-info">
      <div class="pool-header">
        <strong>{{ barcode }}</strong>
        <span class="badge badge-priority">P{{ priority }}</span>
      </div>
      <div class="pool-desc">{{ description }}</div>
      <div class="pool-locations" style="font-size: 12px; color: #bbb; margin-top: 4px;">
        <span v-if="pickupName || dropoffName">
          <i class="icon">📍</i> {{ pickupName || 'Bilinmiyor' }} ➔ {{ dropoffName || 'Bilinmiyor' }}
        </span>
      </div>
      
      <!-- Atanmış / Transit (Sadece Okuma) Görünümü İçin Alt Bilgi -->
      <div v-if="type !== 'pool'" class="pool-meta mt-2" :class="{ 'flex-gap': type === 'transit' }">
        <span class="chip" :class="type === 'transit' ? 'chip-success' : 'chip-warning'">
          <i class="icon">{{ type === 'transit' ? '🚚' : '🛵' }}</i> {{ courierName }}
        </span>
        <span v-if="type === 'transit'" class="chip chip-outline">
          {{ status }}
        </span>
      </div>
    </div>

    <!-- Edit Actions -->
    <div class="pool-actions" style="display: flex; align-items: center; gap: 8px;">
      <button @click.prevent="$emit('edit-package', pkg)" class="icon-btn edit-btn" style="background:transparent; border:none; font-size:18px; cursor:pointer;" title="Paketi Düzenle">✏️</button>
      <button @click.prevent="$emit('delete-package', packageId)" class="icon-btn delete-btn" style="background:transparent; border:none; font-size:18px; cursor:pointer;" title="Paketi Sil">🗑️</button>
    </div>

  </div>
</template>

<script>
export default {
  name: 'AdminPackageCard',
  props: {
    /**
     * Paket nesnesinin kendisi
     */
    pkg: {
      type: Object,
      required: true
    },
    /**
     * 'pool' (havuz), 'pending' (atanmış-bekleyen), 'transit' (kuryede)
     */
    type: {
      type: String,
      default: 'pool'
    },
    /**
     * Kurye adı (Atanmış ve Transit modlarında gösterilir)
     */
    courierName: {
      type: String,
      default: 'Bilinmeyen'
    },
    /**
     * Havuz modunda checkbox'ın seçili olup olmadığı
     */
    selected: {
      type: Boolean,
      default: false
    },
    /**
     * Alınacak noktanın adı
     */
    pickupName: {
      type: String,
      default: ''
    },
    /**
     * Bırakılacak noktanın adı
     */
    dropoffName: {
      type: String,
      default: ''
    }
  },
  computed: {
    packageId() {
      return this.pkg.id || this.pkg.Id;
    },
    barcode() {
      return this.pkg.barcode || this.pkg.Barcode || 'İsimsiz';
    },
    priority() {
      return this.pkg.priority || this.pkg.Priority || 1;
    },
    description() {
      return this.pkg.description || this.pkg.Description || '';
    },
    status() {
      return this.pkg.status || this.pkg.Status || '';
    },
    cardClasses() {
      return {
        'read-only-item': this.type !== 'pool',
        'pending-border': this.type === 'pending',
        'transit-border': this.type === 'transit'
      };
    }
  },
  methods: {
    onToggle(event) {
      this.$emit('toggle', this.packageId, event.target.checked);
    }
  }
}
</script>

<style scoped>
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
.pool-locations {
  font-size: 12px;
  color: #bbb;
  margin-top: 4px;
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
</style>
