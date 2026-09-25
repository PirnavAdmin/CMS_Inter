import { useState, useEffect, useMemo, useCallback } from "react";
import { useAcademicContext } from "../../context/AcademicContext.jsx";
import { getAuthUser } from "../../features/authStorage.js";

// ==========================================================================
// PIRNAV COLLEGE ERP — PARENT MODULE DATA & STATE
// ==========================================================================

const PARENT_LEAVE_KEY = "pirnav_parent_leave_requests";
const PARENT_FEES_KEY = "pirnav_parent_fees_records";
const PARENT_ACTIVE_CHILD_KEY = "pirnav_parent_active_child_id";
const PARENT_MESSAGES_KEY = "pirnav_parent_messages";
const PARENT_NOTIFICATIONS_KEY = "pirnav_parent_notifications";
const PARENT_DOCS_KEY = "pirnav_parent_requested_docs";
const PARENT_PROFILE_KEY = "pirnav_parent_profile";
const PARENT_SETTINGS_KEY = "pirnav_parent_settings";

export const initialParentSettings = {
  smsAlerts: true,
  whatsappAlerts: true,
  emailAlerts: true,
  attendanceAlerts: true,
  feeReminders: true,
  examAlerts: true,
  language: "English",
};

export const initialParentProfiles = {
  "parent-001": {
    id: "parent-001",
    name: "Suresh Kumar",
    relation: "Father",
    email: "parent@cms.com",
    altEmail: "suresh.k@example.com",
    mobile: "+91 98765 43210",
    altMobile: "+91 98765 43211",
    occupation: "Senior Software Architect",
    company: "Tata Consultancy Services, Hyderabad",
    motherName: "Lakshmi Kumari",
    motherOccupation: "Assistant Professor",
    motherMobile: "+91 98765 43212",
    address: "Plot 42, Green Avenue, Madhapur, Hyderabad, Telangana - 500081",
    emergencyContact: "+91 98765 43219",
    bloodGroup: "O+",
    aadhaarMasked: "XXXX-XXXX-8921",
  },
  "parent-002": {
    id: "parent-002",
    name: "Ramesh Sharma",
    relation: "Father",
    email: "parent2@cms.com",
    altEmail: "ramesh.s@example.com",
    mobile: "+91 98765 43211",
    altMobile: "+91 98765 43222",
    occupation: "Civil Engineering Consultant",
    company: "L&T Infrastructure, Vijayawada",
    motherName: "Sunitha Sharma",
    motherOccupation: "School Principal",
    motherMobile: "+91 98765 43223",
    address: "Flat 302, Royal Residency, Benz Circle, Vijayawada, AP - 520010",
    emergencyContact: "+91 98765 43229",
    bloodGroup: "B+",
    aadhaarMasked: "XXXX-XXXX-4512",
  },
  "parent-003": {
    id: "parent-003",
    name: "Mahesh Reddy",
    relation: "Father",
    email: "parent3@cms.com",
    altEmail: "mahesh.r@example.com",
    mobile: "+91 98765 43212",
    altMobile: "+91 98765 43233",
    occupation: "Managing Director",
    company: "Reddy Agro Industries, Guntur",
    motherName: "Radha Reddy",
    motherOccupation: "Homemaker",
    motherMobile: "+91 98765 43234",
    address: "House 14-2, Arundelpet, Guntur, AP - 522002",
    emergencyContact: "+91 98765 43239",
    bloodGroup: "A+",
    aadhaarMasked: "XXXX-XXXX-7833",
  },
};

export const initialParentProfile = initialParentProfiles["parent-001"];

export const initialChildren = [
  {
    id: "stu-001",
    studentId: "STU2026001",
    name: "Rahul Kumar",
    admissionNo: "ADM2026001",
    dob: "2009-05-14",
    gender: "Male",
    bloodGroup: "O+",
    mobile: "+91 98765 43210",
    email: "rahul.kumar@example.com",
    course: "Intermediate",
    department: "Mathematics & Physical Sciences",
    group: "MPC",
    programme: "MPC (Maths, Physics, Chemistry)",
    level: "Intermediate 1st Year",
    semester: "Semester 1",
    section: "Section A",
    roll: "001",
    academicYear: "2026-2027",
    board: "Board of Intermediate Education",
    mentor: "Dr. Anitha Rao",
    mentorDesignation: "Professor & Class Teacher",
    mentorMobile: "+91 98480 12345",
    mentorEmail: "anitha.rao@college.edu",
    avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=200",
    parentId: "parent-001",
    parentEmail: "parent@cms.com",
    parentMobile: "+91 98765 43210",
    attendance: {
      overall: 94,
      presentDays: 47,
      absentDays: 3,
      totalWorkingDays: 50,
      status: "Excellent",
    },
    academics: {
      sgpa: "8.8",
      cgpa: "8.9",
      rank: "3rd in Class",
      totalCredits: 24,
      grade: "A+",
      performanceTrend: "+4.2% from last term",
    },
    fees: {
      total: 45500,
      paid: 28000,
      pending: 17500,
      status: "Partial",
      dueDate: "15 Oct 2026",
    },
  },
  {
    id: "stu-002",
    studentId: "STU2026002",
    name: "Ananya Kumar",
    admissionNo: "ADM2026014",
    dob: "2009-11-22",
    gender: "Female",
    bloodGroup: "B+",
    mobile: "+91 98765 43211",
    email: "ananya.kumar@example.com",
    course: "Intermediate",
    department: "Biological & Chemical Sciences",
    group: "BiPC",
    programme: "BiPC (Biology, Physics, Chemistry)",
    level: "Intermediate 1st Year",
    semester: "Semester 1",
    section: "Section B",
    roll: "014",
    academicYear: "2026-2027",
    board: "Board of Intermediate Education",
    mentor: "Mrs. Lakshmi Devi",
    mentorDesignation: "Senior Lecturer & Class Teacher",
    mentorMobile: "+91 98480 34567",
    mentorEmail: "lakshmi.d@college.edu",
    avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=200",
    parentId: "parent-001",
    parentEmail: "parent@cms.com",
    parentMobile: "+91 98765 43210",
    attendance: {
      overall: 96,
      presentDays: 48,
      absentDays: 2,
      totalWorkingDays: 50,
      status: "Outstanding",
    },
    academics: {
      sgpa: "9.2",
      cgpa: "9.1",
      rank: "1st in Section",
      totalCredits: 24,
      grade: "A+",
      performanceTrend: "+6.5% from last term",
    },
    fees: {
      total: 47500,
      paid: 47500,
      pending: 0,
      status: "Paid",
      dueDate: "—",
    },
  },
  {
    id: "stu-003",
    studentId: "STU2026003",
    name: "Priya Sharma",
    admissionNo: "ADM2026018",
    dob: "2009-08-19",
    gender: "Female",
    bloodGroup: "A+",
    mobile: "+91 98765 43211",
    email: "priya.sharma@example.com",
    course: "Intermediate",
    department: "Biological & Chemical Sciences",
    group: "BiPC",
    programme: "BiPC (Biology, Physics, Chemistry)",
    level: "Intermediate 1st Year",
    semester: "Semester 1",
    section: "Section A",
    roll: "018",
    academicYear: "2026-2027",
    board: "Board of Intermediate Education",
    mentor: "Mrs. Lakshmi Devi",
    mentorDesignation: "Senior Lecturer & Class Teacher",
    mentorMobile: "+91 98480 34567",
    mentorEmail: "lakshmi.d@college.edu",
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200",
    parentId: "parent-002",
    parentEmail: "parent2@cms.com",
    parentMobile: "+91 98765 43211",
    attendance: {
      overall: 95,
      presentDays: 48,
      absentDays: 2,
      totalWorkingDays: 50,
      status: "Excellent",
    },
    academics: {
      sgpa: "9.3",
      cgpa: "9.2",
      rank: "1st in Section",
      totalCredits: 24,
      grade: "A+",
      performanceTrend: "+5.8% from last term",
    },
    fees: {
      total: 46500,
      paid: 46500,
      pending: 0,
      status: "Paid",
      dueDate: "Cleared",
    },
  },
  {
    id: "stu-004",
    studentId: "STU2026004",
    name: "Arjun Reddy",
    admissionNo: "ADM2026025",
    dob: "2009-03-11",
    gender: "Male",
    bloodGroup: "O+",
    mobile: "+91 98765 43212",
    email: "arjun.reddy@example.com",
    course: "Intermediate",
    department: "Mathematics & Physical Sciences",
    group: "MPC",
    programme: "MPC (Maths, Physics, Chemistry)",
    level: "Intermediate 1st Year",
    semester: "Semester 1",
    section: "Section B",
    roll: "025",
    academicYear: "2026-2027",
    board: "Board of Intermediate Education",
    mentor: "Dr. Anitha Rao",
    mentorDesignation: "Professor & Class Teacher",
    mentorMobile: "+91 98480 12345",
    mentorEmail: "anitha.rao@college.edu",
    avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=200",
    parentId: "parent-003",
    parentEmail: "parent3@cms.com",
    parentMobile: "+91 98765 43212",
    attendance: {
      overall: 92,
      presentDays: 46,
      absentDays: 4,
      totalWorkingDays: 50,
      status: "Good",
    },
    academics: {
      sgpa: "8.7",
      cgpa: "8.8",
      rank: "4th in Section",
      totalCredits: 24,
      grade: "A",
      performanceTrend: "+3.8% from last term",
    },
    fees: {
      total: 45500,
      paid: 26000,
      pending: 19500,
      status: "Partial",
      dueDate: "20 Oct 2026",
    },
  },
];

export const childYearlyRecords = {
  "stu-001": {
    "2026-2027": initialChildren[0],
    "2025-2026": {
      id: "stu-001",
      studentId: "STU2025001",
      name: "Rahul Kumar",
      admissionNo: "ADM2025001",
      dob: "2009-05-14",
      gender: "Male",
      bloodGroup: "O+",
      mobile: "+91 98765 43210",
      email: "rahul.kumar@example.com",
      course: "Intermediate",
      department: "Mathematics & Physical Sciences",
      group: "MPC",
      programme: "MPC (Maths, Physics, Chemistry)",
      level: "Intermediate 1st Year",
      semester: "Semester 2",
      section: "Section A",
      roll: "001",
      academicYear: "2025-2026",
      board: "Board of Intermediate Education",
      mentor: "Dr. Anitha Rao",
      mentorDesignation: "Professor & Class Teacher",
      mentorMobile: "+91 98480 12345",
      mentorEmail: "anitha.rao@college.edu",
      avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=200",
      parentId: "parent-001",
      attendance: {
        overall: 91,
        presentDays: 182,
        absentDays: 18,
        totalWorkingDays: 200,
        status: "Good",
      },
      academics: {
        sgpa: "8.4",
        cgpa: "8.5",
        rank: "5th in Class",
        totalCredits: 24,
        grade: "A",
        performanceTrend: "+3.5% Annual Growth",
      },
      fees: {
        total: 43500,
        paid: 43500,
        pending: 0,
        status: "Paid",
        dueDate: "Cleared",
      },
    },
    "2024-2025": {
      id: "stu-001",
      studentId: "STU2024001",
      name: "Rahul Kumar",
      admissionNo: "ADM2024001",
      dob: "2009-05-14",
      gender: "Male",
      bloodGroup: "O+",
      mobile: "+91 98765 43210",
      email: "rahul.kumar@example.com",
      course: "Intermediate",
      department: "Secondary / Foundation",
      group: "MPC",
      programme: "Pre-Intermediate Foundation (MPC)",
      level: "Foundation Year",
      semester: "Annual",
      section: "Section A",
      roll: "001",
      academicYear: "2024-2025",
      board: "Board of Intermediate Education",
      mentor: "Dr. Rajesh Sharma",
      mentorDesignation: "Senior Faculty",
      mentorMobile: "+91 98480 88888",
      mentorEmail: "rajesh.s@college.edu",
      avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=200",
      parentId: "parent-001",
      attendance: {
        overall: 89,
        presentDays: 178,
        absentDays: 22,
        totalWorkingDays: 200,
        status: "Good",
      },
      academics: {
        sgpa: "8.1",
        cgpa: "8.1",
        rank: "8th in Class",
        totalCredits: 20,
        grade: "A",
        performanceTrend: "Solid Foundation",
      },
      fees: {
        total: 42000,
        paid: 42000,
        pending: 0,
        status: "Paid",
        dueDate: "Cleared",
      },
    },
  },
  "stu-002": {
    "2026-2027": initialChildren[1],
    "2025-2026": {
      id: "stu-002",
      studentId: "STU2025014",
      name: "Ananya Kumar",
      admissionNo: "ADM2025014",
      dob: "2009-11-22",
      gender: "Female",
      bloodGroup: "B+",
      mobile: "+91 98765 43211",
      email: "ananya.kumar@example.com",
      course: "Intermediate",
      department: "Biological & Chemical Sciences",
      group: "BiPC",
      programme: "BiPC (Biology, Physics, Chemistry)",
      level: "Foundation / 1st Year Prep",
      semester: "Term 2",
      section: "Section B",
      roll: "014",
      academicYear: "2025-2026",
      board: "Board of Intermediate Education",
      mentor: "Mrs. Lakshmi Devi",
      mentorDesignation: "Senior Lecturer & Class Teacher",
      mentorMobile: "+91 98480 34567",
      mentorEmail: "lakshmi.d@college.edu",
      avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=200",
      parentId: "parent-001",
      attendance: {
        overall: 95,
        presentDays: 190,
        absentDays: 10,
        totalWorkingDays: 200,
        status: "Excellent",
      },
      academics: {
        sgpa: "9.0",
        cgpa: "8.9",
        rank: "2nd in Section",
        totalCredits: 24,
        grade: "A+",
        performanceTrend: "+5.1% Annual Growth",
      },
      fees: {
        total: 45500,
        paid: 45500,
        pending: 0,
        status: "Paid",
        dueDate: "Cleared",
      },
    },
  },
  "stu-003": {
    "2026-2027": initialChildren[2],
    "2025-2026": {
      id: "stu-003",
      studentId: "STU2025018",
      name: "Priya Sharma",
      admissionNo: "ADM2025018",
      dob: "2009-08-19",
      gender: "Female",
      bloodGroup: "A+",
      mobile: "+91 98765 43211",
      email: "priya.sharma@example.com",
      course: "Intermediate",
      department: "Biological & Chemical Sciences",
      group: "BiPC",
      programme: "BiPC (Biology, Physics, Chemistry)",
      level: "Foundation / 1st Year Prep",
      semester: "Term 2",
      section: "Section A",
      roll: "018",
      academicYear: "2025-2026",
      board: "Board of Intermediate Education",
      mentor: "Mrs. Lakshmi Devi",
      mentorDesignation: "Senior Lecturer & Class Teacher",
      mentorMobile: "+91 98480 34567",
      mentorEmail: "lakshmi.d@college.edu",
      avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200",
      parentId: "parent-002",
      attendance: {
        overall: 94,
        presentDays: 188,
        absentDays: 12,
        totalWorkingDays: 200,
        status: "Excellent",
      },
      academics: {
        sgpa: "9.1",
        cgpa: "9.0",
        rank: "2nd in Section",
        totalCredits: 24,
        grade: "A+",
        performanceTrend: "+4.5% Annual Growth",
      },
      fees: {
        total: 44500,
        paid: 44500,
        pending: 0,
        status: "Paid",
        dueDate: "Cleared",
      },
    },
  },
  "stu-004": {
    "2026-2027": initialChildren[3],
    "2025-2026": {
      id: "stu-004",
      studentId: "STU2025025",
      name: "Arjun Reddy",
      admissionNo: "ADM2025025",
      dob: "2009-03-11",
      gender: "Male",
      bloodGroup: "O+",
      mobile: "+91 98765 43212",
      email: "arjun.reddy@example.com",
      course: "Intermediate",
      department: "Mathematics & Physical Sciences",
      group: "MPC",
      programme: "MPC (Maths, Physics, Chemistry)",
      level: "Intermediate 1st Year",
      semester: "Semester 2",
      section: "Section B",
      roll: "025",
      academicYear: "2025-2026",
      board: "Board of Intermediate Education",
      mentor: "Dr. Anitha Rao",
      mentorDesignation: "Professor & Class Teacher",
      mentorMobile: "+91 98480 12345",
      mentorEmail: "anitha.rao@college.edu",
      avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=200",
      parentId: "parent-003",
      attendance: {
        overall: 89,
        presentDays: 178,
        absentDays: 22,
        totalWorkingDays: 200,
        status: "Good",
      },
      academics: {
        sgpa: "8.5",
        cgpa: "8.6",
        rank: "5th in Section",
        totalCredits: 24,
        grade: "A",
        performanceTrend: "+3.2% Annual Growth",
      },
      fees: {
        total: 42500,
        paid: 42500,
        pending: 0,
        status: "Paid",
        dueDate: "Cleared",
      },
    },
  },
};

export const getLoggedInParent = () => {
  const authUser = getAuthUser();
  if (authUser) {
    if (authUser.parentId && initialParentProfiles[authUser.parentId]) {
      return initialParentProfiles[authUser.parentId];
    }
    if (authUser.id && initialParentProfiles[authUser.id]) {
      return initialParentProfiles[authUser.id];
    }
    const emailMatch = Object.values(initialParentProfiles).find(
      (p) => p.email.toLowerCase() === String(authUser.email || "").toLowerCase()
    );
    if (emailMatch) return emailMatch;
    const mobileMatch = Object.values(initialParentProfiles).find(
      (p) => String(p.mobile).replace(/\D/g, "") === String(authUser.mobile || authUser.username || "").replace(/\D/g, "")
    );
    if (mobileMatch) return mobileMatch;
  }
  return null;
};

export const getParentChildren = (parent) => {
  const p = typeof parent === "object" ? parent : (typeof parent === "string" ? { id: parent } : getLoggedInParent());
  if (!p) return [];
  const pId = p.id;
  const pEmail = String(p.email || "").toLowerCase();
  const pMobile = String(p.mobile || "").replace(/\D/g, "");

  const matched = initialChildren.filter((c) => {
    if (c.parentId && c.parentId === pId) return true;
    if (pEmail && c.parentEmail && c.parentEmail.toLowerCase() === pEmail) return true;
    if (pMobile && c.parentMobile && String(c.parentMobile).replace(/\D/g, "") === pMobile) return true;
    return false;
  });

  return matched;
};

export const normalizeAcademicYear = (year) => {
  if (!year) return "2026-2027";
  const str = typeof year === "object" ? (year.code || year.name || year.label || "") : String(year);
  return str.trim().replace(/[–—]/g, "-").replace(/\s+/g, "");
};

export const getChildForYear = (baseChild, year) => {
  if (!baseChild) return null;
  const norm = normalizeAcademicYear(year);
  if (norm === "2026-2027") {
    return { ...baseChild, academicYear: norm };
  }
  const yearly = childYearlyRecords?.[baseChild.id]?.[norm];
  if (yearly) {
    return { ...baseChild, ...yearly, id: baseChild.id };
  }
  return {
    ...baseChild,
    academicYear: norm,
    attendance: { overall: 0, presentDays: 0, absentDays: 0, totalWorkingDays: 0, status: "—" },
    academics: { sgpa: "—", cgpa: "—", rank: "—", totalCredits: 0, grade: "—", performanceTrend: "—" },
    fees: { total: 0, paid: 0, pending: 0, status: "—", dueDate: "—" },
  };
};

export const getChildDataKey = (childId, year) => {
  if (!childId) return "";
  const norm = normalizeAcademicYear(year);
  if (norm === "2025-2026") return `${childId}-2025`;
  if (norm === "2024-2025") return `${childId}-2024`;
  return childId;
};

export const getStoredActiveChildId = (childrenList) => {
  const children = childrenList || getParentChildren();
  if (!children || children.length === 0) return "";
  try {
    const parentId = getLoggedInParent()?.id;
    const saved = parentId
      ? localStorage.getItem(`${PARENT_ACTIVE_CHILD_KEY}_${parentId}`) || localStorage.getItem(PARENT_ACTIVE_CHILD_KEY)
      : localStorage.getItem(PARENT_ACTIVE_CHILD_KEY);
    if (saved && children.some((c) => c.id === saved)) return saved;
  } catch (e) {
    console.debug("Failed reading active child from storage:", e);
  }
  return children[0]?.id || "";
};

export const setStoredActiveChildId = (id) => {
  try {
    const parentId = getLoggedInParent()?.id;
    if (parentId) {
      localStorage.setItem(`${PARENT_ACTIVE_CHILD_KEY}_${parentId}`, id);
    }
    localStorage.setItem(PARENT_ACTIVE_CHILD_KEY, id);
  } catch (e) {
    console.debug("Failed writing active child to storage:", e);
  }
};

export const getActiveChild = (activeId, parent) => {
  const children = getParentChildren(parent);
  if (!children.length) return null;
  return children.find((c) => c.id === activeId) || children[0] || null;
};

export const useParentPortal = () => {
  const academicCtx = useAcademicContext?.() || {};
  const rawYear = academicCtx.selectedAcademicYear;
  const currentAcademicYear = useMemo(() => normalizeAcademicYear(rawYear), [rawYear]);
  
  const authUser = getAuthUser();
  const parentUser = useMemo(() => getLoggedInParent(), [authUser?.id, authUser?.email, authUser?.username]);
  const availableChildren = useMemo(() => getParentChildren(parentUser), [parentUser?.id]);
  
  const [activeChildId, setActiveChildIdState] = useState(() => {
    return getStoredActiveChildId(availableChildren);
  });

  // Revalidate activeChildId whenever availableChildren changes (e.g. login switch)
  useEffect(() => {
    if (availableChildren.length > 0 && !availableChildren.some((c) => c.id === activeChildId)) {
      const fallback = availableChildren[0].id;
      setActiveChildIdState(fallback);
      setStoredActiveChildId(fallback);
    }
  }, [availableChildren, activeChildId]);

  const setActiveChildId = useCallback((id) => {
    setActiveChildIdState(id);
    setStoredActiveChildId(id);
  }, []);

  const activeBaseChild = useMemo(() => {
    if (!availableChildren.length) return null;
    return availableChildren.find((c) => c.id === activeChildId) || availableChildren[0];
  }, [availableChildren, activeChildId]);

  const child = useMemo(() => {
    if (!activeBaseChild) return null;
    return getChildForYear(activeBaseChild, currentAcademicYear);
  }, [activeBaseChild, currentAcademicYear]);

  const dataKey = useMemo(() => {
    if (!activeBaseChild) return "";
    return getChildDataKey(activeBaseChild.id, currentAcademicYear);
  }, [activeBaseChild?.id, currentAcademicYear]);

  return {
    parentUser,
    availableChildren,
    activeChildId: activeBaseChild?.id || "",
    setActiveChildId,
    selectedAcademicYear: currentAcademicYear,
    currentAcademicYear,
    activeBaseChild,
    child,
    dataKey,
    getChildForYear,
  };
};

// ==========================================================================
// ATTENDANCE DATA
// ==========================================================================

export const subjectAttendanceData = {
  "stu-001": [
    { code: "MAT1A", subject: "Mathematics IA", faculty: "Dr. Anitha Rao", total: 25, present: 24, absent: 1, percentage: 96, status: "Excellent" },
    { code: "PHY1", subject: "Physics", faculty: "Mr. Suresh Kumar", total: 25, present: 23, absent: 2, percentage: 92, status: "Good" },
    { code: "CHE1", subject: "Chemistry", faculty: "Mrs. Lakshmi Devi", total: 20, present: 19, absent: 1, percentage: 95, status: "Excellent" },
    { code: "ENG1", subject: "English", faculty: "Ms. Priya Sharma", total: 20, present: 18, absent: 2, percentage: 90, status: "Good" },
    { code: "CSC1", subject: "Computer Science", faculty: "Mr. Ravi Teja", total: 20, present: 19, absent: 1, percentage: 95, status: "Excellent" },
    { code: "PHYL1", subject: "Physics Lab", faculty: "Mr. Suresh Kumar", total: 10, present: 10, absent: 0, percentage: 100, status: "Outstanding" },
  ],
  "stu-002": [
    { code: "BOT1", subject: "Botany", faculty: "Dr. Karthik Nair", total: 25, present: 25, absent: 0, percentage: 100, status: "Outstanding" },
    { code: "ZOO1", subject: "Zoology", faculty: "Dr. Karthik Nair", total: 25, present: 24, absent: 1, percentage: 96, status: "Excellent" },
    { code: "PHY1", subject: "Physics", faculty: "Mr. Suresh Kumar", total: 25, present: 24, absent: 1, percentage: 96, status: "Excellent" },
    { code: "CHE1", subject: "Chemistry", faculty: "Mrs. Lakshmi Devi", total: 20, present: 19, absent: 1, percentage: 95, status: "Excellent" },
    { code: "ENG1", subject: "English", faculty: "Ms. Priya Sharma", total: 20, present: 19, absent: 1, percentage: 95, status: "Excellent" },
    { code: "BIOL1", subject: "Biology Lab", faculty: "Dr. Karthik Nair", total: 10, present: 10, absent: 0, percentage: 100, status: "Outstanding" },
  ],
  "stu-001-2025": [
    { code: "MAT1A", subject: "Mathematics IA", faculty: "Dr. Anitha Rao", total: 25, present: 23, absent: 2, percentage: 92, status: "Good" },
    { code: "PHY1", subject: "Physics", faculty: "Mr. Suresh Kumar", total: 25, present: 22, absent: 3, percentage: 88, status: "Good" },
    { code: "CHE1", subject: "Chemistry", faculty: "Mrs. Lakshmi Devi", total: 20, present: 19, absent: 1, percentage: 95, status: "Excellent" },
    { code: "ENG1", subject: "English", faculty: "Ms. Priya Sharma", total: 20, present: 18, absent: 2, percentage: 90, status: "Good" },
    { code: "CSC1", subject: "Computer Science", faculty: "Mr. Ravi Teja", total: 20, present: 19, absent: 1, percentage: 95, status: "Excellent" },
  ],
  "stu-002-2025": [
    { code: "BOT1", subject: "Botany", faculty: "Dr. Karthik Nair", total: 25, present: 24, absent: 1, percentage: 96, status: "Excellent" },
    { code: "ZOO1", subject: "Zoology", faculty: "Dr. Karthik Nair", total: 25, present: 24, absent: 1, percentage: 96, status: "Excellent" },
    { code: "PHY1", subject: "Physics", faculty: "Mr. Suresh Kumar", total: 25, present: 23, absent: 2, percentage: 92, status: "Good" },
    { code: "CHE1", subject: "Chemistry", faculty: "Mrs. Lakshmi Devi", total: 20, present: 19, absent: 1, percentage: 95, status: "Excellent" },
    { code: "ENG1", subject: "English", faculty: "Ms. Priya Sharma", total: 20, present: 19, absent: 1, percentage: 95, status: "Excellent" },
  ],
  "stu-001-2024": [
    { code: "FMAT", subject: "Foundation Mathematics", faculty: "Dr. Rajesh Sharma", total: 25, present: 22, absent: 3, percentage: 88, status: "Good" },
    { code: "FSCI", subject: "Integrated Science", faculty: "Mrs. Lakshmi Devi", total: 25, present: 23, absent: 2, percentage: 92, status: "Good" },
    { code: "FENG", subject: "English Language", faculty: "Ms. Priya Sharma", total: 20, present: 18, absent: 2, percentage: 90, status: "Good" },
  ],
  "stu-003": [
    { code: "BOT1", subject: "Botany", faculty: "Dr. Karthik Nair", total: 25, present: 25, absent: 0, percentage: 100, status: "Outstanding" },
    { code: "ZOO1", subject: "Zoology", faculty: "Dr. Karthik Nair", total: 25, present: 23, absent: 2, percentage: 92, status: "Good" },
    { code: "PHY1", subject: "Physics", faculty: "Mr. Suresh Kumar", total: 25, present: 24, absent: 1, percentage: 96, status: "Excellent" },
    { code: "CHE1", subject: "Chemistry", faculty: "Mrs. Lakshmi Devi", total: 20, present: 19, absent: 1, percentage: 95, status: "Excellent" },
    { code: "ENG1", subject: "English", faculty: "Ms. Priya Sharma", total: 20, present: 19, absent: 1, percentage: 95, status: "Excellent" },
    { code: "BIOL1", subject: "Biology Lab", faculty: "Dr. Karthik Nair", total: 10, present: 10, absent: 0, percentage: 100, status: "Outstanding" },
  ],
  "stu-003-2025": [
    { code: "BOT1", subject: "Botany", faculty: "Dr. Karthik Nair", total: 25, present: 24, absent: 1, percentage: 96, status: "Excellent" },
    { code: "ZOO1", subject: "Zoology", faculty: "Dr. Karthik Nair", total: 25, present: 23, absent: 2, percentage: 92, status: "Good" },
    { code: "PHY1", subject: "Physics", faculty: "Mr. Suresh Kumar", total: 25, present: 23, absent: 2, percentage: 92, status: "Good" },
    { code: "CHE1", subject: "Chemistry", faculty: "Mrs. Lakshmi Devi", total: 20, present: 19, absent: 1, percentage: 95, status: "Excellent" },
    { code: "ENG1", subject: "English", faculty: "Ms. Priya Sharma", total: 20, present: 19, absent: 1, percentage: 95, status: "Excellent" },
  ],
  "stu-004": [
    { code: "MAT1A", subject: "Mathematics IA", faculty: "Dr. Anitha Rao", total: 25, present: 23, absent: 2, percentage: 92, status: "Good" },
    { code: "PHY1", subject: "Physics", faculty: "Mr. Suresh Kumar", total: 25, present: 22, absent: 3, percentage: 88, status: "Good" },
    { code: "CHE1", subject: "Chemistry", faculty: "Mrs. Lakshmi Devi", total: 20, present: 18, absent: 2, percentage: 90, status: "Good" },
    { code: "ENG1", subject: "English", faculty: "Ms. Priya Sharma", total: 20, present: 19, absent: 1, percentage: 95, status: "Excellent" },
    { code: "CSC1", subject: "Computer Science", faculty: "Mr. Ravi Teja", total: 20, present: 19, absent: 1, percentage: 95, status: "Excellent" },
    { code: "PHYL1", subject: "Physics Lab", faculty: "Mr. Suresh Kumar", total: 10, present: 9, absent: 1, percentage: 90, status: "Good" },
  ],
  "stu-004-2025": [
    { code: "MAT1A", subject: "Mathematics IA", faculty: "Dr. Anitha Rao", total: 25, present: 22, absent: 3, percentage: 88, status: "Good" },
    { code: "PHY1", subject: "Physics", faculty: "Mr. Suresh Kumar", total: 25, present: 21, absent: 4, percentage: 84, status: "Average" },
    { code: "CHE1", subject: "Chemistry", faculty: "Mrs. Lakshmi Devi", total: 20, present: 18, absent: 2, percentage: 90, status: "Good" },
    { code: "ENG1", subject: "English", faculty: "Ms. Priya Sharma", total: 20, present: 18, absent: 2, percentage: 90, status: "Good" },
    { code: "CSC1", subject: "Computer Science", faculty: "Mr. Ravi Teja", total: 20, present: 18, absent: 2, percentage: 90, status: "Good" },
  ],
};

export const recentAttendanceLogs = {
  "stu-001": [
    { date: "2026-09-20", day: "Saturday", status: "Present", timeIn: "08:45 AM", timeOut: "03:45 PM", remark: "On time" },
    { date: "2026-09-19", day: "Friday", status: "Present", timeIn: "08:50 AM", timeOut: "03:45 PM", remark: "On time" },
    { date: "2026-09-18", day: "Thursday", status: "Present", timeIn: "08:42 AM", timeOut: "03:45 PM", remark: "On time" },
    { date: "2026-09-17", day: "Wednesday", status: "Absent", timeIn: "—", timeOut: "—", remark: "Informed Leave (Mild fever)" },
    { date: "2026-09-16", day: "Tuesday", status: "Present", timeIn: "08:48 AM", timeOut: "03:45 PM", remark: "On time" },
    { date: "2026-09-15", day: "Monday", status: "Present", timeIn: "08:44 AM", timeOut: "03:45 PM", remark: "On time" },
  ],
  "stu-002": [
    { date: "2026-09-20", day: "Saturday", status: "Present", timeIn: "08:40 AM", timeOut: "03:45 PM", remark: "On time" },
    { date: "2026-09-19", day: "Friday", status: "Present", timeIn: "08:45 AM", timeOut: "03:45 PM", remark: "On time" },
    { date: "2026-09-18", day: "Thursday", status: "Present", timeIn: "08:41 AM", timeOut: "03:45 PM", remark: "On time" },
    { date: "2026-09-17", day: "Wednesday", status: "Present", timeIn: "08:46 AM", timeOut: "03:45 PM", remark: "On time" },
    { date: "2026-09-16", day: "Tuesday", status: "Present", timeIn: "08:42 AM", timeOut: "03:45 PM", remark: "On time" },
    { date: "2026-09-15", day: "Monday", status: "Present", timeIn: "08:39 AM", timeOut: "03:45 PM", remark: "On time" },
  ],
  "stu-003": [
    { date: "2026-09-20", day: "Saturday", status: "Present", timeIn: "08:42 AM", timeOut: "03:45 PM", remark: "On time" },
    { date: "2026-09-19", day: "Friday", status: "Present", timeIn: "08:44 AM", timeOut: "03:45 PM", remark: "On time" },
    { date: "2026-09-18", day: "Thursday", status: "Present", timeIn: "08:40 AM", timeOut: "03:45 PM", remark: "On time" },
    { date: "2026-09-17", day: "Wednesday", status: "Present", timeIn: "08:45 AM", timeOut: "03:45 PM", remark: "On time" },
    { date: "2026-09-16", day: "Tuesday", status: "Present", timeIn: "08:41 AM", timeOut: "03:45 PM", remark: "On time" },
    { date: "2026-09-15", day: "Monday", status: "Present", timeIn: "08:40 AM", timeOut: "03:45 PM", remark: "On time" },
  ],
  "stu-004": [
    { date: "2026-09-20", day: "Saturday", status: "Present", timeIn: "08:50 AM", timeOut: "03:45 PM", remark: "On time" },
    { date: "2026-09-19", day: "Friday", status: "Present", timeIn: "08:48 AM", timeOut: "03:45 PM", remark: "On time" },
    { date: "2026-09-18", day: "Thursday", status: "Absent", timeIn: "—", timeOut: "—", remark: "Informed Leave" },
    { date: "2026-09-17", day: "Wednesday", status: "Present", timeIn: "08:45 AM", timeOut: "03:45 PM", remark: "On time" },
    { date: "2026-09-16", day: "Tuesday", status: "Present", timeIn: "08:42 AM", timeOut: "03:45 PM", remark: "On time" },
    { date: "2026-09-15", day: "Monday", status: "Present", timeIn: "08:49 AM", timeOut: "03:45 PM", remark: "On time" },
  ],
};

// ==========================================================================
// ACADEMICS & RESULTS DATA
// ==========================================================================

export const academicSubjectsData = {
  "stu-001": [
    { code: "MAT1A", name: "Mathematics IA", credits: 4, internals: "23 / 25", assignments: "9.5 / 10", attendance: "96%", grade: "A+", faculty: "Dr. Anitha Rao", status: "High Performer" },
    { code: "PHY1", name: "Physics", credits: 4, internals: "21 / 25", assignments: "8.5 / 10", attendance: "92%", grade: "A", faculty: "Mr. Suresh Kumar", status: "Good" },
    { code: "CHE1", name: "Chemistry", credits: 4, internals: "22 / 25", assignments: "9.0 / 10", attendance: "95%", grade: "A+", faculty: "Mrs. Lakshmi Devi", status: "Consistent" },
    { code: "ENG1", name: "English", credits: 3, internals: "22 / 25", assignments: "9.0 / 10", attendance: "90%", grade: "A", faculty: "Ms. Priya Sharma", status: "Active" },
    { code: "CSC1", name: "Computer Science", credits: 4, internals: "24 / 25", assignments: "10 / 10", attendance: "95%", grade: "O", faculty: "Mr. Ravi Teja", status: "Top in Subject" },
    { code: "PHYL1", name: "Physics Lab", credits: 2, internals: "25 / 25", assignments: "10 / 10", attendance: "100%", grade: "O", faculty: "Mr. Suresh Kumar", status: "Perfect Score" },
  ],
  "stu-002": [
    { code: "BOT1", name: "Botany", credits: 4, internals: "25 / 25", assignments: "10 / 10", attendance: "100%", grade: "O", faculty: "Dr. Karthik Nair", status: "Class Topper" },
    { code: "ZOO1", name: "Zoology", credits: 4, internals: "24 / 25", assignments: "9.5 / 10", attendance: "96%", grade: "A+", faculty: "Dr. Karthik Nair", status: "High Performer" },
    { code: "PHY1", name: "Physics", credits: 4, internals: "22 / 25", assignments: "9.0 / 10", attendance: "96%", grade: "A+", faculty: "Mr. Suresh Kumar", status: "Consistent" },
    { code: "CHE1", name: "Chemistry", credits: 4, internals: "23 / 25", assignments: "9.5 / 10", attendance: "95%", grade: "A+", faculty: "Mrs. Lakshmi Devi", status: "Consistent" },
    { code: "ENG1", name: "English", credits: 3, internals: "23 / 25", assignments: "9.0 / 10", attendance: "95%", grade: "A+", faculty: "Ms. Priya Sharma", status: "Good" },
    { code: "BIOL1", name: "Biology Lab", credits: 2, internals: "25 / 25", assignments: "10 / 10", attendance: "100%", grade: "O", faculty: "Dr. Karthik Nair", status: "Perfect Score" },
  ],
  "stu-001-2025": [
    { code: "MAT1A", name: "Mathematics IA", credits: 4, internals: "22 / 25", assignments: "9.0 / 10", attendance: "92%", grade: "A", faculty: "Dr. Anitha Rao", status: "Consistent" },
    { code: "PHY1", name: "Physics", credits: 4, internals: "20 / 25", assignments: "8.0 / 10", attendance: "88%", grade: "B+", faculty: "Mr. Suresh Kumar", status: "Active" },
    { code: "CHE1", name: "Chemistry", credits: 4, internals: "21 / 25", assignments: "9.0 / 10", attendance: "95%", grade: "A", faculty: "Mrs. Lakshmi Devi", status: "Good" },
    { code: "ENG1", name: "English", credits: 3, internals: "22 / 25", assignments: "9.0 / 10", attendance: "90%", grade: "A", faculty: "Ms. Priya Sharma", status: "Active" },
    { code: "CSC1", name: "Computer Science", credits: 4, internals: "23 / 25", assignments: "9.5 / 10", attendance: "95%", grade: "A+", faculty: "Mr. Ravi Teja", status: "Strong Performer" },
  ],
  "stu-002-2025": [
    { code: "BOT1", name: "Botany", credits: 4, internals: "24 / 25", assignments: "9.5 / 10", attendance: "96%", grade: "A+", faculty: "Dr. Karthik Nair", status: "High Performer" },
    { code: "ZOO1", name: "Zoology", credits: 4, internals: "23 / 25", assignments: "9.0 / 10", attendance: "96%", grade: "A+", faculty: "Dr. Karthik Nair", status: "High Performer" },
    { code: "PHY1", name: "Physics", credits: 4, internals: "21 / 25", assignments: "8.5 / 10", attendance: "92%", grade: "A", faculty: "Mr. Suresh Kumar", status: "Good" },
    { code: "CHE1", name: "Chemistry", credits: 4, internals: "22 / 25", assignments: "9.0 / 10", attendance: "95%", grade: "A", faculty: "Mrs. Lakshmi Devi", status: "Consistent" },
    { code: "ENG1", name: "English", credits: 3, internals: "23 / 25", assignments: "9.0 / 10", attendance: "95%", grade: "A+", faculty: "Ms. Priya Sharma", status: "Good" },
  ],
  "stu-001-2024": [
    { code: "FMAT", name: "Foundation Mathematics", credits: 4, internals: "21 / 25", assignments: "8.5 / 10", attendance: "88%", grade: "A", faculty: "Dr. Rajesh Sharma", status: "Good" },
    { code: "FSCI", name: "Integrated Science", credits: 4, internals: "22 / 25", assignments: "9.0 / 10", attendance: "92%", grade: "A", faculty: "Mrs. Lakshmi Devi", status: "Consistent" },
    { code: "FENG", name: "English Language", credits: 3, internals: "21 / 25", assignments: "8.5 / 10", attendance: "90%", grade: "A", faculty: "Ms. Priya Sharma", status: "Active" },
  ],
  "stu-003": [
    { code: "BOT1", name: "Botany", credits: 4, internals: "25 / 25", assignments: "10 / 10", attendance: "100%", grade: "O", faculty: "Dr. Karthik Nair", status: "Class Topper" },
    { code: "ZOO1", name: "Zoology", credits: 4, internals: "24 / 25", assignments: "9.5 / 10", attendance: "92%", grade: "A+", faculty: "Dr. Karthik Nair", status: "High Performer" },
    { code: "PHY1", name: "Physics", credits: 4, internals: "23 / 25", assignments: "9.0 / 10", attendance: "96%", grade: "A+", faculty: "Mr. Suresh Kumar", status: "Consistent" },
    { code: "CHE1", name: "Chemistry", credits: 4, internals: "23 / 25", assignments: "9.5 / 10", attendance: "95%", grade: "A+", faculty: "Mrs. Lakshmi Devi", status: "Consistent" },
    { code: "ENG1", name: "English", credits: 3, internals: "23 / 25", assignments: "9.0 / 10", attendance: "95%", grade: "A+", faculty: "Ms. Priya Sharma", status: "Good" },
    { code: "BIOL1", name: "Biology Lab", credits: 2, internals: "25 / 25", assignments: "10 / 10", attendance: "100%", grade: "O", faculty: "Dr. Karthik Nair", status: "Perfect Score" },
  ],
  "stu-003-2025": [
    { code: "BOT1", name: "Botany", credits: 4, internals: "24 / 25", assignments: "9.5 / 10", attendance: "96%", grade: "A+", faculty: "Dr. Karthik Nair", status: "High Performer" },
    { code: "ZOO1", name: "Zoology", credits: 4, internals: "23 / 25", assignments: "9.0 / 10", attendance: "92%", grade: "A", faculty: "Dr. Karthik Nair", status: "Good" },
    { code: "PHY1", name: "Physics", credits: 4, internals: "22 / 25", assignments: "9.0 / 10", attendance: "92%", grade: "A", faculty: "Mr. Suresh Kumar", status: "Good" },
    { code: "CHE1", name: "Chemistry", credits: 4, internals: "22 / 25", assignments: "9.0 / 10", attendance: "95%", grade: "A", faculty: "Mrs. Lakshmi Devi", status: "Consistent" },
    { code: "ENG1", name: "English", credits: 3, internals: "23 / 25", assignments: "9.0 / 10", attendance: "95%", grade: "A+", faculty: "Ms. Priya Sharma", status: "Good" },
  ],
  "stu-004": [
    { code: "MAT1A", name: "Mathematics IA", credits: 4, internals: "22 / 25", assignments: "9.0 / 10", attendance: "92%", grade: "A", faculty: "Dr. Anitha Rao", status: "Consistent" },
    { code: "PHY1", name: "Physics", credits: 4, internals: "21 / 25", assignments: "8.5 / 10", attendance: "88%", grade: "A", faculty: "Mr. Suresh Kumar", status: "Good" },
    { code: "CHE1", name: "Chemistry", credits: 4, internals: "21 / 25", assignments: "8.5 / 10", attendance: "90%", grade: "A", faculty: "Mrs. Lakshmi Devi", status: "Active" },
    { code: "ENG1", name: "English", credits: 3, internals: "22 / 25", assignments: "9.0 / 10", attendance: "95%", grade: "A", faculty: "Ms. Priya Sharma", status: "Active" },
    { code: "CSC1", name: "Computer Science", credits: 4, internals: "23 / 25", assignments: "9.5 / 10", attendance: "95%", grade: "A+", faculty: "Mr. Ravi Teja", status: "Strong Performer" },
    { code: "PHYL1", name: "Physics Lab", credits: 2, internals: "23 / 25", assignments: "9.0 / 10", attendance: "90%", grade: "A", faculty: "Mr. Suresh Kumar", status: "Good" },
  ],
  "stu-004-2025": [
    { code: "MAT1A", name: "Mathematics IA", credits: 4, internals: "21 / 25", assignments: "8.5 / 10", attendance: "88%", grade: "A", faculty: "Dr. Anitha Rao", status: "Active" },
    { code: "PHY1", name: "Physics", credits: 4, internals: "20 / 25", assignments: "8.0 / 10", attendance: "84%", grade: "B+", faculty: "Mr. Suresh Kumar", status: "Active" },
    { code: "CHE1", name: "Chemistry", credits: 4, internals: "21 / 25", assignments: "8.5 / 10", attendance: "90%", grade: "A", faculty: "Mrs. Lakshmi Devi", status: "Good" },
    { code: "ENG1", name: "English", credits: 3, internals: "21 / 25", assignments: "8.5 / 10", attendance: "90%", grade: "A", faculty: "Ms. Priya Sharma", status: "Active" },
    { code: "CSC1", name: "Computer Science", credits: 4, internals: "22 / 25", assignments: "9.0 / 10", attendance: "90%", grade: "A", faculty: "Mr. Ravi Teja", status: "Good" },
  ],
};

export const examResultsData = {
  "stu-001": [
    {
      examName: "Quarterly Examination 2026",
      period: "Sep 2026",
      academicYear: "2026-2027",
      maxMarks: 600,
      obtainedMarks: 532,
      percentage: "88.6%",
      sgpa: "8.8",
      cgpa: "8.9",
      resultStatus: "Passed with Distinction",
      classRank: "3 of 45",
      subjects: [
        { code: "MAT1A", subject: "Mathematics IA", max: 100, obtained: 92, grade: "A+", status: "Pass" },
        { code: "PHY1", subject: "Physics", max: 100, obtained: 84, grade: "A", status: "Pass" },
        { code: "CHE1", subject: "Chemistry", max: 100, obtained: 88, grade: "A+", status: "Pass" },
        { code: "ENG1", subject: "English", max: 100, obtained: 86, grade: "A", status: "Pass" },
        { code: "CSC1", subject: "Computer Science", max: 100, obtained: 94, grade: "O", status: "Pass" },
        { code: "PHYL1", subject: "Physics Lab", max: 100, obtained: 88, grade: "A+", status: "Pass" },
      ],
    },
    {
      examName: "Unit Test 1 (Formative Assessment)",
      period: "Jul 2026",
      academicYear: "2026-2027",
      maxMarks: 150,
      obtainedMarks: 134,
      percentage: "89.3%",
      sgpa: "8.9",
      cgpa: "8.9",
      resultStatus: "Passed with Distinction",
      classRank: "2 of 45",
      subjects: [
        { code: "MAT1A", subject: "Mathematics IA", max: 25, obtained: 24, grade: "A+", status: "Pass" },
        { code: "PHY1", subject: "Physics", max: 25, obtained: 21, grade: "A", status: "Pass" },
        { code: "CHE1", subject: "Chemistry", max: 25, obtained: 22, grade: "A+", status: "Pass" },
        { code: "ENG1", subject: "English", max: 25, obtained: 22, grade: "A", status: "Pass" },
        { code: "CSC1", subject: "Computer Science", max: 25, obtained: 24, grade: "O", status: "Pass" },
        { code: "PHYL1", subject: "Physics Lab", max: 25, obtained: 21, grade: "A", status: "Pass" },
      ],
    },
    {
      examName: "Annual Board Examination 2025-26",
      period: "Mar 2026",
      academicYear: "2025-2026",
      maxMarks: 600,
      obtainedMarks: 504,
      percentage: "84.0%",
      sgpa: "8.4",
      cgpa: "8.6",
      resultStatus: "Passed with Distinction",
      classRank: "5 of 45",
      subjects: [
        { code: "MAT1A", subject: "Mathematics IA", max: 100, obtained: 88, grade: "A+", status: "Pass" },
        { code: "PHY1", subject: "Physics", max: 100, obtained: 82, grade: "A", status: "Pass" },
        { code: "CHE1", subject: "Chemistry", max: 100, obtained: 84, grade: "A", status: "Pass" },
        { code: "ENG1", subject: "English", max: 100, obtained: 80, grade: "A", status: "Pass" },
        { code: "CSC1", subject: "Computer Science", max: 100, obtained: 88, grade: "A+", status: "Pass" },
        { code: "PHYL1", subject: "Physics Lab", max: 100, obtained: 82, grade: "A", status: "Pass" },
      ],
    },
    {
      examName: "Half-Yearly Examination 2025",
      period: "Dec 2025",
      academicYear: "2025-2026",
      maxMarks: 600,
      obtainedMarks: 498,
      percentage: "83.0%",
      sgpa: "8.3",
      cgpa: "8.5",
      resultStatus: "Passed with First Class",
      classRank: "6 of 45",
      subjects: [
        { code: "MAT1A", subject: "Mathematics IA", max: 100, obtained: 86, grade: "A", status: "Pass" },
        { code: "PHY1", subject: "Physics", max: 100, obtained: 80, grade: "A", status: "Pass" },
        { code: "CHE1", subject: "Chemistry", max: 100, obtained: 82, grade: "A", status: "Pass" },
        { code: "ENG1", subject: "English", max: 100, obtained: 82, grade: "A", status: "Pass" },
        { code: "CSC1", subject: "Computer Science", max: 100, obtained: 86, grade: "A", status: "Pass" },
        { code: "PHYL1", subject: "Physics Lab", max: 100, obtained: 82, grade: "A", status: "Pass" },
      ],
    },
    {
      examName: "Quarterly Examination 2025",
      period: "Sep 2025",
      academicYear: "2025-2026",
      maxMarks: 600,
      obtainedMarks: 490,
      percentage: "81.6%",
      sgpa: "8.2",
      cgpa: "8.2",
      resultStatus: "Passed with First Class",
      classRank: "8 of 45",
      subjects: [
        { code: "MAT1A", subject: "Mathematics IA", max: 100, obtained: 85, grade: "A", status: "Pass" },
        { code: "PHY1", subject: "Physics", max: 100, obtained: 78, grade: "B+", status: "Pass" },
        { code: "CHE1", subject: "Chemistry", max: 100, obtained: 80, grade: "A", status: "Pass" },
        { code: "ENG1", subject: "English", max: 100, obtained: 84, grade: "A", status: "Pass" },
        { code: "CSC1", subject: "Computer Science", max: 100, obtained: 85, grade: "A", status: "Pass" },
        { code: "PHYL1", subject: "Physics Lab", max: 100, obtained: 78, grade: "B+", status: "Pass" },
      ],
    },
    {
      examName: "Annual Foundation Examination 2024-25",
      period: "Mar 2025",
      academicYear: "2024-2025",
      maxMarks: 600,
      obtainedMarks: 486,
      percentage: "81.0%",
      sgpa: "8.1",
      cgpa: "8.1",
      resultStatus: "Passed with First Class",
      classRank: "8 of 45",
      subjects: [
        { code: "FMAT", subject: "Foundation Mathematics", max: 100, obtained: 84, grade: "A", status: "Pass" },
        { code: "FPHY", subject: "Foundation Physics", max: 100, obtained: 78, grade: "B+", status: "Pass" },
        { code: "FCHE", subject: "Foundation Chemistry", max: 100, obtained: 80, grade: "A", status: "Pass" },
        { code: "FENG", subject: "English & Communication", max: 100, obtained: 82, grade: "A", status: "Pass" },
        { code: "FCSC", subject: "Basics of Computing", max: 100, obtained: 84, grade: "A", status: "Pass" },
        { code: "FLAB", subject: "Practical Science Lab", max: 100, obtained: 78, grade: "B+", status: "Pass" },
      ],
    },
  ],
  "stu-002": [
    {
      examName: "Quarterly Examination 2026",
      period: "Sep 2026",
      academicYear: "2026-2027",
      maxMarks: 600,
      obtainedMarks: 554,
      percentage: "92.3%",
      sgpa: "9.2",
      cgpa: "9.1",
      resultStatus: "Passed with Distinction",
      classRank: "1 of 42",
      subjects: [
        { code: "BOT1", subject: "Botany", max: 100, obtained: 96, grade: "O", status: "Pass" },
        { code: "ZOO1", subject: "Zoology", max: 100, obtained: 94, grade: "O", status: "Pass" },
        { code: "PHY1", subject: "Physics", max: 100, obtained: 88, grade: "A+", status: "Pass" },
        { code: "CHE1", subject: "Chemistry", max: 100, obtained: 91, grade: "A+", status: "Pass" },
        { code: "ENG1", subject: "English", max: 100, obtained: 90, grade: "A+", status: "Pass" },
        { code: "BIOL1", subject: "Biology Lab", max: 100, obtained: 95, grade: "O", status: "Pass" },
      ],
    },
    {
      examName: "Unit Test 1 (Formative Assessment)",
      period: "Jul 2026",
      academicYear: "2026-2027",
      maxMarks: 150,
      obtainedMarks: 141,
      percentage: "94.0%",
      sgpa: "9.4",
      cgpa: "9.1",
      resultStatus: "Passed with Distinction",
      classRank: "1 of 42",
      subjects: [
        { code: "BOT1", subject: "Botany", max: 25, obtained: 24, grade: "O", status: "Pass" },
        { code: "ZOO1", subject: "Zoology", max: 25, obtained: 24, grade: "O", status: "Pass" },
        { code: "PHY1", subject: "Physics", max: 25, obtained: 22, grade: "A+", status: "Pass" },
        { code: "CHE1", subject: "Chemistry", max: 25, obtained: 23, grade: "A+", status: "Pass" },
        { code: "ENG1", subject: "English", max: 25, obtained: 24, grade: "O", status: "Pass" },
        { code: "BIOL1", subject: "Biology Lab", max: 25, obtained: 24, grade: "O", status: "Pass" },
      ],
    },
    {
      examName: "Annual Board Examination 2025-26",
      period: "Mar 2026",
      academicYear: "2025-2026",
      maxMarks: 600,
      obtainedMarks: 546,
      percentage: "91.0%",
      sgpa: "9.1",
      cgpa: "9.0",
      resultStatus: "Passed with Distinction",
      classRank: "2 of 42",
      subjects: [
        { code: "BOT1", subject: "Botany", max: 100, obtained: 95, grade: "O", status: "Pass" },
        { code: "ZOO1", subject: "Zoology", max: 100, obtained: 92, grade: "O", status: "Pass" },
        { code: "PHY1", subject: "Physics", max: 100, obtained: 86, grade: "A", status: "Pass" },
        { code: "CHE1", subject: "Chemistry", max: 100, obtained: 89, grade: "A+", status: "Pass" },
        { code: "ENG1", subject: "English", max: 100, obtained: 92, grade: "O", status: "Pass" },
        { code: "BIOL1", subject: "Biology Lab", max: 100, obtained: 92, grade: "O", status: "Pass" },
      ],
    },
    {
      examName: "Half-Yearly Examination 2025",
      period: "Dec 2025",
      academicYear: "2025-2026",
      maxMarks: 600,
      obtainedMarks: 538,
      percentage: "89.6%",
      sgpa: "9.0",
      cgpa: "8.9",
      resultStatus: "Passed with Distinction",
      classRank: "2 of 42",
      subjects: [
        { code: "BOT1", subject: "Botany", max: 100, obtained: 94, grade: "O", status: "Pass" },
        { code: "ZOO1", subject: "Zoology", max: 100, obtained: 90, grade: "A+", status: "Pass" },
        { code: "PHY1", subject: "Physics", max: 100, obtained: 84, grade: "A", status: "Pass" },
        { code: "CHE1", subject: "Chemistry", max: 100, obtained: 88, grade: "A+", status: "Pass" },
        { code: "ENG1", subject: "English", max: 100, obtained: 90, grade: "A+", status: "Pass" },
        { code: "BIOL1", subject: "Biology Lab", max: 100, obtained: 92, grade: "O", status: "Pass" },
      ],
    },
    {
      examName: "Quarterly Examination 2025",
      period: "Sep 2025",
      academicYear: "2025-2026",
      maxMarks: 600,
      obtainedMarks: 530,
      percentage: "88.3%",
      sgpa: "8.8",
      cgpa: "8.8",
      resultStatus: "Passed with Distinction",
      classRank: "3 of 42",
      subjects: [
        { code: "BOT1", subject: "Botany", max: 100, obtained: 92, grade: "O", status: "Pass" },
        { code: "ZOO1", subject: "Zoology", max: 100, obtained: 88, grade: "A+", status: "Pass" },
        { code: "PHY1", subject: "Physics", max: 100, obtained: 82, grade: "A", status: "Pass" },
        { code: "CHE1", subject: "Chemistry", max: 100, obtained: 88, grade: "A+", status: "Pass" },
        { code: "ENG1", subject: "English", max: 100, obtained: 88, grade: "A+", status: "Pass" },
        { code: "BIOL1", subject: "Biology Lab", max: 100, obtained: 92, grade: "O", status: "Pass" },
      ],
    },
  ],
  "stu-003": [
    {
      examName: "Quarterly Examination 2026",
      period: "Sep 2026",
      academicYear: "2026-2027",
      maxMarks: 600,
      obtainedMarks: 558,
      percentage: "93.0%",
      sgpa: "9.3",
      cgpa: "9.2",
      resultStatus: "Passed with Distinction",
      classRank: "1 of 40",
      subjects: [
        { code: "BOT1", subject: "Botany", max: 100, obtained: 98, grade: "O", status: "Pass" },
        { code: "ZOO1", subject: "Zoology", max: 100, obtained: 94, grade: "O", status: "Pass" },
        { code: "PHY1", subject: "Physics", max: 100, obtained: 90, grade: "A+", status: "Pass" },
        { code: "CHE1", subject: "Chemistry", max: 100, obtained: 92, grade: "A+", status: "Pass" },
        { code: "ENG1", subject: "English", max: 100, obtained: 88, grade: "A+", status: "Pass" },
        { code: "BIOL1", subject: "Biology Lab", max: 100, obtained: 96, grade: "O", status: "Pass" },
      ],
    },
    {
      examName: "Unit Test 1 (Formative Assessment)",
      period: "Jul 2026",
      academicYear: "2026-2027",
      maxMarks: 150,
      obtainedMarks: 142,
      percentage: "94.6%",
      sgpa: "9.4",
      cgpa: "9.2",
      resultStatus: "Passed with Distinction",
      classRank: "1 of 40",
      subjects: [
        { code: "BOT1", subject: "Botany", max: 25, obtained: 25, grade: "O", status: "Pass" },
        { code: "ZOO1", subject: "Zoology", max: 25, obtained: 24, grade: "O", status: "Pass" },
        { code: "PHY1", subject: "Physics", max: 25, obtained: 23, grade: "A+", status: "Pass" },
        { code: "CHE1", subject: "Chemistry", max: 25, obtained: 23, grade: "A+", status: "Pass" },
        { code: "ENG1", subject: "English", max: 25, obtained: 23, grade: "A+", status: "Pass" },
        { code: "BIOL1", subject: "Biology Lab", max: 25, obtained: 24, grade: "O", status: "Pass" },
      ],
    },
    {
      examName: "Annual Board Examination 2025-26",
      period: "Mar 2026",
      academicYear: "2025-2026",
      maxMarks: 600,
      obtainedMarks: 546,
      percentage: "91.0%",
      sgpa: "9.1",
      cgpa: "9.0",
      resultStatus: "Passed with Distinction",
      classRank: "2 of 40",
      subjects: [
        { code: "BOT1", subject: "Botany", max: 100, obtained: 95, grade: "O", status: "Pass" },
        { code: "ZOO1", subject: "Zoology", max: 100, obtained: 92, grade: "O", status: "Pass" },
        { code: "PHY1", subject: "Physics", max: 100, obtained: 86, grade: "A", status: "Pass" },
        { code: "CHE1", subject: "Chemistry", max: 100, obtained: 89, grade: "A+", status: "Pass" },
        { code: "ENG1", subject: "English", max: 100, obtained: 92, grade: "O", status: "Pass" },
        { code: "BIOL1", subject: "Biology Lab", max: 100, obtained: 92, grade: "O", status: "Pass" },
      ],
    },
    {
      examName: "Half-Yearly Examination 2025",
      period: "Dec 2025",
      academicYear: "2025-2026",
      maxMarks: 600,
      obtainedMarks: 538,
      percentage: "89.6%",
      sgpa: "9.0",
      cgpa: "8.9",
      resultStatus: "Passed with Distinction",
      classRank: "2 of 40",
      subjects: [
        { code: "BOT1", subject: "Botany", max: 100, obtained: 94, grade: "O", status: "Pass" },
        { code: "ZOO1", subject: "Zoology", max: 100, obtained: 90, grade: "A+", status: "Pass" },
        { code: "PHY1", subject: "Physics", max: 100, obtained: 84, grade: "A", status: "Pass" },
        { code: "CHE1", subject: "Chemistry", max: 100, obtained: 88, grade: "A+", status: "Pass" },
        { code: "ENG1", subject: "English", max: 100, obtained: 90, grade: "A+", status: "Pass" },
        { code: "BIOL1", subject: "Biology Lab", max: 100, obtained: 92, grade: "O", status: "Pass" },
      ],
    },
  ],
  "stu-004": [
    {
      examName: "Quarterly Examination 2026",
      period: "Sep 2026",
      academicYear: "2026-2027",
      maxMarks: 600,
      obtainedMarks: 522,
      percentage: "87.0%",
      sgpa: "8.7",
      cgpa: "8.8",
      resultStatus: "Passed with Distinction",
      classRank: "4 of 42",
      subjects: [
        { code: "MAT1A", subject: "Mathematics IA", max: 100, obtained: 90, grade: "A+", status: "Pass" },
        { code: "PHY1", subject: "Physics", max: 100, obtained: 82, grade: "A", status: "Pass" },
        { code: "CHE1", subject: "Chemistry", max: 100, obtained: 85, grade: "A", status: "Pass" },
        { code: "ENG1", subject: "English", max: 100, obtained: 86, grade: "A", status: "Pass" },
        { code: "CSC1", subject: "Computer Science", max: 100, obtained: 92, grade: "O", status: "Pass" },
        { code: "PHYL1", subject: "Physics Lab", max: 100, obtained: 87, grade: "A+", status: "Pass" },
      ],
    },
    {
      examName: "Annual Board Examination 2025-26",
      period: "Mar 2026",
      academicYear: "2025-2026",
      maxMarks: 600,
      obtainedMarks: 510,
      percentage: "85.0%",
      sgpa: "8.5",
      cgpa: "8.6",
      resultStatus: "Passed with Distinction",
      classRank: "5 of 42",
      subjects: [
        { code: "MAT1A", subject: "Mathematics IA", max: 100, obtained: 88, grade: "A+", status: "Pass" },
        { code: "PHY1", subject: "Physics", max: 100, obtained: 80, grade: "A", status: "Pass" },
        { code: "CHE1", subject: "Chemistry", max: 100, obtained: 84, grade: "A", status: "Pass" },
        { code: "ENG1", subject: "English", max: 100, obtained: 82, grade: "A", status: "Pass" },
        { code: "CSC1", subject: "Computer Science", max: 100, obtained: 89, grade: "A+", status: "Pass" },
        { code: "PHYL1", subject: "Physics Lab", max: 100, obtained: 87, grade: "A+", status: "Pass" },
      ],
    },
    {
      examName: "Half-Yearly Examination 2025",
      period: "Dec 2025",
      academicYear: "2025-2026",
      maxMarks: 600,
      obtainedMarks: 504,
      percentage: "84.0%",
      sgpa: "8.4",
      cgpa: "8.5",
      resultStatus: "Passed with Distinction",
      classRank: "6 of 42",
      subjects: [
        { code: "MAT1A", subject: "Mathematics IA", max: 100, obtained: 86, grade: "A", status: "Pass" },
        { code: "PHY1", subject: "Physics", max: 100, obtained: 80, grade: "A", status: "Pass" },
        { code: "CHE1", subject: "Chemistry", max: 100, obtained: 82, grade: "A", status: "Pass" },
        { code: "ENG1", subject: "English", max: 100, obtained: 84, grade: "A", status: "Pass" },
        { code: "CSC1", subject: "Computer Science", max: 100, obtained: 86, grade: "A", status: "Pass" },
        { code: "PHYL1", subject: "Physics Lab", max: 100, obtained: 86, grade: "A", status: "Pass" },
      ],
    },
  ],
};

// ==========================================================================
// EXAMINATIONS SCHEDULE DATA
// ==========================================================================

export const upcomingExamsData = {
  "stu-001": [
    { id: "ex-01", subject: "Mathematics IA", code: "MAT1A", date: "05 Dec 2026", time: "09:30 AM - 12:30 PM", hall: "Examination Hall 1", seat: "R-101", invigilator: "Dr. Rajesh Sharma", syllabus: "Units 1 to 4 (Algebra, Coordinate Geometry, Calculus)", maxMarks: 100 },
    { id: "ex-02", subject: "Physics", code: "PHY1", date: "08 Dec 2026", time: "09:30 AM - 12:30 PM", hall: "Examination Hall 2", seat: "R-102", invigilator: "Mr. Suresh Kumar", syllabus: "Units 1 to 5 (Mechanics, Thermodynamics, Waves)", maxMarks: 100 },
    { id: "ex-03", subject: "Chemistry", code: "CHE1", date: "10 Dec 2026", time: "09:30 AM - 12:30 PM", hall: "Examination Hall 1", seat: "R-101", invigilator: "Mrs. Lakshmi Devi", syllabus: "Units 1 to 4 (Atomic Structure, Bonding, States of Matter)", maxMarks: 100 },
    { id: "ex-04", subject: "English", code: "ENG1", date: "12 Dec 2026", time: "09:30 AM - 12:30 PM", hall: "Examination Hall 3", seat: "R-105", invigilator: "Ms. Priya Sharma", syllabus: "Prose, Poetry, Comprehension, Writing Skills", maxMarks: 100 },
    { id: "ex-05", subject: "Computer Science", code: "CSC1", date: "15 Dec 2026", time: "09:30 AM - 12:30 PM", hall: "Examination Hall 2", seat: "R-102", invigilator: "Mr. Ravi Teja", syllabus: "Python Basics, Loops, Functions, OOP concepts", maxMarks: 100 },
  ],
  "stu-002": [
    { id: "ex-11", subject: "Botany", code: "BOT1", date: "05 Dec 2026", time: "09:30 AM - 12:30 PM", hall: "Examination Hall 2", seat: "B-204", invigilator: "Dr. Karthik Nair", syllabus: "Plant Physiology, Morphology, Taxonomy", maxMarks: 100 },
    { id: "ex-12", subject: "Zoology", code: "ZOO1", date: "08 Dec 2026", time: "09:30 AM - 12:30 PM", hall: "Examination Hall 2", seat: "B-204", invigilator: "Dr. Karthik Nair", syllabus: "Animal Diversity, Cell Biology, Histology", maxMarks: 100 },
    { id: "ex-13", subject: "Physics", code: "PHY1", date: "10 Dec 2026", time: "09:30 AM - 12:30 PM", hall: "Examination Hall 1", seat: "B-108", invigilator: "Mr. Suresh Kumar", syllabus: "Mechanics, Heat, Sound", maxMarks: 100 },
    { id: "ex-14", subject: "Chemistry", code: "CHE1", date: "12 Dec 2026", time: "09:30 AM - 12:30 PM", hall: "Examination Hall 1", seat: "B-108", invigilator: "Mrs. Lakshmi Devi", syllabus: "Periodic Classification, Chemical Bonding", maxMarks: 100 },
    { id: "ex-15", subject: "English", code: "ENG1", date: "15 Dec 2026", time: "09:30 AM - 12:30 PM", hall: "Examination Hall 3", seat: "B-210", invigilator: "Ms. Priya Sharma", syllabus: "Grammar, Literature, Essay Writing", maxMarks: 100 },
  ],
  "stu-001-2025": [
    { id: "ex-21", subject: "Mathematics IA", code: "MAT1A", date: "18 Mar 2026", time: "09:30 AM - 12:30 PM", hall: "Exam Hall 1", seat: "A-102", invigilator: "Dr. Rajesh Sharma", syllabus: "Complete Annual Intermediate 1st Year Syllabus", maxMarks: 100 },
    { id: "ex-22", subject: "Physics Theory", code: "PHY1", date: "21 Mar 2026", time: "09:30 AM - 12:30 PM", hall: "Exam Hall 2", seat: "A-102", invigilator: "Mr. Suresh Kumar", syllabus: "Units 1 to 5 (Mechanics, Heat, Sound)", maxMarks: 100 },
  ],
  "stu-002-2025": [
    { id: "ex-31", subject: "Botany Annual", code: "BOT1", date: "18 Mar 2026", time: "09:30 AM - 12:30 PM", hall: "Exam Hall 3", seat: "B-205", invigilator: "Dr. Karthik Nair", syllabus: "Complete Annual 1st Year Botany", maxMarks: 100 },
    { id: "ex-32", subject: "Zoology Annual", code: "ZOO1", date: "21 Mar 2026", time: "09:30 AM - 12:30 PM", hall: "Exam Hall 3", seat: "B-205", invigilator: "Dr. Karthik Nair", syllabus: "Complete Annual 1st Year Zoology", maxMarks: 100 },
  ],
  "stu-001-2024": [
    { id: "ex-41", subject: "Foundation Mathematics", code: "FMAT", date: "20 Mar 2025", time: "09:30 AM - 12:30 PM", hall: "Main Hall", seat: "F-01", invigilator: "Dr. Rajesh Sharma", syllabus: "Annual Foundation Syllabus", maxMarks: 100 },
  ],
  "stu-003": [
    { id: "ex-301", subject: "Botany", code: "BOT1", date: "05 Dec 2026", time: "09:30 AM - 12:30 PM", hall: "Examination Hall 2", seat: "S-101", invigilator: "Dr. Karthik Nair", syllabus: "Plant Physiology, Morphology, Taxonomy", maxMarks: 100 },
    { id: "ex-302", subject: "Zoology", code: "ZOO1", date: "08 Dec 2026", time: "09:30 AM - 12:30 PM", hall: "Examination Hall 2", seat: "S-101", invigilator: "Dr. Karthik Nair", syllabus: "Animal Diversity, Cell Biology, Histology", maxMarks: 100 },
    { id: "ex-303", subject: "Physics", code: "PHY1", date: "10 Dec 2026", time: "09:30 AM - 12:30 PM", hall: "Examination Hall 1", seat: "S-105", invigilator: "Mr. Suresh Kumar", syllabus: "Mechanics, Heat, Sound", maxMarks: 100 },
    { id: "ex-304", subject: "Chemistry", code: "CHE1", date: "12 Dec 2026", time: "09:30 AM - 12:30 PM", hall: "Examination Hall 1", seat: "S-105", invigilator: "Mrs. Lakshmi Devi", syllabus: "Periodic Classification, Chemical Bonding", maxMarks: 100 },
    { id: "ex-305", subject: "English", code: "ENG1", date: "15 Dec 2026", time: "09:30 AM - 12:30 PM", hall: "Examination Hall 3", seat: "S-112", invigilator: "Ms. Priya Sharma", syllabus: "Grammar, Literature, Essay Writing", maxMarks: 100 },
  ],
  "stu-003-2025": [
    { id: "ex-321", subject: "Botany Annual", code: "BOT1", date: "18 Mar 2026", time: "09:30 AM - 12:30 PM", hall: "Exam Hall 3", seat: "S-205", invigilator: "Dr. Karthik Nair", syllabus: "Complete Annual 1st Year Botany", maxMarks: 100 },
    { id: "ex-322", subject: "Zoology Annual", code: "ZOO1", date: "21 Mar 2026", time: "09:30 AM - 12:30 PM", hall: "Exam Hall 3", seat: "S-205", invigilator: "Dr. Karthik Nair", syllabus: "Complete Annual 1st Year Zoology", maxMarks: 100 },
  ],
  "stu-004": [
    { id: "ex-401", subject: "Mathematics IA", code: "MAT1A", date: "05 Dec 2026", time: "09:30 AM - 12:30 PM", hall: "Examination Hall 1", seat: "M-104", invigilator: "Dr. Rajesh Sharma", syllabus: "Units 1 to 4 (Algebra, Coordinate Geometry, Calculus)", maxMarks: 100 },
    { id: "ex-402", subject: "Physics", code: "PHY1", date: "08 Dec 2026", time: "09:30 AM - 12:30 PM", hall: "Examination Hall 2", seat: "M-106", invigilator: "Mr. Suresh Kumar", syllabus: "Units 1 to 5 (Mechanics, Thermodynamics, Waves)", maxMarks: 100 },
    { id: "ex-403", subject: "Chemistry", code: "CHE1", date: "10 Dec 2026", time: "09:30 AM - 12:30 PM", hall: "Examination Hall 1", seat: "M-104", invigilator: "Mrs. Lakshmi Devi", syllabus: "Units 1 to 4 (Atomic Structure, Bonding, States of Matter)", maxMarks: 100 },
    { id: "ex-404", subject: "English", code: "ENG1", date: "12 Dec 2026", time: "09:30 AM - 12:30 PM", hall: "Examination Hall 3", seat: "M-108", invigilator: "Ms. Priya Sharma", syllabus: "Prose, Poetry, Comprehension, Writing Skills", maxMarks: 100 },
    { id: "ex-405", subject: "Computer Science", code: "CSC1", date: "15 Dec 2026", time: "09:30 AM - 12:30 PM", hall: "Examination Hall 2", seat: "M-106", invigilator: "Mr. Ravi Teja", syllabus: "Python Basics, Loops, Functions, OOP concepts", maxMarks: 100 },
  ],
  "stu-004-2025": [
    { id: "ex-421", subject: "Mathematics IA", code: "MAT1A", date: "18 Mar 2026", time: "09:30 AM - 12:30 PM", hall: "Exam Hall 1", seat: "M-202", invigilator: "Dr. Rajesh Sharma", syllabus: "Complete Annual Intermediate 1st Year Syllabus", maxMarks: 100 },
    { id: "ex-422", subject: "Physics Theory", code: "PHY1", date: "21 Mar 2026", time: "09:30 AM - 12:30 PM", hall: "Exam Hall 2", seat: "M-202", invigilator: "Mr. Suresh Kumar", syllabus: "Units 1 to 5 (Mechanics, Heat, Sound)", maxMarks: 100 },
  ],
};

// ==========================================================================
// FEES & PAYMENTS DATA
// ==========================================================================

export const initialFeeRecords = {
  "stu-001": {
    total: 45500,
    paid: 28000,
    pending: 17500,
    dueDate: "15 Oct 2026",
    status: "Partial",
    breakdown: [
      { category: "Tuition Fee", amount: 35000, paid: 25000, pending: 10000, due: "15 Oct 2026", status: "Partial" },
      { category: "Laboratory Fee", amount: 6000, paid: 3000, pending: 3000, due: "15 Oct 2026", status: "Partial" },
      { category: "Examination & Assessment Fee", amount: 2500, paid: 0, pending: 2500, due: "15 Oct 2026", status: "Due" },
      { category: "Sports, Gymkhana & Cultural", amount: 2000, paid: 0, pending: 2000, due: "15 Oct 2026", status: "Due" },
    ],
    receipts: [
      { id: "rec-01", receiptNo: "REC-2026-0891", date: "10 Jun 2026", amount: 20000, method: "UPI / PhonePe", txnId: "UPI26061099812", paidFor: "Admission & 1st Installment Tuition", status: "Success" },
      { id: "rec-02", receiptNo: "REC-2026-1402", date: "15 Aug 2026", amount: 8000, method: "Net Banking (SBI)", txnId: "SBI26081544910", paidFor: "Term 1 Lab & Academic Amenities Part Payment", status: "Success" },
    ],
  },
  "stu-002": {
    total: 47500,
    paid: 47500,
    pending: 0,
    dueDate: "—",
    status: "Paid",
    breakdown: [
      { category: "Tuition Fee", amount: 36000, paid: 36000, pending: 0, due: "Paid", status: "Paid" },
      { category: "Laboratory Fee (BiPC)", amount: 7000, paid: 7000, pending: 0, due: "Paid", status: "Paid" },
      { category: "Examination & Assessment Fee", amount: 2500, paid: 2500, pending: 0, due: "Paid", status: "Paid" },
      { category: "Sports & Amenities", amount: 2000, paid: 2000, pending: 0, due: "Paid", status: "Paid" },
    ],
    receipts: [
      { id: "rec-03", receiptNo: "REC-2026-0612", date: "04 Jun 2026", amount: 47500, method: "Net Banking (HDFC)", txnId: "HDFC2606041289", paidFor: "Full Annual Fee Academic Year 2026-2027", status: "Success" },
    ],
  },
  "stu-001-2025": {
    total: 43500,
    paid: 43500,
    pending: 0,
    dueDate: "—",
    status: "Paid",
    breakdown: [
      { category: "Tuition Fee", amount: 34000, paid: 34000, pending: 0, due: "Paid", status: "Paid" },
      { category: "Laboratory Fee", amount: 5500, paid: 5500, pending: 0, due: "Paid", status: "Paid" },
      { category: "Examination Fee", amount: 2000, paid: 2000, pending: 0, due: "Paid", status: "Paid" },
      { category: "Sports & Amenities", amount: 2000, paid: 2000, pending: 0, due: "Paid", status: "Paid" },
    ],
    receipts: [
      { id: "rec-25-01", receiptNo: "REC-2025-0182", date: "12 Jun 2025", amount: 43500, method: "Net Banking (SBI)", txnId: "SBI2506124401", paidFor: "Full Annual Fee 2025-2026", status: "Success" },
    ],
  },
  "stu-002-2025": {
    total: 45500,
    paid: 45500,
    pending: 0,
    dueDate: "—",
    status: "Paid",
    breakdown: [
      { category: "Tuition Fee", amount: 35000, paid: 35000, pending: 0, due: "Paid", status: "Paid" },
      { category: "Laboratory Fee (BiPC)", amount: 6500, paid: 6500, pending: 0, due: "Paid", status: "Paid" },
      { category: "Sports & Amenities", amount: 2000, paid: 2000, pending: 0, due: "Paid", status: "Paid" },
      { category: "Examination Fee", amount: 2000, paid: 2000, pending: 0, due: "Paid", status: "Paid" },
    ],
    receipts: [
      { id: "rec-25-02", receiptNo: "REC-2025-0518", date: "15 Jun 2025", amount: 45500, method: "UPI / PhonePe", txnId: "UPI2506159932", paidFor: "Annual Fee 2025-2026", status: "Success" },
    ],
  },
  "stu-001-2024": {
    total: 42000,
    paid: 42000,
    pending: 0,
    dueDate: "—",
    status: "Paid",
    breakdown: [
      { category: "Foundation Fee", amount: 42000, paid: 42000, pending: 0, due: "Paid", status: "Paid" },
    ],
    receipts: [
      { id: "rec-24-01", receiptNo: "REC-2024-0091", date: "10 Jun 2024", amount: 42000, method: "UPI / PhonePe", txnId: "UPI2406101122", paidFor: "Annual Foundation Fee 2024-2025", status: "Success" },
    ],
  },
  "stu-003": {
    total: 46500,
    paid: 46500,
    pending: 0,
    dueDate: "—",
    status: "Paid",
    breakdown: [
      { category: "Tuition Fee", amount: 35000, paid: 35000, pending: 0, due: "Paid", status: "Paid" },
      { category: "Laboratory Fee (BiPC)", amount: 7000, paid: 7000, pending: 0, due: "Paid", status: "Paid" },
      { category: "Examination & Assessment Fee", amount: 2500, paid: 2500, pending: 0, due: "Paid", status: "Paid" },
      { category: "Sports & Amenities", amount: 2000, paid: 2000, pending: 0, due: "Paid", status: "Paid" },
    ],
    receipts: [
      { id: "rec-301", receiptNo: "REC-2026-0711", date: "06 Jun 2026", amount: 46500, method: "Net Banking (SBI)", txnId: "SBI2606063319", paidFor: "Full Annual Fee Academic Year 2026-2027", status: "Success" },
    ],
  },
  "stu-003-2025": {
    total: 44500,
    paid: 44500,
    pending: 0,
    dueDate: "—",
    status: "Paid",
    breakdown: [
      { category: "Tuition Fee", amount: 34000, paid: 34000, pending: 0, due: "Paid", status: "Paid" },
      { category: "Laboratory Fee (BiPC)", amount: 6500, paid: 6500, pending: 0, due: "Paid", status: "Paid" },
      { category: "Sports & Amenities", amount: 2000, paid: 2000, pending: 0, due: "Paid", status: "Paid" },
      { category: "Examination Fee", amount: 2000, paid: 2000, pending: 0, due: "Paid", status: "Paid" },
    ],
    receipts: [
      { id: "rec-35-01", receiptNo: "REC-2025-0419", date: "11 Jun 2025", amount: 44500, method: "Net Banking (SBI)", txnId: "SBI2506118801", paidFor: "Annual Fee 2025-2026", status: "Success" },
    ],
  },
  "stu-004": {
    total: 45500,
    paid: 26000,
    pending: 19500,
    dueDate: "20 Oct 2026",
    status: "Partial",
    breakdown: [
      { category: "Tuition Fee", amount: 35000, paid: 23000, pending: 12000, due: "20 Oct 2026", status: "Partial" },
      { category: "Laboratory Fee", amount: 6000, paid: 3000, pending: 3000, due: "20 Oct 2026", status: "Partial" },
      { category: "Examination & Assessment Fee", amount: 2500, paid: 0, pending: 2500, due: "20 Oct 2026", status: "Due" },
      { category: "Sports, Gymkhana & Cultural", amount: 2000, paid: 0, pending: 2000, due: "20 Oct 2026", status: "Due" },
    ],
    receipts: [
      { id: "rec-401", receiptNo: "REC-2026-0922", date: "14 Jun 2026", amount: 26000, method: "UPI / PhonePe", txnId: "UPI2606148811", paidFor: "Admission & 1st Installment Tuition", status: "Success" },
    ],
  },
  "stu-004-2025": {
    total: 42500,
    paid: 42500,
    pending: 0,
    dueDate: "—",
    status: "Paid",
    breakdown: [
      { category: "Tuition Fee", amount: 33000, paid: 33000, pending: 0, due: "Paid", status: "Paid" },
      { category: "Laboratory Fee", amount: 5500, paid: 5500, pending: 0, due: "Paid", status: "Paid" },
      { category: "Examination Fee", amount: 2000, paid: 2000, pending: 0, due: "Paid", status: "Paid" },
      { category: "Sports & Amenities", amount: 2000, paid: 2000, pending: 0, due: "Paid", status: "Paid" },
    ],
    receipts: [
      { id: "rec-45-01", receiptNo: "REC-2025-0291", date: "16 Jun 2025", amount: 42500, method: "Net Banking (HDFC)", txnId: "HDFC2506169941", paidFor: "Full Annual Fee 2025-2026", status: "Success" },
    ],
  },
};

export const getStoredFeeRecords = () => {
  try {
    const raw = localStorage.getItem(PARENT_FEES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      let modified = false;
      const sanitized = {};
      for (const [key, record] of Object.entries(parsed)) {
        if (record && Array.isArray(record.breakdown)) {
          const hasLibrary = record.breakdown.some((b) => /library/i.test(b.category));
          const filteredBreakdown = record.breakdown.filter((b) => !/library/i.test(b.category));
          const cleanedReceipts = (record.receipts || []).map((r) => ({
            ...r,
            paidFor: (r.paidFor || "").replace(/& Library/gi, "& Academic Amenities").replace(/Library/gi, "Academic"),
          }));

          const bTotal = filteredBreakdown.reduce((sum, b) => sum + (b.amount || 0), 0);
          const bPaid = filteredBreakdown.reduce((sum, b) => sum + (b.paid || 0), 0);
          const bPending = filteredBreakdown.reduce((sum, b) => sum + (b.pending || 0), 0);

          if (hasLibrary || record.total !== bTotal) {
            modified = true;
          }

          sanitized[key] = {
            ...record,
            total: bTotal > 0 ? bTotal : record.total,
            paid: bTotal > 0 ? bPaid : record.paid,
            pending: bTotal > 0 ? bPending : record.pending,
            status: bTotal > 0 ? (bPending === 0 ? "Paid" : bPaid > 0 ? "Partial" : "Due") : record.status,
            breakdown: filteredBreakdown,
            receipts: cleanedReceipts,
          };
        } else {
          sanitized[key] = record;
        }
      }
      if (modified) {
        saveStoredFeeRecords(sanitized);
      }
      return sanitized;
    }
  } catch (e) {
    console.debug("Failed reading fees from storage:", e);
  }
  return initialFeeRecords;
};

export const saveStoredFeeRecords = (records) => {
  try {
    localStorage.setItem(PARENT_FEES_KEY, JSON.stringify(records));
  } catch (e) {
    console.debug("Failed writing fees to storage:", e);
  }
};

// ==========================================================================
// TIMETABLE DATA
// ==========================================================================

export const timetableData = {
  "stu-001": [
    { period: "Period 1", time: "09:00 - 10:00 AM", mon: "Mathematics IA (Room 203)", tue: "Physics (Room 203)", wed: "Chemistry (Room 203)", thu: "Mathematics IA (Room 203)", fri: "Computer Science (Lab 1)", sat: "Mathematics IA (Room 203)" },
    { period: "Period 2", time: "10:00 - 11:00 AM", mon: "Physics (Room 203)", tue: "Mathematics IA (Room 203)", wed: "English (Room 203)", thu: "Computer Science (Lab 1)", fri: "Physics (Room 203)", sat: "Chemistry (Room 203)" },
    { period: "Break", time: "11:00 - 11:15 AM", mon: "Short Break", tue: "Short Break", wed: "Short Break", thu: "Short Break", fri: "Short Break", sat: "Short Break", isBreak: true },
    { period: "Period 3", time: "11:15 - 12:15 PM", mon: "Chemistry (Room 203)", tue: "English (Room 203)", wed: "Mathematics IA (Room 203)", thu: "Physics (Room 203)", fri: "Mathematics IA (Room 203)", sat: "English (Room 203)" },
    { period: "Lunch", time: "12:15 - 01:15 PM", mon: "Lunch Break", tue: "Lunch Break", wed: "Lunch Break", thu: "Lunch Break", fri: "Lunch Break", sat: "Lunch Break", isBreak: true },
    { period: "Period 4", time: "01:15 - 02:15 PM", mon: "Physics Lab (Lab 2)", tue: "Chemistry Lab (Lab 3)", wed: "Physics (Room 203)", thu: "English (Room 203)", fri: "Chemistry (Room 203)", sat: "Remedial / Mentorship" },
    { period: "Period 5", time: "02:15 - 03:15 PM", mon: "Physics Lab (Lab 2)", tue: "Chemistry Lab (Lab 3)", wed: "Computer Science (Lab 1)", thu: "Study Hour & Revision", fri: "Computer Science (Lab 1)", sat: "Sports & Club Activity" },
    { period: "Period 6", time: "03:15 - 04:00 PM", mon: "Tutorial (Mathematics)", tue: "Tutorial (Physics)", wed: "Tutorial (Chemistry)", thu: "Doubt Clearance", fri: "Doubt Clearance", sat: "Dispersal" },
  ],
  "stu-002": [
    { period: "Period 1", time: "09:00 - 10:00 AM", mon: "Botany (Room 104)", tue: "Zoology (Room 104)", wed: "Physics (Room 104)", thu: "Chemistry (Room 104)", fri: "Botany (Room 104)", sat: "Zoology (Room 104)" },
    { period: "Period 2", time: "10:00 - 11:00 AM", mon: "Zoology (Room 104)", tue: "Botany (Room 104)", wed: "Chemistry (Room 104)", thu: "Physics (Room 104)", fri: "English (Room 104)", sat: "Botany (Room 104)" },
    { period: "Break", time: "11:00 - 11:15 AM", mon: "Short Break", tue: "Short Break", wed: "Short Break", thu: "Short Break", fri: "Short Break", sat: "Short Break", isBreak: true },
    { period: "Period 3", time: "11:15 - 12:15 PM", mon: "Physics (Room 104)", tue: "Chemistry (Room 104)", wed: "English (Room 104)", thu: "Botany (Room 104)", fri: "Zoology (Room 104)", sat: "Chemistry (Room 104)" },
    { period: "Lunch", time: "12:15 - 01:15 PM", mon: "Lunch Break", tue: "Lunch Break", wed: "Lunch Break", thu: "Lunch Break", fri: "Lunch Break", sat: "Lunch Break", isBreak: true },
    { period: "Period 4", time: "01:15 - 02:15 PM", mon: "Biology Lab (Lab 1)", tue: "Physics Lab (Lab 2)", wed: "Botany (Room 104)", thu: "Zoology (Room 104)", fri: "Physics (Room 104)", sat: "Remedial Study" },
    { period: "Period 5", time: "02:15 - 03:15 PM", mon: "Biology Lab (Lab 1)", tue: "Physics Lab (Lab 2)", wed: "Chemistry Lab (Lab 3)", thu: "Self Study & Revision", fri: "Sports / Health Ed", sat: "Extracurricular" },
    { period: "Period 6", time: "03:15 - 04:00 PM", mon: "Tutorial (Biology)", tue: "Tutorial (Physics)", wed: "Tutorial (Chemistry)", thu: "Doubt Clearance", fri: "Doubt Clearance", sat: "Dispersal" },
  ],
  "stu-003": [
    { period: "Period 1", time: "09:00 - 10:00 AM", mon: "Botany (Room 104)", tue: "Zoology (Room 104)", wed: "Physics (Room 104)", thu: "Chemistry (Room 104)", fri: "Botany (Room 104)", sat: "Zoology (Room 104)" },
    { period: "Period 2", time: "10:00 - 11:00 AM", mon: "Zoology (Room 104)", tue: "Botany (Room 104)", wed: "Chemistry (Room 104)", thu: "Physics (Room 104)", fri: "English (Room 104)", sat: "Botany (Room 104)" },
    { period: "Break", time: "11:00 - 11:15 AM", mon: "Short Break", tue: "Short Break", wed: "Short Break", thu: "Short Break", fri: "Short Break", sat: "Short Break", isBreak: true },
    { period: "Period 3", time: "11:15 - 12:15 PM", mon: "Physics (Room 104)", tue: "Chemistry (Room 104)", wed: "English (Room 104)", thu: "Botany (Room 104)", fri: "Zoology (Room 104)", sat: "Chemistry (Room 104)" },
    { period: "Lunch", time: "12:15 - 01:15 PM", mon: "Lunch Break", tue: "Lunch Break", wed: "Lunch Break", thu: "Lunch Break", fri: "Lunch Break", sat: "Lunch Break", isBreak: true },
    { period: "Period 4", time: "01:15 - 02:15 PM", mon: "Biology Lab (Lab 1)", tue: "Physics Lab (Lab 2)", wed: "Botany (Room 104)", thu: "Zoology (Room 104)", fri: "Physics (Room 104)", sat: "Remedial Study" },
    { period: "Period 5", time: "02:15 - 03:15 PM", mon: "Biology Lab (Lab 1)", tue: "Physics Lab (Lab 2)", wed: "Chemistry Lab (Lab 3)", thu: "Self Study & Revision", fri: "Sports / Health Ed", sat: "Extracurricular" },
    { period: "Period 6", time: "03:15 - 04:00 PM", mon: "Tutorial (Biology)", tue: "Tutorial (Physics)", wed: "Tutorial (Chemistry)", thu: "Doubt Clearance", fri: "Doubt Clearance", sat: "Dispersal" },
  ],
  "stu-004": [
    { period: "Period 1", time: "09:00 - 10:00 AM", mon: "Mathematics IA (Room 203)", tue: "Physics (Room 203)", wed: "Chemistry (Room 203)", thu: "Mathematics IA (Room 203)", fri: "Computer Science (Lab 1)", sat: "Mathematics IA (Room 203)" },
    { period: "Period 2", time: "10:00 - 11:00 AM", mon: "Physics (Room 203)", tue: "Mathematics IA (Room 203)", wed: "English (Room 203)", thu: "Computer Science (Lab 1)", fri: "Physics (Room 203)", sat: "Chemistry (Room 203)" },
    { period: "Break", time: "11:00 - 11:15 AM", mon: "Short Break", tue: "Short Break", wed: "Short Break", thu: "Short Break", fri: "Short Break", sat: "Short Break", isBreak: true },
    { period: "Period 3", time: "11:15 - 12:15 PM", mon: "Chemistry (Room 203)", tue: "English (Room 203)", wed: "Mathematics IA (Room 203)", thu: "Physics (Room 203)", fri: "Mathematics IA (Room 203)", sat: "English (Room 203)" },
    { period: "Lunch", time: "12:15 - 01:15 PM", mon: "Lunch Break", tue: "Lunch Break", wed: "Lunch Break", thu: "Lunch Break", fri: "Lunch Break", sat: "Lunch Break", isBreak: true },
    { period: "Period 4", time: "01:15 - 02:15 PM", mon: "Physics Lab (Lab 2)", tue: "Chemistry Lab (Lab 3)", wed: "Physics (Room 203)", thu: "English (Room 203)", fri: "Chemistry (Room 203)", sat: "Remedial / Mentorship" },
    { period: "Period 5", time: "02:15 - 03:15 PM", mon: "Physics Lab (Lab 2)", tue: "Chemistry Lab (Lab 3)", wed: "Computer Science (Lab 1)", thu: "Study Hour & Revision", fri: "Computer Science (Lab 1)", sat: "Sports & Club Activity" },
    { period: "Period 6", time: "03:15 - 04:00 PM", mon: "Tutorial (Mathematics)", tue: "Tutorial (Physics)", wed: "Tutorial (Chemistry)", thu: "Doubt Clearance", fri: "Doubt Clearance", sat: "Dispersal" },
  ],
};

// ==========================================================================
// LEAVE MANAGEMENT DATA
// ==========================================================================

export const initialLeaveRequests = [
  {
    id: "leave-01",
    studentId: "stu-001",
    studentName: "Rahul Kumar",
    leaveType: "Medical Leave",
    startDate: "2026-09-17",
    endDate: "2026-09-17",
    days: 1,
    reason: "Mild viral fever and doctor advised rest for 24 hours.",
    appliedDate: "2026-09-16 08:30 PM",
    status: "Approved",
    approvedBy: "Dr. Anitha Rao (Class Teacher)",
    actionDate: "2026-09-17 07:15 AM",
    remarks: "Leave approved. Please submit prescription copy upon returning.",
  },
  {
    id: "leave-02",
    studentId: "stu-001",
    studentName: "Rahul Kumar",
    leaveType: "Casual / Family Leave",
    startDate: "2026-07-24",
    endDate: "2026-07-25",
    days: 2,
    reason: "Attending cousin's wedding ceremony in Vijayawada.",
    appliedDate: "2026-07-20 11:15 AM",
    status: "Approved",
    approvedBy: "Dr. Anitha Rao (Class Teacher)",
    actionDate: "2026-07-21 02:40 PM",
    remarks: "Approved. Advised to complete missed class notes from classmates.",
  },
  {
    id: "leave-03",
    studentId: "stu-002",
    studentName: "Ananya Kumar",
    leaveType: "Medical Leave",
    startDate: "2026-08-12",
    endDate: "2026-08-12",
    days: 1,
    reason: "Severe toothache and dental appointment.",
    appliedDate: "2026-08-11 06:10 PM",
    status: "Approved",
    approvedBy: "Mrs. Lakshmi Devi (Class Teacher)",
    actionDate: "2026-08-12 07:30 AM",
    remarks: "Approved. Take care.",
  },
  {
    id: "leave-04",
    studentId: "stu-003",
    studentName: "Priya Sharma",
    leaveType: "Medical Leave",
    startDate: "2026-09-10",
    endDate: "2026-09-10",
    days: 1,
    reason: "Eye checkup and prescription renewal.",
    appliedDate: "2026-09-09 07:30 PM",
    status: "Approved",
    approvedBy: "Mrs. Lakshmi Devi (Class Teacher)",
    actionDate: "2026-09-10 08:00 AM",
    remarks: "Leave sanctioned.",
  },
];

export const getStoredLeaves = () => {
  try {
    const raw = localStorage.getItem(PARENT_LEAVE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.debug("Failed reading leaves from storage:", e);
  }
  return initialLeaveRequests;
};

export const saveStoredLeaves = (leaves) => {
  try {
    localStorage.setItem(PARENT_LEAVE_KEY, JSON.stringify(leaves));
  } catch (e) {
    console.debug("Failed writing leaves to storage:", e);
  }
};

// ==========================================================================
// COMMUNICATION / TEACHER DIRECTORY & MESSAGES
// ==========================================================================

export const teachersDirectory = [
  { id: "tea-01", name: "Dr. Anitha Rao", subject: "Mathematics IA", role: "Class Teacher (MPC Section A)", mobile: "+91 98480 12345", email: "anitha.rao@college.edu", availableHours: "03:30 PM - 04:30 PM (Mon-Fri)", avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=150" },
  { id: "tea-02", name: "Mr. Suresh Kumar", subject: "Physics", role: "Senior Lecturer", mobile: "+91 98480 23456", email: "suresh.k@college.edu", availableHours: "02:00 PM - 03:00 PM (Tue, Thu)", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150" },
  { id: "tea-03", name: "Mrs. Lakshmi Devi", subject: "Chemistry", role: "Class Teacher (BiPC Section B)", mobile: "+91 98480 34567", email: "lakshmi.d@college.edu", availableHours: "03:00 PM - 04:00 PM (Mon, Wed)", avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=150" },
  { id: "tea-04", name: "Dr. Karthik Nair", subject: "Biology / Botany", role: "HOD & Professor", mobile: "+91 98480 67890", email: "karthik.n@college.edu", availableHours: "11:00 AM - 12:00 PM (Mon-Fri)", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150" },
  { id: "tea-05", name: "Ms. Priya Sharma", subject: "English", role: "Assistant Professor", mobile: "+91 98480 56789", email: "priya.s@college.edu", availableHours: "01:30 PM - 02:30 PM (Wed, Fri)", avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=150" },
  { id: "tea-06", name: "Dr. V. R. Murthy", subject: "Administration", role: "Principal, Pirnav Junior College", mobile: "+91 98480 99999", email: "principal@pirnav.edu.in", availableHours: "By Prior Appointment", avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=150" },
];

export const initialMessages = {
  "parent-001": [
    {
      id: "msg-01",
      teacherId: "tea-01",
      teacherName: "Dr. Anitha Rao",
      subject: "Quarterly Math Performance Feedback",
      snippet: "Rahul scored 92/100 in Mathematics. Keep encouraging his problem-solving habits.",
      date: "18 Sep 2026, 04:15 PM",
      thread: [
        { sender: "teacher", senderName: "Dr. Anitha Rao", time: "18 Sep 2026, 04:15 PM", text: "Dear Suresh garu, Rahul has performed exceptionally well in the Quarterly Maths exam scoring 92/100. He is very active during tutorial hours. Keep encouraging his problem-solving habits." },
        { sender: "parent", senderName: "Suresh Kumar", time: "18 Sep 2026, 05:30 PM", text: "Thank you Dr. Anitha Madam for your guidance and support. He really enjoys your mathematics lectures." },
      ],
    },
    {
      id: "msg-02",
      teacherId: "tea-02",
      teacherName: "Mr. Suresh Kumar",
      subject: "Physics Numerical Practice",
      snippet: "Please ensure Rahul spends 30 minutes daily on Physics derivation practice.",
      date: "10 Sep 2026, 11:20 AM",
      thread: [
        { sender: "teacher", senderName: "Mr. Suresh Kumar", time: "10 Sep 2026, 11:20 AM", text: "Hello Mr. Suresh, Rahul's conceptual understanding of Physics is strong, but he tends to skip intermediate steps in numerical derivations. A daily 30-minute practice at home will help him secure full marks." },
        { sender: "parent", senderName: "Suresh Kumar", time: "10 Sep 2026, 01:10 PM", text: "Noted sir. I will monitor his numerical workout sessions at home." },
      ],
    },
  ],
  "parent-002": [
    {
      id: "msg-21",
      teacherId: "tea-03",
      teacherName: "Mrs. Lakshmi Devi",
      subject: "Botany & Chemistry Laboratory Assessment",
      snippet: "Priya is excelling in practical lab records and biology experiments.",
      date: "17 Sep 2026, 03:30 PM",
      thread: [
        { sender: "teacher", senderName: "Mrs. Lakshmi Devi", time: "17 Sep 2026, 03:30 PM", text: "Dear Ramesh garu, Priya has shown great diligence in her BiPC practicals and maintained 100% record accuracy. Keep encouraging her." },
        { sender: "parent", senderName: "Ramesh Sharma", time: "17 Sep 2026, 05:15 PM", text: "Thank you Mrs. Lakshmi Devi. We will ensure she continues her focus on medical entrance preparations." },
      ],
    },
  ],
  "parent-003": [
    {
      id: "msg-31",
      teacherId: "tea-01",
      teacherName: "Dr. Anitha Rao",
      subject: "Quarterly Mathematics & Physics Progress",
      snippet: "Arjun is performing well in calculus concepts and MPC tutorials.",
      date: "16 Sep 2026, 02:45 PM",
      thread: [
        { sender: "teacher", senderName: "Dr. Anitha Rao", time: "16 Sep 2026, 02:45 PM", text: "Dear Mahesh garu, Arjun has secured good marks in the Mathematics quarterly test. Regular tutorial attendance has helped his confidence." },
        { sender: "parent", senderName: "Mahesh Reddy", time: "16 Sep 2026, 04:30 PM", text: "Thank you madam. I will monitor his practice hours regularly." },
      ],
    },
  ],
};

export const getStoredMessages = (overrideParentId) => {
  const p = getLoggedInParent();
  const pid = overrideParentId || p?.id || "parent-001";
  try {
    const raw = localStorage.getItem(`${PARENT_MESSAGES_KEY}_${pid}`);
    if (raw) return JSON.parse(raw);
    if (pid === "parent-001") {
      const globalRaw = localStorage.getItem(PARENT_MESSAGES_KEY);
      if (globalRaw) {
        const parsed = JSON.parse(globalRaw);
        if (Array.isArray(parsed)) return parsed;
      }
    }
  } catch (e) {
    console.debug("Failed reading messages from storage:", e);
  }
  return initialMessages[pid] || initialMessages["parent-001"] || [];
};

export const saveStoredMessages = (messages, overrideParentId) => {
  const p = getLoggedInParent();
  const pid = overrideParentId || p?.id || "parent-001";
  try {
    localStorage.setItem(`${PARENT_MESSAGES_KEY}_${pid}`, JSON.stringify(messages));
    if (pid === "parent-001") {
      localStorage.setItem(PARENT_MESSAGES_KEY, JSON.stringify(messages));
    }
  } catch (e) {
    console.debug("Failed writing messages to storage:", e);
  }
};

// ==========================================================================
// ANNOUNCEMENTS & EVENTS DATA
// ==========================================================================

export const collegeAnnouncements = [
  {
    id: "ann-01",
    title: "Half-Yearly Examination Timetable & Hall Ticket Release",
    category: "Examinations",
    date: "19 Sep 2026",
    priority: "High",
    summary: "The Half-Yearly examinations for Intermediate 1st & 2nd year students will commence from 05 December 2026. Hall tickets will be issued through student & parent portals from 25 November 2026.",
    author: "Office of the Controller of Examinations",
  },
  {
    id: "ann-02",
    title: "Parent-Teacher Meeting (PTM) Scheduled for 28th October",
    category: "Academic",
    date: "15 Sep 2026",
    priority: "Important",
    summary: "Dear Parents, a Parent-Teacher Meeting is scheduled on Saturday, 28 October 2026 from 10:00 AM to 01:00 PM to discuss your ward's Quarterly assessment results and academic progression.",
    author: "Academic Coordinator",
  },
  {
    id: "ann-03",
    title: "Diwali Vacation Schedule & Campus Guidelines",
    category: "Holidays",
    date: "10 Sep 2026",
    priority: "General",
    summary: "The college will observe Diwali vacations from 29 October 2026 to 03 November 2026. Regular classes will resume on Monday, 04 November 2026. Special tutorial study material will be uploaded to the portal.",
    author: "Principal's Office",
  },
  {
    id: "ann-04",
    title: "Annual Science & Tech Exhibition 'PRAGYAN 2026' Invitation",
    category: "Events",
    date: "02 Sep 2026",
    priority: "General",
    summary: "Students are invited to register innovative working models in Science, Robotics, and Environmental Sustainability for the upcoming inter-college expo. Parents are warmly invited to attend the showcase.",
    author: "Science & Innovation Club",
  },
];

export const upcomingEvents = [
  { id: "ev-01", title: "Parent-Teacher Meeting (PTM)", date: "28 Oct 2026", time: "10:00 AM - 01:00 PM", location: "Main Campus Auditorium", category: "Meeting", status: "Upcoming", rsvpRequired: true },
  { id: "ev-02", title: "National Science & Robotics Expo", date: "14 Nov 2026", time: "09:30 AM - 04:30 PM", location: "Central Science Block", category: "Exhibition", status: "Upcoming", rsvpRequired: false },
  { id: "ev-03", title: "Half-Yearly Theory Examinations", date: "05 Dec 2026", time: "09:30 AM - 12:30 PM", location: "Designated Exam Halls", category: "Examinations", status: "Upcoming", rsvpRequired: false },
  { id: "ev-04", title: "College Annual Sports & Athletic Meet", date: "22 Dec 2026", time: "08:30 AM - 05:00 PM", location: "College Sports Complex", category: "Sports", status: "Scheduled", rsvpRequired: false },
  { id: "ev-05", title: "Annual Cultural Fest 'SPANDANA 2027'", date: "10 Jan 2027", time: "04:00 PM - 09:30 PM", location: "Open Air Amphitheater", category: "Cultural", status: "Scheduled", rsvpRequired: true },
];

// ==========================================================================
// DOCUMENTS DATA
// ==========================================================================

export const studentDocuments = {
  "stu-001": [
    { id: "doc-01", title: "Bonafide Certificate", type: "Bonafide Certificate", issuedDate: "12 Aug 2026", docNo: "CERT-2026-089", status: "Approved", purpose: "Scholarship / Passport Verification", fileUrl: "#" },
    { id: "doc-02", title: "Study & Conduct Certificate", type: "Study Certificate", issuedDate: "10 Jul 2026", docNo: "CERT-2026-042", status: "Approved", purpose: "Bus Pass / Transit Authority", fileUrl: "#" },
    { id: "doc-03", title: "Quarterly Examination Marks Card", type: "Marks Memo", issuedDate: "18 Sep 2026", docNo: "MEMO-2026-Q1", status: "Approved", purpose: "Academic Record", fileUrl: "#" },
    { id: "doc-04", title: "Fee Receipt #REC-2026-0891", type: "Fee Receipt", issuedDate: "10 Jun 2026", docNo: "REC-2026-0891", status: "Paid", purpose: "Tax Exemption / 80C Claim", fileUrl: "#" },
    { id: "doc-05", title: "Fee Receipt #REC-2026-1402", type: "Fee Receipt", issuedDate: "15 Aug 2026", docNo: "REC-2026-1402", status: "Paid", purpose: "Fee Clearance Proof", fileUrl: "#" },
  ],
  "stu-002": [
    { id: "doc-11", title: "Bonafide Certificate", type: "Bonafide Certificate", issuedDate: "14 Aug 2026", docNo: "CERT-2026-095", status: "Approved", purpose: "State Merit Scholarship Application", fileUrl: "#" },
    { id: "doc-12", title: "Quarterly Examination Marks Card", type: "Marks Memo", issuedDate: "18 Sep 2026", docNo: "MEMO-2026-Q2", status: "Approved", purpose: "Academic Record", fileUrl: "#" },
    { id: "doc-13", title: "Full Fee Payment Receipt #REC-2026-0612", type: "Fee Receipt", issuedDate: "04 Jun 2026", docNo: "REC-2026-0612", status: "Paid", purpose: "Full Annual Fee Receipt", fileUrl: "#" },
  ],
  "stu-003": [
    { id: "doc-31", title: "Bonafide Certificate", type: "Bonafide Certificate", issuedDate: "10 Aug 2026", docNo: "CERT-2026-112", status: "Approved", purpose: "Merit Scholarship Verification", fileUrl: "#" },
    { id: "doc-32", title: "Quarterly Examination Marks Card", type: "Marks Memo", issuedDate: "18 Sep 2026", docNo: "MEMO-2026-Q3", status: "Approved", purpose: "Academic Record", fileUrl: "#" },
    { id: "doc-33", title: "Fee Payment Receipt #REC-2026-0711", type: "Fee Receipt", issuedDate: "06 Jun 2026", docNo: "REC-2026-0711", status: "Paid", purpose: "Annual Fee Payment Proof", fileUrl: "#" },
  ],
  "stu-004": [
    { id: "doc-41", title: "Bonafide Certificate", type: "Bonafide Certificate", issuedDate: "18 Aug 2026", docNo: "CERT-2026-144", status: "Approved", purpose: "State Bus Pass Renewal", fileUrl: "#" },
    { id: "doc-42", title: "Quarterly Examination Marks Card", type: "Marks Memo", issuedDate: "18 Sep 2026", docNo: "MEMO-2026-Q4", status: "Approved", purpose: "Academic Record", fileUrl: "#" },
    { id: "doc-43", title: "Fee Installment Receipt #REC-2026-0922", type: "Fee Receipt", issuedDate: "14 Jun 2026", docNo: "REC-2026-0922", status: "Paid", purpose: "Admission Fee Clearance", fileUrl: "#" },
  ],
};

// ==========================================================================
// NOTIFICATIONS DATA
// ==========================================================================

export const initialParentNotifications = [
  { id: "notif-01", studentId: "stu-001", title: "Fee Balance Reminder", category: "Fees", message: "Term 2 tuition balance of ₹17,500 for Rahul Kumar is due on 15 Oct 2026.", time: "2 hours ago", read: false, link: "/parent-dashboard/fees" },
  { id: "notif-02", studentId: "stu-001", title: "Half-Yearly Exam Schedule Released", category: "Examinations", message: "Half-yearly examinations timetable has been published. Exams begin on 05 Dec 2026.", time: "1 day ago", read: false, link: "/parent-dashboard/examinations" },
  { id: "notif-03", studentId: "stu-001", title: "Attendance Report Updated", category: "Attendance", message: "Monthly attendance report for Rahul Kumar (94%) is now available.", time: "4 days ago", read: true, link: "/parent-dashboard/attendance" },
  { id: "notif-04", studentId: "stu-001", title: "Quarterly Marks Memo Available", category: "Academics", message: "Quarterly examination report card for Rahul Kumar is now ready to view and download.", time: "5 days ago", read: true, link: "/parent-dashboard/academics?tab=results" },
  { id: "notif-05", studentId: "stu-001", title: "Parent-Teacher Meeting Notice", category: "General", message: "PTM will be conducted on Saturday, 28 Oct 2026 from 10:00 AM onwards.", time: "6 days ago", read: true, link: "/parent-dashboard/announcements?tab=events" },
  { id: "notif-06", studentId: "stu-002", title: "Fee Clearance Acknowledgment", category: "Fees", message: "Annual tuition fee for Ananya Kumar is fully cleared. Receipt #REC-2026-0612 available.", time: "1 day ago", read: false, link: "/parent-dashboard/fees" },
  { id: "notif-07", studentId: "stu-002", title: "Biology Distinction Award", category: "Academics", message: "Ananya Kumar achieved 100% attendance and Top Score in Biology Practicals.", time: "3 days ago", read: false, link: "/parent-dashboard/academics" },
  { id: "notif-08", studentId: "stu-002", title: "Half-Yearly Exam Schedule Released", category: "Examinations", message: "Half-yearly examinations timetable for BiPC has been published. Exams begin on 05 Dec 2026.", time: "4 days ago", read: true, link: "/parent-dashboard/examinations" },
  { id: "notif-09", studentId: "stu-001-2025", title: "Academic Year 2025-2026 Promotion Record", category: "Academics", message: "Annual examination grade sheet and promotion record for Rahul Kumar (A Grade, SGPA 8.4) archived.", time: "Archived", read: true, link: "/parent-dashboard/academics?tab=results" },
  { id: "notif-10", studentId: "stu-001-2025", title: "Fee Clearance Certificate 2025-2026", category: "Fees", message: "Full annual fees for academic year 2025-2026 was settled in full. Receipt #REC-2025-0182.", time: "Archived", read: true, link: "/parent-dashboard/fees" },
  { id: "notif-11", studentId: "stu-002-2025", title: "Foundation Course Completion", category: "Academics", message: "Ananya Kumar successfully completed Foundation Year with Distinction (SGPA 9.0).", time: "Archived", read: true, link: "/parent-dashboard/academics" },
  { id: "notif-12", studentId: "stu-002-2025", title: "Annual Fee Clearance 2025-2026", category: "Fees", message: "Annual fees cleared for 2025-2026. Receipt #REC-2025-0518 available.", time: "Archived", read: true, link: "/parent-dashboard/fees" },
  { id: "notif-13", studentId: "stu-003", title: "Top Rank in BiPC Announced", category: "Academics", message: "Priya Sharma has secured Rank 1 in Section A with SGPA 9.3.", time: "1 day ago", read: false, link: "/parent-dashboard/academics?tab=results" },
  { id: "notif-14", studentId: "stu-003", title: "Fee Clearance Acknowledgment", category: "Fees", message: "Annual tuition fee for Priya Sharma is fully settled. Receipt #REC-2026-0711 available.", time: "3 days ago", read: true, link: "/parent-dashboard/fees" },
  { id: "notif-15", studentId: "stu-004", title: "Fee Balance Reminder", category: "Fees", message: "Term 2 tuition balance of ₹19,500 for Arjun Reddy is due on 20 Oct 2026.", time: "1 day ago", read: false, link: "/parent-dashboard/fees" },
  { id: "notif-16", studentId: "stu-004", title: "Quarterly Examination Report", category: "Academics", message: "Quarterly exam results for Arjun Reddy (SGPA 8.7) are now ready to view.", time: "4 days ago", read: true, link: "/parent-dashboard/academics?tab=results" },
];

export const getStoredNotifications = () => {
  try {
    const raw = localStorage.getItem(PARENT_NOTIFICATIONS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.debug("Failed reading notifications from storage:", e);
  }
  return initialParentNotifications;
};

export const saveStoredNotifications = (notifs) => {
  try {
    localStorage.setItem(PARENT_NOTIFICATIONS_KEY, JSON.stringify(notifs));
  } catch (e) {
    console.debug("Failed writing notifications to storage:", e);
  }
};

export const getStoredParentProfile = (overrideParentId) => {
  const currentParent = getLoggedInParent();
  const effectiveId = overrideParentId || currentParent?.id || "parent-001";
  const storageKey = `${PARENT_PROFILE_KEY}_${effectiveId}`;
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) return JSON.parse(raw);
    const globalRaw = localStorage.getItem(PARENT_PROFILE_KEY);
    if (globalRaw && effectiveId === "parent-001") return JSON.parse(globalRaw);
  } catch (e) {
    console.debug("Failed reading profile from storage:", e);
  }
  return initialParentProfiles[effectiveId] || initialParentProfile;
};

export const saveStoredParentProfile = (profile, overrideParentId) => {
  const effectiveId = overrideParentId || profile?.id || getLoggedInParent()?.id || "parent-001";
  const storageKey = `${PARENT_PROFILE_KEY}_${effectiveId}`;
  try {
    localStorage.setItem(storageKey, JSON.stringify(profile));
    if (effectiveId === "parent-001") {
      localStorage.setItem(PARENT_PROFILE_KEY, JSON.stringify(profile));
    }
  } catch (e) {
    console.debug("Failed writing profile to storage:", e);
  }
};

export const PARENT_PASSWORDS_KEY = "cms-parent-passwords";

export const getStoredParentPassword = (parentId) => {
  try {
    const raw = localStorage.getItem(PARENT_PASSWORDS_KEY);
    if (raw) {
      const map = JSON.parse(raw);
      return map[parentId] || null;
    }
  } catch (e) {
    console.debug("Failed reading parent password from storage:", e);
  }
  return null;
};

export const saveStoredParentPassword = (parentId, newPassword) => {
  try {
    const raw = localStorage.getItem(PARENT_PASSWORDS_KEY);
    const map = raw ? JSON.parse(raw) : {};
    map[parentId] = newPassword;
    localStorage.setItem(PARENT_PASSWORDS_KEY, JSON.stringify(map));
  } catch (e) {
    console.debug("Failed writing parent password to storage:", e);
  }
};

export const getStoredSettings = (overrideParentId) => {
  const currentParent = getLoggedInParent();
  const effectiveId = overrideParentId || currentParent?.id || "parent-001";
  const storageKey = `${PARENT_SETTINGS_KEY}_${effectiveId}`;
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) return JSON.parse(raw);
    const globalRaw = localStorage.getItem(PARENT_SETTINGS_KEY);
    if (globalRaw && effectiveId === "parent-001") return JSON.parse(globalRaw);
  } catch (e) {
    console.debug("Failed reading settings from storage:", e);
  }
  return initialParentSettings;
};

export const saveStoredSettings = (settings, overrideParentId) => {
  const currentParent = getLoggedInParent();
  const effectiveId = overrideParentId || currentParent?.id || "parent-001";
  const storageKey = `${PARENT_SETTINGS_KEY}_${effectiveId}`;
  try {
    localStorage.setItem(storageKey, JSON.stringify(settings));
    if (effectiveId === "parent-001") {
      localStorage.setItem(PARENT_SETTINGS_KEY, JSON.stringify(settings));
    }
  } catch (e) {
    console.debug("Failed writing settings to storage:", e);
  }
};

export const getStoredDocs = () => {
  try {
    const raw = localStorage.getItem(PARENT_DOCS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.debug("Failed reading documents from storage:", e);
  }
  return studentDocuments;
};

export const saveStoredDocs = (docs) => {
  try {
    localStorage.setItem(PARENT_DOCS_KEY, JSON.stringify(docs));
  } catch (e) {
    console.debug("Failed writing documents to storage:", e);
  }
};


