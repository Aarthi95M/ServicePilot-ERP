using FluentValidation;
using ServicePilot.Application.DTOs.Attendance;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ServicePilot.Application.Validators
{
    public class CheckOutRequestValidator : AbstractValidator<CheckOutRequestDto>
    {
        public CheckOutRequestValidator()
        {
            RuleFor(x => x.Latitude)
                .InclusiveBetween(-90m, 90m)
                .WithMessage("Latitude must be between -90 and 90.");

            RuleFor(x => x.Longitude)
                .InclusiveBetween(-180m, 180m)
                .WithMessage("Longitude must be between -180 and 180.");

            RuleFor(x => x.CheckOutTimeOverride)
                .NotNull()
                .WithMessage("CheckOutTimeOverride is required for offline sync.")
                .When(x => x.IsOfflineSync);

            RuleFor(x => x.CheckOutTimeOverride)
                .LessThanOrEqualTo(DateTime.UtcNow)
                .WithMessage("CheckOutTimeOverride cannot be in the future.")
                .When(x => x.IsOfflineSync && x.CheckOutTimeOverride.HasValue);

            RuleFor(x => x.CheckOutTimeOverride)
                .GreaterThan(DateTime.UtcNow.AddDays(-7))
                .WithMessage("Offline check-out cannot be older than 7 days.")
                .When(x => x.IsOfflineSync && x.CheckOutTimeOverride.HasValue);
        }
    }
}
