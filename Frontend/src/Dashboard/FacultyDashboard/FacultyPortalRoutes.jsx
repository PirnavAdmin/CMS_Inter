import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import FacultyDashboard from "./FacultyDashboard.jsx";
import { PermissionProvider, useFacultyPermissions } from "./PermissionContext.jsx";
const routePermissions = { "": "VIEW_DASHBOARD", profile: "VIEW_PROFILE", timetable: "VIEW_TIMETABLE", classes: "VIEW_CLASSES", attendance: "MARK_ATTENDANCE", marks: "ENTER_MARKS", "exam-duties": "VIEW_EXAM_DUTIES", "my-attendance": "VIEW_SELF_ATTENDANCE", leave: "APPLY_LEAVE", payslips: "VIEW_PAYSLIPS", holidays: "VIEW_HOLIDAYS", reimbursements: "VIEW_PAYSLIPS" };
function PermissionRoute({ permission, children }) { const permissions=useFacultyPermissions(); return permissions.includes(permission) ? children : <Navigate to="/faculty-dashboard" replace />; }
export function FacultyPortalContent() { return <Routes><Route path="/" element={<PermissionRoute permission={routePermissions[""]}><FacultyDashboard /></PermissionRoute>} />{Object.entries(routePermissions).filter(([path])=>path).map(([path,permission])=><Route key={path} path={path} element={<PermissionRoute permission={permission}><FacultyDashboard /></PermissionRoute>} />)}<Route path="*" element={<Navigate to="/faculty-dashboard" replace />} /></Routes>; }
export default function FacultyPortalRoutes() { return <PermissionProvider><FacultyPortalContent /></PermissionProvider>; }
