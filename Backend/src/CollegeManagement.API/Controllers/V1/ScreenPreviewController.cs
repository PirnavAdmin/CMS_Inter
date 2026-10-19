using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace CollegeManagement.API.Controllers.V1
{
    [Route("api/v1/screen-previews")]
    [ApiController]
    public class ScreenPreviewController : ControllerBase
    {
        private readonly IWebHostEnvironment _env;
        private readonly string _storageDir;

        public ScreenPreviewController(IWebHostEnvironment env)
        {
            _env = env;
            _storageDir = Path.Combine(_env.ContentRootPath, "Uploads", "screen-previews");
            if (!Directory.Exists(_storageDir))
            {
                Directory.CreateDirectory(_storageDir);
            }
        }

        private static string SanitizeKey(string key)
        {
            if (string.IsNullOrWhiteSpace(key)) return "default";
            // Replace colons, slashes, backslashes, spaces with dashes
            var sanitized = Regex.Replace(key.Trim().ToLowerInvariant(), @"[^a-z0-9\-_]", "-");
            return Regex.Replace(sanitized, @"-+", "-").Trim('-');
        }

        /// <summary>
        /// Retrieves a map of all available uploaded screen preview images.
        /// </summary>
        [HttpGet]
        [AllowAnonymous]
        public IActionResult GetAllPreviews()
        {
            try
            {
                var files = Directory.GetFiles(_storageDir, "*.*")
                    .Where(f => f.EndsWith(".png", StringComparison.OrdinalIgnoreCase) ||
                                f.EndsWith(".jpg", StringComparison.OrdinalIgnoreCase) ||
                                f.EndsWith(".jpeg", StringComparison.OrdinalIgnoreCase) ||
                                f.EndsWith(".webp", StringComparison.OrdinalIgnoreCase))
                    .Select(f =>
                    {
                        var nameWithoutExt = Path.GetFileNameWithoutExtension(f);
                        var fileName = Path.GetFileName(f);
                        return new
                        {
                            screenKey = nameWithoutExt,
                            url = $"/Uploads/screen-previews/{fileName}?t={new FileInfo(f).LastWriteTimeUtc.Ticks}"
                        };
                    })
                    .ToDictionary(k => k.screenKey, v => v.url);

                return Ok(new { success = true, data = files });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        /// <summary>
        /// Uploads or replaces the screenshot image for a specific screenKey.
        /// </summary>
        [HttpPost("{screenKey}")]
        public async Task<IActionResult> UploadScreenPreview(string screenKey, [FromForm] IFormFile? file)
        {
            try
            {
                if (file == null || file.Length == 0)
                {
                    return BadRequest(new { success = false, message = "No image file provided." });
                }

                if (file.Length > 15 * 1024 * 1024)
                {
                    return BadRequest(new { success = false, message = "Image file exceeds maximum 15MB limit." });
                }

                var allowedExtensions = new[] { ".png", ".jpg", ".jpeg", ".webp" };
                var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
                if (!allowedExtensions.Contains(ext))
                {
                    return BadRequest(new { success = false, message = "Unsupported image format. Please upload PNG, JPG, or WEBP." });
                }

                var safeKey = SanitizeKey(screenKey);
                var fileName = $"{safeKey}{ext}";
                var targetPath = Path.Combine(_storageDir, fileName);

                // Overwrite any existing file with this name or other extensions
                foreach (var oldExt in allowedExtensions)
                {
                    var oldPath = Path.Combine(_storageDir, $"{safeKey}{oldExt}");
                    if (System.IO.File.Exists(oldPath))
                    {
                        try { System.IO.File.Delete(oldPath); } catch { }
                    }
                }

                using (var stream = new FileStream(targetPath, FileMode.Create, FileAccess.Write))
                {
                    await file.CopyToAsync(stream);
                }

                var relativeUrl = $"/Uploads/screen-previews/{fileName}?t={DateTime.UtcNow.Ticks}";

                return Ok(new
                {
                    success = true,
                    message = "Screen preview image uploaded successfully.",
                    screenKey = safeKey,
                    imageUrl = relativeUrl
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Failed to upload image: " + ex.Message });
            }
        }

        /// <summary>
        /// Deletes the custom screenshot image for a specific screenKey, resetting to default mockup.
        /// </summary>
        [HttpDelete("{screenKey}")]
        public IActionResult DeleteScreenPreview(string screenKey)
        {
            try
            {
                var safeKey = SanitizeKey(screenKey);
                var allowedExtensions = new[] { ".png", ".jpg", ".jpeg", ".webp" };
                bool deleted = false;

                foreach (var ext in allowedExtensions)
                {
                    var path = Path.Combine(_storageDir, $"{safeKey}{ext}");
                    if (System.IO.File.Exists(path))
                    {
                        System.IO.File.Delete(path);
                        deleted = true;
                    }
                }

                return Ok(new
                {
                    success = true,
                    message = deleted ? "Screen preview image deleted. Default mockup restored." : "No custom screenshot found to delete.",
                    screenKey = safeKey
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Failed to delete image: " + ex.Message });
            }
        }
    }
}
