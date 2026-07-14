/**
 * İki koordinat arasındaki yön açısını (bearing) hesaplar ve motor ikonunun 
 * yola tam oturması için gereken +90 derecelik düzeltmeyi ekler.
 * @param {Object} oldPos - Önceki konum {lat, lng}
 * @param {Object} newPos - Yeni konum {lat, lng}
 * @returns {number|null} - Hedef açı (derece) veya hareket yoksa null
 */
export function calculateBearing(oldPos, newPos) {
  const dy = newPos.lat - oldPos.lat;
  const dx = newPos.lng - oldPos.lng;
  
  // Eğer hareket yoksa açı hesaplamaya gerek yok
  if (dy === 0 && dx === 0) return null;

  // Math.atan2 bize Doğu'nun 0, Kuzey'in 90 olduğu bir açı verir
  const heading = Math.atan2(dx, dy) * (180 / Math.PI);
  return heading + 90; // İkonun yönü için +90 ekliyoruz
}

/**
 * CSS transform: rotate() işlemi sırasında motorun 360 dereceden 0'a geçerken 
 * ters yöne takla atmasını engeller.
 * @param {number} currentAngle - Motosikletin şu anki mevcut açısı
 * @param {number} previousTargetAngle - Bir önceki hesaplanan hedef açı
 * @param {number} targetAngle - Gitmesi gereken yeni hedef açı
 * @returns {number} - CSS'e uygulanacak sürekli ve pürüzsüz yeni açı
 */
export function calculateSmoothRotation(currentAngle, previousTargetAngle, targetAngle) {
  let newAngle = currentAngle;
  
  if (previousTargetAngle !== null) {
    let delta = targetAngle - previousTargetAngle;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    newAngle += delta;
  } else {
    newAngle = targetAngle;
  }
  
  return newAngle;
}