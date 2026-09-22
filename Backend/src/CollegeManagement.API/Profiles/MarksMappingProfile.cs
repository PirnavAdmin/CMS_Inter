using System;
using AutoMapper;
using CollegeManagement.API.DTOs.Marks;
using CollegeManagement.API.Models;
using CollegeManagement.API.Models.Enums;

namespace CollegeManagement.API.Profiles
{
    public class MarksMappingProfile : Profile
    {
        public MarksMappingProfile()
        {
            // 1. Mark Model -> MarkResponseDto Mapping
            CreateMap<Mark, MarkResponseDto>()
                .ForMember(dest => dest.TotalMarks, opt => opt.MapFrom(src => src.TotalMarks > 0 ? src.TotalMarks : (src.InternalMarks + src.PracticalMarks + src.TheoryMarks)))
                .ForMember(dest => dest.IsPass, opt => opt.MapFrom(src => !src.IsAbsent && ((src.InternalMarks + src.PracticalMarks + src.TheoryMarks) >= src.PassingMarks)));

            // 2. SaveMarkDto -> Mark Model Mapping
            CreateMap<SaveMarkDto, Mark>()
                .ForMember(dest => dest.TotalMarks, opt => opt.MapFrom(src => (src.TotalMarks.HasValue && src.TotalMarks.Value > 0)
                    ? src.TotalMarks.Value
                    : (src.ObtainedMarks.HasValue && src.ObtainedMarks.Value > 0)
                        ? src.ObtainedMarks.Value
                        : (src.InternalMarks + src.PracticalMarks + src.TheoryMarks)))
                .ForMember(dest => dest.Status, opt => opt.MapFrom(_ => EvaluationStatus.SUBMITTED))
                .ForMember(dest => dest.IsVerified, opt => opt.MapFrom(_ => false))
                .ForMember(dest => dest.IsPublished, opt => opt.MapFrom(_ => false))
                .ForMember(dest => dest.IsLocked, opt => opt.MapFrom(_ => false))
                .ForMember(dest => dest.VerifiedBy, opt => opt.Ignore())
                .ForMember(dest => dest.VerifiedAt, opt => opt.Ignore())
                .ForMember(dest => dest.ApprovedBy, opt => opt.Ignore())
                .ForMember(dest => dest.ApprovedAt, opt => opt.Ignore())
                .ForMember(dest => dest.PublishedAt, opt => opt.Ignore())
                .ForMember(dest => dest.IsActive, opt => opt.MapFrom(_ => true))
                .ForMember(dest => dest.CreatedAt, opt => opt.MapFrom(_ => DateTime.UtcNow))
                .ForMember(dest => dest.UpdatedAt, opt => opt.Ignore())
                .ForMember(dest => dest.MarkId, opt => opt.Ignore())
                .ForMember(dest => dest.AcademicYear, opt => opt.Ignore())
                .ForMember(dest => dest.BoardNavigation, opt => opt.Ignore())
                .ForMember(dest => dest.AcademicLevelNavigation, opt => opt.Ignore())
                .ForMember(dest => dest.GroupNavigation, opt => opt.Ignore())
                .ForMember(dest => dest.SectionNavigation, opt => opt.Ignore())
                .ForMember(dest => dest.Examination, opt => opt.Ignore())
                .ForMember(dest => dest.Subject, opt => opt.Ignore())
                .ForMember(dest => dest.Student, opt => opt.Ignore())
                .ForMember(dest => dest.Faculty, opt => opt.Ignore());

            // 3. UpdateMarkDto -> Mark Model Mapping
            CreateMap<UpdateMarkDto, Mark>()
                .ForMember(dest => dest.TotalMarks, opt => opt.MapFrom(src => src.InternalMarks + src.PracticalMarks + src.TheoryMarks))
                .ForMember(dest => dest.UpdatedAt, opt => opt.MapFrom(_ => DateTime.UtcNow))
                .ForMember(dest => dest.MarkId, opt => opt.Ignore())
                .ForMember(dest => dest.Board, opt => opt.Ignore())
                .ForMember(dest => dest.BoardId, opt => opt.Ignore())
                .ForMember(dest => dest.BoardNavigation, opt => opt.Ignore())
                .ForMember(dest => dest.AcademicYear, opt => opt.Ignore())
                .ForMember(dest => dest.AcademicYearId, opt => opt.Ignore())
                .ForMember(dest => dest.AcademicLevel, opt => opt.Ignore())
                .ForMember(dest => dest.AcademicLevelId, opt => opt.Ignore())
                .ForMember(dest => dest.AcademicLevelNavigation, opt => opt.Ignore())
                .ForMember(dest => dest.GroupNavigation, opt => opt.Ignore())
                .ForMember(dest => dest.SectionNavigation, opt => opt.Ignore())
                .ForMember(dest => dest.Examination, opt => opt.Ignore())
                .ForMember(dest => dest.Subject, opt => opt.Ignore())
                .ForMember(dest => dest.Student, opt => opt.Ignore())
                .ForMember(dest => dest.Faculty, opt => opt.Ignore())
                .ForMember(dest => dest.GroupId, opt => opt.Ignore())
                .ForMember(dest => dest.SectionId, opt => opt.Ignore())
                .ForMember(dest => dest.ExaminationId, opt => opt.Ignore())
                .ForMember(dest => dest.SubjectId, opt => opt.Ignore())
                .ForMember(dest => dest.StudentId, opt => opt.Ignore())
                .ForMember(dest => dest.RollNo, opt => opt.Ignore())
                .ForMember(dest => dest.StudentName, opt => opt.Ignore())
                .ForMember(dest => dest.Status, opt => opt.Ignore())
                .ForMember(dest => dest.IsLocked, opt => opt.Ignore())
                .ForMember(dest => dest.IsVerified, opt => opt.Ignore())
                .ForMember(dest => dest.IsPublished, opt => opt.Ignore())
                .ForMember(dest => dest.VerifiedBy, opt => opt.Ignore())
                .ForMember(dest => dest.VerifiedAt, opt => opt.Ignore())
                .ForMember(dest => dest.ApprovedBy, opt => opt.Ignore())
                .ForMember(dest => dest.ApprovedAt, opt => opt.Ignore())
                .ForMember(dest => dest.PublishedAt, opt => opt.Ignore())
                .ForMember(dest => dest.IsActive, opt => opt.Ignore())
                .ForMember(dest => dest.CreatedAt, opt => opt.Ignore());
        }
    }
}