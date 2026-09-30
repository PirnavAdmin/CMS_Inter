import React, { createContext, useContext } from "react";
import { mockPermissions } from "./data/facultyMockData.js";
const PermissionContext = createContext(mockPermissions);
export function PermissionProvider({ children, permissions = mockPermissions }) { return <PermissionContext.Provider value={permissions}>{children}</PermissionContext.Provider>; }
export function useFacultyPermissions() { return useContext(PermissionContext); }
export default PermissionContext;

