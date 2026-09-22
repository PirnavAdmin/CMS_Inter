using System.Collections.Generic;
using System.Linq;
using AutoMapper;
using CollegeManagement.API.DTOs.Board.Requests;
using CollegeManagement.API.DTOs.Board.Responses;
using CollegeManagement.API.Models;

namespace CollegeManagement.API.Profiles
{
    /// <summary>
    /// AutoMapper profile configuration for the Board module entities and DTOs.
    /// </summary>
    public class BoardMappingProfile : Profile
    {
        /// <summary>
        /// Initializes a new instance of the <see cref="BoardMappingProfile"/> class
        /// and configures mappings between DTOs and database entities.
        /// </summary>
        public BoardMappingProfile()
        {
            #region Request to Entity Mappings

            // CreateBoardRequest -> Board mapping configuration
            CreateMap<CreateBoardRequest, Board>()
                .ForMember(dest => dest.BoardId, opt => opt.Ignore())
                .ForMember(dest => dest.CreatedAt, opt => opt.Ignore())
                .ForMember(dest => dest.UpdatedAt, opt => opt.Ignore())
                .ForMember(dest => dest.BoardAcademicLevels, opt => opt.Ignore())
                .ForMember(dest => dest.Country, opt => opt.Ignore())
                .ForMember(dest => dest.State, opt => opt.Ignore())
                .ForMember(dest => dest.GradingSystem, opt => opt.Ignore())
                .ForMember(dest => dest.IsActive, opt => opt.MapFrom(src => src.Status));

            // UpdateBoardRequest -> Board mapping configuration
            CreateMap<UpdateBoardRequest, Board>()
                .ForMember(dest => dest.BoardId, opt => opt.Ignore())
                .ForMember(dest => dest.CreatedAt, opt => opt.Ignore())
                .ForMember(dest => dest.UpdatedAt, opt => opt.Ignore())
                .ForMember(dest => dest.BoardAcademicLevels, opt => opt.Ignore())
                .ForMember(dest => dest.Country, opt => opt.Ignore())
                .ForMember(dest => dest.State, opt => opt.Ignore())
                .ForMember(dest => dest.GradingSystem, opt => opt.Ignore())
                .ForMember(dest => dest.IsActive, opt => opt.MapFrom(src => src.Status));

            #endregion

            #region Entity to Response Mappings

            // Board -> BoardResponse mapping configuration
            CreateMap<Board, BoardResponse>()
                .ForMember(dest => dest.BoardType, opt => opt.MapFrom(src => src.BoardType))
                .ForMember(dest => dest.CountryName, opt => opt.MapFrom(src => src.Country != null ? src.Country.CountryName : string.Empty))
                .ForMember(dest => dest.StateName, opt => opt.MapFrom(src => src.State != null ? src.State.StateName : string.Empty))
                .ForMember(dest => dest.GradingSystemName, opt => opt.MapFrom(src => src.GradingSystem != null ? src.GradingSystem.GradingSystemName : string.Empty))
                .ForMember(dest => dest.Status, opt => opt.MapFrom(src => src.IsActive))
                .ForMember(dest => dest.CreatedDate, opt => opt.MapFrom(src => src.CreatedAt))
                .ForMember(dest => dest.AcademicLevelIds, opt => opt.MapFrom(src => src.BoardAcademicLevels != null 
                    ? src.BoardAcademicLevels.Select(x => x.AcademicLevelId).ToList() 
                    : new List<int>()))
                .ForMember(dest => dest.AcademicLevelNames, opt => opt.MapFrom(src => src.BoardAcademicLevels != null 
                    ? src.BoardAcademicLevels
                        .Select(x => x.AcademicLevel != null ? x.AcademicLevel.LevelName : string.Empty)
                        .ToList() 
                    : new List<string>()));

            // Board -> BoardListResponse mapping configuration
            CreateMap<Board, BoardListResponse>()
                .ForMember(dest => dest.BoardType, opt => opt.MapFrom(src => src.BoardType))
                .ForMember(dest => dest.CountryName, opt => opt.MapFrom(src => src.Country != null ? src.Country.CountryName : string.Empty))
                .ForMember(dest => dest.StateName, opt => opt.MapFrom(src => src.State != null ? src.State.StateName : string.Empty))
                .ForMember(dest => dest.Status, opt => opt.MapFrom(src => src.IsActive))
                .ForMember(dest => dest.CreatedDate, opt => opt.MapFrom(src => src.CreatedAt))
                .ForMember(dest => dest.AcademicLevelIds, opt => opt.MapFrom(src => src.BoardAcademicLevels != null 
                    ? src.BoardAcademicLevels.Select(x => x.AcademicLevelId).ToList() 
                    : new List<int>()))
                .ForMember(dest => dest.AcademicLevelNames, opt => opt.MapFrom(src => src.BoardAcademicLevels != null 
                    ? src.BoardAcademicLevels
                        .Select(x => x.AcademicLevel != null ? x.AcademicLevel.LevelName : string.Empty)
                        .ToList() 
                    : new List<string>()))
                .ForMember(dest => dest.AcademicLevels, opt => opt.MapFrom(src => src.BoardAcademicLevels != null 
                    ? src.BoardAcademicLevels
                        .Select(x => x.AcademicLevel != null ? x.AcademicLevel.LevelName : string.Empty)
                        .ToList() 
                    : new List<string>()))
                .ForMember(dest => dest.AcademicLevelsText, opt => opt.MapFrom(src => src.BoardAcademicLevels != null 
                    ? string.Join(", ", src.BoardAcademicLevels.Where(x => x.AcademicLevel != null).Select(x => x.AcademicLevel.LevelName)) 
                    : string.Empty))
                .ForMember(dest => dest.AcademicLevel, opt => opt.MapFrom(src => src.BoardAcademicLevels != null 
                    ? string.Join(", ", src.BoardAcademicLevels.Where(x => x.AcademicLevel != null).Select(x => x.AcademicLevel.LevelName)) 
                    : string.Empty));

            #endregion

            #region Lookup Response Mappings

            // Country -> CountryResponse mapping configuration
            CreateMap<Country, CountryResponse>();

            // State -> StateResponse mapping configuration
            CreateMap<State, StateResponse>();

            // AcademicLevel -> AcademicLevelResponse mapping configuration
            CreateMap<AcademicLevel, AcademicLevelResponse>();

            // GradingSystem -> GradingSystemResponse mapping configuration
            CreateMap<GradingSystem, GradingSystemResponse>();

            // AuditLog -> BoardHistoryResponse mapping configuration
            CreateMap<CollegeManagement.API.Models.Reports.AuditLog, BoardHistoryResponse>();

            #endregion
        }
    }
}
