namespace CollegeManagement.API.Dtos;

using System.Collections.Generic;

public class StudentTransportResponseDto
{
    public int StudentId { get; set; }
    public string StudentName { get; set; } = string.Empty;
    public string ClassName { get; set; } = "Class 10-A";
    public string AdmissionNo { get; set; } = "ADM2024-001";
    public string StudentType { get; set; } = "Non-Residential";
    public bool IsHosteller { get; set; } = false;
    public bool HasTransportAccess { get; set; } = true;
    public string Message { get; set; } = string.Empty;

    public bool RfidBoarded { get; set; } = true;
    public string RfidBoardingStatus { get; set; } = "Boarded (07:22 AM via RFID)";
    public string EtaMinutes { get; set; } = "6 Mins";

    public string RouteNumber { get; set; } = "R-NORTH-101";
    public string RouteName { get; set; } = "Route A - North Suburbs Express";
    public string PickupStop { get; set; } = "Miyapur Junction";
    public string MorningPickupTime { get; set; } = "07:15 AM";
    public string EveningDropTime { get; set; } = "04:15 PM";

    public string BusNumber { get; set; } = "BUS-101";
    public string RegistrationNumber { get; set; } = "NY-99-AB-1001";
    public string DriverName { get; set; } = "Michael Scott";
    public string DriverPhone { get; set; } = "+1 555-333-111";
    public string AttendantName { get; set; } = "Mary Smith";
    public string AttendantPhone { get; set; } = "+1 (555) 019-8274";
    public string GpsStatus { get; set; } = "Live GPS Active";
}

public class TransportDropdownOptionsDto
{
    public List<string> AcademicYears { get; set; } = new List<string> { "2027-28", "2026-27", "2025-26" };
}

