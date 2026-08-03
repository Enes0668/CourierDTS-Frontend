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
    <div class="pool-actions" style="display: flex; align-items: center;">
      <button @click.prevent="$emit('edit-package', pkg)" class="icon-btn edit-btn" style="background:transparent; border:none; font-size:18px; cursor:pointer;" title="Paketi Düzenle">✏️</button>
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
