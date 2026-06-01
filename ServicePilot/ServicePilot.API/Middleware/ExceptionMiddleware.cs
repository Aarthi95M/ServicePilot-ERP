using ServicePilot.Shared.Responses;
using System.Net;
using System.Text.Json;

namespace ServicePilot.API.Middleware
{
    /// <summary>
    /// Global exception handler.
    /// - Logs the full exception with stack trace internally.
    /// - Returns a safe, generic message to the client in Production.
    /// - Returns the real exception message in Development only (useful for debugging).
    /// </summary>
    public class ExceptionMiddleware
    {
        private readonly RequestDelegate        _next;
        private readonly ILogger<ExceptionMiddleware> _logger;
        private readonly IWebHostEnvironment    _env;

        public ExceptionMiddleware(
            RequestDelegate next,
            ILogger<ExceptionMiddleware> logger,
            IWebHostEnvironment env)
        {
            _next   = next;
            _logger = logger;
            _env    = env;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            try
            {
                await _next(context);
            }
            catch (Exception ex)
            {
                // Always log the full exception so we can diagnose problems in prod.
                _logger.LogError(ex,
                    "Unhandled exception — {Method} {Path}",
                    context.Request.Method,
                    context.Request.Path);

                context.Response.ContentType = "application/json";
                context.Response.StatusCode  = (int)HttpStatusCode.InternalServerError;

                // In Development: return the real message so devs can debug quickly.
                // In Production:  return a generic message — never expose internals.
                var message = _env.IsDevelopment()
                    ? $"{ex.GetType().Name}: {ex.Message}"
                    : "An unexpected error occurred. Please try again later.";

                var response = new ApiResponse<string>
                {
                    Success = false,
                    Message = message
                };

                var json = JsonSerializer.Serialize(response,
                    new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });

                await context.Response.WriteAsync(json);
            }
        }
    }
}
