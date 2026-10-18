using AutoMapper;
using CollegeManagement.API.DTOs.Timetable;
using CollegeManagement.API.Models.Timetable;

namespace CollegeManagement.API.Profiles
{
    public class TimetableMappingProfile : Profile
    {
        public TimetableMappingProfile()
        {
            // Period mappings
            CreateMap<CreatePeriodDto, Period>();
            CreateMap<UpdatePeriodDto, Period>();
            CreateMap<Period, PeriodResponseDto>();

            // Room mappings
            CreateMap<CreateRoomDto, Room>();
            CreateMap<UpdateRoomDto, Room>();
            CreateMap<Room, RoomResponseDto>();

            // BreakType mappings
            CreateMap<CreateBreakTypeDto, BreakType>();
            CreateMap<UpdateBreakTypeDto, BreakType>();
            CreateMap<BreakType, BreakTypeResponseDto>();

            // PeriodStructure mappings
            CreateMap<CreatePeriodStructureDto, PeriodStructure>();
            CreateMap<UpdatePeriodStructureDto, PeriodStructure>();
            CreateMap<PeriodStructure, PeriodStructureResponseDto>();
            CreateMap<PeriodStructure, PeriodStructureListItemDto>();
            CreateMap<PeriodStructureItem, PeriodStructureItemDto>();
            CreateMap<PeriodStructureAssignment, PeriodStructureAssignmentResponseDto>();

            // TimetableBackup mappings
            CreateMap<TimetableBackup, TimetableBackupResponseDto>();
            CreateMap<TimetableBackupSlot, TimetableResponseDto>();
        }
    }
}