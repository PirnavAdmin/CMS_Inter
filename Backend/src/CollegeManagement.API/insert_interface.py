
with open("Services/Interfaces/IAttendanceService.cs", "r") as f:
    c = f.read()
if "GetAttendanceDefaultersAsync" not in c:
    c = c.replace("Task<AttendanceSummaryResponse> GetAttendanceSummaryAsync(AttendanceSearchRequest request);", "Task<AttendanceSummaryResponse> GetAttendanceSummaryAsync(AttendanceSearchRequest request);\n        Task<IEnumerable<AttendanceDefaulterResponse>> GetAttendanceDefaultersAsync(AttendanceDefaultersRequest request);")
    with open("Services/Interfaces/IAttendanceService.cs", "w") as f:
        f.write(c)

with open("Repositories/Interfaces/IAttendanceRepository.cs", "r") as f:
    c = f.read()
if "GetAttendanceDefaultersAsync" not in c:
    c = c.replace("Task<AttendanceSummaryResponse> GetAttendanceSummaryAsync(AttendanceSearchRequest request);", "Task<AttendanceSummaryResponse> GetAttendanceSummaryAsync(AttendanceSearchRequest request);\n        Task<IEnumerable<AttendanceDefaulterResponse>> GetAttendanceDefaultersAsync(AttendanceDefaultersRequest request);")
    with open("Repositories/Interfaces/IAttendanceRepository.cs", "w") as f:
        f.write(c)

