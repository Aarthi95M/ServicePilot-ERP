using System;
using System.Collections.Generic;

namespace ServicePilot.Domain.Entities;

public partial class VEmployeesExpiryAlert
{
    public Guid? Id { get; set; }

    public Guid? CompanyId { get; set; }

    public string? FullName { get; set; }

    public string? EmployeeCode { get; set; }

    public string? PhoneNumber { get; set; }

    public DateOnly? VisaExpiryDate { get; set; }

    public DateOnly? PassportExpiryDate { get; set; }

    public DateOnly? EmiratesIdExpiryDate { get; set; }

    public int? VisaDaysLeft { get; set; }

    public int? PassportDaysLeft { get; set; }

    public int? EidDaysLeft { get; set; }

    public DateOnly? EarliestExpiry { get; set; }
}
