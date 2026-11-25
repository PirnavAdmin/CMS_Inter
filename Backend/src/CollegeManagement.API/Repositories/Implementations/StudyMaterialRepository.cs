using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using CollegeManagement.API.Data;
using CollegeManagement.API.Models;
using CollegeManagement.API.Repositories.Interfaces;

namespace CollegeManagement.API.Repositories.Implementations
{
    public class StudyMaterialRepository : IStudyMaterialRepository
    {
        private readonly AppDbContext _context;
        private readonly IHttpContextAccessor? _httpContextAccessor;

        public StudyMaterialRepository(AppDbContext context, IHttpContextAccessor? httpContextAccessor = null)
        {
            _context = context;
            _httpContextAccessor = httpContextAccessor;
        }

        private int ResolveCollegeId()
        {
            var claim = _httpContextAccessor?.HttpContext?.User?.FindFirst("CollegeId")?.Value
                     ?? _httpContextAccessor?.HttpContext?.User?.FindFirst("collegeId")?.Value;
            if (int.TryParse(claim, out int cid) && cid > 0) return cid;
            return 1;
        }

        private int ResolveCampusId()
        {
            var claim = _httpContextAccessor?.HttpContext?.User?.FindFirst("CampusId")?.Value
                     ?? _httpContextAccessor?.HttpContext?.User?.FindFirst("campusId")?.Value;
            if (int.TryParse(claim, out int cid) && cid > 0) return cid;
            if (_httpContextAccessor?.HttpContext?.Request.Headers.TryGetValue("X-Campus-Id", out var h) == true &&
                int.TryParse(h.FirstOrDefault(), out int hid) && hid > 0) return hid;
            return 0;
        }

        public async Task<IEnumerable<StudyMaterial>> GetAllAsync()
        {
            int collegeId = ResolveCollegeId();
            int campusId = ResolveCampusId();

            var query = _context.StudyMaterials.Where(x => x.CollegeId == collegeId);
            if (campusId > 0)
            {
                query = query.Where(x => x.CampusId == campusId);
            }

            return await query.OrderByDescending(x => x.StudyMaterialId).ToListAsync();
        }

        public async Task<StudyMaterial?> GetByIdAsync(int id)
        {
            int collegeId = ResolveCollegeId();
            return await _context.StudyMaterials
                .FirstOrDefaultAsync(x => x.StudyMaterialId == id && x.CollegeId == collegeId);
        }

        public async Task AddAsync(StudyMaterial studyMaterial)
        {
            if (studyMaterial.CollegeId <= 0)
            {
                studyMaterial.CollegeId = ResolveCollegeId();
            }
            if (studyMaterial.CampusId <= 0)
            {
                int campusId = ResolveCampusId();
                studyMaterial.CampusId = campusId > 0 ? campusId : 1;
            }

            await _context.StudyMaterials.AddAsync(studyMaterial);
            await _context.SaveChangesAsync();
        }
    }
}
