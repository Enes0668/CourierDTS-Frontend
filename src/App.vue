<template>
  <div id="app">
    <h1 class="title">Kurye Takip Simülasyonu</h1>
    
    <ControlPanel 
      :is-delivered="isDelivered"
      @route-planned="handleRoutePlanned" 
      @selection-changed="handleSelectionChanged"
      @delivery-success="handleDeliverySuccess"
      @delivery-cancelled="handleDeliveryCancelled"
    />
    
    <MapView 
      :route="currentRoute" 
      :live-selections="currentSelections" 
      :courier-position="courierPosition"
      :is-delivered="isDelivered"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue';
import ControlPanel from './components/ControlPanel.vue';
import MapView from './components/MapView.vue';

// Simülasyon motorunu dahil ettik
import { courierMock } from './services/courierMock'; 

// YENİ: Telemetri servisini SADECE Orkestra Şefi olan App.vue'ya dahil ediyoruz (SOLID - SRP prensibi)
import { telemetry } from './services/telemetryServices.js';


// --- REAKTİF DURUM (STATE) DEĞİŞKENLERİ ---
// Haritaya gönderilecek rotayı tutan değişken (Başlangıçta boş)
const currentRoute = ref(null);
// Anlık seçimleri tutacak değişken
const currentSelections = ref({ start: null, end: null });
// Kuryenin anlık konumunu tutacak değişken
const courierPosition = ref(null);
// Teslimatın tamamlanıp tamamlanmadığını tutacak değişken
const isDelivered = ref(false);

let plannedDistanceCache = -1; // Başarı butonuna basıldığında yollamak için mesafeyi hafızada tutuyoruz


// --- TELEMETRİ: KİMLİK TANIMLAMA ---
// Gerçek veriler gelene kadar fallback (varsayılan) değerler kullanıyoruz.
// "SIM_" öneki, analiz eden kişinin bunun gerçek bir kurye olmadığını anlamasını sağlar.
const currentCourierId = "SIM_COURIER_" + Math.floor(Math.random() * 1000); 
const currentDeliveryId = "SIM_ORDER_" + Date.now(); // Zaman damgasıyla eşsiz bir ID oluştur
telemetry.setContext(currentCourierId, currentDeliveryId);


// YENİ MANTIK (ADIM 1): OSRM API'sinden gerçek yol koordinatlarını çeken fonksiyon
const fetchRouteFromOSRM = async (start, end) => {
  // OSRM API'si koordinatları "Boylam,Enlem" (Lng,Lat) sırasında ister
  const url = `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.routes && data.routes.length > 0) {
      const routeData = data.routes[0];
      
      // API bize [Boylam, Enlem] şeklinde koca bir dizi verir. 
      // Harita kütüphanemiz Leaflet ise [Enlem, Boylam] şeklinde çalıştığı için diziyi ters çevirerek alıyoruz (map).
      const coordinates = routeData.geometry.coordinates.map(coord => ({
        lat: coord[1],
        lng: coord[0]
      }));
      
      // YENİ: Telemetri için rotanın planlanan toplam mesafesini de (metre) döndürüyoruz
      return {coordinates: coordinates, distance: routeData.distance || -1 };
    }
  } catch (error) {
    console.error("OSRM API'den yol verisi alınırken hata oluştu:", error);
    // API Hatasını sistemi çökertmeden telemetri loglarına (SYSTEM_ERROR) yazıyoruz
    telemetry.trackError('OSRM_FETCH_FAILED', error);
  }
  return null;
};


// Rota seçildiğinde API'yi bekleyen asenkron (async) yapı
const handleRoutePlanned = async (routeSelection) => {
  // 1. Önce API'ye istek atıp gerçek sokakların listesini çekiyoruz
  const osrmData = await fetchRouteFromOSRM(routeSelection.start, routeSelection.end);

  if (!osrmData || !osrmData.coordinates) {
    alert("Gerçek yol rotası hesaplanamadı. Lütfen farklı noktalar deneyin.");
    return;
  }

  const pathCoordinates = osrmData.coordinates;
  plannedDistanceCache = osrmData.distance; // Mesafeyi hafızaya al

  // 2. Haritanın çizmesi için currentRoute objesine bu koca diziyi (coordinates) ekliyoruz
  currentRoute.value = {
    start: routeSelection.start,
    end: routeSelection.end,
    coordinates: pathCoordinates 
  };
  
  isDelivered.value = false;

  // --- TELEMETRİ: 1. TESLİMAT BAŞLADI (DELIVERY_STARTED) ---
  // API veya seçimden veri gelmezse güvenli (fallback) isimler yolluyoruz
  const startName = routeSelection.start?.name || "UNKNOWN_START";
  const endName = routeSelection.end?.name || "UNKNOWN_END";
  const safePath = Array.isArray(pathCoordinates) ? pathCoordinates : [];
  
  telemetry.startDelivery(startName, endName, plannedDistanceCache, safePath);

  // 3. Simülasyonu başlat (Artık sadece start/end değil, yolun TAMAMINI motora gönderiyoruz)
  courierMock.startSimulation(
    pathCoordinates, 
    // onTick: Kurye her hareket ettiğinde tetiklenen fonksiyon
    (newPosition) => {
      courierPosition.value = newPosition; // UI güncellenir
      
      // --- TELEMETRİ: 2. SEPETİ DOLDUR (ROUTE_UPDATE) ---
      // Alt dosyaları (courierMock) kirletmeden, veriyi burada yakalayıp sepete atıyoruz
      if (newPosition && newPosition.lat && newPosition.lng) {
        telemetry.addCoordinate(newPosition.lat, newPosition.lng);
      }
    },
    // onFinish: Kurye hedefe vardığında tetiklenen fonksiyon
    () => {
      console.log("Motosiklet hedefe ulaştı. Kullanıcı onayı bekleniyor...");
      isDelivered.value = true;
      // Kurye hedefe vardığında telemetry'ye haber veriyoruz
      telemetry.courierArrived();
    }
  );
};


// Seçim yapıldıkça veriyi güncelleyen fonksiyon
const handleSelectionChanged = (selections) => {
  currentSelections.value = selections;
};


//Başarı Butonuna Basıldığında
// eslint-disable-next-line no-unused-vars
const handleDeliverySuccess = () => {
  // TELEMETRİ: 3. BAŞARILI BİTİŞ (İşte şimdi fırlatıyoruz!)
  telemetry.completeDelivery(plannedDistanceCache);
  
  // Arayüzü Temizle
  resetUI();
};

// İptal Butonuna Basıldığında
// eslint-disable-next-line no-unused-vars
const handleDeliveryCancelled = () => {
  // TELEMETRİ: 4. İPTAL
  telemetry.cancelDelivery('USER_CLEARED_ROUTE', -1);
  
  // Arayüzü Temizle
  resetUI();
};

// YARDIMCI FONKSİYON: Temizlik işlemleri kod tekrarını önlemek için (DRY Prensibi) buraya alındı
const resetUI = () => {
  currentRoute.value = null;
  currentSelections.value = { start: null, end: null };
  isDelivered.value = false; 
  courierMock.stopSimulation();
  courierPosition.value = null;
  plannedDistanceCache = -1;
};
</script>

<style>
/* Tüm uygulamayı etkileyecek global stiller */
body {
  margin: 0;
  padding: 0;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background-color: #f0f2f5;
}

#app {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.title {
  text-align: center;
  color: #2c3e50;
  margin-bottom: 30px;
  font-weight: 600;
}
</style>