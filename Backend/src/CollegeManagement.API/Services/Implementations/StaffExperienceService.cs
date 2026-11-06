using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.Staff;
using CollegeManagement.API.Exceptions;
using CollegeManagement.API.Models.Staff;
using CollegeManagement.API.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace CollegeManagement.API.Services.Implementations
{
    public class StaffExperienceService : IStaffExperienceService
    {
        private readonly AppDbContext _db;

        public StaffExperienceService(AppDbContext db)
        {
            _db = db;
        }

        public async Task<StaffExperienceSummaryDto> CalculateExperienceAsync(int staffId)
        {
            var staff = await _db.Staffs
                .Include(s => s.StaffCampusAssignments)
                    .ThenInclude(a => a.Campus)
                .FirstOrDefaultAsync(s => s.Id == staffId && (!s.IsDeleted));

            if (staff == null)
            {
                throw new NotFoundException($"Staff with ID {staffId} not found.");
            }

            var summary = new StaffExperienceSummaryDto
            {
                StaffId = staff.Id,
                EmployeeId = staff.EmployeeId,
                StaffName = $"{staff.FirstName} {staff.LastName}".Trim()
            };

            // 1. Calculate Prior External Experience from ExperienceJson
            int priorDays = 0;
            if (!string.IsNullOrWhiteSpace(staff.ExperienceJson))
            {
                try
                {
                    var priorItems = JsonSerializer.Deserialize<List<StaffExperienceItem>>(staff.ExperienceJson, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                    if (priorItems != null && priorItems.Any())
                    {
                        foreach (var item in priorItems)
                        {
                            if (DateTime.TryParse(item.FromDate, out var fDate) && DateTime.TryParse(item.ToDate, out var tDate) && tDate >= fDate)
                            {
                                priorDays += (int)(tDate - fDate).TotalDays;
                            }
                            else if (item.TotalYears > 0)
                            {
                                priorDays += (int)(item.TotalYears * 365.25m);
                            }
                        }
                    }
                }
                catch
                {
                    // Fallback to static column if JSON parsing fails
                    if (staff.Experience > 0)
                    {
                        priorDays = (int)(staff.Experience * 365.25m);
                    }
                }
            }
            summary.PriorExternalDays = priorDays;
            summary.PriorExternalYearsFormatted = FormatDaysToYearsMonths(priorDays);

            // 2. Calculate Institutional Experience using Interval Sweep-Line algorithm
            var assignments = staff.StaffCampusAssignments
                .Where(a => a.IsActive || a.Status == "Active" || a.Status == "TransferredOut" || a.Status == "Relieved")
                .ToList();

            var rawIntervals = new List<(DateTime Start, DateTime End)>();
            var today = DateTime.UtcNow.Date;

            if (assignments.Any())
            {
                foreach (var a in assignments)
                {
                    var start = a.StartDate > DateTime.MinValue ? a.StartDate.Date : (staff.JoiningDate > DateTime.MinValue ? staff.JoiningDate.Date : today);
                    var end = (a.EndDate.HasValue && a.EndDate.Value > DateTime.MinValue) ? a.EndDate.Value.Date : today;
                    if (end >= start)
                    {
                        rawIntervals.Add((start, end));
                    }

                    int tenureDays = Math.Max(0, (int)(end - start).TotalDays);
                    summary.CampusTenures.Add(new StaffCampusTenureDto
                    {
                        CampusId = a.CampusId,
                        CampusName = a.Campus?.CampusName ?? $"Campus #{a.CampusId}",
                        AssignmentType = a.AssignmentType ?? "Primary",
                        StartDate = start,
                        EndDate = a.EndDate,
                        TenureDays = tenureDays,
                        TenureFormatted = FormatDaysToYearsMonths(tenureDays),
                        IsActive = a.IsActive,
                        Status = a.Status
                    });
                }
            }
            else
            {
                // Fallback to Staff.JoiningDate
                var start = staff.JoiningDate > DateTime.MinValue ? staff.JoiningDate.Date : today;
                if (today >= start)
                {
                    rawIntervals.Add((start, today));
                    int tenureDays = (int)(today - start).TotalDays;
                    summary.CampusTenures.Add(new StaffCampusTenureDto
                    {
                        CampusId = staff.CampusId ?? 1,
                        CampusName = staff.Campus?.CampusName ?? "Primary Campus",
                        AssignmentType = "Primary",
                        StartDate = start,
                        EndDate = null,
                        TenureDays = tenureDays,
                        TenureFormatted = FormatDaysToYearsMonths(tenureDays),
                        IsActive = true,
                        Status = "Active"
                    });
                }
            }

            // Union overlapping intervals
            var mergedIntervals = new List<(DateTime Start, DateTime End)>();
            foreach (var interval in rawIntervals.OrderBy(x => x.Start))
            {
                if (!mergedIntervals.Any())
                {
                    mergedIntervals.Add(interval);
                }
                else
                {
                    var last = mergedIntervals.Last();
                    if (interval.Start <= last.End)
                    {
                        var newEnd = interval.End > last.End ? interval.End : last.End;
                        mergedIntervals[mergedIntervals.Count - 1] = (last.Start, newEnd);
                    }
                    else
                    {
                        mergedIntervals.Add(interval);
                    }
                }
            }

            int institutionalDays = mergedIntervals.Sum(i => Math.Max(0, (int)(i.End - i.Start).TotalDays));
            summary.InstitutionalDays = institutionalDays;
            summary.InstitutionalYearsFormatted = FormatDaysToYearsMonths(institutionalDays);

            // 3. Current Campus Experience
            var primaryActive = assignments.FirstOrDefault(a => a.IsActive && (a.IsPrimary || a.Status == "Active"));
            int currentCampusDays = 0;
            if (primaryActive != null)
            {
                var pStart = primaryActive.StartDate > DateTime.MinValue ? primaryActive.StartDate.Date : (staff.JoiningDate > DateTime.MinValue ? staff.JoiningDate.Date : today);
                currentCampusDays = Math.Max(0, (int)(today - pStart).TotalDays);
            }
            else if (staff.JoiningDate > DateTime.MinValue)
            {
                currentCampusDays = Math.Max(0, (int)(today - staff.JoiningDate.Date).TotalDays);
            }
            summary.CurrentCampusDays = currentCampusDays;
            summary.CurrentCampusYearsFormatted = FormatDaysToYearsMonths(currentCampusDays);

            // 4. Combined Total
            summary.TotalDays = priorDays + institutionalDays;
            summary.TotalYearsDecimal = Math.Round((decimal)summary.TotalDays / 365.25m, 1);
            summary.TotalYearsFormatted = FormatDaysToYearsMonths(summary.TotalDays);

            return summary;
        }

        public async Task UpdateStaffExperienceColumnAsync(int staffId)
        {
            var summary = await CalculateExperienceAsync(staffId);
            var staff = await _db.Staffs.FirstOrDefaultAsync(s => s.Id == staffId);
            if (staff != null)
            {
                staff.Experience = summary.TotalYearsDecimal;
                await _db.SaveChangesAsync();
            }
        }

        private static string FormatDaysToYearsMonths(int totalDays)
        {
            if (totalDays <= 0) return "0 Yrs";
            int years = (int)Math.Floor(totalDays / 365.25);
            int months = (int)Math.Floor((totalDays % 365.25) / 30.44);

            if (years > 0 && months > 0)
                return $"{years} Yrs {months} Mos";
            if (years > 0)
                return $"{years} Yrs";
            return $"{months} Mos";
        }
    }
}
