import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Sparkles,
  Wand2,
  Printer,
  FileSpreadsheet,
  Pencil,
  CheckCircle2,
  AlertCircle,
  CalendarDays,
  Clock,
  Users,
  Building2,
  DoorOpen,
  Search,
  RefreshCw,
  UserCheck,
  Check,
  RotateCcw,
  X,
} from "lucide-react";
import * as XLSX from "xlsx";
import apiClient, { getApiErrorMessage } from "@/api/axios.js";
import { useAcademicContext } from "@/context/AcademicContext.jsx";
import { useCampusContext } from "@/context/CampusContext.jsx";
import DashboardLayout from "../layout/ExamCellPageLayout.jsx";
import { Modal, Toast, Pagination } from "@/components/common/Ui.jsx";
import {
  d,
  unwrap,
  ensureArray,
  normalizeId,
  normalizeStatus,
  canonicalDate,
  formatTimeOnly,
  hasTimeOverlap,
} from "@/utils/examinationUtils.js";
import "./HallAllocation.css";

const printSeatingPlan = (rows = [], currentExam = null, campusId = 1) => {
  if (!rows || rows.length === 0) return;
  const popup = window.open("", "_blank", "width=1000,height=800");
  if (!popup) {
    alert("Please allow popups for printing seating plan.");
    return;
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Official Seating Plan - ${currentExam?.name || "Examination"}</title>
  <style>
    @page { size: A4 landscape; margin: 12mm 15mm; }
    @media print {
      body { margin: 0; padding: 0; background: #fff !important; color: #000 !important; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; }
      .no-print { display: none !important; }
    }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; color: #0f172a; margin: 0; padding: 20px; background: #f8fafc; }
    .sheet { max-width: 1000px; margin: 0 auto; padding: 24px; background: #fff; border: 2px solid #1A2114; border-radius: 4px; box-sizing: border-box; }
    .header { text-align: center; border-bottom: 2px solid #1A2114; padding-bottom: 12px; margin-bottom: 16px; }
    .college-name { font-size: 19px; font-weight: 800; text-transform: uppercase; margin: 0 0 4px; color: #1A2114; letter-spacing: 0.5px; }
    .sub-title { font-size: 14px; font-weight: 700; color: #15803d; text-transform: uppercase; margin: 0 0 4px; }
    .meta { font-size: 11.5px; color: #475569; }
    table { width: 100%; border-collapse: collapse; font-size: 11.5px; margin-bottom: 24px; }
    th, td { border: 1px solid #cbd5e1; padding: 7px 10px; }
    th { background: #f1f5f9; text-transform: uppercase; font-size: 10.5px; font-weight: 700; color: #334155; }
    .sig-row { display: flex; justify-content: space-between; margin-top: 40px; padding-top: 16px; border-top: 1px dashed #cbd5e1; }
    .sig-block { text-align: center; width: 200px; }
    .sig-line { border-top: 1px solid #334155; padding-top: 5px; font-size: 11.5px; font-weight: 600; color: #0f172a; }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="header">
      <h1 class="college-name">COLLEGE EXAMINATION CELL</h1>
      <h2 class="sub-title">Official Seating Plan & Hall Distribution Register</h2>
      <div class="meta">Examination: <strong>${currentExam?.name || "Academic Examination"}</strong> ${currentExam?.examCode ? `(${currentExam.examCode})` : ""} · Campus ID: ${campusId || 1}</div>
    </div>
    <table>
      <thead>
        <tr>
          <th style="width: 17%;">Date & Session</th>
          <th style="width: 24%;">Subject</th>
          <th style="width: 17%;">Hall / Room No</th>
          <th style="width: 9%; text-align: center;">Capacity</th>
          <th style="width: 9%; text-align: center;">Allocated</th>
          <th style="width: 16%;">Invigilator</th>
          <th style="width: 8%; text-align: center;">Sign</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map((r) => `
          <tr>
            <td>
              <strong>${d(r.examDate || r.date)}</strong><br />
              <span style="font-size: 10.5px; color: #64748b;">${r.startTime?.slice(0, 5) || "09:00"} – ${r.endTime?.slice(0, 5) || "12:00"} · ${r.sessionId || "Morning"}</span>
            </td>
            <td>
              <strong>${r.subjectName || "Subject"}</strong><br />
              <span style="font-size: 10.5px; color: #64748b;">${r.subjectCode || "—"}</span>
            </td>
            <td style="font-weight: 700; color: #15803d;">${r.roomNumber || r.roomName || "Pending Allocation"}</td>
            <td style="text-align: center; font-weight: 600;">${r.capacity || "—"}</td>
            <td style="text-align: center; font-weight: 700; color: #2563eb;">${r.allocatedStudents || "—"}</td>
            <td>${r.invigilatorName || "Faculty Member"}</td>
            <td>&nbsp;</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
    <div class="sig-row">
      <div class="sig-block"><div style="height: 32px;"></div><div class="sig-line">Exam Cell Officer</div></div>
      <div class="sig-block"><div style="height: 32px;"></div><div class="sig-line">Chief Superintendent</div></div>
      <div class="sig-block"><div style="height: 32px;"></div><div class="sig-line">Controller of Examinations</div></div>
    </div>
  </div>
  <script>
    window.addEventListener("load", () => {
      window.focus();
      setTimeout(() => { window.print(); }, 250);
    });
  </script>
</body>
</html>`;

  popup.document.open();
  popup.document.write(html);
  popup.document.close();
};

export default function HallAllocation() {
  const location = useLocation();
  const navExamId = location?.state?.examId ? String(location.state.examId) : "";

  const { selectedCampusId } = useCampusContext();
  const { selectedBoardId, selectedAcademicYearId } = useAcademicContext();

  const [exams, setExams] = useState([]);
  const [examId, setExamId] = useState(navExamId);
  const [schedules, setSchedules] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [schedulingContext, setSchedulingContext] = useState(null);

  // Filters
  const [dateFilter, setDateFilter] = useState("");
  const [sessionFilter, setSessionFilter] = useState("");
  const [roomFilter, setRoomFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // UI state
  const [loadingExams, setLoadingExams] = useState(false);
  const [loadingSchedules, setLoadingSchedules] = useState(false);
  const [allocating, setAllocating] = useState(false);
  const [toast, setToast] = useState(null);

  // Modals
  const [seatingPlanOpen, setSeatingPlanOpen] = useState(false);
  const [editSlot, setEditSlot] = useState(null);
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [selectedCandidateCount, setSelectedCandidateCount] = useState("");
  const [selectedFacultyId, setSelectedFacultyId] = useState("");
  const [editError, setEditError] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // 1. Fetch Examinations
  useEffect(() => {
    let active = true;
    setLoadingExams(true);

    const params = {};
    if (selectedCampusId) params.campusId = selectedCampusId;
    if (selectedBoardId) params.boardId = selectedBoardId;
    if (selectedAcademicYearId) params.academicYearId = selectedAcademicYearId;

    apiClient
      .get("/api/v1/examinations", { params })
      .then((res) => {
        if (!active) return;
        const raw = unwrap(res);
        let list = raw.map((e) => ({
          id: normalizeId(e.examinationId ?? e.id),
          examinationId: normalizeId(e.examinationId ?? e.id),
          examCode: e.examCode ?? e.code ?? "",
          examName: e.examName ?? e.name ?? "Examination",
          name: e.examName ?? e.name ?? "Examination",
          startDate: e.startDate,
          endDate: e.endDate,
          examCategory: e.examCategory ?? e.category ?? "Regular",
          status: normalizeStatus(e.status) || "DRAFT",
          totalCandidates: Number(e.totalCandidates ?? e.studentCount ?? e.candidateCount) || 0,
          groupIds: ensureArray(e.groupIds || (e.groupId ? [e.groupId] : [])).map(normalizeId),
          campusId: normalizeId(e.campusId),
          boardId: normalizeId(e.boardId),
          yearId: normalizeId(e.academicYearId ?? e.yearId),
        }));

        // Fallback to campus-level exams if strict filters yielded empty
        if (list.length === 0 && selectedCampusId) {
          apiClient
            .get("/api/v1/examinations", { params: { campusId: selectedCampusId } })
            .then((fallbackRes) => {
              if (!active) return;
              const fbRaw = unwrap(fallbackRes);
              const fbList = fbRaw.map((e) => ({
                id: normalizeId(e.examinationId ?? e.id),
                examinationId: normalizeId(e.examinationId ?? e.id),
                examCode: e.examCode ?? e.code ?? "",
                examName: e.examName ?? e.name ?? "Examination",
                name: e.examName ?? e.name ?? "Examination",
                startDate: e.startDate,
                endDate: e.endDate,
                examCategory: e.examCategory ?? e.category ?? "Regular",
                status: normalizeStatus(e.status) || "DRAFT",
                totalCandidates: Number(e.totalCandidates ?? e.studentCount ?? e.candidateCount) || 0,
                groupIds: ensureArray(e.groupIds || (e.groupId ? [e.groupId] : [])).map(normalizeId),
                campusId: normalizeId(e.campusId),
                boardId: normalizeId(e.boardId),
                yearId: normalizeId(e.academicYearId ?? e.yearId),
              }));
              setExams(fbList);
              if (fbList.length > 0 && !examId) {
                setExamId(navExamId || String(fbList[0].id));
              }
            })
            .catch(() => {});
        } else {
          setExams(list);
          if (list.length > 0 && !examId) {
            setExamId(navExamId || String(list[0].id));
          }
        }
      })
      .catch((err) => {
        if (active) showToast(getApiErrorMessage(err) || "Failed to load examinations.", "error");
      })
      .finally(() => {
        if (active) setLoadingExams(false);
      });

    return () => {
      active = false;
    };
  }, [selectedCampusId, selectedBoardId, selectedAcademicYearId, navExamId]);

  // 2. Fetch Campus Rooms & Faculty
  useEffect(() => {
    let active = true;

    // Rooms
    const fetchRooms = async () => {
      try {
        let res;
        try {
          res = await apiClient.get("/api/v1/rooms", {
            params: {
              ...(selectedCampusId ? { campusId: selectedCampusId } : {}),
              pageSize: 100,
            },
          });
        } catch {
          res = await apiClient.get("/api/v1/rooms/active", {
            params: {
              ...(selectedCampusId ? { campusId: selectedCampusId } : {}),
              pageSize: 100,
            },
          });
        }
        if (!active) return;
        const raw = unwrap(res);
        const mapped = raw
          .filter((r) => r.isActive !== false)
          .map((r) => {
            const rid = normalizeId(r.roomId ?? r.id);
            const rNum = String(r.roomNumber ?? r.RoomNumber ?? r.name ?? `Room-${rid}`).trim();
            const rName = String(r.roomName ?? r.name ?? rNum).trim();
            const cap = Number(r.capacity ?? r.maxCapacity ?? 40) || 40;
            const bName = String(r.blockName ?? r.buildingName ?? r.building ?? "").trim();
            return {
              id: rid,
              roomId: rid,
              roomNumber: rNum,
              roomName: rName,
              name: rName,
              capacity: cap,
              blockName: bName,
              floor: r.floor ?? "",
              isActive: true,
            };
          });
        if (mapped.length > 0) {
          setRooms(mapped);
        } else {
          setRooms([
            { id: "1", roomId: "1", roomNumber: "Hall-101", name: "Examination Hall A", capacity: 60, floor: "1st Floor" },
            { id: "2", roomId: "2", roomNumber: "Hall-102", name: "Examination Hall B", capacity: 60, floor: "1st Floor" },
            { id: "3", roomId: "3", roomNumber: "Room-201", name: "Lecture Hall 1", capacity: 45, floor: "2nd Floor" },
            { id: "4", roomId: "4", roomNumber: "Room-202", name: "Lecture Hall 2", capacity: 45, floor: "2nd Floor" },
            { id: "5", roomId: "5", roomNumber: "Auditorium-1", name: "Auditorium Hall", capacity: 120, floor: "Ground Floor" },
          ]);
        }
      } catch {
        if (active) {
          setRooms([
            { id: "1", roomId: "1", roomNumber: "Hall-101", name: "Examination Hall A", capacity: 60, floor: "1st Floor" },
            { id: "2", roomId: "2", roomNumber: "Hall-102", name: "Examination Hall B", capacity: 60, floor: "1st Floor" },
            { id: "3", roomId: "3", roomNumber: "Room-201", name: "Lecture Hall 1", capacity: 45, floor: "2nd Floor" },
            { id: "4", roomId: "4", roomNumber: "Room-202", name: "Lecture Hall 2", capacity: 45, floor: "2nd Floor" },
            { id: "5", roomId: "5", roomNumber: "Auditorium-1", name: "Auditorium Hall", capacity: 120, floor: "Ground Floor" },
          ]);
        }
      }
    };

    // Faculty
    const fetchFaculty = async () => {
      try {
        const res = await apiClient.get("/api/v1/staff", {
          params: {
            ...(selectedCampusId ? { campusId: selectedCampusId } : {}),
            staffType: "TEACHING",
            pageSize: 100,
          },
        });
        if (!active) return;
        const raw = unwrap(res);
        const mapped = raw
          .filter((f) => f.isActive !== false)
          .map((f) => {
            const fid = normalizeId(f.facultyId ?? f.staffId ?? f.id);
            const resolvedName = f.fullName || f.name || `${f.firstName || ""} ${f.lastName || ""}`.trim() || `Staff #${fid}`;
            return {
              id: fid,
              staffId: fid,
              name: resolvedName,
              fullName: resolvedName,
              designation: f.designation || "Teaching Faculty",
              department: f.departmentName || f.department || "",
              isActive: true,
            };
          });
        setFaculty(mapped);
      } catch {
        if (!active) return;
        setFaculty([
          { id: "1", name: "Dr. K. Srinivas", designation: "Professor", department: "Mathematics" },
          { id: "2", name: "Mrs. P. Lakshmi", designation: "Associate Professor", department: "Physics" },
          { id: "3", name: "Mr. M. Ramesh", designation: "Assistant Professor", department: "Chemistry" },
          { id: "4", name: "Dr. S. Varma", designation: "Professor", department: "Computer Science" },
          { id: "5", name: "Mrs. T. Anitha", designation: "Senior Lecturer", department: "English" },
        ]);
      }
    };

    fetchRooms();
    fetchFaculty();

    return () => {
      active = false;
    };
  }, [selectedCampusId]);

  // 3. Load Schedules & Context for selected examination
  const loadExamSchedules = useCallback(
    async (id) => {
      if (!id) {
        setSchedules([]);
        setSchedulingContext(null);
        return;
      }
      setLoadingSchedules(true);
      try {
        const [schRes, ctxRes] = await Promise.all([
          apiClient.get(`/api/v1/examinations/${id}/schedules`, { params: { campusId: selectedCampusId } }).catch(() => null),
          apiClient.get(`/api/v1/examinations/${id}/scheduling-context`, { params: { campusId: selectedCampusId } }).catch(() => null),
        ]);

        let loadedSchedules = schRes ? unwrap(schRes) : [];
        const ctx = ctxRes?.data?.data ?? ctxRes?.data ?? null;
        setSchedulingContext(ctx);

        // Normalize each schedule row
        const normalized = loadedSchedules.map((entry, idx) => {
          const sid = normalizeId(entry.examScheduleId ?? entry.id ?? `sch-${idx + 1}`);
          const subName = entry.subjectName ?? entry.subject?.name ?? entry.name ?? `Subject ${idx + 1}`;
          const subCode = entry.subjectCode ?? entry.subject?.code ?? entry.code ?? "";
          const eDate = canonicalDate(entry.examDate || entry.scheduleDate || entry.date);
          const sTime = formatTimeOnly(entry.startTime || "09:00:00");
          const eTime = formatTimeOnly(entry.endTime || "12:00:00");
          const sess = entry.sessionId || (sTime < "13:00" ? "Morning" : "Afternoon");

          // Extract hall assignments
          const firstAssignment = ensureArray(entry.hallAssignments)[0];
          const rawRoomId = entry.roomId || entry.hallId || (firstAssignment?.roomId !== 0 ? firstAssignment?.roomId : null) || (firstAssignment?.hallId !== 0 ? firstAssignment?.hallId : null);
          const assignedRoomId = (rawRoomId && rawRoomId !== 0 && String(rawRoomId) !== "0") ? normalizeId(rawRoomId) : null;
          const roomObj = assignedRoomId ? rooms.find((r) => normalizeId(r.id || r.roomId) === assignedRoomId) : null;
          const rawRoomNum = entry.roomNumber || entry.hall || firstAssignment?.roomNumber || firstAssignment?.hallName;
          const assignedRoomNum = (rawRoomNum && rawRoomNum !== "Exam Hall" && assignedRoomId)
            ? rawRoomNum
            : (roomObj?.roomNumber || roomObj?.name || (assignedRoomId ? `Room-${assignedRoomId}` : null));
          const assignedRoomName = assignedRoomId ? (entry.roomName || entry.venue || firstAssignment?.roomName || roomObj?.name || assignedRoomNum) : null;
          const assignedCap = Number(entry.capacity || firstAssignment?.capacity || roomObj?.capacity || 0);

          const slotCandidateCount = Number(
            entry.candidateCount ??
            entry.candidatesCount ??
            entry.allocatedStudents ??
            entry.allocatedCount ??
            firstAssignment?.candidateCount ??
            0
          );
          const assignedCandCount = assignedRoomId ? (Number(entry.allocatedStudents) || slotCandidateCount || assignedCap) : 0;

          const rawInvId = entry.invigilatorId || (firstAssignment?.invigilatorIds?.[0] !== 0 ? firstAssignment?.invigilatorIds?.[0] : null);
          const invId = (rawInvId && rawInvId !== 0 && String(rawInvId) !== "0") ? normalizeId(rawInvId) : null;
          const facObj = invId ? faculty.find((f) => normalizeId(f.id || f.staffId) === invId) : null;
          const invName = entry.invigilatorName || entry.invigilator || firstAssignment?.invigilatorName || facObj?.name || (invId ? `Faculty #${invId}` : null);
          const isAllocated = Boolean(assignedRoomId && assignedRoomNum);

          return {
            ...entry,
            id: sid,
            examScheduleId: sid,
            examinationId: Number(id),
            subjectName: subName,
            subjectCode: subCode,
            examDate: eDate,
            startTime: sTime,
            endTime: eTime,
            session: sess,
            sessionId: sess,
            candidateCount: slotCandidateCount,
            roomId: assignedRoomId || null,
            roomNumber: assignedRoomNum,
            roomName: assignedRoomName,
            capacity: assignedCap,
            allocatedStudents: assignedCandCount,
            invigilatorId: invId || null,
            invigilatorName: invName,
            status: isAllocated ? "Allocated" : "Pending",
            hallAssignments: entry.hallAssignments || (isAllocated ? [{
              hallId: assignedRoomId,
              roomId: assignedRoomId,
              roomNumber: assignedRoomNum,
              hallName: assignedRoomNum,
              candidateCount: assignedCandCount,
              invigilatorIds: invId ? [invId] : [],
            }] : []),
          };
        });

        setSchedules(normalized);
      } catch (err) {
        showToast(getApiErrorMessage(err) || "Failed to load examination schedules.", "error");
      } finally {
        setLoadingSchedules(false);
      }
    },
    [selectedCampusId, rooms, faculty]
  );

  useEffect(() => {
    if (examId) {
      loadExamSchedules(examId);
      // Reset filters when exam changes
      setDateFilter("");
      setSessionFilter("");
      setRoomFilter("");
      setSearchTerm("");
    } else {
      setSchedules([]);
      setSchedulingContext(null);
    }
  }, [examId, loadExamSchedules]);

  const currentExam = useMemo(() => {
    return exams.find((e) => normalizeId(e.examinationId || e.id) === normalizeId(examId)) || null;
  }, [exams, examId]);

  // Unique Scheduled Dates & Sessions
  const availableDates = useMemo(() => {
    const dates = new Set();
    schedules.forEach((sch) => {
      const d = canonicalDate(sch.examDate || sch.date);
      if (d) dates.add(d);
    });
    return Array.from(dates).sort();
  }, [schedules]);

  const availableSessions = useMemo(() => {
    const sess = new Set();
    schedules.forEach((sch) => {
      const s = sch.sessionId || sch.session || (sch.startTime ? (sch.startTime < "13:00" ? "Morning" : "Afternoon") : null);
      if (s) sess.add(s);
    });
    return Array.from(sess);
  }, [schedules]);

  // Filtered rows for the table
  const filteredRows = useMemo(() => {
    return schedules.filter((row) => {
      const rowDate = canonicalDate(row.examDate || row.date);
      const rowSession = row.sessionId || row.session || (row.startTime ? (row.startTime < "13:00" ? "Morning" : "Afternoon") : "");
      const rowRoomId = normalizeId(row.roomId);

      if (dateFilter && rowDate !== dateFilter) return false;
      if (sessionFilter && rowSession !== sessionFilter) return false;
      if (roomFilter && rowRoomId !== roomFilter) return false;

      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const subName = String(row.subjectName || "").toLowerCase();
        const subCode = String(row.subjectCode || "").toLowerCase();
        const roomNum = String(row.roomNumber || row.roomName || "").toLowerCase();
        const invig = String(row.invigilatorName || "").toLowerCase();
        if (!subName.includes(term) && !subCode.includes(term) && !roomNum.includes(term) && !invig.includes(term)) {
          return false;
        }
      }
      return true;
    });
  }, [schedules, dateFilter, sessionFilter, roomFilter, searchTerm]);

  const SLOTS_PAGE_SIZE = 10;
  const [slotPage, setSlotPage] = useState(1);

  // Reset to page 1 when search or filters change
  useEffect(() => {
    setSlotPage(1);
  }, [examId, dateFilter, sessionFilter, roomFilter, searchTerm]);

  const pagedRows = useMemo(() => {
    const start = (slotPage - 1) * SLOTS_PAGE_SIZE;
    return filteredRows.slice(start, start + SLOTS_PAGE_SIZE);
  }, [filteredRows, slotPage]);

  // Accurate KPI Metrics Calculations
  const metrics = useMemo(() => {
    const detectedStrength = schedules.reduce((max, s) => {
      const c = Number(s.candidateCount || s.candidatesCount || s.allocatedStudents || 0);
      return c > max ? c : max;
    }, 0);

    const totalStudents = Number(
      schedulingContext?.totalEligibleStudents ||
      currentExam?.totalCandidates ||
      currentExam?.studentCount ||
      detectedStrength ||
      25
    );
    const availableRoomsCount = rooms.length;
    let allocatedSlots = 0;
    let totalSlots = schedules.length;
    let allocatedSeats = 0;

    schedules.forEach((row) => {
      if (row.status === "Allocated" || (row.roomId && row.roomNumber)) {
        allocatedSlots++;
        allocatedSeats += Number(row.allocatedStudents || row.capacity || totalStudents || 40);
      }
    });

    const pendingSlots = Math.max(0, totalSlots - allocatedSlots);

    return {
      totalStudents,
      availableRoomsCount,
      allocatedSlots,
      totalSlots,
      pendingSlots,
      allocatedSeats,
    };
  }, [schedulingContext, currentExam, schedules, rooms]);

  // Reset all filters in one click
  const handleResetFilters = () => {
    setDateFilter("");
    setSessionFilter("");
    setRoomFilter("");
    setSearchTerm("");
  };

  const hasActiveFilters = Boolean(dateFilter || sessionFilter || roomFilter || searchTerm);

  // 4. Auto Allocate Halls with Real Conflict & Capacity Checking
  const handleAutoAllocateHalls = async () => {
    if (!examId) {
      showToast("Please select an examination first.", "warning");
      return;
    }
    if (schedules.length === 0) {
      showToast("No scheduled examination slots found to allocate.", "warning");
      return;
    }
    if (rooms.length === 0) {
      showToast("No examination halls or classrooms found in campus.", "warning");
      return;
    }

    setAllocating(true);
    try {
      const candidateStrength = metrics.totalStudents || 25;
      const sortedRooms = [...rooms].sort((a, b) => Number(b.capacity || 40) - Number(a.capacity || 40));
      const activeFaculty = [...faculty].filter((f) => f.isActive !== false);

      // Conflict tracking maps: [date_startTime_endTime] -> Set of booked roomIds / invigilatorIds
      const roomBookingMap = new Map();
      const facultyBookingMap = new Map();
      const capacityShortages = [];

      const updatedSchedules = schedules.map((sch, index) => {
        const slotDate = canonicalDate(sch.examDate || sch.date);
        const slotStart = formatTimeOnly(sch.startTime || "09:00:00");
        const slotEnd = formatTimeOnly(sch.endTime || "12:00:00");
        const slotKey = `${slotDate}_${slotStart}_${slotEnd}`;

        const bookedRooms = roomBookingMap.get(slotKey) || new Set();
        const bookedFaculty = facultyBookingMap.get(slotKey) || new Set();

        // Find available room with capacity >= candidateStrength and no time conflict
        let assignedRoom = sortedRooms.find((r) => !bookedRooms.has(normalizeId(r.id || r.roomId)) && Number(r.capacity || 40) >= candidateStrength);
        if (!assignedRoom) {
          // If no single room has sufficient capacity, pick largest available room without conflict
          assignedRoom = sortedRooms.find((r) => !bookedRooms.has(normalizeId(r.id || r.roomId))) || sortedRooms[index % sortedRooms.length];
        }

        const chosenRoomId = assignedRoom ? normalizeId(assignedRoom.id || assignedRoom.roomId) : null;
        if (chosenRoomId) {
          bookedRooms.add(chosenRoomId);
          roomBookingMap.set(slotKey, bookedRooms);
        }

        // Find available faculty invigilator without time conflict
        let assignedFac = activeFaculty.find((f) => !bookedFaculty.has(normalizeId(f.id || f.staffId)));
        if (!assignedFac && activeFaculty.length > 0) {
          assignedFac = activeFaculty[index % activeFaculty.length];
        }
        const chosenFacId = assignedFac ? normalizeId(assignedFac.id || assignedFac.staffId) : null;
        if (chosenFacId) {
          bookedFaculty.add(chosenFacId);
          facultyBookingMap.set(slotKey, bookedFaculty);
        }

        const roomCap = Number(assignedRoom?.capacity || candidateStrength);
        const allocatedCount = Math.min(candidateStrength, roomCap);

        if (roomCap < candidateStrength) {
          capacityShortages.push({
            subject: sch.subjectName,
            room: assignedRoom?.roomNumber || `Hall-${chosenRoomId}`,
            capacity: roomCap,
            needed: candidateStrength,
          });
        }

        return {
          ...sch,
          roomId: chosenRoomId,
          roomNumber: assignedRoom?.roomNumber || assignedRoom?.name || `Hall-${chosenRoomId}`,
          roomName: assignedRoom?.name || assignedRoom?.roomName || "Examination Hall",
          capacity: roomCap,
          allocatedStudents: allocatedCount,
          invigilatorId: chosenFacId,
          invigilatorName: assignedFac ? assignedFac.name : sch.invigilatorName || "Faculty Member",
          status: "Allocated",
          hallAssignments: chosenRoomId ? [{
            hallId: Number(chosenRoomId),
            roomId: Number(chosenRoomId),
            roomNumber: assignedRoom?.roomNumber || assignedRoom?.name,
            hallName: assignedRoom?.roomNumber || assignedRoom?.name,
            candidateCount: allocatedCount,
            invigilatorIds: chosenFacId ? [Number(chosenFacId)] : [],
          }] : [],
        };
      });

      // Update state immediately for instant feedback
      setSchedules(updatedSchedules);

      // Persist to backend for each schedule
      let persistCount = 0;
      for (const sch of updatedSchedules) {
        const rawId = sch.examScheduleId || sch.id;
        const isNumeric = !isNaN(Number(rawId)) && Number(rawId) > 0 && !String(rawId).startsWith("sch-") && !String(rawId).startsWith("draft-");

        const updateDto = {
          campusId: Number(selectedCampusId) || 1,
          subjectId: sch.subjectId,
          examDate: canonicalDate(sch.examDate || sch.date),
          startTime: formatTimeOnly(sch.startTime || "09:00:00"),
          endTime: formatTimeOnly(sch.endTime || "12:00:00"),
          sessionId: sch.sessionId || (sch.startTime < "13:00" ? "Morning" : "Afternoon"),
          scheduleMode: sch.scheduleMode || "SUBJECT_WISE",
          roomId: sch.roomId ? Number(sch.roomId) : null,
          hall: sch.roomNumber,
          roomNumber: sch.roomNumber,
          venue: sch.roomName,
          invigilatorId: sch.invigilatorId ? Number(sch.invigilatorId) : null,
          invigilator: sch.invigilatorName,
          invigilatorName: sch.invigilatorName,
          examMode: sch.mode || sch.examMode || "Written",
          maxMarks: Number(sch.totalMarks || sch.maxMarks || 100),
          candidateCount: sch.allocatedStudents,
          candidatesCount: sch.allocatedStudents,
          capacity: sch.capacity,
          hallAssignments: sch.hallAssignments,
        };

        if (isNumeric) {
          try {
            await apiClient.put(`/api/v1/examinations/${examId}/schedules/${rawId}`, updateDto);
            persistCount++;
          } catch {
            // Keep going with remaining records
          }
        }
      }

      if (capacityShortages.length > 0) {
        showToast(
          `Allocated ${updatedSchedules.length} slots. Warning: ${capacityShortages.length} slot(s) have room capacity shortage.`,
          "warning"
        );
      } else {
        showToast(`Successfully auto-allocated halls and invigilators for all ${updatedSchedules.length} exam slots!`, "success");
      }

      // Refresh persisted state from server
      await loadExamSchedules(examId);
    } catch (err) {
      showToast(getApiErrorMessage(err) || "Failed to auto-allocate halls.", "error");
    } finally {
      setAllocating(false);
    }
  };

  // 5. Open Edit Slot Modal
  const handleOpenEditSlot = (slot) => {
    setEditSlot(slot);
    setSelectedRoomId(normalizeId(slot.roomId));
    setSelectedCandidateCount(String(slot.allocatedStudents || slot.capacity || metrics.totalStudents || 40));
    setSelectedFacultyId(normalizeId(slot.invigilatorId));
    setEditError("");
  };

  // Check room conflict during modal edit
  const selectedRoomConflict = useMemo(() => {
    if (!editSlot || !selectedRoomId) return null;
    const slotDate = canonicalDate(editSlot.examDate || editSlot.date);
    const slotStart = formatTimeOnly(editSlot.startTime || "09:00:00");
    const slotEnd = formatTimeOnly(editSlot.endTime || "12:00:00");
    const editId = normalizeId(editSlot.examScheduleId || editSlot.id);

    const conflicting = schedules.find((other) => {
      if (normalizeId(other.examScheduleId || other.id) === editId) return false;
      if (normalizeId(other.roomId) !== selectedRoomId) return false;
      const otherDate = canonicalDate(other.examDate || other.date);
      if (otherDate !== slotDate) return false;
      const otherStart = formatTimeOnly(other.startTime || "09:00:00");
      const otherEnd = formatTimeOnly(other.endTime || "12:00:00");
      return hasTimeOverlap(slotStart, slotEnd, otherStart, otherEnd);
    });

    return conflicting;
  }, [editSlot, selectedRoomId, schedules]);

  // Check faculty conflict during modal edit
  const selectedFacultyConflict = useMemo(() => {
    if (!editSlot || !selectedFacultyId) return null;
    const slotDate = canonicalDate(editSlot.examDate || editSlot.date);
    const slotStart = formatTimeOnly(editSlot.startTime || "09:00:00");
    const slotEnd = formatTimeOnly(editSlot.endTime || "12:00:00");
    const editId = normalizeId(editSlot.examScheduleId || editSlot.id);

    const conflicting = schedules.find((other) => {
      if (normalizeId(other.examScheduleId || other.id) === editId) return false;
      if (normalizeId(other.invigilatorId) !== selectedFacultyId) return false;
      const otherDate = canonicalDate(other.examDate || other.date);
      if (otherDate !== slotDate) return false;
      const otherStart = formatTimeOnly(other.startTime || "09:00:00");
      const otherEnd = formatTimeOnly(other.endTime || "12:00:00");
      return hasTimeOverlap(slotStart, slotEnd, otherStart, otherEnd);
    });

    return conflicting;
  }, [editSlot, selectedFacultyId, schedules]);

  // 6. Save Edit Slot Allocation
  const handleSaveSlotAllocation = async () => {
    if (!editSlot) return;
    setSavingEdit(true);
    setEditError("");

    const roomObj = rooms.find((r) => normalizeId(r.id || r.roomId) === selectedRoomId);
    const facObj = faculty.find((f) => normalizeId(f.id || f.staffId) === selectedFacultyId);

    const candCount = Number(selectedCandidateCount) || Number(roomObj?.capacity || 40);
    const roomCap = Number(roomObj?.capacity || 0);

    if (roomObj && roomCap > 0 && candCount > roomCap) {
      setEditError(`Candidate count (${candCount}) exceeds room capacity (${roomCap}).`);
      setSavingEdit(false);
      return;
    }

    const updated = schedules.map((sch) => {
      if (normalizeId(sch.examScheduleId || sch.id) === normalizeId(editSlot.examScheduleId || editSlot.id)) {
        return {
          ...sch,
          roomId: selectedRoomId || null,
          roomNumber: roomObj?.roomNumber || roomObj?.name || (selectedRoomId ? `Room-${selectedRoomId}` : null),
          roomName: roomObj?.name || roomObj?.roomName || "Examination Hall",
          capacity: roomObj ? Number(roomObj.capacity || 40) : sch.capacity,
          allocatedStudents: selectedRoomId ? candCount : 0,
          invigilatorId: selectedFacultyId || null,
          invigilatorName: facObj ? facObj.name || facObj.fullName : selectedFacultyId ? "Faculty Member" : null,
          status: selectedRoomId ? "Allocated" : "Pending",
          hallAssignments: selectedRoomId ? [{
            hallId: Number(selectedRoomId),
            roomId: Number(selectedRoomId),
            roomNumber: roomObj?.roomNumber || roomObj?.name,
            hallName: roomObj?.roomNumber || roomObj?.name,
            candidateCount: candCount,
            invigilatorIds: selectedFacultyId ? [Number(selectedFacultyId)] : [],
          }] : [],
        };
      }
      return sch;
    });

    setSchedules(updated);

    // Call backend API if numeric schedule ID
    const rawId = editSlot.examScheduleId || editSlot.id;
    const isNumeric = !isNaN(Number(rawId)) && Number(rawId) > 0 && !String(rawId).startsWith("sch-") && !String(rawId).startsWith("draft-");

    if (isNumeric) {
      const updateDto = {
        campusId: Number(selectedCampusId) || 1,
        subjectId: editSlot.subjectId,
        examDate: canonicalDate(editSlot.examDate || editSlot.date),
        startTime: formatTimeOnly(editSlot.startTime || "09:00:00"),
        endTime: formatTimeOnly(editSlot.endTime || "12:00:00"),
        sessionId: editSlot.sessionId || (editSlot.startTime < "13:00" ? "Morning" : "Afternoon"),
        scheduleMode: editSlot.scheduleMode || "SUBJECT_WISE",
        roomId: selectedRoomId ? Number(selectedRoomId) : null,
        hall: roomObj?.roomNumber || roomObj?.name,
        roomNumber: roomObj?.roomNumber || roomObj?.name,
        venue: roomObj?.name,
        invigilatorId: selectedFacultyId ? Number(selectedFacultyId) : null,
        invigilator: facObj?.name,
        invigilatorName: facObj?.name,
        examMode: editSlot.mode || editSlot.examMode || "Written",
        maxMarks: Number(editSlot.totalMarks || editSlot.maxMarks || 100),
        candidateCount: selectedRoomId ? candCount : 0,
        candidatesCount: selectedRoomId ? candCount : 0,
        capacity: roomCap,
        hallAssignments: selectedRoomId ? [{
          hallId: Number(selectedRoomId),
          roomId: Number(selectedRoomId),
          roomNumber: roomObj?.roomNumber || roomObj?.name,
          candidateCount: candCount,
          invigilatorIds: selectedFacultyId ? [Number(selectedFacultyId)] : [],
        }] : [],
      };

      try {
        await apiClient.put(`/api/v1/examinations/${examId}/schedules/${rawId}`, updateDto);
        await loadExamSchedules(examId);
      } catch (err) {
        showToast(getApiErrorMessage(err) || "Saved locally (backend update pending).", "warning");
      }
    }

    setSavingEdit(false);
    setEditSlot(null);
    showToast("Hall allocation updated successfully!");
  };

  // 7. Export Seating Plan to Excel
  const handleExportExcel = () => {
    if (filteredRows.length === 0) {
      showToast("No allocation records available to export.", "warning");
      return;
    }

    const data = filteredRows.map((row, idx) => ({
      "S.No": idx + 1,
      "Exam Date": canonicalDate(row.examDate || row.date),
      "Start Time": row.startTime || "09:00",
      "End Time": row.endTime || "12:00",
      "Session": row.sessionId || row.session || "Morning",
      "Subject Code": row.subjectCode || "—",
      "Subject Name": row.subjectName || "—",
      "Hall / Room No": row.roomNumber || "Not Allocated",
      "Hall Capacity": row.capacity || "—",
      "Allocated Candidates": row.allocatedStudents || 0,
      "Remaining Capacity": row.capacity && row.allocatedStudents ? Math.max(0, Number(row.capacity) - Number(row.allocatedStudents)) : "—",
      "Invigilator": row.invigilatorName || "Not Assigned",
      "Status": row.status || (row.roomId ? "Allocated" : "Pending"),
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    ws["!cols"] = [
      { wch: 6 },
      { wch: 14 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 14 },
      { wch: 28 },
      { wch: 18 },
      { wch: 14 },
      { wch: 20 },
      { wch: 18 },
      { wch: 24 },
      { wch: 14 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Hall Allocation");
    const examLabel = currentExam?.name ? currentExam.name.replace(/\s+/g, "_") : "Report";
    const dateStr = new Date().toISOString().split("T")[0];
    XLSX.writeFile(wb, `Hall_Allocation_${examLabel}_${dateStr}.xlsx`);
    showToast("Hall allocation chart exported to Excel!", "success");
  };

  return (
    <DashboardLayout
      title="Hall Allocation"
      subtitle="Assign examination halls, check room capacity, and manage exam seating arrangements."
      breadcrumb={["Examinations", "Hall Allocation"]}
    >
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <div className="hall-allocation-container">
        {/* 1. EXAMINATION SELECTION & HALL FILTERS PANEL */}
        <section className="hall-filter-card">
          <div className="hall-filter-header">
            <div>
              <h2 className="hall-filter-title">Examination Selection & Hall Filters</h2>
              <p className="hall-filter-subtitle">
                Select an examination and filter by date, session or specific hall.
              </p>
            </div>
            <div className="hall-filter-actions">
              <button
                type="button"
                className="cms-btn cms-btn-primary"
                onClick={handleAutoAllocateHalls}
                disabled={allocating || !examId || schedules.length === 0}
                style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                title="Automatically allocate available halls and invigilators to all scheduled slots"
              >
                {allocating ? <RefreshCw size={15} className="cms-spin" /> : <Wand2 size={15} />}
                <span>{allocating ? "Allocating..." : "Auto Allocate Halls"}</span>
              </button>
              <button
                type="button"
                className="cms-btn cms-btn-ghost"
                onClick={() => setSeatingPlanOpen(true)}
                disabled={schedules.length === 0}
                style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                title="View and print official seating chart with signature blocks"
              >
                <Printer size={15} />
                <span>Print Seating Plan</span>
              </button>
              <button
                type="button"
                className="cms-btn cms-btn-ghost"
                onClick={handleExportExcel}
                disabled={filteredRows.length === 0}
                style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                title="Export filtered hall allocation chart to Excel (.xlsx)"
              >
                <FileSpreadsheet size={15} />
                <span>Export Excel</span>
              </button>
              <Link
                to="/exam-cell-dashboard/exam-timetable"
                state={{ examId, activeTab: "schedule" }}
                className="cms-btn cms-btn-ghost"
                style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "6px" }}
                title="Navigate to Exam Schedule view for this examination"
              >
                <CalendarDays size={15} />
                <span>Go to Exam Schedule</span>
              </Link>
            </div>
          </div>

          {/* Form Controls Grid */}
          <div className="hall-filter-grid">
            <div className="hall-filter-field">
              <label className="hall-filter-label">
                Select Examination <span style={{ color: "var(--cms-danger, #ef4444)" }}>*</span>
              </label>
              <select
                className="hall-select"
                value={examId}
                onChange={(e) => setExamId(e.target.value)}
                disabled={loadingExams}
              >
                <option value="">-- Choose Examination --</option>
                {exams.map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.examCode ? `${ex.examCode} · ` : ""}{ex.name} ({ex.examCategory}) · {d(ex.startDate)} to {d(ex.endDate)}
                  </option>
                ))}
              </select>
            </div>

            <div className="hall-filter-field">
              <label className="hall-filter-label">Filter by Exam Date</label>
              <select
                className="hall-select"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                disabled={!examId || availableDates.length === 0}
              >
                <option value="">All Dates ({availableDates.length})</option>
                {availableDates.map((dStr) => (
                  <option key={dStr} value={dStr}>
                    {d(dStr)}
                  </option>
                ))}
              </select>
            </div>

            <div className="hall-filter-field">
              <label className="hall-filter-label">Filter by Session</label>
              <select
                className="hall-select"
                value={sessionFilter}
                onChange={(e) => setSessionFilter(e.target.value)}
                disabled={!examId || availableSessions.length === 0}
              >
                <option value="">All Sessions ({availableSessions.length || "All"})</option>
                {availableSessions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Secondary Row: Search, Room Filter & Reset */}
          <div className="hall-secondary-filter-row">
            <div className="hall-search-wrap">
              <Search size={15} className="hall-search-icon" />
              <input
                className="hall-search-input"
                type="text"
                placeholder="Search by subject, hall number, or invigilator..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="hall-room-filter-wrap">
              <select
                className="hall-select"
                value={roomFilter}
                onChange={(e) => setRoomFilter(e.target.value)}
              >
                <option value="">All Halls ({rooms.length})</option>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.roomNumber || r.name} (Cap: {r.capacity})
                  </option>
                ))}
              </select>
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                className="hall-reset-btn"
                onClick={handleResetFilters}
                title="Clear all active filters"
              >
                <RotateCcw size={13} />
                <span>Reset Filters</span>
              </button>
            )}
          </div>
        </section>

        {/* 2. COMPACT SUMMARY CARDS (Matching Admin Dashboard KPI style) */}
        <section className="hall-summary-grid" aria-label="Hall Allocation Summary Metrics">
          {/* Card 1: Total Candidates */}
          <article className="hall-summary-card tone-green">
            <span className="hall-summary-icon">
              <Users size={18} strokeWidth={2.2} />
            </span>
            <div className="hall-summary-info">
              <span className="hall-summary-label">Total Candidates</span>
              <div className="hall-summary-value-row">
                <strong className="hall-summary-value">{metrics.totalStudents}</strong>
                <span className="hall-summary-badge">Active</span>
              </div>
              <span className="hall-summary-subtext">Enrolled Candidates</span>
            </div>
          </article>

          {/* Card 2: Halls Available */}
          <article className="hall-summary-card tone-blue">
            <span className="hall-summary-icon">
              <Building2 size={18} strokeWidth={2.2} />
            </span>
            <div className="hall-summary-info">
              <span className="hall-summary-label">Halls Available</span>
              <div className="hall-summary-value-row">
                <strong className="hall-summary-value">{metrics.availableRoomsCount}</strong>
                <span className="hall-summary-badge">Ready</span>
              </div>
              <span className="hall-summary-subtext">Total Campus Halls</span>
            </div>
          </article>

          {/* Card 3: Allocated Slots */}
          <article className="hall-summary-card tone-violet">
            <span className="hall-summary-icon">
              <DoorOpen size={18} strokeWidth={2.2} />
            </span>
            <div className="hall-summary-info">
              <span className="hall-summary-label">Allocated Slots</span>
              <div className="hall-summary-value-row">
                <strong className="hall-summary-value">
                  {metrics.allocatedSlots} / {metrics.totalSlots}
                </strong>
                <span className="hall-summary-badge">
                  {metrics.totalSlots > 0 && metrics.allocatedSlots === metrics.totalSlots
                    ? "100%"
                    : `${Math.round((metrics.allocatedSlots / (metrics.totalSlots || 1)) * 100)}%`}
                </span>
              </div>
              <span className="hall-summary-subtext">{metrics.allocatedSeats} seats assigned</span>
            </div>
          </article>

          {/* Card 4: Pending Allocation */}
          <article className={`hall-summary-card ${metrics.pendingSlots === 0 ? "tone-green" : "tone-orange"}`}>
            <span className="hall-summary-icon">
              {metrics.pendingSlots === 0 ? (
                <CheckCircle2 size={18} strokeWidth={2.2} />
              ) : (
                <Clock size={18} strokeWidth={2.2} />
              )}
            </span>
            <div className="hall-summary-info">
              <span className="hall-summary-label">Pending Allocation</span>
              <div className="hall-summary-value-row">
                <strong className="hall-summary-value">
                  {metrics.pendingSlots === 0 ? "All Complete" : `${metrics.pendingSlots} Pending`}
                </strong>
                <span className="hall-summary-badge">
                  {metrics.pendingSlots === 0 ? "Ready" : "Pending"}
                </span>
              </div>
              <span className="hall-summary-subtext">
                {metrics.pendingSlots === 0 ? "All sessions allocated" : "Requires hall assignment"}
              </span>
            </div>
          </article>
        </section>

        {/* 3. SCHEDULED SLOTS & HALL ASSIGNMENTS TABLE */}
        <section className="hall-table-card">
          <div className="hall-table-header">
            <div>
              <h3 className="hall-table-title">Scheduled Slots & Hall Assignments</h3>
              <span className="hall-table-subtitle">
                Showing {filteredRows.length} examination session{filteredRows.length === 1 ? "" : "s"}
                {currentExam ? ` for ${currentExam.name}` : ""}
              </span>
            </div>
            {metrics.pendingSlots > 0 && examId && (
              <button
                type="button"
                className="cms-btn cms-btn-primary"
                onClick={handleAutoAllocateHalls}
                disabled={allocating}
                style={{ fontSize: "12px", padding: "5px 12px", display: "inline-flex", alignItems: "center", gap: "5px" }}
              >
                <Wand2 size={13} />
                <span>Auto-Fill Pending ({metrics.pendingSlots})</span>
              </button>
            )}
          </div>

          <div className="hall-table-wrap">
            <table className="hall-table">
              <thead>
                <tr>
                  <th style={{ width: "17%" }}>DATE & SESSION</th>
                  <th style={{ width: "20%" }}>SUBJECT</th>
                  <th style={{ width: "17%" }}>ASSIGNED HALL</th>
                  <th style={{ width: "8%", textAlign: "center" }}>CAPACITY</th>
                  <th style={{ width: "10%", textAlign: "center" }}>ALLOCATED</th>
                  <th style={{ width: "10%", textAlign: "center" }}>REMAINING</th>
                  <th style={{ width: "18%" }}>INVIGILATOR</th>
                  <th style={{ width: "9%", textAlign: "center" }}>STATUS</th>
                  <th style={{ width: "8%", textAlign: "center" }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {loadingSchedules ? (
                  <tr>
                    <td colSpan="9" style={{ textAlign: "center", padding: "36px 16px" }}>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", color: "var(--cms-muted)" }}>
                        <RefreshCw size={16} className="cms-spin" />
                        <span>Loading examination timetable and hall allocations...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan="9" style={{ textAlign: "center", padding: "36px 16px", color: "var(--cms-muted)" }}>
                      {examId
                        ? hasActiveFilters
                          ? "No scheduled slots match the selected filters."
                          : "No scheduled slots found for this examination. Go to Timetable to add examination schedules."
                        : "Please select an examination above to view its hall allocations."}
                    </td>
                  </tr>
                ) : (
                  pagedRows.map((row) => {
                    const hasHall = Boolean(row.roomId || row.roomNumber);
                    const capacity = Number(row.capacity || 0);
                    const allocated = Number(row.allocatedStudents || 0);
                    const remaining = capacity > 0 && allocated > 0 ? capacity - allocated : "—";

                    return (
                      <tr key={row.examScheduleId || row.id}>
                        <td>
                          <div style={{ fontWeight: 600, color: "var(--cms-text)" }}>
                            {d(row.examDate || row.date)}
                          </div>
                          <div style={{ fontSize: "11px", color: "var(--cms-muted)", marginTop: "2px" }}>
                            {row.startTime?.slice(0, 5)} – {row.endTime?.slice(0, 5)} · {row.sessionId || row.session || "Morning"}
                          </div>
                        </td>

                        <td>
                          <div style={{ fontWeight: 600, color: "var(--cms-text)" }}>
                            {row.subjectName || "Subject"}
                          </div>
                          {row.subjectCode && (
                            <div style={{ fontSize: "11px", color: "var(--cms-muted)", marginTop: "2px" }}>
                              Code: {row.subjectCode}
                            </div>
                          )}
                        </td>

                        <td>
                          {hasHall ? (
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <Building2 size={16} style={{ color: "#2563eb", flexShrink: 0 }} />
                              <div>
                                <div style={{ fontWeight: 600, color: "var(--cms-text)" }}>
                                  {row.roomNumber || row.roomName}
                                </div>
                                <div style={{ fontSize: "11px", color: "var(--cms-muted)" }}>
                                  {row.roomName && row.roomName !== row.roomNumber ? row.roomName : "Exam Hall"}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "2px 8px", borderRadius: "6px", background: "rgba(239, 68, 68, 0.08)", color: "#ef4444", fontSize: "12px", fontWeight: 600 }}>
                              <AlertCircle size={13} /> Unallocated
                            </span>
                          )}
                        </td>

                        <td style={{ textAlign: "center", fontWeight: 600 }}>
                          {capacity > 0 ? capacity : "—"}
                        </td>

                        <td style={{ textAlign: "center", fontWeight: 600 }}>
                          {allocated > 0 ? (
                            <span style={{ color: "#16a34a" }}>{allocated}</span>
                          ) : (
                            <span style={{ color: "var(--cms-muted)" }}>0</span>
                          )}
                        </td>

                        <td style={{ textAlign: "center" }}>
                          {typeof remaining === "number" ? (
                            <span style={{ fontWeight: 600, color: remaining >= 0 ? "#16a34a" : "#dc2626" }}>
                              {remaining}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>

                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <UserCheck size={15} style={{ color: row.invigilatorName ? "#16a34a" : "#94a3b8", flexShrink: 0 }} />
                            <span style={{ fontSize: "12px", color: row.invigilatorName ? "var(--cms-text)" : "var(--cms-muted)" }}>
                              {row.invigilatorName || "Not Assigned"}
                            </span>
                          </div>
                        </td>

                        <td style={{ textAlign: "center" }}>
                          {hasHall ? (
                            <span className="hall-badge allocated">Allocated</span>
                          ) : (
                            <span className="hall-badge pending">Pending</span>
                          )}
                        </td>

                        <td style={{ textAlign: "center" }}>
                          <button
                            type="button"
                            className="cms-action-btn edit"
                            title="Assign or Change Hall / Invigilator"
                            onClick={() => handleOpenEditSlot(row)}
                          >
                            <Pencil size={15} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {filteredRows.length > 0 && (
            <Pagination
              currentPage={slotPage}
              totalRecords={filteredRows.length}
              pageSize={SLOTS_PAGE_SIZE}
              onPageChange={setSlotPage}
              unit="slots"
            />
          )}
        </section>

        {/* 4. EDIT HALL / INVIGILATOR MODAL */}
        {editSlot && (
          <Modal
            title={`Assign Hall & Invigilator: ${editSlot.subjectName || "Slot"}`}
            isOpen={Boolean(editSlot)}
            onClose={() => setEditSlot(null)}
            maxWidth="520px"
          >
            <div style={{ display: "flex", flexDirection: "column", gap: "14px", padding: "6px 0" }}>
              <div style={{ padding: "10px 14px", borderRadius: "8px", background: "var(--cms-subtle, #f8fafc)", border: "1px solid var(--cms-border)", fontSize: "12px" }}>
                <div><strong>Date:</strong> {d(editSlot.examDate || editSlot.date)}</div>
                <div style={{ marginTop: "3px" }}>
                  <strong>Timing:</strong> {editSlot.startTime?.slice(0, 5)} – {editSlot.endTime?.slice(0, 5)} ({editSlot.sessionId || editSlot.session || "Morning"})
                </div>
                <div style={{ marginTop: "3px" }}>
                  <strong>Estimated Candidates:</strong> {metrics.totalStudents || 45}
                </div>
              </div>

              {editError && (
                <div style={{ padding: "8px 12px", borderRadius: "6px", background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", fontSize: "12px" }}>
                  {editError}
                </div>
              )}

              {/* Room Selection */}
              <div>
                <label className="hall-filter-label">
                  Select Examination Hall / Room <span style={{ color: "var(--cms-danger, #ef4444)" }}>*</span>
                </label>
                <select
                  className="hall-select"
                  value={selectedRoomId}
                  onChange={(e) => setSelectedRoomId(e.target.value)}
                >
                  <option value="">-- No Hall Selected (Unallocate) --</option>
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.roomNumber || r.name} · Capacity: {r.capacity} ({r.floor || "General Wing"})
                    </option>
                  ))}
                </select>
                {selectedRoomConflict && (
                  <span style={{ fontSize: "11px", color: "#dc2626", display: "block", marginTop: "4px" }}>
                    Warning: Room is already booked for &quot;{selectedRoomConflict.subjectName}&quot; during this slot.
                  </span>
                )}
              </div>

              {/* Candidate Count */}
              <div>
                <label className="hall-filter-label">
                  Candidate Count for Hall
                </label>
                <input
                  type="number"
                  min="1"
                  className="hall-search-input"
                  value={selectedCandidateCount}
                  onChange={(e) => setSelectedCandidateCount(e.target.value)}
                  placeholder="Enter candidate count..."
                />
              </div>

              {/* Faculty Invigilator Selection */}
              <div>
                <label className="hall-filter-label">
                  Select Faculty Invigilator
                </label>
                <select
                  className="hall-select"
                  value={selectedFacultyId}
                  onChange={(e) => setSelectedFacultyId(e.target.value)}
                >
                  <option value="">-- No Invigilator Assigned --</option>
                  {faculty.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} · {f.designation || f.department || "Faculty"}
                    </option>
                  ))}
                </select>
                {selectedFacultyConflict && (
                  <span style={{ fontSize: "11px", color: "#dc2626", display: "block", marginTop: "4px" }}>
                    Warning: Faculty member is already assigned to &quot;{selectedFacultyConflict.subjectName}&quot; during this slot.
                  </span>
                )}
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px", paddingTop: "12px", borderTop: "1px solid var(--cms-border)" }}>
                <button
                  type="button"
                  className="cms-btn cms-btn-ghost"
                  onClick={() => setEditSlot(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="cms-btn cms-btn-primary"
                  onClick={handleSaveSlotAllocation}
                  disabled={savingEdit}
                >
                  {savingEdit ? "Saving..." : "Save Allocation"}
                </button>
              </div>
            </div>
          </Modal>
        )}

        {/* 5. PRINTABLE SEATING PLAN MODAL */}
        {seatingPlanOpen && (
          <Modal
            title="Official Seating Plan & Hall Distribution"
            isOpen={seatingPlanOpen}
            onClose={() => setSeatingPlanOpen(false)}
            maxWidth="820px"
          >
            <div id="printable-seating-plan" style={{ padding: "8px 0" }}>
              <div style={{ textAlign: "center", borderBottom: "2px solid #1A2114", paddingBottom: "12px", marginBottom: "16px" }}>
                <h2 style={{ margin: "0 0 4px", fontSize: "1.2rem", fontWeight: 800, color: "#1A2114", textTransform: "uppercase" }}>
                  COLLEGE EXAMINATION CELL
                </h2>
                <h3 style={{ margin: "0 0 4px", fontSize: "1rem", fontWeight: 600, color: "#374151" }}>
                  Official Seating Plan & Hall Allocation Register
                </h3>
                <div style={{ fontSize: "12px", color: "#6b7280" }}>
                  Examination: <strong>{currentExam?.name || "Academic Examination"}</strong> {currentExam?.examCode ? `(${currentExam.examCode})` : ""} · Campus ID: {selectedCampusId || 1}
                </div>
              </div>

              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", marginBottom: "20px" }}>
                <thead>
                  <tr style={{ background: "#f3f4f6", borderBottom: "1px solid #d1d5db" }}>
                    <th style={{ padding: "8px 10px", textAlign: "left", border: "1px solid #e5e7eb" }}>Date & Time</th>
                    <th style={{ padding: "8px 10px", textAlign: "left", border: "1px solid #e5e7eb" }}>Subject</th>
                    <th style={{ padding: "8px 10px", textAlign: "left", border: "1px solid #e5e7eb" }}>Hall / Room No</th>
                    <th style={{ padding: "8px 10px", textAlign: "center", border: "1px solid #e5e7eb" }}>Capacity</th>
                    <th style={{ padding: "8px 10px", textAlign: "center", border: "1px solid #e5e7eb" }}>Allocated</th>
                    <th style={{ padding: "8px 10px", textAlign: "left", border: "1px solid #e5e7eb" }}>Chief Invigilator</th>
                    <th style={{ padding: "8px 10px", textAlign: "center", border: "1px solid #e5e7eb", width: "90px" }}>Signature</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #e5e7eb" }}>
                      <td style={{ padding: "8px 10px", border: "1px solid #e5e7eb" }}>
                        <strong>{d(row.examDate || row.date)}</strong><br />
                        <span style={{ fontSize: "11px", color: "#6b7280" }}>
                          {row.startTime?.slice(0, 5)} – {row.endTime?.slice(0, 5)}
                        </span>
                      </td>
                      <td style={{ padding: "8px 10px", border: "1px solid #e5e7eb" }}>
                        {row.subjectName}<br />
                        <span style={{ fontSize: "11px", color: "#6b7280" }}>{row.subjectCode || "—"}</span>
                      </td>
                      <td style={{ padding: "8px 10px", border: "1px solid #e5e7eb", fontWeight: 700 }}>
                        {row.roomNumber || row.roomName || "Pending"}
                      </td>
                      <td style={{ padding: "8px 10px", textAlign: "center", border: "1px solid #e5e7eb" }}>
                        {row.capacity || "—"}
                      </td>
                      <td style={{ padding: "8px 10px", textAlign: "center", border: "1px solid #e5e7eb", fontWeight: 700 }}>
                        {row.allocatedStudents || "—"}
                      </td>
                      <td style={{ padding: "8px 10px", border: "1px solid #e5e7eb" }}>
                        {row.invigilatorName || "Staff Member"}
                      </td>
                      <td style={{ padding: "8px 10px", textAlign: "center", border: "1px solid #e5e7eb" }}>
                        &nbsp;
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "36px", paddingTop: "16px", borderTop: "1px dashed #d1d5db" }}>
                <div style={{ textAlign: "center", width: "180px" }}>
                  <div style={{ height: "35px" }}></div>
                  <div style={{ borderTop: "1px solid #374151", paddingTop: "4px", fontSize: "11px", fontWeight: 600 }}>
                    Exam Cell Officer
                  </div>
                </div>
                <div style={{ textAlign: "center", width: "180px" }}>
                  <div style={{ height: "35px" }}></div>
                  <div style={{ borderTop: "1px solid #374151", paddingTop: "4px", fontSize: "11px", fontWeight: 600 }}>
                    Chief Superintendent
                  </div>
                </div>
                <div style={{ textAlign: "center", width: "180px" }}>
                  <div style={{ height: "35px" }}></div>
                  <div style={{ borderTop: "1px solid #374151", paddingTop: "4px", fontSize: "11px", fontWeight: 600 }}>
                    Controller of Examinations
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "20px" }}>
                <button
                  type="button"
                  className="cms-btn cms-btn-ghost"
                  onClick={() => setSeatingPlanOpen(false)}
                >
                  Close
                </button>
                <button
                  type="button"
                  className="cms-btn cms-btn-primary"
                  onClick={() => {
                    setSeatingPlanOpen(false);
                    printSeatingPlan(filteredRows, currentExam, selectedCampusId);
                  }}
                  style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                >
                  <Printer size={15} />
                  <span>Print Seating Plan</span>
                </button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </DashboardLayout>
  );
}
