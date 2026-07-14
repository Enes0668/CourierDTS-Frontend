import { shallowRef } from 'vue';
import L from 'leaflet';
import { MAP_SETTINGS, LINE_STYLES, ICON_URLS } from '../constants/mapConfig.js';
import { calculateBearing, calculateSmoothRotation } from '../utils/geoMath.js';
import 'leaflet-arrowheads';

// Kurye takibi için gereken state'ler (Artık Vue'da değil, motorun içinde)
  let currentAngle = 0;
  let previousTargetAngle = null;
  let courierMarker = null; 
  let courierPathLayer = null;
  //let tickCounter = 0; // Ok eklentisi için throttling sayacı

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

export function useCourierMap() {
  // Leaflet objelerini shallowRef ile tutuyoruz (Performans için kritik detay)
  const map = shallowRef(null);
  const routeLayerGroup = shallowRef(null);
  const previewLayerGroup = shallowRef(null);
  

  /**
   * Haritayı ve temel katmanları başlatır
   * @param {string} containerId - Haritanın çizileceği HTML div id'si
   */
  const initMap = (containerId) => {
    // Haritayı oluştur ve konfigürasyondaki merkeze odakla
    map.value = L.map(containerId).setView(MAP_SETTINGS.DEFAULT_CENTER, MAP_SETTINGS.DEFAULT_ZOOM);

    // OpenStreetMap altlığını ekle
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map.value);

    // Çizimleri ve önizlemeleri atacağımız katman gruplarını oluştur
    routeLayerGroup.value = L.layerGroup().addTo(map.value);
    previewLayerGroup.value = L.layerGroup().addTo(map.value);
  };

  /**
   * Menüden seçilen yerlerin önizlemesini (gri çizgi/marker) çizer
   */
  const drawPreview = (selections) => {
    previewLayerGroup.value.clearLayers();
    if (!selections || (!selections.start && !selections.end)) return;

    const bounds = [];
    
    if (selections.start) {
      const coords = [selections.start.lat, selections.start.lng];
      L.marker(coords, { icon: startIcon }).bindPopup('Başlangıç: ' + selections.start.name).addTo(previewLayerGroup.value);
      bounds.push(coords);
    }
    
    if (selections.end) {
      const coords = [selections.end.lat, selections.end.lng];
      L.marker(coords, { icon: endIcon }).bindPopup('Hedef: ' + selections.end.name).addTo(previewLayerGroup.value);
      bounds.push(coords);
    }

    if (bounds.length === 1) {
      map.value.flyTo(bounds[0], MAP_SETTINGS.FLY_TO_ZOOM, { duration: MAP_SETTINGS.FLY_TO_DURATION });
    } else if (bounds.length === 2) {
      map.value.fitBounds(L.polyline(bounds).getBounds(), { padding: MAP_SETTINGS.BOUNDS_PADDING });
    }
  };

  /**
   * Kesinleşen rotayı (API'den gelen dizi) haritaya çizer
   */
  const drawActiveRoute = (routeData) => {
    routeLayerGroup.value.clearLayers();
    previewLayerGroup.value.clearLayers();

    if (!routeData) return;

    const startCoords = [routeData.start.lat, routeData.start.lng];
    const endCoords = [routeData.end.lat, routeData.end.lng];

    L.marker(startCoords, { icon: startIcon }).bindPopup('Başlangıç: ' + routeData.start.name).addTo(routeLayerGroup.value);
    L.marker(endCoords, { icon: endIcon }).bindPopup('Hedef: ' + routeData.end.name).addTo(routeLayerGroup.value);

    const pathLatLngs = routeData.coordinates.map(coord => [coord.lat, coord.lng]);
    const polyline = L.polyline(pathLatLngs, LINE_STYLES.PREVIEW_ROUTE).addTo(routeLayerGroup.value);

    map.value.fitBounds(polyline.getBounds(), { padding: MAP_SETTINGS.BOUNDS_PADDING });
  };
  
  /**
   * Kurye ikonunu açıya göre oluşturan yardımcı fonksiyon
   */
  const getCourierIcon = (angle) => {
    return L.divIcon({
      html: `<div style="font-size: 28px; text-shadow: 2px 2px 4px rgba(0,0,0,0.5); transform: rotate(${angle}deg); transition: transform 0.15s linear; display: inline-block; transform-origin: 50% 85%;">🏍️</div>`,
      className: 'custom-courier-icon',
      iconSize: [25, 25],
      iconAnchor: [15, 28] 
    });
  };

  /**
   * Kuryenin anlık hareketini, çizgisini ve kamerasını yönetir
   */
  const updateCourierPosition = (newPos, oldPos, isCameraLocked) => {
    if (!newPos) {
      if (courierMarker) { map.value.removeLayer(courierMarker); courierMarker = null; }
      currentAngle = 0;
      previousTargetAngle = null;
      courierPathLayer = null; 
      return;
    }

    // --- OPSİYONEL: OK EKLENTİSİ VS CSS ANİMASYONU ---
    if (!courierPathLayer) {
      courierPathLayer = L.polyline([[newPos.lat, newPos.lng]], LINE_STYLES.COURIER_PATH).addTo(routeLayerGroup.value);
    } else {
      courierPathLayer.addLatLng([newPos.lat, newPos.lng]);
      
       // --- OK EKLENTİSİ İÇİN FRENLEME (THROTTLING) ALGORİTMASI ---
      // Okları kullanırken cihazın donmasını engellemek için sadece bu bloğu açın.
      // Not: tickCounter değişkenini sayfanın üstünde tanımlamanız gerekir.
      /*tickCounter++;
      if (tickCounter % 5 === 0) {
        if (courierPathLayer.getArrowheads) {
          courierPathLayer.deleteArrowheads();
        }
        courierPathLayer.arrowheads({ frequency: '60px', size: '15px', fill: true });
      }*/
      
    }

    // Açı Hesaplama
    if (oldPos && oldPos.lat && oldPos.lng) {
      const targetAngle = calculateBearing(oldPos, newPos);
      if (targetAngle !== null) {
        currentAngle = calculateSmoothRotation(currentAngle, previousTargetAngle, targetAngle);
        previousTargetAngle = targetAngle; 
      }
    }

    // İkonu Güncelle
    if (!courierMarker) {
      courierMarker = L.marker([newPos.lat, newPos.lng], { 
        icon: getCourierIcon(currentAngle), 
        zIndexOffset: 1000 
      }).addTo(map.value);
    } else {
      courierMarker.setLatLng([newPos.lat, newPos.lng]);
      courierMarker.setIcon(getCourierIcon(currentAngle)); 
    }
    
    // Kamerayı Odakla
    if (isCameraLocked) {
      map.value.panTo([newPos.lat, newPos.lng]);
    }
  };

  return {
    map,
    routeLayerGroup,
    previewLayerGroup,
    initMap,
    drawPreview,
    drawActiveRoute,
    updateCourierPosition
  };
}