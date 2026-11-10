using System.Data;
using System.Text;
using System.Reflection;
using Asp.Versioning;
using CollegeManagement.API.Data;
using CollegeManagement.API.Helpers;
using CollegeManagement.API.Interfaces;
using CollegeManagement.API.Middleware;
using CollegeManagement.API.Models;
using CollegeManagement.API.Profiles;
using CollegeManagement.API.Repositories;
using CollegeManagement.API.Repositories.Implementations;
using CollegeManagement.API.Repositories.Implementations.Hostel;
using CollegeManagement.API.Repositories.Implementations.Transport;
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Repositories.Interfaces.Hostel;
using CollegeManagement.API.Repositories.Interfaces.Payroll;
using CollegeManagement.API.Repositories.Implementations.Payroll;
using CollegeManagement.API.Repositories.Interfaces.Reimbursement;
using CollegeManagement.API.Repositories.Implementations.Reimbursement;
using CollegeManagement.API.Repositories.Interfaces.Inventory;
using CollegeManagement.API.Repositories.Implementations.Inventory;
using CollegeManagement.API.Services;
using CollegeManagement.API.Services.Implementations;
using CollegeManagement.API.Services.Implementations.Hostel;
using CollegeManagement.API.Services.Implementations.Payroll;
using CollegeManagement.API.Services.Interfaces;
using CollegeManagement.API.Services.Interfaces.Hostel;
using CollegeManagement.API.Services.Interfaces.Payroll;
using CollegeManagement.API.Services.Interfaces.Reimbursement;
using CollegeManagement.API.Settings;
using CollegeManagement.API.Services.Implementations.Reimbursement;
using CollegeManagement.API.Services.Interfaces.Inventory;
using CollegeManagement.API.Services.Implementations.Inventory;
using CollegeManagement.API.Services.Interfaces.Transport;
using CollegeManagement.API.Services.Implementations.Transport;
using CollegeManagement.API.Services.Location;
using CollegeManagement.API.Repositories.Interfaces.LopConfiguration;
using CollegeManagement.API.Repositories.Implementations.LopConfiguration;
using CollegeManagement.API.Services.Interfaces.LopConfiguration;
using CollegeManagement.API.Services.Implementations.LopConfiguration;
using CollegeManagement.API.Validators.StaffValidators;
using FluentValidation;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using MySqlConnector;

using Serilog;

Log.Logger = new LoggerConfiguration()
    .WriteTo.Console()
    .CreateBootstrapLogger();

try
{
    Log.Information("Starting CollegeManagement.API host...");
    var builder = WebApplication.CreateBuilder(args);

    builder.Host.UseSerilog((context, services, configuration) => configuration
        .ReadFrom.Configuration(context.Configuration)
        .ReadFrom.Services(services)
        .Enrich.FromLogContext()
        .WriteTo.Console(
            outputTemplate: "[{Timestamp:HH:mm:ss} {Level:u3}] [{SourceContext}] {Message:lj}{NewLine}{Exception}")
        .WriteTo.File(
            path: "Logs/api-.log",
            rollingInterval: RollingInterval.Day,
            retainedFileCountLimit: 30,
            fileSizeLimitBytes: 10 * 1024 * 1024,
            rollOnFileSizeLimit: true,
            outputTemplate: "{Timestamp:yyyy-MM-dd HH:mm:ss.fff zzz} [{Level:u3}] [{SourceContext}] {Message:lj}{NewLine}{Exception}"));
builder.Services.AddSignalR();
builder.Services.AddDistributedMemoryCache();
builder.Services.AddSession(options =>
{
    options.IdleTimeout = TimeSpan.FromHours(8);
    options.Cookie.HttpOnly = true;
    options.Cookie.IsEssential = true;
});

QuestPDF.Settings.License = QuestPDF.Infrastructure.LicenseType.Community;

#region Dapper Type Handlers
Dapper.SqlMapper.AddTypeHandler(new DateOnlyTypeHandler());
Dapper.SqlMapper.AddTypeHandler(new NullableDateOnlyTypeHandler());
Dapper.SqlMapper.AddTypeHandler(new TimeOnlyTypeHandler());
Dapper.SqlMapper.AddTypeHandler(new NullableTimeOnlyTypeHandler());
#endregion

#region Controllers & JSON
builder.Services.AddHttpContextAccessor();
builder.Services.AddControllers(options =>
    {
        options.Filters.Add<CollegeManagement.API.Filters.GlobalIsolationFilter>();
    })
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(new DateOnlyJsonConverter());
        options.JsonSerializerOptions.Converters.Add(new NullableDateOnlyJsonConverter());
        options.JsonSerializerOptions.Converters.Add(new TimeOnlyJsonConverter());
        options.JsonSerializerOptions.Converters.Add(new NullableTimeOnlyJsonConverter());
        options.JsonSerializerOptions.Converters.Add(new TimeSpanJsonConverter());
        options.JsonSerializerOptions.Converters.Add(new NullableTimeSpanJsonConverter());
        options.JsonSerializerOptions.Converters.Add(new FlexibleDecimalJsonConverter());
        options.JsonSerializerOptions.Converters.Add(new FlexibleNullableDecimalJsonConverter());
        options.JsonSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter());
    });
#endregion

#region CORS
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.SetIsOriginAllowed(origin => true)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });

    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.SetIsOriginAllowed(origin => true)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});
#endregion

#region Database Configuration
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
var serverVersion = new MySqlServerVersion(new Version(8, 0, 30));

builder.Services.AddDbContext<AppDbContext>(options =>
{
    options.UseMySql(
        connectionString,
        serverVersion,
        mySqlOptions => mySqlOptions
            .CommandTimeout(120)
            .UseQuerySplittingBehavior(QuerySplittingBehavior.SplitQuery)
            .EnableRetryOnFailure(
                maxRetryCount: 5,
                maxRetryDelay: TimeSpan.FromSeconds(3),
                errorNumbersToAdd: null));

    options.ConfigureWarnings(warnings => warnings
        .Ignore(CoreEventId.FirstWithoutOrderByAndFilterWarning)
        .Ignore(RelationalEventId.MultipleCollectionIncludeWarning));
});

builder.Services.AddSingleton<DatabaseContext>();

builder.Services.AddScoped<IDbConnection>(sp =>
{
    var context = sp.GetRequiredService<AppDbContext>();
    return context.Database.GetDbConnection();
});

builder.Services.AddMemoryCache();
builder.Services.AddDistributedMemoryCache();
builder.Services.AddSession(options =>
{
    options.IdleTimeout = TimeSpan.FromHours(2);
    options.Cookie.HttpOnly = true;
    options.Cookie.IsEssential = true;
});
#endregion

#region AutoMapper & Validators
builder.Services.AddAutoMapper(
    typeof(StaffMappingProfile),
    typeof(MarksMappingProfile),
    typeof(AttendanceProfile),
    typeof(CollegeManagement.API.Profiles.TimetableMappingProfile),
    typeof(SectionMappingProfile));

builder.Services.AddValidatorsFromAssemblyContaining<CreateStaffDtoValidator>();
#endregion

#region Repositories
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<IRoleRepository, RoleRepository>();
builder.Services.AddScoped<IPermissionRepository, PermissionRepository>();
builder.Services.AddScoped<IOtpRepository, OtpRepository>();
builder.Services.AddScoped<IAdminRepository, AdminRepository>();
builder.Services.AddScoped<IAcademicYearRepository, AcademicYearRepository>();
builder.Services.AddScoped<IBoardRepository, BoardRepository>();
builder.Services.AddScoped<ICampusRepository, CampusRepository>();
builder.Services.AddScoped<IAuditLogRepository, AuditLogRepository>();
builder.Services.AddScoped<IThemePolicyRepository, ThemePolicyRepository>();
builder.Services.AddScoped<IAuditLoggingService, AuditLoggingService>();
builder.Services.AddScoped<IDesignationRepository, DesignationRepository>();
builder.Services.AddScoped<IStaffRepository, StaffRepository>();
builder.Services.AddScoped<IStaffSettingsRepository, StaffSettingsRepository>();
builder.Services.AddScoped<IStaffSettingsService, StaffSettingsService>();
builder.Services.AddScoped<IEvaluationRepository, EvaluationRepository>();
builder.Services.AddScoped<IStaffSubjectAllocationRepository, StaffSubjectAllocationRepository>();
builder.Services.AddScoped<IDepartmentRepository, DepartmentRepository>();
builder.Services.AddScoped<IGroupRepository, GroupRepository>();
builder.Services.AddScoped<CollegeManagement.API.Repositories.IProgramRepository, CollegeManagement.API.Repositories.ProgramRepository>();
builder.Services.AddScoped<ISectionRepository, SectionRepository>();
builder.Services.AddScoped<ISubjectRepository, SubjectRepository>();
builder.Services.AddScoped<IAttendanceRepository, AttendanceRepository>();
builder.Services.AddScoped<IStaffAttendanceRepository, StaffAttendanceRepository>();
builder.Services.AddScoped<ILeaveManagementRepository, LeaveManagementRepository>();
builder.Services.AddScoped<ILeaveCategoryRepository, LeaveCategoryRepository>();
builder.Services.AddScoped<IStudentRepository, StudentRepository>();
builder.Services.AddScoped<IStudentAdmissionRepository, StudentAdmissionRepository>();
builder.Services.AddScoped<IStudentImportRepository, StudentImportRepository>();
builder.Services.AddScoped<IAssignmentRepository, AssignmentRepository>();
builder.Services.AddScoped<IAssignmentSubmissionRepository, AssignmentSubmissionRepository>();
builder.Services.AddScoped<IExaminationRepository, ExaminationRepository>();
builder.Services.AddScoped<IMarksRepository, MarksRepository>();
builder.Services.AddScoped<IEvaluationRepository, EvaluationRepository>();
builder.Services.AddScoped<IResultRepository, ResultRepository>();
builder.Services.AddScoped<IPromotionRepository, PromotionRepository>();
builder.Services.AddScoped<ITimetableRepository, TimetableRepository>();
builder.Services.AddScoped<ITimetableSubstitutionRepository, TimetableSubstitutionRepository>();
builder.Services.AddScoped<ITimetableBackupRepository, TimetableBackupRepository>();
builder.Services.AddScoped<IPeriodRepository, PeriodRepository>();
builder.Services.AddScoped<IPeriodStructureRepository, PeriodStructureRepository>();
builder.Services.AddScoped<IBreakTypeRepository, BreakTypeRepository>();
builder.Services.AddScoped<IRoomRepository, RoomRepository>();
builder.Services.AddScoped<IReportRepository, ReportRepository>();
builder.Services.AddScoped<IStudyMaterialRepository, StudyMaterialRepository>();
builder.Services.AddScoped<ICertificateRepository, CertificateRepository>();
builder.Services.AddScoped<IFeeRepository, FeeRepository>();
builder.Services.AddScoped<ISectionRollAllocationRepository, SectionRollAllocationRepository>();
builder.Services.AddScoped<IDashboardRepository, DashboardRepository>();
builder.Services.AddScoped<INumberSeriesRepository, NumberSeriesRepository>();
builder.Services.AddScoped<ITemplateRepository, TemplateRepository>();
builder.Services.AddScoped<IHolidayRepository, HolidayRepository>();
builder.Services.AddScoped<IAttendanceTimingConfigRepository, AttendanceTimingConfigRepository>();
builder.Services.AddScoped<ILeaveCategoryRepository, LeaveCategoryRepository>();

// Academic Calendar & Notifications Repositories
builder.Services.AddScoped<IAcademicCalendarRepository, AcademicCalendarRepository>();
builder.Services.AddScoped<INotificationRepository, NotificationRepository>();

// Hostel Repositories
builder.Services.AddScoped<IHostelBlockRepository, HostelBlockRepository>();
builder.Services.AddScoped<IRoomTypeConfigRepository, RoomTypeConfigRepository>();
builder.Services.AddScoped<IRoomMasterRepository, RoomMasterRepository>();
builder.Services.AddScoped<IHostelBedRepository, HostelBedRepository>();
builder.Services.AddScoped<IHostelWardenAssignmentRepository, HostelWardenAssignmentRepository>();
builder.Services.AddScoped<IHostelStudentAllocationRepository, HostelStudentAllocationRepository>();
builder.Services.AddScoped<IHostelAttendanceRepository, HostelAttendanceRepository>();
builder.Services.AddScoped<IHostelOutpassLeaveRepository, HostelOutpassLeaveRepository>();
builder.Services.AddScoped<IHostelTransferVacateRepository, HostelTransferVacateRepository>();
builder.Services.AddScoped<IHostelDashboardRepository, HostelDashboardRepository>();
builder.Services.AddScoped<IHostelReportRepository, HostelReportRepository>();

// Transport Repositories
builder.Services.AddScoped<ITransportRouteRepository, TransportRouteRepository>();
builder.Services.AddScoped<IPickupPointRepository, PickupPointRepository>();
builder.Services.AddScoped<ITransportVehicleRepository, TransportVehicleRepository>();
builder.Services.AddScoped<ITransportDriverRepository, TransportDriverRepository>();
builder.Services.AddScoped<ITransportAttendantRepository, TransportAttendantRepository>();
builder.Services.AddScoped<ITransportVehicleAssignmentRepository, TransportVehicleAssignmentRepository>();
builder.Services.AddScoped<IStudentTransportAssignmentRepository, StudentTransportAssignmentRepository>();
builder.Services.AddScoped<IVehicleMaintenanceRepository, VehicleMaintenanceRepository>();
builder.Services.AddScoped<ITransportDashboardRepository, TransportDashboardRepository>();
builder.Services.AddScoped<ITransportReportRepository, TransportReportRepository>();
builder.Services.AddScoped<ITransportRepository, TransportRepository>();
builder.Services.AddScoped<ITransportOperationsRepository, TransportOperationsRepository>();
builder.Services.AddScoped<ITransportDriverDashboardRepository, TransportDriverDashboardRepository>();

// Payroll Repositories
builder.Services.AddScoped<IPayrollRepository, PayrollRepository>();
builder.Services.AddScoped<IReimbursementRepository, ReimbursementRepository>();

// Inventory Repository
builder.Services.AddScoped<IInventoryRepository, InventoryRepository>();
builder.Services.AddScoped<ILopConfigurationRepository, LopConfigurationRepository>();
builder.Services.AddScoped<INonTeachingRepository, NonTeachingRepository>();
builder.Services.AddScoped<ISuperAdminRepository, SuperAdminRepository>();
builder.Services.AddScoped<ISuperAdminService, SuperAdminService>();
#endregion

#region Services
builder.Services.AddScoped<IJwtTokenHelper, JwtTokenHelper>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IRoleManagementService, RoleManagementService>();
builder.Services.AddScoped<IUserManagementService, UserManagementService>();
builder.Services.AddScoped<IUserProvisioningService, UserProvisioningService>();
builder.Services.AddScoped<IEmailService, EmailService>();
builder.Services.AddScoped<IAdminService, AdminService>();
builder.Services.AddScoped<IDashboardService, DashboardService>();
builder.Services.AddScoped<ICampusAuthorizationService, CampusAuthorizationService>();
builder.Services.AddScoped<INumberSeriesService, NumberSeriesService>();
builder.Services.AddScoped<ITemplateService, TemplateService>();
builder.Services.AddScoped<IHolidayService, HolidayService>();
builder.Services.AddScoped<IAttendanceTimingConfigService, AttendanceTimingConfigService>();

// Academic Calendar & Notifications Services
builder.Services.AddScoped<IAcademicCalendarService, AcademicCalendarService>();
builder.Services.AddScoped<INotificationService, NotificationService>();
builder.Services.AddScoped<ISectionRollAllocationService, SectionRollAllocationService>();
builder.Services.AddScoped<IAcademicYearService, AcademicYearService>();
builder.Services.AddScoped<IBoardService, BoardService>();
builder.Services.AddScoped<ICampusService, CampusService>();
builder.Services.AddScoped<ILookupCacheService, LookupCacheService>();
builder.Services.AddScoped<IBoardExportService, BoardExportService>();
builder.Services.AddScoped<IDesignationService, DesignationService>();
builder.Services.AddScoped<IStaffService, StaffService>();
builder.Services.AddScoped<IStaffTransferService, StaffTransferService>();
builder.Services.AddScoped<IStaffExperienceService, StaffExperienceService>();
builder.Services.AddScoped<IDepartmentService, DepartmentService>();
builder.Services.AddScoped<IFeeService, FeeService>();
builder.Services.Configure<PaymentGatewaySettings>(builder.Configuration.GetSection("PaymentGateway"));
builder.Services.AddSingleton<CollegeManagement.API.Helpers.AppUrlResolver>();
builder.Services.AddScoped<IPaymentGatewayService, PaymentGatewayService>();
builder.Services.AddScoped<IPaymentSettlementService, PaymentSettlementService>();
builder.Services.AddScoped<IPaymentLedgerService, PaymentLedgerService>();
builder.Services.AddScoped<IFeeReceiptPdfService, FeeReceiptPdfService>();
builder.Services.AddScoped<IGroupService, GroupService>();
builder.Services.AddScoped<CollegeManagement.API.Services.IProgramService, CollegeManagement.API.Services.ProgramService>();
builder.Services.AddScoped<ISectionService, SectionService>();
builder.Services.AddScoped<ISubjectService, SubjectService>();
builder.Services.AddSingleton<IAttendanceCacheService, AttendanceCacheService>();
builder.Services.AddScoped<IAttendanceService, AttendanceService>();
builder.Services.AddScoped<IStaffAttendanceService, StaffAttendanceService>();
builder.Services.AddScoped<ILeaveManagementService, LeaveManagementService>();
builder.Services.AddScoped<ILeaveCategoryService, LeaveCategoryService>();
builder.Services.AddScoped<IStudentService, StudentService>();
builder.Services.AddScoped<IStudentAdmissionService, StudentAdmissionService>();
builder.Services.AddScoped<IAssignmentService, AssignmentService>();
builder.Services.AddScoped<IAssignmentSubmissionService, AssignmentSubmissionService>();
builder.Services.AddScoped<IExaminationService, ExaminationService>();
builder.Services.AddScoped<IExaminationExportService, ExaminationExportService>();
builder.Services.AddScoped<IMarksService, MarksService>();
builder.Services.AddScoped<IEvaluationService, EvaluationService>();
builder.Services.AddScoped<IResultService, ResultService>();
builder.Services.AddScoped<IPromotionService, PromotionService>();
builder.Services.AddScoped<ICampusTransferRepository, CampusTransferRepository>();
builder.Services.AddScoped<ICampusTransferService, CampusTransferService>();
builder.Services.AddScoped<ITimetableService, TimetableService>();
builder.Services.AddScoped<ITimetableSubstitutionService, TimetableSubstitutionService>();
builder.Services.AddScoped<ITimetableExportService, TimetableExportService>();
builder.Services.AddScoped<IStudentExportService, StudentExportService>();
builder.Services.AddScoped<IStudentImportService, StudentImportService>();
builder.Services.AddScoped<IPeriodService, PeriodService>();
builder.Services.AddScoped<IPeriodStructureService, PeriodStructureService>();
builder.Services.AddScoped<IBreakTypeService, BreakTypeService>();
builder.Services.AddScoped<IRoomService, RoomService>();
builder.Services.AddScoped<IReportService, ReportService>();
builder.Services.AddScoped<IStudyMaterialService, StudyMaterialService>();
builder.Services.AddScoped<ICertificateService, CertificateService>();
builder.Services.AddScoped<ICertificateExportService, CertificateExportService>();

// Hostel Services
builder.Services.AddScoped<IHostelBlockService, HostelBlockService>();
builder.Services.AddScoped<IRoomTypeConfigService, RoomTypeConfigService>();
builder.Services.AddScoped<IRoomMasterService, RoomMasterService>();
builder.Services.AddScoped<IHostelBedService, HostelBedService>();
builder.Services.AddScoped<IHostelWardenAssignmentService, HostelWardenAssignmentService>();
builder.Services.AddScoped<IHostelFeeConfigRepository, HostelFeeConfigRepository>();
builder.Services.AddScoped<IHostelFeeConfigService, HostelFeeConfigService>();
builder.Services.AddScoped<IFineRuleRepository, FineRuleRepository>();
builder.Services.AddScoped<IFineRuleService, FineRuleService>();
builder.Services.AddScoped<IHostelStudentAllocationService, HostelStudentAllocationService>();
builder.Services.AddScoped<IHostelAttendanceService, HostelAttendanceService>();
builder.Services.AddScoped<IHostelOutpassLeaveService, HostelOutpassLeaveService>();
builder.Services.AddScoped<IHostelTransferVacateService, HostelTransferVacateService>();
builder.Services.AddScoped<IHostelDashboardService, HostelDashboardService>();
builder.Services.AddScoped<IHostelReportService, HostelReportService>();

// Transport Services
builder.Services.AddScoped<ITransportRouteService, TransportRouteService>();
builder.Services.AddScoped<IPickupPointService, PickupPointService>();
builder.Services.AddScoped<ITransportVehicleService, TransportVehicleService>();
builder.Services.AddScoped<ITransportDriverService, TransportDriverService>();
builder.Services.AddScoped<ITransportAttendantService, TransportAttendantService>();
builder.Services.AddScoped<ITransportVehicleAssignmentService, TransportVehicleAssignmentService>();
builder.Services.AddScoped<IStudentTransportAssignmentService, StudentTransportAssignmentService>();
builder.Services.AddScoped<IVehicleMaintenanceService, VehicleMaintenanceService>();
builder.Services.AddScoped<ITransportDashboardService, TransportDashboardService>();
builder.Services.AddScoped<ITransportReportService, TransportReportService>();
builder.Services.AddScoped<IStudentTransportService, StudentTransportService>();
builder.Services.AddScoped<ITransportService, TransportService>();
builder.Services.AddScoped<IDriverAttendanceService, DriverAttendanceService>();
builder.Services.AddScoped<ITransportOperationsService, TransportOperationsService>();
builder.Services.AddScoped<ITransportDriverDashboardService, TransportDriverDashboardService>();

// Payroll Service
builder.Services.AddScoped<IPayrollService, PayrollService>();

// Reimbursement Service
builder.Services.AddScoped<IReimbursementService, ReimbursementService>();

// Inventory Service
builder.Services.AddScoped<IInventoryService, InventoryService>();
builder.Services.AddScoped<ILopConfigurationService, LopConfigurationService>();

// Location Service
builder.Services.AddHttpClient<ILocationService, LocationService>(client =>
{
    client.BaseAddress = new Uri("https://api.postalpincode.in/");
});
builder.Services.AddHttpClient("RazorpayAssets", client =>
{
    client.Timeout = TimeSpan.FromSeconds(10);
});
// Background Services
builder.Services.AddHostedService<CollegeManagement.API.Services.Background.ExamAutoCompletionWorker>();
builder.Services.AddHostedService<CollegeManagement.API.Services.Background.FeeBackgroundHostedService>();
#endregion

#region Email Configuration
builder.Services.Configure<EmailSettings>(builder.Configuration.GetSection("EmailSettings"));
#endregion

#region JWT Authentication
var jwtSettings = builder.Configuration.GetSection("JwtSettings");
var key = Encoding.UTF8.GetBytes(jwtSettings["Key"] ?? "a_very_long_secure_secret_key_of_at_least_32_characters_long");

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = !builder.Environment.IsDevelopment();
    options.SaveToken = true;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtSettings["Issuer"],
        ValidAudience = jwtSettings["Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(key),
        ClockSkew = TimeSpan.Zero
    };
    options.Events = new JwtBearerEvents
    {
        OnMessageReceived = context =>
        {
            var accessToken = context.Request.Query["access_token"];
            var path = context.HttpContext.Request.Path;
            if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs"))
            {
                context.Token = accessToken;
            }
            return Task.CompletedTask;
        }
    };
});
#endregion

#region API Versioning & Explorer
builder.Services.AddApiVersioning(options =>
{
    options.DefaultApiVersion = new ApiVersion(1, 0);
    options.AssumeDefaultVersionWhenUnspecified = true;
    options.ReportApiVersions = true;
})
.AddApiExplorer(options =>
{
    options.GroupNameFormat = "'v'VVV";
    options.SubstituteApiVersionInUrl = true;
});
#endregion

#region Swagger
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Intermediate College Management System API",
        Version = "v1",
        Description = "College Management System REST APIs",
        Contact = new OpenApiContact
        {
            Name = "System Engineering Team",
            Email = "support@example.com"
        }
    });

    var xmlFile = $"{Assembly.GetExecutingAssembly().GetName().Name}.xml";
    var xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFile);
    if (File.Exists(xmlPath))
    {
        c.IncludeXmlComments(xmlPath);
    }

    c.ResolveConflictingActions(apiDescriptions => apiDescriptions.First());
    c.CustomSchemaIds(type => type.FullName);

    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme.",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT"
    });

    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});
#endregion

var app = builder.Build();

if (args.Contains("--test-timetable"))
{
    var connStr = app.Configuration.GetConnectionString("DefaultConnection")!;
    var tester = new CollegeManagement.API.Tests.TimetableOptimizationTester(connStr);
    await tester.RunAsync();
    return;
}

if (args.Contains("--deploy-certificate"))
{
    var connStr = app.Configuration.GetConnectionString("DefaultConnection")!;
    var success = await CollegeManagement.API.Tests.CertificateDbDeployer.DeployProceduresAsync(connStr);
    Environment.Exit(success ? 0 : 1);
    return;
}

if (args.Contains("--test-certificate"))
{
    var connStr = app.Configuration.GetConnectionString("DefaultConnection")!;
    var tester = new CollegeManagement.API.Tests.CertificateModuleBackendTester(connStr);
    var success = await tester.RunAllTestsAsync();
    Environment.Exit(success ? 0 : 1);
    return;
}

if (args.Contains("--deploy-exam-cell"))
{
    var connStr = app.Configuration.GetConnectionString("DefaultConnection")!;
    var success = await CollegeManagement.API.Tests.ExamCellModuleDbDeployer.DeployProceduresAsync(connStr);
    Environment.Exit(success ? 0 : 1);
    return;
}

if (args.Contains("--deploy-driver"))
{
    var connStr = app.Configuration.GetConnectionString("DefaultConnection")!;
    var success = await CollegeManagement.API.Tests.DriverModuleDbDeployer.DeployProceduresAsync(connStr);
    Environment.Exit(success ? 0 : 1);
    return;
}

if (args.Contains("--test-driver"))
{
    var success = await CollegeManagement.API.Tests.DriverModuleBackendTester.RunAllTestsAsync(app.Services);
    Environment.Exit(success ? 0 : 1);
    return;
}

if (args.Contains("--test-exam-cell"))
{
    var success = await CollegeManagement.API.Tests.ExamCellBackendTester.RunAllTestsAsync(app.Services);
    Environment.Exit(success ? 0 : 1);
    return;
}

if (args.Contains("--deploy-inventory"))
{
    var connStr = app.Configuration.GetConnectionString("DefaultConnection")!;
    await CollegeManagement.API.Tests.InventoryDbDeployer.DeployAsync(connStr);
    return;
}

if (args.Contains("--test-inventory"))
{
    var success = await CollegeManagement.API.Tests.InventoryModuleBackendTester.RunAllTestsAsync(app.Services);
    Environment.Exit(success ? 0 : 1);
    return;
}

if (args.Contains("--verify-inventory"))
{
    await CollegeManagement.API.Tests.InventoryVerificationRunner.RunAsync(app.Services);
    return;
}

if (args.Contains("--test-student-management"))
{
    var success = await CollegeManagement.API.Tests.StudentManagementModuleBackendTester.RunAllTestsAsync(app.Services);
    Environment.Exit(success ? 0 : 1);
    return;
}

if (args.Contains("--test-section-allocation"))
{
    var success = await CollegeManagement.API.Tests.SectionAllocationModuleBackendTester.RunAllTestsAsync(app.Services);
    Environment.Exit(success ? 0 : 1);
    return;
}

if (args.Contains("--test-student-attendance"))
{
    var success = await CollegeManagement.API.Tests.StudentAttendanceModuleBackendTester.RunAllTestsAsync(app.Services);
    Environment.Exit(success ? 0 : 1);
    return;
}

if (args.Contains("--test-promotion"))
{
    var success = await CollegeManagement.API.Tests.PromotionModuleBackendTester.RunAllTestsAsync(app.Services);
    Environment.Exit(success ? 0 : 1);
    return;
}

if (args.Contains("--test-holiday"))
{
    var success = await CollegeManagement.API.Tests.HolidayModuleBackendTester.RunAllTestsAsync(app.Services);
    Environment.Exit(success ? 0 : 1);
    return;
}

if (args.Contains("--test-transport"))
{
    var success = await CollegeManagement.API.Tests.TransportModuleBackendTester.RunAllTestsAsync(app.Services);
    Environment.Exit(success ? 0 : 1);
    return;
}

if (args.Contains("--test-audit"))
{
    var tester = new CollegeManagement.API.Tests.AuditModuleBackendTester(app.Services);
    await tester.RunAllTestsAsync();
    return;
}

if (args.Contains("--test-student-portal"))
{
    var success = await CollegeManagement.API.Tests.StudentPortalBackendTester.RunAllTestsAsync(app.Services);
    Environment.Exit(success ? 0 : 1);
    return;
}

if (args.Contains("--test-parent-portal"))
{
    var success = await CollegeManagement.API.Tests.ParentPortalBackendTester.RunAllTestsAsync(app.Services);
    Environment.Exit(success ? 0 : 1);
    return;
}

if (args.Contains("--test-faculty-portal"))
{
    var success = await CollegeManagement.API.Tests.FacultyPortalBackendTester.RunAllTestsAsync(app.Services);
    Environment.Exit(success ? 0 : 1);
    return;
}


#region Pipeline Middleware
var forwardedHeadersOptions = new ForwardedHeadersOptions
{
    ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto
};
forwardedHeadersOptions.KnownNetworks.Clear();
forwardedHeadersOptions.KnownProxies.Clear();
var trustedProxiesConfig = app.Configuration.GetSection("SecuritySettings:TrustedProxies").Get<string[]>() ?? Array.Empty<string>();
CollegeManagement.API.Helpers.ClientIpHelper.ConfigureTrustedProxies(trustedProxiesConfig);
foreach (var proxy in trustedProxiesConfig)
{
    if (System.Net.IPAddress.TryParse(proxy, out var ip))
    {
        forwardedHeadersOptions.KnownProxies.Add(ip);
    }
}
app.UseForwardedHeaders(forwardedHeadersOptions);

app.UseCors("AllowFrontend");
app.UseMiddleware<GlobalExceptionMiddleware>();
app.UseSerilogRequestLogging(options =>
{
    options.MessageTemplate = "HTTP {RequestMethod} {RequestPath} responded {StatusCode} in {Elapsed:0.0000} ms";
});

#region Swagger UI
app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "College Management API v1");
    c.RoutePrefix = "swagger";
});
#endregion

if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}
app.UseStaticFiles();

var webRootPath = app.Environment.WebRootPath ?? Path.Combine(app.Environment.ContentRootPath, "wwwroot");
if (!Directory.Exists(webRootPath))
{
    Directory.CreateDirectory(webRootPath);
}

var staffPhotosDir = Path.Combine(webRootPath, "uploads", "staff-photos");
if (!Directory.Exists(staffPhotosDir))
{
    Directory.CreateDirectory(staffPhotosDir);
}

var staffDocsDir = Path.Combine(webRootPath, "uploads", "staff-documents");
if (!Directory.Exists(staffDocsDir))
{
    Directory.CreateDirectory(staffDocsDir);
}

var uploadsDir = Path.Combine(app.Environment.ContentRootPath, "Uploads");
if (!Directory.Exists(uploadsDir))
{
    Directory.CreateDirectory(uploadsDir);
}

var wwwrootUploads = Path.Combine(webRootPath, "uploads");
if (Directory.Exists(wwwrootUploads))
{
    app.UseStaticFiles(new StaticFileOptions
    {
        FileProvider = new Microsoft.Extensions.FileProviders.PhysicalFileProvider(wwwrootUploads),
        RequestPath = "/uploads"
    });
}

app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new Microsoft.Extensions.FileProviders.PhysicalFileProvider(uploadsDir),
    RequestPath = "/Uploads"
});
app.UseSession();
app.UseAuthentication();

#region Legacy Route Rewrite Middleware
app.Use(async (context, next) =>
{
    var path = context.Request.Path.Value ?? "";

    if (path.Equals("/detail", StringComparison.OrdinalIgnoreCase) ||
        path.Equals("/api/detail", StringComparison.OrdinalIgnoreCase) ||
        path.Equals("/api/Evaluations/detail", StringComparison.OrdinalIgnoreCase))
    {
        context.Request.Path = "/api/Evaluations/admin/detail";
    }
    else if (path.Equals("/status", StringComparison.OrdinalIgnoreCase) ||
             path.Equals("/api/status", StringComparison.OrdinalIgnoreCase) ||
             path.Equals("/api/Evaluations/status", StringComparison.OrdinalIgnoreCase))
    {
        context.Request.Path = "/api/Evaluations/admin/status";
    }
    else if (path.Equals("/global-approval", StringComparison.OrdinalIgnoreCase) ||
             path.Equals("/api/global-approval", StringComparison.OrdinalIgnoreCase) ||
             path.Equals("/api/Evaluations/global-approval", StringComparison.OrdinalIgnoreCase))
    {
        context.Request.Path = "/api/Evaluations/admin/global-approval";
    }
    else if (path.Equals("/student-matrix", StringComparison.OrdinalIgnoreCase) ||
             path.Equals("/api/student-matrix", StringComparison.OrdinalIgnoreCase) ||
             path.Equals("/api/Evaluations/student-matrix", StringComparison.OrdinalIgnoreCase))
    {
        context.Request.Path = "/api/Evaluations/admin/student-matrix";
    }
    else if (path.Equals("/subject-analysis", StringComparison.OrdinalIgnoreCase) ||
             path.Equals("/api/subject-analysis", StringComparison.OrdinalIgnoreCase) ||
             path.Equals("/api/Evaluations/subject-analysis", StringComparison.OrdinalIgnoreCase))
    {
        context.Request.Path = "/api/Evaluations/admin/subject-analysis";
    }
    else if (path.Equals("/faculty/entry", StringComparison.OrdinalIgnoreCase) ||
             path.Equals("/api/faculty/entry", StringComparison.OrdinalIgnoreCase))
    {
        context.Request.Path = "/api/Evaluations/faculty/entry";
    }
    else if (path.Equals("/list", StringComparison.OrdinalIgnoreCase) ||
             path.Equals("/api/list", StringComparison.OrdinalIgnoreCase))
    {
        context.Request.Path = "/api/Evaluations/admin/list";
    }
    else if (path.StartsWith("/api/reports", StringComparison.OrdinalIgnoreCase) &&
             !path.StartsWith("/api/v1/reports", StringComparison.OrdinalIgnoreCase))
    {
        context.Request.Path = "/api/v1" + path.Substring(4);
    }
    else if (path.StartsWith("/api/staff", StringComparison.OrdinalIgnoreCase) &&
             !path.StartsWith("/api/v1/staff", StringComparison.OrdinalIgnoreCase) &&
             !path.StartsWith("/api/staff-attendance", StringComparison.OrdinalIgnoreCase))
    {
        context.Request.Path = "/api/v1" + path.Substring(4);
    }
    else if (path.StartsWith("/api/subjects", StringComparison.OrdinalIgnoreCase) &&
             !path.StartsWith("/api/v1/subjects", StringComparison.OrdinalIgnoreCase))
    {
        context.Request.Path = "/api/v1" + path.Substring(4);
    }
    else if (path.StartsWith("/api/dashboard", StringComparison.OrdinalIgnoreCase) &&
             !path.StartsWith("/api/v1/dashboard", StringComparison.OrdinalIgnoreCase))
    {
        context.Request.Path = "/api/v1" + path.Substring(4);
    }
    else if (path.StartsWith("/api/departments", StringComparison.OrdinalIgnoreCase) &&
             !path.StartsWith("/api/v1/departments", StringComparison.OrdinalIgnoreCase))
    {
        context.Request.Path = "/api/v1" + path.Substring(4);
    }
    else if (path.StartsWith("/api/designations", StringComparison.OrdinalIgnoreCase) &&
             !path.StartsWith("/api/v1/designations", StringComparison.OrdinalIgnoreCase))
    {
        context.Request.Path = "/api/v1" + path.Substring(4);
    }
    else if (path.StartsWith("/api/certificates", StringComparison.OrdinalIgnoreCase) &&
             !path.StartsWith("/api/v1/certificates", StringComparison.OrdinalIgnoreCase))
    {
        context.Request.Path = "/api/v1" + path.Substring(4);
    }

    await next();
});
#endregion

app.UseAuthorization();
app.UseMiddleware<CollegeManagement.API.Middleware.AuditRequestMiddleware>();
app.MapControllers();
app.MapHub<CollegeManagement.API.Hubs.DriverNotificationHub>("/hubs/driverNotifications");
app.MapHub<CollegeManagement.API.Hubs.NotificationHub>("/hubs/notifications");
app.MapGet("/", () => Results.Redirect("/swagger"));
#endregion

try
{
    using var scope = app.Services.CreateScope();
    var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    var allRollNoConfigs = dbContext.NumberSeriesConfigurations
        .Where(n => n.SeriesCode.StartsWith("ROLL_NO"))
        .ToList();

    bool dbModified = false;
    foreach(var config in allRollNoConfigs)
    {
        if (config.FormatPattern != "{YY}{CAMPUS:2}{BOARD:1}{PROGRAM:1}{GROUP:1}{SEQ}")
        {
            config.FormatPattern = "{YY}{CAMPUS:2}{BOARD:1}{PROGRAM:1}{GROUP:1}{SEQ}";
            config.Prefix = "";
            dbModified = true;
        }
    }

    if (dbModified)
    {
        dbContext.SaveChanges();
    }

    try
    {
        // Dashboard SP already deployed in DB - commented out to prevent startup delay
        try
        {
            var colExists = await dbContext.Database.SqlQueryRaw<int>(@"
                SELECT COUNT(*) AS `Value` FROM information_schema.columns 
                WHERE table_schema = DATABASE() AND table_name = 'FeePaymentPlans' AND column_name = 'UpdatedAt'").FirstOrDefaultAsync();
            if (colExists == 0)
            {
                await dbContext.Database.ExecuteSqlRawAsync("ALTER TABLE `FeePaymentPlans` ADD COLUMN `UpdatedAt` datetime(6) NULL;");
            }

            // Align Staff table inter-campus transfer columns
            try
            {
                var isTransCol = await dbContext.Database.SqlQueryRaw<int>(@"
                    SELECT COUNT(*) AS Value FROM information_schema.columns 
                    WHERE table_schema = DATABASE() AND table_name = 'Staff' AND column_name = 'IsTransferred'").FirstOrDefaultAsync();
                if (isTransCol == 0)
                {
                    try
                    {
                        await dbContext.Database.ExecuteSqlRawAsync("ALTER TABLE `Staff` ADD COLUMN `IsTransferred` TINYINT(1) NOT NULL DEFAULT 0;");
                        await dbContext.Database.ExecuteSqlRawAsync("ALTER TABLE `Staff` ADD COLUMN `TransferredFromCampusId` INT NULL;");
                        await dbContext.Database.ExecuteSqlRawAsync("ALTER TABLE `Staff` ADD COLUMN `TransferredToCampusId` INT NULL;");
                        await dbContext.Database.ExecuteSqlRawAsync("ALTER TABLE `Staff` ADD COLUMN `TransferStatus` VARCHAR(50) NULL;");
                        await dbContext.Database.ExecuteSqlRawAsync("ALTER TABLE `Staff` ADD COLUMN `TransferredAt` DATETIME NULL;");
                    }
                    catch { }
                }
            }
            catch (Exception ex)
            {
                app.Logger.LogWarning(ex, "Failed to align Staff transfer columns.");
            }

            // Align Examination Module tables & columns
            await dbContext.Database.ExecuteSqlRawAsync(@"
                CREATE TABLE IF NOT EXISTS `ExaminationSubjects` (
                    `Id` INT NOT NULL AUTO_INCREMENT,
                    `ExaminationId` INT NOT NULL,
                    `SubjectId` INT NOT NULL,
                    `CreatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (`Id`),
                    UNIQUE KEY `UQ_Exam_Subject` (`ExaminationId`, `SubjectId`),
                    KEY `IX_ExaminationSubjects_ExamId` (`ExaminationId`),
                    KEY `IX_ExaminationSubjects_SubjectId` (`SubjectId`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            ");

            await dbContext.Database.ExecuteSqlRawAsync(@"
                CREATE TABLE IF NOT EXISTS `ExaminationSettings` (
                    `SettingId` INT NOT NULL AUTO_INCREMENT,
                    `CampusId` INT NOT NULL DEFAULT 1,
                    `MinimumPassingPercentage` DECIMAL(5,2) NOT NULL DEFAULT 35.00,
                    `MaximumGraceMarksLimit` INT NOT NULL DEFAULT 5,
                    `GradeScaleStandard` VARCHAR(100) NOT NULL DEFAULT '10-Point CGPA (UGC / AICTE Standard)',
                    `ReEvaluationWindowDays` INT NOT NULL DEFAULT 15,
                    `EnableDoubleEvaluation` TINYINT(1) NOT NULL DEFAULT 0,
                    `AllowNegativeMarking` TINYINT(1) NOT NULL DEFAULT 0,
                    `UpdatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    PRIMARY KEY (`SettingId`),
                    UNIQUE KEY `UQ_ExamSettings_Campus` (`CampusId`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            ");

            try
            {
                var patExists = await dbContext.Database.SqlQueryRaw<int>(@"
                    SELECT COUNT(*) AS `Value` FROM information_schema.columns 
                    WHERE table_schema = DATABASE() AND table_name = 'ExamSchedules' AND column_name = 'PatternName'").FirstOrDefaultAsync();
                if (patExists == 0)
                {
                    await dbContext.Database.ExecuteSqlRawAsync("ALTER TABLE `ExamSchedules` ADD COLUMN `PatternName` VARCHAR(100) NULL;");
                }
                var grpExists = await dbContext.Database.SqlQueryRaw<int>(@"
                    SELECT COUNT(*) AS `Value` FROM information_schema.columns 
                    WHERE table_schema = DATABASE() AND table_name = 'ExamSchedules' AND column_name = 'GroupId'").FirstOrDefaultAsync();
                if (grpExists == 0)
                {
                    await dbContext.Database.ExecuteSqlRawAsync("ALTER TABLE `ExamSchedules` ADD COLUMN `GroupId` INT NULL;");
                }
                var incExists = await dbContext.Database.SqlQueryRaw<int>(@"
                    SELECT COUNT(*) AS `Value` FROM information_schema.columns 
                    WHERE table_schema = DATABASE() AND table_name = 'ExamSchedules' AND column_name = 'IncludedSubjectIds'").FirstOrDefaultAsync();
                if (incExists == 0)
                {
                    await dbContext.Database.ExecuteSqlRawAsync("ALTER TABLE `ExamSchedules` ADD COLUMN `IncludedSubjectIds` TEXT NULL;");
                }

                // Align table collations to utf8mb4_unicode_ci
                try
                {
//                     await dbContext.Database.ExecuteSqlRawAsync("ALTER TABLE `ExamSchedules` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;");
                }
                catch { }

                try
                {
//                     await dbContext.Database.ExecuteSqlRawAsync("ALTER TABLE `Examinations` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;");
                }
                catch { }

                try
                {
//                     await dbContext.Database.ExecuteSqlRawAsync("ALTER TABLE `InvigilatorAssignments` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;");
                }
                catch { }

                // Auto-deploy ExaminationModule stored procedures (Commented out: already deployed to database)
            }
            catch (Exception exExamCols)
            {
                app.Logger.LogWarning(exExamCols, "Failed to verify or add ExamSchedules pattern columns.");
            }

            await dbContext.Database.ExecuteSqlRawAsync(@"
                CREATE TABLE IF NOT EXISTS `facility_transition_histories` (
                    `TransitionId` INT NOT NULL AUTO_INCREMENT,
                    `StudentId` INT NOT NULL,
                    `FromFacility` VARCHAR(50) NOT NULL,
                    `ToFacility` VARCHAR(50) NOT NULL,
                    `TransitionDate` DATETIME(6) NOT NULL,
                    `MonthsUsedFromFacility` INT NOT NULL,
                    `ProratedFromFee` DECIMAL(18,2) NOT NULL,
                    `MonthsUsedToFacility` INT NOT NULL,
                    `ProratedToFee` DECIMAL(18,2) NOT NULL,
                    `ExcessCreditTransferred` DECIMAL(18,2) NOT NULL,
                    `PreviousTotalFee` DECIMAL(18,2) NOT NULL,
                    `NewTotalFee` DECIMAL(18,2) NOT NULL,
                    `PreviousBalance` DECIMAL(18,2) NOT NULL,
                    `NewBalance` DECIMAL(18,2) NOT NULL,
                    `Remarks` VARCHAR(500) NULL,
                    `PerformedBy` VARCHAR(100) NULL,
                    `CreatedAt` DATETIME(6) NOT NULL,
                    PRIMARY KEY (`TransitionId`),
                    KEY `IX_facility_transition_histories_StudentId` (`StudentId`),
                    CONSTRAINT `FK_facility_transition_histories_Students_StudentId` FOREIGN KEY (`StudentId`) REFERENCES `Students` (`StudentId`) ON DELETE CASCADE
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            ");
        }
        catch (Exception fpEx)
        {
            app.Logger.LogWarning(fpEx, "Failed to align FeePaymentPlans schema or facility_transition_histories table.");
        }

        try
        {
            var campExists = await dbContext.Database.SqlQueryRaw<int>(@"
                SELECT COUNT(*) AS `Value` FROM information_schema.columns 
                WHERE table_schema = DATABASE() AND table_name = 'Marks' AND column_name = 'CampusId'").FirstOrDefaultAsync();
            if (campExists == 0)
            {
                await dbContext.Database.ExecuteSqlRawAsync("ALTER TABLE `Marks` ADD COLUMN `CampusId` INT NOT NULL DEFAULT 1;");
            }

            var subExists = await dbContext.Database.SqlQueryRaw<int>(@"
                SELECT COUNT(*) AS `Value` FROM information_schema.columns 
                WHERE table_schema = DATABASE() AND table_name = 'Marks' AND column_name = 'SubmittedAt'").FirstOrDefaultAsync();
            if (subExists == 0)
            {
                await dbContext.Database.ExecuteSqlRawAsync("ALTER TABLE `Marks` ADD COLUMN `SubmittedAt` DATETIME(6) NULL;");
            }

            var resubExists = await dbContext.Database.SqlQueryRaw<int>(@"
                SELECT COUNT(*) AS `Value` FROM information_schema.columns 
                WHERE table_schema = DATABASE() AND table_name = 'Marks' AND column_name = 'ResubmissionCount'").FirstOrDefaultAsync();
            if (resubExists == 0)
            {
                await dbContext.Database.ExecuteSqlRawAsync("ALTER TABLE `Marks` ADD COLUMN `ResubmissionCount` INT NOT NULL DEFAULT 0;");
            }

            var uqExists = await dbContext.Database.SqlQueryRaw<int>(@"
                SELECT COUNT(*) AS `Value` FROM information_schema.statistics 
                WHERE table_schema = DATABASE() AND table_name = 'Marks' AND index_name = 'UQ_Marks_Exam_Subject_Student'").FirstOrDefaultAsync();
            if (uqExists == 0)
            {
                try
                {
                    await dbContext.Database.ExecuteSqlRawAsync("ALTER TABLE `Marks` ADD UNIQUE KEY `UQ_Marks_Exam_Subject_Student` (`ExaminationId`, `SubjectId`, `StudentId`);");
                }
                catch { }
            }

            var ixExists = await dbContext.Database.SqlQueryRaw<int>(@"
                SELECT COUNT(*) AS `Value` FROM information_schema.statistics 
                WHERE table_schema = DATABASE() AND table_name = 'Marks' AND index_name = 'IX_Marks_Exam_Subject_Section_Status'").FirstOrDefaultAsync();
            if (ixExists == 0)
            {
                try
                {
                    await dbContext.Database.ExecuteSqlRawAsync("ALTER TABLE `Marks` ADD KEY `IX_Marks_Exam_Subject_Section_Status` (`ExaminationId`, `SubjectId`, `SectionId`, `Status`, `IsActive`);");
                }
                catch { }
            }

                        // Auto-deploy MarksModule stored procedures (Commented out: already deployed to database)

            // Align Results table indexes and unified Stored Procedures
            try
            {
                var rIdxExists = await dbContext.Database.SqlQueryRaw<int>(@"
                    SELECT COUNT(*) AS Value FROM information_schema.statistics 
                    WHERE table_schema = DATABASE() AND table_name = 'Results' AND index_name = 'IX_Results_Exam_Student_Subject'").FirstOrDefaultAsync();
                if (rIdxExists == 0)
                {
                    try
                    {
                        await dbContext.Database.ExecuteSqlRawAsync("ALTER TABLE `Results` ADD KEY `IX_Results_Exam_Student_Subject` (`ExamId`, `StudentId`, `SubjectId`);");
                    }
                    catch { }
                }

                var rGrpIdxExists = await dbContext.Database.SqlQueryRaw<int>(@"
                    SELECT COUNT(*) AS Value FROM information_schema.statistics 
                    WHERE table_schema = DATABASE() AND table_name = 'Results' AND index_name = 'IX_Results_Exam_Group_Published'").FirstOrDefaultAsync();
                if (rGrpIdxExists == 0)
                {
                    try
                    {
                        await dbContext.Database.ExecuteSqlRawAsync("ALTER TABLE `Results` ADD KEY `IX_Results_Exam_Group_Published` (`ExamId`, `GroupId`, `IsPublished`);");
                    }
                    catch { }
                }

                // Auto-deploy ResultModule stored procedures (Commented out: already deployed to database)
            }
            catch (Exception resEx)
            {
                app.Logger.LogWarning(resEx, "Failed to align Results table indexes or stored procedures.");
            }

            // Align Certificates table schema and unified Stored Procedures
            try
            {
                var certCampusCol = await dbContext.Database.SqlQueryRaw<int>(@"
                    SELECT COUNT(*) AS Value FROM information_schema.columns 
                    WHERE table_schema = DATABASE() AND table_name = 'certificates' AND column_name = 'CampusId'").FirstOrDefaultAsync();
                if (certCampusCol == 0)
                {
                    try
                    {
                        await dbContext.Database.ExecuteSqlRawAsync("ALTER TABLE `certificates` ADD COLUMN `CampusId` INT NULL;");
                    }
                    catch { }
                }

                var certCampusIdx = await dbContext.Database.SqlQueryRaw<int>(@"
                    SELECT COUNT(*) AS Value FROM information_schema.statistics 
                    WHERE table_schema = DATABASE() AND table_name = 'certificates' AND index_name = 'IX_certificates_CampusId_Status'").FirstOrDefaultAsync();
                if (certCampusIdx == 0)
                {
                    try
                    {
                        await dbContext.Database.ExecuteSqlRawAsync("ALTER TABLE `certificates` ADD KEY `IX_certificates_CampusId_Status` (`CampusId`, `Status`);");
                    }
                    catch { }
                }

                var certAdmIdx = await dbContext.Database.SqlQueryRaw<int>(@"
                    SELECT COUNT(*) AS Value FROM information_schema.statistics 
                    WHERE table_schema = DATABASE() AND table_name = 'certificates' AND index_name = 'IX_certificates_AdmissionNo'").FirstOrDefaultAsync();
                if (certAdmIdx == 0)
                {
                    try
                    {
                        await dbContext.Database.ExecuteSqlRawAsync("ALTER TABLE `certificates` ADD KEY `IX_certificates_AdmissionNo` (`AdmissionNo`);");
                    }
                    catch { }
                }

                // Auto-deploy CertificateModule stored procedures (Commented out: already deployed to database)
            }
            catch (Exception certEx)
            {
                app.Logger.LogWarning(certEx, "Failed to align Certificates table schema or stored procedures.");
            }
        }
        catch (Exception marksEx)
        {
            app.Logger.LogWarning(marksEx, "Failed to align Marks/Results table schema or stored procedures.");
        }
    }
    catch (Exception spEx)
    {
        app.Logger.LogWarning(spEx, "Failed to align sp_GetDashboardTodaysHighlights schema.");
    }
}
catch (Exception ex)
{
    app.Logger.LogWarning(ex, "Failed to run startup NumberSeriesConfigurations migration check.");
}

    // Align Omnichannel Payment Gateway tables (PaymentGatewayTransactions, FeePaymentAllocations, PaymentGatewayConfigs)
    try
    {
        using var pgScope = app.Services.CreateScope();
        var pgDb = pgScope.ServiceProvider.GetRequiredService<AppDbContext>();

        await pgDb.Database.ExecuteSqlRawAsync(@"
            CREATE TABLE IF NOT EXISTS `PaymentGatewayTransactions` (
                `Id` INT NOT NULL AUTO_INCREMENT,
                `StudentId` INT NOT NULL,
                `StudentFeeId` INT NOT NULL,
                `FeeInstallmentId` INT NULL,
                `FeeInstallmentIdsJson` VARCHAR(500) NULL,
                `OrderId` VARCHAR(100) NOT NULL,
                `GatewayPaymentId` VARCHAR(100) NULL,
                `UtrNumber` VARCHAR(50) NULL,
                `BankName` VARCHAR(200) NULL,
                `Amount` DECIMAL(18,2) NOT NULL,
                `Currency` VARCHAR(10) NOT NULL DEFAULT 'INR',
                `PaymentMethod` VARCHAR(50) NOT NULL DEFAULT 'UPI_QR',
                `Status` VARCHAR(30) NOT NULL DEFAULT 'Created',
                `IdempotencyKey` VARCHAR(256) NULL,
                `RequestPayloadHash` VARCHAR(128) NULL,
                `RowVersion` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                `ReceiptNumber` VARCHAR(50) NULL,
                `FeePaymentId` INT NULL,
                `CollectedByUserId` INT NULL,
                `FailureReason` VARCHAR(500) NULL,
                `Remarks` VARCHAR(500) NULL,
                `UpiUri` VARCHAR(1000) NULL,
                `CreatedAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                `SettledAt` DATETIME(6) NULL,
                PRIMARY KEY (`Id`),
                UNIQUE KEY `UK_PaymentGateway_OrderId` (`OrderId`),
                KEY `IX_PaymentGateway_IdempotencyKey` (`IdempotencyKey`),
                KEY `IX_PaymentGateway_PayloadHash` (`RequestPayloadHash`),
                KEY `IX_PaymentGateway_UtrNumber` (`UtrNumber`),
                KEY `IX_PaymentGateway_Status` (`Status`),
                KEY `IX_PaymentGateway_StudentFeeId` (`StudentFeeId`),
                KEY `IX_PaymentGateway_StudentId` (`StudentId`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ");

        var pgColExists = await pgDb.Database.SqlQueryRaw<int>(@"
            SELECT COUNT(*) AS `Value` FROM information_schema.columns 
            WHERE table_schema = DATABASE() AND table_name = 'PaymentGatewayTransactions' AND column_name = 'FeeInstallmentIdsJson'").FirstOrDefaultAsync();
        if (pgColExists == 0)
        {
            await pgDb.Database.ExecuteSqlRawAsync("ALTER TABLE `PaymentGatewayTransactions` ADD COLUMN `FeeInstallmentIdsJson` VARCHAR(500) NULL AFTER `FeeInstallmentId`;");
        }

        await pgDb.Database.ExecuteSqlRawAsync(@"
            CREATE TABLE IF NOT EXISTS `FeePaymentAllocations` (
                `Id` INT NOT NULL AUTO_INCREMENT,
                `FeePaymentId` INT NOT NULL,
                `FeeInstallmentId` INT NOT NULL,
                `AllocatedAmount` DECIMAL(18,2) NOT NULL,
                `AllocationDate` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                `CreatedAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                PRIMARY KEY (`Id`),
                KEY `IX_FeePaymentAllocations_PaymentId` (`FeePaymentId`),
                KEY `IX_FeePaymentAllocations_InstallmentId` (`FeeInstallmentId`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ");

        await pgDb.Database.ExecuteSqlRawAsync(@"
            CREATE TABLE IF NOT EXISTS `PaymentGatewayConfigs` (
                `Id` INT NOT NULL AUTO_INCREMENT,
                `CampusId` INT NULL,
                `BankName` VARCHAR(200) NULL,
                `AccountHolderName` VARCHAR(200) NULL,
                `AccountNumber` VARCHAR(50) NULL,
                `IfscCode` VARCHAR(20) NULL,
                `BranchName` VARCHAR(200) NULL,
                `AccountType` VARCHAR(50) NOT NULL DEFAULT 'Current',
                `PayeeVpa` VARCHAR(100) NOT NULL DEFAULT 'pirnavcolleges@hdfcbank',
                `PayeeName` VARCHAR(200) NOT NULL DEFAULT 'Pirnav Educational Group',
                `Currency` VARCHAR(10) NOT NULL DEFAULT 'INR',
                `Mcc` VARCHAR(10) NOT NULL DEFAULT '8220',
                `EnableCounterUpiQr` TINYINT(1) NOT NULL DEFAULT 1,
                `Provider` VARCHAR(50) NOT NULL DEFAULT 'Razorpay',
                `IsLiveMode` TINYINT(1) NOT NULL DEFAULT 0,
                `RazorpayKeyId` VARCHAR(100) NULL,
                `RazorpayKeySecret` VARCHAR(200) NULL,
                `RazorpayWebhookSecret` VARCHAR(200) NULL,
                `AutoCapture` TINYINT(1) NOT NULL DEFAULT 1,
                `EnableRazorpay` TINYINT(1) NOT NULL DEFAULT 1,
                `EnableOfflineUtr` TINYINT(1) NOT NULL DEFAULT 1,
                `PollingIntervalMs` INT NOT NULL DEFAULT 1200,
                `MonitoringTimeoutSeconds` INT NOT NULL DEFAULT 600,
                `BaseAppUrl` VARCHAR(255) NULL,
                `FrontendPort` INT NOT NULL DEFAULT 5173,
                `CreatedAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                `UpdatedAt` DATETIME(6) NULL,
                `UpdatedByUserId` INT NULL,
                PRIMARY KEY (`Id`),
                KEY `IX_PaymentGatewayConfigs_CampusId` (`CampusId`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ");
        var extraPgColumns = new (string ColName, string AlterSql)[]
        {
            ("GatewayQrCodeId", "ALTER TABLE `PaymentGatewayTransactions` ADD COLUMN `GatewayQrCodeId` VARCHAR(100) NULL AFTER `OrderId`;"),
            ("CampusId", "ALTER TABLE `PaymentGatewayTransactions` ADD COLUMN `CampusId` INT NULL AFTER `StudentFeeId`;"),
            ("ExpiresAt", "ALTER TABLE `PaymentGatewayTransactions` ADD COLUMN `ExpiresAt` DATETIME(6) NULL AFTER `SettledAt`;"),
            ("LastGatewaySyncAtUtc", "ALTER TABLE `PaymentGatewayTransactions` ADD COLUMN `LastGatewaySyncAtUtc` DATETIME(6) NULL AFTER `ExpiresAt`;")
        };

        foreach (var (colName, alterSql) in extraPgColumns)
        {
            var colExists = await pgDb.Database.SqlQuery<int>(
                $"SELECT COUNT(*) AS `Value` FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'PaymentGatewayTransactions' AND column_name = {colName}").FirstOrDefaultAsync();
            if (colExists == 0)
            {
                await pgDb.Database.ExecuteSqlRawAsync(alterSql);
            }
        }

        await pgDb.Database.ExecuteSqlRawAsync(@"
            CREATE TABLE IF NOT EXISTS `PaymentLedgerEntries` (
                `Id` INT NOT NULL AUTO_INCREMENT,
                `PaymentGatewayTransactionId` INT NULL,
                `FeePaymentId` INT NULL,
                `StudentId` INT NULL,
                `CampusId` INT NULL,
                `AcademicYearId` INT NULL,
                `EntryType` VARCHAR(30) NOT NULL DEFAULT 'Credit',
                `Amount` DECIMAL(18,2) NOT NULL,
                `StudentName` VARCHAR(200) NOT NULL,
                `AdmissionNo` VARCHAR(100) NOT NULL DEFAULT '',
                `Course` VARCHAR(200) NOT NULL DEFAULT '',
                `PaymentMethod` VARCHAR(50) NOT NULL,
                `ReferenceNumber` VARCHAR(150) NOT NULL DEFAULT '',
                `ReceiptNumber` VARCHAR(50) NOT NULL DEFAULT '',
                `Status` VARCHAR(30) NOT NULL DEFAULT 'Captured',
                `Remarks` VARCHAR(500) NULL,
                `PaymentDateUtc` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                `CreatedAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                PRIMARY KEY (`Id`),
                KEY `IX_PaymentLedgerEntries_TxnId` (`PaymentGatewayTransactionId`),
                KEY `IX_PaymentLedgerEntries_Campus_Created` (`CampusId`, `CreatedAt`),
                KEY `IX_PaymentLedgerEntries_AcademicYearId` (`AcademicYearId`),
                KEY `IX_PaymentLedgerEntries_StudentId` (`StudentId`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ");
    }
    catch (Exception pgEx)
    {
        app.Logger.LogWarning(pgEx, "Failed to align PaymentGateway database tables on startup.");
    }

    app.Run();
}
catch (Exception ex)
{
    Log.Fatal(ex, "Application terminated unexpectedly");
}
finally
{
    Log.CloseAndFlush();
}







