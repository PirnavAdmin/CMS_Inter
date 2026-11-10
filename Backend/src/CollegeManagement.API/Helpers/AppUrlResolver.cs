using System;
using System.Linq;
using System.Net;
using System.Net.NetworkInformation;
using System.Net.Sockets;
using CollegeManagement.API.Settings;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace CollegeManagement.API.Helpers;

/// <summary>
/// Resolves the application host URLs dynamically for cross-device mobile access.
/// Ensures parents and students scanning QR codes or clicking payment links over
/// local Wi-Fi / LAN connect to the reachable host IP rather than dead 'localhost' links.
/// </summary>
public class AppUrlResolver
{
    private readonly PaymentGatewaySettings _settings;
    private readonly IConfiguration _configuration;
    private readonly ILogger<AppUrlResolver> _logger;
    private static string? _cachedLocalIp;
    private static readonly object _syncLock = new();

    public AppUrlResolver(
        IOptions<PaymentGatewaySettings> settings,
        IConfiguration configuration,
        ILogger<AppUrlResolver> logger)
    {
        _settings = settings.Value;
        _configuration = configuration;
        _logger = logger;
    }

    /// <summary>
    /// Returns the active operational IPv4 address for the current machine on the local network.
    /// Prefers Wi-Fi (Wireless80211) and Ethernet interfaces.
    /// </summary>
    public string GetLocalIpAddress()
    {
        if (!string.IsNullOrEmpty(_cachedLocalIp))
            return _cachedLocalIp;

        lock (_syncLock)
        {
            if (!string.IsNullOrEmpty(_cachedLocalIp))
                return _cachedLocalIp;

            try
            {
                var interfaces = NetworkInterface.GetAllNetworkInterfaces()
                    .Where(n => n.OperationalStatus == OperationalStatus.Up &&
                                n.NetworkInterfaceType != NetworkInterfaceType.Loopback &&
                                n.NetworkInterfaceType != NetworkInterfaceType.Tunnel)
                    .OrderByDescending(n => n.NetworkInterfaceType == NetworkInterfaceType.Wireless80211)
                    .ThenByDescending(n => n.NetworkInterfaceType == NetworkInterfaceType.Ethernet)
                    .ToList();

                foreach (var netInterface in interfaces)
                {
                    var ipProps = netInterface.GetIPProperties();
                    var unicast = ipProps.UnicastAddresses
                        .FirstOrDefault(u => u.Address.AddressFamily == AddressFamily.InterNetwork &&
                                             !IPAddress.IsLoopback(u.Address) &&
                                             !u.Address.ToString().StartsWith("169.254."));

                    if (unicast != null)
                    {
                        _cachedLocalIp = unicast.Address.ToString();
                        _logger.LogInformation("Resolved dynamic host IP: {IpAddress} on {Interface}",
                            _cachedLocalIp, netInterface.Name);
                        return _cachedLocalIp;
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to resolve dynamic host IP, falling back to localhost.");
            }

            _cachedLocalIp = "127.0.0.1";
            return _cachedLocalIp;
        }
    }

    /// <summary>
    /// Gets the base URL for the client application.
    /// Priority:
    /// 1. Explicitly configured BaseAppUrl in PaymentGateway settings
    /// 2. Configuration keys: FrontendUrl or AppUrl
    /// 3. Dynamically resolved LAN IP + FrontendPort (default 5173)
    /// </summary>
    public string GetFrontendBaseUrl()
    {
        if (!string.IsNullOrWhiteSpace(_settings.BaseAppUrl) &&
            !_settings.BaseAppUrl.Contains("localhost") &&
            Uri.TryCreate(_settings.BaseAppUrl, UriKind.Absolute, out _))
        {
            return _settings.BaseAppUrl.TrimEnd('/');
        }

        var configUrl = _configuration["FrontendUrl"] ?? _configuration["AppUrl"];
        if (!string.IsNullOrWhiteSpace(configUrl) &&
            !configUrl.Contains("localhost") &&
            Uri.TryCreate(configUrl, UriKind.Absolute, out _))
        {
            return configUrl.TrimEnd('/');
        }

        var ip = GetLocalIpAddress();
        var port = _settings.FrontendPort > 0 ? _settings.FrontendPort : 5173;
        return $"http://{ip}:{port}";
    }

    /// <summary>
    /// Constructs an accessible payment link for student/parent checkout.
    /// </summary>
    public string ResolvePaymentLink(int studentFeeId, string orderId)
    {
        var baseUrl = GetFrontendBaseUrl();
        return $"{baseUrl}/student/fees/pay/{studentFeeId}?orderId={Uri.EscapeDataString(orderId)}";
    }

    /// <summary>
    /// Constructs a receipt view URL.
    /// </summary>
    public string ResolveReceiptLink(int feePaymentId)
    {
        var baseUrl = GetFrontendBaseUrl();
        return $"{baseUrl}/student/fees/receipt/{feePaymentId}";
    }
}
