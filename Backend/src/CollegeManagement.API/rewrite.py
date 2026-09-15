
import re

with open("Repositories/Implementations/AttendanceRepository.cs", "r") as f:
    content = f.read()

start_idx = content.find("public async Task<IEnumerable<StudentAttendanceResponse>> GetAdminStudentsForAttendanceAsync(AttendanceSearchRequest request)")
end_idx = content.find("/// <summary>\n        /// Retrieves statistical summary metrics", start_idx)

original_method = content[start_idx:end_idx]

new_method = """public async Task<IEnumerable<StudentAttendanceResponse>> GetAdminStudentsForAttendanceAsync(AttendanceSearchRequest request)
        {
            DateTime date = DateTime.UtcNow.Date;
            if (request.FromDate.HasValue) date = request.FromDate.Value.Date;
            else if (!string.IsNullOrEmpty(request.AttendanceDate)) date = DateTime.Parse(request.AttendanceDate).Date;
            else if (!string.IsNullOrEmpty(request.Date)) date = DateTime.Parse(request.Date).Date;

            var session = request.Session;

            // Base query for students matching the criteria
            var studentsQuery = _context.Students.Where(s => s.IsActive);

            if (request.BoardId.HasValue) studentsQuery = studentsQuery.Where(s => s.BoardId == request.BoardId);
            if (request.AcademicYearId.HasValue) studentsQuery = studentsQuery.Where(s => s.AcademicYearId == request.AcademicYearId);
            if (request.GroupId.HasValue) studentsQuery = studentsQuery.Where(s => s.GroupId == request.GroupId);
            if (request.ProgramId.HasValue) studentsQuery = studentsQuery.Where(s => s.ProgramId == request.ProgramId);
            if (request.SectionId.HasValue) studentsQuery = studentsQuery.Where(s => s.SectionId == request.SectionId);
            if (request.StudentId.HasValue) studentsQuery = studentsQuery.Where(s => s.StudentId == request.StudentId);
            
            if (!string.IsNullOrEmpty(request.SearchText))
            {
                studentsQuery = studentsQuery.Where(s => 
                    s.StudentName.Contains(request.SearchText) || 
                    s.RollNo.Contains(request.SearchText) || 
                    s.AdmissionNo.Contains(request.SearchText));
            }

            var students = await studentsQuery
                .OrderBy(s => s.RollNo)
                .ThenBy(s => s.StudentName)
                .Select(s => new 
                {
                    s.StudentId,
                    s.AdmissionNo,
                    s.RollNo,
                    s.StudentName,
                    GroupName = s.Group.GroupName,
                    SectionName = s.Section.SectionName
                })
                .ToListAsync();

            var studentIds = students.Select(s => s.StudentId).ToList();
            
            var attendancesQuery = _context.Attendances
                .Where(a => a.IsActive && 
                            a.AttendanceDate.Date == date && 
                            studentIds.Contains(a.StudentId));

            if (session.HasValue)
            {
                attendancesQuery = attendancesQuery.Where(a => a.Session == session.Value);
            }

            var existingAttendances = await attendancesQuery
                .Select(a => new 
                {
                    a.AttendanceId,
                    a.StudentId,
                    a.Status,
                    a.Remarks,
                    a.Session,
                    a.ModifiedByUserId,
                    a.ModifiedAt
                })
                .ToListAsync();

            var userIds = existingAttendances.Where(a => a.ModifiedByUserId.HasValue).Select(a => a.ModifiedByUserId!.Value).Distinct().ToList();
            var users = await _context.Users.Where(u => userIds.Contains(u.UserId)).ToDictionaryAsync(u => u.UserId, u => u.FullName);

            var result = new List<StudentAttendanceResponse>();
            
            foreach (var student in students)
            {
                var morningAtt = existingAttendances.FirstOrDefault(a => a.StudentId == student.StudentId && a.Session == CollegeManagement.API.Enums.StudentAttendanceSession.Morning);
                var afternoonAtt = existingAttendances.FirstOrDefault(a => a.StudentId == student.StudentId && a.Session == CollegeManagement.API.Enums.StudentAttendanceSession.Afternoon);
                var latestAtt = existingAttendances.Where(a => a.StudentId == student.StudentId).OrderByDescending(a => a.ModifiedAt).FirstOrDefault();
                
                result.Add(new StudentAttendanceResponse
                {
                    StudentId = student.StudentId,
                    AdmissionNumber = student.AdmissionNo ?? "",
                    RollNumber = student.RollNo ?? "",
                    StudentName = student.StudentName,
                    GroupName = student.GroupName ?? "",
                    SectionName = student.SectionName ?? "",
                    MorningStatus = morningAtt?.Status,
                    AfternoonStatus = afternoonAtt?.Status,
                    Status = latestAtt?.Status,
                    Remarks = latestAtt?.Remarks,
                    IsAttendanceMarked = morningAtt != null || afternoonAtt != null || latestAtt != null,
                    Session = latestAtt?.Session,
                    AttendanceId = latestAtt?.AttendanceId,
                    ModifiedByUserName = latestAtt?.ModifiedByUserId.HasValue == true && users.ContainsKey(latestAtt.ModifiedByUserId.Value) ? users[latestAtt.ModifiedByUserId.Value] : null,
                    ModifiedAt = latestAtt?.ModifiedAt
                });
            }

            return result;
        }

        """

new_content = content.replace(original_method, new_method)
with open("Repositories/Implementations/AttendanceRepository.cs", "w") as f:
    f.write(new_content)

