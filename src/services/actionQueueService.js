import api from '../api/index';

/**
 * Action Queue Service
 * Çevrimdışı işlemleri sıraya alır ve internet gelince Backend'e yollar.
 */
class ActionQueueService {
  constructor() {
    this.QUEUE_KEY = 'sync_actions_queue';
    this._listenForOnlineRecovery();
  }

  /**
   * Kurye paketi aldığında veya teslim ettiğinde bu metod çağrılır.
   * @param {Object} action - { MaterialId, ActionType, Lat, Lng, Timestamp, Notes }
   */
  async queueAction(action) {
    // action: { MaterialId: 1, ActionType: "PICKUP", Lat: 40.0, Lng: 29.0, Timestamp: "..." }
    const payload = [action];

    if (navigator.onLine) {
      try {
        await api.post('/materials/sync', payload);
        console.log('[SYNC] İşlem başarıyla Backend\'e iletildi.', action);
        return true;
      } catch (error) {
        console.warn('[SYNC] Sunucuya ulaşılamadı. Kuyruğa ekleniyor...', error);
        this._saveToQueue(action);
        return false;
      }
    } else {
      console.log('[SYNC] İnternet yok. İşlem kuyruğa eklendi.');
      this._saveToQueue(action);
      return false;
    }
  }

  _saveToQueue(payload) {
    const queue = JSON.parse(localStorage.getItem(this.QUEUE_KEY) || '[]');
    queue.push(payload);
    localStorage.setItem(this.QUEUE_KEY, JSON.stringify(queue));
  }

  _listenForOnlineRecovery() {
    window.addEventListener('online', async () => {
      console.log('[SYNC] İnternet bağlantısı geri geldi. Kuyruk kontrol ediliyor...');
      const queue = JSON.parse(localStorage.getItem(this.QUEUE_KEY) || '[]');
      
      if (queue.length > 0) {
        console.log(`[SYNC] ${queue.length} adet işlem kuyruktan Backend'e gönderiliyor...`);
        
        try {
          await api.post('/materials/sync', queue);
          console.log('[SYNC] Kuyruktaki tüm işlemler başarıyla gönderildi.');
          localStorage.setItem(this.QUEUE_KEY, JSON.stringify([]));
        } catch (error) {
          console.error('[SYNC] Kuyruktaki işlemler gönderilemedi, tekrar denenecek.', error);
          // Keep them in the queue if failed
        }
      }
    });
  }
}

export const actionQueue = new ActionQueueService();
