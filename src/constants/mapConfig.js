// Haritanın genel kamera ve konum ayarları
export const MAP_SETTINGS = {
  DEFAULT_CENTER: [39.9334, 32.8597], // Ankara'nın koordinatları
  DEFAULT_ZOOM: 10,
  FLY_TO_ZOOM: 14,
  FLY_TO_DURATION: 1.5,
  BOUNDS_PADDING: [50, 50] // Odaklanırken kenarlardan bırakılacak boşluk
};

// Haritadaki çizgilerin görsel ayarları
export const LINE_STYLES = {
  COURIER_PATH: { 
    color: '#28a745', // Yeşil
    weight: 6, 
    opacity: 0.9, 
    className: 'flowing-route' 
  },
  PREVIEW_ROUTE: { 
    color: '#6c757d', // Gri
    weight: 5 
  }
};

// Dışarıdan çekilen ikonların URL'leri
export const ICON_URLS = {
  START: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  END: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  SHADOW: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png'
};