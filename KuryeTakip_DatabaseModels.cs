using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace KuryeTakip.Models
{
    public class Admin
    {
        [Key]
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
    }

    public class Courier
    {
        [Key]
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public bool IsActive { get; set; }
        public double LastLat { get; set; }
        public double LastLng { get; set; }
        public string? DeviceId { get; set; }
        
        public int? ActiveVehicleId { get; set; }
        [ForeignKey("ActiveVehicleId")]
        public virtual Vehicle? ActiveVehicle { get; set; }

        public virtual ICollection<Package> CurrentPackages { get; set; } = new List<Package>();
        public virtual ICollection<Journey> Journeys { get; set; } = new List<Journey>();
    }

    public class Vehicle
    {
        [Key]
        public int Id { get; set; }
        
        public int CourierId { get; set; }
        [ForeignKey("CourierId")]
        public virtual Courier Courier { get; set; } = null!;
        
        public string PlateNumber { get; set; } = string.Empty;
        public string VehicleType { get; set; } = string.Empty;
    }

    public class Location
    {
        [Key]
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public double Latitude { get; set; }
        public double Longitude { get; set; }
        public string? ContactPerson { get; set; }
        public string? ContactPhone { get; set; }
    }

    public class Package
    {
        [Key]
        public int Id { get; set; }
        public string? Barcode { get; set; }
        public string Description { get; set; } = string.Empty;
        public short Priority { get; set; }
        public string? StorageCondition { get; set; } 
        
        public int PickupLocationId { get; set; }
        [ForeignKey("PickupLocationId")]
        public virtual Location PickupLocation { get; set; } = null!;

        public int DropoffLocationId { get; set; }
        [ForeignKey("DropoffLocationId")]
        public virtual Location DropoffLocation { get; set; } = null!;

        public int? AssignedCourierId { get; set; }
        [ForeignKey("AssignedCourierId")]
        public virtual Courier? AssignedCourier { get; set; }

        public string Status { get; set; } = "Pending"; // Pending, InTransit, Delivered
        
        public virtual ICollection<PackageHistory> Histories { get; set; } = new List<PackageHistory>();
    }

    public class Journey
    {
        [Key]
        public int Id { get; set; }
        
        public int CourierId { get; set; }
        [ForeignKey("CourierId")]
        public virtual Courier Courier { get; set; } = null!;

        public int StartLocationId { get; set; }
        [ForeignKey("StartLocationId")]
        public virtual Location StartLocation { get; set; } = null!;

        public int EndLocationId { get; set; }
        [ForeignKey("EndLocationId")]
        public virtual Location EndLocation { get; set; } = null!;

        public DateTime StartTime { get; set; }
        public DateTime? EndTime { get; set; }
        
        public string Status { get; set; } = "Active"; // Active, Completed, Cancelled

        public virtual ICollection<TelemetryLog> TelemetryLogs { get; set; } = new List<TelemetryLog>();
        public virtual ICollection<PackageHistory> PackageHistories { get; set; } = new List<PackageHistory>();
    }

    public class PackageHistory
    {
        [Key]
        public int Id { get; set; }
        
        public int PackageId { get; set; }
        [ForeignKey("PackageId")]
        public virtual Package Package { get; set; } = null!;

        public int? JourneyId { get; set; }
        [ForeignKey("JourneyId")]
        public virtual Journey? Journey { get; set; }
        
        public string ActionType { get; set; } = string.Empty; // Created, PickedUp, Delivered
        public DateTime ActionTime { get; set; } = DateTime.UtcNow;
        public string? Notes { get; set; }
    }

    public class TelemetryLog
    {
        [Key]
        public int Id { get; set; }
        
        public int JourneyId { get; set; }
        [ForeignKey("JourneyId")]
        public virtual Journey Journey { get; set; } = null!;

        public double Latitude { get; set; }
        public double Longitude { get; set; }
        public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    }
}
