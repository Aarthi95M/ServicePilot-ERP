using FluentValidation;
using ServicePilot.Application.DTOs.Attendance;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ServicePilot.Application.Validators
{
    public class CheckInRequestValidator : AbstractValidator<CheckInRequestDto>
    {
        public CheckInRequestValidator()
        {
            RuleFor(x => x.Latitude)
                .InclusiveBetween(-90m, 90m)
                .WithMessage("Latitude must be between -90 and 90.");

            RuleFor(x => x.Longitude)
                .InclusiveBetween(-180m, 180m)
                .WithMessage("Longitude must be between -180 and 180.");

            // Offline sync: device timestamp is mandatory
            RuleFor(x => x.CheckInTimeOverride)
                .NotNull()
                .WithMessage("CheckInTimeOverride is required for offline sync.")
                .When(x => x.IsOfflineSync);

            // Cannot be in the future
            RuleFor(x => x.CheckInTimeOverride)
                .LessThanOrEqualTo(DateTime.UtcNow)
                .WithMessage("CheckInTimeOverride cannot be in the future.")
                .When(x => x.IsOfflineSync && x.CheckInTimeOverride.HasValue);

            // Cannot be older than 7 days - prevents backdating abuse
            RuleFor(x => x.CheckInTimeOverride)
                .GreaterThan(DateTime.UtcNow.AddDays(-7))
                .WithMessage("Offline check-in cannot be older than 7 days.")
                .When(x => x.IsOfflineSync && x.CheckInTimeOverride.HasValue);

            RuleFor(x => x.Accuracy)
                .GreaterThan(0m)
                .WithMessage("Accuracy must be a positive value in metres.")
                .When(x => x.Accuracy.HasValue);
        }
    }
}
