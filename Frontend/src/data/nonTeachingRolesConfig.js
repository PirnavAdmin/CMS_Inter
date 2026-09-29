/**
 * NON-TEACHING STAFF ROLE & DEPARTMENT DYNAMIC FORM CONFIGURATION
 * Pirnav College Management System
 * 
 * Centralized configuration for all 16 Non-Teaching Departments,
 * their respective designations/roles, dynamic fields, validation rules,
 * helper sidebar metadata, and role-specific document requirements.
 */

// 1. Normalization Helpers
export function normalizeDepartmentCode(deptName) {
  if (!deptName) return "ADMINISTRATION";
  const s = String(deptName).trim().toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]/g, "");
  
  if (s.includes("transp")) return "TRANSPORT";
  if (s.includes("hostel")) return "HOSTEL";
  if (s.includes("librar")) return "LIBRARY";
  if (s.includes("account") || s.includes("finance")) return "ACCOUNTS_FINANCE";
  if (s.includes("secur")) return "SECURITY";
  if (s.includes("maint") || s.includes("facilit") || s.includes("estate")) return "MAINTENANCE";
  if (s.includes("it") || s.includes("system") || s.includes("tech")) return "IT_SUPPORT";
  if (s.includes("exam")) return "EXAMINATIONS";
  if (s.includes("admin")) return "ADMINISTRATION";
  if (s.includes("hr") || s.includes("human")) return "HR";
  if (s.includes("admiss")) return "ADMISSIONS";
  if (s.includes("housekeep") || s.includes("sanitat") || s.includes("clean")) return "HOUSEKEEPING";
  if (s.includes("store") || s.includes("invent")) return "STORES_INVENTORY";
  if (s.includes("student") || s.includes("welfar")) return "STUDENT_AFFAIRS";
  if (s.includes("operat")) return "CAMPUS_OPERATIONS";
  if (s.includes("lab")) return "LAB_SUPPORT";

  return "ADMINISTRATION";
}

export function normalizeDesignationCode(desigName) {
  if (!desigName) return "DEFAULT";
  const s = String(desigName).trim().toLowerCase().replace(/[^a-z0-9]/g, "");

  // Transport
  if (s.includes("busdriver")) return "BUS_DRIVER";
  if (s.includes("vandriver")) return "VAN_DRIVER";
  if (s.includes("driver")) return "DRIVER";
  if (s.includes("attendant") || s.includes("attender")) return "BUS_ATTENDANT";
  if (s.includes("mechanic")) return "MECHANIC";
  if (s.includes("coordinator")) return "TRANSPORT_COORDINATOR";
  if (s.includes("incharge")) return "TRANSPORT_INCHARGE";
  if (s.includes("supervisor")) return "TRANSPORT_SUPERVISOR";
  if (s.includes("manager")) return "TRANSPORT_MANAGER";
  if (s.includes("helper")) return "TRANSPORT_HELPER";

  // Hostel
  if (s.includes("chiefwarden")) return "CHIEF_WARDEN";
  if (s.includes("assistantwarden")) return "ASSISTANT_WARDEN";
  if (s.includes("warden")) return "HOSTEL_WARDEN";
  if (s.includes("cook")) return "COOK";
  if (s.includes("kitchenhelper")) return "KITCHEN_HELPER";
  if (s.includes("mess")) return "MESS_MANAGER";
  if (s.includes("caretaker")) return "CARETAKER";
  if (s.includes("clerk")) return "HOSTEL_CLERK";

  // Library
  if (s.includes("digitallibrar")) return "DIGITAL_LIBRARY_ASSISTANT";
  if (s.includes("assistantlibrar")) return "ASSISTANT_LIBRARIAN";
  if (s.includes("libraryassist")) return "LIBRARY_ASSISTANT";
  if (s.includes("libraryclerk")) return "LIBRARY_CLERK";
  if (s.includes("librar")) return "LIBRARIAN";

  // Accounts
  if (s.includes("cashier")) return "CASHIER";
  if (s.includes("feecollect")) return "FEE_COLLECTION_EXECUTIVE";
  if (s.includes("payroll")) return "PAYROLL_EXECUTIVE";
  if (s.includes("senioraccountant") || s.includes("sraccountant")) return "SENIOR_ACCOUNTANT";
  if (s.includes("junioraccountant") || s.includes("jraccountant")) return "JUNIOR_ACCOUNTANT";
  if (s.includes("accountsexecutive")) return "ACCOUNTS_EXECUTIVE";
  if (s.includes("financeexecutive")) return "FINANCE_EXECUTIVE";
  if (s.includes("accountsassistant")) return "ACCOUNTS_ASSISTANT";
  if (s.includes("account")) return "ACCOUNTANT";

  // Security
  if (s.includes("securityofficer")) return "SECURITY_OFFICER";
  if (s.includes("securitysuper")) return "SECURITY_SUPERVISOR";
  if (s.includes("cctv")) return "CCTV_OPERATOR";
  if (s.includes("gate")) return "GATE_SECURITY";
  if (s.includes("watchman")) return "WATCHMAN";
  if (s.includes("guard") || s.includes("security")) return "SECURITY_GUARD";

  // Maintenance
  if (s.includes("electrician")) return "ELECTRICIAN";
  if (s.includes("plumber")) return "PLUMBER";
  if (s.includes("actech") || s.includes("acrepair")) return "AC_TECHNICIAN";
  if (s.includes("generator")) return "GENERATOR_OPERATOR";
  if (s.includes("carpenter")) return "CARPENTER";
  if (s.includes("facilitysuper")) return "FACILITY_SUPERVISOR";
  if (s.includes("maintenancesuper")) return "MAINTENANCE_SUPERVISOR";
  if (s.includes("technician")) return "TECHNICIAN";
  if (s.includes("maintenance")) return "MAINTENANCE_STAFF";

  // IT Support
  if (s.includes("itadmin")) return "IT_ADMINISTRATOR";
  if (s.includes("systemadmin")) return "SYSTEM_ADMINISTRATOR";
  if (s.includes("networkadmin")) return "NETWORK_ADMINISTRATOR";
  if (s.includes("hardware")) return "HARDWARE_TECHNICIAN";
  if (s.includes("labtech")) return "SYSTEM_LAB_TECHNICIAN";
  if (s.includes("itsupport")) return "IT_SUPPORT_EXECUTIVE";

  // Examinations
  if (s.includes("examofficer")) return "EXAMINATION_OFFICER";
  if (s.includes("examcoord")) return "EXAM_COORDINATOR";
  if (s.includes("examassist")) return "EXAM_ASSISTANT";
  if (s.includes("dataentry") || s.includes("deo")) return "DATA_ENTRY_OPERATOR";
  if (s.includes("records")) return "RECORDS_ASSISTANT";

  // Administration
  if (s.includes("reception") || s.includes("frontdesk")) return "RECEPTIONIST";
  if (s.includes("superintendent")) return "OFFICE_SUPERINTENDENT";
  if (s.includes("officeadmin")) return "OFFICE_ADMINISTRATOR";
  if (s.includes("administrativeofficer") || s.includes("adminofficer")) return "ADMINISTRATIVE_OFFICER";
  if (s.includes("officeassist")) return "OFFICE_ASSISTANT";
  if (s.includes("seniorclerk")) return "SENIOR_CLERK";
  if (s.includes("juniorclerk")) return "JUNIOR_CLERK";
  if (s.includes("peon") || s.includes("attender")) return "ATTENDER_PEON";
  if (s.includes("admin")) return "ADMINISTRATOR";

  // HR
  if (s.includes("hrmanager")) return "HR_MANAGER";
  if (s.includes("hrexecutive")) return "HR_EXECUTIVE";
  if (s.includes("hrassist")) return "HR_ASSISTANT";
  if (s.includes("recruit")) return "RECRUITMENT_COORDINATOR";

  // Admissions
  if (s.includes("admissionofficer")) return "ADMISSIONS_OFFICER";
  if (s.includes("admissioncoord")) return "ADMISSION_COORDINATOR";
  if (s.includes("admissionexec")) return "ADMISSION_EXECUTIVE";
  if (s.includes("counsel")) return "COUNSELLOR";

  // Housekeeping
  if (s.includes("housekeepingsuper")) return "HOUSEKEEPING_SUPERVISOR";
  if (s.includes("cleaner")) return "CLEANER";
  if (s.includes("sanitation")) return "SANITATION_WORKER";
  if (s.includes("housekeep")) return "HOUSEKEEPING_STAFF";

  // Stores
  if (s.includes("storekeeper")) return "STORE_KEEPER";
  if (s.includes("inventoryassist")) return "INVENTORY_ASSISTANT";
  if (s.includes("purchaseassist")) return "PURCHASE_ASSISTANT";
  if (s.includes("procurement")) return "PROCUREMENT_EXECUTIVE";

  // Student Affairs
  if (s.includes("welfareofficer")) return "STUDENT_WELFARE_OFFICER";
  if (s.includes("discipline")) return "DISCIPLINE_COORDINATOR";
  if (s.includes("affairscoord")) return "STUDENT_AFFAIRS_COORDINATOR";

  // Operations
  if (s.includes("operationsmanager")) return "OPERATIONS_MANAGER";
  if (s.includes("operationsexec")) return "OPERATIONS_EXECUTIVE";

  // Lab Support
  if (s.includes("labassist")) return "LAB_ASSISTANT";
  if (s.includes("labtech")) return "LAB_TECHNICIAN";
  if (s.includes("labattend")) return "LAB_ATTENDANT";

  return "DEFAULT";
}

// 2. Centralized Master Configuration
export const NON_TEACHING_ROLE_CONFIG = {
  TRANSPORT: {
    deptName: "Transport",
    deptCode: "TRANSPORT",
    tagline: "Safe Transport, Brighter Futures",
    icon: "Bus",
    description: "Manage student and staff fleet operations, route tracking, and driver compliance.",
    highlights: [
      "Route & Vehicle Assignment",
      "Driver License & Fitness Tracking",
      "Bus Attendant Safety Compliance",
      "GPS Tracking & Shift Scheduling",
      "Preventive Fleet Maintenance"
    ],
    roles: [
      "Driver",
      "Bus Driver",
      "Van Driver",
      "Bus Attendant / Attender",
      "Mechanic",
      "Transport Coordinator",
      "Transport Incharge",
      "Transport Supervisor",
      "Transport Manager",
      "Transport Helper"
    ],
    roleConfigs: {
      DRIVER: {
        title: "Transport Details (Driver)",
        roleLabel: "Driver / Bus Driver / Van Driver",
        docList: [
          { key: "drivingLicenseDoc", label: "Driving License", required: true },
          { key: "transportBadgeDoc", label: "Transport Badge", required: false },
          { key: "medicalFitnessDoc", label: "Medical Fitness Certificate", required: true },
          { key: "policeVerificationDoc", label: "Police Verification", required: true },
          { key: "experienceDoc", label: "Experience Certificate", required: false }
        ],
        fields: [
          { name: "licenseNumber", label: "Driving License Number", type: "text", required: true },
          { name: "licenseType", label: "License Type", type: "select", options: ["LMV", "HMV", "Transport", "Heavy Passenger Vehicle", "Commercial", "Other"], required: true },
          { name: "licenseIssueDate", label: "License Issue Date", type: "date", required: false },
          { name: "licenseExpiryDate", label: "License Expiry Date", type: "date", required: true },
          { name: "badgeNumber", label: "Transport Badge Number", type: "text", required: false },
          { name: "badgeExpiryDate", label: "Badge Expiry Date", type: "date", required: false },
          { name: "assignedVehicle", label: "Assigned Vehicle", type: "text", placeholder: "e.g., Bus No. 07 (AP 16 TX 1234)", required: true },
          { name: "assignedRoute", label: "Assigned Route", type: "text", placeholder: "e.g., Route 12 - Benz Circle to Campus", required: true },
          { name: "shift", label: "Shift", type: "select", options: ["Morning", "Evening", "Both", "Rotational"], required: true },
          { name: "drivingExperience", label: "Years of Driving Experience", type: "number", required: true },
          { name: "medicalFitnessStatus", label: "Medical Fitness Status", type: "select", options: ["Fit", "Pending", "Expired", "Not Available"], required: true },
          { name: "medicalFitnessExpiry", label: "Medical Fitness Expiry Date", type: "date", required: false },
          { name: "policeVerificationStatus", label: "Police Verification Status", type: "select", options: ["Verified", "Pending", "Rejected", "Not Available"], required: true },
          { name: "bloodGroup", label: "Blood Group", type: "select", options: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"], required: false },
          { name: "emergencyContact", label: "Emergency Contact Number", type: "text", required: true },
          { name: "vehicleTypeExp", label: "Vehicle Type Experience", type: "select", options: ["Bus", "Van", "Car", "Mini Bus", "Heavy Vehicle"], required: false },
          { name: "remarks", label: "Additional Remarks", type: "textarea", gridSpan: "is-wide", required: false }
        ]
      },
      BUS_ATTENDANT: {
        title: "Transport Details (Attendant)",
        roleLabel: "Bus Attendant / Attender",
        docList: [
          { key: "policeVerificationDoc", label: "Police Verification", required: true },
          { key: "medicalFitnessDoc", label: "Medical Fitness Certificate", required: true },
          { key: "experienceDoc", label: "Experience Certificate", required: false }
        ],
        fields: [
          { name: "assignedVehicle", label: "Assigned Vehicle", type: "text", placeholder: "e.g., Bus No. 07", required: true },
          { name: "assignedRoute", label: "Assigned Route", type: "text", placeholder: "e.g., Route 12", required: true },
          { name: "shift", label: "Shift", type: "select", options: ["Morning", "Evening", "Both", "Rotational"], required: true },
          { name: "pickupResponsibility", label: "Pickup Responsibility", type: "select", options: ["Assigned", "Not Assigned"], required: false },
          { name: "dropResponsibility", label: "Drop Responsibility", type: "select", options: ["Assigned", "Not Assigned"], required: false },
          { name: "studentAttendanceResp", label: "Student Attendance Responsibility", type: "select", options: ["Yes", "No"], required: false },
          { name: "emergencyContact", label: "Emergency Contact Number", type: "text", required: true },
          { name: "policeVerificationStatus", label: "Police Verification Status", type: "select", options: ["Verified", "Pending", "Rejected", "Not Available"], required: true },
          { name: "medicalFitnessStatus", label: "Medical Fitness Status", type: "select", options: ["Fit", "Pending", "Expired", "Not Available"], required: true },
          { name: "studentSafetyResp", label: "Student Safety Responsibility", type: "text", placeholder: "e.g., First Aid Certified", required: false },
          { name: "boardingAssistance", label: "Boarding Assistance", type: "select", options: ["Yes", "No"], required: false },
          { name: "specialNeedsAssistance", label: "Special Needs Assistance", type: "select", options: ["Yes", "No"], required: false },
          { name: "remarks", label: "Remarks", type: "textarea", gridSpan: "is-wide", required: false }
        ]
      },
      MECHANIC: {
        title: "Transport Details (Mechanic)",
        roleLabel: "Mechanic",
        docList: [
          { key: "tradeCertDoc", label: "Trade / ITI Certificate", required: true },
          { key: "experienceDoc", label: "Experience Certificate", required: true }
        ],
        fields: [
          { name: "technicalSpecialization", label: "Technical Specialization", type: "select", options: ["Engine", "Electrical", "Brake Systems", "Tyres", "General Automobile"], required: true },
          { name: "yearsOfExperience", label: "Years of Experience", type: "number", required: true },
          { name: "vehicleTypesSupported", label: "Vehicle Types Supported", type: "text", placeholder: "e.g., Heavy Buses, Vans, Diesel Engines", required: false },
          { name: "workshopAssigned", label: "Workshop Assigned", type: "text", placeholder: "e.g., Main Campus Auto Bay", required: false },
          { name: "toolsResponsibility", label: "Tools Responsibility", type: "select", options: ["Full Tool Set Issued", "Standard Kit", "Shared Tools"], required: false },
          { name: "preventiveMaintenanceResp", label: "Preventive Maintenance Responsibility", type: "select", options: ["Yes", "No"], required: false },
          { name: "breakdownSupport", label: "Breakdown Support", type: "select", options: ["24/7 On-Call", "Working Hours Only", "Shift Based"], required: false },
          { name: "shift", label: "Shift", type: "select", options: ["Morning", "Evening", "General Day", "Rotational"], required: true },
          { name: "certification", label: "Technical Certification", type: "text", placeholder: "e.g., ITI Automobile / Diesel Mech", required: false },
          { name: "certificationNumber", label: "Certification Number", type: "text", required: false },
          { name: "certificationExpiry", label: "Certification Expiry", type: "date", required: false },
          { name: "emergencyContact", label: "Emergency Contact", type: "text", required: false },
          { name: "remarks", label: "Remarks", type: "textarea", gridSpan: "is-wide", required: false }
        ]
      },
      TRANSPORT_COORDINATOR: {
        title: "Transport Operations Details",
        roleLabel: "Coordinator / Incharge / Supervisor",
        docList: [
          { key: "policeVerificationDoc", label: "Police Verification", required: false },
          { key: "experienceDoc", label: "Experience Certificate", required: true }
        ],
        fields: [
          { name: "roleResponsibilities", label: "Role Responsibilities", type: "text", placeholder: "e.g., Daily Route Dispatch & Parent Helpline", required: true },
          { name: "assignedRoutes", label: "Assigned Routes", type: "text", placeholder: "e.g., Routes 01 to 15", required: false },
          { name: "assignedVehicles", label: "Assigned Vehicles", type: "text", placeholder: "e.g., Fleet Section A (12 Buses)", required: false },
          { name: "driverSupervision", label: "Driver Supervision", type: "select", options: ["Supervises 10+ Drivers", "Supervises 5-10 Drivers", "Direct Shift Lead"], required: false },
          { name: "attendantSupervision", label: "Attendant Supervision", type: "select", options: ["Yes", "No"], required: false },
          { name: "shift", label: "Shift", type: "select", options: ["Morning", "Evening", "General Day", "Both"], required: false },
          { name: "gpsMonitoringAccess", label: "GPS Monitoring Access", type: "select", options: ["Full Admin Access", "View Only", "No Access"], required: false },
          { name: "studentTransportAllocationResp", label: "Student Transport Allocation Responsibility", type: "select", options: ["Yes", "No"], required: false },
          { name: "vehicleMaintenanceCoord", label: "Vehicle Maintenance Coordination", type: "select", options: ["Yes", "No"], required: false },
          { name: "emergencyCoordination", label: "Emergency Coordination", type: "select", options: ["Primary Lead", "Escalation Contact", "None"], required: false },
          { name: "parentCommunicationResp", label: "Parent Communication Responsibility", type: "select", options: ["Yes", "No"], required: false },
          { name: "routeChangeApproval", label: "Route Change Approval", type: "select", options: ["Authorized", "Not Authorized"], required: false },
          { name: "transportAttendanceResp", label: "Transport Attendance Responsibility", type: "select", options: ["Yes", "No"], required: false },
          { name: "contactNumber", label: "Contact Number", type: "text", required: false },
          { name: "remarks", label: "Remarks", type: "textarea", gridSpan: "is-wide", required: false }
        ]
      },
      TRANSPORT_MANAGER: {
        title: "Transport Management Details",
        roleLabel: "Transport Manager",
        docList: [
          { key: "experienceDoc", label: "Experience Certificate", required: true },
          { key: "policeVerificationDoc", label: "Police Verification", required: false }
        ],
        fields: [
          { name: "managedRoutes", label: "Managed Routes", type: "text", placeholder: "e.g., All Campus Routes (1 - 35)", required: false },
          { name: "managedVehicles", label: "Managed Vehicles", type: "text", placeholder: "e.g., Total 42 Vehicles", required: false },
          { name: "managedDrivers", label: "Managed Drivers Count", type: "number", placeholder: "e.g., 45", required: false },
          { name: "managedAttendants", label: "Managed Attendants Count", type: "number", placeholder: "e.g., 30", required: false },
          { name: "transportPolicyResp", label: "Transport Policy Responsibility", type: "select", options: ["Head of Policy", "Operations Lead"], required: false },
          { name: "vehicleComplianceResp", label: "Vehicle Compliance Responsibility", type: "select", options: ["Primary Responsible", "Delegated"], required: false },
          { name: "insuranceTrackingResp", label: "Insurance Tracking Responsibility", type: "select", options: ["Yes", "No"], required: false },
          { name: "fitnessCertTracking", label: "Fitness Certificate Tracking", type: "select", options: ["Yes", "No"], required: false },
          { name: "permitTracking", label: "RTO Permit Tracking", type: "select", options: ["Yes", "No"], required: false },
          { name: "gpsMonitoringResp", label: "GPS Monitoring Responsibility", type: "select", options: ["Executive Oversight", "Direct Monitoring"], required: false },
          { name: "routeApprovalResp", label: "Route Approval Responsibility", type: "select", options: ["Final Approver", "Recommending Authority"], required: false },
          { name: "maintenanceApprovalResp", label: "Maintenance Approval Responsibility", type: "select", options: ["Authorized", "Under Limit"], required: false },
          { name: "emergencyEscalationResp", label: "Emergency Escalation Responsibility", type: "select", options: ["Chief Escalation Lead", "Alternate Lead"], required: false },
          { name: "vendorCoordination", label: "Vendor Coordination (Fuel/Spares)", type: "select", options: ["Direct Management", "Purchase Dept Joint"], required: false },
          { name: "remarks", label: "Remarks", type: "textarea", gridSpan: "is-wide", required: false }
        ]
      }
    }
  },

  HOSTEL: {
    deptName: "Hostel Management",
    deptCode: "HOSTEL",
    tagline: "Safe & Supportive Living",
    icon: "Building2",
    description: "Oversee residential student life, warden shifts, mess hygiene, and block security.",
    highlights: [
      "Hostel Block & Room Allocation",
      "Resident & Non-Resident Warden Shifts",
      "Night Attendance & Discipline Management",
      "Mess Menu & Food Safety Standards",
      "Hostel Security & Visitor Registers"
    ],
    roles: [
      "Chief Warden",
      "Hostel Warden",
      "Assistant Warden",
      "Hostel Supervisor",
      "Caretaker",
      "Hostel Clerk",
      "Mess Manager",
      "Cook",
      "Kitchen Helper",
      "Housekeeping Staff",
      "Hostel Security Guard"
    ],
    roleConfigs: {
      HOSTEL_WARDEN: {
        title: "Hostel Details (Warden)",
        roleLabel: "Chief Warden / Hostel Warden / Assistant Warden",
        docList: [
          { key: "policeVerificationDoc", label: "Police Verification", required: true },
          { key: "medicalFitnessDoc", label: "Medical Fitness Certificate", required: false },
          { key: "experienceDoc", label: "Previous Warden Experience", required: false },
          { key: "identityDoc", label: "Identity Proof", required: true }
        ],
        fields: [
          { name: "assignedHostel", label: "Assigned Hostel", type: "text", placeholder: "e.g., Block-A Senior Hostel", required: true },
          { name: "hostelType", label: "Hostel Type", type: "select", options: ["Boys", "Girls", "Co-Ed"], required: true },
          { name: "assignedBlock", label: "Assigned Block", type: "text", placeholder: "e.g., Godavari Block", required: true },
          { name: "assignedFloor", label: "Assigned Floor", type: "text", placeholder: "e.g., 1st & 2nd Floors", required: false },
          { name: "roomRange", label: "Room Range", type: "text", placeholder: "e.g., Rooms 101 to 140", required: false },
          { name: "wardenType", label: "Warden Type", type: "select", options: ["Resident", "Non-Resident"], required: true },
          { name: "staffAccommodation", label: "Staff Accommodation", type: "select", options: ["Provided (Campus Quarters)", "Provided (Hostel Suite)", "Not Required"], required: true },
          { name: "staffRoomNumber", label: "Staff Room Number", type: "text", placeholder: "e.g., Qtr # B-04 / Suite 101", required: false },
          { name: "dutyShift", label: "Duty Shift", type: "select", options: ["Day Shift", "Night Shift", "24x7 Resident", "Rotational"], required: true },
          { name: "studentsSupervised", label: "Students Under Supervision", type: "number", placeholder: "e.g., 150", required: false },
          { name: "maxCapacity", label: "Maximum Capacity", type: "number", placeholder: "e.g., 200", required: false },
          { name: "attendanceResp", label: "Attendance Responsibility", type: "select", options: ["Morning & Night Roll Call", "Night Only", "Biometric Supervisor"], required: false },
          { name: "disciplineResp", label: "Discipline Responsibility", type: "select", options: ["Chief Disciplinary Officer", "Block Level", "General Support"], required: false },
          { name: "parentCommunicationResp", label: "Parent Communication Responsibility", type: "select", options: ["Yes", "No"], required: false },
          { name: "visitorManagementResp", label: "Visitor Management Responsibility", type: "select", options: ["Yes", "No"], required: false },
          { name: "nightAttendanceResp", label: "Night Attendance Responsibility", type: "select", options: ["Mandatory Physical Inspection", "Assisted by Caretaker"], required: false },
          { name: "medicalEmergencyResp", label: "Medical Emergency Responsibility", type: "select", options: ["First Responder & Hospital Escort", "Campus Clinic Coordinator"], required: false },
          { name: "messSupervision", label: "Mess Supervision", type: "select", options: ["Daily Inspection", "Weekly Audit", "None"], required: false },
          { name: "leaveApprovalCoord", label: "Leave Approval Coordination", type: "select", options: ["Direct Approval", "Parent Verification Required"], required: false },
          { name: "emergencyContact", label: "Emergency Contact", type: "text", required: false },
          { name: "policeVerificationStatus", label: "Police Verification Status", type: "select", options: ["Verified", "Pending", "Not Available"], required: false },
          { name: "medicalFitnessStatus", label: "Medical Fitness Status", type: "select", options: ["Fit", "Pending", "Not Available"], required: false },
          { name: "remarks", label: "Remarks", type: "textarea", gridSpan: "is-wide", required: false }
        ]
      },
      CARETAKER: {
        title: "Hostel Details (Supervisor / Caretaker)",
        roleLabel: "Hostel Supervisor / Caretaker / Clerk",
        docList: [
          { key: "policeVerificationDoc", label: "Police Verification", required: true },
          { key: "experienceDoc", label: "Experience Certificate", required: false }
        ],
        fields: [
          { name: "assignedHostel", label: "Assigned Hostel", type: "text", placeholder: "e.g., Krishna Block", required: true },
          { name: "assignedBlock", label: "Assigned Block", type: "text", required: false },
          { name: "assignedFloor", label: "Assigned Floor", type: "text", required: false },
          { name: "shift", label: "Shift", type: "select", options: ["Day Shift", "Night Shift", "Rotational"], required: true },
          { name: "roomInspectionResp", label: "Room Inspection Responsibility", type: "select", options: ["Daily", "Bi-Weekly", "As Needed"], required: false },
          { name: "maintenanceReporting", label: "Maintenance Reporting", type: "select", options: ["Direct Work Order Logger", "Weekly Log"], required: false },
          { name: "studentComplaintHandling", label: "Student Complaint Handling", type: "select", options: ["First Level Resolution", "Escalation to Warden"], required: false },
          { name: "visitorCoordination", label: "Visitor Coordination", type: "select", options: ["Log Entry & Pass Issuance", "General"], required: false },
          { name: "nightDuty", label: "Night Duty", type: "select", options: ["Yes", "No", "On Roster"], required: false },
          { name: "emergencyResponse", label: "Emergency Response", type: "select", options: ["Active Responder", "Support Role"], required: false },
          { name: "assetResponsibility", label: "Asset Responsibility", type: "select", options: ["Furniture & Fixtures", "Full Block Asset Custodian"], required: false },
          { name: "hostelInventoryResp", label: "Hostel Inventory Responsibility", type: "select", options: ["Linen & Mattresses", "Full Stock", "None"], required: false },
          { name: "remarks", label: "Remarks", type: "textarea", gridSpan: "is-wide", required: false }
        ]
      },
      COOK: {
        title: "Hostel Details (Cook)",
        roleLabel: "Cook / Kitchen Helper",
        docList: [
          { key: "foodSafetyDoc", label: "Food Safety Certificate", required: false },
          { key: "healthDoc", label: "Health / Medical Certificate", required: true },
          { key: "experienceDoc", label: "Experience Certificate", required: false }
        ],
        fields: [
          { name: "assignedHostel", label: "Assigned Hostel", type: "text", placeholder: "e.g., Central Hostel Mess", required: true },
          { name: "assignedMess", label: "Assigned Mess / Kitchen", type: "text", placeholder: "e.g., South Dining Hall", required: true },
          { name: "shift", label: "Shift", type: "select", options: ["Morning (4 AM - 12 PM)", "Evening (12 PM - 8 PM)", "Full Day Shift", "Split Shift"], required: true },
          { name: "cookType", label: "Cook Type", type: "select", options: ["Vegetarian", "Non-Vegetarian", "Both"], required: true },
          { name: "yearsOfExperience", label: "Years of Experience", type: "number", required: false },
          { name: "foodSafetyCert", label: "Food Safety Certificate", type: "select", options: ["FSSAI Certified", "State Food Safety", "In Progress", "None"], required: false },
          { name: "healthCertificate", label: "Health Certificate", type: "select", options: ["Valid & Submitted", "Pending Examination", "Expired"], required: false },
          { name: "certificateExpiry", label: "Certificate Expiry", type: "date", required: false },
          { name: "mealResponsibility", label: "Meal Responsibility", type: "select", options: ["Breakfast", "Lunch", "Dinner", "All Meals"], required: false },
          { name: "specialDietResp", label: "Special Diet Responsibility", type: "select", options: ["Sick Diet / Jain Meals", "General Menu Only"], required: false },
          { name: "medicalFitnessStatus", label: "Medical Fitness Status", type: "select", options: ["Fit for Food Handling", "Pending", "Not Available"], required: false },
          { name: "kitchenHygieneResp", label: "Kitchen Hygiene Responsibility", type: "select", options: ["Daily Station Sanitation", "Shared Duty"], required: false },
          { name: "remarks", label: "Remarks", type: "textarea", gridSpan: "is-wide", required: false }
        ]
      },
      MESS_MANAGER: {
        title: "Hostel Details (Mess Manager)",
        roleLabel: "Mess Manager",
        docList: [
          { key: "foodSafetyDoc", label: "Food Safety / Catering Certificate", required: true },
          { key: "experienceDoc", label: "Experience Certificate", required: true }
        ],
        fields: [
          { name: "assignedHostel", label: "Assigned Hostel", type: "text", placeholder: "e.g., Campus Central Mess", required: false },
          { name: "assignedMess", label: "Assigned Mess", type: "text", placeholder: "e.g., Dining Block 1 & 2", required: false },
          { name: "mealPlanningResp", label: "Meal Planning Responsibility", type: "select", options: ["Weekly Menu Planning", "Nutritional Oversight"], required: false },
          { name: "stockResponsibility", label: "Stock Responsibility", type: "select", options: ["Dry & Cold Storage Custodian", "Daily Grocery Requisition"], required: false },
          { name: "vendorCoordination", label: "Vendor Coordination", type: "select", options: ["Direct Procurement", "Purchase Cell Liaison"], required: false },
          { name: "kitchenStaffSupervision", label: "Kitchen Staff Supervision", type: "select", options: ["Supervises 15+ Staff", "Supervises 5-10 Staff"], required: false },
          { name: "foodQualityMonitoring", label: "Food Quality Monitoring", type: "select", options: ["Daily Taste & Temperature Log", "Routine Checks"], required: false },
          { name: "menuApproval", label: "Menu Approval", type: "select", options: ["Hostel Committee Liaison", "Authorized Approver"], required: false },
          { name: "foodWastageMonitoring", label: "Food Wastage Monitoring", type: "select", options: ["Daily Weighing & Waste Log", "Weekly Summary"], required: false },
          { name: "inventoryResponsibility", label: "Inventory Responsibility", type: "select", options: ["Full Inventory Auditor", "Stock Keeper Lead"], required: false },
          { name: "dailyMealCountResp", label: "Daily Meal Count Responsibility", type: "select", options: ["Biometric Mess Token Sync", "Manual Register"], required: false },
          { name: "shift", label: "Shift", type: "select", options: ["General Day", "Split Shift", "Morning Shift"], required: false },
          { name: "remarks", label: "Remarks", type: "textarea", gridSpan: "is-wide", required: false }
        ]
      },
      HOSTEL_SECURITY: {
        title: "Hostel Details (Security Guard)",
        roleLabel: "Hostel Security Guard",
        docList: [
          { key: "policeVerificationDoc", label: "Police Verification", required: true },
          { key: "securityAgencyIdDoc", label: "Security Agency ID Card", required: false },
          { key: "medicalFitnessDoc", label: "Medical Fitness Certificate", required: false }
        ],
        fields: [
          { name: "assignedHostel", label: "Assigned Hostel", type: "text", placeholder: "e.g., Girls Hostel - Block B", required: true },
          { name: "gatePost", label: "Gate / Post", type: "text", placeholder: "e.g., Main Entrance Arch / Gate 2", required: true },
          { name: "shift", label: "Shift", type: "select", options: ["Day Shift (8 AM - 8 PM)", "Night Shift (8 PM - 8 AM)", "Rotational (8 Hrs)"], required: true },
          { name: "securityAgency", label: "Security Agency Name", type: "text", placeholder: "e.g., G4S / SIS / Direct College Security", required: false },
          { name: "agencyEmployeeId", label: "Agency Employee ID", type: "text", required: false },
          { name: "policeVerification", label: "Police Verification", type: "select", options: ["Verified", "Pending", "Rejected", "Not Available"], required: true },
          { name: "cctvMonitoring", label: "CCTV Monitoring", type: "select", options: ["Active Post Screen", "None"], required: false },
          { name: "visitorRegisterResp", label: "Visitor Register Responsibility", type: "select", options: ["Mandatory Entry Log", "Digital Pass Check"], required: false },
          { name: "nightDuty", label: "Night Duty", type: "select", options: ["Yes", "No", "Rotational"], required: false },
          { name: "emergencyResponse", label: "Emergency Response", type: "select", options: ["First Guard On-Site", "Alarm Trigger Team"], required: false },
          { name: "studentEntryExitMonitoring", label: "Student Entry/Exit Monitoring", type: "select", options: ["Biometric Turnstile Guard", "Gate Pass Checker"], required: false },
          { name: "patrolResponsibility", label: "Patrol Responsibility", type: "select", options: ["Hourly Block Perimeter Patrol", "Static Gate Post"], required: false },
          { name: "commDeviceNumber", label: "Communication Device (Walkie-Talkie No.)", type: "text", placeholder: "e.g., WT-09", required: false },
          { name: "remarks", label: "Remarks", type: "textarea", gridSpan: "is-wide", required: false }
        ]
      },
      HOUSEKEEPING_STAFF: {
        title: "Hostel Details (Housekeeping)",
        roleLabel: "Housekeeping Staff",
        docList: [
          { key: "policeVerificationDoc", label: "Police Verification", required: false }
        ],
        fields: [
          { name: "assignedHostel", label: "Assigned Hostel", type: "text", placeholder: "e.g., Boys Hostel 2", required: false },
          { name: "assignedBlock", label: "Assigned Block", type: "text", required: false },
          { name: "assignedFloor", label: "Assigned Floor", type: "text", required: false },
          { name: "shift", label: "Shift", type: "select", options: ["Morning (6 AM - 2 PM)", "General (8 AM - 4 PM)", "Evening (2 PM - 10 PM)"], required: false },
          { name: "cleaningZone", label: "Cleaning Zone", type: "text", placeholder: "e.g., 2nd Floor Corridors & Wing C", required: false },
          { name: "roomCleaningResp", label: "Room Cleaning Responsibility", type: "select", options: ["Common Corridors Only", "Student Rooms on Request"], required: false },
          { name: "washroomResp", label: "Washroom Responsibility", type: "select", options: ["Twice Daily Deep Cleaning", "General Cleaning"], required: false },
          { name: "commonAreaResp", label: "Common Area Responsibility", type: "select", options: ["Lounge, Staircases & Quadrangle", "Terrace & Perimeter"], required: false },
          { name: "cleaningSuppliesResp", label: "Cleaning Supplies Responsibility", type: "select", options: ["Daily Kit Holder", "Material Store Incharge"], required: false },
          { name: "equipmentIssued", label: "Equipment Issued", type: "text", placeholder: "e.g., Mop Set, Vacuum, Scrub Machine", required: false },
          { name: "supervisor", label: "Supervisor Name", type: "text", required: false },
          { name: "remarks", label: "Remarks", type: "textarea", gridSpan: "is-wide", required: false }
        ]
      }
    }
  },

  LIBRARY: {
    deptName: "Library",
    deptCode: "LIBRARY",
    tagline: "Knowledge & Digital Learning",
    icon: "BookOpen",
    description: "Manage book circulations, journal cataloguing, e-library resources, and student memberships.",
    highlights: [
      "Circulation & RFID / Barcode Check-In/Out",
      "Cataloguing & Dewey Decimal Classification",
      "Digital Library E-Resource Management",
      "Book Procurement & Vendor Coordination",
      "Annual Stock Verification & Clearance"
    ],
    roles: [
      "Librarian",
      "Assistant Librarian",
      "Library Assistant",
      "Library Clerk",
      "Digital Library Assistant"
    ],
    roleConfigs: {
      LIBRARIAN: {
        title: "Library Details (Librarian)",
        roleLabel: "Librarian",
        docList: [
          { key: "degreeCertDoc", label: "M.Lib / B.Lib Degree Certificate", required: true },
          { key: "experienceDoc", label: "Experience Certificate", required: true }
        ],
        fields: [
          { name: "librarySection", label: "Library Section", type: "select", options: ["Central Library", "Reference Section", "Digital Library & E-Journals", "Periodicals & Archives", "Circulation Desk"], required: true },
          { name: "shift", label: "Shift", type: "select", options: ["General (8:30 AM - 5:00 PM)", "Evening Shift (11:00 AM - 7:30 PM)", "Morning Shift"], required: true },
          { name: "issueReturnResp", label: "Issue / Return Responsibility", type: "select", options: ["Full Circulation Authority", "Supervisory Oversight"], required: false },
          { name: "bookCataloguingResp", label: "Book Cataloguing Responsibility", type: "select", options: ["DDC / AACR-2 Cataloguer", "Supervising Assistant"], required: false },
          { name: "inventoryResp", label: "Inventory Responsibility", type: "select", options: ["Primary Stock Custodian", "Annual Audit Lead"], required: false },
          { name: "fineCollectionPermission", label: "Fine Collection Permission", type: "select", options: ["Authorized Cash/UPI Collection", "Read Only"], required: false },
          { name: "digitalLibraryAccess", label: "Digital Library Access", type: "select", options: ["Admin Access", "Staff Access", "None"], required: false },
          { name: "barcodeRfidAccess", label: "Barcode / RFID Access", type: "select", options: ["RFID Gate & Tag Programmer", "Scanner Only"], required: false },
          { name: "membershipManagement", label: "Membership Management", type: "select", options: ["Issue Cards & Clearances", "Verification Only"], required: false },
          { name: "stockVerificationResp", label: "Stock Verification Responsibility", type: "select", options: ["Yes (Annual Lead)", "Assisting"], required: false },
          { name: "bookProcurementResp", label: "Book Procurement Responsibility", type: "select", options: ["Direct Requisition to Principal", "Vendor Indent Creation"], required: false },
          { name: "vendorCoordination", label: "Vendor Coordination", type: "select", options: ["Publisher / Distributor Rep", "Support"], required: false },
          { name: "periodicalManagement", label: "Periodical Management", type: "select", options: ["Print & Online Journal Subscriptions", "Daily Newspapers/Magazines"], required: false },
          { name: "referenceSectionResp", label: "Reference Section Responsibility", type: "select", options: ["Incharge", "Shared"], required: false },
          { name: "libraryReportsResp", label: "Library Reports Responsibility", type: "select", options: ["NAAC / AISHE Library Data Lead", "Monthly Statistics"], required: false },
          { name: "remarks", label: "Remarks", type: "textarea", gridSpan: "is-wide", required: false }
        ]
      },
      ASSISTANT_LIBRARIAN: {
        title: "Library Details (Assistant / Clerk)",
        roleLabel: "Assistant Librarian / Library Assistant / Library Clerk",
        docList: [
          { key: "degreeCertDoc", label: "B.Lib / Certificate in Library Science", required: false },
          { key: "experienceDoc", label: "Experience Certificate", required: false }
        ],
        fields: [
          { name: "librarySection", label: "Library Section", type: "select", options: ["Circulation Counter", "Stack Room", "Periodicals", "Reading Hall"], required: false },
          { name: "shift", label: "Shift", type: "select", options: ["Morning Shift", "General Shift", "Evening Shift"], required: false },
          { name: "issueReturnResp", label: "Issue / Return Responsibility", type: "select", options: ["Daily Counter Operator", "Assisting"], required: false },
          { name: "cataloguing", label: "Cataloguing Support", type: "select", options: ["Data Entry in Koha / CMS", "Spine Labeling"], required: false },
          { name: "membershipEntry", label: "Membership Entry", type: "select", options: ["Student Registration", "Faculty Enrollment"], required: false },
          { name: "fineCollection", label: "Fine Collection", type: "select", options: ["Counter Receipt Generation", "None"], required: false },
          { name: "bookShelving", label: "Book Shelving & Stack Maintenance", type: "select", options: ["Assigned Stack Row 1-20", "Daily Reshelving"], required: false },
          { name: "inventoryUpdate", label: "Inventory Update", type: "select", options: ["Damaged Book Reporting", "Stock Scanning"], required: false },
          { name: "barcodeAccess", label: "Barcode Access", type: "select", options: ["Handheld Scanner", "Barcode Generator"], required: false },
          { name: "studentAssistance", label: "Student Assistance", type: "select", options: ["OPAC Search Helper", "Reference Desk Guide"], required: false },
          { name: "remarks", label: "Remarks", type: "textarea", gridSpan: "is-wide", required: false }
        ]
      },
      DIGITAL_LIBRARY_ASSISTANT: {
        title: "Digital Library Details",
        roleLabel: "Digital Library Assistant",
        docList: [
          { key: "degreeCertDoc", label: "BCA / B.Lib / IT Certificate", required: true },
          { key: "experienceDoc", label: "Experience Certificate", required: false }
        ],
        fields: [
          { name: "digitalLibrarySection", label: "Digital Library Section", type: "text", placeholder: "e.g., E-Learning Lab - Room 304", required: false },
          { name: "computerLabAssignment", label: "Computer Lab Assignment", type: "text", placeholder: "e.g., 60 Thin Clients / Systems", required: false },
          { name: "digitalResourceAccess", label: "Digital Resource Access", type: "select", options: ["NDLI / DELNET Administrator", "NPTEL Local Chapter Coord"], required: false },
          { name: "ebookManagement", label: "E-Book Management", type: "select", options: ["Repository Uploader (DSpace)", "Cataloguer"], required: false },
          { name: "dbSubscriptionResp", label: "Database Subscription Responsibility", type: "select", options: ["IP Authentication Monitor", "Usage Analytics Logger"], required: false },
          { name: "userAccessManagement", label: "User Access Management", type: "select", options: ["Student PC Login Support", "Wi-Fi Pass Management"], required: false },
          { name: "systemIssueReporting", label: "System Issue Reporting", type: "select", options: ["Direct IT Helpdesk Logger", "First Level HW/SW Fix"], required: false },
          { name: "digitalAttendanceSupport", label: "Digital Attendance Support", type: "select", options: ["E-Footfall Counter Tracker", "Manual Log"], required: false },
          { name: "shift", label: "Shift", type: "select", options: ["General Shift", "Lab Hours Shift"], required: false },
          { name: "remarks", label: "Remarks", type: "textarea", gridSpan: "is-wide", required: false }
        ]
      }
    }
  },

  ACCOUNTS_FINANCE: {
    deptName: "Accounts & Finance",
    deptCode: "ACCOUNTS_FINANCE",
    tagline: "Financial Integrity & Compliance",
    icon: "CreditCard",
    description: "Handle student fee collections, cash counter operations, payroll processing, and audit logs.",
    highlights: [
      "Fee Collection & Counter Assignment",
      "Cash Handling & Daily Bank Settlements",
      "Tally / ERP Ledger Maintenance",
      "Staff Payroll, PF, ESI, and TDS Processing",
      "Audit Support & Statutory Compliances"
    ],
    roles: [
      "Senior Accountant",
      "Accountant",
      "Junior Accountant",
      "Accounts Executive",
      "Finance Executive",
      "Cashier",
      "Fee Collection Executive",
      "Accounts Assistant",
      "Payroll Executive"
    ],
    roleConfigs: {
      ACCOUNTANT: {
        title: "Accounts & Finance Details",
        roleLabel: "Senior Accountant / Accountant / Finance Executive",
        docList: [
          { key: "degreeCertDoc", label: "M.Com / B.Com / MBA Finance Degree", required: true },
          { key: "experienceDoc", label: "Experience Certificate", required: true }
        ],
        fields: [
          { name: "accountingRole", label: "Accounting Role", type: "select", options: ["General Ledger", "Receivables (Fees)", "Payables (Vendors)", "Taxation & Compliance", "Chief Accountant"], required: true },
          { name: "cashHandlingPermission", label: "Cash Handling Permission", type: "select", options: ["Authorized", "Not Authorized"], required: false },
          { name: "feeCollectionAccess", label: "Fee Collection Access", type: "select", options: ["Full System Access", "Audit View", "No Access"], required: false },
          { name: "paymentProcessingAccess", label: "Payment Processing Access", type: "select", options: ["Maker / Creator", "Checker / Verifier", "Approver", "None"], required: false },
          { name: "voucherAccess", label: "Voucher Access", type: "select", options: ["Create & Post", "Post Only", "View Only"], required: false },
          { name: "bankReconciliationAccess", label: "Bank Reconciliation Access", type: "select", options: ["Full Access", "View Only", "None"], required: false },
          { name: "payrollAccess", label: "Payroll Access", type: "select", options: ["Salary Processing Lead", "Verification", "None"], required: false },
          { name: "refundPermission", label: "Refund Permission", type: "select", options: ["Authorized", "Requires Principal Approval"], required: false },
          { name: "pettyCashLimit", label: "Petty Cash Limit (Rs.)", type: "number", placeholder: "e.g., 25000", required: false },
          { name: "financialApprovalLimit", label: "Financial Approval Limit (Rs.)", type: "number", placeholder: "e.g., 50000", required: false },
          { name: "tallyErpExperience", label: "Tally / ERP Experience", type: "select", options: ["Tally Prime Expert (5+ Yrs)", "Tally Prime (2-5 Yrs)", "SAP / Oracle", "Other ERP"], required: false },
          { name: "tdsProcessingAccess", label: "TDS Processing Access", type: "select", options: ["Yes (Form 16/24Q/26Q)", "No"], required: false },
          { name: "gstProcessingAccess", label: "GST Processing Access", type: "select", options: ["Yes (GSTR-1 / 3B)", "Exempt / Not Applicable"], required: false },
          { name: "bankCoordination", label: "Bank Coordination", type: "select", options: ["Designated Liaison Officer", "Support"], required: false },
          { name: "auditSupportResp", label: "Audit Support Responsibility", type: "select", options: ["Statutory & Internal Audit Lead", "Documentation Lead"], required: false },
          { name: "remarks", label: "Remarks", type: "textarea", gridSpan: "is-wide", required: false }
        ]
      },
      CASHIER: {
        title: "Cashier & Fee Collection Details",
        roleLabel: "Cashier / Fee Collection Executive",
        docList: [
          { key: "degreeCertDoc", label: "B.Com / Degree Certificate", required: true },
          { key: "policeVerificationDoc", label: "Police Verification", required: false },
          { key: "experienceDoc", label: "Experience Certificate", required: false }
        ],
        fields: [
          { name: "cashCounterAssignment", label: "Cash Counter Assignment", type: "text", placeholder: "e.g., Counter No. 02 (Admissions & Fees)", required: false },
          { name: "feeCollectionAccess", label: "Fee Collection Access", type: "select", options: ["Full Active Access", "Restricted Term Fees", "Exam Fee Only"], required: true },
          { name: "receiptGenAccess", label: "Receipt Generation Access", type: "select", options: ["Instant Print / SMS Receipt", "Print Only"], required: true },
          { name: "cashHandlingLimit", label: "Daily Cash Handling Limit (Rs.)", type: "number", placeholder: "e.g., 500000", required: false },
          { name: "refundAccess", label: "Refund Access", type: "select", options: ["No Refund Rights", "Initiate Only"], required: false },
          { name: "dailySettlementResp", label: "Daily Settlement Responsibility", type: "select", options: ["Mandatory Evening Cash Handover", "Vault Deposit"], required: false },
          { name: "cashDepositResp", label: "Cash Deposit Responsibility", type: "select", options: ["Daily Bank Escort Deposit", "Accounts Incharge Handover"], required: false },
          { name: "paymentModeHandling", label: "Payment Modes Handled", type: "select", options: ["Cash, UPI, Card, Cheque, Bank Transfer", "Cash & UPI Only", "Digital Modes Only"], required: false },
          { name: "shift", label: "Shift", type: "select", options: ["Banking Hours (8:30 AM - 4:30 PM)", "Admissions Extended Shift"], required: false },
          { name: "remarks", label: "Remarks", type: "textarea", gridSpan: "is-wide", required: false }
        ]
      },
      PAYROLL_EXECUTIVE: {
        title: "Payroll & Compensation Details",
        roleLabel: "Payroll Executive",
        docList: [
          { key: "degreeCertDoc", label: "HR / Finance Degree", required: true },
          { key: "experienceDoc", label: "Experience Certificate", required: true }
        ],
        fields: [
          { name: "payrollAccess", label: "Payroll Access Level", type: "select", options: ["Full Payroll Master", "Data Input Only"], required: false },
          { name: "salaryProcessingResp", label: "Salary Processing Responsibility", type: "select", options: ["Monthly Salary Sheet Creator", "Support"], required: false },
          { name: "attendanceImportAccess", label: "Attendance Import Access", type: "select", options: ["Biometric Sync & LOP Calculator", "Manual Input"], required: false },
          { name: "lopProcessing", label: "Loss of Pay (LOP) Processing", type: "select", options: ["Authorized", "Verify with HR"], required: false },
          { name: "allowanceProcessing", label: "Allowance Processing (DA/HRA/Spl)", type: "select", options: ["Configured Rules", "Manual Entry"], required: false },
          { name: "deductionProcessing", label: "Deductions (TDS, Adv, Loan)", type: "select", options: ["Automated Deductions", "Manual Ledger Sync"], required: false },
          { name: "pfProcessing", label: "PF Processing & ECR Upload", type: "select", options: ["EPFO Portal Lead", "Support"], required: false },
          { name: "esiProcessing", label: "ESI Processing & Monthly Return", type: "select", options: ["ESIC Portal Lead", "Support"], required: false },
          { name: "tdsProcessing", label: "Staff TDS Deductions (Old/New Regime)", type: "select", options: ["Yes", "No"], required: false },
          { name: "payslipGeneration", label: "Payslip Generation & Emailing", type: "select", options: ["Digital Portal Auto-Dispatch", "Print Slip"], required: false },
          { name: "bankTransferPrep", label: "Bank Transfer File Preparation", type: "select", options: ["NEFT / RTGS Corporate Excel Generator", "None"], required: false },
          { name: "remarks", label: "Remarks", type: "textarea", gridSpan: "is-wide", required: false }
        ]
      }
    }
  },

  SECURITY: {
    deptName: "Security",
    deptCode: "SECURITY",
    tagline: "Campus Safety & Vigilance",
    icon: "ShieldCheck",
    description: "Guard campus gates, conduct 24/7 CCTV surveillance, manage visitor logs, and enforce campus safety.",
    highlights: [
      "Gate Security & Campus Patrol Posts",
      "Visitor Pass & Emergency Entry Logs",
      "CCTV Surveillance & Control Room Shifts",
      "Police Verification & Agency Verification",
      "Incident Escalation & Mock Drill Coordination"
    ],
    roles: [
      "Security Officer",
      "Security Supervisor",
      "Security Guard",
      "Watchman",
      "CCTV Operator",
      "Gate Security"
    ],
    roleConfigs: {
      SECURITY_GUARD: {
        title: "Security Details (Guard / Post)",
        roleLabel: "Security Guard / Watchman / Gate Security / CCTV Operator",
        docList: [
          { key: "policeVerificationDoc", label: "Police Verification Certificate", required: true },
          { key: "agencyIdDoc", label: "Security Agency ID Card", required: false },
          { key: "medicalFitnessDoc", label: "Medical Fitness Certificate", required: false },
          { key: "experienceDoc", label: "Previous Security Experience", required: false }
        ],
        fields: [
          { name: "assignedCampus", label: "Assigned Campus / Building", type: "text", placeholder: "e.g., Main Academic Block / South Gate", required: true },
          { name: "assignedGate", label: "Assigned Gate / Post", type: "text", placeholder: "e.g., Main Arch Gate # 1", required: false },
          { name: "shift", label: "Shift", type: "select", options: ["Morning (6 AM - 2 PM)", "Evening (2 PM - 10 PM)", "Night (10 PM - 6 AM)", "12-Hr Day", "12-Hr Night"], required: true },
          { name: "policeVerification", label: "Police Verification Status", type: "select", options: ["Verified", "Pending", "Rejected", "Not Available"], required: true },
          { name: "securityAgency", label: "Security Agency Name", type: "text", placeholder: "e.g., SIS India Ltd / Direct Staff", required: false },
          { name: "agencyEmpId", label: "Agency Employee ID", type: "text", required: false },
          { name: "cctvAccess", label: "CCTV Access", type: "select", options: ["Control Room Operator", "Gate Monitor Only", "No Access"], required: false },
          { name: "visitorManagement", label: "Visitor Management", type: "select", options: ["Digital Visitor Kiosk Lead", "Register Entry Only"], required: false },
          { name: "nightDuty", label: "Night Duty", type: "select", options: ["Eligible for Night Duty", "Day Only"], required: false },
          { name: "patrolArea", label: "Patrol Area", type: "text", placeholder: "e.g., North Boundary Wall & Sports Ground", required: false },
          { name: "emergencyResp", label: "Emergency Response Responsibility", type: "select", options: ["First Responder", "Support Guard"], required: false },
          { name: "commDeviceNumber", label: "Communication Device (Walkie-Talkie No.)", type: "text", placeholder: "e.g., WT-04", required: false },
          { name: "studentEntryExitMonitoring", label: "Student Entry / Exit Monitoring", type: "select", options: ["Biometric Gate Keeper", "ID Card Checking"], required: false },
          { name: "vehicleEntryMonitoring", label: "Vehicle Entry Monitoring", type: "select", options: ["Vehicle Pass / ANPR Operator", "Manual Log"], required: false },
          { name: "incidentReportingResp", label: "Incident Reporting Responsibility", type: "select", options: ["Duty Log Book Entry", "Immediate Escalation"], required: false },
          { name: "remarks", label: "Remarks", type: "textarea", gridSpan: "is-wide", required: false }
        ]
      },
      SECURITY_SUPERVISOR: {
        title: "Security Details (Officer / Supervisor)",
        roleLabel: "Security Officer / Security Supervisor",
        docList: [
          { key: "policeVerificationDoc", label: "Police Verification Certificate", required: true },
          { key: "experienceDoc", label: "Ex-Servicemen / Security Exp Certificate", required: true },
          { key: "medicalFitnessDoc", label: "Medical Fitness Certificate", required: false }
        ],
        fields: [
          { name: "assignedCampus", label: "Assigned Campus / Building", type: "text", placeholder: "e.g., Entire Campus Area", required: true },
          { name: "assignedGate", label: "Primary Office / Gate", type: "text", placeholder: "e.g., Security Control Room", required: false },
          { name: "shift", label: "Shift", type: "select", options: ["General Shift", "Day Supervisor Shift", "Night Shift Lead"], required: true },
          { name: "policeVerification", label: "Police Verification", type: "select", options: ["Verified", "Pending", "Not Available"], required: true },
          { name: "teamSize", label: "Team Size Supervised", type: "number", placeholder: "e.g., 25 Guards", required: false },
          { name: "guardsSupervised", label: "Guards Supervised (Post Count)", type: "text", placeholder: "e.g., 8 Active Posts", required: false },
          { name: "shiftAllocationResp", label: "Shift Allocation Responsibility", type: "select", options: ["Primary Shift Planner", "Shared"], required: false },
          { name: "incidentEscalationResp", label: "Incident Escalation Responsibility", type: "select", options: ["Direct Liaison to Principal/Management", "First Escalation"], required: false },
          { name: "cctvMonitoringResp", label: "CCTV Monitoring Responsibility", type: "select", options: ["Chief Surveillance Supervisor", "Audit View"], required: false },
          { name: "emergencyDrillCoord", label: "Emergency Drill Coordination", type: "select", options: ["Fire & Disaster Drill Lead", "Assisting"], required: false },
          { name: "visitorPolicyEnforcement", label: "Visitor Policy Enforcement", type: "select", options: ["Authorized to Restrict Entry", "Standard"], required: false },
          { name: "commDeviceNumber", label: "Master Walkie-Talkie Channel / No.", type: "text", placeholder: "e.g., Channel 1 / WT-01", required: false },
          { name: "remarks", label: "Remarks", type: "textarea", gridSpan: "is-wide", required: false }
        ]
      }
    }
  },

  MAINTENANCE: {
    deptName: "Maintenance & Facilities",
    deptCode: "MAINTENANCE",
    tagline: "Campus Infrastructure & Reliability",
    icon: "Wrench",
    description: "Operate electrical power, plumbing lines, air conditioning, generators, and carpentry maintenance.",
    highlights: [
      "Preventive & Breakdown Maintenance Logs",
      "Electrical Transformers, Panels & Generators",
      "Campus Plumbing & Water Tank Sanitization",
      "HVAC & Central AC Maintenance",
      "Work Order Ticket Resolution"
    ],
    roles: [
      "Maintenance Supervisor",
      "Facility Supervisor",
      "Maintenance Staff",
      "Electrician",
      "Plumber",
      "Carpenter",
      "Technician",
      "AC Technician",
      "Generator Operator"
    ],
    roleConfigs: {
      MAINTENANCE_STAFF: {
        title: "Maintenance Details (General / Trade)",
        roleLabel: "Maintenance Staff / Supervisor / Carpenter / Technician",
        docList: [
          { key: "tradeCertDoc", label: "Trade / ITI / Skill Certificate", required: true },
          { key: "licenseDoc", label: "Technical License (if applicable)", required: false },
          { key: "experienceDoc", label: "Experience Certificate", required: false }
        ],
        fields: [
          { name: "tradeSkill", label: "Trade / Skill", type: "select", options: ["General Maintenance", "Carpentry", "Masonry & Painting", "Welding & Fabrication", "Civil Works"], required: true },
          { name: "certification", label: "Certification / ITI Trade", type: "text", placeholder: "e.g., ITI Carpenter / Civil Technician", required: false },
          { name: "licenseNumber", label: "License Number", type: "text", required: false },
          { name: "yearsOfExperience", label: "Years of Experience", type: "number", required: false },
          { name: "assignedCampusArea", label: "Assigned Campus Area", type: "text", placeholder: "e.g., Science Block & Library", required: true },
          { name: "shift", label: "Shift", type: "select", options: ["General (8 AM - 5 PM)", "Morning Shift", "Evening Shift", "Breakdown On-Call"], required: true },
          { name: "equipmentResp", label: "Equipment Responsibility", type: "text", placeholder: "e.g., Carpentry Power Tools, Ladders", required: false },
          { name: "preventiveMaintResp", label: "Preventive Maintenance Responsibility", type: "select", options: ["Weekly Checklist Inspector", "Monthly Schedule"], required: false },
          { name: "workOrderCategory", label: "Work Order Category", type: "select", options: ["Classroom Desks & Doors", "Civil & Structural Repairs", "General"], required: false },
          { name: "emergencyBreakdownDuty", label: "Emergency Breakdown Duty", type: "select", options: ["Available On-Call", "Working Hours Only"], required: false },
          { name: "toolsIssued", label: "Tools Issued", type: "text", placeholder: "e.g., Toolkit # 14", required: false },
          { name: "inventoryResponsibility", label: "Inventory Responsibility", type: "select", options: ["Hardware Store Custodian", "None"], required: false },
          { name: "remarks", label: "Remarks", type: "textarea", gridSpan: "is-wide", required: false }
        ]
      },
      ELECTRICIAN: {
        title: "Maintenance Details (Electrician)",
        roleLabel: "Electrician",
        docList: [
          { key: "tradeCertDoc", label: "Electrical License (Wireman / Supervisor)", required: true },
          { key: "experienceDoc", label: "Experience Certificate", required: true }
        ],
        fields: [
          { name: "tradeSkill", label: "Trade / Skill", type: "text", placeholder: "Licensed Electrician", required: true },
          { name: "electricalLicense", label: "Electrical License Number", type: "text", placeholder: "e.g., AP-EL-54820", required: true },
          { name: "htLtExperience", label: "HT / LT Experience", type: "select", options: ["Both HT (11kV) & LT (415V)", "LT Only (415V/230V)", "Domestic Wiring Only"], required: true },
          { name: "generatorExperience", label: "Generator Experience (kVA)", type: "select", options: ["Up to 500 kVA DG Sets", "125 kVA to 250 kVA", "Small Portable DG"], required: false },
          { name: "panelMaintenance", label: "Main LT Panel Maintenance", type: "select", options: ["Circuit Breakers (ACB/MCCB) Expert", "Routine Fuse/Relay Check"], required: false },
          { name: "upsMaintenance", label: "UPS & Battery Bank Maintenance", type: "select", options: ["Online UPS Maintenance Lead (100kVA+)", "Routine Water Top-Up"], required: false },
          { name: "emergencyElectricalDuty", label: "Emergency Electrical Duty", type: "select", options: ["24/7 Power Failure Responder", "Shift Duty"], required: false },
          { name: "assignedCampusArea", label: "Assigned Campus Area", type: "text", placeholder: "e.g., Substation & All Academic Blocks", required: true },
          { name: "shift", label: "Shift", type: "select", options: ["General Shift", "Morning Shift", "Evening Shift", "Night Shift"], required: true },
          { name: "yearsOfExperience", label: "Years of Experience", type: "number", required: false },
          { name: "toolsIssued", label: "Safety Tools & Multimeter Issued", type: "text", placeholder: "e.g., Insulated Tool Kit, Megger, Clamp Meter", required: false },
          { name: "remarks", label: "Remarks", type: "textarea", gridSpan: "is-wide", required: false }
        ]
      },
      PLUMBER: {
        title: "Maintenance Details (Plumber)",
        roleLabel: "Plumber",
        docList: [
          { key: "tradeCertDoc", label: "Plumbing ITI / Skill Certificate", required: false },
          { key: "experienceDoc", label: "Experience Certificate", required: false }
        ],
        fields: [
          { name: "tradeSkill", label: "Trade / Skill", type: "text", placeholder: "Plumbing & Sanitary", required: true },
          { name: "waterSupplyResp", label: "Water Supply Responsibility", type: "select", options: ["Overhead Tanks & Borewells", "RO Water Treatment Plant Incharge"], required: true },
          { name: "drainageResp", label: "Drainage & Sewerage Responsibility", type: "select", options: ["Campus Underground Drainage", "Routine Sanitary Line Clear"], required: false },
          { name: "pumpMaintenance", label: "Pump Maintenance (Hydro-pneumatic/Submersible)", type: "select", options: ["Daily Pump Operation & Priming", "Routine Inspection"], required: false },
          { name: "waterTankResp", label: "Water Tank Cleaning & Chlorination", type: "select", options: ["Monthly Tank Cleaning Lead", "Supervisory"], required: false },
          { name: "emergencyPlumbingDuty", label: "Emergency Plumbing Duty", type: "select", options: ["Immediate Leakage Responder", "Shift Duty"], required: false },
          { name: "assignedCampusArea", label: "Assigned Campus Area", type: "text", placeholder: "e.g., Hostels & Washroom Blocks", required: true },
          { name: "shift", label: "Shift", type: "select", options: ["General (7:30 AM - 4:30 PM)", "Rotational"], required: true },
          { name: "yearsOfExperience", label: "Years of Experience", type: "number", required: false },
          { name: "toolsIssued", label: "Pipe Wrenches & Tool Set Issued", type: "text", required: false },
          { name: "remarks", label: "Remarks", type: "textarea", gridSpan: "is-wide", required: false }
        ]
      },
      AC_TECHNICIAN: {
        title: "Maintenance Details (AC Technician)",
        roleLabel: "AC Technician",
        docList: [
          { key: "tradeCertDoc", label: "HVAC / Refrigeration ITI Certificate", required: true },
          { key: "experienceDoc", label: "Experience Certificate", required: true }
        ],
        fields: [
          { name: "tradeSkill", label: "Trade / Skill", type: "text", placeholder: "HVAC & Air Conditioning", required: true },
          { name: "acTypeExp", label: "AC Type Experience", type: "select", options: ["Split AC, Cassette AC, VRF & Central Plant", "Split & Cassette AC Only", "Ductable ACs"], required: true },
          { name: "preventiveMaint", label: "Preventive Maintenance Schedule", type: "select", options: ["Quarterly Coil Cleaning & Filter Wash", "Monthly Audits"], required: false },
          { name: "gasHandlingCert", label: "Refrigerant Gas Handling Certification", type: "select", options: ["Certified (R410A / R32 / R22)", "Practical Experience Only"], required: false },
          { name: "assignedCampusArea", label: "Assigned Campus Area", type: "text", placeholder: "e.g., Computer Labs, Audits & Admin Wing", required: true },
          { name: "shift", label: "Shift", type: "select", options: ["General Shift", "On-Call"], required: true },
          { name: "yearsOfExperience", label: "Years of Experience", type: "number", required: false },
          { name: "toolsIssued", label: "Manifold Gauge & Vacuum Pump Issued", type: "text", required: false },
          { name: "remarks", label: "Remarks", type: "textarea", gridSpan: "is-wide", required: false }
        ]
      },
      GENERATOR_OPERATOR: {
        title: "Maintenance Details (Generator Operator)",
        roleLabel: "Generator Operator",
        docList: [
          { key: "tradeCertDoc", label: "Diesel Mechanic / Electrical Trade", required: false },
          { key: "experienceDoc", label: "Experience Certificate", required: true }
        ],
        fields: [
          { name: "tradeSkill", label: "Trade / Skill", type: "text", placeholder: "Diesel Generator & Substation Operations", required: true },
          { name: "generatorCapacityExp", label: "Generator Capacity Experience", type: "select", options: ["250 kVA to 750 kVA Multi-DG Synchronized", "125 kVA Single DG", "500 kVA Standard"], required: true },
          { name: "fuelMonitoring", label: "Diesel Fuel Stock & Consumption Log", type: "select", options: ["Daily Dipstick Measurement & Stock Register", "Weekly Fuel indent"], required: true },
          { name: "operatingShift", label: "Operating Shift", type: "select", options: ["Morning Shift", "General Day Shift", "24/7 Standby on Power Cut"], required: true },
          { name: "maintLogResp", label: "Maintenance Log (B-Check / Oil Change)", type: "select", options: ["Strict Hour-Meter Tracking & Vendor AMC Liaison", "Routine"], required: false },
          { name: "emergencyPowerResp", label: "Emergency Power Switchover (AMF)", type: "select", options: ["Auto AMF Panel Operator / Manual Override", "Manual Sync"], required: false },
          { name: "assignedCampusArea", label: "Assigned Substation Location", type: "text", placeholder: "e.g., Main Substation Yard # 1", required: true },
          { name: "remarks", label: "Remarks", type: "textarea", gridSpan: "is-wide", required: false }
        ]
      }
    }
  },

  IT_SUPPORT: {
    deptName: "IT & Systems Support",
    deptCode: "IT_SUPPORT",
    tagline: "Technology & Digital Infrastructure",
    icon: "Cpu",
    description: "Support campus network, computer labs, smart classroom projectors, systems, and helpdesk tickets.",
    highlights: [
      "Computer Lab Setup & OS Imaging",
      "Wi-Fi Access Points & Managed Switches",
      "Smart Interactive Classroom Projectors & Audio",
      "IT Asset Inventory & Peripheral Maintenance",
      "Helpdesk Ticket Resolution (No Passwords Stored)"
    ],
    roles: [
      "IT Administrator",
      "System Administrator",
      "Network Administrator",
      "IT Support Executive",
      "Hardware Technician",
      "System / Lab Technician"
    ],
    roleConfigs: {
      IT_ADMINISTRATOR: {
        title: "IT Support Details",
        roleLabel: "IT / System / Network Administrator & Tech Support",
        docList: [
          { key: "degreeCertDoc", label: "B.Tech / MCA / BCA / Diploma IT Certificate", required: true },
          { key: "certDoc", label: "CCNA / MCSA / RedHat / CompTIA Certification", required: false },
          { key: "experienceDoc", label: "Experience Certificate", required: true }
        ],
        fields: [
          { name: "specialization", label: "Specialization", type: "select", options: ["Network & Firewall Admin", "System Administration (Windows/Linux)", "Hardware & Desktop Support", "Smart Classrooms & Audio-Visual", "Lab Systems & Virtualization"], required: true },
          { name: "assignedLabBuilding", label: "Assigned Lab / Building", type: "text", placeholder: "e.g., Computer Lab 1 & 2, Server Room", required: false },
          { name: "shift", label: "Shift", type: "select", options: ["General Day (8:30 AM - 5:00 PM)", "Lab Extended Shift", "Morning Shift"], required: true },
          { name: "networkAccessLevel", label: "Network Access Level", type: "select", options: ["VLAN / Switch Config Admin", "DHCP / DNS Maintainer", "Client Support Only"], required: false },
          { name: "serverAccess", label: "Server Access Responsibility", type: "select", options: ["Local Server Maintenance (AD / File Server)", "Cloud Console Monitoring", "No Direct Access"], required: false },
          { name: "hardwareResp", label: "Hardware Responsibility", type: "select", options: ["Motherboard / RAM / SSD Replacement", "Peripheral Maintenance"], required: false },
          { name: "softwareInstallPermission", label: "Software Installation Permission", type: "select", options: ["Authorized (Lab Image Deployment)", "Pre-approved Software Only"], required: false },
          { name: "assetManagementResp", label: "Asset Management Responsibility", type: "select", options: ["IT Asset Serial Register Custodian", "Quarterly Audit"], required: false },
          { name: "cctvSystemSupport", label: "CCTV & Biometric System Support", type: "select", options: ["NVR IP Camera & Biometric Sync Lead", "Support"], required: false },
          { name: "printerSupport", label: "Printer & Copier Support", type: "select", options: ["Network Printer Setup & Cartridge Replacements", "Assisting"], required: false },
          { name: "projectorSmartClassSupport", label: "Projector / Smart Classroom Support", type: "select", options: ["Interactive Panels & HDMI Audio Lead", "Routine Check"], required: false },
          { name: "userSupportResp", label: "Faculty / Staff Support Responsibility", type: "select", options: ["First Call Helpdesk Resolution", "Escalation Lead"], required: false },
          { name: "ticketResolutionResp", label: "Ticket Resolution SLA", type: "select", options: ["Under 2 Hours (Priority)", "Same Day (Standard)"], required: false },
          { name: "certifications", label: "Certifications", type: "text", placeholder: "e.g., CCNA, AWS Cloud, Hardware Diploma", required: false },
          { name: "remarks", label: "Remarks (Note: Never store passwords here)", type: "textarea", gridSpan: "is-wide", required: false }
        ]
      }
    }
  },

  EXAMINATIONS: {
    deptName: "Examinations Cell",
    deptCode: "EXAMINATIONS",
    tagline: "Secure Examination & Evaluation",
    icon: "FileCheck2",
    description: "Manage confidential exam papers, room seat allocations, hall tickets, and marks ledger records.",
    highlights: [
      "Confidential Paper Handling & Vault Access",
      "Hall Ticket Generation & Verification",
      "Exam Hall Seating Plan & Invigilation Charts",
      "OMR & Marks Entry Coordination",
      "Board Examination Result Documentation"
    ],
    roles: [
      "Examination Officer",
      "Exam Coordinator",
      "Exam Assistant",
      "Data Entry Operator",
      "Records Assistant"
    ],
    roleConfigs: {
      EXAMINATION_OFFICER: {
        title: "Examination Cell Details",
        roleLabel: "Examination Officer / Coordinator / Assistant / DEO",
        docList: [
          { key: "degreeCertDoc", label: "Degree Certificate", required: true },
          { key: "policeVerificationDoc", label: "Confidentiality & Background Clearance", required: true },
          { key: "experienceDoc", label: "Experience Certificate", required: false }
        ],
        fields: [
          { name: "examResponsibility", label: "Exam Responsibility", type: "select", options: ["Chief Superintendent / Exam Officer", "Hall Seating & Invigilation Lead", "Marks Entry & Ledger Incharge", "Question Paper Custodian", "Hall Ticket & Registration"], required: true },
          { name: "confidentialDataAccess", label: "Confidential Data Access", type: "select", options: ["Authorized Vault Access", "Marks Portal Access", "Restricted Access"], required: false },
          { name: "hallTicketProcessing", label: "Hall Ticket Processing", type: "select", options: ["Board Download & Distribution Lead", "Verification Only"], required: false },
          { name: "marksEntryAccess", label: "Marks Entry Access", type: "select", options: ["Double-Entry Verified Operator", "Audit Verifier", "None"], required: false },
          { name: "resultProcessing", label: "Result Processing", type: "select", options: ["Tabulation Register Lead", "Assisting"], required: false },
          { name: "qpHandlingPermission", label: "Question Paper Handling Permission", type: "select", options: ["Confidential Vault Seal & Custody", "Bundle Sorter", "Not Permitted"], required: false },
          { name: "examRoomAllocationResp", label: "Examination Room Allocation Responsibility", type: "select", options: ["Floor Plan & Seat Layout Generator", "Chart Pasting Lead"], required: false },
          { name: "invigilationCoordination", label: "Invigilation Coordination", type: "select", options: ["Faculty Duty Roster Maker", "Reliever Support"], required: false },
          { name: "attendanceSheetResp", label: "Attendance Sheet & D-Form Responsibility", type: "select", options: ["Daily Collection & Board Dispatch", "Support"], required: false },
          { name: "examMaterialResp", label: "Exam Material (Answer Booklets / Stationery)", type: "select", options: ["Main Booklet Vault Incharge", "Daily Bundle Issuer"], required: false },
          { name: "recordsResp", label: "Records & Tabulation Register Custody", type: "select", options: ["Permanent Record Custodian", "Archival Assistant"], required: false },
          { name: "resultPublicationSupport", label: "Result Publication Support", type: "select", options: ["SMS Alert & Notice Board Lead", "Website Sync"], required: false },
          { name: "remarks", label: "Remarks", type: "textarea", gridSpan: "is-wide", required: false }
        ]
      }
    }
  },

  ADMINISTRATION: {
    deptName: "Administration",
    deptCode: "ADMINISTRATION",
    tagline: "Institutional Governance & Operations",
    icon: "Building",
    description: "Coordinate general office workflow, official dispatches, visitor reception, and institutional records.",
    highlights: [
      "Official Correspondence & Document Movement",
      "Executive Approval Escalations",
      "Visitor Reception & Meeting Schedules",
      "Inward / Outward Despatch Management",
      "General Institutional Office Operations"
    ],
    roles: [
      "Administrator",
      "Administrative Officer",
      "Office Administrator",
      "Office Superintendent",
      "Office Assistant",
      "Clerk",
      "Senior Clerk",
      "Junior Clerk",
      "Data Entry Operator",
      "Receptionist",
      "Front Desk Executive",
      "Attender",
      "Peon"
    ],
    roleConfigs: {
      ADMINISTRATIVE_OFFICER: {
        title: "Administration Details (Officer / Superintendent)",
        roleLabel: "Administrator / Administrative Officer / Office Superintendent",
        docList: [
          { key: "degreeCertDoc", label: "Degree / Post Graduate Certificate", required: true },
          { key: "experienceDoc", label: "Experience Certificate", required: true }
        ],
        fields: [
          { name: "officeSection", label: "Office Section", type: "select", options: ["General Administration", "Academic Office", "Establishment Section", "Secretariat", "Legal & Statutory"], required: true },
          { name: "approvalResp", label: "Approval Responsibility", type: "select", options: ["Primary Recommending Authority", "Document Signatory", "Administrative Lead"], required: false },
          { name: "docApprovalLevel", label: "Document Approval Level", type: "select", options: ["Level 3 (Senior AO)", "Level 2 (Superintendent)", "Level 1 (Section Incharge)"], required: false },
          { name: "correspondenceResp", label: "Correspondence Responsibility", type: "select", options: ["Government / Board Liaison", "Inter-Departmental Circulars", "Parent Notices"], required: false },
          { name: "staffCoordination", label: "Staff Coordination", type: "select", options: ["Supervises Office Assistants & Clerks", "General Oversight"], required: false },
          { name: "fileMovementResp", label: "File Movement Responsibility", type: "select", options: ["Chief File Custodian & Movement Tracker", "Section Lead"], required: false },
          { name: "meetingCoordination", label: "Meeting Coordination", type: "select", options: ["Governing Body & Academic Council Lead", "Staff Meetings"], required: false },
          { name: "officialLetterResp", label: "Official Letter Drafting & Dispatch", type: "select", options: ["Authorized Drafter", "Verification"], required: false },
          { name: "recordsResp", label: "Records Responsibility", type: "select", options: ["Institutional Archives Lead", "General Records"], required: false },
          { name: "remarks", label: "Remarks", type: "textarea", gridSpan: "is-wide", required: false }
        ]
      },
      RECEPTIONIST: {
        title: "Administration Details (Front Desk)",
        roleLabel: "Receptionist / Front Desk Executive",
        docList: [
          { key: "degreeCertDoc", label: "Degree Certificate", required: false },
          { key: "experienceDoc", label: "Experience Certificate", required: false }
        ],
        fields: [
          { name: "frontDeskAssignment", label: "Front Desk Assignment", type: "text", placeholder: "e.g., Main Entrance Reception Lounge", required: false },
          { name: "visitorManagement", label: "Visitor Management", type: "select", options: ["Visitor Registration & Badge Issuance", "General Information Desk"], required: false },
          { name: "incomingCallResp", label: "Incoming Call Responsibility", type: "select", options: ["EPABX Switchboard Operator", "Direct Extension Lead"], required: false },
          { name: "appointmentManagement", label: "Appointment Management", type: "select", options: ["Principal / Management Calendar Coordinator", "General Scheduling"], required: false },
          { name: "courierParcelResp", label: "Courier / Parcel Responsibility", type: "select", options: ["Inward / Outward Courier Register Lead", "General Log"], required: false },
          { name: "visitorPassResp", label: "Visitor Pass Responsibility", type: "select", options: ["Digital Pass Generator", "Manual Visitor Badge"], required: false },
          { name: "receptionShift", label: "Reception Shift", type: "select", options: ["Morning (8:00 AM - 4:00 PM)", "General (9:00 AM - 5:30 PM)"], required: false },
          { name: "emergencyContactHandling", label: "Emergency Contact Handling", type: "select", options: ["First Contact Point for Incoming Inquiries", "General Support"], required: false },
          { name: "remarks", label: "Remarks", type: "textarea", gridSpan: "is-wide", required: false }
        ]
      },
      DATA_ENTRY_OPERATOR: {
        title: "Administration Details (Data Entry)",
        roleLabel: "Data Entry Operator / Clerk",
        docList: [
          { key: "degreeCertDoc", label: "Computer / Typing Certificate", required: false }
        ],
        fields: [
          { name: "assignedModule", label: "Assigned Module", type: "select", options: ["Student Records & Admissions", "Examination & Marks", "Staff Establishment", "Fee Receipts", "General Typing"], required: false },
          { name: "dataEntryType", label: "Data Entry Type", type: "text", placeholder: "e.g., Student Application Scanning & Bulk Entry", required: false },
          { name: "systemAccessLevel", label: "System Access Level", type: "select", options: ["Data Entry Role (Read/Write)", "Restricted"], required: false },
          { name: "docScanningResp", label: "Document Scanning Responsibility", type: "select", options: ["High Speed Batch Scanner Operator", "Assisting"], required: false },
          { name: "reportEntryResp", label: "Report Entry Responsibility", type: "select", options: ["Monthly Statistical Reports", "Daily Logs"], required: false },
          { name: "recordDigitization", label: "Record Digitization", type: "select", options: ["Historical Paper Record Digitizer", "Current Year Only"], required: false },
          { name: "shift", label: "Shift", type: "select", options: ["General (9:00 AM - 5:30 PM)", "Morning Shift"], required: false },
          { name: "remarks", label: "Remarks", type: "textarea", gridSpan: "is-wide", required: false }
        ]
      },
      ATTENDER_PEON: {
        title: "Administration Details (Support Staff)",
        roleLabel: "Office Assistant / Attender / Peon",
        docList: [
          { key: "identityDoc", label: "Aadhaar / ID Card", required: true }
        ],
        fields: [
          { name: "assignedOffice", label: "Assigned Office / Department", type: "text", placeholder: "e.g., Principal Office / Admin Section", required: false },
          { name: "reportingOfficer", label: "Reporting Officer", type: "text", placeholder: "e.g., Administrative Officer", required: false },
          { name: "shift", label: "Shift", type: "select", options: ["General (8:00 AM - 5:00 PM)", "Extended Day"], required: false },
          { name: "docMovementResp", label: "Document Movement Responsibility", type: "select", options: ["Inter-departmental File Movement", "External Post Office / Bank Delivery"], required: false },
          { name: "officeSupportResp", label: "Office Support Responsibility", type: "select", options: ["Office Setup, Photocopying & Stationery", "General"], required: false },
          { name: "courierResp", label: "Courier & Despatch Handover", type: "select", options: ["Local Hand Delivery Lead", "Assisting"], required: false },
          { name: "meetingRoomResp", label: "Meeting Room Hospitality & Setup", type: "select", options: ["Board Room & Staff Meeting Setup", "Routine"], required: false },
          { name: "remarks", label: "Remarks", type: "textarea", gridSpan: "is-wide", required: false }
        ]
      }
    }
  },

  HR: {
    deptName: "Human Resources",
    deptCode: "HR",
    tagline: "Staff Welfare & Talent Management",
    icon: "Users",
    description: "Oversee staff onboarding, biometric attendance, leaves, background verifications, and appraisals.",
    highlights: [
      "Staff Recruitment & Interview Coordination",
      "Employee Profile Verification & Onboarding",
      "Leave Policy & Biometric Attendance Sync",
      "Background Check & Police Verifications",
      "Annual Appraisals & Staff Welfare Programs"
    ],
    roles: [
      "HR Manager",
      "HR Executive",
      "HR Assistant",
      "Recruitment Coordinator"
    ],
    roleConfigs: {
      HR_MANAGER: {
        title: "Human Resources Details",
        roleLabel: "HR Manager / HR Executive / Recruitment Coordinator",
        docList: [
          { key: "degreeCertDoc", label: "MBA HR / Master Degree Certificate", required: true },
          { key: "experienceDoc", label: "Experience Certificate", required: true }
        ],
        fields: [
          { name: "recruitmentAccess", label: "Recruitment Access", type: "select", options: ["Full Portal Recruitment Lead", "Candidate Screening", "None"], required: false },
          { name: "employeeRecordsAccess", label: "Employee Records Access", type: "select", options: ["Full Confidential Dossier Access", "General HR View"], required: false },
          { name: "attendanceManagementAccess", label: "Attendance Management Access", type: "select", options: ["Biometric Master Admin", "Leave Adjuster Only"], required: false },
          { name: "leaveManagementAccess", label: "Leave Management Access", type: "select", options: ["Leave Sanction / Policy Verifier", "Support"], required: false },
          { name: "payrollInputPermission", label: "Payroll Input Permission", type: "select", options: ["Authorized (Attendance/LOP/Increments)", "View Only"], required: false },
          { name: "staffDocVerification", label: "Staff Document Verification", type: "select", options: ["Primary Document Authenticator", "Secondary Check"], required: false },
          { name: "onboardingResp", label: "Onboarding Responsibility", type: "select", options: ["New Hire Orientation Lead", "Welcome Kit Issuer"], required: false },
          { name: "exitProcessResp", label: "Exit Process Responsibility", type: "select", options: ["No Dues Clearance & Relieving Letters", "Exit Interviewer"], required: false },
          { name: "interviewCoordination", label: "Interview Coordination", type: "select", options: ["Faculty Selection Committee Liaison", "General Staff Hiring"], required: false },
          { name: "backgroundVerification", label: "Background Verification", type: "select", options: ["Third Party BGV / Police Verification Lead", "Reference Checker"], required: false },
          { name: "trainingCoordination", label: "Faculty Development & Staff Training", type: "select", options: ["FDP & Soft Skills Workshop Lead", "Support"], required: false },
          { name: "performanceReviewSupport", label: "Performance Review Support", type: "select", options: ["Annual Appraisal Form & Score Collector", "Analytics"], required: false },
          { name: "remarks", label: "Remarks", type: "textarea", gridSpan: "is-wide", required: false }
        ]
      }
    }
  },

  ADMISSIONS: {
    deptName: "Admissions",
    deptCode: "ADMISSIONS",
    tagline: "Student Enrollment & Guidance",
    icon: "GraduationCap",
    description: "Lead new student counselling, eligibility checks, registration tokens, and admission drive campaigns.",
    highlights: [
      "Student Career Guidance & Counselling",
      "Board Certificate & Eligibility Verification",
      "Application Form Review & Fee Liaison",
      "Admission Enquiry Lead Tracking",
      "Scholarship & Merit Quota Guidance"
    ],
    roles: [
      "Admissions Officer",
      "Admission Coordinator",
      "Admission Executive",
      "Counsellor",
      "Front Desk Executive",
      "Data Entry Operator"
    ],
    roleConfigs: {
      ADMISSIONS_OFFICER: {
        title: "Admissions Department Details",
        roleLabel: "Admissions Officer / Coordinator / Counsellor",
        docList: [
          { key: "degreeCertDoc", label: "Degree Certificate", required: true },
          { key: "experienceDoc", label: "Experience Certificate", required: false }
        ],
        fields: [
          { name: "boardResponsibility", label: "Board Responsibility", type: "select", options: ["BIEAP (Andhra Pradesh)", "TSBIE (Telangana)", "CBSE / ICSE", "All Boards"], required: false },
          { name: "admissionYear", label: "Academic Admission Year", type: "select", options: ["2026-2027", "2025-2026", "2027-2028"], required: false },
          { name: "admissionCounselling", label: "Admission Counselling", type: "select", options: ["Lead Academic Counsellor", "Group Course Advisor"], required: false },
          { name: "applicationVerification", label: "Application Verification", type: "select", options: ["Primary Scrutiny Officer", "Document Verifier"], required: false },
          { name: "documentVerification", label: "10th / SSC Memo & TC Verification", type: "select", options: ["Authorized Authenticator", "General"], required: false },
          { name: "feeCoordination", label: "Fee Coordination", type: "select", options: ["Installment Structure Guidance", "Accounts Liaison"], required: false },
          { name: "studentRegistrationPerm", label: "Student Registration Permission", type: "select", options: ["Authorized Roll / Admission Number Issuer", "Draft Entry Only"], required: false },
          { name: "counsellingTarget", label: "Counselling Target (Seats / Season)", type: "number", placeholder: "e.g., 200", required: false },
          { name: "admissionEnquiryHandling", label: "Admission Enquiry Handling", type: "select", options: ["Walk-In & Telephone Desk Lead", "Campaign Lead"], required: false },
          { name: "leadFollowupResp", label: "Lead Follow-Up Responsibility", type: "select", options: ["CRM Lead Followup Executive", "Assisting"], required: false },
          { name: "scholarshipGuidance", label: "Scholarship Guidance", type: "select", options: ["State Fee Reimbursement (JVD/EBC) Lead", "Merit Discount"], required: false },
          { name: "parentCommunication", label: "Parent Communication", type: "select", options: ["Parent Counseling & Campus Tour Lead", "General"], required: false },
          { name: "remarks", label: "Remarks", type: "textarea", gridSpan: "is-wide", required: false }
        ]
      }
    }
  },

  HOUSEKEEPING: {
    deptName: "Housekeeping",
    deptCode: "HOUSEKEEPING",
    tagline: "Campus Hygiene & Sanitation",
    icon: "Sparkles",
    description: "Maintain spotless academic blocks, classroom furniture sanitization, restrooms, and waste handling.",
    highlights: [
      "Classroom, Corridor & Washroom Cleaning",
      "Sanitation Roster & Supply Dispensation",
      "Bio-waste & Campus Trash Segregation",
      "Floor Care, Scrubbing & Fumigation",
      "Daily Quality Inspection Checklists"
    ],
    roles: [
      "Housekeeping Supervisor",
      "Housekeeping Staff",
      "Cleaner",
      "Sanitation Worker"
    ],
    roleConfigs: {
      HOUSEKEEPING_STAFF: {
        title: "Housekeeping Details (Staff / Cleaner)",
        roleLabel: "Housekeeping Staff / Cleaner / Sanitation Worker",
        docList: [
          { key: "identityDoc", label: "Aadhaar / Photo ID Card", required: true }
        ],
        fields: [
          { name: "assignedBuilding", label: "Assigned Block / Building", type: "text", placeholder: "e.g., Main Science Wing & Library", required: true },
          { name: "floor", label: "Floor", type: "text", placeholder: "e.g., Ground & 1st Floor", required: false },
          { name: "shift", label: "Shift", type: "select", options: ["Morning (6:30 AM - 2:30 PM)", "General (8:00 AM - 4:00 PM)", "Evening Shift"], required: true },
          { name: "cleaningZone", label: "Cleaning Zone", type: "text", placeholder: "e.g., Zone B (Classrooms 101 to 112)", required: false },
          { name: "washroomResp", label: "Washroom Responsibility", type: "select", options: ["Assigned Washroom Deep Cleaning", "General Floor Area"], required: false },
          { name: "commonAreaResp", label: "Common Area Responsibility", type: "select", options: ["Corridors, Verandas & Staircases", "Courtyards"], required: false },
          { name: "classroomResp", label: "Classroom Responsibility", type: "select", options: ["Daily Desk Wiping, Blackboard & Sweep", "Assisting"], required: false },
          { name: "cleaningSuppliesResp", label: "Cleaning Supplies Issued", type: "text", placeholder: "e.g., Chemicals, Mops, Carts", required: false },
          { name: "supervisor", label: "Supervisor Name", type: "text", required: false },
          { name: "equipmentIssued", label: "Equipment Issued", type: "text", placeholder: "e.g., Floor Wiper, Vacuum", required: false },
          { name: "wasteManagementResp", label: "Waste Management Responsibility", type: "select", options: ["Segregated Dustbin Emptying to Main Yard", "Routine"], required: false },
          { name: "sanitationResp", label: "Sanitation Responsibility", type: "select", options: ["Disinfection & Odor Control", "Standard"], required: false },
          { name: "remarks", label: "Remarks", type: "textarea", gridSpan: "is-wide", required: false }
        ]
      },
      HOUSEKEEPING_SUPERVISOR: {
        title: "Housekeeping Supervisor Details",
        roleLabel: "Housekeeping Supervisor",
        docList: [
          { key: "experienceDoc", label: "Supervisor Experience Certificate", required: true },
          { key: "identityDoc", label: "Identity Proof", required: true }
        ],
        fields: [
          { name: "assignedBuilding", label: "Assigned Block / Building", type: "text", placeholder: "e.g., All Campus Blocks", required: true },
          { name: "shift", label: "Shift", type: "select", options: ["General Supervisory Shift", "Morning Shift Lead"], required: true },
          { name: "teamSize", label: "Team Size", type: "number", placeholder: "e.g., 20 Workers", required: false },
          { name: "staffSupervised", label: "Staff Supervised (Floor Allocations)", type: "text", placeholder: "e.g., 6 Cleaners per Block", required: false },
          { name: "shiftAllocation", label: "Shift Allocation Responsibility", type: "select", options: ["Daily Attendance & Roster Maker", "Shared"], required: false },
          { name: "cleaningInspection", label: "Cleaning Inspection", type: "select", options: ["Hourly Inspection with Checklist", "Twice Daily Audit"], required: false },
          { name: "supplyStockMonitoring", label: "Supply Stock Monitoring", type: "select", options: ["Central Chemical & Detergent Store Keeper", "Weekly Requisition"], required: false },
          { name: "complaintResolution", label: "Complaint Resolution", type: "select", options: ["Direct Helpdesk Response", "Escalation Lead"], required: false },
          { name: "dailyChecklistApproval", label: "Daily Checklist Approval", type: "select", options: ["Signs Daily Cleanliness Registers", "Digital Log"], required: false },
          { name: "remarks", label: "Remarks", type: "textarea", gridSpan: "is-wide", required: false }
        ]
      }
    }
  },

  STORES_INVENTORY: {
    deptName: "Stores & Inventory",
    deptCode: "STORES_INVENTORY",
    tagline: "Procurement & Material Management",
    icon: "Package",
    description: "Manage central inventory, stationery distribution, purchase indent orders, and stock verification.",
    highlights: [
      "Stationery & Uniform Stock Control",
      "Purchase Indents & Vendor Goods Receipt",
      "Asset Tagging & QR/Barcode Inventory",
      "Department Material Requisition Approvals",
      "Minimum Buffer Stock Alerts & Audits"
    ],
    roles: [
      "Store Keeper",
      "Inventory Assistant",
      "Purchase Assistant",
      "Procurement Executive"
    ],
    roleConfigs: {
      STORE_KEEPER: {
        title: "Stores & Inventory Details",
        roleLabel: "Store Keeper / Inventory Assistant / Procurement Executive",
        docList: [
          { key: "degreeCertDoc", label: "Degree / Diploma in Material Management", required: false },
          { key: "experienceDoc", label: "Experience Certificate", required: true }
        ],
        fields: [
          { name: "storeLocation", label: "Store Location", type: "select", options: ["Central Stores (Basement)", "Stationery & Uniform Depot", "Science Lab Central Store", "Maintenance Spares Store"], required: true },
          { name: "inventoryCategory", label: "Inventory Category", type: "select", options: ["Classroom Stationery & Printing", "Lab Consumables & Glassware", "Uniforms & Badges", "IT & Maintenance Spares", "General Campus Stock"], required: true },
          { name: "stockIssuePermission", label: "Stock Issue Permission", type: "select", options: ["Authorized Indent Issuer", "Requires HOD Sign Off"], required: false },
          { name: "purchaseRequestPerm", label: "Purchase Request Permission", type: "select", options: ["Indent Initiator", "Verification Lead"], required: false },
          { name: "vendorCoordination", label: "Vendor Coordination", type: "select", options: ["Delivery Verification & Gate Pass", "Direct Supplier Liaison"], required: false },
          { name: "assetManagement", label: "Asset Tagging & Registry", type: "select", options: ["Barcode / Asset Tag Applicator", "Ledger Incharge"], required: false },
          { name: "stockVerification", label: "Stock Verification", type: "select", options: ["Quarterly Physical Stock Count Lead", "Daily Log"], required: false },
          { name: "goodsReceiptResp", label: "Goods Receipt (GRN) Responsibility", type: "select", options: ["Quality Inspection & GRN Maker", "Assisting"], required: false },
          { name: "purchaseOrderSupport", label: "Purchase Order Support", type: "select", options: ["PO Comparison & Indent Match", "Support"], required: false },
          { name: "minStockMonitoring", label: "Minimum Stock Buffer Monitoring", type: "select", options: ["Reorder Level Alerts Incharge", "Monthly Review"], required: false },
          { name: "inventoryAuditResp", label: "Inventory Audit Responsibility", type: "select", options: ["Annual Audit Support", "Scrap Disposal Lead"], required: false },
          { name: "remarks", label: "Remarks", type: "textarea", gridSpan: "is-wide", required: false }
        ]
      }
    }
  },

  STUDENT_AFFAIRS: {
    deptName: "Student Affairs",
    deptCode: "STUDENT_AFFAIRS",
    tagline: "Student Welfare & Engagement",
    icon: "HeartHandshake",
    description: "Support student counselling, anti-ragging oversight, discipline coordination, and welfare schemes.",
    highlights: [
      "Student Psychological & Academic Counselling",
      "Anti-Ragging Squad & Discipline Records",
      "Grievance Redressal Committee Liaison",
      "Government Scholarship & Welfare Schemes",
      "College Annual Fests & Sports Meet Coordination"
    ],
    roles: [
      "Student Welfare Officer",
      "Student Affairs Coordinator",
      "Counsellor",
      "Discipline Coordinator"
    ],
    roleConfigs: {
      STUDENT_WELFARE_OFFICER: {
        title: "Student Affairs Details",
        roleLabel: "Student Welfare Officer / Coordinator / Counsellor / Discipline Lead",
        docList: [
          { key: "degreeCertDoc", label: "MSW / Psychology / Master Degree Certificate", required: true },
          { key: "experienceDoc", label: "Experience Certificate", required: false }
        ],
        fields: [
          { name: "studentSupportResp", label: "Student Support Responsibility", type: "select", options: ["Student Welfare Lead", "Scholarship & Mentorship Advisor"], required: false },
          { name: "counsellingResp", label: "Counselling Responsibility", type: "select", options: ["Certified Student Counselor (Confidential)", "Academic Guidance"], required: false },
          { name: "disciplineResp", label: "Discipline Responsibility", type: "select", options: ["Discipline Committee Convener", "Squad Member"], required: false },
          { name: "parentCoordination", label: "Parent Coordination", type: "select", options: ["Parent Teacher Meets & Special Calls", "Routine"], required: false },
          { name: "grievanceHandling", label: "Grievance Handling", type: "select", options: ["Internal Grievance Box Custodian", "Committee Secretary"], required: false },
          { name: "scholarshipSupport", label: "Scholarship Support", type: "select", options: ["National Scholarship Portal & State Welfare Liaison", "General"], required: false },
          { name: "studentEventsCoord", label: "Student Events Coordination", type: "select", options: ["Cultural Fest & Annual Day Lead", "Sports Coordinator"], required: false },
          { name: "antiRaggingResp", label: "Anti-Ragging Responsibility", type: "select", options: ["Anti-Ragging Squad Active Officer", "Surveillance Liaison"], required: false },
          { name: "welfareProgramResp", label: "Student Welfare Program Responsibility", type: "select", options: ["Health Camps & Life Skills Programs", "Support"], required: false },
          { name: "emergencyStudentSupport", label: "Emergency Student Support", type: "select", options: ["24x7 Student Helpline Lead", "First Responder"], required: false },
          { name: "remarks", label: "Remarks", type: "textarea", gridSpan: "is-wide", required: false }
        ]
      }
    }
  },

  CAMPUS_OPERATIONS: {
    deptName: "Campus Operations",
    deptCode: "CAMPUS_OPERATIONS",
    tagline: "Campus Facility Operations",
    icon: "Layers",
    description: "Manage integrated facility coordination, vendor operations, event logistics, and emergency escalations.",
    highlights: [
      "Cross-Department Facility Integration",
      "Vendor Contract Performance & SLA Audits",
      "Campus Event Logistics & Auditorium Scheduling",
      "Fire Safety, Disaster Management & Emergency Plans",
      "Campus Asset Safety & Environment Maintenance"
    ],
    roles: [
      "Operations Manager",
      "Operations Executive",
      "Facility Supervisor",
      "Store Keeper"
    ],
    roleConfigs: {
      OPERATIONS_MANAGER: {
        title: "Campus Operations Details",
        roleLabel: "Operations Manager / Operations Executive / Facility Supervisor",
        docList: [
          { key: "degreeCertDoc", label: "Degree / MBA in Operations", required: true },
          { key: "experienceDoc", label: "Experience Certificate", required: true }
        ],
        fields: [
          { name: "assignedCampus", label: "Assigned Campus", type: "text", placeholder: "e.g., Main Campus (All Blocks)", required: false },
          { name: "operationalArea", label: "Operational Area", type: "select", options: ["Integrated Campus Operations", "Logistics & Fleet Operations", "Events & Facilities"], required: false },
          { name: "shift", label: "Shift", type: "select", options: ["General Shift (8:00 AM - 5:30 PM)", "Event Hours Standby"], required: false },
          { name: "facilityCoordination", label: "Facility Coordination", type: "select", options: ["Auditorium, Seminar Halls & Sports Ground Incharge", "General"], required: false },
          { name: "vendorCoordination", label: "Vendor Coordination", type: "select", options: ["Canteen, Security, Cleaning Vendor Contract Lead", "Liaison"], required: false },
          { name: "transportCoordination", label: "Transport Coordination", type: "select", options: ["Operational Oversight", "Fleet Backup Support"], required: false },
          { name: "securityCoordination", label: "Security Coordination", type: "select", options: ["Chief Security Liaison", "Shift Auditor"], required: false },
          { name: "housekeepingCoord", label: "Housekeeping Coordination", type: "select", options: ["Hygiene & Sanitation Quality Lead", "General"], required: false },
          { name: "maintenanceCoord", label: "Maintenance Coordination", type: "select", options: ["Infrastructure Work Order Overseer", "AMC Tracker"], required: false },
          { name: "eventSupport", label: "Event Support", type: "select", options: ["Stage, Sound, Seating & VIP Hospitality Lead", "Support"], required: false },
          { name: "emergencyCoordination", label: "Emergency Coordination", type: "select", options: ["Chief Campus Disaster / Evacuation Lead", "First Responder"], required: false },
          { name: "assetResponsibility", label: "Asset Responsibility", type: "select", options: ["Overall Campus Fixed Asset Registry Lead", "General"], required: false },
          { name: "remarks", label: "Remarks", type: "textarea", gridSpan: "is-wide", required: false }
        ]
      }
    }
  },

  LAB_SUPPORT: {
    deptName: "Laboratory Support",
    deptCode: "LAB_SUPPORT",
    tagline: "Lab Equipment & Practical Safety",
    icon: "FlaskConical",
    description: "Support physics, chemistry, biology, and computer laboratories with apparatus setup and safety.",
    highlights: [
      "Practical Session Apparatus Setup",
      "Chemical Storage & Hazardous Material Safety",
      "Lab Consumables Stock Registers & Breakage Log",
      "Equipment Calibration & Routine Maintenance",
      "Student Lab Access & Safety Goggle Protocols"
    ],
    roles: [
      "Lab Assistant",
      "Lab Technician",
      "Lab Attendant",
      "Store Keeper"
    ],
    roleConfigs: {
      LAB_ASSISTANT: {
        title: "Laboratory Support Details",
        roleLabel: "Lab Assistant / Lab Technician / Lab Attendant",
        docList: [
          { key: "degreeCertDoc", label: "B.Sc / Diploma in Lab Technology", required: true },
          { key: "experienceDoc", label: "Experience Certificate", required: false }
        ],
        fields: [
          { name: "assignedLab", label: "Assigned Laboratory", type: "select", options: ["Physics Laboratory", "Chemistry Laboratory", "Botany / Zoology Laboratory", "Computer Science Lab", "Electronics Lab"], required: true },
          { name: "labType", label: "Laboratory Level", type: "select", options: ["Senior Intermediate Labs", "Junior Practical Labs", "Research Lab"], required: false },
          { name: "shift", label: "Shift", type: "select", options: ["Practical Hours Shift (8:30 AM - 4:30 PM)", "Morning Shift"], required: false },
          { name: "equipmentResp", label: "Equipment Responsibility", type: "select", options: ["Microscopes, Spectrometers & Instruments Custodian", "Routine Setup"], required: false },
          { name: "consumablesResp", label: "Consumables Responsibility", type: "select", options: ["Reagents, Chemicals & Glassware Issuer", "Daily Prep"], required: false },
          { name: "inventoryResp", label: "Inventory Responsibility", type: "select", options: ["Stock & Breakage Register Custodian", "Annual Verification"], required: false },
          { name: "safetyResp", label: "Safety Responsibility", type: "select", options: ["First Aid & Eye Wash Station Lead", "Fire Extinguisher Incharge"], required: false },
          { name: "chemicalHandlingPerm", label: "Chemical Handling & Acid Vault Permission", type: "select", options: ["Authorized Key Holder (Safe Storage)", "Not Applicable"], required: false },
          { name: "practicalSessionSupport", label: "Practical Session Support", type: "select", options: ["Assists Faculty during Experiments", "Table Setup Only"], required: false },
          { name: "equipmentMaint", label: "Equipment Maintenance", type: "select", options: ["Routine Cleaning & Calibration", "Vendor Repair Logger"], required: false },
          { name: "stockRegisterResp", label: "Stock Register Responsibility", type: "select", options: ["Maintains Daily Chemical Usage Log", "Monthly Report"], required: false },
          { name: "labAccessManagement", label: "Lab Access Management", type: "select", options: ["Student Entry Register & Lockup Lead", "General"], required: false },
          { name: "remarks", label: "Remarks", type: "textarea", gridSpan: "is-wide", required: false }
        ]
      }
    }
  }
};

// 3. Helper Functions for Components
export function getDepartmentConfig(deptName) {
  const normDept = normalizeDepartmentCode(deptName);
  return NON_TEACHING_ROLE_CONFIG[normDept] || NON_TEACHING_ROLE_CONFIG.ADMINISTRATION;
}

export function getDepartmentRoles(deptName) {
  const deptConfig = getDepartmentConfig(deptName);
  return deptConfig.roles || [];
}

export function getRoleConfig(deptName, desigName) {
  const deptConfig = getDepartmentConfig(deptName);
  const normDesig = normalizeDesignationCode(desigName);

  // 1. Direct match in roleConfigs
  if (deptConfig.roleConfigs[normDesig]) {
    return deptConfig.roleConfigs[normDesig];
  }

  // 2. Fallback matching rules per department
  const keys = Object.keys(deptConfig.roleConfigs);
  if (keys.length > 0) {
    // If exact key found, return it
    for (const k of keys) {
      if (normDesig.includes(k) || k.includes(normDesig)) {
        return deptConfig.roleConfigs[k];
      }
    }
    // Return the first config as sensible default
    return deptConfig.roleConfigs[keys[0]];
  }

  return {
    title: `${deptConfig.deptName} Details`,
    roleLabel: desigName || "Staff Role",
    docList: [],
    fields: [
      { name: "roleResponsibilities", label: "Role Responsibilities", type: "text", required: true },
      { name: "shift", label: "Shift", type: "select", options: ["Morning", "Evening", "General Day", "Rotational"], required: true },
      { name: "remarks", label: "Additional Remarks", type: "textarea", gridSpan: "is-wide", required: false }
    ]
  };
}

