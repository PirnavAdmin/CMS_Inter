using System;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.Settings;
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Services.Interfaces;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;

namespace CollegeManagement.API.Services.Implementations
{
    public class LandingPageService : ILandingPageService
    {
        private readonly ILandingPageRepository _repository;
        private readonly IWebHostEnvironment _env;
        private readonly ILogger<LandingPageService>? _logger;

        private static readonly string[] AllowedExtensions = { ".png", ".jpg", ".jpeg", ".webp", ".svg" };
        private const long MaxFileSize = 2 * 1024 * 1024; // 2 MB

        public LandingPageService(
            ILandingPageRepository repository,
            IWebHostEnvironment env,
            ILogger<LandingPageService>? logger = null)
        {
            _repository = repository;
            _env = env;
            _logger = logger;
        }

        public async Task<LandingPageConfigDto?> GetConfigAsync(int collegeId, CancellationToken ct = default)
        {
            return await _repository.GetByCollegeIdAsync(collegeId, ct);
        }

        public async Task<LandingPageConfigDto?> SaveConfigAsync(SaveLandingPageConfigRequest request, int userId, CancellationToken ct = default)
        {
            return await _repository.SaveAsync(request, userId, ct);
        }

        public async Task<LandingPageConfigDto?> GetPublicConfigAsync(string? collegeCode, int? collegeId, CancellationToken ct = default)
        {
            return await _repository.GetPublicAsync(collegeCode, collegeId, ct);
        }

        public async Task<string> UploadImageAsync(IFormFile file, string slot, int collegeId, CancellationToken ct = default)
        {
            if (file == null || file.Length == 0)
                throw new ArgumentException("A valid image file must be provided.");

            if (file.Length > MaxFileSize)
                throw new ArgumentException("Each image must be no larger than 2 MB.");

            var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (!AllowedExtensions.Contains(ext))
                throw new ArgumentException("Allowed formats are PNG, JPEG, WebP, and SVG.");

            var cleanSlot = string.IsNullOrWhiteSpace(slot) ? "asset" : Path.GetFileNameWithoutExtension(slot);
            var safeFileName = $"landing_{collegeId}_{cleanSlot}_{Guid.NewGuid():N}{ext}";

            var rootPath = _env.WebRootPath ?? Path.Combine(_env.ContentRootPath, "wwwroot");
            var uploadsFolder = Path.Combine(rootPath, "uploads", "landing");

            if (!Directory.Exists(uploadsFolder))
            {
                Directory.CreateDirectory(uploadsFolder);
            }

            var filePath = Path.Combine(uploadsFolder, safeFileName);
            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await file.CopyToAsync(stream, ct);
            }

            _logger?.LogInformation("Uploaded landing page image for CollegeId {CollegeId}, slot {Slot}: {FileName}", collegeId, slot, safeFileName);
            return $"/uploads/landing/{safeFileName}";
        }
    }
}
