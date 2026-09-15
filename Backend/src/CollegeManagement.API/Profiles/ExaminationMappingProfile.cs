using AutoMapper;
using CollegeManagement.API.DTOs.Examination.Requests;
using CollegeManagement.API.DTOs.Examination.Responses;
using CollegeManagement.API.Models;

namespace CollegeManagement.API.Profiles
{
    public class ExaminationMappingProfile : Profile
    {
        public ExaminationMappingProfile()
        {
            #region Request -> Model Mappings

            CreateMap<CreateExaminationRequest, Examination>()
                .ForMember(dest => dest.Status, opt => opt.MapFrom(src => !string.IsNullOrEmpty(src.Status) ? src.Status.ToUpper() : "DRAFT"))
                .ForMember(dest => dest.Board, opt => opt.Ignore())
                .ForMember(dest => dest.AcademicYear, opt => opt.Ignore())
                .ForMember(dest => dest.AcademicLevel, opt => opt.Ignore())
                .ForMember(dest => dest.Group, opt => opt.Ignore())
                .ForMember(dest => dest.Program, opt => opt.Ignore())
                .ForMember(dest => dest.AssessmentType, opt => opt.Ignore())
                .ForMember(dest => dest.ExamSchedules, opt => opt.Ignore());

            CreateMap<UpdateExaminationRequest, Examination>()
                .ForMember(dest => dest.Board, opt => opt.Ignore())
                .ForMember(dest => dest.AcademicYear, opt => opt.Ignore())
                .ForMember(dest => dest.AcademicLevel, opt => opt.Ignore())
                .ForMember(dest => dest.Group, opt => opt.Ignore())
                .ForMember(dest => dest.Program, opt => opt.Ignore())
                .ForMember(dest => dest.AssessmentType, opt => opt.Ignore())
                .ForMember(dest => dest.ExamSchedules, opt => opt.Ignore())
                .ForAllMembers(opts => opts.Condition((src, dest, srcMember) => srcMember != null));

            CreateMap<CreateExamScheduleRequest, ExamSchedule>()
                .ForMember(dest => dest.Examination, opt => opt.Ignore())
                .ForMember(dest => dest.Subject, opt => opt.Ignore())
                .ForMember(dest => dest.Hall, opt => opt.MapFrom(src => src.Hall ?? src.RoomNumber ?? string.Empty))
                .ForMember(dest => dest.Invigilator, opt => opt.MapFrom(src => src.Invigilator ?? src.InvigilatorName ?? string.Empty));

            CreateMap<UpdateExamScheduleRequest, ExamSchedule>()
                .ForMember(dest => dest.Examination, opt => opt.Ignore())
                .ForMember(dest => dest.Subject, opt => opt.Ignore())
                .ForAllMembers(opts => opts.Condition((src, dest, srcMember) => srcMember != null));

            #endregion

            #region Model -> Response Mappings

            CreateMap<Examination, ExaminationResponse>()
                .ForMember(dest => dest.BoardName, opt => opt.MapFrom(src => src.Board != null ? src.Board.BoardName : string.Empty))
                .ForMember(dest => dest.GroupName, opt => opt.MapFrom(src => src.Group != null ? src.Group.GroupName : string.Empty))
                .ForMember(dest => dest.AcademicYear, opt => opt.MapFrom(src => src.AcademicYear != null ? src.AcademicYear.AcademicYearName : string.Empty))
                .ForMember(dest => dest.AcademicLevel, opt => opt.MapFrom(src => src.AcademicLevel != null ? src.AcademicLevel.LevelName : string.Empty))
                .ForMember(dest => dest.ProgramName, opt => opt.MapFrom(src => src.Program != null ? src.Program.ProgramName : "All Programs"))
                .ForMember(dest => dest.ExamType, opt => opt.MapFrom(src => src.AssessmentType != null ? src.AssessmentType.AssessmentTypeName : (src.AssessmentTypeId == 1 ? "Unit Test" : (src.AssessmentTypeId == 2 ? "Quarterly Exam" : (src.AssessmentTypeId == 3 ? "Half-Yearly Exam" : (src.AssessmentTypeId == 4 ? "Pre-Final Exam" : "Annual Board Exam"))))))
                .ForMember(dest => dest.ExamPattern, opt => opt.MapFrom(src => !string.IsNullOrEmpty(src.ExamPattern) ? src.ExamPattern : "REGULAR_ACADEMIC"))
                .ForMember(dest => dest.Schedules, opt => opt.MapFrom(src => src.ExamSchedules));

            CreateMap<ExamSchedule, ExamScheduleResponse>()
                .ForMember(dest => dest.SubjectName, opt => opt.MapFrom(src => src.Subject != null ? src.Subject.SubjectName : string.Empty))
                .ForMember(dest => dest.SubjectCode, opt => opt.MapFrom(src => src.Subject != null ? src.Subject.SubjectCode : string.Empty));

            CreateMap<HallTicket, HallTicketResponse>()
                .ForMember(dest => dest.StudentName, opt => opt.MapFrom(src => src.Student != null ? src.Student.Email : string.Empty))
                .ForMember(dest => dest.RollNumber, opt => opt.MapFrom(src => src.StudentId.ToString()));

            CreateMap<InvigilatorAssignment, InvigilatorAssignmentResponse>()
                .ForMember(dest => dest.InvigilatorName, opt => opt.MapFrom(src => src.Invigilator != null ? src.Invigilator.Email : string.Empty));

            #endregion
        }
    }
}