using System;
using System.Security.Cryptography;
using System.Text;

namespace CollegeManagement.API.Helpers
{
    public static class PasswordHasher
    {
        private const int SaltSize = 16;
        private const int KeySize = 32;
        private const int Iterations = 10000;
        private static readonly HashAlgorithmName HashAlgorithm = HashAlgorithmName.SHA256;

        public static string HashPassword(string password)
        {
            return BCrypt.Net.BCrypt.HashPassword(password);
        }

        public static bool VerifyPassword(string password, string hashedPassword)
        {
            if (string.IsNullOrWhiteSpace(password) || string.IsNullOrWhiteSpace(hashedPassword))
                return false;

            // Direct plaintext match check
            if (password == hashedPassword)
                return true;

            // BCrypt hash format check ($2a$, $2b$, $2y$)
            if (hashedPassword.StartsWith("$2a$") || hashedPassword.StartsWith("$2b$") || hashedPassword.StartsWith("$2y$"))
            {
                try
                {
                    return BCrypt.Net.BCrypt.Verify(password, hashedPassword);
                }
                catch
                {
                    return false;
                }
            }

            // PBKDF2 hash format check (Iterations.Salt.Hash)
            try
            {
                var parts = hashedPassword.Split('.', 3);
                if (parts.Length == 3 && int.TryParse(parts[0], out var iterations))
                {
                    byte[] salt = Convert.FromBase64String(parts[1]);
                    byte[] hash = Convert.FromBase64String(parts[2]);

                    byte[] inputHash = Rfc2898DeriveBytes.Pbkdf2(
                        Encoding.UTF8.GetBytes(password),
                        salt,
                        iterations,
                        HashAlgorithm,
                        hash.Length);

                    if (CryptographicOperations.FixedTimeEquals(hash, inputHash))
                        return true;
                }
            }
            catch
            {
                // Fallthrough
            }

            // Fallback attempt with BCrypt
            try
            {
                return BCrypt.Net.BCrypt.Verify(password, hashedPassword);
            }
            catch
            {
                return false;
            }
        }
    }
}
