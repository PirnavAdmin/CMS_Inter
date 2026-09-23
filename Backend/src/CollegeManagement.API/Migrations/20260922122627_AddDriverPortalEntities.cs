using System;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CollegeManagement.API.Migrations
{
    /// <inheritdoc />
    public partial class AddDriverPortalEntities : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_HallTickets_Users_StudentId",
                table: "HallTickets");

            migrationBuilder.DropForeignKey(
                name: "FK_StudentFees_FeeStructures_FeeStructureId1",
                table: "StudentFees");

            migrationBuilder.DropForeignKey(
                name: "FK_StudentFees_Students_StudentId1",
                table: "StudentFees");

            migrationBuilder.DropIndex(
                name: "IX_StudentFees_FeeStructureId1",
                table: "StudentFees");

            migrationBuilder.DropIndex(
                name: "IX_StudentFees_StudentId1",
                table: "StudentFees");

            migrationBuilder.DropColumn(
                name: "FeeStructureId1",
                table: "StudentFees");

            migrationBuilder.DropColumn(
                name: "StudentId1",
                table: "StudentFees");

            migrationBuilder.DropColumn(
                name: "DiscountAmount",
                table: "FeePayments");

            migrationBuilder.DropColumn(
                name: "FineAmount",
                table: "FeePayments");

            migrationBuilder.RenameColumn(
                name: "SectionId",
                table: "StudentAdmissions",
                newName: "RouteId");

            migrationBuilder.AlterColumn<string>(
                name: "Version",
                table: "templates",
                type: "longtext",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "int")
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "PaymentPlan",
                table: "StudentFees",
                type: "varchar(100)",
                maxLength: 100,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AlterColumn<int>(
                name: "FeeStructureId",
                table: "StudentAdmissions",
                type: "int",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "int");

            migrationBuilder.AddColumn<int>(
                name: "BedId",
                table: "StudentAdmissions",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "BusRoute",
                table: "StudentAdmissions",
                type: "varchar(100)",
                maxLength: 100,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "BusType",
                table: "StudentAdmissions",
                type: "varchar(20)",
                maxLength: 20,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "HallTicketNumber",
                table: "StudentAdmissions",
                type: "varchar(50)",
                maxLength: 50,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "HostelBed",
                table: "StudentAdmissions",
                type: "varchar(50)",
                maxLength: 50,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "HostelBlock",
                table: "StudentAdmissions",
                type: "varchar(50)",
                maxLength: 50,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<int>(
                name: "HostelId",
                table: "StudentAdmissions",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "HostelRoom",
                table: "StudentAdmissions",
                type: "varchar(50)",
                maxLength: 50,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "PickupPoint",
                table: "StudentAdmissions",
                type: "varchar(100)",
                maxLength: 100,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<int>(
                name: "PickupPointId",
                table: "StudentAdmissions",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "RoomId",
                table: "StudentAdmissions",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "StudentType",
                table: "StudentAdmissions",
                type: "varchar(30)",
                maxLength: 30,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<bool>(
                name: "TransportRequired",
                table: "StudentAdmissions",
                type: "tinyint(1)",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "LeaveCategoryId",
                table: "StaffLeaveRequests",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "LeaveCategoryId",
                table: "StaffLeaveBalances",
                type: "int",
                nullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "Email",
                table: "Staff",
                type: "varchar(150)",
                maxLength: 150,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "varchar(150)",
                oldMaxLength: 150)
                .Annotation("MySql:CharSet", "utf8mb4")
                .OldAnnotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "DepartmentSpecificJson",
                table: "Staff",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "ReceiptNumber",
                table: "FeePayments",
                type: "varchar(50)",
                maxLength: 50,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "AttendanceTimingConfigs",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    ConfigName = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    StaffType = table.Column<byte>(type: "tinyint unsigned", nullable: true),
                    DepartmentId = table.Column<int>(type: "int", nullable: true),
                    WorkStartTime = table.Column<TimeSpan>(type: "time(6)", nullable: false),
                    WorkEndTime = table.Column<TimeSpan>(type: "time(6)", nullable: false),
                    LateThreshold = table.Column<TimeSpan>(type: "time(6)", nullable: false),
                    EarlyCheckoutThreshold = table.Column<TimeSpan>(type: "time(6)", nullable: false),
                    GracePeriodMinutes = table.Column<int>(type: "int", nullable: false),
                    MinWorkingHours = table.Column<decimal>(type: "decimal(65,30)", nullable: false),
                    IsActive = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    Description = table.Column<string>(type: "varchar(500)", maxLength: 500, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AttendanceTimingConfigs", x => x.Id);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "Holidays",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    HolidayCode = table.Column<string>(type: "varchar(20)", maxLength: 20, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    AcademicYearId = table.Column<int>(type: "int", nullable: true),
                    BoardId = table.Column<int>(type: "int", nullable: true),
                    HolidayName = table.Column<string>(type: "varchar(150)", maxLength: 150, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    HolidayType = table.Column<string>(type: "varchar(50)", maxLength: 50, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    AppliesTo = table.Column<string>(type: "varchar(50)", maxLength: 50, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    DateType = table.Column<string>(type: "varchar(20)", maxLength: 20, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    StartDate = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    EndDate = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    Status = table.Column<string>(type: "varchar(20)", maxLength: 20, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Description = table.Column<string>(type: "varchar(500)", maxLength: 500, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    IsDeleted = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Holidays", x => x.Id);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "LeaveCategories",
                columns: table => new
                {
                    LeaveCategoryId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    CategoryName = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    CategoryCode = table.Column<string>(type: "varchar(10)", maxLength: 10, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    AnnualQuota = table.Column<decimal>(type: "decimal(5,2)", nullable: false),
                    ApplicableStaffType = table.Column<string>(type: "varchar(50)", maxLength: 50, nullable: false, defaultValue: "All Staff")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    AllowCarryForward = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    RequiresProof = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    Description = table.Column<string>(type: "varchar(500)", maxLength: 500, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    IsActive = table.Column<bool>(type: "tinyint(1)", nullable: false, defaultValue: true),
                    DisplayOrder = table.Column<int>(type: "int", nullable: false, defaultValue: 0),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LeaveCategories", x => x.LeaveCategoryId);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "TransportDrivers",
                columns: table => new
                {
                    DriverId = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    DriverName = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    EmployeeId = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    LicenseNo = table.Column<string>(type: "varchar(50)", maxLength: 50, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    LicenseExpiry = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    MobileNo = table.Column<string>(type: "varchar(20)", maxLength: 20, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    AlternateMobileNo = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Email = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Address = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    BloodGroup = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    EmergencyContactName = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    EmergencyContactNumber = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Status = table.Column<bool>(type: "tinyint(1)", nullable: false, defaultValue: true),
                    IsDeleted = table.Column<bool>(type: "tinyint(1)", nullable: false, defaultValue: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    AssignedVehicleId = table.Column<long>(type: "bigint", nullable: true),
                    UserId = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TransportDrivers", x => x.DriverId);
                    table.ForeignKey(
                        name: "FK_TransportDrivers_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "UserId");
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "TransportRoutes",
                columns: table => new
                {
                    RouteId = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    RouteCode = table.Column<string>(type: "varchar(50)", maxLength: 50, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    RouteName = table.Column<string>(type: "varchar(150)", maxLength: 150, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    StartLocation = table.Column<string>(type: "varchar(150)", maxLength: 150, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    EndLocation = table.Column<string>(type: "varchar(150)", maxLength: 150, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Distance = table.Column<decimal>(type: "decimal(10,2)", precision: 10, scale: 2, nullable: false),
                    EstimatedDurationMinutes = table.Column<int>(type: "int", nullable: false),
                    Description = table.Column<string>(type: "varchar(500)", maxLength: 500, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    DefaultMonthlyFee = table.Column<decimal>(type: "decimal(65,30)", nullable: false),
                    MinRangeKm = table.Column<decimal>(type: "decimal(65,30)", nullable: false),
                    NonAcBaseFare = table.Column<decimal>(type: "decimal(65,30)", nullable: false),
                    NonAcRatePerKm = table.Column<decimal>(type: "decimal(65,30)", nullable: false),
                    AcBaseFare = table.Column<decimal>(type: "decimal(65,30)", nullable: false),
                    AcRatePerKm = table.Column<decimal>(type: "decimal(65,30)", nullable: false),
                    Status = table.Column<bool>(type: "tinyint(1)", nullable: false, defaultValue: true),
                    IsDeleted = table.Column<bool>(type: "tinyint(1)", nullable: false, defaultValue: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TransportRoutes", x => x.RouteId);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "TransportTrips",
                columns: table => new
                {
                    TripId = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    AssignmentId = table.Column<long>(type: "bigint", nullable: true),
                    VehicleId = table.Column<long>(type: "bigint", nullable: false),
                    RouteId = table.Column<long>(type: "bigint", nullable: false),
                    DriverId = table.Column<long>(type: "bigint", nullable: false),
                    AttendantId = table.Column<long>(type: "bigint", nullable: true),
                    TripType = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    TripDate = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    StartTime = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    EndTime = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    StudentsPresent = table.Column<int>(type: "int", nullable: false),
                    Status = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    IsDeleted = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    CreatedBy = table.Column<long>(type: "bigint", nullable: true),
                    UpdatedBy = table.Column<long>(type: "bigint", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TransportTrips", x => x.TripId);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "TransportVehicles",
                columns: table => new
                {
                    VehicleId = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    VehicleNumber = table.Column<string>(type: "varchar(50)", maxLength: 50, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    VehicleRegistrationNo = table.Column<string>(type: "varchar(50)", maxLength: 50, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    VehicleName = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    VehicleType = table.Column<string>(type: "varchar(50)", maxLength: 50, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Make = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Model = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    ChassisNumber = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    EngineNumber = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    GpsDeviceId = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    InsuranceNumber = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    InsuranceExpiry = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    PollutionExpiry = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    FitnessExpiry = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    Capacity = table.Column<int>(type: "int", nullable: false),
                    IsAC = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    Status = table.Column<bool>(type: "tinyint(1)", nullable: false, defaultValue: true),
                    IsDeleted = table.Column<bool>(type: "tinyint(1)", nullable: false, defaultValue: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TransportVehicles", x => x.VehicleId);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "PickupPoints",
                columns: table => new
                {
                    PickupPointId = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    RouteId = table.Column<long>(type: "bigint", nullable: false),
                    StopName = table.Column<string>(type: "varchar(150)", maxLength: 150, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    StopAddress = table.Column<string>(type: "varchar(250)", maxLength: 250, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    StopOrder = table.Column<int>(type: "int", nullable: false),
                    PickupTime = table.Column<TimeSpan>(type: "time(6)", nullable: false),
                    DropTime = table.Column<TimeSpan>(type: "time(6)", nullable: false),
                    DistanceFromSchool = table.Column<decimal>(type: "decimal(10,2)", precision: 10, scale: 2, nullable: false),
                    MonthlyFee = table.Column<decimal>(type: "decimal(10,2)", nullable: false),
                    Status = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    IsDeleted = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PickupPoints", x => x.PickupPointId);
                    table.ForeignKey(
                        name: "FK_PickupPoints_TransportRoutes_RouteId",
                        column: x => x.RouteId,
                        principalTable: "TransportRoutes",
                        principalColumn: "RouteId",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "TransportAttendants",
                columns: table => new
                {
                    AttendantId = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    AttendantName = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    MobileNumber = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    EmployeeId = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Gender = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    BranchName = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    AlternateMobileNumber = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Address = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    BloodGroup = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    EmergencyContactName = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    EmergencyContactNumber = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    AssignedVehicleId = table.Column<long>(type: "bigint", nullable: true),
                    Status = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    IsDeleted = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    CreatedBy = table.Column<long>(type: "bigint", nullable: true),
                    UpdatedBy = table.Column<long>(type: "bigint", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TransportAttendants", x => x.AttendantId);
                    table.ForeignKey(
                        name: "FK_TransportAttendants_TransportVehicles_AssignedVehicleId",
                        column: x => x.AssignedVehicleId,
                        principalTable: "TransportVehicles",
                        principalColumn: "VehicleId");
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "TransportGpsTelemetries",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    DriverId = table.Column<long>(type: "bigint", nullable: true),
                    VehicleId = table.Column<long>(type: "bigint", nullable: true),
                    TripId = table.Column<long>(type: "bigint", nullable: true),
                    Latitude = table.Column<decimal>(type: "decimal(65,30)", nullable: false),
                    Longitude = table.Column<decimal>(type: "decimal(65,30)", nullable: false),
                    Speed = table.Column<decimal>(type: "decimal(65,30)", nullable: true),
                    Heading = table.Column<decimal>(type: "decimal(65,30)", nullable: true),
                    Accuracy = table.Column<decimal>(type: "decimal(65,30)", nullable: true),
                    Timestamp = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TransportGpsTelemetries", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TransportGpsTelemetries_TransportDrivers_DriverId",
                        column: x => x.DriverId,
                        principalTable: "TransportDrivers",
                        principalColumn: "DriverId");
                    table.ForeignKey(
                        name: "FK_TransportGpsTelemetries_TransportTrips_TripId",
                        column: x => x.TripId,
                        principalTable: "TransportTrips",
                        principalColumn: "TripId");
                    table.ForeignKey(
                        name: "FK_TransportGpsTelemetries_TransportVehicles_VehicleId",
                        column: x => x.VehicleId,
                        principalTable: "TransportVehicles",
                        principalColumn: "VehicleId");
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "TransportVehicleAssignments",
                columns: table => new
                {
                    AssignmentId = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    RouteId = table.Column<long>(type: "bigint", nullable: false),
                    VehicleId = table.Column<long>(type: "bigint", nullable: false),
                    DriverId = table.Column<long>(type: "bigint", nullable: false),
                    AttendantId = table.Column<long>(type: "bigint", nullable: true),
                    MorningTripTime = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    EveningTripTime = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    EffectiveFrom = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    EffectiveTo = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    Shift = table.Column<string>(type: "varchar(20)", maxLength: 20, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Remarks = table.Column<string>(type: "varchar(255)", maxLength: 255, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Status = table.Column<bool>(type: "tinyint(1)", nullable: false, defaultValue: true),
                    IsDeleted = table.Column<bool>(type: "tinyint(1)", nullable: false, defaultValue: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TransportVehicleAssignments", x => x.AssignmentId);
                    table.ForeignKey(
                        name: "FK_TransportVehicleAssignments_TransportDrivers_DriverId",
                        column: x => x.DriverId,
                        principalTable: "TransportDrivers",
                        principalColumn: "DriverId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_TransportVehicleAssignments_TransportRoutes_RouteId",
                        column: x => x.RouteId,
                        principalTable: "TransportRoutes",
                        principalColumn: "RouteId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_TransportVehicleAssignments_TransportVehicles_VehicleId",
                        column: x => x.VehicleId,
                        principalTable: "TransportVehicles",
                        principalColumn: "VehicleId",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "VehicleMaintenances",
                columns: table => new
                {
                    MaintenanceId = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    VehicleId = table.Column<long>(type: "bigint", nullable: false),
                    ServiceType = table.Column<string>(type: "varchar(150)", maxLength: 150, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    ServiceDate = table.Column<DateTime>(type: "date", nullable: false),
                    Cost = table.Column<decimal>(type: "decimal(12,2)", precision: 12, scale: 2, nullable: false, defaultValue: 0m),
                    VendorCenter = table.Column<string>(type: "varchar(150)", maxLength: 150, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    NextServiceDue = table.Column<DateTime>(type: "date", nullable: true),
                    Remarks = table.Column<string>(type: "varchar(500)", maxLength: 500, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Status = table.Column<bool>(type: "tinyint(1)", nullable: false, defaultValue: true),
                    IsDeleted = table.Column<bool>(type: "tinyint(1)", nullable: false, defaultValue: false),
                    CreatedBy = table.Column<long>(type: "bigint", nullable: true),
                    UpdatedBy = table.Column<long>(type: "bigint", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    UpdatedAt = table.Column<DateTime>(type: "datetime", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_VehicleMaintenances", x => x.MaintenanceId);
                    table.ForeignKey(
                        name: "FK_VehicleMaintenances_TransportVehicles_VehicleId",
                        column: x => x.VehicleId,
                        principalTable: "TransportVehicles",
                        principalColumn: "VehicleId",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "TransportStudentAttendances",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    StudentId = table.Column<int>(type: "int", nullable: false),
                    TripId = table.Column<long>(type: "bigint", nullable: false),
                    RouteId = table.Column<long>(type: "bigint", nullable: true),
                    DriverId = table.Column<long>(type: "bigint", nullable: true),
                    PickupPointId = table.Column<long>(type: "bigint", nullable: true),
                    Status = table.Column<string>(type: "varchar(50)", maxLength: 50, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    EventTime = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TransportStudentAttendances", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TransportStudentAttendances_PickupPoints_PickupPointId",
                        column: x => x.PickupPointId,
                        principalTable: "PickupPoints",
                        principalColumn: "PickupPointId");
                    table.ForeignKey(
                        name: "FK_TransportStudentAttendances_Students_StudentId",
                        column: x => x.StudentId,
                        principalTable: "Students",
                        principalColumn: "StudentId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_TransportStudentAttendances_TransportDrivers_DriverId",
                        column: x => x.DriverId,
                        principalTable: "TransportDrivers",
                        principalColumn: "DriverId");
                    table.ForeignKey(
                        name: "FK_TransportStudentAttendances_TransportRoutes_RouteId",
                        column: x => x.RouteId,
                        principalTable: "TransportRoutes",
                        principalColumn: "RouteId");
                    table.ForeignKey(
                        name: "FK_TransportStudentAttendances_TransportTrips_TripId",
                        column: x => x.TripId,
                        principalTable: "TransportTrips",
                        principalColumn: "TripId",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "StudentTransportAssignments",
                columns: table => new
                {
                    StudentTransportAssignmentId = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    StudentId = table.Column<long>(type: "bigint", nullable: true),
                    AdmissionNo = table.Column<string>(type: "varchar(50)", maxLength: 50, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    RouteId = table.Column<long>(type: "bigint", nullable: true),
                    PickupPointId = table.Column<long>(type: "bigint", nullable: true),
                    VehicleAssignmentId = table.Column<long>(type: "bigint", nullable: true),
                    EffectiveFrom = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    EffectiveTo = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    TransportType = table.Column<string>(type: "varchar(20)", maxLength: 20, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Remarks = table.Column<string>(type: "varchar(255)", maxLength: 255, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Status = table.Column<bool>(type: "tinyint(1)", nullable: false, defaultValue: true),
                    IsDeleted = table.Column<bool>(type: "tinyint(1)", nullable: false, defaultValue: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StudentTransportAssignments", x => x.StudentTransportAssignmentId);
                    table.ForeignKey(
                        name: "FK_StudentTransportAssignments_PickupPoints_PickupPointId",
                        column: x => x.PickupPointId,
                        principalTable: "PickupPoints",
                        principalColumn: "PickupPointId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_StudentTransportAssignments_TransportRoutes_RouteId",
                        column: x => x.RouteId,
                        principalTable: "TransportRoutes",
                        principalColumn: "RouteId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_StudentTransportAssignments_TransportVehicleAssignments_Vehi~",
                        column: x => x.VehicleAssignmentId,
                        principalTable: "TransportVehicleAssignments",
                        principalColumn: "AssignmentId",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_StaffLeaveRequests_LeaveCategoryId",
                table: "StaffLeaveRequests",
                column: "LeaveCategoryId");

            migrationBuilder.CreateIndex(
                name: "IX_StaffLeaveBalances_LeaveCategoryId",
                table: "StaffLeaveBalances",
                column: "LeaveCategoryId");

            migrationBuilder.CreateIndex(
                name: "UX_LeaveCategories_CategoryCode",
                table: "LeaveCategories",
                column: "CategoryCode",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PickupPoints_RouteId_StopName",
                table: "PickupPoints",
                columns: new[] { "RouteId", "StopName" });

            migrationBuilder.CreateIndex(
                name: "IX_PickupPoints_RouteId_StopOrder",
                table: "PickupPoints",
                columns: new[] { "RouteId", "StopOrder" });

            migrationBuilder.CreateIndex(
                name: "IX_STA_Route_Pickup_Vehicle",
                table: "StudentTransportAssignments",
                columns: new[] { "RouteId", "PickupPointId", "VehicleAssignmentId", "Status", "IsDeleted" });

            migrationBuilder.CreateIndex(
                name: "IX_StudentTransportAssignments_AdmissionNo",
                table: "StudentTransportAssignments",
                column: "AdmissionNo");

            migrationBuilder.CreateIndex(
                name: "IX_StudentTransportAssignments_AdmissionNo_EffectiveFrom_Effect~",
                table: "StudentTransportAssignments",
                columns: new[] { "AdmissionNo", "EffectiveFrom", "EffectiveTo" });

            migrationBuilder.CreateIndex(
                name: "IX_StudentTransportAssignments_PickupPointId",
                table: "StudentTransportAssignments",
                column: "PickupPointId");

            migrationBuilder.CreateIndex(
                name: "IX_StudentTransportAssignments_RouteId",
                table: "StudentTransportAssignments",
                column: "RouteId");

            migrationBuilder.CreateIndex(
                name: "IX_StudentTransportAssignments_VehicleAssignmentId",
                table: "StudentTransportAssignments",
                column: "VehicleAssignmentId");

            migrationBuilder.CreateIndex(
                name: "IX_TransportAttendants_AssignedVehicleId",
                table: "TransportAttendants",
                column: "AssignedVehicleId");

            migrationBuilder.CreateIndex(
                name: "IX_TransportDrivers_LicenseNo",
                table: "TransportDrivers",
                column: "LicenseNo",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_TransportDrivers_MobileNo",
                table: "TransportDrivers",
                column: "MobileNo");

            migrationBuilder.CreateIndex(
                name: "IX_TransportDrivers_UserId",
                table: "TransportDrivers",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_TransportGpsTelemetries_DriverId",
                table: "TransportGpsTelemetries",
                column: "DriverId");

            migrationBuilder.CreateIndex(
                name: "IX_TransportGpsTelemetries_TripId",
                table: "TransportGpsTelemetries",
                column: "TripId");

            migrationBuilder.CreateIndex(
                name: "IX_TransportGpsTelemetries_VehicleId",
                table: "TransportGpsTelemetries",
                column: "VehicleId");

            migrationBuilder.CreateIndex(
                name: "ux_transport_routes_route_code",
                table: "TransportRoutes",
                column: "RouteCode",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_TransportStudentAttendances_DriverId",
                table: "TransportStudentAttendances",
                column: "DriverId");

            migrationBuilder.CreateIndex(
                name: "IX_TransportStudentAttendances_PickupPointId",
                table: "TransportStudentAttendances",
                column: "PickupPointId");

            migrationBuilder.CreateIndex(
                name: "IX_TransportStudentAttendances_RouteId",
                table: "TransportStudentAttendances",
                column: "RouteId");

            migrationBuilder.CreateIndex(
                name: "IX_TransportStudentAttendances_StudentId",
                table: "TransportStudentAttendances",
                column: "StudentId");

            migrationBuilder.CreateIndex(
                name: "IX_TransportStudentAttendances_TripId",
                table: "TransportStudentAttendances",
                column: "TripId");

            migrationBuilder.CreateIndex(
                name: "IX_TransportVehicleAssignments_DriverId",
                table: "TransportVehicleAssignments",
                column: "DriverId");

            migrationBuilder.CreateIndex(
                name: "IX_TransportVehicleAssignments_RouteId",
                table: "TransportVehicleAssignments",
                column: "RouteId");

            migrationBuilder.CreateIndex(
                name: "IX_TransportVehicleAssignments_RouteId_VehicleId_DriverId_Effec~",
                table: "TransportVehicleAssignments",
                columns: new[] { "RouteId", "VehicleId", "DriverId", "EffectiveFrom" });

            migrationBuilder.CreateIndex(
                name: "IX_TransportVehicleAssignments_VehicleId",
                table: "TransportVehicleAssignments",
                column: "VehicleId");

            migrationBuilder.CreateIndex(
                name: "IX_TVA_Vehicle_Driver_Route",
                table: "TransportVehicleAssignments",
                columns: new[] { "VehicleId", "DriverId", "RouteId", "Status", "IsDeleted" });

            migrationBuilder.CreateIndex(
                name: "IX_TransportVehicles_VehicleNumber",
                table: "TransportVehicles",
                column: "VehicleNumber",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_TransportVehicles_VehicleRegistrationNo",
                table: "TransportVehicles",
                column: "VehicleRegistrationNo",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_transport_vehicle_maintenance_vehicle_id",
                table: "VehicleMaintenances",
                column: "VehicleId");

            migrationBuilder.CreateIndex(
                name: "IX_VehMaint_Vehicle_ServiceDate_Deleted",
                table: "VehicleMaintenances",
                columns: new[] { "VehicleId", "ServiceDate", "IsDeleted" });

            migrationBuilder.AddForeignKey(
                name: "FK_HallTickets_Students_StudentId",
                table: "HallTickets",
                column: "StudentId",
                principalTable: "Students",
                principalColumn: "StudentId",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_StaffLeaveBalances_LeaveCategories_LeaveCategoryId",
                table: "StaffLeaveBalances",
                column: "LeaveCategoryId",
                principalTable: "LeaveCategories",
                principalColumn: "LeaveCategoryId",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_StaffLeaveRequests_LeaveCategories_LeaveCategoryId",
                table: "StaffLeaveRequests",
                column: "LeaveCategoryId",
                principalTable: "LeaveCategories",
                principalColumn: "LeaveCategoryId",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_HallTickets_Students_StudentId",
                table: "HallTickets");

            migrationBuilder.DropForeignKey(
                name: "FK_StaffLeaveBalances_LeaveCategories_LeaveCategoryId",
                table: "StaffLeaveBalances");

            migrationBuilder.DropForeignKey(
                name: "FK_StaffLeaveRequests_LeaveCategories_LeaveCategoryId",
                table: "StaffLeaveRequests");

            migrationBuilder.DropTable(
                name: "AttendanceTimingConfigs");

            migrationBuilder.DropTable(
                name: "Holidays");

            migrationBuilder.DropTable(
                name: "LeaveCategories");

            migrationBuilder.DropTable(
                name: "StudentTransportAssignments");

            migrationBuilder.DropTable(
                name: "TransportAttendants");

            migrationBuilder.DropTable(
                name: "TransportGpsTelemetries");

            migrationBuilder.DropTable(
                name: "TransportStudentAttendances");

            migrationBuilder.DropTable(
                name: "VehicleMaintenances");

            migrationBuilder.DropTable(
                name: "TransportVehicleAssignments");

            migrationBuilder.DropTable(
                name: "PickupPoints");

            migrationBuilder.DropTable(
                name: "TransportTrips");

            migrationBuilder.DropTable(
                name: "TransportDrivers");

            migrationBuilder.DropTable(
                name: "TransportVehicles");

            migrationBuilder.DropTable(
                name: "TransportRoutes");

            migrationBuilder.DropIndex(
                name: "IX_StaffLeaveRequests_LeaveCategoryId",
                table: "StaffLeaveRequests");

            migrationBuilder.DropIndex(
                name: "IX_StaffLeaveBalances_LeaveCategoryId",
                table: "StaffLeaveBalances");

            migrationBuilder.DropColumn(
                name: "PaymentPlan",
                table: "StudentFees");

            migrationBuilder.DropColumn(
                name: "BedId",
                table: "StudentAdmissions");

            migrationBuilder.DropColumn(
                name: "BusRoute",
                table: "StudentAdmissions");

            migrationBuilder.DropColumn(
                name: "BusType",
                table: "StudentAdmissions");

            migrationBuilder.DropColumn(
                name: "HallTicketNumber",
                table: "StudentAdmissions");

            migrationBuilder.DropColumn(
                name: "HostelBed",
                table: "StudentAdmissions");

            migrationBuilder.DropColumn(
                name: "HostelBlock",
                table: "StudentAdmissions");

            migrationBuilder.DropColumn(
                name: "HostelId",
                table: "StudentAdmissions");

            migrationBuilder.DropColumn(
                name: "HostelRoom",
                table: "StudentAdmissions");

            migrationBuilder.DropColumn(
                name: "PickupPoint",
                table: "StudentAdmissions");

            migrationBuilder.DropColumn(
                name: "PickupPointId",
                table: "StudentAdmissions");

            migrationBuilder.DropColumn(
                name: "RoomId",
                table: "StudentAdmissions");

            migrationBuilder.DropColumn(
                name: "StudentType",
                table: "StudentAdmissions");

            migrationBuilder.DropColumn(
                name: "TransportRequired",
                table: "StudentAdmissions");

            migrationBuilder.DropColumn(
                name: "LeaveCategoryId",
                table: "StaffLeaveRequests");

            migrationBuilder.DropColumn(
                name: "LeaveCategoryId",
                table: "StaffLeaveBalances");

            migrationBuilder.DropColumn(
                name: "DepartmentSpecificJson",
                table: "Staff");

            migrationBuilder.DropColumn(
                name: "ReceiptNumber",
                table: "FeePayments");

            migrationBuilder.RenameColumn(
                name: "RouteId",
                table: "StudentAdmissions",
                newName: "SectionId");

            migrationBuilder.AlterColumn<int>(
                name: "Version",
                table: "templates",
                type: "int",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "longtext")
                .OldAnnotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<int>(
                name: "FeeStructureId1",
                table: "StudentFees",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "StudentId1",
                table: "StudentFees",
                type: "int",
                nullable: true);

            migrationBuilder.AlterColumn<int>(
                name: "FeeStructureId",
                table: "StudentAdmissions",
                type: "int",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "int",
                oldNullable: true);

            migrationBuilder.UpdateData(
                table: "Staff",
                keyColumn: "Email",
                keyValue: null,
                column: "Email",
                value: "");

            migrationBuilder.AlterColumn<string>(
                name: "Email",
                table: "Staff",
                type: "varchar(150)",
                maxLength: 150,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "varchar(150)",
                oldMaxLength: 150,
                oldNullable: true)
                .Annotation("MySql:CharSet", "utf8mb4")
                .OldAnnotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<decimal>(
                name: "DiscountAmount",
                table: "FeePayments",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "FineAmount",
                table: "FeePayments",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.CreateIndex(
                name: "IX_StudentFees_FeeStructureId1",
                table: "StudentFees",
                column: "FeeStructureId1");

            migrationBuilder.CreateIndex(
                name: "IX_StudentFees_StudentId1",
                table: "StudentFees",
                column: "StudentId1");

            migrationBuilder.AddForeignKey(
                name: "FK_HallTickets_Users_StudentId",
                table: "HallTickets",
                column: "StudentId",
                principalTable: "Users",
                principalColumn: "UserId",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_StudentFees_FeeStructures_FeeStructureId1",
                table: "StudentFees",
                column: "FeeStructureId1",
                principalTable: "FeeStructures",
                principalColumn: "FeeStructureId");

            migrationBuilder.AddForeignKey(
                name: "FK_StudentFees_Students_StudentId1",
                table: "StudentFees",
                column: "StudentId1",
                principalTable: "Students",
                principalColumn: "StudentId");
        }
    }
}
