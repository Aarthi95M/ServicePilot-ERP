using FluentValidation;
using ServicePilot.Application.DTOs.Jobs;
using ServicePilot.Domain.Constants;

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

            RuleFor(x => x.PhotoBase64)
                .NotEmpty().WithMessage("Photo data is required.")
                .Must(b => b.Length <= 10_000_000)
                .WithMessage("Photo data must not exceed ~7.5 MB.");
        }
    }
}
