using FluentValidation;
using ServicePilot.Application.DTOs.Users;
using ServicePilot.Domain.Constants;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ServicePilot.Application.Validators
{
    public class CreateUserDtoValidator : AbstractValidator<CreateUserDto>
    {
        private static readonly string[] ValidRoles =
        {
            Roles.Admin, Roles.HRManager, Roles.Supervisor,
            Roles.Dispatcher, Roles.Technician
        };

        public CreateUserDtoValidator()
        {
            RuleFor(x => x.FullName)
                .NotEmpty().WithMessage("Full name is required.")
                .MaximumLength(200).WithMessage("Full name must not exceed 200 characters.");

            RuleFor(x => x.Email)
                .NotEmpty().WithMessage("Email is required.")
                .EmailAddress().WithMessage("A valid email address is required.")
                .MaximumLength(200);

            RuleFor(x => x.Role)
                .NotEmpty().WithMessage("Role is required.")
                .Must(r => ValidRoles.Contains(r))
                .WithMessage($"Role must be one of: {string.Join(", ", ValidRoles)}.");

            RuleFor(x => x.Password)
                .NotEmpty().WithMessage("Password is required.")
                .MinimumLength(8).WithMessage("Password must be at least 8 characters.")
                .MaximumLength(100);

            // Supervisor and Technician must have a branch
            RuleFor(x => x.BranchId)
                .NotNull()
                .WithMessage("Branch is required for Supervisor and Technician roles.")
                .When(x => x.Role == Roles.Supervisor || x.Role == Roles.Technician);

            RuleFor(x => x.PhoneNumber)
                .MaximumLength(50)
                .When(x => !string.IsNullOrWhiteSpace(x.PhoneNumber));
        }
    }
}
