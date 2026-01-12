using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace JobConnect.API.Migrations
{
    /// <inheritdoc />
    public partial class RemoveCalendarLinkAndJitsi : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Interviews_JitsiRoomId",
                table: "Interviews");

            migrationBuilder.DropColumn(
                name: "JitsiRoomId",
                table: "Interviews");

            migrationBuilder.DropColumn(
                name: "CalendarLink",
                table: "Companies");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "JitsiRoomId",
                table: "Interviews",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "CalendarLink",
                table: "Companies",
                type: "text",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Interviews_JitsiRoomId",
                table: "Interviews",
                column: "JitsiRoomId",
                unique: true);
        }
    }
}
