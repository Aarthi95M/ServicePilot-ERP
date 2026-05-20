using FluentValidation;
using ServicePilot.Application.DTOs.Employees;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ServicePilot.Application.Validators
{
    public class PagedEmployeeRequestValidator : AbstractValidator<PagedEmployeeRequest>
    {
        public PagedEmployeeRequestValidator()
        {
            RuleFor(x => x.Page)
                .GreaterThanOrEqualTo(1)
                .WithMessage("Page must be at least 1.");

            RuleFor(x => x.PageSize)
                .InclusiveBetween(1, 100)
                .WithMessage("Page size must be between 1 and 100.");

            RuleFor(x => x.SortBy)
                .Must(val => val == null || new[] { "fullname", "employeecode", "createdat" }
                    .Contains(val.ToLower()))
                .WithMessage("SortBy must be one of: fullname, employeecode, createdat.");

            RuleFor(x => x.SortDir)
                .Must(val => val == null || new[] { "asc", "desc" }
                    .Contains(val.ToLower()))
                .WithMessage("SortDir must be 'asc' or 'desc'.");
        }
    }
}
