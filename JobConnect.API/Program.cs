using System.Text;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using JobConnect.API.Data;
using JobConnect.API.Services;
using JobConnect.API.Hubs;

// Disable Npgsql UTC timestamp conversion - use local times
AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);

var builder = WebApplication.CreateBuilder(args);

// Load .env file if it exists (for local development)
var envPath = Path.Combine(Directory.GetCurrentDirectory(), ".env");
if (File.Exists(envPath))
{
    foreach (var line in File.ReadAllLines(envPath))
    {
        if (string.IsNullOrWhiteSpace(line) || line.StartsWith("#")) continue;
        var parts = line.Split('=', 2);
        if (parts.Length == 2)
        {
            Environment.SetEnvironmentVariable(parts[0].Trim(), parts[1].Trim());
        }
    }
}

// Helper to convert PostgreSQL URI to ADO.NET connection string
static string ConvertConnectionString(string? connectionString)
{
    if (string.IsNullOrEmpty(connectionString))
        return connectionString ?? "";
    
    // Check if it's a PostgreSQL URI format (postgres:// or postgresql://)
    if (connectionString.StartsWith("postgres://") || connectionString.StartsWith("postgresql://"))
    {
        var uri = new Uri(connectionString);
        var userInfo = uri.UserInfo.Split(':');
        var username = userInfo.Length > 0 ? userInfo[0] : "postgres";
        var password = userInfo.Length > 1 ? userInfo[1] : "";
        var host = uri.Host;
        var port = uri.Port > 0 ? uri.Port : 5432;
        var database = uri.AbsolutePath.TrimStart('/');
        
        return $"Host={host};Port={port};Database={database};Username={username};Password={password}";
    }
    
    // Already in ADO.NET format
    return connectionString;
}

// Add services to the container
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
        options.JsonSerializerOptions.Converters.Add(new JobConnect.API.Converters.LocalDateTimeConverter());
    });
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddOpenApi();

// Database - supports both PostgreSQL URI and ADO.NET formats
var connectionString = ConvertConnectionString(builder.Configuration.GetConnectionString("DefaultConnection"));
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseNpgsql(connectionString));

// Services
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IMatchingScoreService, MatchingScoreService>();
builder.Services.AddScoped<IInterviewSchedulingService, InterviewSchedulingService>();
builder.Services.AddSingleton<IHmsService, HmsService>();
builder.Services.AddSingleton<INotificationHubService, NotificationHubService>();

// SignalR
builder.Services.AddSignalR();

// JWT Authentication
var jwtSecret = builder.Configuration["JwtSettings:Secret"] ?? "YourSuperSecretKeyThatIsAtLeast32CharactersLong!";
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["JwtSettings:Issuer"] ?? "JobConnect",
            ValidAudience = builder.Configuration["JwtSettings:Audience"] ?? "JobConnectUsers",
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret))
        };
        // Allow JWT token from query string for SignalR WebSocket
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                var accessToken = context.Request.Query["access_token"];
                var path = context.HttpContext.Request.Path;
                if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs"))
                {
                    context.Token = accessToken;
                }
                return Task.CompletedTask;
            }
        };
    });

builder.Services.AddAuthorization();

// CORS
var corsOrigins = builder.Configuration["CorsOrigins"]?.Split(',', StringSplitOptions.RemoveEmptyEntries)
    ?? new[] { "http://localhost:4200", "http://localhost:4201" };

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAngular", policy =>
    {
        policy.WithOrigins(corsOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

var app = builder.Build();

// Configure the HTTP request pipeline
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseCors("AllowAngular");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// SignalR Hub endpoint
app.MapHub<NotificationHub>("/hubs/notifications");

// Health check endpoint
app.MapGet("/api/health", () => new { status = "healthy", timestamp = DateTime.UtcNow });

// Auto-create database on startup (only creates tables if they don't exist)
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    
    // EnsureCreated checks if the database exists, and if not, creates it along with all tables
    // If the database already exists with tables, it does nothing (no error)
    db.Database.EnsureCreated();
    
    // Fix timestamp columns to prevent timezone conversion (run only once, safe to repeat)
    try
    {
        db.Database.ExecuteSqlRaw(@"
            ALTER TABLE ""Interviews"" 
            ALTER COLUMN ""ScheduledAt"" TYPE timestamp without time zone USING ""ScheduledAt"" AT TIME ZONE 'UTC',
            ALTER COLUMN ""EndsAt"" TYPE timestamp without time zone USING ""EndsAt"" AT TIME ZONE 'UTC'
        ");
    }
    catch { /* Column type might already be correct */ }
    
    try
    {
        // Seed admin account if not exists and credentials are configured
        var adminEmail = builder.Configuration["AdminSettings:Email"];
        var adminPassword = builder.Configuration["AdminSettings:Password"];
        
        if (!string.IsNullOrEmpty(adminEmail) && !string.IsNullOrEmpty(adminPassword) 
            && !db.Users.Any(u => u.Role == JobConnect.API.Models.UserRole.Admin))
        {
            var authService = scope.ServiceProvider.GetRequiredService<IAuthService>();
            var adminUser = new JobConnect.API.Models.User
            {
                Email = adminEmail,
                PasswordHash = authService.HashPassword(adminPassword),
                Role = JobConnect.API.Models.UserRole.Admin,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            db.Users.Add(adminUser);
            db.SaveChanges();
            Console.WriteLine($"Admin account created: {adminEmail}");
        }
        
        // Seed sample data (only when SEED_DATABASE=true)
        if (builder.Configuration["SEED_DATABASE"]?.ToLower() == "true")
        {
            var forceSeed = builder.Configuration["FORCE_SEED"]?.ToLower() == "true";
            var authServiceForSeeder = scope.ServiceProvider.GetRequiredService<IAuthService>();
            DatabaseSeeder.SeedData(db, authServiceForSeeder, forceSeed);
        }
        
        // Note: Interview creation removed - use the app UI to create interviews
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Warning: Database seeding skipped - {ex.Message}");
    }
}

app.Run();
