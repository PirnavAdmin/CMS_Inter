using System;
using MySqlConnector;

class Program
{
    static void Main()
    {
        string connStr = "Server=collegemanagementdb-mysql-3069cc62-manikesandeep-1393.g.aivencloud.com;Port=19182;Database=CollegeManagement;User ID=avnadmin;Password=AVNS_jgPZED4pphZib4tvJID;SslMode=Required;";
        using (var conn = new MySqlConnection(connStr))
        {
            conn.Open();
            try
            {
                using var dropCmd = conn.CreateCommand();
                dropCmd.CommandText = "DROP PROCEDURE IF EXISTS `sp_UpdateCertificateFeeClearance`;";
                dropCmd.ExecuteNonQuery();

                using var cmd = conn.CreateCommand();
                cmd.CommandText = @"CREATE PROCEDURE `sp_UpdateCertificateFeeClearance`(
    IN p_CertificateId INT,
    IN p_RemarksAddition VARCHAR(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_CampusId INT
)
BEGIN
    UPDATE `certificates` c
    LEFT JOIN `StudentAdmissions` sa ON (c.AdmissionNo IS NOT NULL AND sa.AdmissionNo COLLATE utf8mb4_unicode_ci = c.AdmissionNo COLLATE utf8mb4_unicode_ci) OR (c.StudentId > 0 AND sa.AdmissionId = c.StudentId)
    LEFT JOIN `Students` s ON (c.StudentId > 0 AND s.StudentId = c.StudentId) OR (c.AdmissionNo IS NOT NULL AND s.AdmissionNo COLLATE utf8mb4_unicode_ci = c.AdmissionNo COLLATE utf8mb4_unicode_ci)
    SET c.`Remarks` = CONCAT(COALESCE(c.`Remarks`, ''), p_RemarksAddition),
        c.`UpdatedAt` = NOW()
    WHERE c.`Id` = p_CertificateId
      AND (p_CampusId IS NULL OR p_CampusId = 0 OR COALESCE(c.CampusId, sa.CampusId, s.CampusId) = p_CampusId);

    SELECT ROW_COUNT() AS AffectedRows;
END";
                cmd.ExecuteNonQuery();
                Console.WriteLine("Successfully created sp_UpdateCertificateFeeClearance!");
            }
            catch (Exception ex)
            {
                Console.WriteLine("Error: " + ex.Message);
            }
        }
    }
}