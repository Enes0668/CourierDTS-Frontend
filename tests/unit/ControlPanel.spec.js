import { mount } from '@vue/test-utils';
import ControlPanel from '@/components/ControlPanel.vue'; // Vue CLI'da @ işareti src klasörünü temsil eder

// NOT: Jest kullandığımız için describe, it, expect gibi metotları 
// import etmemize gerek yoktur, Jest bunları global olarak tanır.

describe('ControlPanel.vue (Dumb Component Tests)', () => {
  
  it('Başlangıçta "Güzergahı Çiz" butonu devre dışı (disabled) olmalıdır', () => {
    const wrapper = mount(ControlPanel);
    const drawBtn = wrapper.find('.draw-btn');
    
    expect(drawBtn.attributes('disabled')).toBeDefined();
  });

  it('Lokasyonlar seçilip butona basıldığında "route-planned" sinyali (emit) fırlatmalıdır', async () => {
        const wrapper = mount(ControlPanel);
        
        // 1. Arayüzdeki select kutularını bul
        const selects = wrapper.findAll('select');
        
        // 2. Select içindeki option'ları bul (0. index "Seçiniz..." olduğu için 1 ve 2'yi seçiyoruz)
        const startOptions = selects[0].findAll('option');
        const endOptions = selects[1].findAll('option');

        // 3. Gerçek option'ları seçili hale getir
        await startOptions[1].setSelected(); 
        await endOptions[2].setSelected(); 

        // 4. Butona tıkla
        const drawBtn = wrapper.find('.draw-btn');
        await drawBtn.trigger('click');

        // 5. route-planned fırlatıldı mı kontrol et
        expect(wrapper.emitted('route-planned')).toBeTruthy();
        
        // 6. Fırlatılan verinin boş olmadığını (gerçek lokasyon objeleri içerdiğini) doğrula
        const emitPayload = wrapper.emitted('route-planned')[0][0];
        expect(emitPayload.start).toBeDefined();
        expect(emitPayload.start.name).toBeTruthy(); // "AYBÜ Kampüs" vb. bir isim var mı?
        expect(emitPayload.end).toBeDefined();
      });

  it('"Teslim Edildi" butonuna basıldığında "delivery-success" sinyali fırlatmalıdır', async () => {
    const wrapper = mount(ControlPanel, {
      props: { isDelivered: true }
    });

    wrapper.vm.isRouteActive = true; 
    await wrapper.vm.$nextTick(); 

    const deliveredBtn = wrapper.find('.delivered-btn');
    await deliveredBtn.trigger('click');

    expect(wrapper.emitted('delivery-success')).toBeTruthy();
    expect(wrapper.vm.isRouteActive).toBe(false);
  });

  it('"Paketi İptal Et" işleminde onay verilirse "delivery-cancelled" fırlatmalıdır', async () => {
    const wrapper = mount(ControlPanel);
    wrapper.vm.isRouteActive = true;
    await wrapper.vm.$nextTick();

    await wrapper.find('.cancel-btn').trigger('click');
    expect(wrapper.find('.confirmation-dialog').exists()).toBe(true);

    await wrapper.find('.btn-yes').trigger('click');

    expect(wrapper.emitted('delivery-cancelled')).toBeTruthy();
    expect(wrapper.find('.confirmation-dialog').exists()).toBe(false);
  });
});