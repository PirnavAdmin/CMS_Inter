using System;
using AutoMapper;
using CollegeManagement.API.DTOs.Attendance.Requests;
using CollegeManagement.API.DTOs.Attendance.Responses;
using CollegeManagement.API.Models;

namespace CollegeManagement.API.Profiles
{
    /// <summary>
    /// AutoMapper profile configuration for mapping Attendance request/response DTOs and database models.
    /// </summary>
    public class AttendanceProfile : Profile
    {
        /// <summary>
        /// Initializes a new instance of the <see cref="AttendanceProfile"/> class.
        /// </summary>
        public AttendanceProfile()
        {
            // CreateAttendanceRequest -> Attendance Mapping
            CreateMap<CreateAttendanceRequest, Attendance>();

            // UpdateAttendanceRequest -> Attendance Mapping
            CreateMap<UpdateAttendanceRequest, Attendance>();

            // AttendanceStudentRequest -> Attendance Mapping
            CreateMap<AttendanceStudentRequest, Attendance>();

            // // Attendance -> AttendanceResponse Mapping
            // CreateMap<Attendance, AttendanceResponse>()
            //     .ForMember(dest => dest.StudentName, opt => opt.MapFrom(src => src.Student != null ? src.Student.StudentName : string.Empty))
            //     .ForMember(dest => dest.RollNumber, opt => opt.MapFrom(src => src.Student != null ? src.Student.RollNumber : string.Empty))
            //     .ForMember(dest => dest.FacultyName, opt => opt.MapFrom(src => src.Faculty != null ? $"{src.Faculty.FirstName} {src.Faculty.LastName}".Trim() : string.Empty))
            //     .ForMember(dest => dest.BoardName, opt => opt.MapFrom(src => src.Board != null ? src.Board.BoardName : string.Empty))
            //     .ForMember(dest => dest.AcademicYearName, opt => opt.MapFrom(src => src.AcademicYear != null ? src.AcademicYear.AcademicYearName : string.Empty))
            //     .ForMember(dest => dest.AcademicLevelName, opt => opt.MapFrom(src => src.AcademicLevel != null ? src.AcademicLevel.LevelName : string.Empty))
            //     .ForMember(dest => dest.GroupName, opt => opt.MapFrom(src => src.Group != null ? src.Group.GroupName : string.Empty))
            //     .ForMember(dest => dest.SectionName, opt => opt.MapFrom(src => src.Section != null ? src.Section.SectionName : string.Empty))
            //     .ForMember(dest => dest.SubjectName, opt => opt.MapFrom(src => src.Subject != null ? src.Subject.SubjectName : string.Empty));

            // // Attendance -> AttendanceListResponse Mapping
            // CreateMap<Attendance, AttendanceListResponse>()
            //     .ForMember(dest => dest.RollNumber, opt => opt.MapFrom(src => src.Student != null ? src.Student.RollNumber : string.Empty))
            //     .ForMember(dest => dest.StudentName, opt => opt.MapFrom(src => src.Student != null ? src.Student.StudentName : string.Empty))
            //     .ForMember(dest => dest.FacultyName, opt => opt.MapFrom(src => src.Faculty != null ? $"{src.Faculty.FirstName} {src.Faculty.LastName}".Trim() : string.Empty))
            //     .ForMember(dest => dest.SubjectName, opt => opt.MapFrom(src => src.Subject != null ? src.Subject.SubjectName : string.Empty));
        }
    }
}
