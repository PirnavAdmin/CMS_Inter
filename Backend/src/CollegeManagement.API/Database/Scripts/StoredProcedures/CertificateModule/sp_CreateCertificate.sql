DROP PROCEDURE IF EXISTS sp_CreateCertificate;
CREATE PROCEDURE sp_CreateCertificate(
    IN p_StudentId INT,
    IN p_CertificateNumber VARCHAR(40),
    IN p_AdmissionNo VARCHAR(30),
    IN p_StudentName VARCHAR(150),
    IN p_GroupName VARCHAR(100),
    IN p_AcademicLevel VARCHAR(100),
    IN p_AcademicYear VARCHAR(50),
    IN p_CertificateType VARCHAR(100),
    IN p_Purpose VARCHAR(250),
    IN p_Remarks VARCHAR(1000)
)
BEGIN
    INSERT INTO Certificates
    (CertificateNumber, StudentId, AdmissionNo, StudentName, GroupName, AcademicLevel,
     AcademicYear, CertificateType, Purpose, Remarks, Status, GeneratedAt, IsActive)
    VALUES
    (p_CertificateNumber, p_StudentId, p_AdmissionNo, p_StudentName, p_GroupName, p_AcademicLevel,
     p_AcademicYear, p_CertificateType, p_Purpose, p_Remarks, 'Generated', UTC_TIMESTAMP(), 1);
    SELECT * FROM Certificates WHERE CertificateId = LAST_INSERT_ID();
END;
