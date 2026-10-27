# Frontend Integration Document: Reusable Master Group Architecture
**Project:** Pirnav College Management System  
**Module:** Group Management & Dependent Academic Modules  
**Target Audience:** Frontend Development Team  
**API Version:** v1 (`/api/v1/master-groups` & `/api/v1/groups`)  
**Status:** Ready for Frontend Integration  

---

## 1. Executive Summary & Core Concepts

### What Changed?
Previously, every group (e.g., MPC, BiPC) had to be manually created for every **Academic Year** and every **Academic Level** (1st Year, 2nd Year). This led to artificial duplicate names (e.g., `MPC2`, `MPC_2`) and required repetitive administration every new academic year.

With the **Reusable Master Group Architecture (Option B)**:
1. **Create Once**: The administrator creates a **Master Group** (e.g., `MPC`, `BiPC`, `CEC`) **only once per Board**.
2. **Universal Eligibility**: That Master Group is automatically eligible for **all Academic Levels** belonging to that Board (e.g., Intermediate 1st Year, Intermediate 2nd Year) and **all current and future Academic Years**.
3. **Automatic Context Resolution**: When an academic workflow (such as Student Admission, Section Allocation, or Fee Configuration) needs a group for a specific year and level, the system resolves or automatically generates the underlying academic-context record (`GroupId`) on demand.
4. **100% Backward Compatible**: Existing operational tables (Students, Admissions, Sections, Fees, Timetable, Attendance, Exams, Marks, Results, etc.) continue referencing the existing contextual `GroupId`.

---

## 2. Key Identifier Distinctions

> **IMPORTANT**  
> Always distinguish between `MasterGroupId` and `GroupId`:

| Identifier | Type | Scope | Where Used in UI |
| :--- | :--- | :--- | :--- |
| **`MasterGroupId`** | `int` | Permanent Master Catalog (Board-scoped) | Master Group Catalog Screen, Master Group Creation/Edit modals, Master Program configuration. |
| **`GroupId`** | `int` | Academic Context Instance (Board + Year + Level) | Student Admission, Student Profile, Fee Structures, Timetable, Attendance, Section Allocation, Exams. |

---

## 3. Master Group APIs (`/api/v1/master-groups`)

### Authentication & Authorization
- **Authentication**: Bearer JWT (`Authorization: Bearer <token>`)
- **Permission**: `[RequirePermission("group-management")]` (Admin / Super Admin)

---

### 3.1. List Master Groups
Retrieves the reusable Master Groups catalog with eligible academic levels and default program counts.

- **Method**: `GET`
- **Endpoint**: `/api/v1/master-groups`
- **Query Parameters**:
  - `boardId` *(optional, integer)*: Filter by Board ID.
  - `isActive` *(optional, boolean)*: Filter by active status (`true` / `false`).
  - `search` *(optional, string)*: Search by group name or group code.

#### Sample Request
```http
GET /api/v1/master-groups?boardId=1&isActive=true HTTP/1.1
Host: localhost:5000
Authorization: Bearer <token>
```

#### Sample Response (`200 OK`)
```json
{
  "success": true,
  "message": "Master groups retrieved successfully.",
  "data": [
    {
      "masterGroupId": 1,
      "boardId": 1,
      "boardName": "Board of Intermediate Education, AP (BIEAP)",
      "groupName": "MPC",
      "groupCode": "MPC",
      "description": "Mathematics, Physics, Chemistry",
      "isActive": true,
      "createdAt": "2026-10-26T16:00:00Z",
      "updatedAt": null,
      "programCount": 2,
      "eligibleAcademicLevels": [
        {
          "academicLevelId": 1,
          "academicLevelName": "Intermediate 1st Year",
          "levelOrder": 1
        },
        {
          "academicLevelId": 2,
          "academicLevelName": "Intermediate 2nd Year",
          "levelOrder": 2
        }
      ]
    },
    {
      "masterGroupId": 2,
      "boardId": 1,
      "boardName": "Board of Intermediate Education, AP (BIEAP)",
      "groupName": "BiPC",
      "groupCode": "BIPC",
      "description": "Biology, Physics, Chemistry",
      "isActive": true,
      "createdAt": "2026-10-26T16:05:00Z",
      "updatedAt": null,
      "programCount": 1,
      "eligibleAcademicLevels": [
        {
          "academicLevelId": 1,
          "academicLevelName": "Intermediate 1st Year",
          "levelOrder": 1
        },
        {
          "academicLevelId": 2,
          "academicLevelName": "Intermediate 2nd Year",
          "levelOrder": 2
        }
      ]
    }
  ]
}
```

---

### 3.2. Get Master Group by ID
Retrieves single Master Group details, including its configured default programs and eligible academic levels.

- **Method**: `GET`
- **Endpoint**: `/api/v1/master-groups/{id}`

#### Sample Response (`200 OK`)
```json
{
  "success": true,
  "message": "Master group retrieved successfully.",
  "data": {
    "masterGroupId": 1,
    "boardId": 1,
    "boardName": "Board of Intermediate Education, AP (BIEAP)",
    "groupName": "MPC",
    "groupCode": "MPC",
    "description": "Mathematics, Physics, Chemistry",
    "isActive": true,
    "createdAt": "2026-10-26T16:00:00Z",
    "updatedAt": null,
    "programs": [
      {
        "masterGroupProgramId": 10,
        "programId": 1,
        "programName": "General Regular",
        "isActive": true
      },
      {
        "masterGroupProgramId": 11,
        "programId": 2,
        "programName": "IIT-JEE Integrated",
        "isActive": true
      }
    ],
    "eligibleAcademicLevels": [
      {
        "academicLevelId": 1,
        "academicLevelName": "Intermediate 1st Year",
        "levelOrder": 1
      },
      {
        "academicLevelId": 2,
        "academicLevelName": "Intermediate 2nd Year",
        "levelOrder": 2
      }
    ]
  }
}
```

---

### 3.3. Create Master Group
Creates a new reusable Master Group for a Board.

- **Method**: `POST`
- **Endpoint**: `/api/v1/master-groups`
- **Request Body**:
```json
{
  "boardId": 1,
  "groupName": "MEC",
  "groupCode": "MEC",
  "description": "Mathematics, Economics, Commerce",
  "isActive": true,
  "programIds": [1, 3]
}
```

#### Field Specifications
| Field | Type | Required | Notes |
| :--- | :--- | :--- | :--- |
| `boardId` | `int` | Yes | Must match an existing Board ID. |
| `groupName` | `string` | Yes | Max 100 characters. Unique within Board. |
| `groupCode` | `string` | Yes | Max 30 characters. Unique within Board. |
| `description`| `string?`| No | Optional description. |
| `isActive` | `bool` | Yes | Default: `true`. |
| `programIds` | `List<int>?` | No | Selected default programs for this Master Group. |

#### Sample Response (`201 Created`)
```json
{
  "success": true,
  "message": "Master group created successfully.",
  "data": {
    "masterGroupId": 3,
    "boardId": 1,
    "boardName": "Board of Intermediate Education, AP (BIEAP)",
    "groupName": "MEC",
    "groupCode": "MEC",
    "description": "Mathematics, Economics, Commerce",
    "isActive": true,
    "createdAt": "2026-10-26T17:30:00Z",
    "updatedAt": null,
    "programs": [
      {
        "masterGroupProgramId": 12,
        "programId": 1,
        "programName": "General Regular",
        "isActive": true
      },
      {
        "masterGroupProgramId": 13,
        "programId": 3,
        "programName": "CA Foundation Integrated",
        "isActive": true
      }
    ],
    "eligibleAcademicLevels": [
      {
        "academicLevelId": 1,
        "academicLevelName": "Intermediate 1st Year",
        "levelOrder": 1
      },
      {
        "academicLevelId": 2,
        "academicLevelName": "Intermediate 2nd Year",
        "levelOrder": 2
      }
    ]
  }
}
```

---

### 3.4. Update Master Group
Updates Master Group attributes and default program selections.

- **Method**: `PUT`
- **Endpoint**: `/api/v1/master-groups/{id}`
- **Request Body**:
```json
{
  "groupName": "MPC (Maths, Physics, Chem)",
  "groupCode": "MPC",
  "description": "Updated description for MPC stream",
  "isActive": true,
  "programIds": [1, 2, 4]
}
```

#### Sample Response (`200 OK`)
```json
{
  "success": true,
  "message": "Master group updated successfully.",
  "data": {
    "masterGroupId": 1,
    "boardId": 1,
    "groupName": "MPC (Maths, Physics, Chem)",
    "groupCode": "MPC",
    "isActive": true,
    "programs": [ ... ]
  }
}
```

---

### 3.5. Toggle Active Status
Quickly activate or deactivate a Master Group without altering other fields.

- **Method**: `PATCH`
- **Endpoint**: `/api/v1/master-groups/{id}/status`
- **Query Parameter**: `isActive=true` or `isActive=false`

#### Sample Request
```http
PATCH /api/v1/master-groups/1/status?isActive=false HTTP/1.1
Authorization: Bearer <token>
```

#### Sample Response (`200 OK`)
```json
{
  "success": true,
  "message": "Master group deactivated successfully."
}
```

---

### 3.6. Safely Delete / Retire Master Group
Attempts to delete a Master Group. If contextual records have students, fees, or timetable dependencies, deletion is safely blocked with a clear dependency breakdown.

- **Method**: `DELETE`
- **Endpoint**: `/api/v1/master-groups/{id}`

#### Response when blocked (`400 Bad Request`)
```json
{
  "success": false,
  "message": "Cannot delete master group because associated contextual groups have active dependencies: 45 student(s), 12 fee structure(s), 6 examination(s). Please deactivate the group instead."
}
```

---

### 3.7. Manage Master Group Programs
Read or update the default program mappings for a Master Group.

- **Get Programs**: `GET /api/v1/master-groups/{id}/programs`
- **Update Programs**: `PUT /api/v1/master-groups/{id}/programs`
  - **Body**: `[1, 2, 5]` (array of Program IDs)

---

### 3.8. Context Resolution Endpoint (Auto-Create / Resolve Context)
Resolves a Master Group into a specific academic context (`GroupId`).
- If a contextual group already exists for the given `(BoardId, AcademicYearId, AcademicLevelId)`, it returns the existing `GroupId`.
- If it does not exist, it automatically creates the contextual record in `Groups`, copies the default programs into `GroupPrograms`, and returns the newly instantiated `GroupId`.

- **Method**: `POST`
- **Endpoint**: `/api/v1/master-groups/resolve-context`
- **Request Body**:
```json
{
  "masterGroupId": 1,
  "boardId": 1,
  "academicYearId": 11,
  "academicLevelId": 2
}
```

#### Sample Response (`200 OK`)
```json
{
  "success": true,
  "message": "Group context resolved successfully.",
  "data": {
    "groupId": 405,
    "masterGroupId": 1,
    "groupName": "MPC",
    "groupCode": "MPC-INT2-2027",
    "boardId": 1,
    "academicYearId": 11,
    "academicLevelId": 2,
    "isNewlyCreated": true
  }
}
```

---

## 4. Updated Contextual Group Endpoints (`/api/v1/groups`)

Existing endpoints remain functional and now support contextual filtering:

### 4.1. Group Dropdown (Used by Admission, Timetable, Fees)
- **Method**: `GET`
- **Endpoint**: `/api/v1/groups/dropdown`
- **Query Parameters**:
  - `boardId` *(optional, integer)*
  - `academicYearId` *(optional, integer)*
  - `academicLevelId` *(optional, integer)*

#### Sample Response (`200 OK`)
```json
{
  "success": true,
  "message": "Group dropdown items retrieved successfully.",
  "data": [
    {
      "groupId": 38,
      "groupName": "MPC",
      "groupCode": "MPC",
      "boardId": 1,
      "academicYearId": 9,
      "academicLevelId": 1,
      "masterGroupId": 1
    },
    {
      "groupId": 39,
      "groupName": "BiPC",
      "groupCode": "BIPC",
      "boardId": 1,
      "academicYearId": 9,
      "academicLevelId": 1,
      "masterGroupId": 2
    }
  ]
}
```
> **Note**: Dropdown returns contextual `groupId` as the select value, and provides `masterGroupId` as metadata so the frontend can group or identify master streams if needed.

---

### 4.2. Board Groups Endpoint
- **Method**: `GET`
- **Endpoint**: `/api/v1/groups/board/{boardId}`
- **Query Parameters**:
  - `academicYearId` *(optional, integer)*
  - `academicLevelId` *(optional, integer)*

---

### 4.3. Full Group List
- **Method**: `GET`
- **Endpoint**: `/api/v1/groups`
- **Query Parameters**:
  - `boardId`
  - `academicYearId`
  - `academicLevelId`
  - `masterGroupId` *(new filter)*
  - `isActive`
  - `search`

---

## 5. Frontend UI/UX Recommendations

### Scenario A: Group Management Page (Admin Settings)
1. **Primary Tab — "Master Groups" (Catalog)**:
   - Lists groups by Board (e.g., MPC, BiPC, CEC).
   - "Add Master Group" modal asks for:
     - Board (Select)
     - Group Name (Text, e.g., "MPC")
     - Group Code (Text, e.g., "MPC")
     - Eligible Programs (Multi-select checkbox)
     - Description (Optional Text)
   - Admins no longer pick Academic Year or Academic Level when creating groups!
2. **Secondary Tab — "Academic Contexts" (View / Audit)**:
   - Filter by Academic Year + Academic Level to see generated instances with student/section counts.

### Scenario B: Student Admission / Fees / Timetable Dropdowns
- Continue calling `/api/v1/groups/dropdown?boardId={boardId}&academicYearId={academicYearId}&academicLevelId={academicLevelId}`.
- If a group is not yet instantiated for a future academic year, use `/api/v1/master-groups/resolve-context` or list available Master Groups for that Board and resolve upon selection.

---

## 6. Error Codes & Validation Reference

| Status Code | Scenario | Sample Message |
| :--- | :--- | :--- |
| `400 Bad Request` | Duplicate Group Code in Board | `"A master group with code 'MPC' already exists for this board."` |
| `400 Bad Request` | Ineligible Academic Level | `"Academic level 3 is not configured for board 1."` |
| `400 Bad Request` | Delete with Dependencies | `"Cannot delete master group because associated contextual groups have active dependencies..."` |
| `404 Not Found` | Master Group Not Found | `"Master group with ID 999 was not found."` |
| `409 Conflict` | Concurrency on Context Resolution | System automatically handles concurrency and retrieves the created instance without throwing error. |
