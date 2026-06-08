using FluentValidation;
using ServicePilot.Application.DTOs.Employees;
using ServicePilot.Domain.Constants;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ServicePilot.Application.Validators
{
    /// <summary>
    /// Validates the combined "create field staff" payload (Employee profile +
    /// mobile login in one step). Previously this DTO had NO FluentValidation
    /// validator at all — only loose inline checks in the service layer — which
    /// allowed malformed phone numbers / emails to slip through to the database.
    ///
    /// Mirrors the field-level rules from CreateEmployeeDtoValidator (phone
    /// format, future-dated documents) and CreateUserDtoValidator (role,
    /// password strength) so Technician/Supervisor creation is held to the
    /// same standard as the other two creation paths.
    /// </summary>
    public class CreateTechnicianDtoValidator : AbstractValidator<CreateTechnicianDto>
    {
        private static readonly string[] ValidRoles = { Roles.Technician, Roles.Supervisor };

        // Same pattern used by CreateEmployeeDtoValidator — digits, spaces,
        // dashes, parentheses and an optional leading '+', 7–20 chars.
        private const string PhonePattern = @"^\+?[0-9\s\-\(\)]{7,20}$";

        public CreateTechnicianDtoValidator()
        {
            RuleFor(x => x.FullName)
                .NotEmpty().WithMessage("Full name is required.")
                .MaximumLength(200).WithMessage("Full name must not exceed 200 characters.");

            RuleFor(x => x.Role)
                .NotEmpty().WithMessage("Role is required.")
                .Must(r => ValidRoles.Contains(r, StringComparer.OrdinalIgnoreCase))
                .WithMessage("Role must be either 'Technician' or 'Supervisor'.");

            // ── Contact fields ────────────────────────────────────────────
            // Email and PhoneNumber are independent, optional fields — each
            // validated in its own lane. The cross-field rule further down
            // guards against the two getting cross-contaminated (e.g. a form
            // bug or pasted value landing the email address in the phone field).

            RuleFor(x => x.Email)
                .EmailAddress().WithMessage("A valid email address is required.")
                .MaximumLength(200).WithMessage("Email must not exceed 200 characters.")
                .When(x => !string.IsNullOrWhiteSpace(x.Email));

            RuleFor(x => x.PhoneNumber)
                .MaximumLength(50).WithMessage("Phone number must not exceed 50 characters.")
                .Matches(PhonePattern).WithMessage("Phone number format is invalid. Use digits, spaces, dashes, parentheses and an optional leading +.")
                .When(x => !string.IsNullOrWhiteSpace(x.PhoneNumber));

            // Guards against the phone number accidentally being populated
            // with an email address (or vice versa) — a malformed value that
            // would otherwise pass each individual rule's "When" branch since
            // both fields are optional and checked independently.
            RuleFor(x => x.PhoneNumber)
                .Must((dto, phone) =>
                    string.IsNullOrWhiteSpace(phone) ||
                    !string.Equals(phone.Trim(), dto.Email?.Trim(), StringComparison.OrdinalIgnoreCase))
                .WithMessage("Phone number cannot be the same as the email address.")
                .When(x => !string.IsNullOrWhiteSpace(x.PhoneNumber) && !string.IsNullOrWhiteSpace(x.Email));

            RuleFor(x => x.PhoneNumber)
                .Must((dto, phone) =>
                    string.IsNullOrWhiteSpace(phone) ||
                    !string.Equals(phone.Trim(), dto.LoginEmail?.Trim(), StringComparison.OrdinalIgnoreCase))
                .WithMessage("Phone number cannot be the same as the login email.")
                .When(x => !string.IsNullOrWhiteSpace(x.PhoneNumber) && !string.IsNullOrWhiteSpace(x.LoginEmail));

            // ── Login fields ──────────────────────────────────────────────

            RuleFor(x => x.LoginEmail)
                .EmailAddress().WithMessage("A valid login email address is required.")
                .MaximumLength(200).WithMessage("Login email must not exceed 200 characters.")
                .When(x => !string.IsNullOrWhiteSpace(x.LoginEmail));

            // The service falls back to Email when LoginEmail is blank, but
            // at least one must be present — fail fast with a field-level
            // message instead of letting it bubble up as a generic service error.
            RuleFor(x => x)
                .Must(x => !string.IsNullOrWhiteSpace(x.LoginEmail) || !string.IsNullOrWhiteSpace(x.Email))
                .WithMessage("A login email is required — provide either Email or Login Email.")
                .OverridePropertyName("LoginEmail");

            RuleFor(x => x.Password)
                .NotEmpty().WithMessage("Password is required.")
                .MinimumLength(8).WithMessage("Password must be at least 8 characters.")
                .MaximumLength(100).WithMessage("Password must not exceed 100 characters.");

            // ── HR document expiry dates ──────────────────────────────────
            // Mirrors CreateEmployeeDtoValidator — an expiry date in the past
            // makes no sense for a brand-new record.

            RuleFor(x => x.VisaExpiryDate)
                .GreaterThan(DateOnly.FromDateTime(DateTime.UtcNow))
                .WithMessage("Visa expiry date must be a future date.")
                .When(x => x.VisaExpiryDate.HasValue);

            RuleFor(x => x.PassportExpiryDate)
                .GreaterThan(DateOnly.FromDateTime(DateTime.UtcNow))
                .WithMessage("Passport expiry date must be a future date.")
                .When(x => x.PassportExpiryDate.HasValue);

            RuleFor(x => x.EmiratesIdExpiryDate)
                .GreaterThan(DateOnly.FromDateTime(DateTime.UtcNow))
                .WithMessage("Emirates ID expiry date must be a future date.")
                .When(x => x.EmiratesIdExpiryDate.HasValue);

            RuleFor(x => x.BasicSalary)
                .GreaterThanOrEqualTo(0).WithMessage("Basic salary cannot be negative.")
                .When(x => x.BasicSalary.HasValue);
        }
    }
}
