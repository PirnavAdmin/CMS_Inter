import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import NonTeachingLayout from "./layout/NonTeachingLayout.jsx";
import NonTeachingDashboardHome from "./pages/NonTeachingDashboardHome.jsx";
import NonTeachingProfile from "./pages/NonTeachingProfile.jsx";
import NonTeachingAttendance from "./pages/NonTeachingAttendance.jsx";
import NonTeachingLeave from "./pages/NonTeachingLeave.jsx";
import NonTeachingTasks from "./pages/NonTeachingTasks.jsx";
import NonTeachingAnnouncements from "./pages/NonTeachingAnnouncements.jsx";
import NonTeachingDepartment from "./pages/NonTeachingDepartment.jsx";
import NonTeachingSupport from "./pages/NonTeachingSupport.jsx";

export default function NonTeachingPortalRoutes() {
  return (
    <Routes>
      <Route element={<NonTeachingLayout />}>
        <Route index element={<NonTeachingDashboardHome />} />
        <Route path="overview" element={<NonTeachingDashboardHome />} />
        <Route path="profile" element={<NonTeachingProfile />} />
        <Route path="attendance" element={<NonTeachingAttendance />} />
        <Route path="leave" element={<NonTeachingLeave />} />
        <Route path="tasks" element={<NonTeachingTasks />} />
        <Route path="announcements" element={<NonTeachingAnnouncements />} />
        <Route path="department" element={<NonTeachingDepartment />} />
        <Route path="support" element={<NonTeachingSupport />} />
        <Route path="*" element={<Navigate to="/non-teaching-dashboard" replace />} />
      </Route>
    </Routes>
  );
}
