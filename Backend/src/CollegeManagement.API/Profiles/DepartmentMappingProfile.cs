using AutoMapper;
using CollegeManagement.API.DTOs.Staff;
using CollegeManagement.API.Models;

namespace CollegeManagement.API.Profiles
{
    public class DepartmentMappingProfile : Profile
    {
        public DepartmentMappingProfile()
        {
            CreateMap<Department, DepartmentResponseDto>()
                .ForMember(dest => dest.Status, opt => opt.MapFrom(src => src.IsActive ? "Active" : "Inactive"));

            CreateMap<CreateDepartmentDto, Department>()
                .ForMember(dest => dest.DepartmentName, opt => opt.MapFrom(src => src.DepartmentName.Trim()))
                .ForMember(dest => dest.DepartmentCode, opt => opt.MapFrom(src => !string.IsNullOrWhiteSpace(src.DepartmentCode) ? src.DepartmentCode.Trim() : $"DEP_{src.DepartmentName.Trim().ToUpper().Replace(" ", "_")}"))
                .ForMember(dest => dest.StaffType, opt => opt.MapFrom(src => string.IsNullOrWhiteSpace(src.StaffType) ? "Both" : src.StaffType.Trim()))
                .ForMember(dest => dest.CreatedAt, opt => opt.MapFrom(_ => System.DateTime.UtcNow))
                .ForMember(dest => dest.UpdatedAt, opt => opt.Ignore())
                .ForMember(dest => dest.DepartmentId, opt => opt.Ignore());

            CreateMap<UpdateDepartmentDto, Department>()
                .ForMember(dest => dest.DepartmentName, opt => opt.MapFrom(src => src.DepartmentName.Trim()))
                .ForMember(dest => dest.DepartmentCode, opt => opt.MapFrom(src => !string.IsNullOrWhiteSpace(src.DepartmentCode) ? src.DepartmentCode.Trim() : string.Empty))
                .ForMember(dest => dest.StaffType, opt => opt.MapFrom(src => string.IsNullOrWhiteSpace(src.StaffType) ? "Both" : src.StaffType.Trim()))
                .ForMember(dest => dest.UpdatedAt, opt => opt.MapFrom(_ => System.DateTime.UtcNow))
                .ForMember(dest => dest.CreatedAt, opt => opt.Ignore())
                .ForMember(dest => dest.DepartmentId, opt => opt.Ignore());
        }
    }
}
