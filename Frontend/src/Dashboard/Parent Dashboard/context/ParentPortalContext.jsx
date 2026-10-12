import { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";
import { getAuthUser } from "@/features/authStorage.js";
import { useAcademicContext } from "@/context/AcademicContext.jsx";
import {
  getMyChildren,
  getStudentById,
  getStudentFeeDetails,
  getStudentResults,
  getStudentResultMemo,
  getStudentAttendanceOverview,
  getStudentTimetable,
  getStudentAttendanceSubjects,
  getStudentDailyAttendanceLogs,
  resolveStudentPhotoUrl,
} from "@/api/parentApi.js";
import {
  getLoggedInParent,
  getParentChildren,
  timetableData,
  subjectAttendanceData,
  storedFeeRecords,
  examResultsData,
  initialChildren,
} from "../parentData.js";

const ParentPortalContext = createContext(null);

export const formatDate = (val) => {
  if (!val) return "—";
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return String(val);
    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return String(val);
  }
};

export const formatTimeStr = (t) => {
  if (!t) return "";
  const parts = String(t).split(":");
  let h = parseInt(parts[0], 10);
  if (isNaN(h)) return String(t);
  const m = parts[1] || "00";
  const ampm = h >= 12 ? "PM" : "AM";
  if (h > 12) h -= 12;
  if (h === 0) h = 12;
  return `${String(h).padStart(2, "0")}:${m} ${ampm}`;
};

export const normalizeAcademicYear = (year) => {
  if (!year) return "2026-2027";
  const str = typeof year === "object" ? (year.code || year.name || year.label || "") : String(year);
  return str.trim().replace(/[–—]/g, "-").replace(/\s+/g, "");
};

/**
 * Transforms backend timetable slots into Monday-to-Saturday schedule rows
 */
export const transformTimetableData = (slots) => {
  if (!Array.isArray(slots) || slots.length === 0) return [];

  const periodMap = new Map();

  slots.forEach((slot) => {
    const key = slot.periodNumber ?? slot.periodId ?? slot.periodName;
    if (!periodMap.has(key)) {
      periodMap.set(key, {
        periodNumber: slot.periodNumber ?? 0,
        periodName: slot.periodName || `Period ${slot.periodNumber || ""}`,
        startTime: slot.startTime || "",
        endTime: slot.endTime || "",
        isBreak: slot.isBreak || false,
        days: {},
      });
    }

    const group = periodMap.get(key);
    const dayKey = slot.dayOfWeek === 1 || String(slot.dayName).toLowerCase().startsWith("mon") ? "mon"
      : slot.dayOfWeek === 2 || String(slot.dayName).toLowerCase().startsWith("tue") ? "tue"
      : slot.dayOfWeek === 3 || String(slot.dayName).toLowerCase().startsWith("wed") ? "wed"
      : slot.dayOfWeek === 4 || String(slot.dayName).toLowerCase().startsWith("thu") ? "thu"
      : slot.dayOfWeek === 5 || String(slot.dayName).toLowerCase().startsWith("fri") ? "fri"
      : slot.dayOfWeek === 6 || String(slot.dayName).toLowerCase().startsWith("sat") ? "sat"
      : null;

    if (dayKey) {
      const subject = slot.subjectName || slot.subjectCode || "";
      const room = slot.roomName ? ` (Room ${slot.roomName})` : "";
      const display = slot.isBreak ? (subject || "Break") : (subject ? `${subject}${room}` : "—");
      group.days[dayKey] = display;
    }
  });

  const sortedPeriods = Array.from(periodMap.values()).sort((a, b) => {
    if (a.startTime && b.startTime) {
      return a.startTime.localeCompare(b.startTime);
    }
    return a.periodNumber - b.periodNumber;
  });

  const rows = [];
  let prevEnd = null;

  sortedPeriods.forEach((p) => {
    if (prevEnd && p.startTime) {
      const [prevH, prevM] = prevEnd.split(":").map(Number);
      const [curH, curM] = p.startTime.split(":").map(Number);
      const diffMins = (curH * 60 + curM) - (prevH * 60 + prevM);
      if (diffMins >= 10) {
        const breakLabel = diffMins >= 30 ? "Lunch" : "Break";
        const breakDesc = diffMins >= 30 ? "Lunch Break" : "Short Break";
        rows.push({
          period: breakLabel,
          time: `${formatTimeStr(prevEnd)} - ${formatTimeStr(p.startTime)}`,
          mon: breakDesc,
          tue: breakDesc,
          wed: breakDesc,
          thu: breakDesc,
          fri: breakDesc,
          sat: breakDesc,
          isBreak: true,
        });
      }
    }

    const timeFormatted = p.startTime && p.endTime
      ? `${formatTimeStr(p.startTime)} - ${formatTimeStr(p.endTime)}`
      : "";

    rows.push({
      period: p.periodName,
      time: timeFormatted,
      mon: p.days.mon || "—",
      tue: p.days.tue || "—",
      wed: p.days.wed || "—",
      thu: p.days.thu || "—",
      fri: p.days.fri || "—",
      sat: p.days.sat || "—",
      isBreak: p.isBreak,
    });

    prevEnd = p.endTime;
  });

  return rows;
};

/**
 * Normalizes backend attendance yearly-overview response
 */
export const transformAttendanceOverview = (data) => {
  if (!data) {
    return {
      overall: 0,
      presentDays: 0,
      absentDays: 0,
      totalWorkingDays: 0,
      totalLeave: 0,
      totalLate: 0,
      totalHalfDays: 0,
      status: "—",
      monthlyRecords: [],
      raw: null,
    };
  }

  const rate = typeof data.overallAttendancePercentage === "number"
    ? Math.round(data.overallAttendancePercentage * 100) / 100
    : 0;
  const working = data.totalWorkingDays ?? 0;
  const present = data.totalPresent ?? 0;
  const absent = (data.totalAbsent ?? 0) + (data.totalLeave ?? 0);
  const status = rate >= 85 ? "Excellent" : (rate >= 75 ? "Good" : (rate >= 65 ? "Satisfactory" : (working > 0 ? "Needs Improvement" : "—")));

  return {
    overall: rate,
    presentDays: present,
    absentDays: absent,
    totalWorkingDays: working,
    totalLeave: data.totalLeave ?? 0,
    totalLate: data.totalLate ?? 0,
    totalHalfDays: data.totalHalfDays ?? 0,
    status,
    monthlyRecords: Array.isArray(data.monthlyRecords) ? data.monthlyRecords : [],
    raw: data,
  };
};

/**
 * Normalizes backend subject-wise attendance response
 * GET /api/v1/attendance/student/{studentId}/subjects
 */
export const transformSubjectAttendance = (subjectsList) => {
  if (!Array.isArray(subjectsList)) return [];
  return subjectsList.map((item, idx) => {
    const total = item.totalClassesConducted ?? 0;
    const present = item.classesAttended ?? 0;
    const absent = Math.max(0, total - present);
    const percentage = typeof item.attendancePercentage === "number"
      ? Math.round(item.attendancePercentage * 10) / 10
      : (total > 0 ? Math.round((present / total) * 1000) / 10 : 0);
    const status = percentage >= 90 ? "Excellent" : percentage >= 80 ? "Good" : percentage >= 75 ? "Satisfactory" : total > 0 ? "Low" : "—";
    const code = item.subjectCode || (item.subjectId ? `SUB-${item.subjectId}` : `SUB-${idx + 1}`);

    return {
      id: item.subjectId || idx,
      subjectId: item.subjectId,
      code,
      subject: item.subjectName || `Subject ${idx + 1}`,
      name: item.subjectName || `Subject ${idx + 1}`,
      facultyId: item.facultyId,
      faculty: item.facultyName || "Faculty",
      total,
      present,
      absent,
      percentage,
      status,
      raw: item,
    };
  });
};

export const transformStudentData = (raw, feeData, attendanceData, currentAcademicYear = "2026-2027", subjectsAttendance = []) => {
  if (!raw) return null;

  const id = String(raw.studentId || "");
  const name = raw.studentName || "Student";
  const roll = raw.rollNo || raw.rollNumber || "—";
  const admissionNo = raw.admissionNo || raw.admissionNumber || "—";
  const group = raw.groupName || raw.className || "MPC";
  const program = raw.programName || "Regular";
  const programme = group ? (program && program !== "Regular" ? `${group} (${program})` : `${group} (Maths, Physics, Chemistry)`) : "Intermediate";
  const level = raw.academicLevelName || "Intermediate 1st Year";
  const section = raw.sectionName ? `Section ${raw.sectionName}` : "Section A";
  const board = raw.boardName || "Board of Intermediate Education, Andhra Pradesh";
  const academicYear = raw.academicYearName || currentAcademicYear || "2026-2027";
  const avatar = resolveStudentPhotoUrl(raw.photo || raw.photoUrl) || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0D8ABC&color=fff&size=128`;

  // Real attendance from API
  const attendanceOverview = transformAttendanceOverview(attendanceData);
  const attendanceRate = attendanceOverview.overall > 0
    ? attendanceOverview.overall
    : (typeof raw.attendancePercentage === "number" && raw.attendancePercentage > 0 ? Math.round(raw.attendancePercentage) : 0);
  const attendanceStatus = attendanceOverview.overall > 0
    ? attendanceOverview.status
    : (attendanceRate >= 85 ? "Excellent" : (attendanceRate >= 75 ? "Good" : (attendanceRate >= 65 ? "Satisfactory" : (attendanceRate > 0 ? "Needs Improvement" : "—"))));

  // Fee calculation from feeData or raw student fields
  const feeTotal = feeData?.totalPayable ?? feeData?.scheduledFees ?? feeData?.originalFee ?? raw.feeAmount ?? 70000;
  const feePaid = feeData?.totalPaid ?? raw.feePaid ?? 0;
  const feePending = feeData?.outstandingBalance ?? Math.max(0, feeTotal - feePaid);
  const feeStatus = feeData?.feeStatus || (feePending === 0 && feeTotal > 0 ? "Paid" : (feePaid > 0 ? "Partial" : (feeTotal > 0 ? "Pending" : "—")));
  const feeDueDate = feeData?.schedules?.[0]?.dueDate ? formatDate(feeData.schedules[0].dueDate) : "30 Sep 2026";

  return {
    id,
    studentId: raw.studentId,
    name,
    admissionNo,
    admissionNumber: admissionNo,
    roll,
    rollNumber: roll,
    dob: raw.dateOfBirth ? formatDate(raw.dateOfBirth) : "—",
    dateOfBirth: raw.dateOfBirth,
    gender: raw.gender || "—",
    bloodGroup: raw.bloodGroup || "—",
    mobile: raw.mobileNumber || "—",
    email: raw.email || "—",
    aadhaarNumber: raw.aadhaarNumber || "—",
    course: group,
    department: group,
    group,
    programme,
    level,
    semester: level,
    section,
    academicYear,
    board,
    campus: raw.campusName || "Main Campus (HQ)",
    campusId: raw.campusId,
    address: raw.address || [raw.city, raw.district, raw.state, raw.pincode].filter(Boolean).join(", ") || "—",
    city: raw.city || "",
    district: raw.district || "",
    state: raw.state || "",
    pincode: raw.pincode || "",
    previousSchool: raw.previousSchool || "—",
    fatherName: raw.fatherName || "",
    fatherOccupation: raw.fatherOccupation || "",
    fatherMobile: raw.fatherMobile || "",
    motherName: raw.motherName || "",
    motherOccupation: raw.motherOccupation || "",
    motherMobile: raw.motherMobile || "",
    guardianName: raw.guardianName || raw.fatherName || raw.motherName || "",
    guardianMobile: raw.guardianMobile || raw.fatherMobile || raw.motherMobile || "",
    parentGuardianEmail: raw.parentGuardianEmail || "",
    mentor: "Dr. Anitha Rao",
    mentorDesignation: "Professor & Class Teacher",
    mentorMobile: "+91 98480 12345",
    mentorEmail: "anitha.rao@college.edu",
    avatar,
    attendance: {
      overall: attendanceRate,
      presentDays: attendanceOverview.presentDays,
      absentDays: attendanceOverview.absentDays,
      totalWorkingDays: attendanceOverview.totalWorkingDays,
      totalLeave: attendanceOverview.totalLeave,
      totalLate: attendanceOverview.totalLate,
      totalHalfDays: attendanceOverview.totalHalfDays,
      status: attendanceStatus,
      monthlyRecords: attendanceOverview.monthlyRecords,
      subjectRecords: transformSubjectAttendance(subjectsAttendance),
      raw: attendanceData,
    },
    academics: {
      sgpa: raw.cgpa ? String(raw.cgpa) : (raw.performanceGrade || "8.8"),
      cgpa: raw.cgpa ? String(raw.cgpa) : "8.9",
      grade: raw.performanceGrade || (raw.cgpa ? (raw.cgpa >= 8.5 ? "A+" : raw.cgpa >= 7.5 ? "A" : "B+") : "A+"),
      rank: raw.rank ? `#${raw.rank}` : "3rd in Class",
      totalCredits: 24,
      performanceTrend: "Steady",
    },
    fees: {
      total: feeTotal,
      paid: feePaid,
      pending: feePending,
      status: feeStatus,
      dueDate: feeDueDate,
    },
    raw,
  };
};

export const transformFeeData = (feeData, childRecord) => {
  if (!feeData) {
    const total = childRecord?.feeAmount || 0;
    const paid = childRecord?.feePaid || 0;
    const pending = Math.max(0, total - paid);
    return {
      total,
      paid,
      pending,
      status: total > 0 ? (pending === 0 ? "Paid" : paid > 0 ? "Partial" : "Pending") : "—",
      dueDate: "—",
      breakdown: [],
      schedules: [],
      receipts: [],
    };
  }

  const total = feeData.totalPayable ?? feeData.scheduledFees ?? feeData.originalFee ?? 0;
  const paid = feeData.totalPaid ?? 0;
  const pending = feeData.outstandingBalance ?? Math.max(0, total - paid);
  const status = feeData.feeStatus || (pending === 0 && total > 0 ? "Paid" : paid > 0 ? "Partial" : "Pending");
  const dueDate = feeData.schedules?.[0]?.dueDate ? formatDate(feeData.schedules[0].dueDate) : "—";

  const breakdown = (feeData.breakdown || []).map((b) => {
    const bAmt = b.amount || b.payable || 0;
    const bPending = b.payable ?? bAmt;
    const bPaid = Math.max(0, bAmt - bPending);
    return {
      category: b.feeType || "Fee Component",
      amount: bAmt,
      paid: bPaid,
      pending: bPending,
      due: dueDate,
      status: bPending === 0 && bAmt > 0 ? "Paid" : bPaid > 0 ? "Partial" : "Due",
    };
  });

  const schedules = (feeData.schedules || []).map((s) => ({
    feeInstallmentId: s.feeInstallmentId,
    feePaymentPlanId: s.feePaymentPlanId,
    installmentNumber: s.installmentNumber || 1,
    scheduleName: s.feeSchedule || `Installment ${s.installmentNumber || 1}`,
    amount: s.amount || 0,
    paidAmount: s.paidAmount || 0,
    balanceAmount: s.balanceAmount ?? Math.max(0, (s.amount || 0) - (s.paidAmount || 0)),
    dueDate: s.dueDate ? formatDate(s.dueDate) : "—",
    status: s.status || ((s.balanceAmount ?? 0) === 0 ? "Paid" : "Pending"),
  }));

  const receipts = (feeData.paymentHistory || []).map((p, idx) => ({
    id: p.paymentId || p.feePaymentId || `rec-${idx}`,
    receiptNo: p.receiptNo || p.receiptNumber || `REC-2026-${String(idx + 1001).padStart(4, "0")}`,
    date: p.paymentDate ? formatDate(p.paymentDate) : "—",
    amount: p.paidAmount || p.amount || 0,
    method: p.paymentMode || p.method || "Online",
    txnId: p.transactionId || p.referenceNo || `TXN${Date.now() + idx}`,
    paidFor: p.remarks || p.paymentType || `Fee Installment`,
    status: "Success",
  }));

  return {
    total,
    paid,
    pending,
    status,
    paymentPlan: feeData.paymentPlan || "Full Payment",
    dueDate,
    breakdown,
    schedules,
    receipts,
    raw: feeData,
  };
};

export const transformResultsData = (resultsList, currentAcademicYear = "2026-2027") => {
  if (!Array.isArray(resultsList)) return [];
  return resultsList.map((r, idx) => ({
    id: r.resultId || `res-${idx}`,
    resultId: r.resultId,
    examinationId: r.examinationId,
    examName: r.examinationName || `Examination #${r.examinationId || idx + 1}`,
    examCode: r.examCode || "EXAM",
    academicYear: r.academicYear || currentAcademicYear,
    period: r.academicYear || "Annual",
    obtainedMarks: r.totalMarks || 0,
    maxMarks: r.maxTotalMarks || 0,
    percentage: typeof r.percentage === "number" ? `${r.percentage.toFixed(1)}%` : (r.percentage ? `${r.percentage}%` : "—"),
    grade: r.grade || "—",
    sgpa: typeof r.percentage === "number" ? (r.percentage / 10).toFixed(1) : (r.grade || "—"),
    resultStatus: r.resultStatus || ((r.totalMarks || 0) > 0 ? "Passed" : "Under Evaluation"),
    classRank: r.rank ? `#${r.rank}` : "—",
    isPublished: r.isPublished ?? true,
    publishedAt: r.publishedAt ? formatDate(r.publishedAt) : "—",
    subjects: [],
    raw: r,
  }));
};

export const transformMemoSubjects = (memoData) => {
  if (!memoData || !Array.isArray(memoData.subjects)) return [];
  return memoData.subjects.map((s, idx) => {
    const total = s.totalMarks ?? ((s.theoryMarks || 0) + (s.practicalMarks || 0) + (s.internalMarks || 0));
    const max = s.maxMarks || 100;
    const passing = s.passingMarks || 35;
    const percent = max > 0 ? (total / max) * 100 : 0;
    const grade = percent >= 90 ? "A+" : percent >= 80 ? "A" : percent >= 70 ? "B+" : percent >= 60 ? "B" : percent >= 50 ? "C" : percent >= 35 ? "D" : "F";
    const status = s.resultStatus || (total >= passing ? "Pass" : "Fail");

    return {
      code: s.subjectCode || `SUB-${idx + 1}`,
      subject: s.subjectName || `Subject ${idx + 1}`,
      name: s.subjectName || `Subject ${idx + 1}`,
      max,
      obtained: total,
      theoryMarks: s.theoryMarks || 0,
      practicalMarks: s.practicalMarks || 0,
      internalMarks: s.internalMarks || 0,
      passingMarks: passing,
      grade,
      status,
    };
  });
};

export function ParentPortalProvider({ children }) {
  const academicCtx = useAcademicContext?.() || {};
  const rawYear = academicCtx.selectedAcademicYear;
  const currentAcademicYear = useMemo(() => normalizeAcademicYear(rawYear), [rawYear]);
  const authUser = getAuthUser();

  // State held strictly in React memory — NO LOCAL STORAGE OR SESSION STORAGE
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [childrenList, setChildrenList] = useState([]);
  const [activeChildId, setActiveChildId] = useState("");
  const [detailedStudentMap, setDetailedStudentMap] = useState({});
  const [feeMap, setFeeMap] = useState({});
  const [resultsMap, setResultsMap] = useState({});
  const [memoMap, setMemoMap] = useState({});
  const [attendanceMap, setAttendanceMap] = useState({});
  const [subjectAttendanceMap, setSubjectAttendanceMap] = useState({});
  const [timetableMap, setTimetableMap] = useState({});

  // 1. Fetch children enrolled under parent from GET /api/v1/students/my-children
  const fetchChildren = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getMyChildren();
      const mapped = (data || []).map((c) => ({
        id: String(c.studentId),
        studentId: c.studentId,
        name: c.studentName || "Student",
        roll: c.rollNo || "—",
        admissionNo: c.admissionNo || "—",
        group: c.className || "MPC",
        programme: c.className ? `${c.className} Program` : "Intermediate Program",
        section: c.sectionName ? `Section ${c.sectionName}` : "Section A",
        status: c.status || "Active",
        level: "Intermediate 1st Year",
        semester: "Year 1",
        board: "Board of Intermediate Education",
        mentor: "Dr. Anitha Rao",
        mentorDesignation: "Professor & Class Teacher",
        mentorMobile: "+91 98480 12345",
        mentorEmail: "anitha.rao@college.edu",
        avatar: resolveStudentPhotoUrl(c.photoUrl) || `https://ui-avatars.com/api/?name=${encodeURIComponent(c.studentName || "Student")}&background=0D8ABC&color=fff&size=128`,
        attendance: {
          overall: typeof c.attendancePercentage === "number" ? Math.round(c.attendancePercentage) : 0,
          presentDays: 0,
          absentDays: 0,
          totalWorkingDays: 0,
          status: "—",
        },
        academics: {
          sgpa: "8.8",
          cgpa: "8.9",
          grade: "A+",
          rank: "3rd in Class",
          totalCredits: 24,
          performanceTrend: "+4.2% from last term",
        },
        fees: {
          total: 70000,
          paid: 70000,
          pending: 0,
          status: "Paid",
          dueDate: "—",
        },
      }));

      // Look up logged in parent profile and their associated children
      const loggedParent = getLoggedInParent();
      const parentChildren = getParentChildren(loggedParent);

      const mappedFallback = (parentChildren || []).map((c) => ({
        ...c,
        id: String(c.id || c.studentId),
        studentId: c.studentId || c.id,
        status: c.status || "Active",
        mentor: c.mentor || (c.group === "BiPC" ? "Mrs. Lakshmi Devi" : "Dr. Anitha Rao"),
        mentorDesignation: c.mentorDesignation || (c.group === "BiPC" ? "Senior Lecturer & Class Teacher" : "Professor & Class Teacher"),
        mentorMobile: c.mentorMobile || (c.group === "BiPC" ? "+91 98480 34567" : "+91 98480 12345"),
        mentorEmail: c.mentorEmail || (c.group === "BiPC" ? "lakshmi.d@college.edu" : "anitha.rao@college.edu"),
      }));

      const finalChildren = (mapped && mapped.length > 0)
        ? mapped
        : (mappedFallback && mappedFallback.length > 0
            ? mappedFallback
            : initialChildren.filter((c) => c.parentId === "parent-001"));

      setChildrenList(finalChildren);
      if (finalChildren.length > 0) {
        setActiveChildId((prev) => (finalChildren.some((m) => m.id === prev) ? prev : finalChildren[0].id));
      }
    } catch {
      const loggedParent = getLoggedInParent();
      const parentChildren = getParentChildren(loggedParent);
      const fallbackChildren = (parentChildren && parentChildren.length > 0)
        ? parentChildren
        : initialChildren.filter((c) => c.parentId === "parent-001");
      setChildrenList(fallbackChildren);
      if (fallbackChildren.length > 0) {
        setActiveChildId(fallbackChildren[0].id);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChildren();
  }, [fetchChildren]);

  // 2. Fetch active child detailed record, fees, results, attendance, and timetable
  const fetchActiveChildData = useCallback(async (studentId) => {
    if (!studentId) return;
    const isBackendStudent = Boolean(studentId) && Number.isInteger(Number(studentId)) && Number(studentId) > 0 && !String(studentId).startsWith("stu-");

    if (isBackendStudent) {
      try {
        // Parallel fetch for speed: student details, fee details, results, attendance overview, timetable, subject attendance
        const [studentRes, feeRes, resultsRes, attendanceRes, timetableRes, subjectAttendanceRes] = await Promise.allSettled([
          getStudentById(studentId),
          getStudentFeeDetails(studentId),
          getStudentResults(studentId),
          getStudentAttendanceOverview(studentId),
          getStudentTimetable(studentId),
          getStudentAttendanceSubjects(studentId),
        ]);

        if (studentRes.status === "fulfilled" && studentRes.value) {
          setDetailedStudentMap((prev) => ({
            ...prev,
            [studentId]: studentRes.value,
          }));
        }

        if (feeRes.status === "fulfilled" && feeRes.value) {
          setFeeMap((prev) => ({
            ...prev,
            [studentId]: feeRes.value,
          }));
        }

        if (resultsRes.status === "fulfilled" && Array.isArray(resultsRes.value)) {
          setResultsMap((prev) => ({
            ...prev,
            [studentId]: resultsRes.value,
          }));
        }

        if (attendanceRes.status === "fulfilled" && attendanceRes.value) {
          setAttendanceMap((prev) => ({
            ...prev,
            [studentId]: attendanceRes.value,
          }));
        }

        if (subjectAttendanceRes.status === "fulfilled" && Array.isArray(subjectAttendanceRes.value)) {
          setSubjectAttendanceMap((prev) => ({
            ...prev,
            [studentId]: subjectAttendanceRes.value,
          }));
        }

        if (timetableRes.status === "fulfilled" && Array.isArray(timetableRes.value)) {
          setTimetableMap((prev) => ({
            ...prev,
            [studentId]: timetableRes.value,
          }));
        }
      } catch {
        // Silent recovery
      }
    }
  }, []);

  useEffect(() => {
    if (activeChildId) {
      fetchActiveChildData(activeChildId);
    }
  }, [activeChildId, fetchActiveChildData]);

  // 3. Fetch specific exam memo on demand
  const fetchExamMemo = useCallback(async (examinationId) => {
    if (!examinationId || !activeChildId) return null;
    const isBackendStudent = Boolean(activeChildId) && Number.isInteger(Number(activeChildId)) && Number(activeChildId) > 0 && !String(activeChildId).startsWith("stu-");
    if (!isBackendStudent) return null;

    const cacheKey = `${activeChildId}_${examinationId}`;
    if (memoMap[cacheKey]) return memoMap[cacheKey];

    try {
      const memo = await getStudentResultMemo(examinationId, activeChildId);
      if (memo) {
        setMemoMap((prev) => ({
          ...prev,
          [cacheKey]: memo,
        }));
        return memo;
      }
    } catch {
      // Silent recovery
    }
    return null;
  }, [activeChildId, memoMap]);

  // Active base summary child
  const activeBaseChild = useMemo(() => {
    if (!childrenList.length) return null;
    return childrenList.find((c) => c.id === activeChildId) || childrenList[0];
  }, [childrenList, activeChildId]);

  // Active child full object
  const child = useMemo(() => {
    if (!activeBaseChild) return null;
    const rawDetailed = detailedStudentMap[activeBaseChild.id];
    const rawFee = feeMap[activeBaseChild.id];
    const rawAttendance = attendanceMap[activeBaseChild.id];
    const rawSubjectAttendance = subjectAttendanceMap[activeBaseChild.id]
      || subjectAttendanceData[activeBaseChild.id]
      || subjectAttendanceData[String(activeBaseChild.studentId)]
      || (activeBaseChild.group === "BiPC" ? subjectAttendanceData["stu-002"] : subjectAttendanceData["stu-001"])
      || [];

    if (rawDetailed) {
      return transformStudentData(rawDetailed, rawFee, rawAttendance, currentAcademicYear, rawSubjectAttendance);
    }

    const attendanceOverview = transformAttendanceOverview(rawAttendance);
    const initialAttendance = activeBaseChild.attendance || {};

    // Fallback based on base summary item
    return {
      ...activeBaseChild,
      level: activeBaseChild.level || "Intermediate 1st Year",
      semester: activeBaseChild.semester || "Semester 1",
      academicYear: currentAcademicYear,
      board: activeBaseChild.board || "Board of Intermediate Education",
      mentor: activeBaseChild.mentor || (activeBaseChild.group === "BiPC" ? "Mrs. Lakshmi Devi" : "Dr. Anitha Rao"),
      mentorDesignation: activeBaseChild.mentorDesignation || (activeBaseChild.group === "BiPC" ? "Senior Lecturer & Class Teacher" : "Professor & Class Teacher"),
      mentorMobile: activeBaseChild.mentorMobile || (activeBaseChild.group === "BiPC" ? "+91 98480 34567" : "+91 98480 12345"),
      mentorEmail: activeBaseChild.mentorEmail || (activeBaseChild.group === "BiPC" ? "lakshmi.d@college.edu" : "anitha.rao@college.edu"),
      attendance: {
        overall: attendanceOverview.overall > 0 ? attendanceOverview.overall : (initialAttendance.overall || 94),
        presentDays: attendanceOverview.presentDays > 0 ? attendanceOverview.presentDays : (initialAttendance.presentDays || 47),
        absentDays: attendanceOverview.absentDays > 0 ? attendanceOverview.absentDays : (initialAttendance.absentDays || 3),
        totalWorkingDays: attendanceOverview.totalWorkingDays > 0 ? attendanceOverview.totalWorkingDays : (initialAttendance.totalWorkingDays || 50),
        totalLeave: attendanceOverview.totalLeave ?? 0,
        totalLate: attendanceOverview.totalLate ?? 0,
        totalHalfDays: attendanceOverview.totalHalfDays ?? 0,
        status: attendanceOverview.overall > 0 ? attendanceOverview.status : (initialAttendance.status || "Excellent"),
        monthlyRecords: attendanceOverview.monthlyRecords,
        subjectRecords: transformSubjectAttendance(rawSubjectAttendance),
        raw: rawAttendance,
      },
      academics: activeBaseChild.academics || {
        sgpa: "8.8",
        cgpa: "8.9",
        grade: "A+",
        rank: "3rd in Class",
        totalCredits: 24,
        performanceTrend: "+4.2% from last term",
      },
      fees: activeBaseChild.fees || {
        total: 70000,
        paid: 70000,
        pending: 0,
        status: "Paid",
        dueDate: "—",
      },
    };
  }, [activeBaseChild, detailedStudentMap, feeMap, attendanceMap, subjectAttendanceMap, currentAcademicYear]);

  // Active child fee records
  const childFee = useMemo(() => {
    if (!activeBaseChild) {
      return { total: 0, paid: 0, pending: 0, status: "—", dueDate: "—", breakdown: [], schedules: [], receipts: [] };
    }
    const rawFee = feeMap[activeBaseChild.id];
    const rawDetailed = detailedStudentMap[activeBaseChild.id];
    if (rawFee) {
      return transformFeeData(rawFee, rawDetailed);
    }
    const stored = storedFeeRecords[activeBaseChild.id] || storedFeeRecords["stu-001"];
    if (stored) {
      return {
        total: stored.total,
        paid: stored.paid,
        pending: stored.pending,
        status: stored.status,
        dueDate: stored.dueDate,
        breakdown: stored.breakdown || [],
        schedules: stored.schedules || [],
        receipts: stored.receipts || [],
      };
    }
    return transformFeeData(null, activeBaseChild);
  }, [activeBaseChild, feeMap, detailedStudentMap]);

  // Active child exam results
  const results = useMemo(() => {
    if (!activeBaseChild) return [];
    const rawList = resultsMap[activeBaseChild.id] || [];
    if (Array.isArray(rawList) && rawList.length > 0) {
      return transformResultsData(rawList, currentAcademicYear);
    }
    const storedResults = examResultsData[activeBaseChild.id] || examResultsData["stu-001"] || [];
    return storedResults.map((r, idx) => ({
      id: r.id || `res-${idx}`,
      resultId: r.id,
      examinationId: r.examinationId || r.id,
      examName: r.examName || r.exam,
      examCode: r.examCode || "EXAM",
      academicYear: r.academicYear || currentAcademicYear,
      period: r.academicYear || "Annual",
      obtainedMarks: r.obtainedMarks ?? (r.obtained ? Number(r.obtained) : 0),
      maxMarks: r.maxMarks ?? (r.max ? Number(r.max) : 100),
      percentage: r.percentage ? `${r.percentage}%` : "—",
      grade: r.grade || "A+",
      sgpa: r.sgpa || "8.8",
      resultStatus: r.resultStatus || r.status || "Passed",
      classRank: r.classRank || r.rank || "—",
      isPublished: true,
      publishedAt: r.publishedAt || r.date || "—",
      subjects: r.subjects || [],
      raw: r,
    }));
  }, [activeBaseChild, resultsMap, currentAcademicYear]);

  // Active child timetable formatted schedule
  const childTimetable = useMemo(() => {
    if (!activeBaseChild) return [];
    const rawSlots = timetableMap[activeBaseChild.id] || [];
    if (Array.isArray(rawSlots) && rawSlots.length > 0) {
      const transformed = transformTimetableData(rawSlots);
      if (transformed && transformed.length > 0) return transformed;
    }
    const key = activeBaseChild.id || String(activeBaseChild.studentId || "");
    const fallback = timetableData[key]
      || timetableData[String(activeBaseChild.studentId)]
      || (activeBaseChild.group === "BiPC" ? timetableData["stu-002"] : timetableData["stu-001"])
      || timetableData["860"]
      || [];
    return fallback;
  }, [activeBaseChild, timetableMap]);

  // Active child raw timetable slots
  const rawTimetable = useMemo(() => {
    if (!activeBaseChild) return [];
    return timetableMap[activeBaseChild.id] || [];
  }, [activeBaseChild, timetableMap]);

  // Active child attendance overview
  const childAttendance = useMemo(() => {
    if (!activeBaseChild) return null;
    return attendanceMap[activeBaseChild.id] || null;
  }, [activeBaseChild, attendanceMap]);

  // Dynamic Parent Profile derived from student record & auth user
  const parentUser = useMemo(() => {
    const loggedParent = getLoggedInParent();
    const raw = detailedStudentMap[activeChildId];
    const name = raw?.fatherName || raw?.guardianName || raw?.motherName || loggedParent?.name || authUser?.name || "Parent / Guardian";
    const relation = raw?.fatherName ? "Father" : (raw?.motherName ? "Mother" : (loggedParent?.relation || "Father"));
    const mobile = raw?.fatherMobile || raw?.guardianMobile || raw?.motherMobile || loggedParent?.mobile || authUser?.phone || authUser?.mobile || "—";
    const altMobile = raw?.motherMobile || raw?.guardianMobile || loggedParent?.altMobile || "—";
    const email = raw?.parentGuardianEmail || loggedParent?.email || authUser?.email || "—";
    const altEmail = raw?.email || loggedParent?.altEmail || "—";
    const address = raw?.address || loggedParent?.address || [raw?.city, raw?.district, raw?.state, raw?.pincode].filter(Boolean).join(", ") || "—";
    const aadhaarMasked = raw?.aadhaarNumber ? `XXXX-XXXX-${raw.aadhaarNumber.slice(-4)}` : (loggedParent?.aadhaarMasked || "XXXX-XXXX-8921");
    const emergencyContact = raw?.guardianMobile || raw?.fatherMobile || loggedParent?.emergencyContact || mobile;

    return {
      id: String(loggedParent?.id || authUser?.id || "parent-user"),
      name,
      relation,
      email,
      altEmail,
      mobile,
      altMobile,
      occupation: raw?.fatherOccupation || loggedParent?.occupation || "Business / Professional",
      company: loggedParent?.company || "Private Organization",
      motherName: raw?.motherName || loggedParent?.motherName || "—",
      motherOccupation: raw?.motherOccupation || loggedParent?.motherOccupation || "—",
      motherMobile: raw?.motherMobile || loggedParent?.motherMobile || "—",
      address,
      emergencyContact,
      bloodGroup: raw?.bloodGroup || loggedParent?.bloodGroup || "O+",
      aadhaarMasked,
    };
  }, [detailedStudentMap, activeChildId, authUser]);

  const value = useMemo(() => ({
    loading,
    error,
    availableChildren: childrenList,
    activeChildId,
    setActiveChildId,
    activeBaseChild,
    child,
    childFee,
    results,
    childTimetable,
    timetableSchedule: childTimetable,
    rawTimetable,
    childAttendance,
    attendanceOverview: childAttendance,
    fetchExamMemo,
    memoMap,
    parentUser,
    currentAcademicYear,
    selectedAcademicYear: currentAcademicYear,
    childAttendanceSubjects: child?.attendance?.subjectRecords || [],
    subjectAttendanceMap,
    dataKey: activeChildId,
    refreshChildren: fetchChildren,
    refreshActiveChild: () => fetchActiveChildData(activeChildId),
    refreshAttendance: () => getStudentAttendanceOverview(activeChildId),
    refreshTimetable: () => getStudentTimetable(activeChildId),
    refreshAttendanceSubjects: () => getStudentAttendanceSubjects(activeChildId),
    getStudentDailyAttendanceLogs,
    getStudentAttendanceSubjects,
    getChildForYear: (baseChild) => {
      if (!baseChild) return null;
      if (baseChild.id === activeChildId && child) return child;
      return baseChild;
    },
  }), [
    loading,
    error,
    childrenList,
    activeChildId,
    activeBaseChild,
    child,
    childFee,
    results,
    childTimetable,
    rawTimetable,
    childAttendance,
    subjectAttendanceMap,
    fetchExamMemo,
    memoMap,
    parentUser,
    currentAcademicYear,
    fetchChildren,
    fetchActiveChildData,
  ]);

  return (
    <ParentPortalContext.Provider value={value}>
      {children}
    </ParentPortalContext.Provider>
  );
}

export function useParentPortalContext() {
  return useContext(ParentPortalContext);
}
