using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.Identity.Web;
using CourierDTS.Data;
using NLog;
using NLog.Web;

var logger = LogManager.Setup().LoadConfigurationFromAppSettings().GetCurrentClassLogger();
logger.Debug("Starting up CourierDTS");

try
{
    var builder = WebApplication.CreateBuilder(args);

    builder.Logging.ClearProviders();
    builder.Host.UseNLog();

    // Add services to the container.
    builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
        .AddMicrosoftIdentityWebApi(builder.Configuration.GetSection("AzureAd"));

    builder.Services.AddControllers()
        .AddJsonOptions(options => options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()));

    builder.Services.AddDbContext<AppDbContext>(options =>
        options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

    // Frontend henüz hangi adreste çalışacak netleşmedi - şimdilik her origin'e izin
    // veriyoruz, üretime geçerken belirli adres(ler)e kısıtlanmalı.
    builder.Services.AddCors(options =>
    {
        options.AddPolicy("AllowFrontend", policy =>
        {
            policy.AllowAnyOrigin()
                  .AllowAnyMethod()
                  .AllowAnyHeader();
        });
    });

    var app = builder.Build();

    // Otomatik Veritabanı Kurulumu ve Demo Verisi
    using (var scope = app.Services.CreateScope())
    {
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        db.Database.Migrate();

        // Botun rotaları için gerekli 2 lokasyon
        if (!db.Locations.Any())
        {
            db.Locations.Add(new CourierDTS.Models.Location { Id = 1, Name = "AYBÜ Kampüs", Latitude = 40.2316, Longitude = 33.0225 });
            db.Locations.Add(new CourierDTS.Models.Location { Id = 2, Name = "Medipol Laboratuvarı", Latitude = 39.9208, Longitude = 32.8541 });
            db.SaveChanges();
        }
        
        // Simülatör kuryesi
        if (!db.Couriers.Any())
        {
            db.Couriers.Add(new CourierDTS.Models.Courier { Id = 1, Name = "Simülatör", Surname = "Kurye", Sex = 'E', DateOfBirth = new DateOnly(1990, 1, 1), Phone = "555", IsActive = true, LastLat = 40.2316, LastLng = 33.0225 });
            db.SaveChanges();
        }
    }

    // Configure the HTTP request pipeline.

    app.UseHttpsRedirection();

    app.UseCors("AllowFrontend");

    app.UseAuthentication();
    app.UseAuthorization();

    app.MapControllers();

    app.Run();
}
catch (Exception ex)
{
    logger.Error(ex, "Program stopped due to exception");
    throw;
}
finally
{
    LogManager.Shutdown();
}
