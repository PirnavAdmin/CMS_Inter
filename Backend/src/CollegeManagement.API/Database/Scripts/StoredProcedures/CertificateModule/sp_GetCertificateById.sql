DROP PROCEDURE IF EXISTS sp_GetCertificateById;
CREATE PROCEDURE sp_GetCertificateById(IN p_CertificateId INT)
BEGIN
    SELECT * FROM Certificates WHERE CertificateId = p_CertificateId;
END;
