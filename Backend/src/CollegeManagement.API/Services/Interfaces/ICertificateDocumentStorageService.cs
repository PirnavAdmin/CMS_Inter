using System.Threading;
using System.Threading.Tasks;

namespace CollegeManagement.API.Services.Interfaces;

/// <summary>
/// Manages permanent, server-side document storage for generated certificates
/// in a secure directory completely outside wwwroot / public static file mappings.
/// </summary>
public interface ICertificateDocumentStorageService
{
    /// <summary>
    /// Permanently saves a generated certificate PDF to the configured server storage location.
    /// Returns the deployment-independent relative storage path, absolute path, and file size in bytes.
    /// </summary>
    Task<(string relativePath, string fullPath, long fileSize)> SaveCertificateDocumentAsync(
        string certificateNumber,
        byte[] documentBytes,
        CancellationToken ct = default);

    /// <summary>
    /// Retrieves the binary content of a stored certificate from its relative storage path.
    /// Returns null if the file does not exist.
    /// </summary>
    Task<byte[]?> GetCertificateDocumentAsync(
        string relativePath,
        CancellationToken ct = default);

    /// <summary>
    /// Checks if a certificate document exists in the configured persistent storage.
    /// </summary>
    bool DocumentExists(string relativePath);

    /// <summary>
    /// Resolves the absolute filesystem path for a relative certificate storage path.
    /// Protects against directory traversal vulnerabilities.
    /// </summary>
    string ResolvePhysicalPath(string relativePath);

    /// <summary>
    /// Gets the configured absolute storage root directory.
    /// </summary>
    string GetStorageRootPath();

    /// <summary>
    /// Compensating action: deletes an orphaned or failed certificate file.
    /// </summary>
    void CompensateDelete(string relativePath);
}
