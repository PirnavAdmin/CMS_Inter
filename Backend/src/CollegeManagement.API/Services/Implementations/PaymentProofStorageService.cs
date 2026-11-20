using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using CollegeManagement.API.Services.Interfaces;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace CollegeManagement.API.Services.Implementations;

/// <summary>
/// Validates actual binary signatures (JPG/JPEG, PNG, PDF) and persists attachments in
/// a private directory completely outside wwwroot / public static file mappings.
/// </summary>
public class PaymentProofStorageService : IPaymentProofStorageService
{
    public const long MaxFileSizeBytes = 5L * 1024L * 1024L; // 5 MB exact

    private static readonly HashSet<string> AllowedExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".jpg", ".jpeg", ".png", ".pdf"
    };

    private static readonly HashSet<string> ExplicitlyRejectedClientMimeTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "image/svg+xml",
        "text/html",
        "application/xhtml+xml",
        "application/javascript",
        "text/javascript",
        "application/x-msdownload",
        "application/x-executable",
        "application/x-sh",
        "text/plain"
    };

    private readonly string _storageRootFullPath;
    private readonly ILogger<PaymentProofStorageService> _logger;

    public long MaxAllowedFileSizeBytes => MaxFileSizeBytes;

    public PaymentProofStorageService(
        IWebHostEnvironment env,
        IConfiguration configuration,
        ILogger<PaymentProofStorageService> logger)
    {
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));

        var configuredRoot = configuration["PaymentGateway:ProofStorageRoot"];
        var rawRoot = !string.IsNullOrWhiteSpace(configuredRoot)
            ? (Path.IsPathRooted(configuredRoot)
                ? configuredRoot
                : Path.Combine(env.ContentRootPath, configuredRoot))
            : Path.Combine(env.ContentRootPath, "App_Data", "PrivateStorage", "PaymentProofs");

        _storageRootFullPath = Path.GetFullPath(rawRoot).TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar);

        var webRoot = Path.GetFullPath(env.WebRootPath ?? Path.Combine(env.ContentRootPath, "wwwroot"))
            .TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar);
        var publicUploads = Path.GetFullPath(Path.Combine(env.ContentRootPath, "Uploads"))
            .TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar);

        if (IsSubPathOf(_storageRootFullPath, webRoot) || IsSubPathOf(_storageRootFullPath, publicUploads))
        {
            throw new InvalidOperationException(
                $"Payment proof private storage root '{_storageRootFullPath}' cannot reside under public webroot or static Uploads folders.");
        }

        Directory.CreateDirectory(_storageRootFullPath);
    }

    public async Task<ValidatedPaymentProofFile> ValidateAndBufferAsync(
        IFormFile? file,
        CancellationToken cancellationToken = default)
    {
        if (file == null || file.Length <= 0)
        {
            return Fail(StatusCodes.Status400BadRequest, "EMPTY_FILE",
                "Uploaded payment proof file is empty (0 bytes). Please upload a valid JPG, JPEG, PNG, or PDF file.");
        }

        if (file.Length > MaxFileSizeBytes)
        {
            return Fail(StatusCodes.Status413PayloadTooLarge, "FILE_TOO_LARGE",
                "Payment proof file size exceeds the maximum allowed limit of 5 MB (5,242,880 bytes).");
        }

        var rawClientMime = (file.ContentType ?? string.Empty).Split(';')[0].Trim();
        if (!string.IsNullOrWhiteSpace(rawClientMime) && ExplicitlyRejectedClientMimeTypes.Contains(rawClientMime))
        {
            return Fail(StatusCodes.Status400BadRequest, "INVALID_FILE_TYPE",
                $"Unsupported file content type '{rawClientMime}'. Only JPG, JPEG, PNG, and PDF files are allowed.");
        }

        var rawOriginalName = Path.GetFileName(file.FileName ?? string.Empty);
        var rawExt = Path.GetExtension(rawOriginalName)?.ToLowerInvariant() ?? string.Empty;
        if (!string.IsNullOrEmpty(rawExt) && !AllowedExtensions.Contains(rawExt))
        {
            return Fail(StatusCodes.Status400BadRequest, "INVALID_FILE_TYPE",
                $"Unsupported file extension '{rawExt}'. Only JPG, JPEG, PNG, and PDF files are allowed.");
        }

        // Read bounded bytes from stream regardless of reported header Content-Length
        using var ms = new MemoryStream();
        await using var input = file.OpenReadStream();
        var buffer = new byte[81920];
        long totalRead = 0;
        int bytesRead;
        while ((bytesRead = await input.ReadAsync(buffer.AsMemory(0, buffer.Length), cancellationToken)) > 0)
        {
            totalRead += bytesRead;
            if (totalRead > MaxFileSizeBytes)
            {
                return Fail(StatusCodes.Status413PayloadTooLarge, "FILE_TOO_LARGE",
                    "Payment proof file size exceeds the maximum allowed limit of 5 MB (5,242,880 bytes).");
            }
            await ms.WriteAsync(buffer.AsMemory(0, bytesRead), cancellationToken);
        }

        if (totalRead <= 0)
        {
            return Fail(StatusCodes.Status400BadRequest, "EMPTY_FILE",
                "Uploaded payment proof file is empty (0 bytes). Please upload a valid JPG, JPEG, PNG, or PDF file.");
        }

        var data = ms.ToArray();
        if (!TryDetectFileTypeFromMagicBytes(data, out var canonicalMime, out var canonicalExt))
        {
            return Fail(StatusCodes.Status400BadRequest, "INVALID_FILE_SIGNATURE",
                "Uploaded file content does not match a valid JPG, JPEG, PNG, or PDF signature.");
        }

        if (!string.IsNullOrEmpty(rawExt) && !IsExtensionCompatibleWithCanonical(rawExt, canonicalExt))
        {
            return Fail(StatusCodes.Status400BadRequest, "FILE_EXTENSION_MISMATCH",
                $"File extension '{rawExt}' does not match the actual '{canonicalMime}' file content.");
        }

        var sanitizedName = SanitizeOriginalFileName(rawOriginalName, rawExt, canonicalExt);
        var sha256Hex = Convert.ToHexString(SHA256.HashData(data)).ToLowerInvariant();

        return new ValidatedPaymentProofFile
        {
            IsValid = true,
            HttpStatusCode = StatusCodes.Status200OK,
            Data = data,
            SizeBytes = data.LongLength,
            CanonicalContentType = canonicalMime,
            CanonicalExtension = canonicalExt,
            SanitizedOriginalFileName = sanitizedName,
            Sha256Hash = sha256Hex
        };
    }

    public async Task<StoredPaymentProofFile> SaveValidatedFileAsync(
        ValidatedPaymentProofFile validatedFile,
        int transactionId,
        DateTime timestampUtc,
        CancellationToken cancellationToken = default)
    {
        if (!validatedFile.IsValid || validatedFile.Data.Length == 0)
        {
            throw new InvalidOperationException("Cannot save an unvalidated or empty payment proof file.");
        }

        var yearDir = timestampUtc.ToString("yyyy");
        var monthDir = timestampUtc.ToString("MM");
        var storedFileName = $"proof_txn_{transactionId}_{Guid.NewGuid():N}{validatedFile.CanonicalExtension}";
        var relativePath = $"{yearDir}/{monthDir}/{storedFileName}";

        var fullPath = ResolveSafePhysicalPath(relativePath);
        var directory = Path.GetDirectoryName(fullPath)!;
        Directory.CreateDirectory(directory);

        await using (var fs = new FileStream(fullPath, FileMode.CreateNew, FileAccess.Write, FileShare.None, 81920, useAsync: true))
        {
            await fs.WriteAsync(validatedFile.Data.AsMemory(0, validatedFile.Data.Length), cancellationToken);
            await fs.FlushAsync(cancellationToken);
        }

        var verified = await VerifyStoredFileAsync(relativePath, validatedFile.SizeBytes, validatedFile.Sha256Hash, cancellationToken);
        if (!verified)
        {
            DeleteStoredFileQuietly(relativePath);
            throw new IOException($"Failed disk persistence verification for payment proof '{relativePath}'.");
        }

        return new StoredPaymentProofFile
        {
            StoredFileName = storedFileName,
            StorageRelativePath = relativePath,
            FullPhysicalPath = fullPath,
            WrittenBytes = validatedFile.SizeBytes
        };
    }

    public async Task<bool> VerifyStoredFileAsync(
        string storageRelativePath,
        long expectedSizeBytes,
        string expectedSha256Hash,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var fullPath = ResolveSafePhysicalPath(storageRelativePath);
            if (!File.Exists(fullPath)) return false;

            var info = new FileInfo(fullPath);
            if (info.Length <= 0 || info.Length != expectedSizeBytes) return false;

            await using var fs = new FileStream(fullPath, FileMode.Open, FileAccess.Read, FileShare.Read, 65536, useAsync: true);
            var hashBytes = await SHA256.HashDataAsync(fs, cancellationToken);
            var actualHash = Convert.ToHexString(hashBytes).ToLowerInvariant();
            return string.Equals(actualHash, expectedSha256Hash, StringComparison.OrdinalIgnoreCase);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error verifying persisted payment proof at '{Path}'.", storageRelativePath);
            return false;
        }
    }

    public Stream? OpenReadStreamIfValid(string storageRelativePath, out long actualSizeBytes)
    {
        actualSizeBytes = 0;
        if (string.IsNullOrWhiteSpace(storageRelativePath)) return null;

        try
        {
            var fullPath = ResolveSafePhysicalPath(storageRelativePath);
            if (!File.Exists(fullPath)) return null;

            var info = new FileInfo(fullPath);
            if (info.Length <= 0) return null;

            actualSizeBytes = info.Length;
            return new FileStream(fullPath, FileMode.Open, FileAccess.Read, FileShare.Read, 65536, useAsync: true);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to open private payment proof file '{Path}'.", storageRelativePath);
            return null;
        }
    }

    public void DeleteStoredFileQuietly(string? storageRelativePath)
    {
        if (string.IsNullOrWhiteSpace(storageRelativePath)) return;

        try
        {
            var fullPath = ResolveSafePhysicalPath(storageRelativePath);
            if (File.Exists(fullPath))
            {
                File.Delete(fullPath);
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Could not clean up private payment proof file '{Path}'.", storageRelativePath);
        }
    }

    private string ResolveSafePhysicalPath(string relativePath)
    {
        var sanitizedRel = relativePath
            .Replace('/', Path.DirectorySeparatorChar)
            .Replace('\\', Path.DirectorySeparatorChar)
            .TrimStart(Path.DirectorySeparatorChar);

        if (string.IsNullOrWhiteSpace(sanitizedRel) || sanitizedRel.Contains("..", StringComparison.Ordinal))
        {
            throw new InvalidOperationException("Invalid relative storage path.");
        }

        var combined = Path.GetFullPath(Path.Combine(_storageRootFullPath, sanitizedRel));
        if (!IsSubPathOf(combined, _storageRootFullPath))
        {
            throw new InvalidOperationException("Resolved path escapes private storage root.");
        }

        return combined;
    }

    private static bool TryDetectFileTypeFromMagicBytes(
        byte[] data,
        out string canonicalMime,
        out string canonicalExt)
    {
        canonicalMime = string.Empty;
        canonicalExt = string.Empty;

        // 1. PNG: 8-byte PNG signature + IHDR chunk header at bytes 12..15
        if (data.Length >= 24 &&
            data[0] == 0x89 && data[1] == 0x50 && data[2] == 0x4E && data[3] == 0x47 &&
            data[4] == 0x0D && data[5] == 0x0A && data[6] == 0x1A && data[7] == 0x0A &&
            data[12] == 0x49 && data[13] == 0x48 && data[14] == 0x44 && data[15] == 0x52)
        {
            canonicalMime = "image/png";
            canonicalExt = ".png";
            return true;
        }

        // 2. JPEG / JPG: FF D8 FF followed by valid JPEG marker (>= 0xC0)
        if (data.Length >= 4 &&
            data[0] == 0xFF && data[1] == 0xD8 && data[2] == 0xFF && data[3] >= 0xC0)
        {
            canonicalMime = "image/jpeg";
            canonicalExt = ".jpg";
            return true;
        }

        // 3. PDF: "%PDF-x.y" signature
        if (data.Length >= 9 &&
            data[0] == 0x25 && // %
            data[1] == 0x50 && // P
            data[2] == 0x44 && // D
            data[3] == 0x46 && // F
            data[4] == 0x2D && // -
            data[5] >= (byte)'0' && data[5] <= (byte)'9' &&
            data[6] == (byte)'.' &&
            data[7] >= (byte)'0' && data[7] <= (byte)'9')
        {
            canonicalMime = "application/pdf";
            canonicalExt = ".pdf";
            return true;
        }

        return false;
    }

    private static bool IsExtensionCompatibleWithCanonical(string clientExt, string canonicalExt)
    {
        if (string.IsNullOrEmpty(clientExt)) return true;
        if (canonicalExt == ".jpg")
        {
            return clientExt.Equals(".jpg", StringComparison.OrdinalIgnoreCase) ||
                   clientExt.Equals(".jpeg", StringComparison.OrdinalIgnoreCase);
        }

        return clientExt.Equals(canonicalExt, StringComparison.OrdinalIgnoreCase);
    }

    private static string SanitizeOriginalFileName(string rawName, string rawExt, string canonicalExt)
    {
        var invalidChars = Path.GetInvalidFileNameChars();
        var sb = new StringBuilder(rawName.Length);
        foreach (var ch in rawName)
        {
            if (char.IsControl(ch) || invalidChars.Contains(ch) || ch == '"' || ch == ';' || ch == '\\' || ch == '/')
                continue;
            sb.Append(ch);
        }

        var cleaned = sb.ToString().Replace("..", ".").Trim().Trim('.');
        if (string.IsNullOrWhiteSpace(cleaned))
        {
            return $"payment-proof{canonicalExt}";
        }

        var extToUse = canonicalExt == ".jpg" && rawExt.Equals(".jpeg", StringComparison.OrdinalIgnoreCase)
            ? ".jpeg"
            : canonicalExt;

        var baseName = Path.GetFileNameWithoutExtension(cleaned)?.Trim().Trim('.');
        if (string.IsNullOrWhiteSpace(baseName))
        {
            baseName = "payment-proof";
        }

        if (baseName.Length > 180)
        {
            baseName = baseName[..180];
        }

        return $"{baseName}{extToUse}";
    }

    private static bool IsSubPathOf(string candidatePath, string rootPath)
    {
        if (string.Equals(candidatePath, rootPath, StringComparison.OrdinalIgnoreCase))
            return true;

        var normalizedRoot = rootPath.EndsWith(Path.DirectorySeparatorChar)
            ? rootPath
            : rootPath + Path.DirectorySeparatorChar;

        return candidatePath.StartsWith(normalizedRoot, StringComparison.OrdinalIgnoreCase);
    }

    private static ValidatedPaymentProofFile Fail(int statusCode, string errorCode, string message) => new()
    {
        IsValid = false,
        HttpStatusCode = statusCode,
        ErrorCode = errorCode,
        ErrorMessage = message
    };
}
