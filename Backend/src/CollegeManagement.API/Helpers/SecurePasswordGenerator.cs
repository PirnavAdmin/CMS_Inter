using System;
using System.Security.Cryptography;

namespace CollegeManagement.API.Helpers
{
    /// <summary>
    /// Generates cryptographically secure random temporary passwords for user account provisioning.
    /// Excludes ambiguous characters (I, O, l, o, 0, 1) to ensure ease of manual entry.
    /// </summary>
    public static class SecurePasswordGenerator
    {
        private const string UpperCaseChars = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // Excludes I, O
        private const string LowerCaseChars = "abcdefghijkmnpqrstuvwxyz"; // Excludes l, o
        private const string DigitChars = "23456789";                   // Excludes 0, 1
        private const string SpecialChars = "!@#$%*?";
        private const string AllChars = UpperCaseChars + LowerCaseChars + DigitChars + SpecialChars;

        /// <summary>
        /// Generates a cryptographically strong random password.
        /// </summary>
        /// <param name="length">The desired password length (minimum 12, default 14).</param>
        /// <returns>Plaintext temporary password.</returns>
        public static string Generate(int length = 14)
        {
            if (length < 12)
            {
                length = 12;
            }

            var passwordChars = new char[length];

            // Guarantee at least one character from each character set
            passwordChars[0] = UpperCaseChars[RandomNumberGenerator.GetInt32(UpperCaseChars.Length)];
            passwordChars[1] = LowerCaseChars[RandomNumberGenerator.GetInt32(LowerCaseChars.Length)];
            passwordChars[2] = DigitChars[RandomNumberGenerator.GetInt32(DigitChars.Length)];
            passwordChars[3] = SpecialChars[RandomNumberGenerator.GetInt32(SpecialChars.Length)];

            // Fill remaining characters from the combined pool
            for (int i = 4; i < length; i++)
            {
                passwordChars[i] = AllChars[RandomNumberGenerator.GetInt32(AllChars.Length)];
            }

            // Cryptographically secure Fisher-Yates shuffle
            for (int i = length - 1; i > 0; i--)
            {
                int j = RandomNumberGenerator.GetInt32(i + 1);
                (passwordChars[i], passwordChars[j]) = (passwordChars[j], passwordChars[i]);
            }

            return new string(passwordChars);
        }
    }
}
