using FluentValidation;
using ServicePilot.Application.DTOs.Jobs;
using ServicePilot.Domain.Constants;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ServicePilot.Application.Validators
{
    public class UpdateJobDtoValidator : AbstractValidator<UpdateJobDto>
    {
        public UpdateJobDtoValidator()
        {
            RuleFor(x => x.JobTypeId)
                .NotEmpty().WithMessage("Job type is required.");

            RuleFor(x => x.CustomerName)
                .NotEmpty().WithMessage("Customer name is required.")
                .MaximumLength(200).WithMessage("Customer name must not exceed 200 characters.");

            RuleFor(x => x.Priority)
                .Must(JobPriority.IsValid)
                .WithMessage("Priority must be 1 (Critical), 2 (High), 3 (Medium), or 4 (Low).");

            RuleFor(x => x.Latitude)
                .InclusiveBetween(-90m, 90m)
                .WithMessage("Latitude must be between -90 and 90.")
                .When(x => x.Latitude.HasValue);

            RuleFor(x => x.Longitude)
                .InclusiveBetween(-180m, 180m)
                .WithMessage("Longitude must be between -180 and 180.")
                .When(x => x.Longitude.HasValue);

            RuleFor(x => x.ScheduledEndAt)
                .GreaterThan(x => x.ScheduledAt)
                .WithMessage("Scheduled end time must be after scheduled start time.")
                .When(x => x.ScheduledAt.HasValue && x.ScheduledEndAt.HasValue);
        }
    }
}
