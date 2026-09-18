using CollegeManagement.API.Data;
using CollegeManagement.API.Dtos.Transport.Dashboard;
using CollegeManagement.API.Repositories.Interfaces;
using Dapper;
using Microsoft.EntityFrameworkCore;
using System.Data;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace CollegeManagement.API.Repositories.Implementations.Transport
{
    public class TransportDashboardRepository : ITransportDashboardRepository
    {
        private readonly AppDbContext _context;

        public TransportDashboardRepository(AppDbContext context)
        {
            _context = context;
        }

        private IDbConnection Connection() => _context.Database.GetDbConnection();

        public async Task<TransportDashboardResponseDto> GetDashboardAsync()
        {
            using var c = Connection();
            var today = DateTime.UtcNow.Date;
            
            var sql = @"
                SELECT COUNT(*) FROM TransportVehicles WHERE IsDeleted = 0;
                SELECT COUNT(*) FROM TransportVehicles WHERE IsDeleted = 0 AND Status = 1;
                
                SELECT COUNT(*) FROM TransportRoutes WHERE IsDeleted = 0;
                SELECT COUNT(*) FROM TransportRoutes WHERE IsDeleted = 0 AND Status = 1;
                
                SELECT COUNT(*) FROM Staff WHERE IsDeleted = 0 AND Designation LIKE '%Driver%';
                SELECT COUNT(*) FROM Staff WHERE IsDeleted = 0 AND Status = 'Active' AND Designation LIKE '%Driver%';
                
                SELECT COUNT(*) FROM StudentTransportAssignments WHERE IsDeleted = 0 AND Status = 1 
                AND (EndDate IS NULL OR EndDate >= @Today);
                
                SELECT COUNT(*) FROM TransportAttendants WHERE IsDeleted = 0;
                SELECT COUNT(*) FROM TransportAttendants WHERE IsDeleted = 0 AND Status = 1;
            ";
            
            using var multi = await c.QueryMultipleAsync(sql, new { Today = today });
            var totalVehicles = multi.Read<int>().Single();
            var activeVehicles = multi.Read<int>().Single();
            
            var totalRoutes = multi.Read<int>().Single();
            var activeRoutes = multi.Read<int>().Single();
            
            var totalDrivers = multi.Read<int>().Single();
            var activeDrivers = multi.Read<int>().Single();
            
            var activeStudents = multi.Read<int>().Single();
            
            var totalAttendants = multi.Read<int>().Single();
            var activeAttendants = multi.Read<int>().Single();
            
            var summary = new TransportDashboardDto
            {
                TotalVehicles = totalVehicles, 
                ActiveVehicles = activeVehicles,
                TotalRoutes = totalRoutes, 
                ActiveRoutes = activeRoutes,
                TotalDrivers = totalDrivers, 
                ActiveDrivers = activeDrivers,
                StudentsUsingTransport = activeStudents,
                TotalBusAttendants = totalAttendants,
                ActiveBusAttendants = activeAttendants
            };

            return new TransportDashboardResponseDto
            {
                Summary = summary
            };
        }

        public async Task<OperationDetailsDto?> GetOperationDetailsAsync(long assignmentId)
        {
            using var c = Connection();
            var sql = @"
                SELECT 
                    a.AssignmentId,
                    a.VehicleId,
                    v.VehicleNumber AS VehicleNumber, 
                    v.VehicleRegistrationNo AS RegistrationNumber,
                    v.Capacity, 
                    a.RouteId,
                    r.RouteName, 
                    CONCAT(COALESCE(st.FirstName, ''), ' ', COALESCE(st.LastName, '')) AS DriverName, 
                    st.Mobile AS DriverMobile,
                    a.AttendantId,
                    att.AttendantName,
                    att.MobileNumber AS AttendantMobile,
                    a.EffectiveFrom,
                    IF(a.Status, 'Completed', 'Inactive') AS Status,
                    (SELECT COUNT(*) FROM StudentTransportAssignments sta WHERE sta.VehicleAssignmentId = a.AssignmentId AND sta.IsDeleted = 0) AS AssignedStudentsCount,
                    (SELECT COUNT(*) FROM StudentTransportAssignments sta WHERE sta.VehicleAssignmentId = a.AssignmentId AND sta.IsDeleted = 0) AS TotalStudents
                FROM TransportVehicleAssignments a
                LEFT JOIN TransportVehicles v ON a.VehicleId = v.VehicleId
                LEFT JOIN Staff st ON a.DriverId = st.Id
                LEFT JOIN TransportAttendants att ON a.AttendantId = att.AttendantId
                LEFT JOIN TransportRoutes r ON a.RouteId = r.RouteId
                WHERE a.AssignmentId = @Id AND a.IsDeleted = 0
            ";
            return await c.QueryFirstOrDefaultAsync<OperationDetailsDto>(sql, new { Id = assignmentId });
        }
    }
}
