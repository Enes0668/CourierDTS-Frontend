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
   * @param {Object} action - { packageId, locationId, latitude, longitude, actionType, actionTime, notes }
   * @param {Number} courierId 
   * @param {Number} journeyId 
   */
  async queueAction(action, courierId, journeyId) {
    const payload = {
      courierId: courierId,
      journeyId: journeyId,
      actions: [action]
    };

    if (navigator.onLine) {
      try {
        await api.post('/packages/syncactions', payload);
        console.log('[SYNC] İşlem başarıyla Backend\'e iletildi.', action);
        return true;
      } catch (error) {
        console.warn('[SYNC] Sunucuya ulaşılamadı. Kuyruğa ekleniyor...', error);
        this._saveToQueue(payload);
        return false;
      }
    } else {
      console.log('[SYNC] İnternet yok. İşlem kuyruğa eklendi.');
      this._saveToQueue(payload);
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

      if (queue.length === 0) return;

      console.log(`[SYNC] ${queue.length} adet işlem kuyruktan Backend'e gönderiliyor...`);

      // Backend /packages/syncactions ucu tek bir SyncActionsRequest nesnesi bekler ve
      // actions dizisini actionTime'a göre sıralayıp uygular (offline kuyruk senaryosu
      // için tasarlanmış). Bu yüzden aynı kurye+sefere ait kuyruktaki eylemler tek bir
      // istekte, actions dizisi birleştirilerek toplu gönderilir (ayrı ayrı değil).
      const groups = new Map();
      const order = [];
      for (const item of queue) {
        const key = `${item.courierId}:${item.journeyId}`;
        if (!groups.has(key)) {
          groups.set(key, { courierId: item.courierId, journeyId: item.journeyId, actions: [] });
          order.push(key);
        }
        groups.get(key).actions.push(...(item.actions || []));
      }

      const remainingQueue = [];
      for (const key of order) {
        const payload = groups.get(key);
        try {
          await api.post('/packages/syncactions', payload);
        } catch (error) {
          console.error('[SYNC] Bir grup işlem gönderilemedi, tekrar denenecek.', error);
          remainingQueue.push(payload);
        }
      }

      localStorage.setItem(this.QUEUE_KEY, JSON.stringify(remainingQueue));
      if (remainingQueue.length === 0) {
        console.log('[SYNC] Kuyruktaki tüm işlemler başarıyla gönderildi.');
      }
    });
  }
}

export const actionQueue = new ActionQueueService();
