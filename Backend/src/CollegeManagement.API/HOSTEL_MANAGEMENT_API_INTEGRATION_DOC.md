# 🏨 Hostel Management Module — Frontend API Integration Guide

This document provides complete details of all RESTful APIs for the **Hostel Management** module in `CollegeManagement.API`. It is specifically mapped to each frontend screen, tab, modal, and user action.

---

## 🌐 General API Information

- **Base URL:** `http://<backend-host>:<port>/api/v1/hostel`
- **Request Headers:**
  - `Content-Type: application/json`
  - `Accept: application/json`
  - `Authorization: Bearer <JWT_TOKEN>` *(when authentication is enabled)*
- **Standard Response Structure:**
```json
{
  "success": true,
  "message": "Operation successful description",
  "data": { ... }
}
```
- **Error Response Structure (400 / 404 / 500):**
```json
{
  "success": false,
  "message": "Error details description"
}
```

---

## 📑 Quick Navigation (Screens & Modules)

1. [Hostel Dashboard (`/hostel`)](#1-hostel-dashboard-screen-hostel)
2. [Hostel Master Setup (`/hostel/master-setup`)](#2-hostel-master-setup-screen-hostelmaster-setup)
   - [Tab 1: Hostel Blocks](#tab-1-hostel-blocks)
   - [Tab 2: Room Categories](#tab-2-room-categories)
   - [Tab 3: Rooms & Bed Allocation](#tab-3-rooms--bed-allocation)
   - [Tab 4: Warden Allocation](#tab-4-warden-allocation)
3. [Student Management (`/hostel/students`)](#3-student-management-screen-hostelstudents)
   - [Tab 1: Student Hostel Allocation](#tab-1-student-hostel-allocation)
   - [Tab 2: Hostel Attendance Register](#tab-2-hostel-attendance-register)
   - [Tab 3: Outpass & Leave Management](#tab-3-outpass--leave-management)
   - [Tab 4: Transfer & Vacate Student](#tab-4-transfer--vacate-student)
4. [Hostel Reports (`/hostel/reports`)](#4-hostel-reports-screen-hostelreports)
5. [Enums & Valid Values Reference](#5-enums--valid-values-reference)

---

## 1. Hostel Dashboard Screen (`/hostel`)

### 1.1 Get Dashboard Statistics & Block Metrics
Fetches top KPI cards (Total Hostels, Total Capacity, Occupancy Rate, Occupied Beds, Vacant Beds, Hostellers, Active Wardens) and Hostel Blocks breakdown.

- **Method:** `GET`
- **Endpoint:** `/api/v1/hostel/dashboard`
- **Query Parameters:**
  | Parameter | Type | Required | Description |
  | :--- | :--- | :--- | :--- |
  | `hostelId` | `int` | Optional | Filter dashboard metrics for a specific hostel block |

- **Sample Response:**
```json
{
  "success": true,
  "message": "Hostel dashboard retrieved successfully.",
  "data": {
    "totalHostels": 7,
    "totalRooms": 65,
    "totalBeds": 176,
    "occupiedBeds": 7,
    "availableBeds": 169,
    "activeStudents": 7,
    "activeWardens": 4,
    "occupancyPercentage": 4.00,
    "blocks": [
      {
        "hostelId": 1,
        "hostelName": "Boys Residence - Block A",
        "hostelCode": "BLK-A",
        "hostelType": "Boys",
        "totalRooms": 20,
        "totalBeds": 50,
        "occupiedBeds": 3,
        "availableBeds": 47,
        "activeStudents": 3,
        "activeWardens": 1,
        "occupancyPercentage": 6.00
      }
    ]
  }
}
```

### 1.2 Recent Bed Allocations (Dashboard Widget)
- **Method:** `GET`
- **Endpoint:** `/api/v1/hostel/student-allocations?status=Active`
- *Returns the list of currently active student allocations.*

### 1.3 Active Outpass & Leave Requests (Dashboard Widget)
- **Method:** `GET`
- **Endpoint:** `/api/v1/hostel/outpass-leave?approvalStatus=Pending`
- *Returns pending outpass/leave requests.*

---

## 2. Hostel Master Setup Screen (`/hostel/master-setup`)

---

### Tab 1: Hostel Blocks

#### A. List & Filter Hostel Blocks
- **Method:** `GET`
- **Endpoint:** `/api/v1/hostel/blocks`
- **Query Parameters:**
  | Parameter | Type | Required | Description |
  | :--- | :--- | :--- | :--- |
  | `search` | `string` | Optional | Search by block name, code, or type |
  | `status` | `string` | Optional | Filter by status (`Active` / `Inactive`) |

#### B. Get Hostel Block By ID
- **Method:** `GET`
- **Endpoint:** `/api/v1/hostel/blocks/{id}`

#### C. Add New Hostel Block (Modal Action)
- **Method:** `POST`
- **Endpoint:** `/api/v1/hostel/blocks`
- **Request Body (`CreateHostelBlockDto`):**
```json
{
  "hostelName": "Boys Residence - Block A",
  "hostelCode": "BLK-A",
  "hostelType": "Boys",
  "totalFloors": 4,
  "primaryMobileNumber": "+91 9876543210",
  "alternateMobileNumber": "+91 9876543211",
  "email": "hostel.blocka@college.edu",
  "status": "Active",
  "address": "North Campus, Block A"
}
```

#### D. Update Hostel Block
- **Method:** `PUT`
- **Endpoint:** `/api/v1/hostel/blocks/{id}`
- **Request Body:** Same schema as Create.

#### E. Delete Hostel Block
- **Method:** `DELETE`
- **Endpoint:** `/api/v1/hostel/blocks/{id}`

---

### Tab 2: Room Categories

#### A. List & Filter Room Categories
- **Method:** `GET`
- **Endpoint:** `/api/v1/hostel/room-types`
- **Query Parameters:**
  | Parameter | Type | Required | Description |
  | :--- | :--- | :--- | :--- |
  | `search` | `string` | Optional | Search by specification or description |
  | `status` | `string` | Optional | Filter by status (`Active` / `Inactive`) |

#### B. Get Room Category By ID
- **Method:** `GET`
- **Endpoint:** `/api/v1/hostel/room-types/{id}`

#### C. Add Room Category (Modal Action)
- **Method:** `POST`
- **Endpoint:** `/api/v1/hostel/room-types`
- **Request Body (`CreateRoomTypeConfigDto`):**
```json
{
  "roomTypeSpecification": "Double Sharing AC Deluxe",
  "bedCapacity": 2,
  "acType": "AC",
  "status": "Active",
  "description": "AC, Attached Bath, Wi-Fi, Balcony"
}
```

#### D. Update Room Category
- **Method:** `PUT`
- **Endpoint:** `/api/v1/hostel/room-types/{id}`

#### E. Delete Room Category
- **Method:** `DELETE`
- **Endpoint:** `/api/v1/hostel/room-types/{id}`

---

### Tab 3: Rooms & Bed Allocation

#### A. List & Filter Rooms
- **Method:** `GET`
- **Endpoint:** `/api/v1/hostel/rooms`
- **Query Parameters:**
  | Parameter | Type | Required | Description |
  | :--- | :--- | :--- | :--- |
  | `hostelId` | `int` | Optional | Filter by Hostel Block ID |
  | `roomTypeId` | `int` | Optional | Filter by Room Category ID |
  | `status` | `string` | Optional | Filter by status (`Active` / `Inactive`) |
  | `search` | `string` | Optional | Search by room number or floor level |

#### B. Add / Configure New Room (Modal Action)
- **Method:** `POST`
- **Endpoint:** `/api/v1/hostel/rooms`
- **Request Body (`CreateRoomMasterDto`):**
```json
{
  "hostelId": 1,
  "roomTypeId": 2,
  "floorLevel": "Floor 1",
  "roomNumber": "106",
  "status": "Active"
}
```

#### C. Update Room
- **Method:** `PUT`
- **Endpoint:** `/api/v1/hostel/rooms/{id}`

#### D. Delete Room
- **Method:** `DELETE`
- **Endpoint:** `/api/v1/hostel/rooms/{id}`

#### E. Beds Management (Sub-Endpoints under Rooms)
- **List Beds:** `GET /api/v1/hostel/beds?hostelId={hostelId}&roomId={roomId}&bedStatus={Available/Occupied}&status={Active/Inactive}`
- **Get Bed by ID:** `GET /api/v1/hostel/beds/{id}`
- **Create Bed:** `POST /api/v1/hostel/beds`
```json
{
  "roomId": 10,
  "bedNumber": "BED-1",
  "bedStatus": "Available",
  "status": "Active"
}
```
- **Update Bed:** `PUT /api/v1/hostel/beds/{id}`
- **Delete Bed:** `DELETE /api/v1/hostel/beds/{id}`

---

### Tab 4: Warden Allocation

#### A. List & Filter Warden Assignments
- **Method:** `GET`
- **Endpoint:** `/api/v1/hostel/wardens`
- **Query Parameters:**
  | Parameter | Type | Required | Description |
  | :--- | :--- | :--- | :--- |
  | `hostelId` | `int` | Optional | Filter by Hostel Block ID |
  | `staffId` | `int` | Optional | Filter by Staff member ID |
  | `status` | `string` | Optional | Filter by status (`Active` / `Inactive`) |
  | `search` | `string` | Optional | Search by warden name or employee code |

#### B. Assign Resident Warden (Modal Action)
- **Method:** `POST`
- **Endpoint:** `/api/v1/hostel/wardens`
- **Request Body (`CreateHostelWardenAssignmentDto`):**
```json
{
  "staffId": 15,
  "hostelId": 1,
  "assignmentDate": "2026-09-15T00:00:00Z",
  "status": "Active"
}
```

#### C. Update Warden Assignment
- **Method:** `PUT`
- **Endpoint:** `/api/v1/hostel/wardens/{id}`

#### D. Delete / Relieve Warden Assignment
- **Method:** `DELETE`
- **Endpoint:** `/api/v1/hostel/wardens/{id}`

---

## 3. Student Management Screen (`/hostel/students`)

---

### Tab 1: Student Hostel Allocation

#### A. List Student Allocations
- **Method:** `GET`
- **Endpoint:** `/api/v1/hostel/student-allocations`
- **Query Parameters:**
  | Parameter | Type | Required | Description |
  | :--- | :--- | :--- | :--- |
  | `hostelId` | `int` | Optional | Filter by Hostel Block ID |
  | `roomId` | `int` | Optional | Filter by Room ID |
  | `studentId` | `int` | Optional | Filter by Student ID |
  | `status` | `string` | Optional | Filter by status (`Active` / `Vacated` / `Transferred`) |
  | `search` | `string` | Optional | Search by student name, roll no, admission no |

#### B. Allocate Student Room & Bed (Modal Action)
- **Method:** `POST`
- **Endpoint:** `/api/v1/hostel/student-allocations`
- **Request Body (`CreateHostelStudentAllocationDto`):**
```json
{
  "studentId": 105,
  "hostelId": 1,
  "roomId": 10,
  "bedId": 25,
  "wardenAssignmentId": 3,
  "joiningDate": "2026-09-15T00:00:00Z",
  "status": "Active",
  "remarks": "Allocated via master setup"
}
```

#### C. Update Student Allocation
- **Method:** `PUT`
- **Endpoint:** `/api/v1/hostel/student-allocations/{id}`

#### D. Cancel / Delete Allocation
- **Method:** `DELETE`
- **Endpoint:** `/api/v1/hostel/student-allocations/{id}`

---

### Tab 2: Hostel Attendance Register

#### A. List Attendance Records
- **Method:** `GET`
- **Endpoint:** `/api/v1/hostel/attendance`
- **Query Parameters:**
  | Parameter | Type | Required | Description |
  | :--- | :--- | :--- | :--- |
  | `hostelId` | `int` | Optional | Filter by Hostel Block ID |
  | `roomId` | `int` | Optional | Filter by Room ID |
  | `studentId` | `int` | Optional | Filter by Student ID |
  | `attendanceDate` | `date` | Optional | Date in `YYYY-MM-DD` |
  | `session` | `string` | Optional | `Morning` / `Night` / `Evening` |
  | `attendanceStatus` | `string` | Optional | `Present` / `Absent` / `On Leave` |
  | `search` | `string` | Optional | Student name / admission no |

#### B. Mark Hostel Attendance
- **Method:** `POST`
- **Endpoint:** `/api/v1/hostel/attendance`
- **Request Body (`CreateHostelAttendanceDto`):**
```json
{
  "studentId": 105,
  "hostelId": 1,
  "roomId": 10,
  "bedId": 25,
  "wardenAssignmentId": 3,
  "attendanceDate": "2026-09-16T00:00:00Z",
  "session": "Night",
  "attendanceStatus": "Present",
  "remarks": "Regular roll call"
}
```

#### C. Update Attendance
- **Method:** `PUT`
- **Endpoint:** `/api/v1/hostel/attendance/{id}`

#### D. Delete Attendance Record
- **Method:** `DELETE`
- **Endpoint:** `/api/v1/hostel/attendance/{id}`

---

### Tab 3: Outpass & Leave Management

#### A. List Outpass & Leave Requests
- **Method:** `GET`
- **Endpoint:** `/api/v1/hostel/outpass-leave`
- **Query Parameters:**
  | Parameter | Type | Required | Description |
  | :--- | :--- | :--- | :--- |
  | `hostelId` | `int` | Optional | Filter by Hostel Block ID |
  | `studentId` | `int` | Optional | Filter by Student ID |
  | `requestType` | `string` | Optional | `Local Outpass` / `Home Visit` / `Emergency Leave` |
  | `approvalStatus` | `string` | Optional | `Pending` / `Approved` / `Rejected` |
  | `fromDate` | `date` | Optional | Start date filter (`YYYY-MM-DD`) |
  | `toDate` | `date` | Optional | End date filter (`YYYY-MM-DD`) |
  | `search` | `string` | Optional | Student name / admission no |

#### B. Create Outpass / Leave Request
- **Method:** `POST`
- **Endpoint:** `/api/v1/hostel/outpass-leave`
- **Request Body (`CreateHostelOutpassLeaveDto`):**
```json
{
  "studentId": 105,
  "hostelId": 1,
  "roomId": 10,
  "bedId": 25,
  "wardenAssignmentId": 3,
  "requestType": "Local Outpass",
  "fromDateTime": "2026-09-16T17:00:00Z",
  "toDateTime": "2026-09-16T21:00:00Z",
  "reason": "Family visit nearby",
  "destination": "City Center"
}
```

#### C. Approve / Reject Outpass & Leave Request (Quick Action in UI)
- **Method:** `PUT`
- **Endpoint:** `/api/v1/hostel/outpass-leave/{id}/approval`
- **Request Body (`UpdateHostelOutpassLeaveApprovalDto`):**
```json
{
  "approvalStatus": "Approved",
  "approvalRemarks": "Approved by resident warden."
}
```

#### D. Delete Outpass / Leave Request
- **Method:** `DELETE`
- **Endpoint:** `/api/v1/hostel/outpass-leave/{id}`

---

### Tab 4: Transfer & Vacate Student

#### A. List Transfer / Vacate Requests
- **Method:** `GET`
- **Endpoint:** `/api/v1/hostel/transfer-vacate`
- **Query Parameters:**
  | Parameter | Type | Required | Description |
  | :--- | :--- | :--- | :--- |
  | `studentId` | `int` | Optional | Filter by Student ID |
  | `requestType` | `string` | Optional | `Transfer` / `Vacate` |
  | `approvalStatus` | `string` | Optional | `Pending` / `Approved` / `Rejected` |
  | `feeSettlementStatus` | `string` | Optional | `Pending` / `Settled` / `Waived` |
  | `requestDate` | `date` | Optional | Request date (`YYYY-MM-DD`) |
  | `search` | `string` | Optional | Student name / admission no |

#### B. Submit Transfer / Vacate Request
- **Method:** `POST`
- **Endpoint:** `/api/v1/hostel/transfer-vacate`
- **Request Body (`CreateHostelTransferVacateDto`):**
```json
{
  "allocationId": 12,
  "studentId": 105,
  "requestType": "Transfer",
  "fromHostelId": 1,
  "fromRoomId": 10,
  "fromBedId": 25,
  "toHostelId": 2,
  "toRoomId": 18,
  "toBedId": 42,
  "wardenAssignmentId": 3,
  "requestDate": "2026-09-16T00:00:00Z",
  "effectiveDate": "2026-09-20T00:00:00Z",
  "reason": "Requesting room change to Block B"
}
```

#### C. Update Approval Status
- **Method:** `PUT`
- **Endpoint:** `/api/v1/hostel/transfer-vacate/{id}/approval`
- **Request Body (`UpdateHostelTransferVacateApprovalDto`):**
```json
{
  "approvalStatus": "Approved",
  "approvalRemarks": "Transfer request approved."
}
```

#### D. Settle Hostel Fees / Refund
- **Method:** `PUT`
- **Endpoint:** `/api/v1/hostel/transfer-vacate/{id}/settlement`
- **Request Body (`UpdateHostelTransferVacateSettlementDto`):**
```json
{
  "feeSettlementStatus": "Settled",
  "refundAmount": 500.00,
  "additionalChargeAmount": 0.00,
  "settlementRemarks": "Security deposit adjusted and refunded."
}
```

#### E. Complete Transfer / Vacate Process
- **Method:** `POST`
- **Endpoint:** `/api/v1/hostel/transfer-vacate/{id}/complete`
- *Finalizes the transfer/vacate workflow and automatically updates bed occupancy state.*

#### F. Delete Request
- **Method:** `DELETE`
- **Endpoint:** `/api/v1/hostel/transfer-vacate/{id}`

---

## 4. Hostel Reports Screen (`/hostel/reports`)

| Report Name | Method | Endpoint | Query Filters |
| :--- | :--- | :--- | :--- |
| **Occupancy Report** | `GET` | `/api/v1/hostel/reports/occupancy` | `hostelId` |
| **Students Report** | `GET` | `/api/v1/hostel/reports/students` | `hostelId`, `status`, `search` |
| **Attendance Report** | `GET` | `/api/v1/hostel/reports/attendance` | `hostelId`, `fromDate`, `toDate`, `session`, `attendanceStatus`, `search` |
| **Outpass & Leave Report** | `GET` | `/api/v1/hostel/reports/outpass-leave` | `hostelId`, `fromDate`, `toDate`, `requestType`, `approvalStatus`, `search` |
| **Transfer & Vacate Report** | `GET` | `/api/v1/hostel/reports/transfer-vacate` | `studentId`, `fromDate`, `toDate`, `requestType`, `approvalStatus`, `feeSettlementStatus`, `search` |

---

## 5. Enums & Valid Values Reference

| Field | Allowed Values |
| :--- | :--- |
| **HostelType** | `Boys`, `Girls`, `Co-ed` |
| **AcType** | `AC`, `Non-AC` |
| **BedStatus** | `Available`, `Occupied`, `Maintenance` |
| **Status (General)** | `Active`, `Inactive` |
| **AttendanceSession** | `Morning`, `Evening`, `Night` |
| **AttendanceStatus** | `Present`, `Absent`, `On Leave` |
| **OutpassRequestType** | `Local Outpass`, `Home Visit`, `Emergency Leave` |
| **ApprovalStatus** | `Pending`, `Approved`, `Rejected` |
| **TransferVacateType**| `Transfer`, `Vacate` |
| **FeeSettlementStatus**| `Pending`, `Settled`, `Waived` |

---
