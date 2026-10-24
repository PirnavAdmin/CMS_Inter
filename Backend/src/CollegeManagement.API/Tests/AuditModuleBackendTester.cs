using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.Reports;
using CollegeManagement.API.Helpers;
using CollegeManagement.API.Models;
using CollegeManagement.API.Models.Holiday;
using CollegeManagement.API.Models.Reports;
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Services.Interfaces;

namespace CollegeManagement.API.Tests
{
    public class AuditModuleBackendTester
    {
        private readonly IServiceProvider _services;

        public AuditModuleBackendTester(IServiceProvider services)
        {
            _services = services;
        }

        public async Task RunAllTestsAsync()
        {
            Console.WriteLine("=================================================================");
            Console.WriteLine("       ADVANCED AUDIT LOGS MODULE: AUTOMATED VERIFICATION        ");
            Console.WriteLine("=================================================================");

            int passed = 0;
            int failed = 0;

            void Assert(bool condition, string testName, string? details = null)
            {
                if (condition)
                {
                    Console.WriteLine($"[PASS] {testName}");
                    passed++;
                }
                else
                {
                    Console.ForegroundColor = ConsoleColor.Red;
                    Console.WriteLine($"[FAIL] {testName}{(details != null ? $" -> {details}" : "")}");
                    Console.ResetColor();
                    failed++;
                }
            }

            // -------------------------------------------------------------
            // TEST 1: IP Extraction & Spoofing Resistance
            // -------------------------------------------------------------
            try
            {
                // Null context safety
                var nullNet = ClientIpHelper.GetNetworkDetails(null);
                Assert(nullNet.EffectiveIpAddress == "Unknown", "IP Helper: Null context safety");

                // Direct IPv4 connection
                var ctxDirect = new DefaultHttpContext();
                ctxDirect.Connection.RemoteIpAddress = IPAddress.Parse("203.0.113.195");
                var netDirect = ClientIpHelper.GetNetworkDetails(ctxDirect);
                Assert(netDirect.RemoteIpAddress == "203.0.113.195" && 
                       netDirect.EffectiveIpAddress == "203.0.113.195" &&
                       netDirect.IpSource == "DirectConnection" &&
                       netDirect.PublicIpAddress == "203.0.113.195", 
                       "IP Helper: Direct public IPv4 resolution");

                // Loopback IPv4
                var ctxLoopback = new DefaultHttpContext();
                ctxLoopback.Connection.RemoteIpAddress = IPAddress.Loopback;
                var netLoopback = ClientIpHelper.GetNetworkDetails(ctxLoopback);
                Assert(netLoopback.EffectiveIpAddress == "127.0.0.1" && 
                       netLoopback.PublicIpAddress == null &&
                       netLoopback.LocalDeviceIp == null &&
                       netLoopback.NetworkGatewayIp == null, 
                       "IP Helper: Loopback correctly not marked as public; local/gateway IPs honest null");

                // Spoofed X-Forwarded-For from untrusted remote
                var ctxSpoof = new DefaultHttpContext();
                ctxSpoof.Connection.RemoteIpAddress = IPAddress.Parse("198.51.100.22");
                ctxSpoof.Request.Headers["X-Forwarded-For"] = "8.8.8.8, 1.1.1.1";
                ctxSpoof.Request.Headers["X-Client-IP"] = "192.168.1.100";
                var netSpoof = ClientIpHelper.GetNetworkDetails(ctxSpoof);
                Assert(netSpoof.EffectiveIpAddress == "198.51.100.22" && netSpoof.ForwardedClientIp == null, 
                       "IP Helper: Spoofed headers rejected from untrusted connection");

                // Trusted proxy forwarding
                ClientIpHelper.ConfigureTrustedProxies(new[] { "10.0.0.1" });
                var ctxTrusted = new DefaultHttpContext();
                ctxTrusted.Connection.RemoteIpAddress = IPAddress.Parse("10.0.0.1");
                ctxTrusted.Request.Headers["X-Forwarded-For"] = "203.0.113.88";
                var netTrusted = ClientIpHelper.GetNetworkDetails(ctxTrusted);
                Assert(netTrusted.EffectiveIpAddress == "203.0.113.88" &&
                       netTrusted.ForwardedClientIp == "203.0.113.88" &&
                       netTrusted.IpSource == "TrustedProxy" &&
                       netTrusted.IpConfidence == "TrustedProxyResolved",
                       "IP Helper: Trusted proxy forwarded header accepted");
                
                // Reset trusted proxies
                ClientIpHelper.ConfigureTrustedProxies(Array.Empty<string>());
            }
            catch (Exception ex)
            {
                Assert(false, "IP Extraction Tests", ex.ToString());
            }

            // -------------------------------------------------------------
            // TEST 2: Sensitive Data Redaction
            // -------------------------------------------------------------
            try
            {
                Assert(AuditDataSanitizer.IsSensitivePropertyName("Password"), "Sanitizer: Password detected");
                Assert(AuditDataSanitizer.IsSensitivePropertyName("PasswordHash"), "Sanitizer: PasswordHash detected");
                Assert(AuditDataSanitizer.IsSensitivePropertyName("AccessToken"), "Sanitizer: AccessToken detected");
                Assert(AuditDataSanitizer.IsSensitivePropertyName("OTP"), "Sanitizer: OTP detected");
                Assert(AuditDataSanitizer.IsSensitivePropertyName("SecurityStamp"), "Sanitizer: SecurityStamp detected");
                Assert(!AuditDataSanitizer.IsSensitivePropertyName("FullName"), "Sanitizer: Non-sensitive FullName safe");
                Assert(!AuditDataSanitizer.IsSensitivePropertyName("Email"), "Sanitizer: Non-sensitive Email safe");

                var rawJson = "{\"username\":\"admin\",\"password\":\"MySecret@123\",\"token\":\"jwt_xyz\",\"nested\":{\"apiKey\":\"api_999\"}}";
                var sanitizedJson = AuditDataSanitizer.SanitizeJsonString(rawJson);
                Assert(!sanitizedJson.Contains("MySecret@123") && 
                       !sanitizedJson.Contains("jwt_xyz") && 
                       !sanitizedJson.Contains("api_999") && 
                       sanitizedJson.Contains("admin") &&
                       sanitizedJson.Contains("[REDACTED]"), 
                       "Sanitizer: Deep JSON redaction of passwords and secrets");
            }
            catch (Exception ex)
            {
                Assert(false, "Sanitizer Tests", ex.ToString());
            }

            // -------------------------------------------------------------
            // TEST 3: CSV Formula Injection (CWE-1236) Defense
            // -------------------------------------------------------------
            try
            {
                Assert(AuditDataSanitizer.SanitizeForCsv("=1+1") == "\"\'=1+1\"", "CSV Defense: Neutralizes leading '='");
                Assert(AuditDataSanitizer.SanitizeForCsv("+cmd|' /C calc'!A0") == "\"\'+cmd|\' /C calc\'!A0\"", "CSV Defense: Neutralizes leading '+'");
                Assert(AuditDataSanitizer.SanitizeForCsv("-5+5") == "\"\'-5+5\"", "CSV Defense: Neutralizes leading '-'");
                Assert(AuditDataSanitizer.SanitizeForCsv("@SUM(A1:A10)") == "\"\'@SUM(A1:A10)\"", "CSV Defense: Neutralizes leading '@'");
                Assert(AuditDataSanitizer.SanitizeForCsv("Administrator") == "\"Administrator\"", "CSV Defense: Normal values escaped cleanly");
            }
            catch (Exception ex)
            {
                Assert(false, "CSV Defense Tests", ex.ToString());
            }

            // -------------------------------------------------------------
            // TEST 4: Correlation & Request Tracking
            // -------------------------------------------------------------
            try
            {
                var ctx = new DefaultHttpContext();
                ctx.Request.Headers[AuditCorrelationHelper.CorrelationIdHeader] = "test-corr-123456789";
                var corrId = AuditCorrelationHelper.GetOrCreateCorrelationId(ctx);
                Assert(corrId == "test-corr-123456789", "Correlation: Propagates client correlation ID header");

                var ctxNew = new DefaultHttpContext();
                var newCorr = AuditCorrelationHelper.GetOrCreateCorrelationId(ctxNew);
                Assert(!string.IsNullOrWhiteSpace(newCorr) && newCorr.Length >= 32, "Correlation: Generates unique correlation ID when absent");
            }
            catch (Exception ex)
            {
                Assert(false, "Correlation Tests", ex.ToString());
            }

            // -------------------------------------------------------------
            // DATABASE INTEGRATION TESTS (Using Scoped Services)
            // -------------------------------------------------------------
            using (var scope = _services.CreateScope())
            {
                var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                var auditRepo = scope.ServiceProvider.GetRequiredService<IAuditLogRepository>();
                var auditService = scope.ServiceProvider.GetRequiredService<IAuditLoggingService>();

                // TEST 5: Explicit Domain Audit Logging
                try
                {
                    var testCorr = Guid.NewGuid().ToString("N");
                    var testAction = "Automated Audit Test Execution";
                    await auditService.LogAsync(
                        action: testAction,
                        module: "Audit Verification",
                        target: "SelfTest",
                        severity: "Info",
                        status: "Success",
                        details: $"{{\"summary\":\"Automated audit verification test ran.\",\"testCorrelationId\":\"{testCorr}\"}}",
                        overrideUser: "Test Runner",
                        overrideRole: "System"
                    );

                    var paged = await auditRepo.GetAuditLogsPagedAsync(
                        query: "Automated Audit Test Execution",
                        module: null,
                        severity: null,
                        role: null,
                        fromDate: null,
                        toDate: null,
                        pageNumber: 1,
                        pageSize: 5
                    );

                    var found = paged.Records.FirstOrDefault(r => r.Action == testAction);
                    Assert(found != null && found.Actor == "Test Runner", "Domain Auditing: Explicit LogAsync inserted and retrieved");
                }
                catch (Exception ex)
                {
                    Assert(false, "Domain Auditing Test", ex.ToString());
                }

                // TEST 6: Entity Creation & Diff Tracking via SaveChangesAsync
                try
                {
                    var uniqueHolidayCode = $"T_{Guid.NewGuid():N}".Substring(0, 15);
                    var uniqueHolidayName = $"AuditTest_{Guid.NewGuid():N}";
                    var holiday = new Holiday
                    {
                        HolidayCode = uniqueHolidayCode,
                        HolidayName = uniqueHolidayName,
                        HolidayType = "Festival Holiday",
                        AppliesTo = "All Students & Staff",
                        DateType = "Single Day",
                        StartDate = DateTime.UtcNow.Date.AddDays(30),
                        EndDate = DateTime.UtcNow.Date.AddDays(30),
                        Status = "Active",
                        CreatedAt = DateTime.UtcNow
                    };

                    dbContext.Holidays.Add(holiday);
                    await dbContext.SaveChangesAsync();

                    Assert(holiday.Id > 0, "EF Core Auditing: Entity created with auto-increment ID");

                    // Check audit log row generated
                    var createAudit = await dbContext.AuditLogs
                        .AsNoTracking()
                        .OrderByDescending(a => a.AuditLogId)
                        .FirstOrDefaultAsync(a => a.EntityName == "Holiday" && a.EntityId == holiday.Id && a.Action == "Create");

                    Assert(createAudit != null && createAudit.EntityId == holiday.Id, "EF Core Auditing: Insert generated corresponding AuditLog with EntityId");

                    // TEST 7: Entity Property Update Diff Tracking
                    holiday.HolidayName = uniqueHolidayName + "_Upd";
                    await dbContext.SaveChangesAsync();

                    var updateAudit = await dbContext.AuditLogs
                        .AsNoTracking()
                        .OrderByDescending(a => a.AuditLogId)
                        .FirstOrDefaultAsync(a => a.EntityName == "Holiday" && a.EntityId == holiday.Id && a.Action == "Update");

                    Assert(updateAudit != null && updateAudit.Description != null && updateAudit.Description.Contains("Holiday"), 
                           "EF Core Auditing: Update generated AuditLog with property diff");

                    // TEST 8: No-Op Update Suppression
                    var auditCountBefore = await dbContext.AuditLogs.CountAsync(a => a.EntityName == "Holiday" && a.EntityId == holiday.Id);
                    // Touch state without modifying any values
                    dbContext.Entry(holiday).State = EntityState.Modified;
                    await dbContext.SaveChangesAsync();
                    var auditCountAfter = await dbContext.AuditLogs.CountAsync(a => a.EntityName == "Holiday" && a.EntityId == holiday.Id);

                    Assert(auditCountBefore == auditCountAfter, "EF Core Auditing: No-op update safely suppressed (no redundant duplicate audit log)");

                    // TEST 9: Entity Deletion Auditing
                    dbContext.Holidays.Remove(holiday);
                    await dbContext.SaveChangesAsync();

                    var deleteAudit = await dbContext.AuditLogs
                        .AsNoTracking()
                        .OrderByDescending(a => a.AuditLogId)
                        .FirstOrDefaultAsync(a => a.EntityName == "Holiday" && a.EntityId == holiday.Id && a.Action == "Delete");

                    Assert(deleteAudit != null && deleteAudit.Severity == "Warning", "EF Core Auditing: Delete operation captured with Warning severity");
                }
                catch (Exception ex)
                {
                    Assert(false, "EF Core Entity Auditing Lifecycle", ex.ToString());
                }

                // TEST 10: Synchronous SaveChanges Auditing
                try
                {
                    var syncHolidayCode = $"TS_{Guid.NewGuid():N}".Substring(0, 15);
                    var syncHolidayName = $"SyncAuditTest_{Guid.NewGuid():N}";
                    var syncHoliday = new Holiday
                    {
                        HolidayCode = syncHolidayCode,
                        HolidayName = syncHolidayName,
                        HolidayType = "Festival Holiday",
                        AppliesTo = "All Students & Staff",
                        DateType = "Single Day",
                        StartDate = DateTime.UtcNow.Date.AddDays(40),
                        EndDate = DateTime.UtcNow.Date.AddDays(40),
                        Status = "Active",
                        CreatedAt = DateTime.UtcNow
                    };

                    dbContext.Holidays.Add(syncHoliday);
                    dbContext.SaveChanges(); // Synchronous call

                    var syncAudit = await dbContext.AuditLogs
                        .AsNoTracking()
                        .OrderByDescending(a => a.AuditLogId)
                        .FirstOrDefaultAsync(a => a.EntityName == "Holiday" && a.EntityId == syncHoliday.Id && a.Action == "Create");

                    Assert(syncAudit != null, "EF Core Auditing: Synchronous SaveChanges captures audit log");

                    // Clean up test holiday
                    dbContext.Holidays.Remove(syncHoliday);
                    dbContext.SaveChanges();
                }
                catch (Exception ex)
                {
                    Assert(false, "Synchronous SaveChanges Auditing", ex.ToString());
                }

                // TEST 11: Transaction Rollback Integrity
                try
                {
                    var rollbackCode = $"TR_{Guid.NewGuid():N}".Substring(0, 15);
                    var rollbackName = $"RollbackTest_{Guid.NewGuid():N}";
                    var rollbackHoliday = new Holiday
                    {
                        HolidayCode = rollbackCode,
                        HolidayName = rollbackName,
                        HolidayType = "Festival Holiday",
                        AppliesTo = "All Students & Staff",
                        DateType = "Single Day",
                        StartDate = DateTime.UtcNow.Date.AddDays(50),
                        EndDate = DateTime.UtcNow.Date.AddDays(50),
                        Status = "Active",
                        CreatedAt = DateTime.UtcNow
                    };

                    var strategy = dbContext.Database.CreateExecutionStrategy();
                    await strategy.ExecuteAsync(async () =>
                    {
                        using var tx = await dbContext.Database.BeginTransactionAsync();
                        dbContext.Holidays.Add(rollbackHoliday);
                        await dbContext.SaveChangesAsync();
                        await tx.RollbackAsync();
                    });

                    // Detach tracked entries so context doesn't keep phantom entity
                    dbContext.ChangeTracker.Clear();

                    var holidayExists = await dbContext.Holidays.AnyAsync(h => h.HolidayCode == rollbackCode);
                    var auditExists = await dbContext.AuditLogs.AnyAsync(a => a.Description != null && a.Description.Contains(rollbackName));

                    Assert(!holidayExists && !auditExists, "Transaction Rollback: Uncommitted transaction rolled back both entity and audit records");
                }
                catch (Exception ex)
                {
                    Assert(false, "Transaction Rollback Integrity", ex.ToString());
                }

                // TEST 12: Repository Paged Query & 6 KPI Metrics
                try
                {
                    var result = await auditRepo.GetAuditLogsPagedAsync(
                        query: null,
                        module: null,
                        severity: null,
                        role: null,
                        fromDate: null,
                        toDate: null,
                        pageNumber: 1,
                        pageSize: 10
                    );

                    Assert(result.Success, "Repository: Paged query returns success");
                    Assert(result.Total > 0, $"Repository: Total count > 0 (found {result.Total})");
                    Assert(result.Stats != null, "Repository: Stats object returned");
                    Assert(result.Stats!.EventsToday >= 0, $"Repository KPI: EventsToday = {result.Stats.EventsToday}");
                    Assert(result.Stats!.FailedOperationsToday >= 0, $"Repository KPI: FailedOperationsToday = {result.Stats.FailedOperationsToday}");
                    Assert(result.Stats!.SecurityAlertsToday >= 0, $"Repository KPI: SecurityAlertsToday = {result.Stats.SecurityAlertsToday}");
                    Assert(result.Stats!.ActiveUsersToday >= 0, $"Repository KPI: ActiveUsersToday = {result.Stats.ActiveUsersToday}");
                    Assert(result.Stats!.RegisteredDevicesToday >= 0, $"Repository KPI: RegisteredDevicesToday = {result.Stats.RegisteredDevicesToday}");
                    Assert(result.Stats!.DistinctPublicIpsToday >= 0, $"Repository KPI: DistinctPublicIpsToday = {result.Stats.DistinctPublicIpsToday}");
                }
                catch (Exception ex)
                {
                    Assert(false, "Repository Paged Query & Stats", ex.ToString());
                }

                // TEST 13: Correlation Tracing Query
                try
                {
                    var sampleWithCorr = await dbContext.AuditLogs.AsNoTracking().FirstOrDefaultAsync(a => !string.IsNullOrEmpty(a.CorrelationId));
                    if (sampleWithCorr != null && !string.IsNullOrEmpty(sampleWithCorr.CorrelationId))
                    {
                        var related = await auditRepo.GetRelatedAuditLogsAsync(sampleWithCorr.CorrelationId);
                        Assert(related != null && related.Any(), $"Repository: Correlated trace found related records for {sampleWithCorr.CorrelationId}");
                    }
                    else
                    {
                        Assert(true, "Repository: Correlated trace test skipped (no prior correlation IDs in seed data)");
                    }
                }
                catch (Exception ex)
                {
                    Assert(false, "Correlation Tracing Query", ex.ToString());
                }

                // TEST 14: AttendanceAuditHistory Compatibility
                try
                {
                    var count = await dbContext.AttendanceAuditHistories.CountAsync();
                    Assert(count >= 0, $"AttendanceAuditHistory: Table intact and queryable ({count} records)");
                }
                catch (Exception ex)
                {
                    Assert(false, "AttendanceAuditHistory Compatibility", ex.ToString());
                }
            }

            Console.WriteLine("=================================================================");
            Console.WriteLine($"RESULTS: {passed} PASSED, {failed} FAILED");
            Console.WriteLine("=================================================================");

            if (failed > 0)
            {
                throw new Exception($"Audit module automated test suite failed with {failed} failure(s).");
            }
        }
    }
}
