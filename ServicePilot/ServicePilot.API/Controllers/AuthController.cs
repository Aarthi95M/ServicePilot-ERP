using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using ServicePilot.Application.DTOs.Auth;
using ServicePilot.Application.Interfaces.Services;

namespace ServicePilot.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : Controller
    {
        private readonly IAuthService _authService;

        public AuthController(IAuthService authService)
        {
            _authService = authService;
        }

        /// <summary>
        /// Authenticate with email + password. Returns a JWT on success.
        /// Rate-limited to 5 attempts per IP per minute to prevent brute force.
        /// </summary>
        [HttpPost("login")]
        [EnableRateLimiting("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequestDto request)
        {
            var response = await _authService.LoginAsync(request);
            return response.Success ? Ok(response) : Unauthorized(response);
        }

        /// <summary>
        /// Request a password-reset link. Generates a short-lived token and
        /// (in production) sends it via email. Token is valid for 1 hour.
        /// Always returns success to avoid leaking whether the email exists.
        /// </summary>
        [HttpPost("forgot-password")]
        [EnableRateLimiting("login")]   // same 5/min throttle — prevents enumeration
        public async Task<IActionResult> ForgotPassword(
            [FromBody] ForgotPasswordRequestDto request)
        {
            await _authService.ForgotPasswordAsync(request);
            // Always 200 — don't reveal whether the email exists
            return Ok(new { success = true, message = "If that email is registered you will receive a reset link shortly." });
        }

        /// <summary>
        /// Complete the password reset using the token from the email link.
        /// Token must be unused and not expired.
        /// </summary>
        [HttpPost("reset-password")]
        public async Task<IActionResult> ResetPassword(
            [FromBody] ResetPasswordRequestDto request)
        {
            var response = await _authService.ResetPasswordAsync(request);
            return response.Success ? Ok(response) : BadRequest(response);
        }

        /// <summary>
        /// Change password for the currently authenticated user.
        /// Requires the existing password to be supplied for verification.
        /// Used by the mobile app profile → Change Password screen.
        /// </summary>
        [HttpPost("change-password")]
        [Authorize]
        public async Task<IActionResult> ChangePassword(
            [FromBody] ChangePasswordRequestDto request)
        {
            var response = await _authService.ChangePasswordAsync(request);
            return response.Success ? Ok(response) : BadRequest(response);
        }
    }
}
