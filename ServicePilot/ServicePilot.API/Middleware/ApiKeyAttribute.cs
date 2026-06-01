using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace ServicePilot.API.Middleware
{
    /// <summary>
    /// Requires a valid X-Api-Key header matching SuperAdmin:ApiKey in configuration.
    /// Apply to any endpoint that must not be publicly accessible (e.g. SuperAdmin routes).
    ///
    /// Configuration key: SuperAdmin:ApiKey
    /// Header name:       X-Api-Key
    ///
    /// In production set via environment variable:
    ///   SuperAdmin__ApiKey=<strong-random-value>
    /// </summary>
    [AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
    public class ApiKeyAttribute : Attribute, IAsyncActionFilter
    {
        private const string HeaderName = "X-Api-Key";
        private const string ConfigKey  = "SuperAdmin:ApiKey";

        public async Task OnActionExecutionAsync(
            ActionExecutingContext context,
            ActionExecutionDelegate next)
        {
            // Header must be present
            if (!context.HttpContext.Request.Headers.TryGetValue(HeaderName, out var providedKey)
                || string.IsNullOrWhiteSpace(providedKey))
            {
                context.Result = new UnauthorizedObjectResult(new
                {
                    Success = false,
                    Message = $"Missing required header: {HeaderName}"
                });
                return;
            }

            var config   = context.HttpContext.RequestServices.GetRequiredService<IConfiguration>();
            var validKey = config[ConfigKey];

            // Reject if the configured key is missing or empty (misconfigured server)
            if (string.IsNullOrWhiteSpace(validKey))
            {
                context.Result = new ObjectResult(new
                {
                    Success = false,
                    Message = "SuperAdmin API key is not configured on the server."
                })
                { StatusCode = StatusCodes.Status503ServiceUnavailable };
                return;
            }

            // Constant-time comparison to prevent timing attacks
            if (!CryptographicEquals(validKey, providedKey!))
            {
                context.Result = new UnauthorizedObjectResult(new
                {
                    Success = false,
                    Message = "Invalid API key."
                });
                return;
            }

            await next();
        }

        /// <summary>
        /// Compares two strings in constant time so the comparison duration
        /// does not leak information about how many characters matched.
        /// </summary>
        private static bool CryptographicEquals(string a, string b)
        {
            if (a.Length != b.Length) return false;
            int diff = 0;
            for (int i = 0; i < a.Length; i++)
                diff |= a[i] ^ b[i];
            return diff == 0;
        }
    }
}
