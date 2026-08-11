<template>
  <div class="map-wrapper">
    <div id="map-container"></div>
    <button 
      v-if="!isCameraLocked && courierPosition" 
      class="recenter-btn" 
      @click="recenterCamera"
      title="Kuryeye Odaklan"
    >
      🎯
    </button>
  </div>
</template>

<script>
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MAP_SETTINGS, LINE_STYLES, ICON_URLS } from '../constants/mapConfig.js';
import { calculateBearing, calculateSmoothRotation } from '../utils/geoMath.js';
import 'leaflet-arrowheads';

const startIcon = L.icon({
  iconUrl: ICON_URLS.START,
  shadowUrl: ICON_URLS.SHADOW,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const endIcon = L.icon({
  iconUrl: ICON_URLS.END,
  shadowUrl: ICON_URLS.SHADOW,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Backend'den gelen koordinatlar bazen eksik/yanlış alan adıyla (bkz. dataService
// normalizasyonu) ya da hiç gelmeyebiliyor. Leaflet, NaN/aralık dışı bir LatLng ile
// polyline/fitBounds çağrılırsa sert bir hata fırlatıp tüm sayfayı çökertiyor — bu
// yüzden haritaya geçmeden önce her koordinatı burada doğruluyoruz.
function isValidLatLng(lat, lng) {
  // Leaflet sayısal string koordinatları kendi içinde (+lat) sorunsuz kabul ediyor,
  // burada da aynı toleransla önce sayıya çeviriyoruz — asıl reddedilmesi gereken
  // undefined/null/NaN veya harita dışı (aralık dışı) değerler.
  const nLat = Number(lat);
  const nLng = Number(lng);
  return Number.isFinite(nLat) && Number.isFinite(nLng) &&
    Math.abs(nLat) <= 90 && Math.abs(nLng) <= 180;
}

export default {
  name: 'MapView',
  props: {
    route: Object,
    telemetryRoute: Array,
    liveSelections: Object,
    courierPosition: Object,
    isDelivered: Boolean,
    // Kuryenin kendi ekranında, hareket ettikçe canlı biriken yeşil iz (courierPathLayer)
    // faydalıdır. Ama admin ekranında bu iz sadece admin'in ~10sn'lik polling'inden
    // türediği için çok kaba kalıyor ve backend'den gelen asıl güvenilir kayıt olan
    // turuncu (telemetryRoute) çizginin üzerini örtüyor. Admin tarafı bunu false
    // vererek sadece konum ikonunu gösterir, birikimli izi çizdirmez.
    showLivePath: { type: Boolean, default: true }
  },
  data() {
    return {
      isCameraLocked: true
    };
  },
  created() {
    // Non-reactive map state variables to improve performance
    this.map = null;
    this.routeLayerGroup = null;
    this.previewLayerGroup = null;
    this.telemetryLayerGroup = null;
    this.currentAngle = 0;
    this.previousTargetAngle = null;
    this.courierMarker = null;
    this.courierPathLayer = null;
  },
  mounted() {
    this.initMap('map-container');
    
    this.map.on('dragstart', () => {
      if (this.courierPosition) {
        this.isCameraLocked = false;
      }
    }); 

    if (this.route) {
      this.drawActiveRoute(this.route);
    }
    if (this.telemetryRoute) {
      this.drawTelemetryRoute(this.telemetryRoute);
    }
    if (this.courierPosition) {
      this.updateCourierPosition(this.courierPosition, null, this.isCameraLocked);
    }
  },
  watch: {
    liveSelections: {
      deep: true,
      handler(newSelections) {
        this.drawPreview(newSelections);
      }
    },
    route(newRoute) {
      this.drawActiveRoute(newRoute);
    },
    telemetryRoute(newRoute) {
      this.drawTelemetryRoute(newRoute);
    },
    courierPosition(newPos, oldPos) {
      this.updateCourierPosition(newPos, oldPos, this.isCameraLocked);
    }
  },
  methods: {
    recenterCamera() {
      this.isCameraLocked = true;
      if (this.courierPosition && this.map) {
        this.map.panTo([this.courierPosition.lat, this.courierPosition.lng]);
      }
    },
    initMap(containerId) {
      this.map = L.map(containerId).setView(MAP_SETTINGS.DEFAULT_CENTER, MAP_SETTINGS.DEFAULT_ZOOM);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(this.map);

      this.routeLayerGroup = L.layerGroup().addTo(this.map);
      this.previewLayerGroup = L.layerGroup().addTo(this.map);
      this.telemetryLayerGroup = L.layerGroup().addTo(this.map);
    },
    drawTelemetryRoute(telemetryPoints) {
      try {
        if (!telemetryPoints || telemetryPoints.length === 0) {
          this.telemetryLayerGroup.clearLayers();
          this.telemetryPolyline = null;
          return;
        }

        const pathLatLngs = telemetryPoints
          .filter(coord => coord && isValidLatLng(coord.lat, coord.lng))
          .map(coord => [coord.lat, coord.lng]);

        if (pathLatLngs.length === 0) {
          console.warn('[MapView] Telemetri noktalarının hiçbiri geçerli koordinat içermiyor, rota çizilmedi.', telemetryPoints);
          this.telemetryLayerGroup.clearLayers();
          this.telemetryPolyline = null;
          return;
        }

        if (!this.telemetryPolyline) {
          this.telemetryPolyline = L.polyline(pathLatLngs, {
            color: '#ff5722',
            weight: 4,
            opacity: 0.8,
            dashArray: '10, 10'
          }).addTo(this.telemetryLayerGroup);

          // Only fit bounds on first load
          this.map.fitBounds(this.telemetryPolyline.getBounds(), { padding: MAP_SETTINGS.BOUNDS_PADDING });
        } else {
          // Just update points, do not clear layers or zoom
          this.telemetryPolyline.setLatLngs(pathLatLngs);
        }
      } catch (e) {
        console.error('[MapView] Telemetri rotası çizilirken hata oluştu, harita korunuyor.', e);
      }
    },
    drawPreview(selections) {
      try {
        this.previewLayerGroup.clearLayers();
        if (!selections || (!selections.start && !selections.end)) return;

        const bounds = [];

        if (selections.start && isValidLatLng(selections.start.lat, selections.start.lng)) {
          const coords = [selections.start.lat, selections.start.lng];
          L.marker(coords, { icon: startIcon }).bindPopup('Başlangıç: ' + selections.start.name).addTo(this.previewLayerGroup);
          bounds.push(coords);
        }

        if (selections.end && isValidLatLng(selections.end.lat, selections.end.lng)) {
          const coords = [selections.end.lat, selections.end.lng];
          L.marker(coords, { icon: endIcon }).bindPopup('Hedef: ' + selections.end.name).addTo(this.previewLayerGroup);
          bounds.push(coords);
        }

        if (bounds.length === 1) {
          this.map.flyTo(bounds[0], MAP_SETTINGS.FLY_TO_ZOOM, { duration: MAP_SETTINGS.FLY_TO_DURATION });
        } else if (bounds.length === 2) {
          this.map.fitBounds(L.polyline(bounds).getBounds(), { padding: MAP_SETTINGS.BOUNDS_PADDING });
        }
      } catch (e) {
        console.error('[MapView] Önizleme çizilirken hata oluştu, harita korunuyor.', e);
      }
    },
    drawActiveRoute(routeData) {
      try {
        this.routeLayerGroup.clearLayers();
        this.previewLayerGroup.clearLayers();

        // routeLayerGroup temizlendiği için path de silindi, referansını sıfırlıyoruz
        this.courierPathLayer = null;

        if (!routeData) return;

        const startCoords = [routeData.start.lat, routeData.start.lng];
        const endCoords = [routeData.end.lat, routeData.end.lng];

        if (!isValidLatLng(startCoords[0], startCoords[1]) || !isValidLatLng(endCoords[0], endCoords[1])) {
          console.warn('[MapView] Geçersiz başlangıç/hedef koordinatı, rota çizilmedi.', routeData);
          return;
        }

        L.marker(startCoords, { icon: startIcon }).bindPopup('Başlangıç: ' + routeData.start.name).addTo(this.routeLayerGroup);
        L.marker(endCoords, { icon: endIcon }).bindPopup('Hedef: ' + routeData.end.name).addTo(this.routeLayerGroup);

        // Kuryenin fiilen hangi yoldan gideceği önceden bilinmediği için burada artık
        // önceden hesaplanmış (OSRM) bir rota çizilmiyor — gerçek güzergah, GPS geldikçe
        // updateCourierPosition() içindeki courierPathLayer ile canlı olarak oluşuyor.
        // Haritayı sadece başlangıç/hedef iki noktasına göre kadrajlıyoruz.
        this.map.fitBounds(L.latLngBounds([startCoords, endCoords]), { padding: MAP_SETTINGS.BOUNDS_PADDING });
      } catch (e) {
        console.error('[MapView] Aktif rota çizilirken hata oluştu, harita korunuyor.', e);
      }
    },
    getCourierIcon(angle) {
      return L.divIcon({
        html: `<div style="font-size: 28px; text-shadow: 2px 2px 4px rgba(0,0,0,0.5); transform: rotate(${angle}deg); transition: transform 0.15s linear; display: inline-block; transform-origin: 50% 85%;">🏍️</div>`,
        className: 'custom-courier-icon',
        iconSize: [25, 25],
        iconAnchor: [15, 28] 
      });
    },
    updateCourierPosition(newPos, oldPos, isCameraLocked) {
      try {
        if (!newPos) {
          if (this.courierMarker) { this.map.removeLayer(this.courierMarker); this.courierMarker = null; }
          this.currentAngle = 0;
          this.previousTargetAngle = null;
          this.courierPathLayer = null;
          return;
        }

        if (!isValidLatLng(newPos.lat, newPos.lng)) {
          console.warn('[MapView] Geçersiz kurye konumu göz ardı edildi.', newPos);
          return;
        }

        if (this.showLivePath) {
          if (!this.courierPathLayer) {
            this.courierPathLayer = L.polyline([[newPos.lat, newPos.lng]], LINE_STYLES.COURIER_PATH).addTo(this.routeLayerGroup);
          } else {
            this.courierPathLayer.addLatLng([newPos.lat, newPos.lng]);
          }
        }

        if (oldPos && isValidLatLng(oldPos.lat, oldPos.lng)) {
          const targetAngle = calculateBearing(oldPos, newPos);
          if (targetAngle !== null) {
            this.currentAngle = calculateSmoothRotation(this.currentAngle, this.previousTargetAngle, targetAngle);
            this.previousTargetAngle = targetAngle;
          }
        }

        if (!this.courierMarker) {
          this.courierMarker = L.marker([newPos.lat, newPos.lng], {
            icon: this.getCourierIcon(this.currentAngle),
            zIndexOffset: 1000
          }).addTo(this.map);
        } else {
          this.courierMarker.setLatLng([newPos.lat, newPos.lng]);
          this.courierMarker.setIcon(this.getCourierIcon(this.currentAngle));
        }

        if (isCameraLocked) {
          this.map.panTo([newPos.lat, newPos.lng]);
        }
      } catch (e) {
        console.error('[MapView] Kurye konumu güncellenirken hata oluştu, harita korunuyor.', e);
      }
    }
  }
};
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
