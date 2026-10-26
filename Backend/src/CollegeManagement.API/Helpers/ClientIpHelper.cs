using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Sockets;
using Microsoft.AspNetCore.Http;

namespace CollegeManagement.API.Helpers
{
    public class ClientNetworkDetails
    {
        public string RemoteIpAddress { get; set; } = "Unknown";
        public string? ForwardedClientIp { get; set; }
        public string EffectiveIpAddress { get; set; } = "Unknown";
        public string IpSource { get; set; } = "Unknown";
        public string IpConfidence { get; set; } = "Unknown";
        public string? PublicIpAddress { get; set; }
        public string? LocalDeviceIp { get; set; } // Null for standard web clients
        public string? NetworkGatewayIp { get; set; } // Null for standard web clients
        public string? UserAgent { get; set; }
        public string? DeviceId { get; set; }
    }

    public static class ClientIpHelper
    {
        // Thread-safe list of trusted proxy IP addresses or subnets
        private static readonly HashSet<string> TrustedProxies = new(StringComparer.OrdinalIgnoreCase);

        public static void ConfigureTrustedProxies(IEnumerable<string>? proxies)
        {
            TrustedProxies.Clear();
            if (proxies != null)
            {
                foreach (var p in proxies)
                {
                    if (!string.IsNullOrWhiteSpace(p))
                        TrustedProxies.Add(p.Trim());
                }
            }
        }

        public static string GetClientIpAddress(HttpContext? context)
        {
            return GetNetworkDetails(context).EffectiveIpAddress;
        }

        public static ClientNetworkDetails GetNetworkDetails(HttpContext? context)
        {
            var details = new ClientNetworkDetails();
            if (context == null) return details;

            var userAgent = context.Request.Headers["User-Agent"].ToString();
            details.UserAgent = string.IsNullOrWhiteSpace(userAgent) ? null : (userAgent.Length > 500 ? userAgent[..500] : userAgent);

            if (context.Request.Headers.TryGetValue("X-Device-Id", out var deviceIdHeader) && !string.IsNullOrWhiteSpace(deviceIdHeader))
            {
                details.DeviceId = deviceIdHeader.ToString().Trim();
            }

            var connectionIp = context.Connection.RemoteIpAddress;
            string remoteIpStr = "Unknown";

            if (connectionIp != null)
            {
                var normalized = connectionIp.IsIPv4MappedToIPv6 ? connectionIp.MapToIPv4() : connectionIp;
                remoteIpStr = normalized.ToString();
            }

            details.RemoteIpAddress = remoteIpStr;

            // Check if connection arrives from an explicitly trusted reverse proxy
            bool isFromTrustedProxy = false;
            if (connectionIp != null)
            {
                if (TrustedProxies.Contains(remoteIpStr))
                {
                    isFromTrustedProxy = true;
                }
                else if (IPAddress.IsLoopback(connectionIp) && TrustedProxies.Contains("127.0.0.1"))
                {
                    isFromTrustedProxy = true;
                }
            }

            string? trustedForwardedIp = null;

            // Only inspect forwarding headers if the immediate connection is from a trusted proxy
            if (isFromTrustedProxy)
            {
                // Check X-Forwarded-For
                if (context.Request.Headers.TryGetValue("X-Forwarded-For", out var forwardedFor) && !string.IsNullOrWhiteSpace(forwardedFor))
                {
                    var hops = forwardedFor.ToString().Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
                    if (hops.Length > 0 && IPAddress.TryParse(hops[0], out var parsedFwd))
                    {
                        var normFwd = parsedFwd.IsIPv4MappedToIPv6 ? parsedFwd.MapToIPv4() : parsedFwd;
                        trustedForwardedIp = normFwd.ToString();
                    }
                }
                // Check X-Real-IP
                else if (context.Request.Headers.TryGetValue("X-Real-IP", out var realIp) && !string.IsNullOrWhiteSpace(realIp))
                {
                    if (IPAddress.TryParse(realIp.ToString().Trim(), out var parsedReal))
                    {
                        var normReal = parsedReal.IsIPv4MappedToIPv6 ? parsedReal.MapToIPv4() : parsedReal;
                        trustedForwardedIp = normReal.ToString();
                    }
                }
            }

            if (!string.IsNullOrEmpty(trustedForwardedIp))
            {
                details.ForwardedClientIp = trustedForwardedIp;
                details.EffectiveIpAddress = trustedForwardedIp;
                details.IpSource = "TrustedProxy";
                details.IpConfidence = "TrustedProxyResolved";
            }
            else if (remoteIpStr != "Unknown")
            {
                details.EffectiveIpAddress = remoteIpStr;
                details.IpSource = "DirectConnection";
                details.IpConfidence = "DirectlyObserved";
            }
            else
            {
                details.EffectiveIpAddress = "Unknown";
                details.IpSource = "Unknown";
                details.IpConfidence = "Unknown";
            }

            // Publicly routable check
            if (IPAddress.TryParse(details.EffectiveIpAddress, out var effIp))
            {
                if (!IsPrivateOrLoopback(effIp))
                {
                    details.PublicIpAddress = details.EffectiveIpAddress;
                }
            }

            // Local laptop IP and Wi-Fi gateway IP are null for web clients
            details.LocalDeviceIp = null;
            details.NetworkGatewayIp = null;

            return details;
        }

        public static bool IsPrivateOrLoopback(IPAddress ip)
        {
            if (IPAddress.IsLoopback(ip)) return true;
            if (ip.IsIPv4MappedToIPv6) ip = ip.MapToIPv4();

            byte[] bytes = ip.GetAddressBytes();

            if (ip.AddressFamily == AddressFamily.InterNetwork)
            {
                // 10.0.0.0/8
                if (bytes[0] == 10) return true;
                // 172.16.0.0/12
                if (bytes[0] == 172 && bytes[1] >= 16 && bytes[1] <= 31) return true;
                // 192.168.0.0/16
                if (bytes[0] == 192 && bytes[1] == 168) return true;
                // 169.254.0.0/16 (Link Local)
                if (bytes[0] == 169 && bytes[1] == 254) return true;
                // 127.0.0.0/8 (Loopback)
                if (bytes[0] == 127) return true;
                // 0.0.0.0/8
                if (bytes[0] == 0) return true;
                return false;
            }

            if (ip.AddressFamily == AddressFamily.InterNetworkV6)
            {
                if (ip.IsIPv6LinkLocal || ip.IsIPv6SiteLocal) return true;
                // Unique Local Address (fc00::/7)
                if ((bytes[0] & 0xfe) == 0xfc) return true;
                return false;
            }

            return false;
        }
    }
}
