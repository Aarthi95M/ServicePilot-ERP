using FluentValidation;
using FluentValidation.AspNetCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Serilog;
using ServicePilot.API.Extensions;
using ServicePilot.API.Middleware;
using ServicePilot.Application.Validators;
using ServicePilot.Infrastructure;
using ServicePilot.Infrastructure.Persistence.Models;
using System.Text;
using System.Threading.RateLimiting;

// ── Serilog bootstrap logger ──────────────────────────────────────────────────
// Used for any errors that happen before the full host is built.
// Replaced by the fully configured logger below once the host starts.
Log.Logger = new LoggerConfiguration()
    .WriteTo.Console()
    .CreateBootstrapLogger();

try
{
    Log.Information("Starting ServicePilot API");

    var builder = WebApplication.CreateBuilder(args);

    // ── Serilog ───────────────────────────────────────────────────────────────────
    // Reads optional overrides from appsettings.json "Serilog" section.
    // .NET equivalent: replacing the default Microsoft.Extensions.Logging.
    builder.Host.UseSerilog((context, services, config) =>
    {
        config
            .ReadFrom.Configuration(context.Configuration) // appsettings overrides
            .ReadFrom.Services(services)                   // DI-injected enrichers
            .Enrich.FromLogContext()
            .WriteTo.Console(
                outputTemplate: "[{Timestamp:HH:mm:ss} {Level:u3}] {Message:lj}{NewLine}{Exception}")
            .WriteTo.File(
                path: "logs/servicepilot-.log",
                rollingInterval: RollingInterval.Day,
                retainedFileCountLimit: 14,
                outputTemplate: "{Timestamp:yyyy-MM-dd HH:mm:ss.fff zzz} [{Level:u3}] {Message:lj}{NewLine}{Exception}");
    });

    // ── Controllers ──────────────────────────────────────────────────────────────
    builder.Services.AddControllers()
        .AddJsonOptions(options =>
        {
            // Serialize enums as strings ("Present" not 2)
            options.JsonSerializerOptions.Converters
                .Add(new System.Text.Json.Serialization.JsonStringEnumConverter());

            // Prevent circular-reference serialisation errors
            options.JsonSerializerOptions.ReferenceHandler =
                System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
        });

    // ── Swagger ───────────────────────────────────────────────────────────────────
    builder.Services.AddEndpointsApiExplorer();
    builder.Services.AddSwaggerDocumentation();
    builder.Services.AddDistributedMemoryCache();

    // ── Application services (scoped repos, services, etc.) ──────────────────────
    builder.Services.AddInfrastructure(builder.Configuration);
    builder.Services.AddAutoMapper(AppDomain.CurrentDomain.GetAssemblies());

    // ── Validation ────────────────────────────────────────────────────────────────
    builder.Services.AddFluentValidationAutoValidation();
    builder.Services.AddValidatorsFromAssemblyContaining<CreateEmployeeDtoValidator>();

    // ── Database ──────────────────────────────────────────────────────────────────
    // Single registration — MigrationsAssembly must be set here.
    // DependencyInjection.cs intentionally does NOT add a second DbContext.
    builder.Services.AddDbContext<AppDbContext>(options =>
        options.UseNpgsql(
            builder.Configuration.GetConnectionString("DefaultConnection"),
            npgsql => npgsql.MigrationsAssembly("ServicePilot.Infrastructure")
        ));

    // ── JWT Authentication ────────────────────────────────────────────────────────
    var jwtSecret = builder.Configuration["JwtSettings:Secret"]
        ?? throw new InvalidOperationException(
            "JwtSettings:Secret is not configured. " +
            "Set it in appsettings.Development.json (local) or via the " +
            "JwtSettings__Secret environment variable (production).");

    builder.Services
        .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
        .AddJwtBearer(options =>
        {
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuer           = true,
                ValidateAudience         = true,
                ValidateLifetime         = true,
                ValidateIssuerSigningKey = true,
                ValidIssuer              = builder.Configuration["JwtSettings:Issuer"],
                ValidAudience            = builder.Configuration["JwtSettings:Audience"],
                IssuerSigningKey         = new SymmetricSecurityKey(
                                               Encoding.UTF8.GetBytes(jwtSecret))
            };
        });

    // ── CORS ──────────────────────────────────────────────────────────────────────
    // Origins are read from configuration so they can differ per environment:
    //   Development  → appsettings.Development.json  Cors:AllowedOrigins
    //   Production   → appsettings.Production.json   Cors:AllowedOrigins
    //                  or env var Cors__AllowedOrigins__0=https://app.yourdomain.com
    var allowedOrigins = builder.Configuration
        .GetSection("Cors:AllowedOrigins")
        .Get<string[]>();

    if (allowedOrigins == null || allowedOrigins.Length == 0)
        throw new InvalidOperationException(
            "Cors:AllowedOrigins is not configured. " +
            "Add at least one origin to appsettings.json or appsettings.Production.json.");

    builder.Services.AddCors(options =>
    {
        options.AddPolicy("DashboardPolicy", policy =>
            policy.WithOrigins(allowedOrigins)
                  .AllowAnyHeader()
                  .AllowAnyMethod()
                  .AllowCredentials());
    });

    // ── Rate Limiting ─────────────────────────────────────────────────────────────
    // Built-in ASP.NET Core 7+ rate limiter — no extra package needed.
    //
    // "login"  — 5 attempts per IP per minute to protect against brute force.
    //            Applied via [EnableRateLimiting("login")] on POST /api/auth/login.
    //
    // "api"    — 200 requests per IP per minute for general API endpoints.
    //            Not applied globally here; add [EnableRateLimiting("api")] per
    //            controller/action as needed.
    builder.Services.AddRateLimiter(options =>
    {
        options.AddFixedWindowLimiter("login", opt =>
        {
            opt.PermitLimit          = 5;
            opt.Window               = TimeSpan.FromMinutes(1);
            opt.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
            opt.QueueLimit           = 0;
        });

        options.AddFixedWindowLimiter("api", opt =>
        {
            opt.PermitLimit          = 200;
            opt.Window               = TimeSpan.FromMinutes(1);
            opt.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
            opt.QueueLimit           = 0;
        });

        // Return 429 with a JSON body matching our ApiResponse shape
        options.RejectionStatusCode = 429;
        options.OnRejected = async (context, token) =>
        {
            context.HttpContext.Response.ContentType = "application/json";
            await context.HttpContext.Response.WriteAsync(
                "{\"success\":false,\"message\":\"Too many requests. Please wait and try again.\"}",
                token);
        };
    });

    // ── Health Checks ─────────────────────────────────────────────────────────────
    // GET /health → 200 if DB is reachable, 503 otherwise.
    // Use this in your load balancer / Docker HEALTHCHECK.
    builder.Services
        .AddHealthChecks()
        .AddDbContextCheck<AppDbContext>(name: "database");

    // ── Build ─────────────────────────────────────────────────────────────────────
    var app = builder.Build();

    // ── Auto-migrate database on startup ──────────────────────────────────────────
    // Runs any pending EF Core migrations automatically when the app starts.
    // Safe to run on every deploy — EF Core is idempotent (skips applied migrations).
    // Removes the need to run "dotnet ef database update" manually on the server.
    using (var scope = app.Services.CreateScope())
    {
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        db.Database.Migrate();
        Log.Information("Database migration check complete.");
    }

    // Global exception handler — must be first in the pipeline
    app.UseMiddleware<ExceptionMiddleware>();

    if (app.Environment.IsDevelopment())
    {
        app.UseSwagger();
        app.UseSwaggerUI();
    }

    app.UseHttpsRedirection();

    // Structured HTTP request logging — replaces default Microsoft request logs
    app.UseSerilogRequestLogging(opts =>
    {
        opts.MessageTemplate =
            "HTTP {RequestMethod} {RequestPath} responded {StatusCode} in {Elapsed:0.0000} ms";
    });

    app.UseCors("DashboardPolicy");
    app.UseRateLimiter();
    app.UseAuthentication();
    app.UseAuthorization();

    app.MapControllers();

    // Health check endpoint — no auth required (hit by load balancers)
    app.MapHealthChecks("/health");

    app.Run();
}
catch (Exception ex) when (ex is not HostAbortedException)
{
    Log.Fatal(ex, "ServicePilot API failed to start");
    throw;
}
finally
{
    Log.CloseAndFlush();
}
