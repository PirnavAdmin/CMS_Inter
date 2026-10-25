using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace CollegeManagement.API.Helpers
{
    public static class AuditDataSanitizer
    {
        private static readonly string[] SensitiveKeywords = new[]
        {
            "password", "passwordhash", "passwordsalt", "oldpassword", "newpassword",
            "token", "accesstoken", "refreshtoken", "bearer", "authorization",
            "cookie", "set-cookie", "otp", "securitystamp", "pin", "secret",
            "apikey", "api_key", "cvv", "cv2", "cardnumber", "card_number",
            "creditcard", "bankaccount", "accountnumber", "privatekey"
        };

        public static bool IsSensitivePropertyName(string? propertyName)
        {
            if (string.IsNullOrWhiteSpace(propertyName)) return false;
            var lower = propertyName.ToLowerInvariant().Replace("_", "").Replace("-", "");
            return SensitiveKeywords.Any(k => lower.Contains(k.Replace("_", "").Replace("-", "")));
        }

        public static string SanitizeValue(string? propertyName, object? value)
        {
            if (value == null) return string.Empty;
            if (IsSensitivePropertyName(propertyName))
            {
                return "[REDACTED]";
            }

            var str = value.ToString() ?? string.Empty;
            if (str.TrimStart().StartsWith("{") || str.TrimStart().StartsWith("["))
            {
                try
                {
                    return SanitizeJsonString(str);
                }
                catch
                {
                    // If JSON parsing fails, return as string
                }
            }

            return str;
        }

        public static Dictionary<string, object?> SanitizeDictionary(IDictionary<string, object?>? dict)
        {
            var result = new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase);
            if (dict == null) return result;

            foreach (var kvp in dict)
            {
                if (IsSensitivePropertyName(kvp.Key))
                {
                    result[kvp.Key] = "[REDACTED]";
                }
                else if (kvp.Value is IDictionary<string, object?> nestedDict)
                {
                    result[kvp.Key] = SanitizeDictionary(nestedDict);
                }
                else if (kvp.Value is JsonElement element)
                {
                    result[kvp.Key] = SanitizeJsonElement(element);
                }
                else if (kvp.Value != null && kvp.Value.ToString()?.TrimStart().StartsWith("{") == true)
                {
                    try
                    {
                        result[kvp.Key] = SanitizeJsonString(kvp.Value.ToString()!);
                    }
                    catch
                    {
                        result[kvp.Key] = kvp.Value;
                    }
                }
                else
                {
                    result[kvp.Key] = kvp.Value;
                }
            }

            return result;
        }

        public static string SanitizeJsonString(string json)
        {
            if (string.IsNullOrWhiteSpace(json)) return json;
            try
            {
                using var doc = JsonDocument.Parse(json);
                var sanitized = SanitizeJsonElement(doc.RootElement);
                return JsonSerializer.Serialize(sanitized);
            }
            catch
            {
                return json;
            }
        }

        private static object? SanitizeJsonElement(JsonElement element)
        {
            switch (element.ValueKind)
            {
                case JsonValueKind.Object:
                    var dict = new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase);
                    foreach (var prop in element.EnumerateObject())
                    {
                        if (IsSensitivePropertyName(prop.Name))
                        {
                            dict[prop.Name] = "[REDACTED]";
                        }
                        else
                        {
                            dict[prop.Name] = SanitizeJsonElement(prop.Value);
                        }
                    }
                    return dict;

                case JsonValueKind.Array:
                    var list = new List<object?>();
                    foreach (var item in element.EnumerateArray())
                    {
                        list.Add(SanitizeJsonElement(item));
                    }
                    return list;

                case JsonValueKind.String:
                    return element.GetString();

                case JsonValueKind.Number:
                    if (element.TryGetInt64(out var l)) return l;
                    if (element.TryGetDouble(out var d)) return d;
                    return element.GetRawText();

                case JsonValueKind.True:
                    return true;

                case JsonValueKind.False:
                    return false;

                case JsonValueKind.Null:
                default:
                    return null;
            }
        }

        public static string SanitizeForCsv(object? value)
        {
            if (value == null) return string.Empty;
            var str = value.ToString() ?? string.Empty;

            // Neutralize CSV formula injection (starts with =, +, -, @, \t, \r)
            if (str.Length > 0 && (str[0] == '=' || str[0] == '+' || str[0] == '-' || str[0] == '@' || str[0] == '\t' || str[0] == '\r'))
            {
                str = "'" + str;
            }

            // Escape internal double quotes
            return "\"" + str.Replace("\"", "\"\"") + "\"";
        }
    }
}
