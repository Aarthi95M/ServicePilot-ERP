namespace ServicePilot.Application.DTOs.Auth;

public class ResetPasswordRequestDto
{
    /// <summary>The opaque token from the reset email link.</summary>
    public string Token { get; set; } = string.Empty;

    /// <summary>The new password chosen by the user.</summary>
    public string NewPassword { get; set; } = string.Empty;
}
