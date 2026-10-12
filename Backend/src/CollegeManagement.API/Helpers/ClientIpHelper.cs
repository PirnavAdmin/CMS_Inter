using System;
using System.Linq;
using System.Net;
using System.Net.NetworkInformation;
using System.Net.Sockets;
using Microsoft.AspNetCore.Http;

namespace CollegeManagement.API.Helpers
{
    public static class ClientIpHelper
    {
        public static string GetClientIpAddress(HttpContext? context)
        {
            if (context == null) return "Unknown";

            // 1. Check custom client-reported physical IP header (from frontend)
            if (context.Request.Headers.TryGetValue("X-Client-IP", out var clientIp) && !string.IsNullOrWhiteSpace(clientIp))
            {
                return clientIp.ToString().Trim();
            }

            // 2. Check Cloudflare connecting IP
            if (context.Request.Headers.TryGetValue("CF-Connecting-IP", out var cfIp) && !string.IsNullOrWhiteSpace(cfIp))
            {
                return cfIp.ToString().Trim();
            }

            // 3. Check X-Real-IP (NGINX)
            if (context.Request.Headers.TryGetValue("X-Real-IP", out var realIp) && !string.IsNullOrWhiteSpace(realIp))
            {
                return realIp.ToString().Trim();
            }

            // 4. Check X-Forwarded-For (standard proxy header - take the first IP)
            if (context.Request.Headers.TryGetValue("X-Forwarded-For", out var forwardedFor) && !string.IsNullOrWhiteSpace(forwardedFor))
            {
                var firstIp = forwardedFor.ToString().Split(',')[0].Trim();
                if (!string.IsNullOrWhiteSpace(firstIp)) return firstIp;
            }

            // 5. Fallback to HttpContext RemoteIpAddress
            var remoteIp = context.Connection.RemoteIpAddress;
            if (remoteIp != null)
            {
                // Map IPv6 loopback (::1) or 127.0.0.1 to physical machine adapter IP in local dev
                if (IPAddress.IsLoopback(remoteIp))
                {
                    var localAdapterIp = GetLocalPhysicalIpAddress();
                    if (!string.IsNullOrEmpty(localAdapterIp)) return localAdapterIp;
                }

                // Normal IPv4/IPv6 address
                return remoteIp.IsIPv4MappedToIPv6 ? remoteIp.MapToIPv4().ToString() : remoteIp.ToString();
            }

            return "Unknown";
        }

        private static string? GetLocalPhysicalIpAddress()
        {
            try
            {
                foreach (var netInterface in NetworkInterface.GetAllNetworkInterfaces())
                {
                    if (netInterface.OperationalStatus == OperationalStatus.Up &&
                        (netInterface.NetworkInterfaceType == NetworkInterfaceType.Wireless80211 || 
                         netInterface.NetworkInterfaceType == NetworkInterfaceType.Ethernet))
                    {
                        foreach (var ip in netInterface.GetIPProperties().UnicastAddresses)
                        {
                            if (ip.Address.AddressFamily == AddressFamily.InterNetwork &&
                                !IPAddress.IsLoopback(ip.Address))
                            {
                                return ip.Address.ToString(); // Returns e.g. 192.168.1.x
                            }
                        }
                    }
                }
            }
            catch { }

            return "127.0.0.1";
        }
    }
}
