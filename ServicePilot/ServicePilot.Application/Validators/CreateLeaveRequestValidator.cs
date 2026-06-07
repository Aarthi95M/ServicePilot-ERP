using FluentValidation;
using ServicePilot.Application.DTOs.Leave;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ServicePilot.Application.Validators
{
    public class CreateLeaveRequestValidator : AbstractValidator<CreateLeaveRequestDto>
    {
        public CreateLeaveRequestValidator()
        {
            RuleFor(x => x.LeaveTypeId)
                .NotEmpty()
                .WithMessage("Leave type is required.");

            RuleFor(x => x.StartDate)
                .NotEmpty()
                .WithMessage("Start date is required.");
            // Past-date restriction is enforced in the service layer so that
            // Admin / Supervisor can submit backdated leave on behalf of employees.

            RuleFor(x => x.EndDate)
                .NotEmpty()
                .WithMessage("End date is required.")
                .GreaterThanOrEqualTo(x => x.StartDate)
                .WithMessage("End date must be on or after start date.");

            // Max 90 consecutive days per request
            RuleFor(x => x)
                .Must(x => (x.EndDate.DayNumber - x.StartDate.DayNumber + 1) <= 90)
                .WithMessage("A single leave request cannot exceed 90 days.")
                .When(x => x.EndDate >= x.StartDate);

            RuleFor(x => x.Reason)
                .MaximumLength(1000)
                .WithMessage("Reason must not exceed 1000 characters.")
                .When(x => !string.IsNullOrWhiteSpace(x.Reason));
        }
    }
}
