using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using CollegeManagement.API.Filters;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;

namespace CollegeManagement.API.Controllers.V1
{
    public class DepartmentMetricDto
    {
        public string Label { get; set; } = string.Empty;
        public string Val { get; set; } = string.Empty;
        public string Sub { get; set; } = string.Empty;
    }

    public class DepartmentRecordDto
    {
        public string Id { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string Party { get; set; } = string.Empty;
        public string Time { get; set; } = string.Empty;
        public string Status { get; set; } = "Completed";
    }

    public class DepartmentModuleDto
    {
        public string Code { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public List<DepartmentMetricDto> Metrics { get; set; } = new();
        public List<DepartmentRecordDto> Records { get; set; } = new();
    }

    public class CreateDepartmentRecordDto
    {
        public string Title { get; set; } = string.Empty;
        public string Party { get; set; } = string.Empty;
        public string Time { get; set; } = string.Empty;
        public string Status { get; set; } = "Completed";
    }

    [ApiController]
    [Route("api/v1/non-teaching/department-portal")]
    [EnableCors("AllowFrontend")]
    [Authorize]
    [BypassPermission]
    [Produces("application/json")]
    public class NonTeachingDepartmentController : ControllerBase
    {
        private static readonly ConcurrentDictionary<string, DepartmentModuleDto> _departments = new();
        private static bool _initialized = false;

        public NonTeachingDepartmentController()
        {
            if (!_initialized)
            {
                SeedDepartmentData();
                _initialized = true;
            }
        }

        private static void SeedDepartmentData()
        {
            // 1. Administration (Screen 14)
            _departments["ADMINISTRATION"] = new DepartmentModuleDto
            {
                Code = "ADMINISTRATION",
                Name = "Administration & Office Support",
                Description = "Department operational workflows, daily logs, register management, and resource coordination.",
                Metrics = new List<DepartmentMetricDto>
                {
                    new() { Label = "Today's Visitors", Val = "24", Sub = "Gate passes verified" },
                    new() { Label = "Inward Couriers", Val = "12", Sub = "Delivered & pending" },
                    new() { Label = "Stationery Requests", Val = "8", Sub = "Approved requests" },
                    new() { Label = "Files Dispatched", Val = "16", Sub = "Outward dispatches" },
                },
                Records = new List<DepartmentRecordDto>
                {
                    new() { Id = "ADM-2026-108", Title = "Visitor Gate Pass - Parent Inquiry for Intermediate MPC & BiPC Admissions", Party = "Mr. K. V. Rao (Parent) / Officer Rajesh", Time = "10:15 AM", Status = "Completed" },
                    new() { Id = "ADM-2026-107", Title = "Inward Speed Post - BIE Telangana Annual Affiliation Inspection Notice", Party = "Principal's Secretarial Desk", Time = "09:45 AM", Status = "Completed" },
                    new() { Id = "ADM-2026-106", Title = "Stationery Indent - Whiteboard Markers, A4 Reams & Examination Registers", Party = "Dept. of Chemistry / Lab Store", Time = "09:30 AM", Status = "In Progress" },
                    new() { Id = "ADM-2026-105", Title = "Student Transfer Certificate (TC) Application Verification & Clearance", Party = "Student Affairs / Desk 2", Time = "09:10 AM", Status = "Completed" },
                    new() { Id = "ADM-2026-104", Title = "Govt. Scholarship Notification & Merit List Dispatch to Social Welfare Dept", Party = "Scholarship Cell / Officer K. Naidu", Time = "08:45 AM", Status = "Completed" },
                    new() { Id = "ADM-2026-103", Title = "Staff Identity Card & Biometric RFID Punch Card Issuance", Party = "HR Section / New Joiner Desk", Time = "08:30 AM", Status = "Completed" },
                    new() { Id = "ADM-2026-102", Title = "College Examination Paper Printing & Confidential Store Deposit", Party = "Chief Supdt. / Confidential Room", Time = "08:00 AM", Status = "Completed" },
                }
            };

            // 2. Transport (Screen 13)
            _departments["TRANSPORT"] = new DepartmentModuleDto
            {
                Code = "TRANSPORT",
                Name = "Transport & Fleet Management",
                Description = "Bus routes, vehicle fleet status, driver duty schedules, and maintenance tracking.",
                Metrics = new List<DepartmentMetricDto>
                {
                    new() { Label = "Active Buses", Val = "18", Sub = "Operational fleet" },
                    new() { Label = "Morning Trips", Val = "18 / 18", Sub = "Trips completed" },
                    new() { Label = "Fuel Slips Verified", Val = "14", Sub = "Fuel vouchers" },
                    new() { Label = "Maintenance Due", Val = "2", Sub = "Vehicles in service" },
                },
                Records = new List<DepartmentRecordDto>
                {
                    new() { Id = "TRN-2026-051", Title = "Route #4 (Dilsukhnagar - LB Nagar - Campus) Morning Trip Completion", Party = "Driver M. Krishna (Bus TS09-UB-4412)", Time = "08:35 AM", Status = "Completed" },
                    new() { Id = "TRN-2026-050", Title = "Route #9 (Kukatpally - Miyapur) Driver Morning Attendance & Breathalyzer Check", Party = "Driver S. Naidu / Transport Supv.", Time = "07:10 AM", Status = "Completed" },
                    new() { Id = "TRN-2026-049", Title = "Diesel Fuel Refill Slip Verified - 65 Litres (Indian Oil Outlet)", Party = "Bus #07 / Staff Driver R. Prasad", Time = "09:05 AM", Status = "Completed" },
                    new() { Id = "TRN-2026-048", Title = "Scheduled 10,000 KM Brake Pad & Oil Filter Servicing", Party = "Bus #12 / Sri Ram Motors Workshop", Time = "10:00 AM", Status = "In Progress" },
                    new() { Id = "TRN-2026-047", Title = "Vehicle Pollution Under Control (PUC) & RTO Fitness Renewal", Party = "Transport Desk / RTO Inspector", Time = "09:45 AM", Status = "Completed" },
                    new() { Id = "TRN-2026-046", Title = "Student Route Pass Verification & Fleet GPS Tracking Health Check", Party = "Central Control Room", Time = "07:45 AM", Status = "Completed" },
                }
            };

            // 3. Security (Screen 12)
            _departments["SECURITY"] = new DepartmentModuleDto
            {
                Code = "SECURITY",
                Name = "Security & Campus Vigilance",
                Description = "Main gate monitoring, visitor access logs, parking regulation, and surveillance feeds.",
                Metrics = new List<DepartmentMetricDto>
                {
                    new() { Label = "Guards on Duty", Val = "14", Sub = "Active shift" },
                    new() { Label = "Vehicles Checked", Val = "156", Sub = "Entry gate logs" },
                    new() { Label = "Incident Reports", Val = "0", Sub = "Campus security" },
                    new() { Label = "CCTV Cameras Live", Val = "48 / 48", Sub = "Control room feeds" },
                },
                Records = new List<DepartmentRecordDto>
                {
                    new() { Id = "SEC-2026-214", Title = "Main Gate Inward Entry - Commercial Vendor Delivery (Cafeteria Supplies)", Party = "Head Guard Balraj (Gate 1)", Time = "10:10 AM", Status = "Completed" },
                    new() { Id = "SEC-2026-213", Title = "Student ID & Uniform Protocol Inspection at Academic Block Turnstiles", Party = "Security Officer Prakash", Time = "08:55 AM", Status = "Completed" },
                    new() { Id = "SEC-2026-212", Title = "Campus Two-Wheeler Parking Lot Audit & Pass Verification", Party = "Patrol Guard K. Chandran", Time = "09:20 AM", Status = "Completed" },
                    new() { Id = "SEC-2026-211", Title = "CCTV Central Room Routine Perimeter & Exam Corridor Health Check", Party = "Control Room Tech / Lead Guard", Time = "07:30 AM", Status = "Completed" },
                    new() { Id = "SEC-2026-210", Title = "Night Shift Turnover Log & Gate Register Sign-off", Party = "Shift Incharge B. Venkanna", Time = "06:00 AM", Status = "Completed" },
                    new() { Id = "SEC-2026-209", Title = "Emergency Exit Door & Fire Hose Reel Inspection Check", Party = "Safety Guard M. Srinivas", Time = "08:15 AM", Status = "Completed" },
                }
            };

            // 4. Maintenance (Screen 11)
            _departments["MAINTENANCE"] = new DepartmentModuleDto
            {
                Code = "MAINTENANCE",
                Name = "Maintenance & Facilities",
                Description = "Electrical systems, plumbing, classroom audio-visual support, and campus infrastructure.",
                Metrics = new List<DepartmentMetricDto>
                {
                    new() { Label = "Open Work Orders", Val = "3", Sub = "Active work orders" },
                    new() { Label = "Resolved Today", Val = "7", Sub = "Maintenance resolved" },
                    new() { Label = "Generator Fuel", Val = "88%", Sub = "Backup fuel" },
                    new() { Label = "Water Level", Val = "94%", Sub = "Storage status" },
                },
                Records = new List<DepartmentRecordDto>
                {
                    new() { Id = "MNT-2026-088", Title = "Physics Lab #2 - Overhead LED Tube Replacement & MCB Switch Check", Party = "Electrician J. Venkatesh", Time = "09:30 AM", Status = "Completed" },
                    new() { Id = "MNT-2026-087", Title = "Auditorium Projector & PA System Calibration for Guest Seminar", Party = "AV Tech S. Riaz / Facilities", Time = "10:00 AM", Status = "In Progress" },
                    new() { Id = "MNT-2026-086", Title = "Block-B 2nd Floor Water Cooler Filter Flushing & TDS Quality Test", Party = "Plumbing Team (K. Babu)", Time = "08:40 AM", Status = "Completed" },
                    new() { Id = "MNT-2026-085", Title = "Classroom 204 Air Conditioner Servicing & Gas Pressure Top-up", Party = "HVAC Tech / External Vendor", Time = "10:30 AM", Status = "In Progress" },
                    new() { Id = "MNT-2026-084", Title = "Administrative Block DG Set Diesel Level & Battery Voltage Audit", Party = "Power House Supv. / Mohan", Time = "07:15 AM", Status = "Completed" },
                    new() { Id = "MNT-2026-083", Title = "Campus Garden Sprinkler Pipeline Valve Joint Leakage Repair", Party = "Grounds & Estate Crew", Time = "08:00 AM", Status = "Completed" },
                }
            };
        }

        [HttpGet("data")]
        [HttpGet]
        [AllowAnonymous]
        public IActionResult GetDepartmentData([FromQuery] string? department)
        {
            var code = (department ?? "ADMINISTRATION").Trim().ToUpperInvariant();
            if (!_departments.TryGetValue(code, out var mod))
            {
                mod = _departments["ADMINISTRATION"];
            }

            return Ok(new
            {
                success = true,
                message = "Department portal data retrieved successfully.",
                data = mod
            });
        }

        [HttpPost("record")]
        public IActionResult AddRecord([FromQuery] string? department, [FromBody] CreateDepartmentRecordDto record)
        {
            var code = (department ?? "ADMINISTRATION").Trim().ToUpperInvariant();
            if (!_departments.TryGetValue(code, out var mod))
            {
                code = "ADMINISTRATION";
                mod = _departments[code];
            }

            var nextId = $"{code.Substring(0, 3)}-2026-{mod.Records.Count + 101}";
            var newEntry = new DepartmentRecordDto
            {
                Id = nextId,
                Title = record.Title.Trim(),
                Party = string.IsNullOrWhiteSpace(record.Party) ? "Staff Officer" : record.Party.Trim(),
                Time = string.IsNullOrWhiteSpace(record.Time) ? DateTime.UtcNow.ToString("hh:mm tt") : record.Time.Trim(),
                Status = string.IsNullOrWhiteSpace(record.Status) ? "Completed" : record.Status.Trim(),
            };

            mod.Records.Insert(0, newEntry);

            return Ok(new
            {
                success = true,
                message = "Operational register record logged successfully.",
                data = newEntry
            });
        }
    }
}
