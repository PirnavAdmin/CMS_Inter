using System;
using System.Security.Cryptography;
using System.Text;

namespace CollegeManagement.API.Helpers;

/// <summary>
/// Provides constant-time HMAC-SHA256 signature verification
/// for Razorpay webhook payloads and checkout signatures to prevent timing attacks.
/// </summary>
public static class WebhookSecurityHelper
{
    /// <summary>
    /// Verifies the Razorpay webhook X-Razorpay-Signature header
    /// against the raw request body using the configured webhook secret.
    /// Uses CryptographicOperations.FixedTimeEquals to prevent timing attacks.
    /// </summary>
    public static bool VerifyRazorpaySignature(
        string requestBody, string signature, string webhookSecret)
    {
        if (string.IsNullOrEmpty(requestBody) ||
            string.IsNullOrEmpty(signature) ||
            string.IsNullOrEmpty(webhookSecret))
            return false;

        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(webhookSecret));
        var computedHash = hmac.ComputeHash(Encoding.UTF8.GetBytes(requestBody));
        var computedSignature = BitConverter.ToString(computedHash)
            .Replace("-", "")
            .ToLowerInvariant();

        var expectedBytes = Encoding.UTF8.GetBytes(computedSignature);
        var actualBytes = Encoding.UTF8.GetBytes(signature.ToLowerInvariant());

        if (expectedBytes.Length != actualBytes.Length)
            return false;

        return CryptographicOperations.FixedTimeEquals(expectedBytes, actualBytes);
    }

    /// <summary>
    /// Verifies Razorpay checkout payment signature:
    /// SHA256(orderId + "|" + paymentId, keySecret) == signature
    /// </summary>
    public static bool VerifyPaymentSignature(
        string orderId, string paymentId, string signature, string keySecret)
    {
        if (string.IsNullOrEmpty(orderId) ||
            string.IsNullOrEmpty(paymentId) ||
            string.IsNullOrEmpty(signature) ||
            string.IsNullOrEmpty(keySecret))
            return false;

        var payload = $"{orderId}|{paymentId}";
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(keySecret));
        var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(payload));
        var expected = BitConverter.ToString(hash).Replace("-", "").ToLowerInvariant();

        return CryptographicOperations.FixedTimeEquals(
            Encoding.UTF8.GetBytes(expected),
            Encoding.UTF8.GetBytes(signature.ToLowerInvariant()));
    }
}
