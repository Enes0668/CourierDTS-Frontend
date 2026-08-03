<template>
  <div :class="isModal ? 'pkg-card' : 'pkg-item'" :style="isModal ? 'display:flex; align-items:center; gap:15px;' : ''">
    
    <!-- Modal (Checkbox'lı) Görünüm -->
    <input 
      v-if="isModal"
      type="checkbox" 
      :value="packageId" 
      :checked="selected"
      @change="$emit('toggle', packageId, $event.target.checked)"
      style="transform: scale(1.5);" 
    />
    
    <div :style="isModal ? 'flex-grow:1;' : ''">
      <div class="pkg-header">
        <strong v-if="isModal">{{ barcode }}</strong>
        <span v-else class="barcode">{{ barcode }}</span>
        <span :class="['priority-badge', 'p-' + priority]">
          {{ isModal ? 'Öncelik: ' + priority : 'P' + priority }}
        </span>
      </div>
      
      <div :class="isModal ? '' : 'pkg-body'">
        <p :class="isModal ? 'pkg-desc' : 'pkg-desc'" :style="isModal ? 'margin:5px 0;' : ''">
          {{ description }}
        </p>
        
        <template v-if="!isModal">
          <small v-if="type === 'my'">Hedef: <strong>{{ targetName }}</strong></small>
          <small v-else>Rota: <strong>{{ pickupName }}</strong> ➔ <strong>{{ targetName }}</strong></small>
          
          <button v-if="showUndo" @click="$emit('undo', pkg)" class="undo-btn">🔙 Geri Bırak (İptal)</button>
        </template>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'CourierPackageCard',
  props: {
    pkg: {
      type: Object,
      required: true
    },
    /**
     * 'my' (üzerimdeki paketler), 'pending' (bekleyen atamalar)
     */
    type: {
      type: String,
      default: 'my'
    },
    /**
     * Modal içinde gösteriliyorsa true olur (checkbox'lı ve farklı stiller)
     */
    isModal: {
      type: Boolean,
      default: false
    },
    selected: {
      type: Boolean,
      default: false
    },
    pickupName: {
      type: String,
      default: ''
    },
    targetName: {
      type: String,
      default: ''
    },
    showUndo: {
      type: Boolean,
      default: false
    }
  },
  computed: {
    packageId() {
      return this.pkg.id || this.pkg.Id;
    },
    barcode() {
      return this.pkg.barcode || this.pkg.Barcode || 'İsimsiz Paket';
    },
    priority() {
      return this.pkg.priority || this.pkg.Priority || 1;
    },
    description() {
      return this.pkg.description || this.pkg.Description || 'İsimsiz Paket';
    }
  }
}
</script>
