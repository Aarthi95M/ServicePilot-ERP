using FluentValidation;
using ServicePilot.Application.DTOs.Overtime;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ServicePilot.Application.Validators
{
    public class CreateOvertimeRequestValidator : AbstractValidator<CreateOvertimeRequestDto>
    {
        public CreateOvertimeRequestValidator()
        {
            RuleFor(x => x.RequestDate)
                .NotEmpty()
                .WithMessage("Request date is required.")
                .LessThanOrEqualTo(DateOnly.FromDateTime(DateTime.UtcNow))
                .WithMessage("Overtime request date cannot be in the future.");

            // Cannot request overtime for more than 30 days ago
            RuleFor(x => x.RequestDate)
                .GreaterThan(DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-30)))
                .WithMessage("Overtime requests cannot be submitted more than 30 days after the work date.");

            RuleFor(x => x.HoursRequested)
                .GreaterThan(0)
                .WithMessage("Hours requested must be greater than 0.")
                .LessThanOrEqualTo(24)
                .WithMessage("Hours requested cannot exceed 24 hours in a single day.");

            RuleFor(x => x.Reason)
                .MaximumLength(1000)
                .WithMessage("Reason must not exceed 1000 characters.")
                .When(x => !string.IsNullOrWhiteSpace(x.Reason));
        }
    }
}
