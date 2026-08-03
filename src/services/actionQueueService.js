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
      
      if (queue.length > 0) {
        console.log(`[SYNC] ${queue.length} adet işlem kuyruktan Backend'e gönderiliyor...`);
        
        // Group by courierId_journeyId
        const groups = {};
        for (const item of queue) {
          const key = `${item.courierId}_${item.journeyId}`;
          if (!groups[key]) {
            groups[key] = {
              courierId: item.courierId,
              journeyId: item.journeyId,
              actions: []
            };
          }
          groups[key].actions = groups[key].actions.concat(item.actions);
        }

        const remainingQueue = [];
        for (const key in groups) {
          try {
            await api.post('/packages/syncactions', groups[key]);
            console.log(`[SYNC] ${key} grubu başarıyla gönderildi.`);
          } catch (error) {
            console.error(`[SYNC] ${key} grubu gönderilemedi, tekrar denenecek.`, error);
            remainingQueue.push(groups[key]); // keep failed groups
          }
        }
        
        localStorage.setItem(this.QUEUE_KEY, JSON.stringify(remainingQueue));
      }
    });
  }
}

export const actionQueue = new ActionQueueService();
