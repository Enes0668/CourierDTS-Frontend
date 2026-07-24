const XLSX = require('xlsx');

// 1. Admins
const admins = [
  { Id: 1, Name: 'Sina', Phone: '555 111 2233' },
  { Id: 2, Name: 'Enes', Phone: '555 222 3344' }
];

// 2. Couriers
const couriers = [
  { Id: 1, Name: 'Sıla YILDIRIM', Phone: '555 123 4567', IsActive: 'true', LastLat: 39.9208, LastLng: 32.8541, ActiveVehicleId: 1, DeviceId: 'MAC-1234' },
  { Id: 2, Name: 'Ecem KIVRAKDAL', Phone: '555 123 4568', IsActive: 'false', LastLat: 39.9210, LastLng: 32.8545, ActiveVehicleId: 2, DeviceId: 'MAC-5678' }
];

// 3. Vehicles
const vehicles = [
  { Id: 1, CourierId: 1, PlateNumber: '06 ABC 123', VehicleType: 'Motosiklet' },
  { Id: 2, CourierId: 2, PlateNumber: '06 DEF 456', VehicleType: 'Soğuk Zincir Panelvan' }
];

// 4. Locations
const locations = [
  { Id: 1, Name: 'Ank Ünv. Cebeci', Latitude: 32.4355, Longitude: 28.2323, ContactPerson: 'Enes DEVECİ', ContactPhone: '508 966 7788' },
  { Id: 2, Name: 'Lokman Hekim Sincan', Latitude: 31.23244, Longitude: 29.3450, ContactPerson: 'Özge ŞEKERCİ', ContactPhone: '504 789 5566' }
];

// 5. Packages
const packages = [
  { Id: 1, Barcode: '12223345', Description: 'Sitoloji Sıvısı', Priority: 1, StorageCondition: 'Oda sıcaklığı', PickupLocationId: 1, DropoffLocationId: 2, AssignedCourierId: 1, Status: 'Delivered' },
  { Id: 2, Barcode: '231231233', Description: 'Patoloji Sol Bacak', Priority: 3, StorageCondition: 'Soğuk zincir (+4°C)', PickupLocationId: 1, DropoffLocationId: 2, AssignedCourierId: 1, Status: 'Delivered' },
  { Id: 3, Barcode: '223245577', Description: 'Safra Kesesi', Priority: 5, StorageCondition: 'Dondurulmuş (-20°C)', PickupLocationId: 2, DropoffLocationId: 1, AssignedCourierId: 2, Status: 'InTransit' }
];

// 6. Journeys
const journeys = [
  { Id: 1, CourierId: 1, StartLocationId: 1, EndLocationId: 2, StartTime: '2026-07-21 11:45:00', EndTime: '2026-07-21 13:02:00', Status: 'Completed' },
  { Id: 2, CourierId: 2, StartLocationId: 2, EndLocationId: 1, StartTime: '2026-07-21 11:35:00', EndTime: '', Status: 'Active' }
];

// 7. PackageHistories
const packageHistories = [
  { Id: 1, PackageId: 1, JourneyId: 1, ActionType: 'PickedUp', ActionTime: '2026-07-21 11:45:00', Notes: 'Ankara Ünv. 3 adet parça aldım sincan LHPL a yolluyorum.' },
  { Id: 2, PackageId: 2, JourneyId: 1, ActionType: 'PickedUp', ActionTime: '2026-07-21 11:45:00', Notes: '' },
  { Id: 3, PackageId: 1, JourneyId: 1, ActionType: 'Delivered', ActionTime: '2026-07-21 13:02:00', Notes: 'Dr. Merve Yılmaz elden teslim aldı.' },
  { Id: 4, PackageId: 3, JourneyId: 2, ActionType: 'PickedUp', ActionTime: '2026-07-21 11:35:00', Notes: '1 parça safra aldım, soğuk zincir gerekli' }
];

// 8. TelemetryLogs
const telemetryLogs = [
  { Id: 1, JourneyId: 1, Latitude: 32.32455, Longitude: 28.4545, Timestamp: '2026-07-21 11:45:23' },
  { Id: 2, JourneyId: 1, Latitude: 32.32459, Longitude: 28.4549, Timestamp: '2026-07-21 11:46:23' },
  { Id: 3, JourneyId: 2, Latitude: 31.23244, Longitude: 29.3450, Timestamp: '2026-07-21 11:35:23' },
  { Id: 4, JourneyId: 2, Latitude: 31.23234, Longitude: 29.3350, Timestamp: '2026-07-21 11:36:23' }
];

const wb = XLSX.utils.book_new();

const wsAdmins = XLSX.utils.json_to_sheet(admins);
const wsCouriers = XLSX.utils.json_to_sheet(couriers);
const wsVehicles = XLSX.utils.json_to_sheet(vehicles);
const wsLocs = XLSX.utils.json_to_sheet(locations);
const wsPackages = XLSX.utils.json_to_sheet(packages);
const wsJourneys = XLSX.utils.json_to_sheet(journeys);
const wsHistory = XLSX.utils.json_to_sheet(packageHistories);
const wsTelemetry = XLSX.utils.json_to_sheet(telemetryLogs);

XLSX.utils.book_append_sheet(wb, wsAdmins, "Admins");
XLSX.utils.book_append_sheet(wb, wsCouriers, "Couriers");
XLSX.utils.book_append_sheet(wb, wsVehicles, "Vehicles");
XLSX.utils.book_append_sheet(wb, wsLocs, "Locations");
XLSX.utils.book_append_sheet(wb, wsPackages, "Packages");
XLSX.utils.book_append_sheet(wb, wsJourneys, "Journeys");
XLSX.utils.book_append_sheet(wb, wsHistory, "PackageHistories");
XLSX.utils.book_append_sheet(wb, wsTelemetry, "TelemetryLogs");

XLSX.writeFile(wb, "Guncel_KuryeTakip_Mimarisi.xlsx");
console.log("Excel dosyası Guncel_KuryeTakip_Mimarisi.xlsx adıyla oluşturuldu!");
