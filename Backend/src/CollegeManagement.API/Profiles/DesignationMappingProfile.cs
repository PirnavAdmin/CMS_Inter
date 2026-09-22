using AutoMapper;
using CollegeManagement.API.DTOs.Staff;
using CollegeManagement.API.Models.Faculty;

namespace CollegeManagement.API.Profiles
{
    public class DesignationMappingProfile : Profile
    {
        public DesignationMappingProfile()
        {
            CreateMap<Designation, DesignationResponseDto>()
                .ForMember(dest => dest.DepartmentName, opt => opt.MapFrom(src => src.Department != null ? src.Department.DepartmentName : string.Empty))
                .ForMember(dest => dest.DepartmentCode, opt => opt.MapFrom(src => src.Department != null ? src.Department.DepartmentCode : string.Empty))
                .ForMember(dest => dest.Status, opt => opt.MapFrom(src => src.IsActive ? "Active" : "Inactive"));

            CreateMap<CreateDesignationDto, Designation>()
                .ForMember(dest => dest.Name, opt => opt.MapFrom(src => src.Name.Trim()))
                .ForMember(dest => dest.StaffType, opt => opt.MapFrom(src => string.IsNullOrWhiteSpace(src.StaffType) ? "Both" : src.StaffType.Trim()))
                .ForMember(dest => dest.CreatedAt, opt => opt.MapFrom(_ => System.DateTime.UtcNow))
                .ForMember(dest => dest.UpdatedAt, opt => opt.Ignore())
                .ForMember(dest => dest.Id, opt => opt.Ignore())
                .ForMember(dest => dest.Department, opt => opt.Ignore())
                .ForMember(dest => dest.Faculties, opt => opt.Ignore())
                .ForMember(dest => dest.Staffs, opt => opt.Ignore());

            CreateMap<UpdateDesignationDto, Designation>()
                .ForMember(dest => dest.Name, opt => opt.MapFrom(src => src.Name.Trim()))
                .ForMember(dest => dest.StaffType, opt => opt.MapFrom(src => string.IsNullOrWhiteSpace(src.StaffType) ? "Both" : src.StaffType.Trim()))
                .ForMember(dest => dest.UpdatedAt, opt => opt.MapFrom(_ => System.DateTime.UtcNow))
                .ForMember(dest => dest.CreatedAt, opt => opt.Ignore())
                .ForMember(dest => dest.Id, opt => opt.Ignore())
                .ForMember(dest => dest.Department, opt => opt.Ignore())
                .ForMember(dest => dest.Faculties, opt => opt.Ignore())
                .ForMember(dest => dest.Staffs, opt => opt.Ignore());
        }
    }
}
