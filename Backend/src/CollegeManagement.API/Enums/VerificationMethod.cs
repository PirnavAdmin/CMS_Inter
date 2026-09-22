namespace CollegeManagement.API.Enums
{
    /// <summary>
    /// Specifies the method used to verify attendance (e.g., Manual, Biometric, WebCheckIn).
    /// </summary>
    public enum VerificationMethod : byte
    {
        /// <summary>
        /// Attendance marked manually by admin or faculty.
        /// </summary>
        Manual = 1,

        /// <summary>
        /// Attendance captured via Biometric scanner (fingerprint/facial recognition/RFID).
        /// </summary>
        Biometric = 2,

        /// <summary>
        /// Attendance recorded via Web Portal Check-In.
        /// </summary>
        WebCheckIn = 3,

        /// <summary>
        /// Attendance recorded via Mobile App Check-In.
        /// </summary>
        MobileApp = 4
    }
}
