DROP PROCEDURE IF EXISTS sp_GetCertificates;
CREATE PROCEDURE sp_GetCertificates(IN p_Search VARCHAR(150), IN p_Status VARCHAR(30))
BEGIN
    SELECT CertificateId, CertificateNumber, StudentId, AdmissionNo, StudentName,
           GroupName, AcademicLevel, AcademicYear, CertificateType, Purpose,
           Remarks, Status, GeneratedAt, ReviewedAt, ApprovedAt, IssuedAt, IssuedBy, IsActive
    FROM Certificates
    WHERE (p_Status IS NULL OR p_Status = '' OR p_Status = 'All' OR Status = p_Status)
      AND (p_Search IS NULL OR p_Search = '' OR CertificateNumber LIKE CONCAT('%', p_Search, '%')
           OR AdmissionNo LIKE CONCAT('%', p_Search, '%')
           OR StudentName LIKE CONCAT('%', p_Search, '%')
           OR CertificateType LIKE CONCAT('%', p_Search, '%'))
    ORDER BY CertificateId DESC;
END;
