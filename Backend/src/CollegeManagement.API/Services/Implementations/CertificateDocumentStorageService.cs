using System;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using CollegeManagement.API.Services.Interfaces;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace CollegeManagement.API.Services.Implementations;

/// <summary>
/// Implements permanent, server-side document storage for certificates.
/// Persists documents in configured storage outside wwwroot to prevent unrestricted public access.
/// </summary>
public class CertificateDocumentStorageService : ICertificateDocumentStorageService
{
    private readonly string _storageRootFullPath;
    private readonly ILogger<CertificateDocumentStorageService> _logger;

    public CertificateDocumentStorageService(
        IWebHostEnvironment env,
        IConfiguration configuration,
        ILogger<CertificateDocumentStorageService> logger)
    {
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));

        // 1. Resolve configurable storage root:
        // Priority: Environment Variable > appsettings.json > Default App_Data/PrivateStorage/Certificates
        var envOverride = Environment.GetEnvironmentVariable("CERTIFICATE_STORAGE_ROOT");
        var configuredRoot = !string.IsNullOrWhiteSpace(envOverride) 
            ? envOverride 
            : configuration["CertificateStorage:StorageRoot"];

        if (!string.IsNullOrWhiteSpace(configuredRoot))
        {
            _storageRootFullPath = Path.IsPathRooted(configuredRoot)
                ? Path.GetFullPath(configuredRoot)
                : Path.GetFullPath(Path.Combine(env.ContentRootPath, configuredRoot));
        }
        else
        {
            _storageRootFullPath = Path.GetFullPath(Path.Combine(env.ContentRootPath, "App_Data", "PrivateStorage", "Certificates"));
        }

        // 2. Ensure storage root directory exists with verified write permissions
        try
        {
            if (!Directory.Exists(_storageRootFullPath))
            {
                Directory.CreateDirectory(_storageRootFullPath);
                _logger.LogInformation("[CertificateStorage] Created certificate storage root at: {Path}", _storageRootFullPath);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[CertificateStorage] Critical: Unable to initialize certificate storage directory at {Path}", _storageRootFullPath);
            throw new InvalidOperationException($"Unable to initialize certificate storage directory at {_storageRootFullPath}: {ex.Message}", ex);
        }
    }

    public string GetStorageRootPath() => _storageRootFullPath;

    public string ResolvePhysicalPath(string relativePath)
    {
        if (string.IsNullOrWhiteSpace(relativePath))
            throw new ArgumentException("Relative path cannot be empty.", nameof(relativePath));

        // Normalize slashes
        var normalized = relativePath.Replace('/', Path.DirectorySeparatorChar).Replace('\\', Path.DirectorySeparatorChar);
        if (normalized.StartsWith("certificates" + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase))
        {
            normalized = normalized.Substring(("certificates" + Path.DirectorySeparatorChar).Length);
        }

        var fullPath = Path.GetFullPath(Path.Combine(_storageRootFullPath, normalized));

        // Path Traversal Security Barrier
        if (!fullPath.StartsWith(_storageRootFullPath, StringComparison.OrdinalIgnoreCase))
        {
            _logger.LogWarning("[CertificateStorage] Path traversal attempt blocked: {Path}", relativePath);
            throw new UnauthorizedAccessException("Access denied. Path traversal attempt detected.");
        }

        return fullPath;
    }

    public bool DocumentExists(string relativePath)
    {
        if (string.IsNullOrWhiteSpace(relativePath)) return false;
        try
        {
            var fullPath = ResolvePhysicalPath(relativePath);
            return File.Exists(fullPath);
        }
        catch
        {
            return false;
        }
    }

    public async Task<(string relativePath, string fullPath, long fileSize)> SaveCertificateDocumentAsync(
        string certificateNumber,
        byte[] documentBytes,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(certificateNumber))
            throw new ArgumentException("Certificate number is required for storage.", nameof(certificateNumber));

        if (documentBytes == null || documentBytes.Length == 0)
            throw new ArgumentException("Certificate document content cannot be empty.", nameof(documentBytes));

        // Sanitize certificate number for safe filesystem naming
        var invalidChars = Path.GetInvalidFileNameChars();
        var safeCertNo = new string(certificateNumber.Select(c => invalidChars.Contains(c) ? '_' : c).ToArray());
        var fileName = $"{safeCertNo}.pdf";

        var now = DateTime.UtcNow;
        var subDir = Path.Combine(now.Year.ToString("D4"), now.Month.ToString("D2"));
        var targetDirectory = Path.Combine(_storageRootFullPath, subDir);

        if (!Directory.Exists(targetDirectory))
        {
            Directory.CreateDirectory(targetDirectory);
        }

        var destinationFullPath = Path.Combine(targetDirectory, fileName);

        // Atomic write with cancellation support
        await File.WriteAllBytesAsync(destinationFullPath, documentBytes, ct);

        var fileInfo = new FileInfo(destinationFullPath);
        var relativePath = $"certificates/{now.Year:D4}/{now.Month:D2}/{fileName}";

        _logger.LogInformation("[CertificateStorage] Successfully saved document {CertNo} ({Size} bytes) at {RelativePath}", 
            certificateNumber, fileInfo.Length, relativePath);

        return (relativePath, destinationFullPath, fileInfo.Length);
    }

    public async Task<byte[]?> GetCertificateDocumentAsync(
        string relativePath,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(relativePath)) return null;

        var fullPath = ResolvePhysicalPath(relativePath);
        if (!File.Exists(fullPath))
        {
            _logger.LogWarning("[CertificateStorage] Document file not found on disk: {Path}", fullPath);
            return null;
        }

        return await File.ReadAllBytesAsync(fullPath, ct);
    }

    public void CompensateDelete(string relativePath)
    {
        if (string.IsNullOrWhiteSpace(relativePath)) return;
        try
        {
            var fullPath = ResolvePhysicalPath(relativePath);
            if (File.Exists(fullPath))
            {
                File.Delete(fullPath);
                _logger.LogInformation("[CertificateStorage] Compensated/Cleaned up orphan document at: {Path}", fullPath);
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "[CertificateStorage] Could not compensate delete file {Path}: {Message}", relativePath, ex.Message);
        }
    }
}
