using FluentValidation;
using ServicePilot.Application.DTOs.SuperAdmin;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ServicePilot.Application.Validators
{
    public class CreateCompanyDtoValidator : AbstractValidator<CreateCompanyDto>
    {
        public CreateCompanyDtoValidator()
        {
            RuleFor(x => x.CompanyName)
                .NotEmpty().WithMessage("Company name is required.")
                .MaximumLength(200);

            RuleFor(x => x.CompanyEmail)
                .EmailAddress().WithMessage("A valid company email is required.")
                .When(x => !string.IsNullOrWhiteSpace(x.CompanyEmail));

            RuleFor(x => x.AdminFullName)
                .NotEmpty().WithMessage("Admin full name is required.")
                .MaximumLength(200);

            RuleFor(x => x.AdminEmail)
                .NotEmpty().WithMessage("Admin email is required.")
                .EmailAddress().WithMessage("A valid admin email is required.");

            RuleFor(x => x.AdminPassword)
                .NotEmpty().WithMessage("Admin password is required.")
                .MinimumLength(8).WithMessage("Admin password must be at least 8 characters.");
        }
    }
}
