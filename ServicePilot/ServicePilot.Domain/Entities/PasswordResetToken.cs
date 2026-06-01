namespace ServicePilot.Domain.Entities;

/// <summary>
/// Short-lived token used to reset a user's password.
/// One active (unused, unexpired) token per user at a time.
/// The raw token is sent in the email link; only the SHA-256 hash is stored.
/// </summary>
public class PasswordResetToken
{
    public Guid   Id         { get; set; }
    public Guid   UserId     { get; set; }

    /// <summary>SHA-256 hash of the raw token — never store the raw value.</summary>
    public string TokenHash  { get; set; } = null!;

    public DateTime ExpiresAt  { get; set; }
    public bool     IsUsed     { get; set; }
    public DateTime CreatedAt  { get; set; }

    public virtual User User { get; set; } = null!;
}
