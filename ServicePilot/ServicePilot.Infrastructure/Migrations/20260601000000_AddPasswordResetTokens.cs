using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ServicePilot.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddPasswordResetTokens : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "password_reset_tokens",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false,
                        defaultValueSql: "gen_random_uuid()"),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    token_hash = table.Column<string>(type: "character varying(64)",
                        maxLength: 64, nullable: false),
                    expires_at = table.Column<DateTime>(type: "timestamp with time zone",
                        nullable: false),
                    is_used = table.Column<bool>(type: "boolean", nullable: false,
                        defaultValue: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone",
                        nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("password_reset_tokens_pkey", x => x.id);
                    table.ForeignKey(
                        name: "fk_prt_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "idx_prt_token_hash",
                table: "password_reset_tokens",
                column: "token_hash",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "idx_prt_user_used",
                table: "password_reset_tokens",
                columns: new[] { "user_id", "is_used" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "password_reset_tokens");
        }
    }
}
