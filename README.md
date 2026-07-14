# CourierDTS - Kurye Takip Simülasyonu 🏍️

Bu proje, kurye rotalarının planlanması ve telemetri verilerinin (Batching mantığı ile) sunucu dostu bir mimariyle takip edilmesi için geliştirilmiş bir Vue 3 uygulamasıdır.

## Kurulum

Projeyi yerelinize çektikten sonra bağımlılıkları yükleyin:
\`\`\`bash
npm install
\`\`\`

Geliştirme sunucusunu başlatın:
\`\`\`bash
npm run serve
\`\`\`

## Testler

Projenin çekirdek iş kuralları (Business Logic) Jest kullanılarak birim testleri (Unit Test) ile güvence altına alınmıştır. Testleri koşmak için:
\`\`\`bash
npm run test:unit
\`\`\`

## Mimari Notlar

* **Telemetri Servisi (Akıllı Sepet):** Kurye koordinatları her an atılmaz. 50 koordinat veya 30 saniye kuralına göre (Batching) gönderilir. Sessizlik anlarında gereksiz veri üretilmez (Phantom Data engellenmiştir).
* **ControlPanel:** Sadece UI görevlerini üstlenen "Dumb Component" olarak tasarlanmış, iş kuralları App.vue (Orkestra Şefi) üzerine alınmıştır.