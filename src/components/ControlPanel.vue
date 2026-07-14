<template>
  <div class="control-panel">
    <div class="input-group">
      <label for="start">Başlangıç Noktası:</label>
      <select id="start" v-model="selectedStart" :disabled="isRouteActive">
        <option value="" disabled>Seçiniz...</option>
        <option v-for="loc in locations" :key="loc.id" :value="loc">
          {{ loc.name }}
        </option>
      </select>
    </div>

    <div class="input-group">
      <label for="end">Bitiş Noktası:</label>
      <select id="end" v-model="selectedEnd" :disabled="isRouteActive">
        <option value="" disabled>Seçiniz...</option>
        <option v-for="loc in locations" :key="loc.id" :value="loc">
          {{ loc.name }}
        </option>
      </select>
    </div>

    <div class="action-area">
      <button 
        v-if="!isRouteActive"
        class="btn draw-btn" 
        @click="onDrawRoute" 
        :disabled="!selectedStart || !selectedEnd"
      >
        Güzergahı Çiz
      </button>

      <button 
        v-if="isRouteActive && isDelivered && !showConfirmation" 
        class="btn delivered-btn" 
        @click="handleDeliveredChoice"
      >
        ✅ Teslim Edildi
      </button>

      <button 
        v-if="isRouteActive && !showConfirmation"
        class="btn cancel-btn" 
        @click="showConfirmation = true"
      >
        Paketi İptal Et
      </button>

      <div v-if="showConfirmation" class="confirmation-dialog">
        <span class="confirm-text">İşlemi iptal etmek istiyor musun?</span>
        <div class="confirm-actions">
          <button class="btn btn-no" @click="handleCancelChoice(false)">Hayır, İstemiyorum</button>
          <button class="btn btn-yes" @click="handleCancelChoice(true)">Evet, İptal Et</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, defineEmits, watch } from 'vue';
import { locations } from '../data/locations'; // Hazırladığımız verileri çekiyoruz, *************aktif konumdan listede yok******************

// eslint-disable-next-line no-undef
defineProps({
  isDelivered: Boolean
});

// eslint-disable-next-line no-undef
const emit = defineEmits(['route-planned', 'selection-changed', 'delivery-success', 'delivery-cancelled']);

// Kullanıcının seçimlerini tutacak reaktif değişkenler
const selectedStart = ref('');
const selectedEnd = ref('');

// Durum (State) Yönetimi Değişkenleri
const isRouteActive = ref(false); // Rota aktif mi?
const showConfirmation = ref(false); // Onay kutusu açık mı?

// Seçimler değiştikçe önizleme fırlat
watch([selectedStart, selectedEnd], ([newStart, newEnd]) => {
  if (!isRouteActive.value) {
    emit('selection-changed', { start: newStart, end: newEnd });
  }
});

// Güzergahı Çiz Butonu Fonksiyonu
const onDrawRoute = () => {
  if (selectedStart.value && selectedEnd.value) {
    isRouteActive.value = true; // Arayüzü kilitle
    emit('route-planned', {
      start: selectedStart.value,
      end: selectedEnd.value
    });
  }
};

// Teslim Edildi butonuna basıldığında
const handleDeliveredChoice = () => {
  isRouteActive.value = false;
  selectedStart.value = '';
  selectedEnd.value = '';
  // Şefe (App.vue) "Teslimat Başarılı" bilgisini ver
  emit('delivery-success'); 
};

// İptal Onay/Red Fonksiyonu
const handleCancelChoice = (isConfirmed) => {
  if (isConfirmed) {
    isRouteActive.value = false;
    showConfirmation.value = false;
    selectedStart.value = '';
    selectedEnd.value = '';
    // Şefe (App.vue) "Teslimat İptal Edildi" bilgisini ver
    emit('delivery-cancelled'); 
  } else {
    showConfirmation.value = false;
  }
};
</script>

<style scoped>
.control-panel {
  display: flex;
  gap: 20px;
  background-color: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  margin-bottom: 20px;
  align-items: flex-end;
}

.input-group {
  display: flex;
  flex-direction: column;
  flex: 1;
}

label {
  font-weight: 600;
  margin-bottom: 8px;
  color: #2c3e50;
}

select {
  padding: 12px;
  border: 1px solid #ced4da;
  border-radius: 6px;
  font-size: 16px;
  outline: none;
  cursor: pointer;
  background-color: white; /* Kilitsiz durum için arka plan */
}

/* Menü kilitliykenki görünümü */
select:disabled {
  background-color: #e9ecef;
  cursor: not-allowed;
  color: #6c757d;
}

select:focus:not(:disabled) {
  border-color: #42b983;
}

/* YENİ: Butonlar üst üste bindiğinde dikey sıralanması için güncellendi */
.action-area {
  min-width: 180px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: center;
  justify-content: center;
}

/* Genel Buton Stili */
.btn {
  padding: 12px 20px;
  border: none;
  border-radius: 6px;
  font-size: 15px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s;
  width: 100%; /* Buton genişlikleri eşitlendi */
  box-sizing: border-box;
}

.draw-btn {
  background-color: #42b983;
  color: white;
}
.draw-btn:hover:not(:disabled) { background-color: #33a06f; }
.draw-btn:disabled { background-color: #e9ecef; color: #adb5bd; cursor: not-allowed; }

/* YENİ: Teslim Edildi Buton Stili (Yeşil) */
.delivered-btn {
  background-color: #28a745;
  color: white;
}
.delivered-btn:hover { background-color: #218838; }

.cancel-btn {
  background-color: #dc3545;
  color: white;
}
.cancel-btn:hover { background-color: #bb2d3b; }

/* Onay Kutusu Stilleri */
.confirmation-dialog {
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: center;
  width: 100%;
}

.confirm-text {
  font-size: 14px;
  font-weight: 600;
  color: #dc3545;
  text-align: center;
}

.confirm-actions {
  display: flex;
  gap: 10px;
  width: 100%;
}

.btn-no {
  background-color: white;
  color: #2c3e50;
  border: 1px solid #ced4da;
  padding: 8px 12px;
  font-size: 13px;
}
.btn-no:hover { background-color: #f8f9fa; }

.btn-yes {
  background-color: #dc3545;
  color: white;
  padding: 8px 12px;
  font-size: 13px;
}
.btn-yes:hover { background-color: #bb2d3b; }

/* --- MOBİL UYUM (RESPONSIVE) AYARLARI --- */
@media (max-width: 768px) {
  .control-panel {
    flex-direction: column; /* Yan yanadan alt altaya geçiş */
    align-items: stretch; /* Elemanları sağdan soldan ekran genişliğine sündür */
    gap: 15px;
  }

  .action-area {
    width: 100%; /* Butonların bulunduğu alanın dar kalmasını engelle */
    margin-top: 10px;
  }
}
</style>