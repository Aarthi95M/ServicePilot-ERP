using FluentValidation;
using ServicePilot.Application.DTOs.OrgStructure;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ServicePilot.Application.Validators
{
    public class CreateBranchDtoValidator : AbstractValidator<CreateBranchDto>
    {
        public CreateBranchDtoValidator()
        {
            RuleFor(x => x.Name)
                .NotEmpty().WithMessage("Branch name is required.")
                .MaximumLength(200).WithMessage("Branch name must not exceed 200 characters.");

            RuleFor(x => x.Latitude)
                .InclusiveBetween(-90m, 90m)
                .WithMessage("Latitude must be between -90 and 90.")
                .When(x => x.Latitude.HasValue);

            RuleFor(x => x.Longitude)
                .InclusiveBetween(-180m, 180m)
                .WithMessage("Longitude must be between -180 and 180.")
                .When(x => x.Longitude.HasValue);
        }
    }
}
