/**
 * Telemetry & Logging Service
 * Sistem hatalarını ve kurye teslimat metriklerini takip eder.
 * Gerçek bir API olmadığı için verileri şimdilik LocalStorage'a kaydeder (Simülasyon).
 */

import api from '@/api/index.js';

class TelemetryService {
  constructor() {
    this.pathBuffer = [];
    this.bufferTimer = null;
    this.isTracking = false;
    this.courierId = null;
    this.journeyId = null;
    
    // Simülasyon paneli ile Courier dashboard arası iletişim
    this.simChannel = new BroadcastChannel('gps_simulation');

    this.STORAGE_KEY = 'telemetry_logs';
    this.BACKUP_KEY = 'telemetry_offline_backup';
    this.CHUNK_SIZE = 50; // Sepet kapasitesi (Koordinat sayısı)
    this.FLUSH_INTERVAL_MS = 30000; // 30 saniye

    // Sistemin o anki kimlik kartı
    this.context = {
      courier_id: null,
      journey_id: null,
      session_id: crypto.randomUUID() // Benzersiz oturum kimliği oluşturur
    };

    // Koordinatları biriktireceğimiz sepet ve sayacı
    this.pathBuffer = [];
    this.flushTimer = null; 
    
    // Offline'dan Online'a dönüşü dinle
    this._listenForOnlineRecovery();
  }

  setContext(courierId, journeyId) {
    // localStorage'dan gelen courierId string olabilir; backend courier_id/journey_id'yi
    // nullable olmayan int olarak beklediği için string gönderilirse deserialization
    // hatası alınır ve paket hiç sunucuya ulaşmaz. Burada sayıya normalize ediyoruz.
    this.context.courier_id = courierId != null ? Number(courierId) : null;
    this.context.journey_id = journeyId != null ? Number(journeyId) : null;
    console.log('[TELEMETRY] Kimlik tanımlandı:', this.context);
  }

  // ==========================================
  // LOGLAMA (SİSTEM SAĞLIĞI)
  // ==========================================

  trackError(errorCode, errorObj) {
    const payload = {
      error_code: errorCode,
      error_message: errorObj?.message || 'Unknown Error',
      stack_trace: errorObj?.stack || ''
    };
    this._packageAndSend('SYSTEM_ERROR', payload);
  }

  // ==========================================
  // TELEMETRİ (İŞ METRİKLERİ VE YAŞAM DÖNGÜSÜ)
  // ==========================================

  startDelivery(startName, endName, plannedDistance, plannedPath) {
    this.pathBuffer = []; 
    this._stopTimer(); // Güvenlik önlemi

    const payload = {
      start_location_name: startName,
      end_location_name: endName,
      planned_distance: plannedDistance,
      planned_path: plannedPath
    };
    this._packageAndSend('DELIVERY_STARTED', payload);
  }

  /**
   * Kurye hareket ettikçe çağrılır.
   */
  addCoordinate(lat, lng, isFromMockProvider = false) {
    this.pathBuffer.push({ lat, lng, isFromMockProvider, timestamp: new Date().toISOString() });
    
    // Simülasyon arayüzünün güncellenmesi için kanala yayın yap
    this.simChannel.postMessage({ type: 'GPS_UPDATE', lat, lng });

    // Sepete ilk veri düştüğünde 30 saniyelik zamanlayıcıyı başlat
    if (this.pathBuffer.length === 1) {
      this._startTimer();
    }

    // Eğer 50 koordinata ulaşıldıysa süreyi beklemeden yolla
    if (this.pathBuffer.length >= this.CHUNK_SIZE) {
      this._flushBuffer('DELIVERY_ROUTE_UPDATE');
    }
  }

  /**
   * Kurye hedefe vardı ama işlem daha bitmedi (Bekleme)
   */
  courierArrived() {
    // Hedefe varıldığında sepette kalan son kırıntıları yolla ve sayacı kapat
    if (this.pathBuffer.length > 0) {
      this._flushBuffer('DELIVERY_ROUTE_UPDATE');
    } else {
      this._stopTimer(); // Sepet boşsa bile sayacı kesin durdur
    }
    
    // Varış logunu yolla
    this._packageAndSend('DELIVERY_ARRIVED', { status: 'WAITING_AT_ADDRESS' });
  }

  completeDelivery(actualDistance) {
    if (this.pathBuffer.length > 0) {
      this._flushBuffer('DELIVERY_ROUTE_UPDATE');
    }
    this._stopTimer();

    const payload = {
      actual_distance: actualDistance
    };
    this._packageAndSend('DELIVERY_COMPLETED', payload);
  }

  cancelDelivery(reason, actualDistance) {
    if (this.pathBuffer.length > 0) {
      this._flushBuffer('DELIVERY_ROUTE_UPDATE');
    }
    this._stopTimer();

    const payload = {
      cancel_reason: reason,
      actual_distance: actualDistance
    };
    this._packageAndSend('DELIVERY_CANCELLED', payload);
  }

  // ==========================================
  // İÇ (PRIVATE) YARDIMCI FONKSİYONLAR
  // ==========================================

  _startTimer() {
    if (!this.flushTimer) {
      this.flushTimer = setInterval(() => {
        if (this.pathBuffer.length > 0) {
          // 30 saniye doldu, sepeti boşalt
          this._flushBuffer('DELIVERY_ROUTE_UPDATE');
        }
      }, this.FLUSH_INTERVAL_MS);
    }
  }

  _stopTimer() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  /**
   * Sepeti dışarı yollar ve sayacı sıfırlar.
   */
  _flushBuffer(eventName) {
    if (this.pathBuffer.length === 0) return;
    
    const payload = {
      actual_path_segment: [...this.pathBuffer]
    };
    this._packageAndSend(eventName, payload);
    
    // TAM KONUŞTUĞUMUZ GİBİ: Veri gitti, sepeti boşalt ve sayacı sıfırla
    this.pathBuffer = []; 
    this._stopTimer(); 
  }

  _packageAndSend(eventName, payload) {
    const packet = {
      event_name: eventName,
      timestamp: new Date().toISOString(),
      context: { ...this.context },
      payload: payload
    };

    const color = eventName === 'SYSTEM_ERROR' ? 'red' : 'green';
    console.log(`%c[${eventName}]`, `color: ${color}; font-weight: bold;`, packet);

    // Backend'deki POST /telemetry/batch ucu yalnızca payload.actual_path_segment
    // (GPS rota noktaları) içeren paketleri işler; SYSTEM_ERROR, DELIVERY_STARTED,
    // DELIVERY_ARRIVED, DELIVERY_COMPLETED, DELIVERY_CANCELLED gibi diğer olaylar
    // şemaya uymadığından sunucuda saklanmıyor. Bu event'ler yerel logda kalır,
    // API'ye gönderilmez.
    if (payload && Object.prototype.hasOwnProperty.call(payload, 'actual_path_segment')) {
      this._sendApiRequest(packet);
    }
  }

  async _sendApiRequest(packet) {
    // context.courier_id / journey_id backend'de nullable olmayan int'tir;
    // henüz bir sefer başlamadan (setContext çağrılmadan) gönderilirse
    // deserialization hatasına yol açar, bu yüzden gönderim öncesi doğrulanır.
    if (!packet.context || packet.context.courier_id == null || packet.context.journey_id == null) {
      console.warn('[TELEMETRY] Aktif kurye/sefer bağlamı yok, paket gönderilmiyor:', packet.event_name);
      return;
    }

    if (!navigator.onLine) {
      console.warn('[TELEMETRY] İnternet yok! Paket yedekleniyor...', packet.event_name);
      this._saveToOfflineBackup(packet);
      return;
    }

    try {
      const response = await api.post('/telemetry/batch', {
          context: packet.context,
          payload: packet.payload,
          event_name: packet.event_name,
          timestamp: packet.timestamp
      });

      // 200 OK, backend'in noktayı gerçekten kaydettiği anlamına gelmez: journey_id
      // aktif (InProgress) bir sefere ait değilse backend sessizce storedCount:0 döner.
      const storedCount = response.data ? response.data.storedCount : undefined;
      const sentCount = (packet.payload && Array.isArray(packet.payload.actual_path_segment))
        ? packet.payload.actual_path_segment.length
        : 0;

      if (typeof storedCount === 'number' && storedCount < sentCount) {
        console.warn(
          `[TELEMETRY] ${packet.event_name} gönderildi ama backend ${sentCount} noktadan yalnızca ${storedCount} tanesini kaydetti (journey_id=${packet.context.journey_id} aktif/geçerli olmayabilir).`,
          packet.context
        );
      } else {
        console.log(`[TELEMETRY] ${packet.event_name} başarıyla gönderildi (storedCount: ${storedCount}).`);
      }

      if (response.data && response.data.isArrived) {
        window.dispatchEvent(new CustomEvent('telemetry_arrived'));
      }
    } catch (e) {
      console.error('[TELEMETRY] API gönderim hatası:', e);
      this._saveToOfflineBackup(packet); // Hata durumunda yedeğe al
    }
  }

  _saveToOfflineBackup(packet) {
    const backup = JSON.parse(localStorage.getItem(this.BACKUP_KEY) || '[]');
    backup.push(packet);
    localStorage.setItem(this.BACKUP_KEY, JSON.stringify(backup));
  }

  _listenForOnlineRecovery() {
    window.addEventListener('online', async () => {
      console.log('[TELEMETRY] İnternet bağlantısı geri geldi. Yedekler kontrol ediliyor...');
      const backup = JSON.parse(localStorage.getItem(this.BACKUP_KEY) || '[]');
      
      if (backup.length > 0) {
        console.log(`[TELEMETRY] ${backup.length} adet yedek paket sunucuya gönderiliyor...`);
        const remainingBackup = [];
        for (const packet of backup) {
           try {
             await api.post('/telemetry/batch', {
                 context: packet.context,
                 payload: packet.payload,
                 event_name: packet.event_name,
                 timestamp: packet.timestamp
             });
           } catch(e) {
             console.error('[TELEMETRY] Yedek gönderim hatası:', e);
             remainingBackup.push(packet);
           }
        }
        if (remainingBackup.length === 0) {
          localStorage.removeItem(this.BACKUP_KEY);
        } else {
          localStorage.setItem(this.BACKUP_KEY, JSON.stringify(remainingBackup));
        }
      }
    });
  }
}

export const telemetry = new TelemetryService();