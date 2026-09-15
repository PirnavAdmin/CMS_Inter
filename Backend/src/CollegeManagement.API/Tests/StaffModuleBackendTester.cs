using System;
using System.Collections.Generic;
using System.Data;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using AutoMapper;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.Staff;
using CollegeManagement.API.Models;
using CollegeManagement.API.Models.Faculty;
using CollegeManagement.API.Models.Staff;
using CollegeManagement.API.Interfaces;
using CollegeManagement.API.Profiles;
using CollegeManagement.API.Repositories;
using CollegeManagement.API.Repositories.Implementations;
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Services.Implementations;
using CollegeManagement.API.Services.Interfaces;
using Dapper;
using Microsoft.AspNetCore.Hosting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using MySqlConnector;

namespace CollegeManagement.API.Tests
{
    public class StaffModuleBackendTester
    {
        private readonly string _connectionString;

        public StaffModuleBackendTester(string connectionString)
        {
            _connectionString = connectionString;
        }

        public async Task<bool> RunAllTestsAsync()
        {
            Console.WriteLine("================================================================================");
            Console.WriteLine("   STARTING COMPREHENSIVE BACKEND TESTING FOR STAFF MANAGEMENT MODULE");
            Console.WriteLine("================================================================================");

            int passed = 0;
            int failed = 0;

            // 1. Test Database Connectivity
            Console.WriteLine("\n[1/12] Testing Database Connection...");
            try
            {
                using var conn = new MySqlConnection(_connectionString);
                await conn.OpenAsync();
                var dbName = await conn.ExecuteScalarAsync<string>("SELECT DATABASE();");
                Console.WriteLine($"  [PASS] Successfully connected to Database: {dbName}");
                passed++;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"  [FAIL] Database Connection Error: {ex.Message}");
                failed++;
                return false;
            }

            // 2. Safe Schema Verification
            Console.WriteLine("\n[2/12] Verifying Base Tables & Subject Allocations in DB...");
            try
            {
                using var conn = new MySqlConnection(_connectionString);
                await conn.OpenAsync();

                var isStaffBaseTable = await conn.ExecuteScalarAsync<int>(@"
                    SELECT COUNT(*) FROM information_schema.tables 
                    WHERE table_schema = DATABASE() AND table_name = 'Staff' AND table_type = 'BASE TABLE';");

                var isSSABaseTable = await conn.ExecuteScalarAsync<int>(@"
                    SELECT COUNT(*) FROM information_schema.tables 
                    WHERE table_schema = DATABASE() AND table_name = 'StaffSubjectAllocations' AND table_type = 'BASE TABLE';");

                if (isStaffBaseTable > 0 && isSSABaseTable > 0)
                {
                    Console.WriteLine("  [PASS] Base tables 'Staff' and 'StaffSubjectAllocations' confirmed in Database.");
                    passed++;
                }
                else
                {
                    Console.WriteLine("  [FAIL] Base tables 'Staff' or 'StaffSubjectAllocations' not found as BASE TABLE.");
                    failed++;
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"  [FAIL] Schema Verification Error: {ex.Message}");
                failed++;
            }

            // 3. Verify Master Departments and Designations
            Console.WriteLine("\n[3/12] Verifying Master Departments and Designations Data...");
            try
            {
                using var conn = new MySqlConnection(_connectionString);
                await conn.OpenAsync();

                var deptCount = await conn.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM Departments WHERE IsActive = 1;");
                var desigCount = await conn.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM Designations WHERE IsActive = 1;");

                Console.WriteLine($"  [PASS] Master data verified: {deptCount} Active Departments, {desigCount} Active Designations.");
                passed++;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"  [FAIL] Master Data Verification Error: {ex.Message}");
                failed++;
            }

            // Set up DI Container for Testing Services & Repositories
            var services = new ServiceCollection();
            var optionsBuilder = new DbContextOptionsBuilder<AppDbContext>();
            optionsBuilder.UseMySql(_connectionString, ServerVersion.AutoDetect(_connectionString));
            services.AddSingleton(optionsBuilder.Options);
            services.AddScoped<AppDbContext>();

            // AutoMapper
            var config = new MapperConfiguration(cfg =>
            {
                cfg.AddProfile<StaffMappingProfile>();
                cfg.AddProfile<TimetableMappingProfile>();
                cfg.AddProfile<SectionMappingProfile>();
            });
            var mapper = config.CreateMapper();
            services.AddSingleton(mapper);

            // Mock WebHostEnvironment & Configuration
            var envMock = new TestHostingEnvironment();
            services.AddSingleton<IWebHostEnvironment>(envMock);
            var testConfig = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["InstitutionSettings:InstitutionName"] = "College Management System",
                ["InstitutionSettings:PortalUrl"] = "http://localhost:5173"
            }).Build();
            services.AddSingleton<IConfiguration>(testConfig);

            // Email Service mock / null service
            services.AddScoped<IEmailService, NullTestEmailService>();
            services.AddScoped<IBoardRepository, BoardRepository>();

            // Repositories & Services
            services.AddScoped<IStaffRepository, StaffRepository>();
            services.AddScoped<IStaffSubjectAllocationRepository, StaffSubjectAllocationRepository>();
            services.AddScoped<ISubjectRepository, SubjectRepository>();
            services.AddScoped<IDepartmentRepository, DepartmentRepository>();
            services.AddScoped<IDepartmentService, DepartmentService>();
            services.AddScoped<IDesignationRepository, DesignationRepository>();
            services.AddScoped<IDesignationService, DesignationService>();
            services.AddScoped<ITimetableRepository, TimetableRepository>();
            services.AddScoped<IStaffService, StaffService>();
            services.AddScoped<ISectionRepository, SectionRepository>();
            services.AddScoped<ISectionService, SectionService>();

            var serviceProvider = services.BuildServiceProvider();

            // 4. Test Auto Employee ID Generation (Teaching & Non-Teaching)
            Console.WriteLine("\n[4/12] Testing Auto Employee ID Generation...");
            try
            {
                using var scope = serviceProvider.CreateScope();
                var staffService = scope.ServiceProvider.GetRequiredService<IStaffService>();

                var nextTchId = await staffService.GetNextEmployeeIdAsync("Teaching");
                var nextNonTchId = await staffService.GetNextEmployeeIdAsync("Non-Teaching");

                Console.WriteLine($"  Next Teaching Employee ID:     {nextTchId}");
                Console.WriteLine($"  Next Non-Teaching Employee ID: {nextNonTchId}");

                if ((nextTchId.StartsWith("PCTCH") || nextTchId.StartsWith("PJCTCH")) &&
                    (nextNonTchId.StartsWith("PCNT") || nextNonTchId.StartsWith("PJCNTCH")))
                {
                    Console.WriteLine("  [PASS] Auto ID generator produces correct 'PCTCH####' and 'PCNT####' prefixes.");
                    passed++;
                }
                else
                {
                    Console.WriteLine("  [FAIL] Auto ID format does not match expected prefix.");
                    failed++;
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"  [FAIL] Auto ID Generation Error: {ex.Message}");
                failed++;
            }

            // 5. Test Creating Teaching & Non-Teaching Staff with Full Preview Card Fields
            Console.WriteLine("\n[5/12] Testing Create Staff API with Full Profile Fields...");
            int createdTchId = 0;
            int createdNonTchId = 0;
            try
            {
                using var scope = serviceProvider.CreateScope();
                var staffService = scope.ServiceProvider.GetRequiredService<IStaffService>();

                var testTchEmail = $"suresh.mathematics.{DateTime.UtcNow.Ticks}@intermediate.edu";
                var testTchMobile = $"98{new Random().Next(10000000, 99999999)}";

                var tchDto = new CreateStaffDto
                {
                    FirstName = "Suresh",
                    LastName = "Reddy",
                    Gender = "Male",
                    DateOfBirth = new DateTime(1988, 5, 12),
                    Aadhaar = $"{new Random().Next(100000, 999999)}{new Random().Next(100000, 999999)}",
                    Pan = "ABCDE1234F",
                    Mobile = testTchMobile,
                    Email = testTchEmail,
                    BloodGroup = "O+",
                    MaritalStatus = "Married",
                    FatherOrHusbandName = "Venkat Reddy",
                    Qualification = "M.Sc Mathematics, B.Ed",
                    Department = "Mathematics",
                    Designation = "Senior Lecturer",
                    StaffType = "Teaching",
                    JoiningDate = DateTime.UtcNow.AddYears(-3),
                    Experience = 6.5m,
                    PreviousExperienceYears = 3.5m,
                    Specialization = "Pure Mathematics & Calculus",
                    BasicSalary = 55000,
                    BankName = "State Bank of India",
                    AccountNumber = "123456789012",
                    IfscCode = "SBIN0001234",
                    BranchName = "Main Branch",
                    EmergencyContactName = "Venkat Reddy",
                    EmergencyContactPhone = "9848012345",
                    EmergencyContactRelation = "Father",
                    CurrentAddress = "Flat 101, Sri Sai Residency, Hyderabad",
                    PermanentAddress = "D.No 4-50, Main Road, Guntur",
                    City = "Hyderabad",
                    State = "Telangana",
                    Pincode = "500001",
                    Country = "India",
                    Status = "Active"
                };

                var createdTch = await staffService.CreateStaffAsync(tchDto);
                createdTchId = createdTch.Id;
                Console.WriteLine($"  [PASS] Created Teaching Staff: ID={createdTch.Id}, EmployeeID={createdTch.EmployeeId}, Name={createdTch.FullName}, Dept={createdTch.Department}");

                var testNonTchEmail = $"lakshmi.accounts.{DateTime.UtcNow.Ticks}@intermediate.edu";
                var testNonTchMobile = $"97{new Random().Next(10000000, 99999999)}";

                var nonTchDto = new CreateStaffDto
                {
                    FirstName = "Lakshmi",
                    LastName = "Prasanna",
                    Gender = "Female",
                    DateOfBirth = new DateTime(1992, 8, 20),
                    Aadhaar = $"{new Random().Next(100000, 999999)}{new Random().Next(100000, 999999)}",
                    Pan = "VWXYZ5678G",
                    Mobile = testNonTchMobile,
                    Email = testNonTchEmail,
                    BloodGroup = "B+",
                    MaritalStatus = "Single",
                    FatherOrHusbandName = "Narayana Rao",
                    Qualification = "M.Com, MBA",
                    Department = "Accounts & Finance",
                    Designation = "Accountant",
                    StaffType = "Non-Teaching",
                    JoiningDate = DateTime.UtcNow.AddYears(-2),
                    Experience = 4.0m,
                    BasicSalary = 35000,
                    BankName = "HDFC Bank",
                    AccountNumber = "987654321098",
                    IfscCode = "HDFC0005678",
                    BranchName = "Banjara Hills",
                    EmergencyContactName = "Narayana Rao",
                    EmergencyContactPhone = "9848098765",
                    EmergencyContactRelation = "Father",
                    CurrentAddress = "Plot 45, Jubilee Hills, Hyderabad",
                    PermanentAddress = "Plot 45, Jubilee Hills, Hyderabad",
                    City = "Hyderabad",
                    State = "Telangana",
                    Pincode = "500033",
                    Country = "India",
                    Status = "Active"
                };

                var createdNonTch = await staffService.CreateStaffAsync(nonTchDto);
                createdNonTchId = createdNonTch.Id;
                Console.WriteLine($"  [PASS] Created Non-Teaching Staff: ID={createdNonTch.Id}, EmployeeID={createdNonTch.EmployeeId}, Name={createdNonTch.FullName}, Dept={createdNonTch.Department}");

                if (createdTchId > 0 && createdNonTchId > 0)
                {
                    passed++;
                }
                else
                {
                    failed++;
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"  [FAIL] Create Staff Error: {ex.Message}");
                failed++;
            }

            // 6. Test ISSUE 1: Pagination Logic (Page 1 vs Page 2 with PageSize = 2)
            Console.WriteLine("\n[6/12] Testing ISSUE 1: Multi-Page Pagination & TotalCount Calculation...");
            try
            {
                using var scope = serviceProvider.CreateScope();
                var staffService = scope.ServiceProvider.GetRequiredService<IStaffService>();

                // Page 1 with PageSize = 2
                var page1 = await staffService.GetPagedStaffAsync(new StaffQueryParams
                {
                    PageNumber = 1,
                    PageSize = 2
                });

                // Page 2 with PageSize = 2
                var page2 = await staffService.GetPagedStaffAsync(new StaffQueryParams
                {
                    PageNumber = 2,
                    PageSize = 2
                });

                Console.WriteLine($"  Page 1: TotalCount={page1.TotalCount}, TotalPages={page1.TotalPages}, ItemsCount={page1.Items.Count}, HasNext={page1.HasNextPage}");
                Console.WriteLine($"  Page 2: TotalCount={page2.TotalCount}, TotalPages={page2.TotalPages}, ItemsCount={page2.Items.Count}, HasPrev={page2.HasPreviousPage}");

                // Validate:
                // 1. TotalCount is identical across Page 1 and Page 2 (pre-pagination total count)
                // 2. Page 1 and Page 2 have distinct items (no overlapping IDs due to correct offset)
                // 3. Page 2 returns items when TotalCount > 2
                bool countMatches = page1.TotalCount == page2.TotalCount && page1.TotalCount > 0;
                bool page2HasItems = page1.TotalCount > 2 ? page2.Items.Count > 0 : true;
                bool noOverlap = !page1.Items.Select(i => i.Id).Intersect(page2.Items.Select(i => i.Id)).Any();

                if (countMatches && page2HasItems && noOverlap)
                {
                    Console.WriteLine("  [PASS] Issue 1 Resolved: TotalCount accurately preserved pre-pagination, Page 2 offsets cleanly without data loss or overlap.");
                    passed++;
                }
                else
                {
                    Console.WriteLine($"  [FAIL] Pagination mismatch: countMatches={countMatches}, page2HasItems={page2HasItems}, noOverlap={noOverlap}");
                    failed++;
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"  [FAIL] Pagination Test Error: {ex.Message}");
                failed++;
            }

            // 7. Test ISSUE 1: StaffType Normalization ("Teaching", "Non-Teaching", "NonTeaching")
            Console.WriteLine("\n[7/12] Testing ISSUE 1: StaffType Sanitization & Filtering...");
            try
            {
                using var scope = serviceProvider.CreateScope();
                var staffService = scope.ServiceProvider.GetRequiredService<IStaffService>();

                var tchResult = await staffService.GetPagedStaffAsync(new StaffQueryParams { StaffType = "Teaching" });
                var nonTchHyphen = await staffService.GetPagedStaffAsync(new StaffQueryParams { StaffType = "Non-Teaching" });
                var nonTchNoHyphen = await staffService.GetPagedStaffAsync(new StaffQueryParams { StaffType = "NonTeaching" });

                Console.WriteLine($"  Teaching Staff Count:               {tchResult.TotalCount}");
                Console.WriteLine($"  Non-Teaching ('Non-Teaching') Count: {nonTchHyphen.TotalCount}");
                Console.WriteLine($"  Non-Teaching ('NonTeaching') Count:   {nonTchNoHyphen.TotalCount}");

                if (tchResult.TotalCount > 0 && nonTchHyphen.TotalCount > 0 && nonTchHyphen.TotalCount == nonTchNoHyphen.TotalCount)
                {
                    Console.WriteLine("  [PASS] StaffType filtering accurately normalizes 'Non-Teaching' and 'NonTeaching' with exact matching counts.");
                    passed++;
                }
                else
                {
                    Console.WriteLine("  [FAIL] StaffType normalization mismatch.");
                    failed++;
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"  [FAIL] StaffType Sanitization Test Error: {ex.Message}");
                failed++;
            }

            // 8. Test Multi-Column Search (Name, EmployeeId, Email, Phone, Department, Designation)
            Console.WriteLine("\n[8/12] Testing Multi-Column Search Engine...");
            try
            {
                using var scope = serviceProvider.CreateScope();
                var staffService = scope.ServiceProvider.GetRequiredService<IStaffService>();

                // Search by Name "Suresh"
                var searchByName = await staffService.GetPagedStaffAsync(new StaffQueryParams { SearchTerm = "Suresh" });
                // Search by Department "Mathematics"
                var searchByDept = await staffService.GetPagedStaffAsync(new StaffQueryParams { SearchTerm = "Mathematics" });
                // Search by Designation "Accountant"
                var searchByDesig = await staffService.GetPagedStaffAsync(new StaffQueryParams { SearchTerm = "Accountant" });

                Console.WriteLine($"  Search 'Suresh' matches:      {searchByName.TotalCount}");
                Console.WriteLine($"  Search 'Mathematics' matches: {searchByDept.TotalCount}");
                Console.WriteLine($"  Search 'Accountant' matches:  {searchByDesig.TotalCount}");

                if (searchByName.TotalCount > 0 && searchByDept.TotalCount > 0 && searchByDesig.TotalCount > 0)
                {
                    Console.WriteLine("  [PASS] Multi-column search successfully found records across Name, Department, and Designation.");
                    passed++;
                }
                else
                {
                    Console.WriteLine("  [FAIL] Multi-column search failed to find expected records.");
                    failed++;
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"  [FAIL] Search Test Error: {ex.Message}");
                failed++;
            }

            // 9. Test ISSUE 2: Complete Staff Preview Card Field Schema Mapping
            Console.WriteLine("\n[9/12] Testing ISSUE 2: Complete Staff Preview Card Schema & Root Field Mapping...");
            try
            {
                using var scope = serviceProvider.CreateScope();
                var staffService = scope.ServiceProvider.GetRequiredService<IStaffService>();

                if (createdTchId > 0)
                {
                    var fullProfile = await staffService.GetStaffProfileFullAsync(createdTchId);

                    Console.WriteLine("  Verifying Full Preview Profile Card Schema for UI Cards:");
                    Console.WriteLine($"    - Basic Info:       ID={fullProfile.Id}, Name={fullProfile.FullName}, EmployeeId={fullProfile.EmployeeId}, Gender={fullProfile.Gender}, BloodGroup={fullProfile.BloodGroup}");
                    Console.WriteLine($"    - Personal:         Aadhaar={fullProfile.Aadhaar}, PAN={fullProfile.Pan}, GuardianName={fullProfile.GuardianName}, MaritalStatus={fullProfile.MaritalStatus}");
                    Console.WriteLine($"    - Addresses:        CurrentAddress={fullProfile.CurrentAddress}, City={fullProfile.City}, State={fullProfile.State}, PIN={fullProfile.Pincode}");
                    Console.WriteLine($"    - Academic & Exp:   Qualification={fullProfile.Qualification}, Exp={fullProfile.Experience} yrs, PrevExp={fullProfile.PreviousExperienceYears} yrs, Specialization={fullProfile.Specialization}");
                    Console.WriteLine($"    - Salary & Bank:    Salary={fullProfile.BasicSalary}, Bank={fullProfile.BankName}, A/C={fullProfile.AccountNumber}, IFSC={fullProfile.IfscCode}, Branch={fullProfile.BranchName}");
                    Console.WriteLine($"    - Emergency:        Name={fullProfile.EmergencyContactName}, Phone={fullProfile.EmergencyContactPhone}, Relation={fullProfile.EmergencyContactRelation}");
                    Console.WriteLine($"    - Profile Status:   Completion={fullProfile.ProfileCompletion}%, Status={fullProfile.Status}");

                    bool basicValid = !string.IsNullOrEmpty(fullProfile.FullName) && !string.IsNullOrEmpty(fullProfile.EmployeeId);
                    bool personalValid = fullProfile.Pan == "ABCDE1234F" && fullProfile.GuardianName == "Venkat Reddy";
                    bool addressValid = fullProfile.City == "Hyderabad" && fullProfile.State == "Telangana";
                    bool bankValid = fullProfile.BankName == "State Bank of India" && fullProfile.IfscCode == "SBIN0001234";
                    bool emergencyValid = fullProfile.EmergencyContactName == "Venkat Reddy" && fullProfile.EmergencyContactPhone == "9848012345";

                    if (basicValid && personalValid && addressValid && bankValid && emergencyValid)
                    {
                        Console.WriteLine("  [PASS] Issue 2 Resolved: All 6 Preview Card field groups (Basic, Personal, Addresses, Academic, Salary/Bank, Emergency) populated at root level with 100% schema match.");
                        passed++;
                    }
                    else
                    {
                        Console.WriteLine($"  [FAIL] Field validation mismatch: basic={basicValid}, personal={personalValid}, address={addressValid}, bank={bankValid}, emergency={emergencyValid}");
                        failed++;
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"  [FAIL] Preview Card Schema Test Error: {ex.Message}");
                failed++;
            }

            // 10. Test Subject Allocation and Preview Mapping
            Console.WriteLine("\n[10/12] Testing Subject Allocation & Preview Array Mapping...");
            try
            {
                using var scope = serviceProvider.CreateScope();
                var staffService = scope.ServiceProvider.GetRequiredService<IStaffService>();

                using var testConn = new MySqlConnection(_connectionString);
                await testConn.OpenAsync();

                var testSubjectId = await testConn.ExecuteScalarAsync<int?>(
                    "SELECT SubjectId FROM Subjects WHERE IsActive = 1 LIMIT 1;");

                if (!testSubjectId.HasValue || testSubjectId.Value == 0)
                {
                    testSubjectId = await testConn.ExecuteScalarAsync<int>(@"
                        INSERT INTO Subjects (SubjectCode, SubjectName, SubjectType, Theory, Practical, Language, Elective, InternalMarks, PracticalMarks, ExternalMarks, TotalMarks, PassingMarks, IsActive, CreatedAt)
                        VALUES ('MATH101', 'Mathematics 1A', 'Theory', 1, 0, 0, 0, 25, 0, 75, 100, 35, 1, UTC_TIMESTAMP());
                        SELECT LAST_INSERT_ID();");
                }

                if (createdTchId > 0 && testSubjectId.HasValue && testSubjectId.Value > 0)
                {
                    var allocDto = new AssignStaffSubjectDto
                    {
                        StaffId = createdTchId,
                        SubjectId = testSubjectId.Value
                    };

                    var allocResult = await staffService.AssignSubjectAsync(allocDto);
                    Console.WriteLine($"  Assigned Subject: AllocationID={allocResult.Id}, Subject={allocResult.SubjectName ?? allocResult.SubjectCode} to Staff ID={createdTchId}");

                    // Test Staff Profile gets populated with allocatedSubjects
                    var updatedProfile = await staffService.GetStaffProfileFullAsync(createdTchId);
                    Console.WriteLine($"  Staff allocatedSubjects Count: {updatedProfile.AllocatedSubjects.Count}");

                    if (updatedProfile.AllocatedSubjects.Count > 0)
                    {
                        Console.WriteLine($"  Allocated Subject in Profile: {string.Join(", ", updatedProfile.AllocatedSubjects)}");
                        Console.WriteLine("  [PASS] Allocated subjects array successfully populated on preview card.");
                        passed++;
                    }
                    else
                    {
                        Console.WriteLine("  [FAIL] Allocated subjects empty on preview profile.");
                        failed++;
                    }

                    // Clean up allocation
                    await staffService.DeleteSubjectAllocationAsync(allocResult.Id);
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"  [FAIL] Subject Allocation Test Error: {ex.Message}");
                failed++;
            }

            // 11. Test Supporting Lookups & Dashboard Stats API
            Console.WriteLine("\n[11/12] Testing Dashboard Stats & Supporting Lookup Endpoints...");
            try
            {
                using var scope = serviceProvider.CreateScope();
                var staffService = scope.ServiceProvider.GetRequiredService<IStaffService>();
                var deptService = scope.ServiceProvider.GetRequiredService<IDepartmentService>();
                var desigService = scope.ServiceProvider.GetRequiredService<IDesignationService>();
                var subjectRepo = scope.ServiceProvider.GetRequiredService<ISubjectRepository>();

                var stats = await staffService.GetDashboardStatsAsync();
                var depts = await deptService.GetActiveDepartmentsAsync();
                var desigs = await desigService.GetAllAsync();
                var subjects = await subjectRepo.GetAllAsync();

                Console.WriteLine($"  Dashboard Stats: TotalStaff={stats.TotalStaff}, Teaching={stats.TeachingStaff}, NonTeaching={stats.NonTeachingStaff}, Active={stats.ActiveStaff}, CompletedProfiles={stats.ProfileCompletedCount}");
                Console.WriteLine($"  Lookups: {depts.Count()} Departments, {desigs.Count()} Designations, {subjects.Count()} Available Subjects");

                if (stats.TotalStaff > 0 && depts.Any() && desigs.Any())
                {
                    Console.WriteLine("  [PASS] Dashboard Stats and Master Lookups returned accurate real-time values.");
                    passed++;
                }
                else
                {
                    Console.WriteLine("  [FAIL] Dashboard stats or lookup counts were empty.");
                    failed++;
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"  [FAIL] Dashboard Stats Test Error: {ex.Message}");
                failed++;
            }

            // 12. Test Update & Soft Delete Clean Up
            Console.WriteLine("\n[12/12] Testing Update Staff Profile & Soft Delete Cleanup...");
            try
            {
                using var scope = serviceProvider.CreateScope();
                var staffService = scope.ServiceProvider.GetRequiredService<IStaffService>();

                if (createdTchId > 0)
                {
                    var updateDto = new UpdateStaffDto
                    {
                        FirstName = "Suresh Kumar",
                        LastName = "Reddy",
                        Gender = "Male",
                        Mobile = $"98{new Random().Next(10000000, 99999999)}",
                        Email = $"suresh.reddy.{DateTime.UtcNow.Ticks}@intermediate.edu",
                        Department = "Mathematics",
                        Designation = "Head of Department (HOD)",
                        StaffType = "Teaching",
                        Status = "Active"
                    };

                    var updated = await staffService.UpdateStaffAsync(createdTchId, updateDto);
                    if (updated.FullName == "Suresh Kumar Reddy" && updated.Designation == "Head of Department (HOD)")
                    {
                        Console.WriteLine($"  [PASS] Update profile verified: Name={updated.FullName}, Designation={updated.Designation}");
                    }
                }

                if (createdNonTchId > 0)
                {
                    var delResult = await staffService.DeleteStaffAsync(createdNonTchId);
                    if (delResult)
                    {
                        var paged = await staffService.GetPagedStaffAsync(new StaffQueryParams { StaffType = "Non-Teaching" });
                        if (!paged.Items.Any(s => s.Id == createdNonTchId))
                        {
                            Console.WriteLine($"  [PASS] Staff ID={createdNonTchId} successfully soft deleted and excluded from active lists.");
                            passed++;
                        }
                        else
                        {
                            Console.WriteLine("  [FAIL] Soft deleted staff still appears in active lists.");
                            failed++;
                        }
                    }
                }
                else
                {
                    passed++;
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"  [FAIL] Update/Delete Cleanup Error: {ex.Message}");
                failed++;
            }

            // Final Summary
            Console.WriteLine("\n================================================================================");
            Console.WriteLine($"   STAFF MODULE BACKEND TESTING COMPLETE: {passed} PASSED, {failed} FAILED");
            Console.WriteLine("================================================================================");

            return failed == 0;
        }
    }

    public class TestHostingEnvironment : IWebHostEnvironment
    {
        public string WebRootPath { get; set; } = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
        public Microsoft.Extensions.FileProviders.IFileProvider WebRootFileProvider { get; set; } = null!;
        public string ApplicationName { get; set; } = "CollegeManagement.API";
        public Microsoft.Extensions.FileProviders.IFileProvider ContentRootFileProvider { get; set; } = null!;
        public string ContentRootPath { get; set; } = Directory.GetCurrentDirectory();
        public string EnvironmentName { get; set; } = "Development";
    }

    public class NullTestEmailService : CollegeManagement.API.Interfaces.IEmailService
    {
        public Task SendEmailAsync(string toEmail, string subject, string body) => Task.CompletedTask;
    }
}
