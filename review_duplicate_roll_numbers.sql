-- This script identifies students with duplicate roll numbers within the same scope (Board, Academic Year, Group, Program, Campus).
-- It does NOT automatically renumber them. Run this query to review the affected records.

SELECT 
    s.StudentId,
    s.AdmissionNo,
    s.StudentName,
    s.RollNo,
    a.CampusId,
    a.BoardId,
    a.AcademicYearId,
    a.GroupId,
    a.ProgramId,
    a.SectionId,
    a.Status AS AllocationStatus
FROM Students s
JOIN SectionRollAllocations a ON s.StudentId = a.StudentId
WHERE s.RollNo IS NOT NULL AND s.RollNo != ''
AND s.RollNo IN (
    -- Find Roll Numbers that appear more than once in the same logical scope
    SELECT s2.RollNo
    FROM Students s2
    JOIN SectionRollAllocations a2 ON s2.StudentId = a2.StudentId
    WHERE s2.RollNo IS NOT NULL AND s2.RollNo != ''
    GROUP BY 
        a2.CampusId,
        a2.BoardId,
        a2.AcademicYearId,
        a2.GroupId,
        a2.ProgramId,
        s2.RollNo
    HAVING COUNT(s2.StudentId) > 1
)
ORDER BY 
    a.CampusId, a.BoardId, a.AcademicYearId, a.GroupId, a.ProgramId, s.RollNo;

-- NOTE: To repair these duplicates, you will need to manually nullify their RollNo 
-- and then use the frontend "Generate Roll Numbers" feature to assign new ones.
-- Example manual repair for a specific student:
-- UPDATE Students SET RollNo = NULL WHERE StudentId = [Enter_Student_Id_Here];
