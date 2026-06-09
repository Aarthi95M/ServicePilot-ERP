# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy project files first — Docker caches this layer so it only re-runs
# dotnet restore when a .csproj changes, not on every source file change.
COPY ["ServicePilot.API/ServicePilot.API.csproj",                         "ServicePilot.API/"]
COPY ["ServicePilot.Application/ServicePilot.Application.csproj",         "ServicePilot.Application/"]
COPY ["ServicePilot.Domain/ServicePilot.Domain.csproj",                   "ServicePilot.Domain/"]
COPY ["ServicePilot.Infrastructure/ServicePilot.Infrastructure.csproj",   "ServicePilot.Infrastructure/"]
COPY ["ServicePilot.Shared/ServicePilot.Shared.csproj",                   "ServicePilot.Shared/"]
RUN dotnet restore "ServicePilot.API/ServicePilot.API.csproj"

# Copy everything else and publish
COPY . .
RUN dotnet publish "ServicePilot.API/ServicePilot.API.csproj" \
    -c Release \
    -o /app/publish \
    --no-restore

# ── Stage 2: Runtime ───────────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app

# Non-root user for security
RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser
USER appuser

COPY --from=build /app/publish .

# Render assigns a PORT env var — ASP.NET reads ASPNETCORE_URLS
ENV ASPNETCORE_URLS=http://+:10000
EXPOSE 10000

ENTRYPOINT ["dotnet", "ServicePilot.API.dll"]
