namespace CollegeManagement.API.Services.Implementations;

using Dapper;
using Microsoft.EntityFrameworkCore;
using CollegeManagement.API.Data;
using CollegeManagement.API.Dtos;
using CollegeManagement.API.Services.Interfaces;
using System.Collections.Generic;
using System.Threading.Tasks;

public class StudentTransportService : IStudentTransportService
{
    private readonly AppDbContext _context;

    public StudentTransportService(AppDbContext context)
    {
        _context = context;
    }

    public Task<TransportDropdownOptionsDto> GetTransportDropdownOptionsAsync()
    {
        return Task.FromResult(new TransportDropdownOptionsDto
        {
            AcademicYears = new List<string> { "2027-28", "2026-27", "2025-26" }
        });
    }

    public async Task<StudentTransportResponseDto> GetStudentTransportDetailsAsync(int? studentId, string? academicYear = "2027-28")
    {
        int targetStudentId = studentId ?? 6; // Default to the DB valid student for testing if none provided
        
        using var connection = _context.Database.GetDbConnection();
        var sql = @"
            SELECT 
                s.StudentId,
                s.StudentName,
                'Intermediate 2nd Year - MPC' as ClassName,
                s.AdmissionNo,
                'Non-Residential' as StudentType,
                0 as IsHosteller,
                1 as HasTransportAccess,
                'Student is assigned to campus transport facilities.' as Message,
                1 as RfidBoarded,
                'Boarded (07:22 AM via RFID)' as RfidBoardingStatus,
                '6 Mins' as EtaMinutes,
                r.RouteNumber,
                r.RouteName,
                p.StopName as PickupStop,
                TIME_FORMAT(p.PickupTime, '%h:%i %p') as MorningPickupTime,
                TIME_FORMAT(p.DropTime, '%h:%i %p') as EveningDropTime,
                v.VehicleNumber as BusNumber,
                v.VehicleRegistrationNo as RegistrationNumber,
                CONCAT(COALESCE(st.FirstName, ''), ' ', COALESCE(st.LastName, '')) as DriverName,
                st.Mobile as DriverPhone,
                a.AttendantName,
                a.MobileNumber as AttendantPhone,
                'Live GPS Active' as GpsStatus
            FROM Students s
            JOIN StudentTransportAssignments sta ON s.StudentId = sta.StudentId
            JOIN TransportRoutes r ON sta.RouteId = r.RouteId
            JOIN PickupPoints p ON sta.RouteStopId = p.PickupPointId
            JOIN TransportVehicleAssignments tva ON sta.VehicleAssignmentId = tva.AssignmentId
            JOIN TransportVehicles v ON tva.VehicleId = v.VehicleId
            LEFT JOIN Staff st ON tva.DriverId = st.Id
            LEFT JOIN TransportAttendants a ON tva.AttendantId = a.AttendantId
            WHERE s.StudentId = @targetStudentId
        ";
        
        var result = await connection.QueryFirstOrDefaultAsync<StudentTransportResponseDto>(sql, new { targetStudentId });
        
        if (result == null)
        {
            return new StudentTransportResponseDto
            {
                StudentId = targetStudentId,
                Message = "No active transport assignment found for this student.",
                HasTransportAccess = false
            };
        }
        
        return result;
    }
}
