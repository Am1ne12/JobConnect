using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace JobConnect.API.Migrations
{
    /// <inheritdoc />
    public partial class AddCompanyAvailabilitySlots : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_CompanyAvailabilities_CompanyId_DayOfWeek",
                table: "CompanyAvailabilities");

            migrationBuilder.CreateTable(
                name: "CompanyAvailabilitySlots",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    CompanyId = table.Column<int>(type: "integer", nullable: false),
                    SlotDate = table.Column<DateOnly>(type: "date", nullable: false),
                    StartTime = table.Column<TimeOnly>(type: "time without time zone", nullable: false),
                    EndTime = table.Column<TimeOnly>(type: "time without time zone", nullable: false),
                    IsBooked = table.Column<bool>(type: "boolean", nullable: false),
                    InterviewId = table.Column<int>(type: "integer", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CompanyAvailabilitySlots", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CompanyAvailabilitySlots_Companies_CompanyId",
                        column: x => x.CompanyId,
                        principalTable: "Companies",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_CompanyAvailabilitySlots_Interviews_InterviewId",
                        column: x => x.InterviewId,
                        principalTable: "Interviews",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "IX_CompanyAvailabilities_CompanyId",
                table: "CompanyAvailabilities",
                column: "CompanyId");

            migrationBuilder.CreateIndex(
                name: "IX_CompanyAvailabilitySlots_CompanyId_SlotDate",
                table: "CompanyAvailabilitySlots",
                columns: new[] { "CompanyId", "SlotDate" });

            migrationBuilder.CreateIndex(
                name: "IX_CompanyAvailabilitySlots_InterviewId",
                table: "CompanyAvailabilitySlots",
                column: "InterviewId");

            migrationBuilder.CreateIndex(
                name: "IX_CompanyAvailabilitySlots_SlotDate",
                table: "CompanyAvailabilitySlots",
                column: "SlotDate");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CompanyAvailabilitySlots");

            migrationBuilder.DropIndex(
                name: "IX_CompanyAvailabilities_CompanyId",
                table: "CompanyAvailabilities");

            migrationBuilder.CreateIndex(
                name: "IX_CompanyAvailabilities_CompanyId_DayOfWeek",
                table: "CompanyAvailabilities",
                columns: new[] { "CompanyId", "DayOfWeek" },
                unique: true);
        }
    }
}
