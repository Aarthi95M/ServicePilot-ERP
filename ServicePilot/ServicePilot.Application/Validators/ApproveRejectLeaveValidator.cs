using FluentValidation;
using ServicePilot.Application.DTOs.Leave;
using ServicePilot.Domain.Constants;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ServicePilot.Application.Validators
{
    public class ApproveRejectLeaveValidator : AbstractValidator<ApproveRejectLeaveDto>
    {
        public ApproveRejectLeaveValidator()
        {
            RuleFor(x => x.Status)
                .NotEmpty()
                .WithMessage("Status is required.")
                .Must(s => s == RequestStatus.Approved || s == RequestStatus.Rejected)
                .WithMessage("Status must be 'Approved' or 'Rejected'.");

            RuleFor(x => x.Reason)
                .MaximumLength(500)
                .WithMessage("Reason must not exceed 500 characters.")
                .When(x => !string.IsNullOrWhiteSpace(x.Reason));
        }
    }
}
