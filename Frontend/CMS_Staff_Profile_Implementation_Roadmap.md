# CMS Staff Profile Module - Final Audit & Implementation Plan

## 1. Issue Diagnosis

### 1.1 Profile Photo Persistence & Visibility Issue
- **Observation:** Staff upload a photo, it appears locally for the session, but disappears on page reload. Additionally, Admin Portal fails to display it in the review section.
- **Root Cause:** The photo upload API (`UploadPhotoAsync`) saves the image to a physical `wwwroot` directory and uses Entity Framework Core to update the `PhotoPath`. However, relying on local filesystem storage combined with ORM complexities across environments (local vs. Hostinger database) leads to data loss upon server restart or state mismatch. Furthermore, the frontend `FacultyProfile.jsx` heavily depends on a physical URL fallback logic which breaks when the image isn't on disk.
- **Solution (Per User's Stored Procedure Request):**
  1. Abandon relying solely on EF Core for this critical path.
  2. Implement a direct **Stored Procedure** (`sp_UpdateStaffPhotoPath`) in the Hostinger MySQL database for fast, direct mutation.
  3. Update `StaffRepository` to use Dapper to execute the Stored Procedure, ensuring absolute atomicity and speed.
  4. Force the frontend to strictly use the `GET` API standard (`apiClient.get`) across both Staff and Admin portals, appending a timestamp cache-buster (`?t=timestamp`) so it is always synchronized.

### 1.2 Form Fields Consistency (Double Check)
- **Observation:** The user wants confirmation that the exact fields in the Staff Portal match the ones in the Admin Portal.
- **Root Cause:** My previous script accidentally locked all fields globally. While I corrected this in `fix_edit_feasibility.js`, we need 100% assurance.
- **Solution:** 
  - Ensure strict separation:
    - **Read-Only (Admin Managed):** Employee ID, First Name, Last Name, Gender, Date of Birth, Email, Department, Designation, Blood Group.
    - **Editable (Staff Managed):** Marital Status, Phone Number, Aadhaar Number, PAN Number, Date of Joining.
  - Double verify `validateCurrentProfileStep` to match the exact requirements of Admin.

### 1.3 Admin Portal Data Sync Strategy
- **Observation:** The user noted: "Whatever is patched here, get it there using the same get... Same for photo, posted/patched there, get it here."
- **Root Cause:** The admin preview (`StaffManagementPage.jsx`) fetches `staffApi.getStaffById(id)` which pulls from the main `Staffs` table. If draft data hasn't been merged, Admin sees old data. 
- **Solution:** Ensure the draft submission (`save-profile-draft` / `submit-profile`) correctly persists state into the database (via Dapper/SP) and the Admin `GET` API retrieves the exact submitted JSON schema seamlessly.

## 2. Execution Plan

### Phase 1: Database Stored Procedures
- Connect to Hostinger DB (`srv1061.hstgr.io`).
- Create `sp_UpdateStaffPhotoPath(IN p_Id INT, IN p_PhotoPath VARCHAR(255))`.
- Update `StaffRepository.cs` to execute `sp_UpdateStaffPhotoPath` via Dapper.

### Phase 2: Backend API Optimization
- Ensure `GetStaffPhoto` directly returns the base64 or streams the byte array efficiently from the cloud/DB if physical storage is volatile, OR assure it correctly routes the URL.
- (Based on the user's idea): Simply have the frontend fetch the `PhotoPath` URL and append it to the base URL seamlessly.

### Phase 3: Frontend Synchronization
- Update `StaffManagementPage.jsx` (Admin Portal) to fetch the photo dynamically via the same GET request methodology.
- Update `FacultyProfile.jsx` to stop caching local blob URLs post-reload and strictly rely on the GET response from the stored procedure update.

## 3. Estimated Completion
Immediate execution following plan approval.
