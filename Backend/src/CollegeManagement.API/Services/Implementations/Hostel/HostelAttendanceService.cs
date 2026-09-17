using CollegeManagement.API.DTOs.Hostel;
using CollegeManagement.API.Models.Hostel;
using CollegeManagement.API.Repositories.Interfaces.Hostel;
using CollegeManagement.API.Services.Interfaces.Hostel;

namespace CollegeManagement.API.Services.Implementations.Hostel
{
    public class HostelAttendanceService
        : IHostelAttendanceService
    {
        private readonly IHostelAttendanceRepository
            _attendanceRepository;

        private readonly IHostelWardenAssignmentRepository
            _wardenRepository;

        public HostelAttendanceService(
            IHostelAttendanceRepository attendanceRepository,
            IHostelWardenAssignmentRepository wardenRepository)
        {
            _attendanceRepository = attendanceRepository;
            _wardenRepository = wardenRepository;
        }

        public async Task<IEnumerable<HostelAttendanceResponseDto>>
            GetAllAsync(
                int? hostelId = null,
                int? roomId = null,
                int? studentId = null,
                DateTime? attendanceDate = null,
                string? session = null,
                string? attendanceStatus = null,
                string? search = null)
        {
            var records =
                await _attendanceRepository.GetAllAsync(
                    hostelId,
                    roomId,
                    studentId,
                    attendanceDate,
                    session,
                    attendanceStatus,
                    search);

            return records.Select(MapToResponseDto);
        }

        public async Task<HostelAttendanceResponseDto?>
            GetByIdAsync(int attendanceId)
        {
            var record =
                await _attendanceRepository
                    .GetByIdAsync(attendanceId);

            return record == null
                ? null
                : MapToResponseDto(record);
        }

        public async Task<(
            bool Success,
            string Message,
            HostelAttendanceResponseDto? Data)>
            CreateAsync(CreateHostelAttendanceDto dto)
        {
            if (!await _attendanceRepository
                    .StudentExistsAsync(dto.StudentId))
            {
                return (
                    false,
                    "Student not found.",
                    null);
            }

            if (!await _attendanceRepository
                    .HostelExistsAsync(dto.HostelId))
            {
                return (
                    false,
                    "Hostel not found.",
                    null);
            }

            if (!await _attendanceRepository
                    .RoomExistsAsync(dto.RoomId))
            {
                return (
                    false,
                    "Room not found.",
                    null);
            }

            if (!await _attendanceRepository
                    .RoomBelongsToHostelAsync(
                        dto.RoomId,
                        dto.HostelId))
            {
                return (
                    false,
                    "Selected room does not belong to the selected hostel.",
                    null);
            }

            if (!await _attendanceRepository
                    .BedExistsAsync(dto.BedId))
            {
                return (
                    false,
                    "Bed not found.",
                    null);
            }

            if (!await _attendanceRepository
                    .BedBelongsToRoomAsync(
                        dto.BedId,
                        dto.RoomId))
            {
                return (
                    false,
                    "Selected bed does not belong to the selected room.",
                    null);
            }

            if (!await _attendanceRepository
                    .StudentHasActiveAllocationAsync(
                        dto.StudentId,
                        dto.HostelId,
                        dto.RoomId,
                        dto.BedId))
            {
                return (
                    false,
                    "Student does not have an active allocation for the selected hostel, room and bed.",
                    null);
            }

            if (dto.AttendanceDate == default)
            {
                return (
                    false,
                    "Attendance date is required.",
                    null);
            }

            var session =
                NormalizeSession(dto.Session);

            if (session == null)
            {
                return (
                    false,
                    "Session must be Morning or Night.",
                    null);
            }

            var attendanceStatus =
                NormalizeAttendanceStatus(
                    dto.AttendanceStatus);

            if (attendanceStatus == null)
            {
                return (
                    false,
                    "Attendance status must be Present, Absent, Leave or Outpass.",
                    null);
            }

            var duplicate =
                await _attendanceRepository
                    .GetByStudentDateSessionAsync(
                        dto.StudentId,
                        dto.AttendanceDate.Date,
                        session);

            if (duplicate != null)
            {
                return (
                    false,
                    $"Attendance already exists for this student for {session} session on {dto.AttendanceDate:yyyy-MM-dd}.",
                    null);
            }

            int? wardenAssignmentId =
                dto.WardenAssignmentId;

            if (wardenAssignmentId.HasValue)
            {
                var selectedWarden =
                    await _wardenRepository.GetByIdAsync(
                        wardenAssignmentId.Value);

                if (selectedWarden == null)
                {
                    return (
                        false,
                        "Warden assignment not found.",
                        null);
                }

                if (!selectedWarden.Status.Equals(
                        "Active",
                        StringComparison.OrdinalIgnoreCase))
                {
                    return (
                        false,
                        "Selected warden assignment is not active.",
                        null);
                }

                if (selectedWarden.HostelId != dto.HostelId)
                {
                    return (
                        false,
                        "Selected warden is not assigned to this hostel.",
                        null);
                }
            }
            else
            {
                var activeWarden =
                    await _wardenRepository
                        .GetActiveByHostelAsync(
                            dto.HostelId);

                wardenAssignmentId =
                    activeWarden?.WardenAssignmentId;
            }

            var attendance =
                new HostelAttendance
                {
                    StudentId = dto.StudentId,
                    HostelId = dto.HostelId,
                    RoomId = dto.RoomId,
                    BedId = dto.BedId,
                    WardenAssignmentId =
                        wardenAssignmentId,

                    AttendanceDate =
                        dto.AttendanceDate.Date,

                    Session = session,

                    AttendanceStatus =
                        attendanceStatus,

                    Remarks =
                        dto.Remarks?.Trim()
                };

            var attendanceId =
                await _attendanceRepository
                    .CreateAsync(attendance);

            var created =
                await _attendanceRepository
                    .GetByIdAsync(attendanceId);

            return (
                true,
                "Hostel attendance created successfully.",
                created == null
                    ? null
                    : MapToResponseDto(created));
        }

        public async Task<(
            bool Success,
            string Message,
            HostelAttendanceResponseDto? Data)>
            UpdateAsync(
                int attendanceId,
                UpdateHostelAttendanceDto dto)
        {
            var existing =
                await _attendanceRepository
                    .GetByIdAsync(attendanceId);

            if (existing == null)
            {
                return (
                    false,
                    "Hostel attendance record not found.",
                    null);
            }

            if (!await _attendanceRepository
                    .StudentExistsAsync(dto.StudentId))
            {
                return (
                    false,
                    "Student not found.",
                    null);
            }

            if (!await _attendanceRepository
                    .HostelExistsAsync(dto.HostelId))
            {
                return (
                    false,
                    "Hostel not found.",
                    null);
            }

            if (!await _attendanceRepository
                    .RoomExistsAsync(dto.RoomId))
            {
                return (
                    false,
                    "Room not found.",
                    null);
            }

            if (!await _attendanceRepository
                    .RoomBelongsToHostelAsync(
                        dto.RoomId,
                        dto.HostelId))
            {
                return (
                    false,
                    "Selected room does not belong to the selected hostel.",
                    null);
            }

            if (!await _attendanceRepository
                    .BedExistsAsync(dto.BedId))
            {
                return (
                    false,
                    "Bed not found.",
                    null);
            }

            if (!await _attendanceRepository
                    .BedBelongsToRoomAsync(
                        dto.BedId,
                        dto.RoomId))
            {
                return (
                    false,
                    "Selected bed does not belong to the selected room.",
                    null);
            }

            if (!await _attendanceRepository
                    .StudentHasActiveAllocationAsync(
                        dto.StudentId,
                        dto.HostelId,
                        dto.RoomId,
                        dto.BedId))
            {
                return (
                    false,
                    "Student does not have an active allocation for the selected hostel, room and bed.",
                    null);
            }

            if (dto.AttendanceDate == default)
            {
                return (
                    false,
                    "Attendance date is required.",
                    null);
            }

            var session =
                NormalizeSession(dto.Session);

            if (session == null)
            {
                return (
                    false,
                    "Session must be Morning or Night.",
                    null);
            }

            var attendanceStatus =
                NormalizeAttendanceStatus(
                    dto.AttendanceStatus);

            if (attendanceStatus == null)
            {
                return (
                    false,
                    "Attendance status must be Present, Absent, Leave or Outpass.",
                    null);
            }

            var duplicate =
                await _attendanceRepository
                    .GetByStudentDateSessionAsync(
                        dto.StudentId,
                        dto.AttendanceDate.Date,
                        session);

            if (duplicate != null &&
                duplicate.AttendanceId != attendanceId)
            {
                return (
                    false,
                    $"Attendance already exists for this student for {session} session on {dto.AttendanceDate:yyyy-MM-dd}.",
                    null);
            }

            int? wardenAssignmentId =
                dto.WardenAssignmentId;

            if (wardenAssignmentId.HasValue)
            {
                var selectedWarden =
                    await _wardenRepository
                        .GetByIdAsync(
                            wardenAssignmentId.Value);

                if (selectedWarden == null)
                {
                    return (
                        false,
                        "Warden assignment not found.",
                        null);
                }

                if (!selectedWarden.Status.Equals(
                        "Active",
                        StringComparison.OrdinalIgnoreCase))
                {
                    return (
                        false,
                        "Selected warden assignment is not active.",
                        null);
                }

                if (selectedWarden.HostelId !=
                    dto.HostelId)
                {
                    return (
                        false,
                        "Selected warden is not assigned to this hostel.",
                        null);
                }
            }
            else
            {
                var activeWarden =
                    await _wardenRepository
                        .GetActiveByHostelAsync(
                            dto.HostelId);

                wardenAssignmentId =
                    activeWarden?.WardenAssignmentId;
            }

            var attendance =
                new HostelAttendance
                {
                    AttendanceId = attendanceId,

                    StudentId = dto.StudentId,

                    HostelId = dto.HostelId,

                    RoomId = dto.RoomId,

                    BedId = dto.BedId,

                    WardenAssignmentId =
                        wardenAssignmentId,

                    AttendanceDate =
                        dto.AttendanceDate.Date,

                    Session = session,

                    AttendanceStatus =
                        attendanceStatus,

                    Remarks =
                        dto.Remarks?.Trim()
                };

            var updated =
                await _attendanceRepository
                    .UpdateAsync(attendance);

            if (!updated)
            {
                return (
                    false,
                    "Unable to update hostel attendance.",
                    null);
            }

            var updatedRecord =
                await _attendanceRepository
                    .GetByIdAsync(attendanceId);

            return (
                true,
                "Hostel attendance updated successfully.",
                updatedRecord == null
                    ? null
                    : MapToResponseDto(
                        updatedRecord));
        }

        public async Task<(bool Success, string Message)>
            DeleteAsync(int attendanceId)
        {
            if (!await _attendanceRepository
                    .ExistsAsync(attendanceId))
            {
                return (
                    false,
                    "Hostel attendance record not found.");
            }

            var deleted =
                await _attendanceRepository
                    .DeleteAsync(attendanceId);

            if (!deleted)
            {
                return (
                    false,
                    "Unable to delete hostel attendance.");
            }

            return (
                true,
                "Hostel attendance deleted successfully.");
        }

        private static string? NormalizeSession(
            string? session)
        {
            if (string.IsNullOrWhiteSpace(session))
                return null;

            if (session.Equals(
                    "Morning",
                    StringComparison.OrdinalIgnoreCase))
            {
                return "Morning";
            }

            if (session.Equals(
                    "Night",
                    StringComparison.OrdinalIgnoreCase))
            {
                return "Night";
            }

            return null;
        }

        private static string?
            NormalizeAttendanceStatus(
                string? attendanceStatus)
        {
            if (string.IsNullOrWhiteSpace(
                    attendanceStatus))
            {
                return null;
            }

            if (attendanceStatus.Equals(
                    "Present",
                    StringComparison.OrdinalIgnoreCase))
            {
                return "Present";
            }

            if (attendanceStatus.Equals(
                    "Absent",
                    StringComparison.OrdinalIgnoreCase))
            {
                return "Absent";
            }

            if (attendanceStatus.Equals(
                    "Leave",
                    StringComparison.OrdinalIgnoreCase))
            {
                return "Leave";
            }

            if (attendanceStatus.Equals(
                    "Outpass",
                    StringComparison.OrdinalIgnoreCase))
            {
                return "Outpass";
            }

            return null;
        }

        private static HostelAttendanceResponseDto
            MapToResponseDto(
                HostelAttendance model)
        {
            return new HostelAttendanceResponseDto
            {
                AttendanceId =
                    model.AttendanceId,

                StudentId =
                    model.StudentId,

                AdmissionNo =
                    model.AdmissionNo,

                RollNo =
                    model.RollNo,

                StudentName =
                    model.StudentName,

                HostelId =
                    model.HostelId,

                HostelName =
                    model.HostelName,

                HostelCode =
                    model.HostelCode,

                HostelType =
                    model.HostelType,

                RoomId =
                    model.RoomId,

                RoomNumber =
                    model.RoomNumber,

                FloorLevel =
                    model.FloorLevel,

                BedId =
                    model.BedId,

                BedNumber =
                    model.BedNumber,

                WardenAssignmentId =
                    model.WardenAssignmentId,

                WardenName =
                    model.WardenName,

                AttendanceDate =
                    model.AttendanceDate,

                Session =
                    model.Session,

                AttendanceStatus =
                    model.AttendanceStatus,

                Remarks =
                    model.Remarks,

                CreatedAt =
                    model.CreatedAt,

                UpdatedAt =
                    model.UpdatedAt
            };
        }
    }
}