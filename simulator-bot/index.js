const axios = require('axios');

// Konfigürasyon
const API_BASE_URL = process.env.API_BASE_URL || 'https://courierdts-backend.onrender.com/api';
const POLLING_INTERVAL_MS = 1500; // Simülasyonda haritada hızlı ilerlemesi için 1.5 saniye
const BATCH_SIZE = 5; // Kaç noktada bir Backend'e toplu itilecek?

// Argümanları parse et (Örn: node index.js --courierId=5)
const args = process.argv.slice(2);
const courierIdArg = args.find(a => a.startsWith('--courierId='));
const courierId = courierIdArg ? parseInt(courierIdArg.split('=')[1]) : 999;

if (!courierId) {
    console.error("Lütfen bir kurye ID girin: --courierId=1");
    process.exit(1);
}

// Örnek Koordinatlar (Ankara - Gerçek yollardan çizilecek)
const startCoords = { lat: 40.2316, lng: 33.0225 }; // AYBÜ
const endCoords = { lat: 39.9208, lng: 32.8541 };   // Kızılay / Medipol

// 1. OSRM'den Gerçek Rota Çek
async function fetchRoute(start, end) {
    // OSRM {lng},{lat} formatı kullanır
    const url = `http://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`;
    try {
        console.log(`🗺️  OSRM'den sokak sokak gerçek yol rotası çekiliyor...`);
        const response = await axios.get(url);
        const route = response.data.routes[0];
        
        // GeoJSON koordinatları [lng, lat] şeklinde döner, biz {lat, lng} nesnesine çeviriyoruz
        const coordinates = route.geometry.coordinates.map(coord => ({
            lat: coord[1],
            lng: coord[0]
        }));
        console.log(`✅  Rota başarıyla çekildi. Toplam adım: ${coordinates.length}`);
        return coordinates;
    } catch (error) {
        console.error("❌  OSRM Hatası:", error.message);
        process.exit(1);
    }
}

// 2. C# Backend üzerinde Journey (Sefer) Başlat
async function startJourneyOnBackend(cId) {
    try {
        console.log(`🚀  Backend üzerinde sefer başlatılıyor (CourierId: ${cId})...`);
        const res = await axios.post(`${API_BASE_URL}/journeys/start`, {
            courierId: cId,
            startLocationId: 1, // Şimdilik hardcoded ID
            endLocationId: 2
        });
        const journeyId = res.data.journeyId;
        console.log(`✅  Sefer başladı! Journey ID: ${journeyId}`);
        return journeyId;
    } catch (error) {
        console.error(`⚠️  Backend'e ulaşılamadı. Lütfen C# sunucusunun çalıştığından emin olun. (${error.message})`);
        console.log("Simülasyon test amacıyla Backend olmadan (Offline Mock Mode) devam edecek...\n");
        return Math.floor(Math.random() * 1000); // Sahte Journey ID
    }
}

// 3. Birikmiş GPS Loglarını (Batch) C# Backend'e Yolla
async function sendTelemetryBatch(journeyId, batch) {
    try {
        await axios.post(`${API_BASE_URL}/telemetry/batch`, {
            context: {
                courierId: courierId,
                journeyId: journeyId,
                sessionId: "sim-" + Date.now()
            },
            payload: {
                actualPathSegment: batch
            }
        });
        console.log(`📡  [Kurye ${courierId}] ${batch.length} adet GPS verisi Backend'e başarıyla iletildi.`);
    } catch (error) {
        // Sadece hata logu atar, simülasyonu durdurmaz (Offline dayanıklılığı test etmek için)
        // console.error(`⚠️ GPS gönderim hatası: ${error.message}`);
    }
}

// ANA MOTOR
async function runSimulation() {
    console.log(`\n=== 🤖 Kurye Takip Simülatör Botu Başladı (Kurye ID: ${courierId}) ===\n`);
    
    const journeyId = await startJourneyOnBackend(courierId);
    const routePoints = await fetchRoute(startCoords, endCoords);
    
    let currentIndex = 0;
    let pointBuffer = [];

    // Zamanlayıcı Döngüsü
    const simTimer = setInterval(async () => {
        if (currentIndex >= routePoints.length) {
            clearInterval(simTimer);
            console.log(`\n🎉 [Kurye ${courierId}] Hedefe ulaştı! Simülasyon bitti.`);
            process.exit(0);
        }

        const currentPoint = routePoints[currentIndex];
        
        // Ekrana kuryenin durumunu bas (Sadece demo gösterimi için)
        if (currentIndex % 3 === 0) {
            console.log(`🏍️  Adım [${currentIndex}/${routePoints.length}] İlerliyor... (${currentPoint.lat.toFixed(5)}, ${currentPoint.lng.toFixed(5)})`);
        }

        // Noktayı yerel kuyruğa ekle
        pointBuffer.push({
            lat: currentPoint.lat,
            lng: currentPoint.lng,
            timestamp: new Date().toISOString()
        });

        // Batch boyutu (5) dolduysa veya yol bittiyse toplu gönder
        if (pointBuffer.length >= BATCH_SIZE || currentIndex === routePoints.length - 1) {
            const batchToSend = [...pointBuffer];
            pointBuffer = []; // Kuyruğu sıfırla
            await sendTelemetryBatch(journeyId, batchToSend);
        }

        currentIndex++;
    }, POLLING_INTERVAL_MS);
}

runSimulation();
