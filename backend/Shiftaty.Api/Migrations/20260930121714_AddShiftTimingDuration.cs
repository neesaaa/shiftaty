using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Shiftaty.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddShiftTimingDuration : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "ShiftDuration",
                table: "Listings",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "ShiftTiming",
                table: "Listings",
                type: "integer",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ShiftDuration",
                table: "Listings");

            migrationBuilder.DropColumn(
                name: "ShiftTiming",
                table: "Listings");
        }
    }
}
