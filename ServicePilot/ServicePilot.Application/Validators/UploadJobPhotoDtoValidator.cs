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
    public class UploadJobPhotoDtoValidator : AbstractValidator<UploadJobPhotoDto>
    {
        private static readonly string[] ValidTypes =
        {
            PhotoType.Before, PhotoType.After,
            PhotoType.Progress, PhotoType.Signature
        };

        public UploadJobPhotoDtoValidator()
        {
            RuleFor(x => x.PhotoType)
                .NotEmpty().WithMessage("Photo type is required.")
                .Must(t => ValidTypes.Contains(t))
                .WithMessage($"Photo type must be one of: {string.Join(", ", ValidTypes)}.");

            RuleFor(x => x.PhotoUrl)
                .NotEmpty().WithMessage("Photo URL is required.")
                .MaximumLength(1000).WithMessage("Photo URL must not exceed 1000 characters.");
        }
    }
}
