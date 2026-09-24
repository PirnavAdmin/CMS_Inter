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
using CollegeManagement.API.Services;
using CollegeManagement.API.Services.Implementations;
using CollegeManagement.API.Services.Implementations.Hostel;
using CollegeManagement.API.Services.Interfaces;
using CollegeManagement.API.Services.Interfaces.Hostel;
using CollegeManagement.API.Services.Location;
using CollegeManagement.API.Validators.StaffValidators;
using FluentValidation;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using MySqlConnector;

var builder = WebApplication.CreateBuilder(args);

QuestPDF.Settings.License = QuestPDF.Infrastructure.LicenseType.Community;

#region Dapper Type Handlers
Dapper.SqlMapper.AddTypeHandler(new DateOnlyTypeHandler());
Dapper.SqlMapper.AddTypeHandler(new NullableDateOnlyTypeHandler());
Dapper.SqlMapper.AddTypeHandler(new TimeOnlyTypeHandler());
Dapper.SqlMapper.AddTypeHandler(new NullableTimeOnlyTypeHandler());
#endregion

#region Controllers & JSON
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(new DateOnlyJsonConverter());
        options.JsonSerializerOptions.Converters.Add(new TimeSpanJsonConverter());
        options.JsonSerializerOptions.Converters.Add(new NullableTimeSpanJsonConverter());
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
    options.UseMySql(
        connectionString,
        serverVersion,
        mySqlOptions => mySqlOptions
            .CommandTimeout(120)
            .EnableRetryOnFailure(
                maxRetryCount: 5,
                maxRetryDelay: TimeSpan.FromSeconds(3),
                errorNumbersToAdd: null)));

builder.Services.AddSingleton<DatabaseContext>();

builder.Services.AddScoped<IDbConnection>(sp =>
{
    var config = sp.GetRequiredService<IConfiguration>();
    return new MySqlConnection(config.GetConnectionString("DefaultConnection"));
});

builder.Services.AddMemoryCache();
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
builder.Services.AddScoped<IDesignationRepository, DesignationRepository>();
builder.Services.AddScoped<IStaffRepository, StaffRepository>();
builder.Services.AddScoped<IStaffSubjectAllocationRepository, StaffSubjectAllocationRepository>();
builder.Services.AddScoped<IDepartmentRepository, DepartmentRepository>();
builder.Services.AddScoped<IGroupRepository, GroupRepository>();
builder.Services.AddScoped<CollegeManagement.API.Repositories.IProgramRepository, CollegeManagement.API.Repositories.ProgramRepository>();
builder.Services.AddScoped<ISectionRepository, SectionRepository>();
builder.Services.AddScoped<ISubjectRepository, SubjectRepository>();
builder.Services.AddScoped<IAttendanceRepository, AttendanceRepository>();
builder.Services.AddScoped<IStaffAttendanceRepository, StaffAttendanceRepository>();
builder.Services.AddScoped<IStudentRepository, StudentRepository>();
builder.Services.AddScoped<IStudentAdmissionRepository, StudentAdmissionRepository>();
builder.Services.AddScoped<IStudentImportRepository, StudentImportRepository>();
builder.Services.AddScoped<IAssignmentRepository, AssignmentRepository>();
builder.Services.AddScoped<IAssignmentSubmissionRepository, AssignmentSubmissionRepository>();
builder.Services.AddScoped<IExaminationRepository, ExaminationRepository>();
builder.Services.AddScoped<IMarksRepository, MarksRepository>();
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
builder.Services.AddScoped<INumberSeriesService, NumberSeriesService>();
builder.Services.AddScoped<ITemplateService, TemplateService>();
builder.Services.AddScoped<IHolidayService, HolidayService>();
builder.Services.AddScoped<IAttendanceTimingConfigService, AttendanceTimingConfigService>();
builder.Services.AddScoped<ISectionRollAllocationService, SectionRollAllocationService>();
builder.Services.AddScoped<IAcademicYearService, AcademicYearService>();
builder.Services.AddScoped<IBoardService, BoardService>();
builder.Services.AddScoped<ICampusService, CampusService>();
builder.Services.AddScoped<ILookupCacheService, LookupCacheService>();
builder.Services.AddScoped<IBoardExportService, BoardExportService>();
builder.Services.AddScoped<IDesignationService, DesignationService>();
builder.Services.AddScoped<IStaffService, StaffService>();
builder.Services.AddScoped<IDepartmentService, DepartmentService>();
builder.Services.AddScoped<IFeeService, FeeService>();
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

// Location Service
builder.Services.AddHttpClient<ILocationService, LocationService>(client =>
{
    client.BaseAddress = new Uri("https://api.postalpincode.in/");
});
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

#region Pipeline Middleware
var forwardedHeadersOptions = new ForwardedHeadersOptions
{
    ForwardedHeaders = ForwardedHeaders.All
};
forwardedHeadersOptions.KnownNetworks.Clear();
forwardedHeadersOptions.KnownProxies.Clear();
app.UseForwardedHeaders(forwardedHeadersOptions);

app.UseCors("AllowFrontend");
app.UseMiddleware<GlobalExceptionMiddleware>();

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
app.MapControllers();
#endregion

app.Run();
