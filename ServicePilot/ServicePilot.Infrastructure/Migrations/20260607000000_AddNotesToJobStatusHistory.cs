using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ServicePilot.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddNotesToJobStatusHistory : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "notes",
                table: "job_status_history",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "notes",
                table: "job_status_history");
        }
    }
}
