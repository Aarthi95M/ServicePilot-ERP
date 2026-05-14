using Microsoft.AspNetCore.Http;
using ServicePilot.Application.Interfaces.Services;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Text;
using System.Threading.Tasks;

namespace ServicePilot.Infrastructure.Services
{
    public class CurrentUserService : ICurrentUserService
    {
        private readonly IHttpContextAccessor _httpContextAccessor;

        public CurrentUserService(
            IHttpContextAccessor httpContextAccessor)
        {
            _httpContextAccessor = httpContextAccessor;
        }

        public Guid UserId =>
            Guid.Parse(
                _httpContextAccessor.HttpContext?
                    .User?
                    .FindFirst("UserId")?.Value!);

        public Guid CompanyId =>
            Guid.Parse(
                _httpContextAccessor.HttpContext?
                    .User?
                    .FindFirst("CompanyId")?.Value!);

        public string Email =>
            _httpContextAccessor.HttpContext?
                .User?
                .FindFirst(ClaimTypes.Email)?.Value!;

        public Guid? BranchId
        {
            get
            {
                var value = _httpContextAccessor.HttpContext?
                    .User.FindFirst("BranchId")?.Value;

                return Guid.TryParse(value, out var id)
                    ? id
                    : null;
            }
        }

        public string Role =>
            _httpContextAccessor.HttpContext?
                .User.FindFirst(ClaimTypes.Role)?.Value ?? "";
    }
}
