namespace CollegeManagement.API.Settings;

public class PaymentGatewaySettings
{
    public string Provider { get; set; } = "Razorpay";
    public string? BaseAppUrl { get; set; }
    public int FrontendPort { get; set; } = 5173;
    public RazorpaySettings Razorpay { get; set; } = new();
    public UpiConfigSettings UpiConfig { get; set; } = new();
    public PollingSettings Polling { get; set; } = new();
}

public class RazorpaySettings
{
    public string KeyId { get; set; } = string.Empty;
    public string KeySecret { get; set; } = string.Empty;
    public string WebhookSecret { get; set; } = string.Empty;
}

public class UpiConfigSettings
{
    public string PayeeVpa { get; set; } = string.Empty;
    public string PayeeName { get; set; } = string.Empty;
    public string Currency { get; set; } = "INR";
}

public class PollingSettings
{
    public int IntervalMs { get; set; } = 1200;
    public int TimeoutSeconds { get; set; } = 600;
}
