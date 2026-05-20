using FluentValidation;
using ServicePilot.Application.DTOs.Employees;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ServicePilot.Application.Validators
{
    public class UpdateEmployeeDtoValidator : AbstractValidator<UpdateEmployeeDto>
    {
        public UpdateEmployeeDtoValidator()
        {
            RuleFor(x => x.FullName)
                .NotEmpty().WithMessage("Full name is required.")
                .MaximumLength(200).WithMessage("Full name must not exceed 200 characters.");

            RuleFor(x => x.Email)
                .NotEmpty().WithMessage("Email is required.")
                .EmailAddress().WithMessage("A valid email address is required.")
                .MaximumLength(200).WithMessage("Email must not exceed 200 characters.");

            RuleFor(x => x.Phone)
                .NotEmpty().WithMessage("Phone number is required.")
                .MaximumLength(50).WithMessage("Phone number must not exceed 50 characters.")
                .Matches(@"^\+?[0-9\s\-\(\)]{7,20}$")
                .WithMessage("Phone number format is invalid.");

            RuleFor(x => x.DepartmentId)
                .NotEmpty().WithMessage("Department is required.");

            RuleFor(x => x.PositionId)
                .NotEmpty().WithMessage("Position is required.");

            RuleFor(x => x.BranchId)
                .NotEmpty().WithMessage("Branch is required.");

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
        }
    }
}
