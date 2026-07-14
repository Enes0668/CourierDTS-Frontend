<template>
  <div class="map-wrapper">
    <div id="map-container"></div>
    <button 
      v-if="!isCameraLocked && props.courierPosition" 
      class="recenter-btn" 
      @click="recenterCamera"
      title="Kuryeye Odaklan"
    >
      🎯
    </button>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, defineProps } from 'vue';
import 'leaflet/dist/leaflet.css'; // Leaflet'in kendi stil dosyası
import { useCourierMap } from '../composables/useCourierMap.js';


// App.vue'dan gelen veriyi tanımlıyoruz
const props = defineProps({
  route: Object,
  liveSelections: Object,
  courierPosition: Object // App.vue'dan gelen anlık konumu alıyoruz
});

const { map, initMap, drawPreview, drawActiveRoute, updateCourierPosition } = useCourierMap();

const isCameraLocked = ref(true);

const recenterCamera = () => {
  isCameraLocked.value = true;
  if (props.courierPosition) {
    map.value.panTo([props.courierPosition.lat, props.courierPosition.lng]);
  }
};

// Sayfa yüklendiğinde haritayı başlatıyoruz
onMounted(() => {
  // Motorun içindeki harita kurma fonksiyonunu çalıştır
  initMap('map-container');
  
  // Kullanıcı haritayı parmağıyla/faresiyle kaydırdığında takibi bırak
  map.value.on('dragstart', () => {
    if (props.courierPosition) {
      isCameraLocked.value = false;
    }
  }); 
});

// Kullanıcı menüden yer seçtikçe çalışacak blok
watch(() => props.liveSelections, (newSelections) => {
  drawPreview(newSelections); // Tüm o karmaşık önizleme işlemini motora devrettik!
}, { deep: true });

// route objesinde bir değişiklik olduğunda (kullanıcı butona bastığında) çalışır
watch(() => props.route, (newRoute) => {
  drawActiveRoute(newRoute); // OSRM çizgisini ve fitBounds olayını motora devrettik!
});

watch(() => props.courierPosition, (newPos, oldPos) => {
  updateCourierPosition(newPos, oldPos, isCameraLocked.value);
});

</script>

<style scoped>
.map-wrapper {
  position: relative;
  padding: 20px;
  background-color: #f8f9fa;
  border-radius: 12px;
}

#map-container {
  height: 600px;
  width: 100%;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  /* Z-index ayarı: Haritanın üst üste binme sorunlarını engeller */
  z-index: 1; 
}

.recenter-btn {
  position: absolute;
  bottom: 30px;
  right: 30px;
  z-index: 1000; /* Harita katmanlarının üzerine çıkması için */
  width: 48px;
  height: 48px;
  background-color: white;
  border: 2px solid #ced4da;
  border-radius: 50%;
  font-size: 24px;
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;
  box-shadow: 0 4px 10px rgba(0,0,0,0.2);
  transition: all 0.2s ease-in-out;
}

.recenter-btn:hover {
  background-color: #f1f3f5;
  transform: scale(1.05);
}

@media (max-width: 768px) { 
  #map-container { height: 450px; } 
  .recenter-btn { bottom: 20px; right: 20px; width: 42px; height: 42px; font-size: 20px; }
}

:deep(.flowing-route) {
  stroke-dasharray: 5, 20; /* Çizgi ve boşluk uzunlukları */
  animation: flow-animation 1s linear infinite;
}

@keyframes flow-animation {
  0% { stroke-dashoffset: 24; } /* stroke-dasharray değerlerinin toplamı (12+12) */
  100% { stroke-dashoffset: 0; }
}
</style>