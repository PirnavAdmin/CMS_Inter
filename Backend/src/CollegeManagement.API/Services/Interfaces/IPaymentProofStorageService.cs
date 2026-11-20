using System;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;

namespace CollegeManagement.API.Services.Interfaces;

public sealed class ValidatedPaymentProofFile
{
    public bool IsValid { get; init; }
    public int HttpStatusCode { get; init; } = 400;
    public string? ErrorCode { get; init; }
    public string? ErrorMessage { get; init; }
    public byte[] Data { get; init; } = Array.Empty<byte>();
    public long SizeBytes { get; init; }
    public string CanonicalContentType { get; init; } = string.Empty;
    public string CanonicalExtension { get; init; } = string.Empty;
    public string SanitizedOriginalFileName { get; init; } = string.Empty;
    public string Sha256Hash { get; init; } = string.Empty;
}

public sealed class StoredPaymentProofFile
{
    public string StoredFileName { get; init; } = string.Empty;
    public string StorageRelativePath { get; init; } = string.Empty;
    public string FullPhysicalPath { get; init; } = string.Empty;
    public long WrittenBytes { get; init; }
}

/// <summary>
/// Handles strict magic-byte validation and isolated private filesystem storage
/// for Direct UPI QR / bank transfer payment proof attachments.
/// </summary>
public interface IPaymentProofStorageService
{
    long MaxAllowedFileSizeBytes { get; }

    Task<ValidatedPaymentProofFile> ValidateAndBufferAsync(
        IFormFile? file,
        CancellationToken cancellationToken = default);

    Task<StoredPaymentProofFile> SaveValidatedFileAsync(
        ValidatedPaymentProofFile validatedFile,
        int transactionId,
        DateTime timestampUtc,
        CancellationToken cancellationToken = default);

    Task<bool> VerifyStoredFileAsync(
        string storageRelativePath,
        long expectedSizeBytes,
        string expectedSha256Hash,
        CancellationToken cancellationToken = default);

    Stream? OpenReadStreamIfValid(string storageRelativePath, out long actualSizeBytes);

    void DeleteStoredFileQuietly(string? storageRelativePath);
}
