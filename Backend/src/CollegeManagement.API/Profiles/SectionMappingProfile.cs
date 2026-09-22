using AutoMapper;
using CollegeManagement.API.DTOs.Sections;
using CollegeManagement.API.Models;

namespace CollegeManagement.API.Profiles
{
    public class SectionMappingProfile : Profile
    {
        public SectionMappingProfile()
        {
            // CreateSectionRequest -> Section Entity
            CreateMap<CreateSectionRequest, Section>()
                .ForMember(dest => dest.CreatedAt, opt => opt.MapFrom(_ => System.DateTime.UtcNow))
                .ForMember(dest => dest.UpdatedAt, opt => opt.Ignore())
                .ForMember(dest => dest.SectionId, opt => opt.Ignore());

            // UpdateSectionRequest -> Section Entity
            CreateMap<UpdateSectionRequest, Section>()
                .ForMember(dest => dest.UpdatedAt, opt => opt.MapFrom(_ => System.DateTime.UtcNow))
                .ForMember(dest => dest.CreatedAt, opt => opt.Ignore())
                .ForMember(dest => dest.SectionId, opt => opt.Ignore());

            // Section Entity -> SectionResponse
            CreateMap<Section, SectionResponse>()
                .ForMember(dest => dest.AcademicYearName, opt => opt.Ignore())
                .ForMember(dest => dest.InchargeName, opt => opt.Ignore())
                .ForMember(dest => dest.ClassTeacherName, opt => opt.Ignore())
                .ForMember(dest => dest.RoomName, opt => opt.Ignore());
        }
    }
}
