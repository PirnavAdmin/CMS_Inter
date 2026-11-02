using System.Collections.Generic;
using System.Threading;
using CollegeManagement.API.DTOs.Certificate;

namespace CollegeManagement.API.Services.Interfaces;

public interface ICertificateExportService
{
    byte[] GenerateCertificatePdf(CertificatePreviewResponseDto preview, string? signaturePath = null);
    byte[] GenerateBulkCertificatesPdf(IReadOnlyList<CertificateResponseDto> certificates, CancellationToken ct = default);
    byte[] ExportCertificatesCsv(IReadOnlyList<CertificateResponseDto> certificates);
    CertificatePreviewResponseDto BuildPreviewFallback(CertificateResponseDto cert);
}
