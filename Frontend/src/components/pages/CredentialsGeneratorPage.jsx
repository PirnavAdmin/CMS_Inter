import React, { useState, useMemo, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  KeyRound,
  Users,
  GraduationCap,
  Mail,
  FileSpreadsheet,
  FileText,
  RefreshCw,
  Eye,
  EyeOff,
  Copy,
  Check,
  CheckCircle2,
  AlertCircle,
  Filter,
  Search,
  Download,
  Settings as SettingsIcon,
  Clock,
  Send,
  Lock,
  Plus,
  X,
  ChevronRight,
  ArrowLeft,
  Printer,
  ShieldCheck,
  UserCheck,
  Zap,
  Info
} from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import Search3DIcon from "@/components/common/Search3DIcon.jsx";
import { Modal, Toast } from "@/components/common/Ui.jsx";
import "./CredentialsGeneratorPage.css";

// --- DEFAULT CREDENTIAL SETTINGS & PERSISTENCE ---
export const DEFAULT_CREDENTIAL_SETTINGS = {
  facultyEmailFormat: "{empid}@gmail.com",
  defaultPassword: "Pirnav@123",
  facultyPrefix: "EMP-",
  studentPrefix: "STD-",
  pwdLength: 8,
  includeSymbols: true,
  includeNumbers: true,
  forceChangeOnFirstLogin: true,
  expiryDays: 90,
  emailSubject: "Your PIRNAV ERP Portal Login Credentials",
  senderEmail: "no-reply@pirnav.edu.in",
  autoSendEmail: true
};

export function getStoredCredentialSettings() {
  try {
    const raw = localStorage.getItem("pjc-credential-settings");
    if (raw) {
      return { ...DEFAULT_CREDENTIAL_SETTINGS, ...JSON.parse(raw) };
    }
  } catch {}
  return DEFAULT_CREDENTIAL_SETTINGS;
}

// --- MOCK FACULTY DATA ---
const INITIAL_FACULTY = [
  {
    id: "EMP-1001",
    name: "Dr. Rajesh Sharma",
    dept: "Computer Science",
    designation: "Professor & HOD",
    email: "rajesh.sharma@pirnav.edu.in",
    mobile: "+91 98765 43210",
    accountStatus: "Active",
    credStatus: "Generated",
    loginId: "EMP-1001",
    tempPassword: "PIR#7829@cs",
    lastSent: "2026-08-28 10:30 AM",
    forceChange: true
  },
  {
    id: "EMP-1002",
    name: "Prof. Ananya Roy",
    dept: "Computer Science",
    designation: "Associate Professor",
    email: "ananya.roy@pirnav.edu.in",
    mobile: "+91 98765 43211",
    accountStatus: "Active",
    credStatus: "Sent",
    loginId: "EMP-1002",
    tempPassword: "PIR#3491@cs",
    lastSent: "2026-08-29 02:15 PM",
    forceChange: true
  },
  {
    id: "EMP-1003",
    name: "Dr. Vikram Malhotra",
    dept: "Mechanical Engineering",
    designation: "Professor",
    email: "vikram.malhotra@pirnav.edu.in",
    mobile: "+91 98765 43212",
    accountStatus: "Active",
    credStatus: "Pending",
    loginId: "EMP-1003",
    tempPassword: "",
    lastSent: "Never",
    forceChange: true
  },
  {
    id: "EMP-1004",
    name: "Prof. Sunita Verma",
    dept: "Electronics & Comm",
    designation: "Assistant Professor",
    email: "sunita.verma@pirnav.edu.in",
    mobile: "+91 98765 43213",
    accountStatus: "Active",
    credStatus: "Generated",
    loginId: "EMP-1004",
    tempPassword: "PIR#9102@ec",
    lastSent: "Never",
    forceChange: true
  },
  {
    id: "EMP-1005",
    name: "Dr. Arvind Swamy",
    dept: "Electrical Engineering",
    designation: "Associate Professor",
    email: "arvind.swamy@pirnav.edu.in",
    mobile: "+91 98765 43214",
    accountStatus: "Active",
    credStatus: "Sent",
    loginId: "EMP-1005",
    tempPassword: "PIR#5612@ee",
    lastSent: "2026-08-30 11:00 AM",
    forceChange: true
  },
  {
    id: "EMP-1006",
    name: "Prof. Meera Kulkarni",
    dept: "Civil Engineering",
    designation: "Assistant Professor",
    email: "meera.k@pirnav.edu.in",
    mobile: "+91 98765 43215",
    accountStatus: "Pending",
    credStatus: "Pending",
    loginId: "EMP-1006",
    tempPassword: "",
    lastSent: "Never",
    forceChange: true
  },
  {
    id: "EMP-1007",
    name: "Dr. Suresh Nambiar",
    dept: "Physics Department",
    designation: "Professor",
    email: "suresh.n@pirnav.edu.in",
    mobile: "+91 98765 43216",
    accountStatus: "Active",
    credStatus: "Sent",
    loginId: "EMP-1007",
    tempPassword: "PIR#8823@ph",
    lastSent: "2026-08-25 09:45 AM",
    forceChange: false
  },
  {
    id: "EMP-1008",
    name: "Prof. Divya Hegde",
    dept: "Mathematics",
    designation: "Assistant Professor",
    email: "divya.h@pirnav.edu.in",
    mobile: "+91 98765 43217",
    accountStatus: "Active",
    credStatus: "Failed",
    loginId: "EMP-1008",
    tempPassword: "PIR#1940@ma",
    lastSent: "2026-08-31 04:20 PM",
    forceChange: true
  },
  {
    id: "EMP-1009",
    name: "Dr. Ramesh Nair",
    dept: "Chemistry Department",
    designation: "Associate Professor",
    email: "ramesh.nair@pirnav.edu.in",
    mobile: "+91 98765 43218",
    accountStatus: "Active",
    credStatus: "Generated",
    loginId: "EMP-1009",
    tempPassword: "PIR#6741@ch",
    lastSent: "Never",
    forceChange: true
  },
  {
    id: "EMP-1010",
    name: "Prof. Kavita Rao",
    dept: "Humanities & Management",
    designation: "Assistant Professor",
    email: "kavita.rao@pirnav.edu.in",
    mobile: "+91 98765 43219",
    accountStatus: "Active",
    credStatus: "Sent",
    loginId: "EMP-1010",
    tempPassword: "PIR#3392@hm",
    lastSent: "2026-09-01 01:10 PM",
    forceChange: true
  }
];

// --- MOCK STUDENT DATA ---
const INITIAL_STUDENTS = [
  {
    id: "STD-2026-001",
    rollNo: "26CS01",
    name: "Aarav Patel",
    level: "B.Tech Computer Science",
    group: "1st Year",
    section: "Sec A",
    email: "aarav.p26@student.pirnav.edu.in",
    parentEmail: "patel.father@gmail.com",
    accountStatus: "Active",
    credStatus: "Sent",
    loginId: "STD-26CS01",
    tempPassword: "PIR#9041@std",
    lastSent: "2026-08-30 03:20 PM",
    forceChange: true
  },
  {
    id: "STD-2026-002",
    rollNo: "26CS02",
    name: "Priya Sharma",
    level: "B.Tech Computer Science",
    group: "1st Year",
    section: "Sec A",
    email: "priya.s26@student.pirnav.edu.in",
    parentEmail: "sharma.sunil@gmail.com",
    accountStatus: "Active",
    credStatus: "Sent",
    loginId: "STD-26CS02",
    tempPassword: "PIR#7723@std",
    lastSent: "2026-08-30 03:21 PM",
    forceChange: true
  },
  {
    id: "STD-2026-003",
    rollNo: "26CS03",
    name: "Rohan Gupta",
    level: "B.Tech Computer Science",
    group: "1st Year",
    section: "Sec B",
    email: "rohan.g26@student.pirnav.edu.in",
    parentEmail: "gupta.family@yahoo.com",
    accountStatus: "Active",
    credStatus: "Pending",
    loginId: "STD-26CS03",
    tempPassword: "",
    lastSent: "Never",
    forceChange: true
  },
  {
    id: "STD-2026-004",
    rollNo: "26EC01",
    name: "Sneha Reddy",
    level: "B.Tech Electronics",
    group: "2nd Year",
    section: "Sec A",
    email: "sneha.r25@student.pirnav.edu.in",
    parentEmail: "reddy.ramesh@gmail.com",
    accountStatus: "Active",
    credStatus: "Generated",
    loginId: "STD-26EC01",
    tempPassword: "PIR#5512@std",
    lastSent: "Never",
    forceChange: true
  },
  {
    id: "STD-2026-005",
    rollNo: "26EC02",
    name: "Varun Mehta",
    level: "B.Tech Electronics",
    group: "2nd Year",
    section: "Sec A",
    email: "varun.m25@student.pirnav.edu.in",
    parentEmail: "mehta.anil@outlook.com",
    accountStatus: "Active",
    credStatus: "Sent",
    loginId: "STD-26EC02",
    tempPassword: "PIR#3489@std",
    lastSent: "2026-08-31 09:15 AM",
    forceChange: true
  },
  {
    id: "STD-2026-006",
    rollNo: "26ME01",
    name: "Karan Singh",
    level: "B.Tech Mechanical",
    group: "3rd Year",
    section: "Sec A",
    email: "karan.s24@student.pirnav.edu.in",
    parentEmail: "singh.balwinder@gmail.com",
    accountStatus: "Active",
    credStatus: "Pending",
    loginId: "STD-26ME01",
    tempPassword: "",
    lastSent: "Never",
    forceChange: true
  },
  {
    id: "STD-2026-007",
    rollNo: "26ME02",
    name: "Ananya Deshmukh",
    level: "B.Tech Mechanical",
    group: "3rd Year",
    section: "Sec B",
    email: "ananya.d24@student.pirnav.edu.in",
    parentEmail: "deshmukh.p@gmail.com",
    accountStatus: "Active",
    credStatus: "Generated",
    loginId: "STD-26ME02",
    tempPassword: "PIR#8821@std",
    lastSent: "Never",
    forceChange: true
  },
  {
    id: "STD-2026-008",
    rollNo: "26CE01",
    name: "Nikhil Joshi",
    level: "B.Tech Civil",
    group: "4th Year",
    section: "Sec A",
    email: "nikhil.j23@student.pirnav.edu.in",
    parentEmail: "joshi.vijay@rediffmail.com",
    accountStatus: "Active",
    credStatus: "Sent",
    loginId: "STD-26CE01",
    tempPassword: "PIR#1029@std",
    lastSent: "2026-08-27 04:45 PM",
    forceChange: false
  },
  {
    id: "STD-2026-009",
    rollNo: "26CS04",
    name: "Tanvi Saxena",
    level: "B.Tech Computer Science",
    group: "1st Year",
    section: "Sec A",
    email: "tanvi.s26@student.pirnav.edu.in",
    parentEmail: "saxena.family@gmail.com",
    accountStatus: "Active",
    credStatus: "Failed",
    loginId: "STD-26CS04",
    tempPassword: "PIR#6642@std",
    lastSent: "2026-09-01 11:30 AM",
    forceChange: true
  },
  {
    id: "STD-2026-010",
    rollNo: "26CS05",
    name: "Aditya Bhatt",
    level: "B.Tech Computer Science",
    group: "1st Year",
    section: "Sec B",
    email: "aditya.b26@student.pirnav.edu.in",
    parentEmail: "bhatt.harish@gmail.com",
    accountStatus: "Active",
    credStatus: "Generated",
    loginId: "STD-26CS05",
    tempPassword: "PIR#2289@std",
    lastSent: "Never",
    forceChange: true
  }
];

// --- MOCK HISTORY LOGS ---
const INITIAL_HISTORY = [
  {
    batchId: "BAT-20260901-01",
    date: "2026-09-01 11:30 AM",
    targetType: "Students",
    scope: "1st Year CS (Sec A)",
    count: 24,
    generatedBy: "System Administrator",
    status: "Completed",
    emailsSent: 23,
    emailsFailed: 1
  },
  {
    batchId: "BAT-20260830-04",
    date: "2026-08-30 03:15 PM",
    targetType: "Faculty",
    scope: "Computer Science Dept",
    count: 12,
    generatedBy: "System Administrator",
    status: "Completed",
    emailsSent: 12,
    emailsFailed: 0
  },
  {
    batchId: "BAT-20260829-02",
    date: "2026-08-29 02:00 PM",
    targetType: "Faculty",
    scope: "Electronics & Mech",
    count: 18,
    generatedBy: "HOD Academics",
    status: "Completed",
    emailsSent: 18,
    emailsFailed: 0
  },
  {
    batchId: "BAT-20260825-01",
    date: "2026-08-25 09:30 AM",
    targetType: "Students",
    scope: "4th Year All Streams",
    count: 145,
    generatedBy: "System Administrator",
    status: "Completed",
    emailsSent: 145,
    emailsFailed: 0
  }
];

export default function CredentialsGeneratorPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const getTabFromPath = () => {
    const p = location.pathname;
    if (p.includes("/credentials/students")) return "students";
    if (p.includes("/credentials/history")) return "history";
    if (p.includes("/credentials/settings")) return "settings";
    return "faculty";
  };

  const [activeTab, setActiveTab] = useState(getTabFromPath);
  const [facultyList, setFacultyList] = useState(INITIAL_FACULTY);
  const [studentList, setStudentList] = useState(INITIAL_STUDENTS);
  const [historyList, setHistoryList] = useState(INITIAL_HISTORY);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterDeptLevel, setFilterDeptLevel] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const [selectedIds, setSelectedIds] = useState([]);
  const [revealedPasswords, setRevealedPasswords] = useState({});

  const [toast, setToast] = useState({ message: "", type: "success" });
  const showToast = (message, type = "success") => setToast({ message, type });

  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [detailUser, setDetailUser] = useState(null);
  const [copySuccess, setCopySuccess] = useState(false);

  const [credentialSettings, setCredentialSettings] = useState(getStoredCredentialSettings);

  const [wizardConfig, setWizardConfig] = useState({
    targetType: activeTab === "students" ? "students" : "faculty",
    scopeOption: "pending",
    deptOrLevel: "all",
    prefix: activeTab === "students" ? "STD-" : "EMP-",
    pwdStrategy: "auto",
    forceChange: true,
    expiry: "90"
  });

  const [wizardPreviewData, setWizardPreviewData] = useState([]);
  const [wizardSendingProgress, setWizardSendingProgress] = useState(0);
  const [isWizardSending, setIsWizardSending] = useState(false);
  const [wizardResult, setWizardResult] = useState(null);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSelectedIds([]);
    setSearchQuery("");
    setFilterDeptLevel("all");
    setFilterStatus("all");
    if (tab === "faculty") navigate("/dashboard/settings/credentials/faculty");
    else if (tab === "students") navigate("/dashboard/settings/credentials/students");
    else if (tab === "history") navigate("/dashboard/settings/credentials/history");
    else if (tab === "settings") navigate("/dashboard/settings/credentials/settings");
  };

  useEffect(() => {
    setActiveTab(getTabFromPath());
  }, [location.pathname]);

  useEffect(() => {
    if (location.pathname.endsWith("/generate")) {
      openWizard(activeTab === "students" ? "students" : "faculty");
    }
  }, [location.pathname]);

  const currentList = activeTab === "students" ? studentList : facultyList;

  const filteredData = useMemo(() => {
    if (activeTab === "history" || activeTab === "settings") return [];
    return currentList.filter((item) => {
      const query = searchQuery.toLowerCase().trim();
      const matchSearch =
        !query ||
        item.name.toLowerCase().includes(query) ||
        item.id.toLowerCase().includes(query) ||
        (item.rollNo && item.rollNo.toLowerCase().includes(query)) ||
        item.email.toLowerCase().includes(query);

      let matchDept = true;
      if (filterDeptLevel !== "all") {
        const itemVal = item.dept || item.level;
        matchDept = itemVal === filterDeptLevel;
      }

      let matchStatus = true;
      if (filterStatus !== "all") {
        matchStatus = item.credStatus.toLowerCase() === filterStatus.toLowerCase();
      }

      return matchSearch && matchDept && matchStatus;
    });
  }, [currentList, searchQuery, filterDeptLevel, filterStatus, activeTab]);

  const deptLevelOptions = useMemo(() => {
    const list = activeTab === "students" ? studentList : facultyList;
    const key = activeTab === "students" ? "level" : "dept";
    const set = new Set(list.map((i) => i[key]).filter(Boolean));
    return Array.from(set);
  }, [activeTab, studentList, facultyList]);

  const stats = useMemo(() => {
    const list = activeTab === "students" ? studentList : facultyList;
    const total = list.length;
    const generated = list.filter((i) => i.credStatus === "Generated" || i.credStatus === "Sent").length;
    const pending = list.filter((i) => i.credStatus === "Pending").length;
    const sent = list.filter((i) => i.credStatus === "Sent").length;
    const percent = total > 0 ? Math.round((generated / total) * 100) : 0;
    return { total, generated, pending, sent, percent };
  }, [activeTab, studentList, facultyList]);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(filteredData.map((item) => item.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const isAllSelected =
    filteredData.length > 0 && selectedIds.length === filteredData.length;

  const toggleRevealPassword = (id) => {
    setRevealedPasswords((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const generateRandomPassword = (dept = "") => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const symbols = "!@#$%&*";
    let randStr = "";
    for (let i = 0; i < 4; i++) {
      randStr += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const randSym = symbols.charAt(Math.floor(Math.random() * symbols.length));
    const deptTag = dept ? dept.substring(0, 2).toLowerCase() : "ex";
    return `PIR#${randStr}${randSym}@${deptTag}`;
  };

  const handleSingleGenerate = (user) => {
    const newPwd = generateRandomPassword(user.dept || user.level);
    const updatedUser = {
      ...user,
      credStatus: "Generated",
      tempPassword: newPwd,
      loginId: user.loginId || user.id
    };

    if (activeTab === "students") {
      setStudentList((prev) => prev.map((u) => (u.id === user.id ? updatedUser : u)));
    } else {
      setFacultyList((prev) => prev.map((u) => (u.id === user.id ? updatedUser : u)));
    }
    showToast(`Generated credentials for ${user.name}`);
  };

  const handleSingleSendEmail = (user) => {
    if (!user.tempPassword) {
      showToast("Please generate credentials before sending email.", "error");
      return;
    }
    const nowStr = new Date().toLocaleString("en-US", {
      dateStyle: "short",
      timeStyle: "short"
    });
    const updatedUser = {
      ...user,
      credStatus: "Sent",
      lastSent: nowStr
    };

    if (activeTab === "students") {
      setStudentList((prev) => prev.map((u) => (u.id === user.id ? updatedUser : u)));
    } else {
      setFacultyList((prev) => prev.map((u) => (u.id === user.id ? updatedUser : u)));
    }
    showToast(`Email sent successfully to ${user.email}`);
  };

  const handleBulkGenerate = () => {
    if (selectedIds.length === 0) return;
    const targetList = activeTab === "students" ? studentList : facultyList;

    let count = 0;
    const updated = targetList.map((item) => {
      if (selectedIds.includes(item.id)) {
        count++;
        return {
          ...item,
          credStatus: "Generated",
          tempPassword: item.tempPassword || generateRandomPassword(item.dept || item.level)
        };
      }
      return item;
    });

    if (activeTab === "students") setStudentList(updated);
    else setFacultyList(updated);

    showToast(`Generated credentials for ${count} selected users.`);
    setSelectedIds([]);
  };

  const handleBulkSendEmail = () => {
    if (selectedIds.length === 0) return;
    const targetList = activeTab === "students" ? studentList : facultyList;
    const nowStr = new Date().toLocaleString("en-US", {
      dateStyle: "short",
      timeStyle: "short"
    });

    let sentCount = 0;
    const updated = targetList.map((item) => {
      if (selectedIds.includes(item.id)) {
        if (item.tempPassword || item.credStatus === "Generated") {
          sentCount++;
          return {
            ...item,
            credStatus: "Sent",
            lastSent: nowStr
          };
        }
      }
      return item;
    });

    if (activeTab === "students") setStudentList(updated);
    else setFacultyList(updated);

    if (sentCount > 0) {
      showToast(`Credentials emailed to ${sentCount} users successfully.`);
    } else {
      showToast("Selected users must have generated passwords before sending email.", "warning");
    }
    setSelectedIds([]);
  };

  const handleBulkDownloadPDF = () => {
    if (selectedIds.length === 0) return;
    showToast(`Generated printable PDF slip bundle for ${selectedIds.length} users. (Mock Download)`);
  };

  const handleBulkDownloadExcel = () => {
    const listToExport = selectedIds.length > 0
      ? filteredData.filter((i) => selectedIds.includes(i.id))
      : filteredData;
    showToast(`Exported ${listToExport.length} credential records to Excel spreadsheet.`);
  };

  const openWizard = (targetType = activeTab) => {
    const type = targetType === "students" ? "students" : "faculty";
    setWizardConfig({
      targetType: type,
      scopeOption: selectedIds.length > 0 ? "selected" : "pending",
      deptOrLevel: "all",
      prefix: type === "students" ? "STD-" : "EMP-",
      pwdStrategy: "auto",
      forceChange: true,
      expiry: "90"
    });
    setWizardStep(1);
    setWizardPreviewData([]);
    setWizardResult(null);
    setIsWizardOpen(true);
  };

  const handleWizardNext = () => {
    if (wizardStep === 1) {
      const targetList = wizardConfig.targetType === "students" ? studentList : facultyList;
      let candidates = [];

      if (wizardConfig.scopeOption === "selected" && selectedIds.length > 0) {
        candidates = targetList.filter((i) => selectedIds.includes(i.id));
      } else if (wizardConfig.scopeOption === "pending") {
        candidates = targetList.filter((i) => i.credStatus === "Pending" || !i.tempPassword);
      } else {
        candidates = [...targetList];
      }

      if (wizardConfig.deptOrLevel !== "all") {
        candidates = candidates.filter((i) => {
          const val = i.dept || i.level;
          return val === wizardConfig.deptOrLevel;
        });
      }

      if (candidates.length === 0) {
        showToast("No users match the selected criteria for credential generation.", "warning");
        return;
      }

      const prepared = candidates.map((user) => ({
        ...user,
        loginId: user.loginId || `${wizardConfig.prefix}${user.rollNo || user.id}`,
        generatedPwd: user.tempPassword || generateRandomPassword(user.dept || user.level)
      }));

      setWizardPreviewData(prepared);
      setWizardStep(2);
    } else if (wizardStep === 2) {
      setWizardStep(3);
    } else if (wizardStep === 3) {
      setIsWizardSending(true);
      setWizardSendingProgress(10);

      const interval = setInterval(() => {
        setWizardSendingProgress((prev) => {
          if (prev >= 90) {
            clearInterval(interval);
            return 95;
          }
          return prev + 25;
        });
      }, 300);

      setTimeout(() => {
        clearInterval(interval);
        setWizardSendingProgress(100);
        setIsWizardSending(false);

        const nowStr = new Date().toLocaleString("en-US", {
          dateStyle: "short",
          timeStyle: "short"
        });

        const updater = (prevList) =>
          prevList.map((item) => {
            const match = wizardPreviewData.find((w) => w.id === item.id);
            if (match) {
              return {
                ...item,
                loginId: match.loginId,
                tempPassword: match.generatedPwd,
                credStatus: credentialSettings.autoSendEmail ? "Sent" : "Generated",
                lastSent: credentialSettings.autoSendEmail ? nowStr : item.lastSent,
                forceChange: wizardConfig.forceChange
              };
            }
            return item;
          });

        if (wizardConfig.targetType === "students") {
          setStudentList(updater);
        } else {
          setFacultyList(updater);
        }

        const newBatch = {
          batchId: `BAT-${Date.now().toString().slice(-6)}`,
          date: nowStr,
          targetType: wizardConfig.targetType === "students" ? "Students" : "Faculty",
          scope: wizardConfig.scopeOption === "selected" ? `${wizardPreviewData.length} Selected` : "Bulk Filtered",
          count: wizardPreviewData.length,
          generatedBy: "System Administrator",
          status: "Completed",
          emailsSent: credentialSettings.autoSendEmail ? wizardPreviewData.length : 0,
          emailsFailed: 0
        };

        setHistoryList((prev) => [newBatch, ...prev]);

        setWizardResult({
          total: wizardPreviewData.length,
          sent: credentialSettings.autoSendEmail ? wizardPreviewData.length : 0,
          failed: 0
        });

        setWizardStep(4);
        setSelectedIds([]);
      }, 1500);
    }
  };

  const handleCopyText = (text) => {
    navigator.clipboard.writeText(text);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  return (
    <DashboardLayout
      title="Credentials Generator"
      subtitle="Generate, manage, preview, and dispatch secure login credentials for faculty and students."
      breadcrumb={["Home", "Settings", "Credentials Generator"]}
    >
      <div className="credentials-page-container">
        <div className="cred-top-nav">
          <div className="cred-tabs-wrapper">
            <button
              className={`cred-tab-btn ${activeTab === "faculty" ? "is-active" : ""}`}
              onClick={() => handleTabChange("faculty")}
            >
              <Users size={16} />
              <span>Faculty Credentials</span>
              <span className="cred-tab-count">{facultyList.length}</span>
            </button>

            <button
              className={`cred-tab-btn ${activeTab === "students" ? "is-active" : ""}`}
              onClick={() => handleTabChange("students")}
            >
              <GraduationCap size={17} />
              <span>Student Credentials</span>
              <span className="cred-tab-count">{studentList.length}</span>
            </button>

            <button
              className={`cred-tab-btn ${activeTab === "history" ? "is-active" : ""}`}
              onClick={() => handleTabChange("history")}
            >
              <Clock size={16} />
              <span>Generation History</span>
              <span className="cred-tab-count">{historyList.length}</span>
            </button>

            <button
              className={`cred-tab-btn ${activeTab === "settings" ? "is-active" : ""}`}
              onClick={() => handleTabChange("settings")}
            >
              <SettingsIcon size={16} />
              <span>Credential Settings</span>
            </button>
          </div>

          <div className="cred-top-actions">
            {(activeTab === "faculty" || activeTab === "students") && (
              <>
                <button
                  type="button"
                  className="cms-btn cms-btn-primary"
                  onClick={() => openWizard(activeTab)}
                >
                  <Zap size={16} />
                  <span>Generate Credentials</span>
                </button>
                <button
                  type="button"
                  className="cms-btn cms-btn-ghost"
                  onClick={handleBulkDownloadExcel}
                  title="Export complete list to Excel"
                >
                  <FileSpreadsheet size={16} />
                  <span>Export Excel</span>
                </button>
              </>
            )}
          </div>
        </div>

        {(activeTab === "faculty" || activeTab === "students") && (
          <>
            <div className="cred-kpi-grid">
              <div className="cred-kpi-card">
                <div className="cred-kpi-icon icon-blue">
                  <UserCheck size={17} />
                </div>
                <div className="cred-kpi-content">
                  <span className="cred-kpi-label">Total Users</span>
                  <div className="cred-kpi-val">{stats.total}</div>
                  <span className="cred-kpi-sub">Registered in ERP system</span>
                </div>
              </div>

              <div className="cred-kpi-card">
                <div className="cred-kpi-icon icon-green">
                  <KeyRound size={17} />
                </div>
                <div className="cred-kpi-content">
                  <span className="cred-kpi-label">Credentials Generated</span>
                  <div className="cred-kpi-val">{stats.generated} <span className="cred-kpi-percent">({stats.percent}%)</span></div>
                  <div className="cred-kpi-progress">
                    <div className="cred-kpi-bar" style={{ width: `${stats.percent}%` }} />
                  </div>
                </div>
              </div>

              <div className="cred-kpi-card">
                <div className="cred-kpi-icon icon-amber">
                  <Clock size={17} />
                </div>
                <div className="cred-kpi-content">
                  <span className="cred-kpi-label">Pending Generation</span>
                  <div className="cred-kpi-val">{stats.pending}</div>
                  <span className="cred-kpi-sub">Awaiting login creation</span>
                </div>
              </div>

              <div className="cred-kpi-card">
                <div className="cred-kpi-icon icon-purple">
                  <Mail size={17} />
                </div>
                <div className="cred-kpi-content">
                  <span className="cred-kpi-label">Emails Dispatched</span>
                  <div className="cred-kpi-val">{stats.sent}</div>
                  <span className="cred-kpi-sub">Sent with temporary link</span>
                </div>
              </div>
            </div>

            <div className="cred-filter-card">
              <div className="cred-filter-row">
                <div className="cred-search-box">
                  <Search3DIcon size={16} className="cred-search-icon" />
                  <input
                    type="text"
                    placeholder={
                      activeTab === "students"
                        ? "Search student name, roll number, admission ID, or email..."
                        : "Search faculty name, employee ID, or email..."
                    }
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <button className="cred-clear-search" onClick={() => setSearchQuery("")}>
                      <X size={14} />
                    </button>
                  )}
                </div>

                <div className="cred-dropdown-group">
                  <div className="cred-select-wrapper">
                    <Filter size={14} className="cred-select-icon" />
                    <select
                      value={filterDeptLevel}
                      onChange={(e) => setFilterDeptLevel(e.target.value)}
                    >
                      <option value="all">
                        {activeTab === "students" ? "All Courses / Levels" : "All Departments"}
                      </option>
                      {deptLevelOptions.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="cred-select-wrapper">
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                    >
                      <option value="all">All Credential Statuses</option>
                      <option value="pending">Pending</option>
                      <option value="generated">Generated</option>
                      <option value="sent">Sent (Emailed)</option>
                      <option value="failed">Failed Delivery</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="cred-table-card">
              <div className="cred-table-container">
                <table className="cred-data-table">
                  <thead>
                    <tr>
                      <th style={{ width: 44, textAlign: "center" }}>
                        <input
                          type="checkbox"
                          checked={isAllSelected}
                          onChange={handleSelectAll}
                          title="Select / Deselect all"
                        />
                      </th>
                      <th>{activeTab === "students" ? "Roll / Adm No" : "Emp ID"}</th>
                      <th>Name</th>
                      <th>{activeTab === "students" ? "Course & Section" : "Dept & Designation"}</th>
                      <th>Contact Email</th>
                      <th style={{ textAlign: "center" }}>Cred Status</th>
                      <th>Password Preview</th>
                      <th>Last Dispatched</th>
                      <th style={{ textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="cred-empty-state">
                          <AlertCircle size={32} />
                          <p>No {activeTab} records found matching your filters.</p>
                          <button
                            type="button"
                            className="cms-btn cms-btn-ghost"
                            onClick={() => {
                              setSearchQuery("");
                              setFilterDeptLevel("all");
                              setFilterStatus("all");
                            }}
                          >
                            Reset Search & Filters
                          </button>
                        </td>
                      </tr>
                    ) : (
                      filteredData.map((item) => {
                        const isSelected = selectedIds.includes(item.id);
                        const isPwdRevealed = Boolean(revealedPasswords[item.id]);

                        return (
                          <tr key={item.id} className={isSelected ? "is-selected-row" : ""}>
                            <td style={{ textAlign: "center" }}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleSelectOne(item.id)}
                              />
                            </td>
                            <td>
                              <span className="cred-code-badge">
                                {item.rollNo || item.id}
                              </span>
                            </td>
                            <td>
                              <div className="cred-user-cell">
                                <div className="cred-avatar">
                                  {item.name.charAt(0)}
                                </div>
                                <div className="cred-user-info">
                                  <span className="cred-user-name">{item.name}</span>
                                  <span className="cred-user-sub">{item.id}</span>
                                </div>
                              </div>
                            </td>
                            <td>
                              <div className="cred-dept-cell">
                                <span className="cred-dept-main">
                                  {item.dept || item.level}
                                </span>
                                <span className="cred-dept-sub">
                                  {item.designation || `${item.group} • ${item.section}`}
                                </span>
                              </div>
                            </td>
                            <td>
                              <span className="cred-email-text">{item.email}</span>
                            </td>
                            <td style={{ textAlign: "center" }}>
                              <StatusBadge value={item.credStatus} />
                            </td>
                            <td>
                              {item.tempPassword ? (
                                <div className="cred-pwd-cell">
                                  <code className="cred-pwd-code">
                                    {isPwdRevealed ? item.tempPassword : "••••••••••••"}
                                  </code>
                                  <button
                                    type="button"
                                    className="cred-eye-btn"
                                    onClick={() => toggleRevealPassword(item.id)}
                                    title={isPwdRevealed ? "Hide password" : "Show password"}
                                  >
                                    {isPwdRevealed ? <EyeOff size={14} /> : <Eye size={14} />}
                                  </button>
                                </div>
                              ) : (
                                <span className="cred-not-gen">Not Generated</span>
                              )}
                            </td>
                            <td>
                              <span className="cred-time-text">{item.lastSent}</span>
                            </td>
                            <td style={{ textAlign: "right" }}>
                              <div className="cred-row-actions">
                                <button
                                  type="button"
                                  className="cred-action-btn"
                                  title="View Full Credential Details"
                                  onClick={() => setDetailUser(item)}
                                >
                                  <Eye size={15} />
                                </button>
                                {item.tempPassword ? (
                                  <button
                                    type="button"
                                    className="cred-action-btn"
                                    title="Send Email to User"
                                    onClick={() => handleSingleSendEmail(item)}
                                  >
                                    <Send size={15} />
                                  </button>
                                ) : null}
                                <button
                                  type="button"
                                  className="cred-action-btn primary"
                                  title={item.tempPassword ? "Regenerate Password" : "Generate Password"}
                                  onClick={() => handleSingleGenerate(item)}
                                >
                                  <RefreshCw size={15} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <div className="cred-table-footer">
                <span>Showing {filteredData.length} of {currentList.length} total records</span>
                {selectedIds.length > 0 && (
                  <span className="cred-selected-count-pill">
                    {selectedIds.length} user{selectedIds.length > 1 ? "s" : ""} selected
                  </span>
                )}
              </div>
            </div>

            {selectedIds.length > 0 && (
              <div className="cred-bulk-bar">
                <div className="cred-bulk-left">
                  <span className="cred-bulk-badge">{selectedIds.length}</span>
                  <span className="cred-bulk-label">Users Selected for Bulk Action</span>
                </div>
                <div className="cred-bulk-right">
                  <button
                    type="button"
                    className="cms-btn cms-btn-primary"
                    onClick={handleBulkGenerate}
                  >
                    <Zap size={15} />
                    <span>Generate Credentials</span>
                  </button>
                  <button
                    type="button"
                    className="cms-btn cms-btn-ghost"
                    onClick={handleBulkSendEmail}
                  >
                    <Mail size={15} />
                    <span>Send via Email</span>
                  </button>
                  <button
                    type="button"
                    className="cms-btn cms-btn-ghost"
                    onClick={handleBulkDownloadPDF}
                  >
                    <FileText size={15} />
                    <span>Print PDF Slips</span>
                  </button>
                  <button
                    type="button"
                    className="cms-btn cms-btn-ghost"
                    onClick={handleBulkDownloadExcel}
                  >
                    <FileSpreadsheet size={15} />
                    <span>Export Excel</span>
                  </button>
                  <button
                    type="button"
                    className="cred-bulk-clear"
                    onClick={() => setSelectedIds([])}
                    title="Clear Selection"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === "history" && (
          <div className="cred-history-card">
            <div className="cred-card-header">
              <div>
                <h3>Credential Batch Generation History</h3>
                <p>Complete audit log of all automated and manual credential generation dispatches.</p>
              </div>
            </div>
            <div className="cred-table-container">
              <table className="cred-data-table">
                <thead>
                  <tr>
                    <th>Batch ID</th>
                    <th>Date & Time</th>
                    <th>Target Type</th>
                    <th>Scope / Filter</th>
                    <th style={{ textAlign: "center" }}>Users Count</th>
                    <th>Generated By</th>
                    <th style={{ textAlign: "center" }}>Delivery Rate</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {historyList.map((log) => (
                    <tr key={log.batchId}>
                      <td>
                        <code className="cred-code-badge">{log.batchId}</code>
                      </td>
                      <td>{log.date}</td>
                      <td>
                        <span className="cred-dept-main">{log.targetType}</span>
                      </td>
                      <td>{log.scope}</td>
                      <td style={{ textAlign: "center" }}>
                        <strong>{log.count}</strong>
                      </td>
                      <td>{log.generatedBy}</td>
                      <td style={{ textAlign: "center" }}>
                        <span className="cred-delivery-badge">
                          <CheckCircle2 size={13} style={{ color: "#355e3b" }} />
                          {log.emailsSent}/{log.count} Sent
                        </span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <button
                          type="button"
                          className="cms-btn cms-btn-ghost"
                          style={{ padding: "4px 10px", fontSize: 12 }}
                          onClick={() => showToast(`Downloading batch summary report for ${log.batchId}`)}
                        >
                          <Download size={13} />
                          <span>Report</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "settings" && (
          <div className="cred-settings-grid">
            <div className="cred-settings-card">
              <div className="cred-card-header">
                <div>
                  <h3>Employee Credentials Format & ID Policies</h3>
                  <p>Configure default email login format, passwords, and auto-generation rules for staff and faculty.</p>
                </div>
              </div>

              <div className="cred-form-body">
                <div className="cred-form-row">
                  <div className="cred-form-field">
                    <label>Employee Login Email Format</label>
                    <input
                      type="text"
                      value={credentialSettings.facultyEmailFormat || "{empid}@gmail.com"}
                      onChange={(e) =>
                        setCredentialSettings((p) => ({ ...p, facultyEmailFormat: e.target.value }))
                      }
                      placeholder="{empid}@gmail.com"
                    />
                    <small>Template: Use <code>{"{empid}"}</code> for Staff ID (e.g. <code>PCTCH0001@gmail.com</code>)</small>
                  </div>

                  <div className="cred-form-field">
                    <label>Default Initial Password</label>
                    <input
                      type="text"
                      value={credentialSettings.defaultPassword || "Pirnav@123"}
                      onChange={(e) =>
                        setCredentialSettings((p) => ({ ...p, defaultPassword: e.target.value }))
                      }
                      placeholder="Pirnav@123"
                    />
                    <small>Default password sent with profile completion link: <code>{credentialSettings.defaultPassword || "Pirnav@123"}</code></small>
                  </div>
                </div>

                <div className="cred-form-row">
                  <div className="cred-form-field">
                    <label>Faculty Employee ID Prefix</label>
                    <input
                      type="text"
                      value={credentialSettings.facultyPrefix}
                      onChange={(e) =>
                        setCredentialSettings((p) => ({ ...p, facultyPrefix: e.target.value }))
                      }
                    />
                    <small>Sample format: <code>{credentialSettings.facultyPrefix}1001</code></small>
                  </div>

                  <div className="cred-form-field">
                    <label>Student Admission ID Prefix</label>
                    <input
                      type="text"
                      value={credentialSettings.studentPrefix}
                      onChange={(e) =>
                        setCredentialSettings((p) => ({ ...p, studentPrefix: e.target.value }))
                      }
                    />
                    <small>Sample format: <code>{credentialSettings.studentPrefix}26CS01</code></small>
                  </div>
                </div>

                <div className="cred-form-row">
                  <div className="cred-form-field">
                    <label>Random Password Length</label>
                    <select
                      value={credentialSettings.pwdLength}
                      onChange={(e) =>
                        setCredentialSettings((p) => ({ ...p, pwdLength: Number(e.target.value) }))
                      }
                    >
                      <option value={8}>8 Characters (Recommended)</option>
                      <option value={10}>10 Characters</option>
                      <option value={12}>12 Characters (High Security)</option>
                    </select>
                  </div>

                  <div className="cred-form-field">
                    <label>Temporary Password Expiry</label>
                    <select
                      value={credentialSettings.expiryDays}
                      onChange={(e) =>
                        setCredentialSettings((p) => ({ ...p, expiryDays: Number(e.target.value) }))
                      }
                    >
                      <option value={30}>30 Days</option>
                      <option value={60}>60 Days</option>
                      <option value={90}>90 Days</option>
                    </select>
                  </div>
                </div>

                <div className="cred-form-checkboxes">
                  <label className="cred-check-label">
                    <input
                      type="checkbox"
                      checked={credentialSettings.forceChangeOnFirstLogin}
                      onChange={(e) =>
                        setCredentialSettings((p) => ({
                          ...p,
                          forceChangeOnFirstLogin: e.target.checked
                        }))
                      }
                    />
                    <span>Force user to change password on first successful login (Required)</span>
                  </label>

                  <label className="cred-check-label">
                    <input
                      type="checkbox"
                      checked={credentialSettings.autoSendEmail}
                      onChange={(e) =>
                        setCredentialSettings((p) => ({
                          ...p,
                          autoSendEmail: e.target.checked
                        }))
                      }
                    />
                    <span>Automatically dispatch welcome email upon generating credentials</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="cred-settings-card">
              <div className="cred-card-header">
                <div>
                  <h3>Email Notification Template</h3>
                  <p>Customize the email message sent to users with their login credentials.</p>
                </div>
              </div>

              <div className="cred-form-body">
                <div className="cred-form-field">
                  <label>Email Subject Line</label>
                  <input
                    type="text"
                    value={credentialSettings.emailSubject}
                    onChange={(e) =>
                      setCredentialSettings((p) => ({ ...p, emailSubject: e.target.value }))
                    }
                  />
                </div>

                <div className="cred-form-field">
                  <label>Email Sender Address</label>
                  <input
                    type="email"
                    value={credentialSettings.senderEmail}
                    onChange={(e) =>
                      setCredentialSettings((p) => ({ ...p, senderEmail: e.target.value }))
                    }
                  />
                </div>

                <div className="cred-email-preview-box">
                  <div className="cred-email-head">Preview Email Body</div>
                  <div className="cred-email-content">
                    <p>Dear <strong>{"{User_Name}"}</strong>,</p>
                    <p>Welcome to PIRNAV College Management Portal. Your login credentials have been generated:</p>
                    <div className="cred-email-box">
                      <div><strong>Portal URL:</strong> https://erp.pirnav.edu.in/login</div>
                      <div><strong>Login Mail:</strong> {credentialSettings.facultyEmailFormat ? credentialSettings.facultyEmailFormat.replace(/\{empid\}/gi, "PCTCH0001") : "PCTCH0001@gmail.com"}</div>
                      <div><strong>Password:</strong> {credentialSettings.defaultPassword || "Pirnav@123"}</div>
                    </div>
                    <p>Please log in immediately and update your password when prompted.</p>
                    <p>Regards,<br />PIRNAV College Administration</p>
                  </div>
                </div>

                <div style={{ marginTop: 20, textAlign: "right" }}>
                  <button
                    type="button"
                    className="cms-btn cms-btn-primary"
                    onClick={() => {
                      try {
                        localStorage.setItem("pjc-credential-settings", JSON.stringify(credentialSettings));
                        window.dispatchEvent(new CustomEvent("credential-settings-updated", { detail: credentialSettings }));
                      } catch {}
                      showToast("Credential settings saved successfully.");
                    }}
                  >
                    Save Credential Settings
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {isWizardOpen && (
          <Modal
            title={`Bulk Credential Generation Wizard (${wizardConfig.targetType === "students" ? "Students" : "Faculty"})`}
            onClose={() => setIsWizardOpen(false)}
            size="lg"
          >
            <div className="cred-wizard-container">
              <div className="cred-wizard-steps">
                <div className={`cred-wstep ${wizardStep >= 1 ? "is-active" : ""}`}>
                  <span className="cred-wstep-num">1</span>
                  <span className="cred-wstep-text">Select Users</span>
                </div>
                <div className="cred-wstep-line" />
                <div className={`cred-wstep ${wizardStep >= 2 ? "is-active" : ""}`}>
                  <span className="cred-wstep-num">2</span>
                  <span className="cred-wstep-text">Policy & Security</span>
                </div>
                <div className="cred-wstep-line" />
                <div className={`cred-wstep ${wizardStep >= 3 ? "is-active" : ""}`}>
                  <span className="cred-wstep-num">3</span>
                  <span className="cred-wstep-text">Preview List</span>
                </div>
                <div className="cred-wstep-line" />
                <div className={`cred-wstep ${wizardStep >= 4 ? "is-active" : ""}`}>
                  <span className="cred-wstep-num">4</span>
                  <span className="cred-wstep-text">Dispatch & Result</span>
                </div>
              </div>

              {wizardStep === 1 && (
                <div className="cred-wizard-body">
                  <h4>Step 1: Choose Generation Target Scope</h4>
                  <p className="cred-wsub">Select which user accounts should receive new credentials.</p>

                  <div className="cred-scope-options">
                    <label className={`cred-scope-card ${wizardConfig.scopeOption === "pending" ? "selected" : ""}`}>
                      <input
                        type="radio"
                        name="scope"
                        value="pending"
                        checked={wizardConfig.scopeOption === "pending"}
                        onChange={(e) =>
                          setWizardConfig((p) => ({ ...p, scopeOption: e.target.value }))
                        }
                      />
                      <div>
                        <strong>All Pending Accounts (Un-generated)</strong>
                        <p>Automatically generate credentials for users who do not have a temporary password yet.</p>
                      </div>
                    </label>

                    {selectedIds.length > 0 && (
                      <label className={`cred-scope-card ${wizardConfig.scopeOption === "selected" ? "selected" : ""}`}>
                        <input
                          type="radio"
                          name="scope"
                          value="selected"
                          checked={wizardConfig.scopeOption === "selected"}
                          onChange={(e) =>
                            setWizardConfig((p) => ({ ...p, scopeOption: e.target.value }))
                          }
                        />
                        <div>
                          <strong>Selected Users from Table ({selectedIds.length} Users)</strong>
                          <p>Generate credentials specifically for the users currently selected in the table.</p>
                        </div>
                      </label>
                    )}

                    <label className={`cred-scope-card ${wizardConfig.scopeOption === "department" ? "selected" : ""}`}>
                      <input
                        type="radio"
                        name="scope"
                        value="department"
                        checked={wizardConfig.scopeOption === "department"}
                        onChange={(e) =>
                          setWizardConfig((p) => ({ ...p, scopeOption: e.target.value }))
                        }
                      />
                      <div>
                        <strong>Filter by Department / Course Group</strong>
                        <p>Select a specific department or student level to generate credentials in bulk.</p>
                      </div>
                    </label>
                  </div>

                  {wizardConfig.scopeOption === "department" && (
                    <div className="cred-form-field" style={{ marginTop: 15 }}>
                      <label>Select Target Department / Course</label>
                      <select
                        value={wizardConfig.deptOrLevel}
                        onChange={(e) =>
                          setWizardConfig((p) => ({ ...p, deptOrLevel: e.target.value }))
                        }
                      >
                        <option value="all">All Departments / Courses</option>
                        {deptLevelOptions.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

              {wizardStep === 2 && (
                <div className="cred-wizard-body">
                  <h4>Step 2: Password Strategy & Security Rules</h4>
                  <p className="cred-wsub">Define credential formats and enforcement policies.</p>

                  <div className="cred-form-grid-2">
                    <div className="cred-form-field">
                      <label>Login Username ID Format</label>
                      <input
                        type="text"
                        value={wizardConfig.prefix}
                        onChange={(e) =>
                          setWizardConfig((p) => ({ ...p, prefix: e.target.value }))
                        }
                      />
                      <small>Prefix appended before Roll No or Employee ID</small>
                    </div>

                    <div className="cred-form-field">
                      <label>Password Generation Strategy</label>
                      <select
                        value={wizardConfig.pwdStrategy}
                        onChange={(e) =>
                          setWizardConfig((p) => ({ ...p, pwdStrategy: e.target.value }))
                        }
                      >
                        <option value="auto">Auto-Generated Secure 8-Character (Random)</option>
                        <option value="pattern">Pattern Based (PIRNAV@Year)</option>
                      </select>
                    </div>
                  </div>

                  <div className="cred-form-checkboxes" style={{ marginTop: 20 }}>
                    <label className="cred-check-label">
                      <input
                        type="checkbox"
                        checked={wizardConfig.forceChange}
                        onChange={(e) =>
                          setWizardConfig((p) => ({ ...p, forceChange: e.target.checked }))
                        }
                      />
                      <span>Enforce Mandatory Password Change on First Portal Login</span>
                    </label>
                  </div>
                </div>
              )}

              {wizardStep === 3 && (
                <div className="cred-wizard-body">
                  <h4>Step 3: Preview Generated Credentials ({wizardPreviewData.length} Users)</h4>
                  <p className="cred-wsub">Review generated usernames and temporary passwords before finalizing.</p>

                  <div className="cred-preview-scroll">
                    <table className="cred-data-table">
                      <thead>
                        <tr>
                          <th>User ID</th>
                          <th>Name</th>
                          <th>Login Username</th>
                          <th>Generated Password</th>
                          <th>Email Address</th>
                        </tr>
                      </thead>
                      <tbody>
                        {wizardPreviewData.map((item) => (
                          <tr key={item.id}>
                            <td><code>{item.id}</code></td>
                            <td><strong>{item.name}</strong></td>
                            <td><span className="cred-code-badge">{item.loginId}</span></td>
                            <td><code>{item.generatedPwd}</code></td>
                            <td>{item.email}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="cred-info-banner">
                    <Info size={18} />
                    <span>
                      Upon confirming, user records will be updated. If email dispatch is enabled, welcome emails will be sent immediately.
                    </span>
                  </div>
                </div>
              )}

              {wizardStep === 4 && (
                <div className="cred-wizard-body cred-wizard-success">
                  {isWizardSending ? (
                    <div className="cred-sending-state">
                      <RefreshCw size={36} className="cred-spinner" />
                      <h4>Dispatching Credentials via Secure SMTP Mailer...</h4>
                      <div className="cred-progress-outer">
                        <div
                          className="cred-progress-inner"
                          style={{ width: `${wizardSendingProgress}%` }}
                        />
                      </div>
                      <span>{wizardSendingProgress}% Completed</span>
                    </div>
                  ) : (
                    <div className="cred-result-state">
                      <div className="cred-success-icon">
                        <CheckCircle2 size={48} />
                      </div>
                      <h3>Credentials Generated & Dispatched Successfully!</h3>
                      <p>All temporary passwords have been stored securely and dispatched according to your settings.</p>

                      <div className="cred-result-summary-grid">
                        <div className="cred-res-card">
                          <span className="cred-res-val">{wizardResult?.total}</span>
                          <span className="cred-res-lbl">Total Processed</span>
                        </div>
                        <div className="cred-res-card green">
                          <span className="cred-res-val">{wizardResult?.sent}</span>
                          <span className="cred-res-lbl">Emails Delivered</span>
                        </div>
                        <div className="cred-res-card red">
                          <span className="cred-res-val">{wizardResult?.failed}</span>
                          <span className="cred-res-lbl">Failed Dispatches</span>
                        </div>
                      </div>

                      <div className="cred-post-actions">
                        <button
                          type="button"
                          className="cms-btn cms-btn-primary"
                          onClick={() => handleBulkDownloadPDF()}
                        >
                          <Printer size={16} />
                          <span>Print Password Slips</span>
                        </button>
                        <button
                          type="button"
                          className="cms-btn cms-btn-ghost"
                          onClick={() => handleBulkDownloadExcel()}
                        >
                          <FileSpreadsheet size={16} />
                          <span>Export Batch Excel</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="cred-wizard-footer">
                {wizardStep > 1 && wizardStep < 4 && !isWizardSending && (
                  <button
                    type="button"
                    className="cms-btn cms-btn-ghost"
                    onClick={() => setWizardStep((s) => s - 1)}
                  >
                    <ArrowLeft size={14} />
                    <span>Previous</span>
                  </button>
                )}

                <div style={{ flex: 1 }} />

                {wizardStep < 3 && (
                  <button
                    type="button"
                    className="cms-btn cms-btn-primary"
                    onClick={handleWizardNext}
                  >
                    <span>Next Step</span>
                    <ChevronRight size={14} />
                  </button>
                )}

                {wizardStep === 3 && (
                  <button
                    type="button"
                    className="cms-btn cms-btn-primary"
                    onClick={handleWizardNext}
                  >
                    <Zap size={15} />
                    <span>Confirm & Generate Credentials</span>
                  </button>
                )}

                {wizardStep === 4 && !isWizardSending && (
                  <button
                    type="button"
                    className="cms-btn cms-btn-primary"
                    onClick={() => setIsWizardOpen(false)}
                  >
                    <span>Close Wizard & View Table</span>
                  </button>
                )}
              </div>
            </div>
          </Modal>
        )}

        {detailUser && (
          <Modal
            title={`Credential Record — ${detailUser.name}`}
            onClose={() => setDetailUser(null)}
            size="md"
          >
            <div className="cred-detail-modal-body">
              <div className="cred-detail-user-card">
                <div className="cred-detail-avatar">{detailUser.name.charAt(0)}</div>
                <div className="cred-detail-info">
                  <h4>{detailUser.name}</h4>
                  <p>{detailUser.dept || detailUser.level} • {detailUser.designation || detailUser.group}</p>
                  <span className="cred-detail-id">{detailUser.id}</span>
                </div>
              </div>

              <div className="cred-detail-fields">
                <div className="cred-dfield">
                  <label>Login Username ID</label>
                  <code>{detailUser.loginId || detailUser.id}</code>
                </div>

                <div className="cred-dfield">
                  <label>Temporary Password</label>
                  <div className="cred-copy-box">
                    <code>{detailUser.tempPassword || "Not Generated Yet"}</code>
                    {detailUser.tempPassword && (
                      <button
                        type="button"
                        className="cred-copy-btn"
                        onClick={() => handleCopyText(detailUser.tempPassword)}
                        title="Copy to clipboard"
                      >
                        {copySuccess ? <Check size={14} style={{ color: "#355e3b" }} /> : <Copy size={14} />}
                      </button>
                    )}
                  </div>
                </div>

                <div className="cred-dfield">
                  <label>Registered Email Address</label>
                  <span>{detailUser.email}</span>
                </div>

                <div className="cred-dfield">
                  <label>Account & Credential Status</label>
                  <StatusBadge value={detailUser.credStatus} />
                </div>

                <div className="cred-dfield">
                  <label>Last Dispatched Timestamp</label>
                  <span>{detailUser.lastSent}</span>
                </div>

                <div className="cred-dfield">
                  <label>Mandatory First-Login Password Change</label>
                  <span>{detailUser.forceChange ? "Enabled (Required)" : "Disabled"}</span>
                </div>
              </div>

              <div className="cred-detail-foot-actions">
                <button
                  type="button"
                  className="cms-btn cms-btn-ghost"
                  onClick={() => {
                    handleSingleSendEmail(detailUser);
                    setDetailUser(null);
                  }}
                >
                  <Mail size={15} />
                  <span>Send Email</span>
                </button>

                <button
                  type="button"
                  className="cms-btn cms-btn-primary"
                  onClick={() => {
                    handleSingleGenerate(detailUser);
                    setDetailUser(null);
                  }}
                >
                  <RefreshCw size={15} />
                  <span>Reset / Regenerate Password</span>
                </button>
              </div>
            </div>
          </Modal>
        )}

        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ message: "", type: "success" })}
        />
      </div>
    </DashboardLayout>
  );
}

