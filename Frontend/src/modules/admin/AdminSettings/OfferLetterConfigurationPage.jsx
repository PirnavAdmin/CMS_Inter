import React, { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import {
  FileText,
  FileSignature,
  Plus,
  Eye,
  Edit,
  Save,
  Printer,
  Download,
  Copy,
  Trash2,
  Building2,
  Mail,
  ShieldCheck,
  Send,
  SlidersHorizontal,
  ArrowLeft,
  Sparkles,
  Layers,
  Check,
  X,
  CheckCircle2,
  ChevronDown,
  FileSpreadsheet,
  FileCode,
  Hash,
  Clock,
  AlertTriangle,
  Calendar,
  UserCheck,
  RefreshCw,
  Search,
  Filter,
} from "lucide-react";
import * as XLSX from "xlsx";
import DashboardLayout from "@/shared/layouts/DashboardLayout/DashboardLayout.jsx";
import { useCampusContext } from "@/context/CampusContext.jsx";
import { useAcademicContext } from "@/context/AcademicContext.jsx";
import apiClient from "@/api/axios.js";
import templateApi from "@/api/templateApi.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import { readNumberSeriesSettings } from "@/data/numberSeriesData.js";
import { getNumberSeriesList } from "@/api/numberSeriesApi.js";
import pirnavCollegeCrest from "@/assets/pirnav-college-crest.png";
import templatesImage from "@/assets/settings-3d/templates.png";
import "./OfferLetterConfigurationPage.css";

// Preset Templates - Intermediate College Standards (BIEAP / TGBIE)
const PRESET_TEMPLATES = [
  {
    id: "OFFER_LETTER_STANDARD",
    templateCode: "OFFER_LETTER_STANDARD",
    title: "Junior Lecturer / Faculty Appointment (IPE & Competitive Coaching)",
    category: "Offer Letter",
    roleCategory: "Teaching Staff",
    isDefault: true,
    version: "1.0",
    numberSeriesCode: "OFFER_LETTER_NO",
    subject: "Letter of Appointment & Service Terms – Junior Lecturer",
    institutionName: "PIRNAV EDUCATIONAL SOCIETY",
    departmentOffice: "DIRECTORATE OF INTERMEDIATE ACADEMICS & HUMAN RESOURCES",
    documentHeading: "OFFICIAL APPOINTMENT ORDER – JUNIOR COLLEGE FACULTY",
    probationPeriodMonths: 6,
    noticePeriodMonths: 3,
    openingStatement:
      "We have pleasure in offering you an official appointment as {{Designation}} at our {{PrimaryCampus}} campus under the Board of Intermediate Education curriculum.",
    termsAndConditions:
      "1. Teaching Obligations: The Lecturer shall conduct regular theory periods, laboratory practicals, and special study hours in accordance with the Board of Intermediate Education (BIEAP/TGBIE) curriculum.\n2. Student Academic Progress: Responsible for student syllabus completion, weekly unit test valuations, and intensive coaching for Intermediate Public Examinations (IPE) and integrated competitive entrance examinations (EAMCET / JEE / NEET).\n3. Examination Duties: Mandatory participation in BIEAP/TGBIE practical examination supervision and spot valuation.\n4. Service Notice Period: Service notice period is strictly three (3) calendar months or equivalent gross salary in lieu thereof.\n5. Campus Assignments: The management reserves the right to assign teaching duties across affiliated junior college campuses based on institutional requirements.",
    authorizedSignatoryName: "Dr. K. V. Ramanamurthy",
    authorizedSignatoryRole: "Director of Human Resources",
    includeSalaryTable: true,
    includeSpecsBox: true,
    includeAcceptanceSlip: true,
  },
  {
    id: "OFFER_LETTER_PRINCIPAL",
    templateCode: "OFFER_LETTER_PRINCIPAL",
    title: "Campus Principal & Executive Head of Institution Appointment",
    category: "Offer Letter",
    roleCategory: "Principal",
    isDefault: false,
    version: "1.1",
    numberSeriesCode: "OFFER_LETTER_NO",
    subject: "Executive Commission & Letter of Appointment – Campus Principal",
    institutionName: "PIRNAV EDUCATIONAL SOCIETY",
    departmentOffice: "OFFICE OF THE SECRETARY & GOVERNING BODY",
    documentHeading: "EXECUTIVE APPOINTMENT & PRINCIPAL COMMISSION – INTERMEDIATE COLLEGE",
    probationPeriodMonths: 12,
    noticePeriodMonths: 6,
    openingStatement:
      "The Board of Governors is pleased to appoint you as Campus Principal & Executive Head of Institution for {{PrimaryCampus}}, with dual institutional purview over Intermediate academic instruction (BIEAP / TGBIE curriculum) and campus administrative operations.",
    termsAndConditions:
      "1. Institutional Governance: The Principal exercises dual oversight over Teaching Faculty (syllabus pacing, lesson plans, lab practicals) and Non-Teaching Staff (campus accounting, fee collections, student registers, timings, discipline).\n2. Board Compliance & Academic Results: Directly responsible for statutory Board of Intermediate Education affiliations, IPE board examination center management, student pass percentages, and integrated EAMCET / JEE / NEET competitive ranks.\n3. Administration & Fee Governance: Accountable for campus fee structures, student admissions, fee reconciliation, campus infrastructure security, and Loss of Pay (LOP) policy enforcement.\n4. Notice Period: Service notice period for Principal leadership is six (6) calendar months or equivalent salary in lieu thereof to maintain institutional leadership continuity.\n5. Multi-Campus Oversight: The Governing Body may depute cross-campus administrative or academic inspection duties across affiliated junior colleges based on operational exigencies.",
    authorizedSignatoryName: "N. Venkateswara Rao",
    authorizedSignatoryRole: "Secretary & Managing Trustee",
    includeSalaryTable: true,
    includeSpecsBox: true,
    includeAcceptanceSlip: true,
  },
  {
    id: "OFFER_LETTER_HOD",
    templateCode: "OFFER_LETTER_HOD",
    title: "Head of Department (HOD) & Senior Faculty Appointment",
    category: "Offer Letter",
    roleCategory: "HOD / Senior Faculty",
    isDefault: false,
    version: "1.0",
    numberSeriesCode: "OFFER_LETTER_NO",
    subject: "Letter of Appointment – Head of Department (HOD)",
    institutionName: "PIRNAV EDUCATIONAL SOCIETY",
    departmentOffice: "DIRECTORATE OF INTERMEDIATE ACADEMICS & HUMAN RESOURCES",
    documentHeading: "APPOINTMENT ORDER – HEAD OF DEPARTMENT & SENIOR LECTURER",
    probationPeriodMonths: 6,
    noticePeriodMonths: 3,
    openingStatement:
      "We are pleased to appoint you as Head of Department (HOD) & Senior Lecturer at our {{PrimaryCampus}} campus under the Board of Intermediate Education curriculum.",
    termsAndConditions:
      "1. Departmental Leadership: Lead teaching faculty in the department, supervise theory lecture coverage, laboratory practical logbooks, and enforce BIEAP/TGBIE curriculum benchmarks.\n2. Academic Quality & Practical Examinations: Oversee science laboratories, ensure safety protocols, coordinate internal college examinations, and liaise with the Principal for IPE board examinations.\n3. Mentorship & Valuation: Mentor Junior Lecturers, review student progress in weekly tests, and coordinate IPE external spot valuation assignments.\n4. Service Notice Period: Service notice period is strictly three (3) calendar months or equivalent salary in lieu thereof.",
    authorizedSignatoryName: "Dr. K. V. Ramanamurthy",
    authorizedSignatoryRole: "Director of Human Resources",
    includeSalaryTable: true,
    includeSpecsBox: true,
    includeAcceptanceSlip: true,
  },
  {
    id: "OFFER_LETTER_NON_TEACHING",
    templateCode: "OFFER_LETTER_NON_TEACHING",
    title: "Campus Administrative & Support Staff Appointment",
    category: "Offer Letter",
    roleCategory: "Non-Teaching Staff",
    isDefault: false,
    version: "1.0",
    numberSeriesCode: "OFFER_LETTER_NO",
    subject: "Letter of Appointment & Service Terms – Administrative Staff",
    institutionName: "PIRNAV EDUCATIONAL SOCIETY",
    departmentOffice: "OFFICE OF HUMAN RESOURCES & CAMPUS ADMINISTRATION",
    documentHeading: "OFFICIAL APPOINTMENT ORDER – CAMPUS ADMINISTRATIVE & SUPPORT STAFF",
    probationPeriodMonths: 6,
    noticePeriodMonths: 1,
    openingStatement:
      "We are pleased to offer you appointment as {{Designation}} at our {{PrimaryCampus}} campus.",
    termsAndConditions:
      "1. Campus Duties: Carry out designated administrative, accounting, student registry, laboratory assistance, or campus maintenance tasks under the direction of the Principal and Administrative Officer.\n2. Diligence & Timings: Strictly adhere to campus biometric timings, fee counter protocols, admission record safety, and institutional asset care. Unexcused absence will incur Loss of Pay (LOP) deductions.\n3. Service Notice Period: Service notice period is strictly one (1) calendar month or equivalent gross salary in lieu thereof.\n4. Code of Conduct: Abide by institutional service bylaws and maintain absolute confidentiality of student records and accounts.",
    authorizedSignatoryName: "P. R. Mohan",
    authorizedSignatoryRole: "Registrar / Administrative Officer",
    includeSalaryTable: true,
    includeSpecsBox: true,
    includeAcceptanceSlip: true,
  },
];

// Clean Dynamic Tokens
// Available Dynamic Tokens (Department, Officer, Reporting Authority, Offer Letter Number removed as required)
const DEFAULT_PLACEHOLDER_TOKENS = [
  { token: "{{StaffName}}", label: "Staff Name", category: "Candidate" },
  { token: "{{EmployeeId}}", label: "Employee ID", category: "Candidate" },
  { token: "{{DateOfJoining}}", label: "Date of Joining", category: "Candidate" },
  { token: "{{Designation}}", label: "Designation", category: "Position" },
  { token: "{{Department}}", label: "Department", category: "Position" },
  { token: "{{PrimaryCampus}}", label: "Campus Name", category: "Position" },
  { token: "{{BoardName}}", label: "Board Name (BIEAP / TGBIE)", category: "Position" },
  { token: "{{RoleCategory}}", label: "Role Category", category: "Position" },
  { token: "{{ReportingAuthority}}", label: "Reporting Authority", category: "Position" },
  { token: "{{BasicSalary}}", label: "Basic Monthly Salary", category: "Compensation" },
  { token: "{{GrossSalary}}", label: "Gross Monthly Salary", category: "Compensation" },
  { token: "{{MonthlyGross}}", label: "Monthly Gross Pay", category: "Compensation" },
  { token: "{{AnnualCTC}}", label: "Annual CTC", category: "Compensation" },
  { token: "{{OfferDate}}", label: "Offer Issue Date", category: "Document" },
  { token: "{{DepartmentOffice}}", label: "Issuing Directorate", category: "Document" },
  { token: "{{InstitutionName}}", label: "Institution Name", category: "Branding" },
];

// Blank template for creating a new custom template
const BLANK_TEMPLATE = {
  id: "",
  templateCode: "",
  title: "",
  category: "Offer Letter",
  roleCategory: "Teaching Staff",
  isDefault: false,
  version: "1.0",
  numberSeriesCode: "OFFER_LETTER_NO",
  subject: "Letter of Appointment & Service Terms – Junior College Faculty",
  institutionName: "PIRNAV EDUCATIONAL SOCIETY",
  departmentOffice: "DIRECTORATE OF INTERMEDIATE ACADEMICS & HUMAN RESOURCES",
  documentHeading: "OFFICIAL APPOINTMENT ORDER – JUNIOR COLLEGE FACULTY",
  probationPeriodMonths: 6,
  noticePeriodMonths: 3,
  openingStatement:
    "We have pleasure in offering you an official appointment as {{Designation}} at our {{PrimaryCampus}} campus under the Board of Intermediate Education curriculum.",
  termsAndConditions:
    "1. Teaching Obligations: The Lecturer shall conduct regular theory periods, laboratory practicals, and special study hours in accordance with the Board of Intermediate Education (BIEAP/TGBIE) curriculum.\n2. Student Academic Progress: Responsible for student syllabus completion, weekly unit test valuations, and intensive coaching for Intermediate Public Examinations (IPE) and integrated competitive entrance examinations (EAMCET / JEE / NEET).\n3. Examination Duties: Mandatory participation in BIEAP/TGBIE practical examination supervision and spot valuation.\n4. Service Notice Period: Service notice period is strictly three (3) calendar months or equivalent gross salary in lieu thereof.\n5. Campus Assignments: The management reserves the right to assign teaching duties across affiliated junior college campuses based on institutional requirements.",
  authorizedSignatoryName: "Dr. K. V. Ramanamurthy",
  authorizedSignatoryRole: "Director of Human Resources",
  includeSalaryTable: true,
  includeSpecsBox: true,
  includeAcceptanceSlip: true,
};

export default function OfferLetterConfigurationPage() {
  const navigate = useNavigate();
  const { selectedCampus } = useCampusContext?.() || {};
  const { selectedBoard } = useAcademicContext?.() || {};

  // 3 Tabs: catalog, editor, automation
  const [activeTab, setActiveTab] = useState("catalog");

  // State
  const [templates, setTemplates] = useState(() => {
    try {
      const stored = localStorage.getItem("cms_offer_letter_templates");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return PRESET_TEMPLATES;
  });

  const [selectedTemplateId, setSelectedTemplateId] = useState(PRESET_TEMPLATES[0].id);
  const [dbRoles, setDbRoles] = useState([]);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState("success");
  const [saving, setSaving] = useState(false);

  // Dynamic token management with admin-created custom tokens
  const [availableTokens, setAvailableTokens] = useState(() => {
    try {
      const custom = localStorage.getItem("cms_custom_tokens");
      if (custom) {
        const parsed = JSON.parse(custom);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return [...DEFAULT_PLACEHOLDER_TOKENS, ...parsed];
        }
      }
    } catch {}
    return DEFAULT_PLACEHOLDER_TOKENS;
  });
  const [showAddTokenModal, setShowAddTokenModal] = useState(false);
  const [newTokenKey, setNewTokenKey] = useState("");
  const [newTokenLabel, setNewTokenLabel] = useState("");
  const [newTokenFallback, setNewTokenFallback] = useState("");

  // Dedicated draft state for creating a new template (not added to catalog until user clicks Save)
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newTemplateDraft, setNewTemplateDraft] = useState(BLANK_TEMPLATE);

  // Preview Mode inside Editor (document vs pdf)
  const [editorPreviewMode, setEditorPreviewMode] = useState("document");
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const exportDropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(event.target)) {
        setExportDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Mini Preview Modal Popup for Catalog
  const [previewModalTemplate, setPreviewModalTemplate] = useState(null);
  const [modalPreviewMode, setModalPreviewMode] = useState("document");

  // Automation triggers state
  const [automationSettings, setAutomationSettings] = useState(() => {
    try {
      const stored = localStorage.getItem("cms_offer_letter_automation");
      if (stored) return JSON.parse(stored);
    } catch {}
    return {
      autoSendOnSubmission: true,
      autoSendOnApproval: true,
      emailSubject: "Official Letter of Appointment & Offer Letter - {{EmployeeId}}",
      emailBody:
        "Dear {{StaffName}},\n\nCongratulations! Your staff onboarding profile has been processed.\nAttached is your official Letter of Appointment and Offer Letter.\n\nWelcome to Pirnav Educational Society.",
      ccHrEmail: "hr@pirnav.edu.in",
      attachPdfFilenamePattern: "Offer_Letter_{{EmployeeId}}.pdf",
      workflowPreference: "Automatic",
    };
  });

  const [searchParams] = useSearchParams();
  const [requests, setRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [requestsSearch, setRequestsSearch] = useState("");
  const [requestsStatusFilter, setRequestsStatusFilter] = useState("all");
  const [highlightedStaffId, setHighlightedStaffId] = useState(null);

  // Decision Modal / Drawer States
  const [activeVerifyRequest, setActiveVerifyRequest] = useState(null);
  const [activeApproveRequest, setActiveApproveRequest] = useState(null);
  const [activeRejectRequest, setActiveRejectRequest] = useState(null);
  const [isSubmittingDecision, setIsSubmittingDecision] = useState(false);

  // Rejection Form
  const [rejectionScenario, setRejectionScenario] = useState("Correction");
  const [rejectionReason, setRejectionReason] = useState("");
  const [revisedDate, setRevisedDate] = useState("");
  const [additionalInstructions, setAdditionalInstructions] = useState("");

  // Verification & Approval forms
  const [verificationNotes, setVerificationNotes] = useState("");
  const [approvalRemarks, setApprovalRemarks] = useState("");

  const loadWorkflowConfig = async () => {
    try {
      const res = await apiClient.get(apiEndpoints.staff.offerLetterWorkflowConfig);
      if (res?.data) {
        setAutomationSettings((prev) => ({
          ...prev,
          ...res.data,
          workflowPreference: res.data.workflowPreference || (res.data.autoSendOnSubmission ? "Automatic" : "AdminApproval"),
        }));
      }
    } catch (e) {
      console.warn("Using cached offer letter workflow config:", e);
    }
  };

  const loadRequests = async () => {
    setLoadingRequests(true);
    try {
      const res = await apiClient.get(apiEndpoints.staff.offerLetterWorkflowRequests);
      if (Array.isArray(res?.data)) {
        setRequests(res.data);
      }
    } catch (e) {
      console.warn("Could not load onboarding requests:", e);
    } finally {
      setLoadingRequests(false);
    }
  };

  useEffect(() => {
    loadWorkflowConfig();
    loadRequests();
  }, []);

  useEffect(() => {
    const tab = searchParams.get("tab");
    const staffId = searchParams.get("staffId");
    if (tab === "automation" || staffId) {
      setActiveTab("automation");
    }
    if (staffId) {
      const idNum = Number(staffId);
      setHighlightedStaffId(idNum);
      setTimeout(() => {
        const el = document.getElementById(`staff-row-${idNum}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 500);
    }
  }, [searchParams]);

  // Current active template or new draft being edited
  const activeTemplate = useMemo(() => {
    return templates.find((t) => t.id === selectedTemplateId) || templates[0] || PRESET_TEMPLATES[0];
  }, [templates, selectedTemplateId]);

  const currentDraft = isCreatingNew ? newTemplateDraft : activeTemplate;

  // Live staff options for realistic candidate proofing & actual salary verification
  const [proofingStaffList, setProofingStaffList] = useState([]);
  const [selectedProofingStaffId, setSelectedProofingStaffId] = useState("sample");
  const [proofingStaffPayroll, setProofingStaffPayroll] = useState(null);
  const [loadingProofingPayroll, setLoadingProofingPayroll] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadProofingStaff() {
      try {
        const campusId = selectedCampus?.campusId ?? selectedCampus?.id;
        const res = await apiClient.get(apiEndpoints.faculty.list, {
          params: { PageNumber: 1, PageSize: 50, CampusId: campusId || undefined }
        });
        const items = res?.data?.items || res?.data?.data || (Array.isArray(res?.data) ? res.data : []);
        if (isMounted && Array.isArray(items)) {
          setProofingStaffList(items);
        }
      } catch (err) {
        console.warn("Failed to load staff list for offer letter proofing:", err);
      }
    }
    loadProofingStaff();
    return () => { isMounted = false; };
  }, [selectedCampus]);

  useEffect(() => {
    let isMounted = true;
    async function fetchProofingPayroll() {
      if (selectedProofingStaffId === "sample") {
        setProofingStaffPayroll(null);
        return;
      }
      setLoadingProofingPayroll(true);
      try {
        const res = await apiClient.get(`/api/v1/staff/${selectedProofingStaffId}/payroll-details`);
        if (isMounted && res?.data) {
          setProofingStaffPayroll(res.data);
        }
      } catch (err) {
        // Fallback: extract from staff record directly
        const staffObj = proofingStaffList.find((s) => String(s.id) === String(selectedProofingStaffId));
        if (staffObj && isMounted) {
          let parsedBank = {};
          try { parsedBank = typeof staffObj.bankDetailsJson === "string" ? JSON.parse(staffObj.bankDetailsJson) : (staffObj.bankDetailsJson || {}); } catch {}
          setProofingStaffPayroll({
            basicSalary: parsedBank.BasicSalary || null,
            grossSalary: parsedBank.GrossSalary || parsedBank.MonthlyGross || null
          });
        }
      } finally {
        if (isMounted) setLoadingProofingPayroll(false);
      }
    }
    fetchProofingPayroll();
    return () => { isMounted = false; };
  }, [selectedProofingStaffId, proofingStaffList]);

  const activeCandidate = useMemo(() => {
    const campusName = selectedCampus?.campusName || selectedCampus?.name || "Main Campus (HQ)";
    const campusCode = selectedCampus?.campusCode || selectedCampus?.code || "PC";
    const boardName = selectedBoard?.name || selectedBoard?.boardName || "Board of Intermediate Education, Andhra Pradesh (BIEAP)";
    const now = new Date();
    const dateStr = now.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

    // Check if admin selected a real staff member for live offer letter proofing
    const realStaff = selectedProofingStaffId !== "sample"
      ? proofingStaffList.find((s) => String(s.id) === String(selectedProofingStaffId))
      : null;

    if (realStaff) {
      const sFullName = realStaff.fullName || [realStaff.firstName, realStaff.lastName].filter(Boolean).join(" ") || "Faculty Member";
      const empId = realStaff.employeeId || `STF${realStaff.id}`;
      const desig = realStaff.designation || currentDraft.roleCategory || "Junior Lecturer";
      const dept = realStaff.department || "Intermediate Academics";
      const roleCat = realStaff.staffType || currentDraft.roleCategory || "Teaching Staff";
      const sCampus = realStaff.campusName || campusName;
      const sBoard = realStaff.boardName || realStaff.board || boardName;

      // Authentic salary resolution from payroll API or staff details without fake fallbacks
      let basicVal = proofingStaffPayroll?.basicSalary;
      let grossVal = proofingStaffPayroll?.grossSalary;

      if (!basicVal || !grossVal) {
        try {
          const bank = typeof realStaff.bankDetailsJson === "string" ? JSON.parse(realStaff.bankDetailsJson) : (realStaff.bankDetailsJson || {});
          if (!basicVal) basicVal = bank.BasicSalary;
          if (!grossVal) grossVal = bank.GrossSalary || bank.MonthlyGross;
        } catch {}
      }

      const basicNum = Number(basicVal);
      const grossNum = Number(grossVal);

      const basicStr = !isNaN(basicNum) && basicNum > 0
        ? `₹${basicNum.toLocaleString("en-IN")}`
        : "As per institutional pay scale";

      const grossStr = !isNaN(grossNum) && grossNum > 0
        ? `₹${grossNum.toLocaleString("en-IN")}`
        : "As per institutional pay scale";

      const ctcStr = !isNaN(grossNum) && grossNum > 0
        ? `₹${(grossNum * 12).toLocaleString("en-IN")}`
        : "As per institutional pay scale";

      return {
        id: `staff-${realStaff.id}`,
        isRealStaff: true,
        staffId: realStaff.id,
        label: `${sFullName} (${empId})`,
        data: {
          StaffName: sFullName,
          EmployeeId: empId,
          Designation: desig,
          Department: dept,
          PrimaryCampus: sCampus,
          BoardName: sBoard,
          RoleCategory: roleCat,
          DateOfJoining: realStaff.joiningDate ? new Date(realStaff.joiningDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : dateStr,
          OfferDate: dateStr,
          DepartmentOffice: currentDraft.departmentOffice || "DIRECTORATE OF INTERMEDIATE ACADEMICS & HUMAN RESOURCES",
          ReportingManager: currentDraft.reportingAuthority || "Campus Principal",
          ProbationPeriod: `${currentDraft.probationPeriodMonths || 6} Months`,
          BasicSalary: basicStr,
          GrossSalary: grossStr,
          MonthlyGross: grossStr,
          Salary: grossStr,
          AnnualCTC: ctcStr,
          BasicPay: basicStr,
          AnnualCtc: ctcStr,
          Hra: "As per institutional bylaws",
          SpecialAllowance: "Included in Gross Salary",
          InstitutionName: currentDraft.institutionName || "PIRNAV EDUCATIONAL SOCIETY",
        },
      };
    }

    const isPrincipal = (currentDraft.roleCategory || "").toLowerCase().includes("principal");
    const isNonTeaching = (currentDraft.roleCategory || "").toLowerCase().includes("non-teaching");
    const desig = isPrincipal
      ? "Campus Principal & Professor"
      : isNonTeaching
      ? "Campus Administrative Officer"
      : "Junior Lecturer (IPE & Competitive Coaching)";
    const roleCat = currentDraft.roleCategory || "Teaching Staff";
    const empId = `${campusCode}TCH0042`;

    return {
      id: "proofing-candidate",
      isRealStaff: false,
      label: `Sample Appointee (${desig})`,
      data: {
        StaffName: "Candidate / Appointee Name",
        EmployeeId: empId,
        Designation: desig,
        Department: "Intermediate Academics",
        PrimaryCampus: campusName,
        BoardName: boardName,
        RoleCategory: roleCat,
        DateOfJoining: dateStr,
        OfferDate: dateStr,
        DepartmentOffice: currentDraft.departmentOffice || "DIRECTORATE OF INTERMEDIATE ACADEMICS & HUMAN RESOURCES",
        ReportingManager: currentDraft.reportingAuthority || (isPrincipal ? "Board of Governors" : "Campus Principal"),
        ProbationPeriod: `${currentDraft.probationPeriodMonths || 6} Months`,
        BasicSalary: isPrincipal ? "₹85,000" : isNonTeaching ? "₹32,000" : "₹45,000",
        GrossSalary: isPrincipal ? "₹1,35,000" : isNonTeaching ? "₹48,000" : "₹68,500",
        MonthlyGross: isPrincipal ? "₹1,35,000" : isNonTeaching ? "₹48,000" : "₹68,500",
        Salary: isPrincipal ? "₹1,35,000" : isNonTeaching ? "₹48,000" : "₹68,500",
        AnnualCTC: isPrincipal ? "₹16,20,000" : isNonTeaching ? "₹5,76,000" : "₹8,22,000",
        BasicPay: isPrincipal ? "₹85,000" : isNonTeaching ? "₹32,000" : "₹45,000",
        AnnualCtc: isPrincipal ? "₹16,20,000" : isNonTeaching ? "₹5,76,000" : "₹8,22,000",
        Hra: "As per institutional bylaws",
        SpecialAllowance: "Included in Gross Salary",
        InstitutionName: currentDraft.institutionName || "PIRNAV EDUCATIONAL SOCIETY",
      },
    };
  }, [selectedCampus, selectedBoard, currentDraft, selectedProofingStaffId, proofingStaffList, proofingStaffPayroll]);

  // Fetch live number series config from ID & Number Series module with fallback to cached/canonical
  const [liveSeriesConfig, setLiveSeriesConfig] = useState(null);

  useEffect(() => {
    let active = true;
    async function loadSeries() {
      try {
        const campusId = selectedCampus?.id ?? selectedCampus?.campusId;
        const res = await getNumberSeriesList(campusId);
        const list = res?.data || res || [];
        if (Array.isArray(list)) {
          const match = list.find(
            (s) =>
              s.seriesCode === "OFFER_LETTER_NO" ||
              s.id === "offer-letter-no" ||
              s.key === "offer-letter-no" ||
              String(s.name || "").toLowerCase().includes("offer letter")
          );
          if (active && match) {
            setLiveSeriesConfig(match);
          }
        }
      } catch (err) {
        // Fallback already handled
      }
    }
    loadSeries();
    return () => { active = false; };
  }, [selectedCampus]);

  const offerLetterSeriesConfig = useMemo(() => {
    if (liveSeriesConfig) return liveSeriesConfig;
    try {
      const allSeries = readNumberSeriesSettings();
      const found = allSeries.find(
        (s) =>
          s.seriesCode === "OFFER_LETTER_NO" ||
          s.id === "offer-letter-no" ||
          s.key === "offer-letter-no" ||
          String(s.name || "").toLowerCase().includes("offer letter")
      );
      if (found) return found;
    } catch {}
    return {
      seriesCode: "OFFER_LETTER_NO",
      name: "Staff Offer Letter Number",
      format: "{CAMPUS}-OL/{YEAR}/{SEQ}",
      prefix: "PC-OL",
      numberLength: 4,
    };
  }, [liveSeriesConfig]);

  // Format preview (showing pattern rather than hardcoded sequential count like 0001)
  const offerLetterFormatPreview = useMemo(() => {
    const campusCode = selectedCampus?.campusCode || "MAIN";
    const year = new Date().getFullYear();
    const rawFormat = offerLetterSeriesConfig?.format || "{CAMPUS}-OL/{YEAR}/{SEQ}";
    return rawFormat
      .replace(/{CAMPUS}/gi, campusCode)
      .replace(/{YEAR}|{YYYY}/gi, String(year))
      .replace(/{DEPT}/gi, "{DEPT}");
  }, [selectedCampus, offerLetterSeriesConfig]);

  // Combined roles from Database (/api/v1/roles) + Standard intermediate presets
  const combinedRoleCategories = useMemo(() => {
    const base = [
      "Teaching Staff",
      "Principal",
      "HOD / Senior Faculty",
      "Non-Teaching Staff",
      "All Staff",
    ];
    dbRoles.forEach((r) => {
      if (!base.some((b) => b.toLowerCase() === r.toLowerCase())) {
        base.push(r);
      }
    });
    return base;
  }, [dbRoles]);

  // Load real roles from API (/api/v1/roles)
  useEffect(() => {
    async function loadRoles() {
      try {
        const res = await apiClient.get(apiEndpoints.roles.list);
        const list = Array.isArray(res?.data?.data)
          ? res.data.data
          : Array.isArray(res?.data)
          ? res.data
          : [];
        if (list.length > 0) {
          const names = list.map((r) => r.roleName || r.name || r.code).filter(Boolean);
          setDbRoles(Array.from(new Set(names)));
        }
      } catch (err) {
        console.warn("Could not load roles for template role category:", err);
      }
    }
    loadRoles();
  }, []);

  // Load from Backend API if available
  useEffect(() => {
    async function loadBackendTemplates() {
      try {
        const res = await templateApi.getTemplates({ category: "Offer Letter" });
        if (res?.items && Array.isArray(res.items) && res.items.length > 0) {
          const loaded = res.items.map((item) => {
            let parsedMeta = {};
            try {
              parsedMeta = JSON.parse(item.contentBody || "{}");
            } catch {}
            return {
              id: item.templateCode || `TMPL_${item.id}`,
              templateCode: item.templateCode,
              title: item.title,
              category: "Offer Letter",
              roleCategory: parsedMeta.roleCategory || "Teaching Staff",
              isDefault: item.isActive,
              version: String(item.version || "1.0"),
              numberSeriesCode: parsedMeta.numberSeriesCode || "OFFER_LETTER_NO",
              subject: parsedMeta.subject || "Letter of Appointment & Service Terms",
              institutionName: parsedMeta.institutionName || "PIRNAV EDUCATIONAL SOCIETY",
              departmentOffice: parsedMeta.departmentOffice || "DIRECTORATE OF INTERMEDIATE ACADEMICS & HUMAN RESOURCES",
              documentHeading: parsedMeta.documentHeading || "OFFICIAL APPOINTMENT ORDER – JUNIOR COLLEGE FACULTY",
              probationPeriodMonths: parsedMeta.probationPeriodMonths || 6,
              noticePeriodMonths: parsedMeta.noticePeriodMonths || 3,
              openingStatement: parsedMeta.openingStatement || PRESET_TEMPLATES[0].openingStatement,
              termsAndConditions: parsedMeta.termsAndConditions || PRESET_TEMPLATES[0].termsAndConditions,
              authorizedSignatoryName: parsedMeta.authorizedSignatoryName || PRESET_TEMPLATES[0].authorizedSignatoryName,
              authorizedSignatoryRole: parsedMeta.authorizedSignatoryRole || PRESET_TEMPLATES[0].authorizedSignatoryRole,
              includeSalaryTable: parsedMeta.includeSalaryTable !== false,
              includeSpecsBox: parsedMeta.includeSpecsBox !== false,
              includeAcceptanceSlip: parsedMeta.includeAcceptanceSlip !== false,
            };
          });
          setTemplates((prev) => {
            const combined = [...loaded];
            PRESET_TEMPLATES.forEach((p) => {
              if (!combined.some((c) => c.templateCode === p.templateCode)) {
                combined.push(p);
              }
            });
            return combined;
          });
        }
      } catch (err) {
        // Fallback to local storage presets
      }
    }
    loadBackendTemplates();
  }, []);

  const notify = (msg, type = "success") => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => setToastMessage(""), 4000);
  };

  const handleUpdateActiveTemplate = (field, value) => {
    if (isCreatingNew) {
      setNewTemplateDraft((prev) => ({
        ...prev,
        [field]: value,
        ...(field === "title" && !prev.templateCode
          ? { templateCode: `OFFER_LETTER_${value.toUpperCase().replace(/[^A-Z0-9]/g, "_").slice(0, 24)}` }
          : {}),
      }));
    } else {
      setTemplates((prev) =>
        prev.map((t) => (t.id === selectedTemplateId ? { ...t, [field]: value } : t))
      );
    }
  };

  const handleInsertToken = (token) => {
    const currentVal = isCreatingNew
      ? newTemplateDraft.termsAndConditions || ""
      : activeTemplate.termsAndConditions || "";
    handleUpdateActiveTemplate("termsAndConditions", currentVal + "\n" + token);
    notify(`Inserted ${token} into terms & conditions`);
  };

  // Start fresh template creation (never saves to DB or catalog until user clicks Save)
  const handleStartCreateTemplate = () => {
    const newId = `OFFER_LETTER_CUSTOM_${Date.now()}`;
    setNewTemplateDraft({
      ...BLANK_TEMPLATE,
      id: newId,
      templateCode: newId,
      title: "",
    });
    setIsCreatingNew(true);
    setActiveTab("editor");
  };

  // Cancel template creation and discard draft
  const handleCancelCreateTemplate = () => {
    setIsCreatingNew(false);
    setNewTemplateDraft(BLANK_TEMPLATE);
    setActiveTab("catalog");
  };

  // Explicit Save Template
  const handleSaveTemplate = async () => {
    const target = isCreatingNew ? newTemplateDraft : activeTemplate;
    if (!target.title || !target.title.trim()) {
      notify("Please provide a Template Title before saving.", "error");
      return;
    }

    setSaving(true);
    try {
      let updatedTemplates = [...templates];
      if (isCreatingNew) {
        const finalNew = {
          ...target,
          id: target.id || `OFFER_LETTER_CUSTOM_${Date.now()}`,
          templateCode: target.templateCode || `OFFER_LETTER_CUSTOM_${Date.now().toString().slice(-4)}`,
        };
        updatedTemplates.push(finalNew);
        setTemplates(updatedTemplates);
        setSelectedTemplateId(finalNew.id);
        setIsCreatingNew(false);
      }

      localStorage.setItem("cms_offer_letter_templates", JSON.stringify(updatedTemplates));
      localStorage.setItem("cms_offer_letter_automation", JSON.stringify(automationSettings));

      // Attempt to save to backend template repository
      try {
        const payload = {
          templateCode: target.templateCode || `OFFER_LETTER_${Date.now()}`,
          title: target.title,
          category: "Offer Letter",
          contentBody: JSON.stringify(target),
          placeholders: availableTokens.map((p) => p.token),
          isActive: target.isDefault !== false,
        };
        await templateApi.createTemplate(payload);
      } catch {
        // Backend fallback handled
      }

      notify(
        isCreatingNew
          ? "New offer letter template created and saved successfully!"
          : "Offer letter template updated successfully!"
      );
    } catch (err) {
      notify("Saved to browser storage successfully.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTemplate = (id) => {
    if (templates.length <= 1) {
      notify("At least one template must remain in the catalog.", "error");
      return;
    }
    const filtered = templates.filter((t) => t.id !== id);
    setTemplates(filtered);
    localStorage.setItem("cms_offer_letter_templates", JSON.stringify(filtered));
    if (selectedTemplateId === id) {
      setSelectedTemplateId(filtered[0]?.id || PRESET_TEMPLATES[0].id);
    }
    notify("Template deleted successfully.");
  };

  const handleSaveAutomation = async () => {
    try {
      const pref = automationSettings.workflowPreference || (automationSettings.autoSendOnSubmission ? "Automatic" : "AdminApproval");
      const payload = {
        workflowPreference: pref,
        autoSendOnSubmission: pref === "Automatic",
        autoSendOnApproval: true,
        ccHrEmail: automationSettings.ccHrEmail || "",
        emailSubject: automationSettings.emailSubject || "",
        emailBody: automationSettings.emailBody || "",
        attachPdfFilenamePattern: automationSettings.attachPdfFilenamePattern || "Offer_Letter_{{EmployeeId}}.pdf",
      };
      await apiClient.post(apiEndpoints.staff.offerLetterWorkflowConfig, payload);
      localStorage.setItem("cms_offer_letter_automation", JSON.stringify(payload));
      setAutomationSettings((prev) => ({ ...prev, ...payload }));
      notify("Offer letter workflow and automation preferences saved successfully!");
    } catch (err) {
      console.error("Save automation failed:", err);
      localStorage.setItem("cms_offer_letter_automation", JSON.stringify(automationSettings));
      notify("Saved locally. Could not synchronize to server.", "error");
    }
  };

  const handleConfirmVerify = async () => {
    if (!activeVerifyRequest) return;
    setIsSubmittingDecision(true);
    try {
      await apiClient.post(apiEndpoints.staff.offerLetterWorkflowVerify(activeVerifyRequest.staffId), {
        verificationNotes: verificationNotes.trim()
      });
      notify(`Staff #${activeVerifyRequest.employeeId} onboarding marked as Under Verification.`);
      setActiveVerifyRequest(null);
      setVerificationNotes("");
      loadRequests();
    } catch (err) {
      notify(err?.response?.data?.message || "Failed to record verification.", "error");
    } finally {
      setIsSubmittingDecision(false);
    }
  };

  const handleConfirmApprove = async () => {
    if (!activeApproveRequest) return;
    setIsSubmittingDecision(true);
    try {
      await apiClient.post(apiEndpoints.staff.offerLetterWorkflowApprove(activeApproveRequest.staffId), {
        remarks: approvalRemarks.trim()
      });
      notify(`Offer letter approved and emailed to ${activeApproveRequest.staffName}!`);
      setActiveApproveRequest(null);
      setApprovalRemarks("");
      loadRequests();
    } catch (err) {
      notify(err?.response?.data?.message || "Failed to approve offer letter.", "error");
    } finally {
      setIsSubmittingDecision(false);
    }
  };

  const handleConfirmReject = async () => {
    if (!activeRejectRequest) return;
    if (!rejectionReason.trim()) {
      notify("Rejection reason is mandatory.", "error");
      return;
    }
    if (rejectionScenario === "DateChange" && !revisedDate) {
      notify("Revised onboarding date is mandatory for Date Change scenario.", "error");
      return;
    }
    setIsSubmittingDecision(true);
    try {
      await apiClient.post(apiEndpoints.staff.offerLetterWorkflowReject(activeRejectRequest.staffId), {
        rejectionReason: rejectionReason.trim(),
        scenario: rejectionScenario,
        revisedOnboardingDate: revisedDate ? new Date(revisedDate).toISOString() : null,
        additionalInstructions: additionalInstructions.trim()
      });
      notify(`Rejection processed [${rejectionScenario}] for ${activeRejectRequest.staffName}. Notification and email dispatched.`);
      setActiveRejectRequest(null);
      setRejectionReason("");
      setRevisedDate("");
      setAdditionalInstructions("");
      loadRequests();
    } catch (err) {
      notify(err?.response?.data?.message || "Failed to process rejection.", "error");
    } finally {
      setIsSubmittingDecision(false);
    }
  };

  const handleDownloadStaffOfferPdf = async (staffId, empId) => {
    try {
      const res = await apiClient.get(apiEndpoints.staff.offerLetterPdf(staffId), {
        responseType: "blob",
      });
      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Offer_Letter_${empId || staffId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      notify("Offer letter downloaded.");
    } catch (err) {
      notify("Failed to download offer letter PDF.", "error");
    }
  };

  // Mark as active default template (ensures only one default exists within scope)
  const handleSetDefault = (id) => {
    const updated = templates.map((t) => ({
      ...t,
      isDefault: t.id === id,
    }));
    setTemplates(updated);
    localStorage.setItem("cms_offer_letter_templates", JSON.stringify(updated));
    const target = templates.find((t) => t.id === id);
    notify(`Template "${target?.title || id}" marked as active default.`);
  };

  // Unmark / Remove default status
  const handleRemoveDefault = (id) => {
    const updated = templates.map((t) => (t.id === id ? { ...t, isDefault: false } : t));
    setTemplates(updated);
    localStorage.setItem("cms_offer_letter_templates", JSON.stringify(updated));
    const target = templates.find((t) => t.id === id);
    notify(`Default status removed from "${target?.title || id}".`);
  };

  const handleDuplicateTemplate = (tmpl) => {
    const newId = `${tmpl.id}_COPY_${Date.now().toString().slice(-4)}`;
    const newTmpl = {
      ...tmpl,
      id: newId,
      templateCode: newId,
      title: `${tmpl.title} (Copy)`,
      isDefault: false,
    };
    const updated = [...templates, newTmpl];
    setTemplates(updated);
    localStorage.setItem("cms_offer_letter_templates", JSON.stringify(updated));
    setSelectedTemplateId(newId);
    setActiveTab("editor");
    notify("Template duplicated successfully.");
  };

  // Live Token Replacer for Document Preview
  const resolveTokens = (text = "", tmpl = currentDraft) => {
    if (!text) return "";
    let resolved = text;
    const data = activeCandidate.data;
    Object.entries(data).forEach(([k, val]) => {
      const reg = new RegExp(`{{${k}}}`, "g");
      resolved = resolved.replace(reg, String(val));
    });
    // Replace custom tokens
    availableTokens.forEach((t) => {
      if (t.sampleValue) {
        resolved = resolved.split(t.token).join(t.sampleValue);
      }
    });
    // Replace institutional tokens
    resolved = resolved.replace(/{{InstitutionName}}/g, tmpl.institutionName || "PIRNAV EDUCATIONAL SOCIETY");
    resolved = resolved.replace(/{{DepartmentOffice}}/g, tmpl.departmentOffice || "DIRECTORATE OF INTERMEDIATE ACADEMICS & HUMAN RESOURCES");
    resolved = resolved.replace(/{{AuthorizedSignatoryName}}/g, tmpl.authorizedSignatoryName || "Director of HR");
    resolved = resolved.replace(/{{AuthorizedSignatoryRole}}/g, tmpl.authorizedSignatoryRole || "Human Resources");
    return resolved;
  };

  const handleAddCustomToken = (e) => {
    e.preventDefault();
    const cleanKey = newTokenKey.replace(/[^a-zA-Z0-9]/g, "").trim();
    if (!cleanKey) {
      notify("Please enter a valid token key (alphanumeric only).", "error");
      return;
    }
    const tokenTag = `{{${cleanKey}}}`;
    if (availableTokens.some((t) => t.token.toLowerCase() === tokenTag.toLowerCase())) {
      notify(`Token ${tokenTag} already exists.`, "error");
      return;
    }
    const label = newTokenLabel.trim() || cleanKey;
    const sampleVal = newTokenFallback.trim() || `[${label}]`;
    const tokenObj = {
      token: tokenTag,
      label,
      category: "Custom",
      sampleValue: sampleVal,
    };
    const nextTokens = [...availableTokens, tokenObj];
    setAvailableTokens(nextTokens);
    try {
      const customOnly = nextTokens.filter((t) => t.category === "Custom");
      localStorage.setItem("cms_custom_tokens", JSON.stringify(customOnly));
    } catch {}
    setShowAddTokenModal(false);
    setNewTokenKey("");
    setNewTokenLabel("");
    setNewTokenFallback("");
    notify(`Custom token ${tokenTag} added successfully!`);
  };

  const handlePrintDocument = () => {
    window.print();
  };

  // Download official PDF with visual fidelity matching the live preview
  const handleDownloadPdf = async () => {
    notify("Preparing official Offer Letter PDF download...");
    try {
      if (activeCandidate.isRealStaff && activeCandidate.staffId) {
        const res = await apiClient.get(apiEndpoints.staff.offerLetterPdf(activeCandidate.staffId), {
          responseType: "blob",
        });
        const blob = new Blob([res.data], { type: "application/pdf" });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `Offer_Letter_${activeCandidate.data.EmployeeId}.pdf`;
        link.click();
        window.URL.revokeObjectURL(url);
        notify("Official PDF downloaded successfully via QuestPDF engine.");
        return;
      }
      // Print/Save dialog fallback for sample candidate
      window.print();
    } catch {
      window.print();
    }
  };

  // Download official Excel docket with compensation breakdown and specifications
  const handleDownloadExcel = () => {
    try {
      const empId = activeCandidate.data.EmployeeId || "Candidate";
      const tmpl = currentDraft;

      const specRows = [
        ["PIRNAV EDUCATIONAL SOCIETY - OFFICIAL APPOINTMENT ORDER SPECIFICATIONS", ""],
        ["Document Ref:", `PC-OL/${new Date().getFullYear()}/${empId}`],
        ["Date of Issue:", activeCandidate.data.OfferDate || new Date().toLocaleDateString()],
        ["Candidate / Staff Name:", activeCandidate.data.StaffName || ""],
        ["Employee ID:", activeCandidate.data.EmployeeId || ""],
        ["Designation:", activeCandidate.data.Designation || ""],
        ["Department:", activeCandidate.data.Department || ""],
        ["Campus Posting:", activeCandidate.data.CampusName || ""],
        ["Effective Joining Date:", activeCandidate.data.JoiningDate || ""],
        ["Reporting Authority:", activeCandidate.data.ReportingManager || ""],
        ["Probation Period:", activeCandidate.data.ProbationPeriod || ""],
        [],
        ["COMPENSATION & SALARY STRUCTURE BREAKDOWN", ""],
        ["Pay Component", "Annual Value (INR)"],
        ["Annual CTC (Cost to Company)", activeCandidate.data.AnnualCtc || "Rs. 6,00,000/-"],
        ["Basic Pay", activeCandidate.data.BasicPay || "Rs. 3,60,000/-"],
        ["House Rent Allowance (HRA)", activeCandidate.data.Hra || "Rs. 1,44,000/-"],
        ["Special Allowance", activeCandidate.data.SpecialAllowance || "Rs. 96,000/-"],
        [],
        ["TERMS & CONDITIONS / SERVICE BYLAWS", ""],
        ...resolveTokens(tmpl.termsAndConditions || "", tmpl)
          .split("\n")
          .filter((l) => l.trim())
          .map((line, idx) => [`Clause ${idx + 1}`, line.trim()]),
        [],
        ["Authorized Signatory:", tmpl.authorizedSignatoryName || "Dean of Academics & Administration"],
        ["Signatory Role:", tmpl.authorizedSignatoryRole || "Directorate of Human Resources"],
      ];

      const ws = XLSX.utils.aoa_to_sheet(specRows);
      ws["!cols"] = [{ wch: 35 }, { wch: 75 }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Appointment Order");
      XLSX.writeFile(wb, `Offer_Letter_${empId}.xlsx`);
      notify("Official Offer Letter Excel docket downloaded successfully.");
    } catch (err) {
      console.error("Excel download error:", err);
      notify("Failed to export Excel docket.");
    }
  };

  // Download official Document (.doc format with full CSS styling matching preview)
  const handleDownloadDocument = (tmpl = currentDraft) => {
    try {
      const title = tmpl.title || "Offer_Letter";
      const empId = activeCandidate.data.EmployeeId || "Candidate";
      const filename = `Offer_Letter_${empId}.doc`;

      const openingText = resolveTokens(tmpl.openingStatement, tmpl);
      const termsFormatted = resolveTokens(tmpl.termsAndConditions, tmpl)
        .split("\n")
        .map((line) => `<p style="margin: 4px 0; font-size: 11pt; line-height: 1.5; text-align: justify;">${line}</p>`)
        .join("");

      const htmlContent = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head>
          <meta charset='utf-8'>
          <title>${title}</title>
          <style>
            body { font-family: 'Times New Roman', serif; margin: 40px; color: #1e293b; }
            .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 15px; margin-bottom: 20px; }
            .inst-name { font-size: 18pt; font-weight: bold; color: #0f172a; margin: 0; }
            .inst-sub { font-size: 10pt; color: #475569; margin: 4px 0; }
            .doc-heading { font-size: 12pt; font-weight: bold; color: #1e3a8a; margin-top: 8px; }
            .meta-table { width: 100%; margin-bottom: 20px; font-size: 10pt; }
            .salutation { font-size: 11pt; font-weight: bold; margin-bottom: 12px; }
            .opening { font-size: 11pt; line-height: 1.5; margin-bottom: 16px; text-align: justify; }
            .specs-box { background: #f8fafc; border: 1px solid #cbd5e1; padding: 10px; margin: 15px 0; }
            .specs-title { font-size: 10pt; font-weight: bold; color: #047857; margin-bottom: 6px; }
            .salary-table { width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 10pt; }
            .salary-table th, .salary-table td { border: 1px solid #cbd5e1; padding: 6px 10px; }
            .salary-table th { background: #f1f5f9; }
            .terms-title { font-size: 11pt; font-weight: bold; margin-top: 15px; margin-bottom: 6px; }
            .sig-table { width: 100%; margin-top: 40px; }
            .sig-table td { width: 50%; vertical-align: top; }
          </style>
        </head>
        <body>
          <div class='header'>
            <div class='inst-name'>${tmpl.institutionName || "PIRNAV EDUCATIONAL SOCIETY"}</div>
            <div class='inst-sub'>${tmpl.departmentOffice || "DIRECTORATE OF INTERMEDIATE ACADEMICS & HUMAN RESOURCES"}</div>
            <div class='doc-heading'>${tmpl.documentHeading || "OFFICIAL APPOINTMENT ORDER"}</div>
          </div>

          <table class='meta-table'>
            <tr>
              <td><strong>Ref:</strong> PC-OL/${new Date().getFullYear()}/${activeCandidate.data.EmployeeId}</td>
              <td style='text-align: right;'><strong>Date:</strong> ${activeCandidate.data.OfferDate}</td>
            </tr>
          </table>

          <div class='salutation'>Dear <strong>${activeCandidate.data.StaffName}</strong>,</div>
          <div class='opening'>${openingText}</div>

          ${tmpl.includeSpecsBox ? `
            <div class='specs-box'>
              <div class='specs-title'>APPOINTMENT SPECIFICATIONS</div>
              <div>Permanent ID: <strong>${activeCandidate.data.EmployeeId}</strong></div>
              <div>Designation: <strong>${activeCandidate.data.Designation}</strong></div>
              <div>Campus: <strong>${activeCandidate.data.PrimaryCampus}</strong></div>
              <div>Board: <strong>${activeCandidate.data.BoardName}</strong></div>
            </div>
          ` : ""}

          ${tmpl.includeSalaryTable ? `
            <div class='terms-title'>COMPENSATION & BENEFITS STRUCTURE</div>
            <table class='salary-table'>
              <tr><th>Component</th><th style='text-align: right;'>Monthly Amount (INR)</th></tr>
              <tr><td>Basic Monthly Pay</td><td style='text-align: right;'>${activeCandidate.data.BasicSalary}</td></tr>
              <tr style='font-weight: bold; background: #ecfdf5;'><td>Gross Monthly CTC</td><td style='text-align: right;'>${activeCandidate.data.GrossSalary}</td></tr>
              <tr><td>Annual CTC</td><td style='text-align: right;'>${activeCandidate.data.AnnualCTC}</td></tr>
            </table>
          ` : ""}

          <div class='terms-title'>TERMS OF APPOINTMENT & SERVICE BYLAWS</div>
          ${termsFormatted}

          <table class='sig-table'>
            <tr>
              <td>
                <div style='margin-bottom: 40px;'>_____________________________</div>
                <strong>${tmpl.authorizedSignatoryName || "Director of HR"}</strong><br/>
                <span>${tmpl.authorizedSignatoryRole || "Human Resources"}</span><br/>
                <span>Pirnav Educational Society</span>
              </td>
              <td style='text-align: right;'>
                <div style='margin-bottom: 40px;'>_____________________________</div>
                <strong>Candidate Acceptance</strong><br/>
                <span>Signature &amp; Date</span><br/>
                <span>(${activeCandidate.data.StaffName})</span>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `;

      const blob = new Blob(["\ufeff", htmlContent], {
        type: "application/msword;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      notify(`Document "${filename}" downloaded successfully.`);
    } catch (err) {
      notify("Failed to download document.", "error");
    }
  };

  // Reusable Letter Sheet Component for 100% parity between Live Editor and Mini Preview Modal
  const renderDocumentSheet = (tmpl = currentDraft, isPdfView = false, compact = false) => {
    return (
      <div
        className="olc-letter-sheet"
        style={{
          padding: compact ? "22px 26px" : "36px 42px",
          background: "#ffffff",
          boxShadow: isPdfView
            ? "0 4px 20px rgba(0, 0, 0, 0.15), 0 0 0 1px #cbd5e1"
            : "0 2px 10px rgba(0, 0, 0, 0.06)",
          border: isPdfView ? "1px solid #94a3b8" : "1px solid #e2e8f0",
          fontFamily: "'Times New Roman', Times, serif",
          lineHeight: 1.5,
        }}
      >
        {/* Header / Letterhead */}
        <div className="olc-sheet-header" style={{ borderBottom: "2px solid #0f172a", paddingBottom: "14px", marginBottom: "18px" }}>
          <div className="olc-sheet-top-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <img
                src={pirnavCollegeCrest}
                alt="Pirnav College"
                style={{ width: compact ? "44px" : "54px", height: compact ? "44px" : "54px", objectFit: "contain" }}
              />
              <div>
                <h1 className="olc-sheet-inst-name" style={{ fontSize: compact ? "15px" : "18px", margin: 0, color: "#0f172a", fontWeight: 800 }}>
                  {tmpl.institutionName || "PIRNAV EDUCATIONAL SOCIETY"}
                </h1>
                <div className="olc-sheet-inst-dept" style={{ fontSize: compact ? "9.5px" : "11px", color: "#475569", fontWeight: 700, marginTop: "2px" }}>
                  {tmpl.departmentOffice || "DIRECTORATE OF INTERMEDIATE ACADEMICS & HUMAN RESOURCES"}
                </div>
                <div className="olc-sheet-inst-sub" style={{ fontSize: compact ? "9px" : "10.5px", color: "#1e3a8a", fontWeight: 700, letterSpacing: "0.5px", marginTop: "3px" }}>
                  {tmpl.documentHeading || "OFFICIAL APPOINTMENT ORDER"}
                </div>
              </div>
            </div>
            <div className="olc-sheet-meta" style={{ textAlign: "right", fontSize: compact ? "9px" : "10.5px", color: "#334155" }}>
              <div><strong>Ref:</strong> PC-OL/{new Date().getFullYear()}/{activeCandidate.data.EmployeeId}</div>
              <div style={{ marginTop: "2px" }}><strong>Date:</strong> {activeCandidate.data.OfferDate}</div>
            </div>
          </div>
        </div>

        {/* Salutation */}
        <div className="olc-sheet-salutation" style={{ fontSize: compact ? "11.5px" : "13px", marginBottom: "12px", color: "#0f172a" }}>
          Dear <strong>{activeCandidate.data.StaffName}</strong>,
        </div>

        {/* Opening Statement */}
        <p className="olc-sheet-p" style={{ fontSize: compact ? "10.5px" : "12px", lineHeight: 1.55, textAlign: "justify", margin: "0 0 14px", color: "#1e293b" }}>
          {resolveTokens(tmpl.openingStatement, tmpl)}
        </p>

        {/* Specifications Box */}
        {tmpl.includeSpecsBox && (
          <div
            className="olc-sheet-specs-box"
            style={{
              background: "#f8fafc",
              border: "1px solid #cbd5e1",
              borderRadius: "6px",
              padding: compact ? "8px 12px" : "12px 16px",
              margin: "12px 0",
            }}
          >
            <div className="olc-sheet-specs-title" style={{ fontSize: compact ? "9px" : "10.5px", fontWeight: 800, color: "#047857", marginBottom: "6px" }}>
              OFFICIAL APPOINTMENT SPECIFICATIONS
            </div>
            <div className="olc-sheet-specs-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "6px", fontSize: compact ? "9.5px" : "11px" }}>
              <div>Permanent ID: <strong>{activeCandidate.data.EmployeeId}</strong></div>
              <div>Designation: <strong>{activeCandidate.data.Designation}</strong></div>
              <div>Primary Campus: <strong>{activeCandidate.data.PrimaryCampus}</strong></div>
              <div>Board Affiliation: <strong>{activeCandidate.data.BoardName}</strong></div>
            </div>
          </div>
        )}

        {/* Salary Breakdown Table */}
        {tmpl.includeSalaryTable && (
          <div style={{ margin: "12px 0" }}>
            <div className="olc-sheet-section-title" style={{ fontSize: compact ? "9.5px" : "11px", fontWeight: 800, color: "#0f172a", marginBottom: "4px" }}>
              COMPENSATION &amp; BENEFITS STRUCTURE
            </div>
            <table className="olc-sheet-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: compact ? "9px" : "10.5px", margin: "4px 0 8px" }}>
              <thead>
                <tr style={{ background: "#f1f5f9", borderBottom: "1px solid #cbd5e1" }}>
                  <th style={{ padding: "5px 10px", textAlign: "left" }}>Component</th>
                  <th style={{ padding: "5px 10px", textAlign: "right" }}>Monthly Amount (INR)</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                  <td style={{ padding: "5px 10px" }}>Basic Monthly Pay</td>
                  <td style={{ padding: "5px 10px", textAlign: "right" }}>{activeCandidate.data.BasicSalary}</td>
                </tr>
                <tr style={{ background: "#f8fafc", fontWeight: 700, borderBottom: "1px solid #cbd5e1" }}>
                  <td style={{ padding: "5px 10px" }}>Gross Monthly CTC</td>
                  <td style={{ padding: "5px 10px", textAlign: "right", color: "#047857" }}>
                    {activeCandidate.data.GrossSalary}
                  </td>
                </tr>
                <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                  <td style={{ padding: "5px 10px" }}>Annual CTC (Approx)</td>
                  <td style={{ padding: "5px 10px", textAlign: "right" }}>{activeCandidate.data.AnnualCTC}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Terms and Conditions */}
        <div className="olc-sheet-section-title" style={{ fontSize: compact ? "9.5px" : "11px", fontWeight: 800, color: "#0f172a", margin: "12px 0 4px" }}>
          TERMS OF APPOINTMENT &amp; SERVICE BYLAWS
        </div>
        <div
          className="olc-sheet-terms"
          style={{
            fontSize: compact ? "9px" : "10.5px",
            lineHeight: 1.5,
            color: "#334155",
            whiteSpace: "pre-line",
            textAlign: "justify",
          }}
        >
          {resolveTokens(tmpl.termsAndConditions, tmpl)}
        </div>

        {/* Dual Signatures */}
        <div className="olc-sheet-signatures" style={{ display: "flex", justifyContent: "space-between", marginTop: compact ? "22px" : "36px", paddingTop: "12px" }}>
          <div className="olc-sig-block" style={{ width: "170px" }}>
            <div className="olc-sig-line" style={{ height: "1px", background: "#0f172a", marginBottom: "6px" }} />
            <div className="olc-sig-title" style={{ fontSize: compact ? "9.5px" : "11px", fontWeight: 700, color: "#0f172a" }}>Authorized Signatory</div>
            <div className="olc-sig-sub" style={{ fontSize: compact ? "8.5px" : "10px", color: "#475569" }}>{tmpl.authorizedSignatoryName}</div>
            <div style={{ fontSize: compact ? "8px" : "9.5px", color: "#64748b" }}>{tmpl.authorizedSignatoryRole}</div>
          </div>
          <div className="olc-sig-block" style={{ width: "170px", textAlign: "right" }}>
            <div className="olc-sig-line" style={{ height: "1px", background: "#0f172a", marginBottom: "6px" }} />
            <div className="olc-sig-title" style={{ fontSize: compact ? "9.5px" : "11px", fontWeight: 700, color: "#0f172a" }}>Candidate Acceptance</div>
            <div className="olc-sig-sub" style={{ fontSize: compact ? "8.5px" : "10px", color: "#475569" }}>Signature &amp; Date</div>
            <div style={{ fontSize: compact ? "8px" : "9.5px", color: "#64748b" }}>({activeCandidate.data.StaffName})</div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <DashboardLayout
      title="College Offer Letters"
      subtitle="Design staff appointment letters, customize dynamic placeholders, configure compensation tables, and set up automated email dispatch."
      breadcrumb={["Home", "Settings", "College Offer Letters"]}
    >
      <div className="olc-container">
        {/* Toast Alert */}
        {toastMessage && (
          <div
            style={{
              padding: "12px 18px",
              borderRadius: "8px",
              background: toastType === "error" ? "#fef2f2" : "#f0fdf4",
              border: `1px solid ${toastType === "error" ? "#fca5a5" : "#bbf7d0"}`,
              color: toastType === "error" ? "#991b1b" : "#166534",
              fontSize: "13px",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
            }}
          >
            <span>{toastMessage}</span>
            <button
              type="button"
              onClick={() => setToastMessage("")}
              style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", fontWeight: "bold" }}
            >
              ✕
            </button>
          </div>
        )}

        {/* Top Header Card */}
        <div className="olc-header-card">
          <div className="olc-header-left">
            <div className="olc-header-icon-wrap">
              <img src={templatesImage} alt="Offer Letter Templates" style={{ width: 44, height: 44, objectFit: "contain" }} />
            </div>
            <div>
              <h2 className="olc-header-title">College Offer Letters</h2>
              <p className="olc-header-subtitle">
                Official HR appointment documents bound to sequence series for intermediate faculty and staff.
              </p>
            </div>
          </div>
          <div className="olc-header-actions">
            <button
              type="button"
              className="cms-btn cms-btn-ghost"
              onClick={() => navigate("/dashboard/settings")}
              style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
            >
              <ArrowLeft size={14} /> Back to Settings
            </button>
          </div>
        </div>

        {/* Navigation Tabs Bar (3 Tabs: Templates, Template Designer & Content, Automation & Email Delivery) */}
        <div className="olc-tabs-nav">
          <button
            type="button"
            className={`olc-tab-btn ${activeTab === "catalog" ? "is-active" : ""}`}
            onClick={() => setActiveTab("catalog")}
          >
            <Layers size={16} /> Templates ({templates.length})
          </button>
          <button
            type="button"
            className={`olc-tab-btn ${activeTab === "editor" ? "is-active" : ""}`}
            onClick={() => setActiveTab("editor")}
          >
            <Edit size={16} /> Template Designer &amp; Content
          </button>
          <button
            type="button"
            className={`olc-tab-btn ${activeTab === "automation" ? "is-active" : ""}`}
            onClick={() => setActiveTab("automation")}
          >
            <Send size={16} /> Automation &amp; Email Delivery
          </button>
        </div>

        {/* ------------------------------------------------------------------------- */}
        {/* TAB 1: TEMPLATES CATALOG */}
        {/* ------------------------------------------------------------------------- */}
        {activeTab === "catalog" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#0f172a" }}>
                  Configured Offer Letter Templates
                </h3>
                <p style={{ margin: "2px 0 0", fontSize: "12.5px", color: "#64748b" }}>
                  Select a template to customize or configure default template binding.
                </p>
              </div>

              <button
                type="button"
                className="cms-btn cms-btn-primary"
                onClick={handleStartCreateTemplate}
                style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
              >
                <Plus size={15} /> Add New Template
              </button>
            </div>

            <div className="olc-template-cards-grid">
              {templates.map((tmpl) => (
                <div key={tmpl.id} className={`olc-template-card ${tmpl.isDefault ? "is-default" : ""}`}>
                  <div className="olc-template-body">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                      <div>
                        {tmpl.isDefault ? (
                          <span className="olc-badge olc-badge-primary" style={{ fontWeight: 800 }}>
                            ★ ACTIVE DEFAULT
                          </span>
                        ) : (
                          <span className="olc-badge olc-badge-muted" style={{ textTransform: "uppercase", fontSize: "10.5px" }}>
                            {tmpl.roleCategory || "Staff"}
                          </span>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: "6px" }}>
                        <span className="olc-badge olc-badge-muted">
                          v{tmpl.version || "1.0"}
                        </span>
                        <span style={{ fontSize: "10.5px", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase" }}>
                          {tmpl.templateCode || tmpl.id}
                        </span>
                      </div>
                    </div>

                    <h4 className="olc-template-title">{tmpl.title}</h4>
                    <p className="olc-template-desc">{tmpl.openingStatement?.slice(0, 110)}...</p>

                    <div className="olc-template-specs">
                      <div>
                        <span>Number Series:</span>
                        <strong>{tmpl.numberSeriesCode || "OFFER_LETTER_NO"}</strong>
                      </div>
                      <div>
                        <span>Notice Period:</span>
                        <strong>{tmpl.noticePeriodMonths || 3} Months</strong>
                      </div>
                      <div>
                        <span>Probation:</span>
                        <strong>{tmpl.probationPeriodMonths || 6} Months</strong>
                      </div>
                      <div>
                        <span>Signatory:</span>
                        <strong>{tmpl.authorizedSignatoryName}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="olc-template-actions">
                    <div style={{ display: "flex", gap: "6px" }}>
                      <button
                        type="button"
                        className="cms-btn cms-btn-ghost"
                        style={{ padding: "4px 10px", fontSize: "12px" }}
                        onClick={() => {
                          setIsCreatingNew(false);
                          setSelectedTemplateId(tmpl.id);
                          setActiveTab("editor");
                        }}
                      >
                        <Edit size={13} /> Edit
                      </button>
                      <button
                        type="button"
                        className="cms-btn cms-btn-ghost"
                        style={{ padding: "4px 10px", fontSize: "12px" }}
                        onClick={() => {
                          setPreviewModalTemplate(tmpl);
                          setModalPreviewMode("document");
                        }}
                      >
                        <Eye size={13} /> Preview
                      </button>
                    </div>

                    <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                      {tmpl.isDefault ? (
                        <button
                          type="button"
                          className="cms-btn cms-btn-ghost"
                          style={{
                            padding: "4px 8px",
                            fontSize: "11px",
                            color: "#b45309",
                            borderColor: "#fde68a",
                            background: "#fef3c7",
                            fontWeight: 700,
                          }}
                          onClick={() => handleRemoveDefault(tmpl.id)}
                          title="Remove active default status from this template"
                        >
                          Remove Default
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="cms-btn cms-btn-secondary"
                          style={{ padding: "4px 8px", fontSize: "11px" }}
                          onClick={() => handleSetDefault(tmpl.id)}
                          title="Set as active default template"
                        >
                          Make Default
                        </button>
                      )}

                      <button
                        type="button"
                        className="cms-btn cms-btn-ghost"
                        style={{ padding: "4px 8px", fontSize: "11px" }}
                        onClick={() => handleDuplicateTemplate(tmpl)}
                        title="Duplicate Template"
                      >
                        <Copy size={13} />
                      </button>
                      {!tmpl.isDefault && templates.length > 1 && (
                        <button
                          type="button"
                          className="cms-btn cms-btn-ghost"
                          style={{ padding: "4px 8px", fontSize: "11px", color: "#dc2626" }}
                          onClick={() => handleDeleteTemplate(tmpl.id)}
                          title="Delete Template"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Mini Preview Popup Modal (Opens right over catalog when user clicks Preview) */}
            {previewModalTemplate && (
              <div
                className="olc-modal-backdrop"
                onClick={() => setPreviewModalTemplate(null)}
              >
                <div
                  className="olc-modal-sheet"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="olc-modal-header">
                    <div className="olc-modal-title-group">
                      <div className="olc-header-icon-wrap" style={{ width: 36, height: 36 }}>
                        <FileSignature size={18} />
                      </div>
                      <div>
                        <h4 className="olc-modal-title">{previewModalTemplate.title}</h4>
                        <div style={{ display: "flex", gap: "8px", marginTop: "2px" }}>
                          <span className="olc-badge olc-badge-muted" style={{ fontSize: "10px" }}>
                            Applicable To: {previewModalTemplate.roleCategory || "Staff"}
                          </span>
                          {previewModalTemplate.isDefault && (
                            <span className="olc-badge olc-badge-primary" style={{ fontSize: "10px" }}>
                              ★ Default
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      {/* View Toggle */}
                      <div className="olc-preview-mode-toggle">
                        <button
                          type="button"
                          className={`olc-preview-mode-btn ${modalPreviewMode === "document" ? "is-active" : ""}`}
                          onClick={() => setModalPreviewMode("document")}
                        >
                          Document View
                        </button>
                        <button
                          type="button"
                          className={`olc-preview-mode-btn ${modalPreviewMode === "pdf" ? "is-active" : ""}`}
                          onClick={() => setModalPreviewMode("pdf")}
                        >
                          PDF View
                        </button>
                      </div>

                      <button
                        type="button"
                        className="cms-btn cms-btn-ghost"
                        style={{ padding: "4px 8px", fontSize: "14px" }}
                        onClick={() => setPreviewModalTemplate(null)}
                      >
                        <X size={18} />
                      </button>
                    </div>
                  </div>

                  <div className="olc-modal-body">
                    <div style={{ maxWidth: "800px", margin: "0 auto" }}>
                      {renderDocumentSheet(previewModalTemplate, modalPreviewMode === "pdf", false)}
                    </div>
                  </div>

                  <div className="olc-modal-footer">
                    <div style={{ fontSize: "12px", color: "#64748b" }}>
                      Showing proof for: <strong>{activeCandidate.data.StaffName}</strong> ({activeCandidate.data.Designation})
                    </div>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        type="button"
                        className="cms-btn cms-btn-ghost"
                        onClick={handlePrintDocument}
                        style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12px" }}
                      >
                        <Printer size={13} /> Print
                      </button>
                      <button
                        type="button"
                        className="cms-btn cms-btn-ghost"
                        onClick={() => handleDownloadDocument(previewModalTemplate)}
                        style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12px" }}
                      >
                        <Download size={13} /> Download Document
                      </button>
                      <button
                        type="button"
                        className="cms-btn cms-btn-primary"
                        onClick={handleDownloadPdf}
                        style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12px" }}
                      >
                        <Download size={13} /> Download PDF
                      </button>
                      <button
                        type="button"
                        className="cms-btn cms-btn-secondary"
                        onClick={() => setPreviewModalTemplate(null)}
                        style={{ fontSize: "12px" }}
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------------------- */}
        {/* TAB 2: TEMPLATE DESIGNER & CONTENT (INTEGRATED LIVE EDITOR PROOFING) */}
        {/* ------------------------------------------------------------------------- */}
        {activeTab === "editor" && (
          <div className="olc-editor-layout">
            {/* Left Column: Form Fields */}
            <div className="olc-editor-form-col">
              {/* Template Meta Card */}
              <div className="olc-card">
                <div className="olc-card-head olc-meta-card-head">
                  <h3 className="olc-card-title">
                    <SlidersHorizontal size={17} style={{ color: "var(--cms-primary, #355e3b)", flexShrink: 0 }} />
                    <span>Template Details &amp; Series</span>
                  </h3>
                  <div className="olc-template-switcher">
                    {isCreatingNew ? (
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span className="olc-badge olc-badge-primary" style={{ padding: "4px 10px", fontSize: "12px" }}>
                          ★ Creating New Template Draft
                        </span>
                        <button
                          type="button"
                          className="cms-btn cms-btn-ghost"
                          style={{ padding: "3px 8px", fontSize: "11px" }}
                          onClick={handleCancelCreateTemplate}
                        >
                          Cancel Draft
                        </button>
                      </div>
                    ) : (
                      <div className="olc-switcher-control">
                        <span className="olc-switcher-label">Select Template:</span>
                        <select
                          className="olc-switcher-select"
                          value={selectedTemplateId}
                          onChange={(e) => {
                            setIsCreatingNew(false);
                            setSelectedTemplateId(e.target.value);
                          }}
                          title="Select offer letter template"
                        >
                          {templates.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.title} {t.isDefault ? "(Default)" : ""}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>

                <div className="olc-form-row">
                  <div className="olc-form-group" style={{ flex: 1 }}>
                    <label>Template Title <span style={{ color: "#dc2626" }}>*</span></label>
                    <input
                      type="text"
                      className="olc-input"
                      placeholder="e.g. Senior Lecturer / Academic Dean Appointment Order"
                      value={currentDraft.title || ""}
                      onChange={(e) => handleUpdateActiveTemplate("title", e.target.value)}
                    />
                  </div>
                </div>

                {/* Renamed Association to Applicable To as requested */}
                <div className="olc-form-row">
                  <div className="olc-form-group" style={{ flex: 1 }}>
                    <label>Applicable To</label>
                    <select
                      className="olc-select"
                      value={currentDraft.roleCategory || "Teaching Staff"}
                      onChange={(e) => handleUpdateActiveTemplate("roleCategory", e.target.value)}
                    >
                      {combinedRoleCategories.map((rc) => (
                        <option key={rc} value={rc}>
                          {rc}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Bound Number Series Format Pattern Preview (Sleek & Lightweight) */}
                <div className="olc-bound-series-bar">
                  <div className="olc-bound-series-info">
                    <div className="olc-bound-series-icon">
                      <Hash size={14} />
                    </div>
                    <div className="olc-bound-series-text">
                      <div className="olc-bound-series-title-line">
                        <span className="olc-bound-series-label">Bound Series:</span>
                        <strong className="olc-bound-series-name">{offerLetterSeriesConfig.name || "Staff Offer Letter Number"}</strong>
                        <code className="olc-bound-series-code">{offerLetterSeriesConfig.seriesCode || "OFFER_LETTER_NO"}</code>
                      </div>
                      <div className="olc-bound-series-preview-line">
                        <span className="olc-bound-series-sublabel">Format Preview:</span>
                        <code className="olc-bound-series-format-tag">{offerLetterFormatPreview}</code>
                        <span className="olc-bound-series-hint">Auto-incremented on dispatch</span>
                      </div>
                    </div>
                  </div>

                </div>
              </div>

              {/* Dynamic Tokens Palette */}
              <div className="olc-placeholders-shelf">
                <div className="olc-placeholders-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
                  <div>
                    <span className="olc-placeholders-caption">
                      <Sparkles size={13} style={{ display: "inline", verticalAlign: "middle", marginRight: 4, color: "#d97706" }} />
                      Live Dynamic Tokens (Click to append token)
                    </span>
                    <span style={{ fontSize: "11px", color: "#64748b", marginLeft: "6px" }}>
                      Values auto-resolve from Staff &amp; Payroll records
                    </span>
                  </div>
                  <button
                    type="button"
                    className="cms-btn cms-btn-ghost"
                    style={{ padding: "3px 8px", fontSize: "11px", display: "inline-flex", alignItems: "center", gap: "4px", color: "var(--cms-primary, #355e3b)" }}
                    onClick={() => setShowAddTokenModal(true)}
                  >
                    <Plus size={13} /> Add Custom Token
                  </button>
                </div>
                <div className="olc-placeholders-tokens">
                  {availableTokens.map((item) => {
                    const catClass = item.category === "Compensation"
                      ? "is-compensation"
                      : item.category === "Candidate"
                      ? "is-candidate"
                      : item.category === "Position"
                      ? "is-position"
                      : "is-document";
                    return (
                      <button
                        key={item.token}
                        type="button"
                        className={`olc-token-pill ${catClass}`}
                        onClick={() => handleInsertToken(item.token)}
                        title={`Insert ${item.label} (${item.token}) - ${item.category}`}
                      >
                        <span className="olc-token-tag">{item.category}</span>
                        <span className="olc-token-code">{item.token}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Document Header & Salutation */}
              <div className="olc-card">
                <div className="olc-card-head">
                  <h3 className="olc-card-title">
                    <Building2 size={17} style={{ color: "var(--cms-primary, #355e3b)" }} />
                    Letterhead, Subject &amp; Opening Statement
                  </h3>
                </div>

                <div className="olc-form-row">
                  <div className="olc-form-group">
                    <label>Institution Legal Entity Name</label>
                    <input
                      type="text"
                      className="olc-input"
                      value={currentDraft.institutionName || ""}
                      onChange={(e) => handleUpdateActiveTemplate("institutionName", e.target.value)}
                    />
                  </div>
                  <div className="olc-form-group">
                    <label>Issuing Office / Department Subtitle</label>
                    <input
                      type="text"
                      className="olc-input"
                      value={currentDraft.departmentOffice || ""}
                      onChange={(e) => handleUpdateActiveTemplate("departmentOffice", e.target.value)}
                    />
                  </div>
                </div>

                <div className="olc-form-row">
                  <div className="olc-form-group">
                    <label>Document Title Header</label>
                    <input
                      type="text"
                      className="olc-input"
                      value={currentDraft.documentHeading || ""}
                      onChange={(e) => handleUpdateActiveTemplate("documentHeading", e.target.value)}
                    />
                  </div>
                </div>

                <div className="olc-form-group">
                  <label>Opening Appointment Statement</label>
                  <textarea
                    className="olc-textarea"
                    rows={3}
                    value={currentDraft.openingStatement || ""}
                    onChange={(e) => handleUpdateActiveTemplate("openingStatement", e.target.value)}
                  />
                  <small style={{ color: "#64748b", fontSize: "11px" }}>
                    Supports placeholders like <code>{`{{Designation}}`}</code>, <code>{`{{PrimaryCampus}}`}</code>, <code>{`{{BoardName}}`}</code>.
                  </small>
                </div>
              </div>

              {/* Terms and Conditions Bylaws */}
              <div className="olc-card">
                <div className="olc-card-head">
                  <h3 className="olc-card-title">
                    <ShieldCheck size={17} style={{ color: "var(--cms-primary, #355e3b)" }} />
                    Terms of Appointment &amp; Bylaws Clauses
                  </h3>
                  <div style={{ display: "flex", gap: "14px" }}>
                    <label style={{ fontSize: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
                      <input
                        type="checkbox"
                        checked={currentDraft.includeSalaryTable !== false}
                        onChange={(e) => handleUpdateActiveTemplate("includeSalaryTable", e.target.checked)}
                      />
                      Include Salary Breakdown Table
                    </label>
                    <label style={{ fontSize: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
                      <input
                        type="checkbox"
                        checked={currentDraft.includeSpecsBox !== false}
                        onChange={(e) => handleUpdateActiveTemplate("includeSpecsBox", e.target.checked)}
                      />
                      Include Specs Summary Box
                    </label>
                  </div>
                </div>

                <div className="olc-form-row">
                  <div className="olc-form-group">
                    <label>Probation Period (Months)</label>
                    <input
                      type="number"
                      className="olc-input"
                      min={1}
                      max={24}
                      value={currentDraft.probationPeriodMonths || 6}
                      onChange={(e) => handleUpdateActiveTemplate("probationPeriodMonths", Number(e.target.value))}
                    />
                  </div>
                  <div className="olc-form-group">
                    <label>Notice Period (Months)</label>
                    <input
                      type="number"
                      className="olc-input"
                      min={1}
                      max={12}
                      value={currentDraft.noticePeriodMonths || 3}
                      onChange={(e) => handleUpdateActiveTemplate("noticePeriodMonths", Number(e.target.value))}
                    />
                  </div>
                </div>

                <div className="olc-form-group">
                  <label>Service Bylaws, Code of Conduct &amp; Relocation Clauses</label>
                  <textarea
                    className="olc-textarea"
                    rows={8}
                    value={currentDraft.termsAndConditions || ""}
                    onChange={(e) => handleUpdateActiveTemplate("termsAndConditions", e.target.value)}
                  />
                  <small style={{ color: "#64748b", fontSize: "11px" }}>
                    Numbered items will appear formatted in the official printed and emailed QuestPDF document.
                  </small>
                </div>

                <div className="olc-form-row">
                  <div className="olc-form-group">
                    <label>Authorized Signatory Official Name</label>
                    <input
                      type="text"
                      className="olc-input"
                      value={currentDraft.authorizedSignatoryName || ""}
                      onChange={(e) => handleUpdateActiveTemplate("authorizedSignatoryName", e.target.value)}
                    />
                  </div>
                  <div className="olc-form-group">
                    <label>Signatory Designation / Role</label>
                    <input
                      type="text"
                      className="olc-input"
                      value={currentDraft.authorizedSignatoryRole || ""}
                      onChange={(e) => handleUpdateActiveTemplate("authorizedSignatoryRole", e.target.value)}
                    />
                  </div>
                </div>

                {/* Save / Cancel Bar */}
                <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "16px", paddingTop: "14px", borderTop: "1px solid #e2e8f0" }}>
                  {isCreatingNew && (
                    <button
                      type="button"
                      className="cms-btn cms-btn-ghost"
                      onClick={handleCancelCreateTemplate}
                      style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                    >
                      Cancel Draft
                    </button>
                  )}
                  <button
                    type="button"
                    className="cms-btn cms-btn-primary"
                    onClick={handleSaveTemplate}
                    disabled={saving}
                    style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                  >
                    <Save size={15} /> {saving ? "Saving..." : isCreatingNew ? "Create & Save Template" : "Save Template Changes"}
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column: Live Editor Proofing (Direct Visual Parity Document Sheet) */}
            <div className="olc-editor-preview-col">
              <div className="olc-sticky-preview-wrap">
                <div className="olc-preview-head">
                  <div style={{ minWidth: "160px" }}>
                    <h4 className="olc-preview-title">Live Editor Proofing</h4>
                    <span className="olc-preview-subtitle">Visual parity preview</span>
                  </div>

                  {/* Staff Selector for Live Salary & Details Verification */}
                  <div className="olc-proofing-selector-wrap">
                    <UserCheck size={13} style={{ color: "var(--cms-primary, #355e3b)", flexShrink: 0 }} />
                    <select
                      className="olc-proofing-staff-select"
                      value={selectedProofingStaffId}
                      onChange={(e) => setSelectedProofingStaffId(e.target.value)}
                      title="Select actual staff to preview their real salary and profile details"
                    >
                      <option value="sample">✨ Sample Appointee ({currentDraft.roleCategory || "Teaching"})</option>
                      {proofingStaffList.map((st) => (
                        <option key={st.id} value={st.id}>
                          👤 {st.employeeId ? `[${st.employeeId}] ` : ""}{st.firstName} {st.lastName} ({st.designation || st.department || st.staffType})
                        </option>
                      ))}
                    </select>
                    {loadingProofingPayroll && (
                      <span className="olc-fetching-indicator">Fetching salary...</span>
                    )}
                  </div>

                  {/* Export Button with Dropdown (PDF and Excel / Document) */}
                  <div className="olc-export-dropdown-wrap" ref={exportDropdownRef} style={{ position: "relative" }}>
                    <button
                      type="button"
                      className="cms-btn cms-btn-primary olc-export-btn"
                      onClick={() => setExportDropdownOpen((prev) => !prev)}
                      style={{ display: "inline-flex", alignItems: "center", gap: "6px", cursor: "pointer", height: "34px", padding: "0 14px", fontSize: "12.5px" }}
                    >
                      <Download size={14} />
                      <span>Export Letter</span>
                      <ChevronDown size={13} style={{ transform: exportDropdownOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
                    </button>
                    {exportDropdownOpen && (
                      <div className="olc-export-dropdown-menu">
                        <button
                          type="button"
                          className="olc-export-dropdown-item"
                          onClick={() => {
                            setExportDropdownOpen(false);
                            handleDownloadPdf();
                          }}
                        >
                          <span className="olc-export-icon-box pdf-type">
                            <FileText size={16} />
                          </span>
                          <span className="olc-export-item-details">
                            <strong>Download as PDF (.pdf)</strong>
                            <small>Official QuestPDF document matching preview</small>
                          </span>
                        </button>
                        <button
                          type="button"
                          className="olc-export-dropdown-item"
                          onClick={() => {
                            setExportDropdownOpen(false);
                            handleDownloadExcel();
                          }}
                        >
                          <span className="olc-export-icon-box excel-type">
                            <FileSpreadsheet size={16} />
                          </span>
                          <span className="olc-export-item-details">
                            <strong>Download as Excel (.xlsx)</strong>
                            <small>Appointment specifications &amp; salary ledger</small>
                          </span>
                        </button>
                        <button
                          type="button"
                          className="olc-export-dropdown-item"
                          onClick={() => {
                            setExportDropdownOpen(false);
                            handleDownloadDocument(currentDraft);
                          }}
                        >
                          <span className="olc-export-icon-box doc-type">
                            <FileCode size={16} />
                          </span>
                          <span className="olc-export-item-details">
                            <strong>Download as Document (.doc)</strong>
                            <small>Microsoft Word editable appointment order</small>
                          </span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Render Embedded Sheet */}
                <div className="olc-sheet-container">
                  {renderDocumentSheet(currentDraft, false, true)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------------- */}
        {/* TAB 3: AUTOMATION & EMAIL DELIVERY */}
        {/* ------------------------------------------------------------------------- */}
        {activeTab === "automation" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            {/* Top Card: Workflow Preference Selection */}
            <div className="olc-card">
              <div className="olc-card-head" style={{ borderBottom: "1px solid var(--cms-border, #e2e8f0)", paddingBottom: "16px" }}>
                <div>
                  <h3 className="olc-card-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <SlidersHorizontal size={20} style={{ color: "var(--cms-primary, #355e3b)" }} />
                    Offer Letter Workflow Preference
                  </h3>
                  <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#64748b" }}>
                    Choose how staff offer letters are generated and released when onboarding profiles are submitted.
                  </p>
                </div>
                <button
                  type="button"
                  className="cms-btn cms-btn-primary"
                  onClick={handleSaveAutomation}
                  style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                >
                  <Save size={15} /> Save Configuration
                </button>
              </div>

              {/* 2 Mutually Exclusive Workflow Option Cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "16px", marginTop: "16px" }}>
                {/* Workflow 1: Automatic */}
                <div
                  onClick={() => setAutomationSettings((prev) => ({ ...prev, workflowPreference: "Automatic", autoSendOnSubmission: true }))}
                  style={{
                    border: `2px solid ${(automationSettings.workflowPreference || "Automatic") === "Automatic" ? "var(--cms-primary, #355e3b)" : "var(--cms-border, #e2e8f0)"}`,
                    background: (automationSettings.workflowPreference || "Automatic") === "Automatic" ? "rgba(53, 94, 59, 0.04)" : "#ffffff",
                    borderRadius: "12px",
                    padding: "20px",
                    cursor: "pointer",
                    position: "relative",
                    transition: "all 0.2s ease"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <input
                        type="radio"
                        name="workflowPreference"
                        checked={(automationSettings.workflowPreference || "Automatic") === "Automatic"}
                        onChange={() => setAutomationSettings((prev) => ({ ...prev, workflowPreference: "Automatic", autoSendOnSubmission: true }))}
                        style={{ width: "18px", height: "18px", accentColor: "var(--cms-primary, #355e3b)", cursor: "pointer" }}
                      />
                      <strong style={{ fontSize: "15px", color: "#0f172a" }}>Workflow 1: Automatic Generation</strong>
                    </div>
                    <span style={{ fontSize: "11px", fontWeight: 700, padding: "3px 8px", borderRadius: "12px", background: "#ecfdf5", color: "#059669", border: "1px solid #a7f3d0" }}>
                      Instant Release
                    </span>
                  </div>
                  <p style={{ fontSize: "13px", color: "#475569", lineHeight: "1.5", margin: 0 }}>
                    When a staff member finishes onboarding (&ge; 50%) and clicks Final Submit, the backend <strong>automatically generates the offer letter</strong> and sends it immediately to their registered email address. No Admin approval is required.
                  </p>
                </div>

                {/* Workflow 2: Admin Approval Required */}
                <div
                  onClick={() => setAutomationSettings((prev) => ({ ...prev, workflowPreference: "AdminApproval", autoSendOnSubmission: false }))}
                  style={{
                    border: `2px solid ${(automationSettings.workflowPreference || "Automatic") === "AdminApproval" ? "var(--cms-primary, #355e3b)" : "var(--cms-border, #e2e8f0)"}`,
                    background: (automationSettings.workflowPreference || "Automatic") === "AdminApproval" ? "rgba(53, 94, 59, 0.04)" : "#ffffff",
                    borderRadius: "12px",
                    padding: "20px",
                    cursor: "pointer",
                    position: "relative",
                    transition: "all 0.2s ease"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <input
                        type="radio"
                        name="workflowPreference"
                        checked={(automationSettings.workflowPreference || "Automatic") === "AdminApproval"}
                        onChange={() => setAutomationSettings((prev) => ({ ...prev, workflowPreference: "AdminApproval", autoSendOnSubmission: false }))}
                        style={{ width: "18px", height: "18px", accentColor: "var(--cms-primary, #355e3b)", cursor: "pointer" }}
                      />
                      <strong style={{ fontSize: "15px", color: "#0f172a" }}>Workflow 2: Admin Approval Required</strong>
                    </div>
                    <span style={{ fontSize: "11px", fontWeight: 700, padding: "3px 8px", borderRadius: "12px", background: "#fef3c7", color: "#b45309", border: "1px solid #fde68a" }}>
                      HR Verification Required
                    </span>
                  </div>
                  <p style={{ fontSize: "13px", color: "#475569", lineHeight: "1.5", margin: 0 }}>
                    When a staff member submits details, the offer letter is <strong>NOT generated immediately</strong>. The request transitions to <em>Pending Admin Approval</em> and alerts Admin. Admin reviews the staff details to <strong>Verify, Approve, or Reject</strong> with a mandatory reason.
                  </p>
                </div>
              </div>

              {/* Email Delivery Template Settings Grid */}
              <div style={{ marginTop: "24px", paddingTop: "20px", borderTop: "1px solid var(--cms-border, #e2e8f0)" }}>
                <h4 style={{ margin: "0 0 14px", fontSize: "14px", fontWeight: 700, color: "#1e293b", display: "flex", alignItems: "center", gap: "6px" }}>
                  <Mail size={16} /> Automated Email Delivery Settings
                </h4>
                <div className="olc-automation-grid">
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    <div className="olc-form-group">
                      <label>Notification CC (HR &amp; Campus Accounts)</label>
                      <input
                        type="email"
                        className="olc-input"
                        value={automationSettings.ccHrEmail || ""}
                        onChange={(e) => setAutomationSettings({ ...automationSettings, ccHrEmail: e.target.value })}
                        placeholder="hr@pirnav.edu.in"
                      />
                      <small style={{ color: "#64748b", fontSize: "11px" }}>
                        An institutional audit copy of released offer letters will be carbon-copied here.
                      </small>
                    </div>

                    <div className="olc-form-group">
                      <label>Attached PDF Filename Pattern</label>
                      <input
                        type="text"
                        className="olc-input"
                        value={automationSettings.attachPdfFilenamePattern || "Offer_Letter_{{EmployeeId}}.pdf"}
                        onChange={(e) => setAutomationSettings({ ...automationSettings, attachPdfFilenamePattern: e.target.value })}
                      />
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    <div className="olc-form-group">
                      <label>Email Subject</label>
                      <input
                        type="text"
                        className="olc-input"
                        value={automationSettings.emailSubject || ""}
                        onChange={(e) => setAutomationSettings({ ...automationSettings, emailSubject: e.target.value })}
                      />
                    </div>

                    <div className="olc-form-group">
                      <label>Email Body Message</label>
                      <textarea
                        className="olc-textarea"
                        rows={4}
                        value={automationSettings.emailBody || ""}
                        onChange={(e) => setAutomationSettings({ ...automationSettings, emailBody: e.target.value })}
                      />
                      <small style={{ color: "#64748b", fontSize: "11px" }}>
                        Supports dynamic tokens like {'{{StaffName}}'}, {'{{EmployeeId}}'}, {'{{Designation}}'}.
                      </small>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Pending Staff Onboarding & Offer Letter Queue */}
            <div className="olc-card">
              <div className="olc-card-head" style={{ flexWrap: "wrap", gap: "14px", borderBottom: "1px solid var(--cms-border, #e2e8f0)", paddingBottom: "16px" }}>
                <div>
                  <h3 className="olc-card-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <UserCheck size={20} style={{ color: "var(--cms-primary, #355e3b)" }} />
                    Staff Onboarding &amp; Offer Letter Queue
                  </h3>
                  <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#64748b" }}>
                    Review, verify credentials, approve offer letter releases, or request corrections from applicants.
                  </p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <button
                    type="button"
                    className="cms-btn cms-btn-secondary"
                    onClick={loadRequests}
                    disabled={loadingRequests}
                    style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                  >
                    <RefreshCw size={14} className={loadingRequests ? "spin" : ""} /> Refresh Queue
                  </button>
                </div>
              </div>

              {/* Filters & Search */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", marginTop: "16px" }}>
                {/* Status Tabs */}
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  {[
                    { key: "all", label: "All Requests" },
                    { key: "pending", label: "Pending Approval" },
                    { key: "UnderVerification", label: "Under Verification" },
                    { key: "Changes Required", label: "Changes Required" },
                    { key: "Completed", label: "Approved" },
                    { key: "Onboarding Discontinued", label: "Discontinued" },
                  ].map((tab) => {
                    const count = requests.filter((r) => {
                      if (tab.key === "all") return true;
                      if (tab.key === "pending") return ["pendingapproval", "submitted"].includes(String(r.profileStatus || "").toLowerCase());
                      return String(r.profileStatus || "").toLowerCase() === tab.key.toLowerCase();
                    }).length;
                    return (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => setRequestsStatusFilter(tab.key)}
                        style={{
                          padding: "6px 14px",
                          borderRadius: "20px",
                          fontSize: "12.5px",
                          fontWeight: 600,
                          border: requestsStatusFilter === tab.key ? "1px solid var(--cms-primary, #355e3b)" : "1px solid #e2e8f0",
                          background: requestsStatusFilter === tab.key ? "var(--cms-primary, #355e3b)" : "#f8fafc",
                          color: requestsStatusFilter === tab.key ? "#ffffff" : "#475569",
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          transition: "all 0.15s ease"
                        }}
                      >
                        {tab.label} ({count})
                      </button>
                    );
                  })}
                </div>

                {/* Search Bar */}
                <div style={{ position: "relative", minWidth: "260px" }}>
                  <Search size={14} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
                  <input
                    type="text"
                    className="olc-input"
                    value={requestsSearch}
                    onChange={(e) => setRequestsSearch(e.target.value)}
                    placeholder="Search by name, ID, department..."
                    style={{ paddingLeft: "32px", fontSize: "13px" }}
                  />
                </div>
              </div>

              {/* Requests Table */}
              <div style={{ marginTop: "16px", overflowX: "auto" }}>
                {loadingRequests ? (
                  <div style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>
                    <RefreshCw size={24} className="spin" style={{ margin: "0 auto 10px" }} />
                    <p>Loading staff onboarding queue...</p>
                  </div>
                ) : requests.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "40px", background: "#f8fafc", borderRadius: "10px", border: "1px dashed #cbd5e1" }}>
                    <UserCheck size={36} style={{ color: "#94a3b8", margin: "0 auto 8px" }} />
                    <h4 style={{ margin: "0 0 4px", color: "#334155" }}>No onboarding requests found</h4>
                    <p style={{ margin: 0, fontSize: "13px", color: "#64748b" }}>
                      Staff profile submissions will appear here for verification and offer letter approval.
                    </p>
                  </div>
                ) : (
                  <table className="olc-table" style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0", textAlign: "left", fontSize: "12px", color: "#475569" }}>
                        <th style={{ padding: "12px" }}>STAFF MEMBER</th>
                        <th style={{ padding: "12px" }}>DEPARTMENT &amp; DESIGNATION</th>
                        <th style={{ padding: "12px" }}>CAMPUS</th>
                        <th style={{ padding: "12px" }}>COMPLETION</th>
                        <th style={{ padding: "12px" }}>SUBMITTED</th>
                        <th style={{ padding: "12px" }}>STATUS</th>
                        <th style={{ padding: "12px", textAlign: "right" }}>ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {requests
                        .filter((r) => {
                          if (requestsStatusFilter === "pending") {
                            return ["pendingapproval", "submitted"].includes(String(r.profileStatus || "").toLowerCase());
                          }
                          if (requestsStatusFilter !== "all") {
                            return String(r.profileStatus || "").toLowerCase() === requestsStatusFilter.toLowerCase();
                          }
                          return true;
                        })
                        .filter((r) => {
                          if (!requestsSearch.trim()) return true;
                          const q = requestsSearch.toLowerCase();
                          return (
                            (r.staffName || "").toLowerCase().includes(q) ||
                            (r.employeeId || "").toLowerCase().includes(q) ||
                            (r.department || "").toLowerCase().includes(q) ||
                            (r.designation || "").toLowerCase().includes(q)
                          );
                        })
                        .map((req) => {
                          const isHighlighted = highlightedStaffId === req.staffId;
                          const statusClean = String(req.profileStatus || "").toLowerCase();
                          const isApproved = statusClean === "completed" || statusClean === "approved";
                          const isUnderVerif = statusClean === "underverification";
                          const isChangesReq = statusClean === "changes required" || statusClean === "needscorrection";
                          const isDiscontinued = statusClean === "onboarding discontinued" || statusClean === "discontinued";
                          const isPending = !isApproved && !isUnderVerif && !isChangesReq && !isDiscontinued;

                          return (
                            <tr
                              key={req.staffId}
                              id={`staff-row-${req.staffId}`}
                              style={{
                                borderBottom: "1px solid #e2e8f0",
                                background: isHighlighted ? "#f0fdf4" : "#ffffff",
                                outline: isHighlighted ? "2px solid #22c55e" : "none",
                                transition: "background 0.2s"
                              }}
                            >
                              {/* Staff Member Info */}
                              <td style={{ padding: "14px 12px" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#e2e8f0", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                    {req.photoPath ? (
                                      <img src={req.photoPath} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                    ) : (
                                      <span style={{ fontSize: "13px", fontWeight: 700, color: "#64748b" }}>
                                        {req.staffName?.charAt(0) || "S"}
                                      </span>
                                    )}
                                  </div>
                                  <div>
                                    <div style={{ fontWeight: 700, fontSize: "13.5px", color: "#0f172a" }}>
                                      {req.staffName}
                                      {isHighlighted && (
                                        <span style={{ marginLeft: "8px", fontSize: "10px", background: "#22c55e", color: "#fff", padding: "1px 6px", borderRadius: "10px" }}>
                                          Notification Target
                                        </span>
                                      )}
                                    </div>
                                    <div style={{ fontSize: "11.5px", color: "#64748b" }}>
                                      {req.employeeId} &bull; {req.email || "No email"}
                                    </div>
                                  </div>
                                </div>
                              </td>

                              {/* Department & Designation */}
                              <td style={{ padding: "14px 12px" }}>
                                <div style={{ fontWeight: 600, fontSize: "13px", color: "#1e293b" }}>{req.designation || "Faculty"}</div>
                                <div style={{ fontSize: "11.5px", color: "#64748b" }}>{req.department || "General"}</div>
                              </td>

                              {/* Campus */}
                              <td style={{ padding: "14px 12px", fontSize: "12.5px", color: "#475569" }}>
                                {req.campusName || "Main Campus (HQ)"}
                              </td>

                              {/* Completion % */}
                              <td style={{ padding: "14px 12px" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                  <div style={{ width: "60px", height: "6px", background: "#e2e8f0", borderRadius: "3px", overflow: "hidden" }}>
                                    <div style={{ width: `${req.profileCompletionPercentage || 0}%`, height: "100%", background: (req.profileCompletionPercentage || 0) >= 50 ? "#16a34a" : "#f59e0b" }} />
                                  </div>
                                  <span style={{ fontSize: "12px", fontWeight: 600, color: "#334155" }}>
                                    {req.profileCompletionPercentage || 0}%
                                  </span>
                                </div>
                              </td>

                              {/* Submitted Date */}
                              <td style={{ padding: "14px 12px", fontSize: "12px", color: "#64748b" }}>
                                {req.submittedAt ? new Date(req.submittedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                              </td>

                              {/* Status Badge */}
                              <td style={{ padding: "14px 12px" }}>
                                {isApproved && (
                                  <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "4px 9px", borderRadius: "12px", background: "#ecfdf5", color: "#059669", fontSize: "11px", fontWeight: 700, border: "1px solid #a7f3d0" }}>
                                    <CheckCircle2 size={12} /> Approved
                                  </span>
                                )}
                                {isUnderVerif && (
                                  <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "4px 9px", borderRadius: "12px", background: "#eff6ff", color: "#1d4ed8", fontSize: "11px", fontWeight: 700, border: "1px solid #bfdbfe" }}>
                                    <ShieldCheck size={12} /> Under Verification
                                  </span>
                                )}
                                {isChangesReq && (
                                  <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "4px 9px", borderRadius: "12px", background: "#fff1f2", color: "#e11d48", fontSize: "11px", fontWeight: 700, border: "1px solid #fecdd3" }} title={req.correctionNotes}>
                                    <AlertTriangle size={12} /> Changes Required
                                  </span>
                                )}
                                {isDiscontinued && (
                                  <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "4px 9px", borderRadius: "12px", background: "#f1f5f9", color: "#64748b", fontSize: "11px", fontWeight: 700, border: "1px solid #cbd5e1" }}>
                                    <X size={12} /> Discontinued
                                  </span>
                                )}
                                {isPending && (
                                  <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "4px 9px", borderRadius: "12px", background: "#fef3c7", color: "#b45309", fontSize: "11px", fontWeight: 700, border: "1px solid #fde68a" }}>
                                    <Clock size={12} /> Pending Approval
                                  </span>
                                )}
                              </td>

                              {/* Actions */}
                              <td style={{ padding: "14px 12px", textAlign: "right" }}>
                                <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                                  {/* Verify Action */}
                                  <button
                                    type="button"
                                    className="cms-btn cms-btn-secondary"
                                    onClick={() => {
                                      setActiveVerifyRequest(req);
                                      setVerificationNotes(req.correctionNotes || "");
                                    }}
                                    style={{ padding: "5px 10px", fontSize: "12px", display: "inline-flex", alignItems: "center", gap: "4px" }}
                                    title="Verify submitted details"
                                  >
                                    <Eye size={13} /> Verify
                                  </button>

                                  {/* Approve Action */}
                                  {!isApproved && !isDiscontinued && (
                                    <button
                                      type="button"
                                      className="cms-btn cms-btn-primary"
                                      onClick={() => {
                                        setActiveApproveRequest(req);
                                        setApprovalRemarks("");
                                      }}
                                      style={{ padding: "5px 10px", fontSize: "12px", display: "inline-flex", alignItems: "center", gap: "4px", background: "#16a34a", color: "#ffffff", border: "none" }}
                                      title="Approve onboarding and release Offer Letter"
                                    >
                                      <Check size={13} /> Approve
                                    </button>
                                  )}

                                  {/* Reject Action */}
                                  {!isApproved && !isDiscontinued && (
                                    <button
                                      type="button"
                                      className="cms-btn"
                                      onClick={() => {
                                        setActiveRejectRequest(req);
                                        setRejectionScenario("Correction");
                                        setRejectionReason("");
                                        setRevisedDate(req.joiningDate ? req.joiningDate.slice(0, 10) : "");
                                      }}
                                      style={{ padding: "5px 10px", fontSize: "12px", display: "inline-flex", alignItems: "center", gap: "4px", background: "#fff1f2", color: "#e11d48", border: "1px solid #fecdd3" }}
                                      title="Reject, reschedule date, or request corrections"
                                    >
                                      <X size={13} /> Reject
                                    </button>
                                  )}

                                  {/* Download Offer Letter (if approved) */}
                                  {isApproved && (
                                    <button
                                      type="button"
                                      className="cms-btn cms-btn-secondary"
                                      onClick={() => handleDownloadStaffOfferPdf(req.staffId, req.employeeId)}
                                      style={{ padding: "5px 10px", fontSize: "12px", display: "inline-flex", alignItems: "center", gap: "4px" }}
                                      title="Download QuestPDF Offer Letter"
                                    >
                                      <Download size={13} /> Offer PDF
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* VERIFY MODAL / DRAWER */}
            {activeVerifyRequest && (
              <div className="olc-modal-backdrop" onClick={() => setActiveVerifyRequest(null)}>
                <div className="olc-modal-sheet" style={{ maxWidth: "680px" }} onClick={(e) => e.stopPropagation()}>
                  <div className="olc-modal-header">
                    <div className="olc-modal-title-group">
                      <div className="olc-header-icon-wrap" style={{ width: 36, height: 36, background: "#eff6ff", color: "#1d4ed8" }}>
                        <ShieldCheck size={18} />
                      </div>
                      <div>
                        <h4 className="olc-modal-title">Verify Staff Onboarding Credentials</h4>
                        <span style={{ fontSize: "12px", color: "#64748b" }}>
                          {activeVerifyRequest.staffName} ({activeVerifyRequest.employeeId}) &bull; {activeVerifyRequest.department}
                        </span>
                      </div>
                    </div>
                    <button type="button" className="olc-modal-close-btn" onClick={() => setActiveVerifyRequest(null)}>
                      <X size={18} />
                    </button>
                  </div>

                  <div className="olc-modal-body" style={{ maxHeight: "70vh", overflowY: "auto" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", background: "#f8fafc", padding: "14px", borderRadius: "10px", marginBottom: "16px", fontSize: "13px" }}>
                      <div><strong>Designation:</strong> {activeVerifyRequest.designation || "Faculty"}</div>
                      <div><strong>Campus:</strong> {activeVerifyRequest.campusName || "Main Campus"}</div>
                      <div><strong>Joining Date:</strong> {activeVerifyRequest.joiningDate ? new Date(activeVerifyRequest.joiningDate).toLocaleDateString("en-GB") : "—"}</div>
                      <div><strong>Completion:</strong> {activeVerifyRequest.profileCompletionPercentage}%</div>
                      <div><strong>Email:</strong> {activeVerifyRequest.email || "—"}</div>
                      <div><strong>Mobile:</strong> {activeVerifyRequest.mobile || "—"}</div>
                    </div>

                    <div className="olc-form-group">
                      <label>Verification Notes / Observations (Saved to Audit Log)</label>
                      <textarea
                        className="olc-textarea"
                        rows={3}
                        value={verificationNotes}
                        onChange={(e) => setVerificationNotes(e.target.value)}
                        placeholder="e.g. Identity and degrees verified against institutional archives; all mandatory documents accounted for."
                      />
                    </div>

                    <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", padding: "12px", borderRadius: "8px", fontSize: "12px", color: "#1e40af", lineHeight: "1.5" }}>
                      <strong>Note:</strong> Verification confirms credential correctness without automatically generating or releasing the offer letter. To dispatch the offer letter, click Approve.
                    </div>
                  </div>

                  <div className="olc-modal-footer">
                    <button type="button" className="cms-btn cms-btn-secondary" onClick={() => setActiveVerifyRequest(null)}>
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="cms-btn cms-btn-primary"
                      onClick={handleConfirmVerify}
                      disabled={isSubmittingDecision}
                      style={{ background: "#1d4ed8", color: "#ffffff" }}
                    >
                      {isSubmittingDecision ? <RefreshCw size={14} className="spin" /> : <ShieldCheck size={14} />} Mark as Verified
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* APPROVE MODAL */}
            {activeApproveRequest && (
              <div className="olc-modal-backdrop" onClick={() => setActiveApproveRequest(null)}>
                <div className="olc-modal-sheet" style={{ maxWidth: "560px" }} onClick={(e) => e.stopPropagation()}>
                  <div className="olc-modal-header">
                    <div className="olc-modal-title-group">
                      <div className="olc-header-icon-wrap" style={{ width: 36, height: 36, background: "#ecfdf5", color: "#059669" }}>
                        <CheckCircle2 size={18} />
                      </div>
                      <div>
                        <h4 className="olc-modal-title">Approve Offer Letter Release</h4>
                        <span style={{ fontSize: "12px", color: "#64748b" }}>
                          Generate QuestPDF and email to {activeApproveRequest.staffName}
                        </span>
                      </div>
                    </div>
                    <button type="button" className="olc-modal-close-btn" onClick={() => setActiveApproveRequest(null)}>
                      <X size={18} />
                    </button>
                  </div>

                  <div className="olc-modal-body">
                    <p style={{ fontSize: "13.5px", color: "#334155", lineHeight: "1.6", margin: "0 0 16px" }}>
                      Upon confirmation, the system will:
                    </p>
                    <ul style={{ margin: "0 0 16px 20px", padding: 0, fontSize: "13px", color: "#475569", lineHeight: "1.6" }}>
                      <li>Generate the official signed <strong>QuestPDF Offer Letter</strong> using the configured template.</li>
                      <li>Send an approval email to <strong>{activeApproveRequest.email || "registered email"}</strong> with the PDF attached and a clickable <strong>"Access Your Staff Portal"</strong> action button.</li>
                      <li>Deliver an instant notification to the staff member's Staff Portal Notification Center.</li>
                      <li>Unlock the employee's full Staff Portal access.</li>
                    </ul>

                    <div className="olc-form-group">
                      <label>Administrative Remarks (Optional Audit Log)</label>
                      <input
                        type="text"
                        className="olc-input"
                        value={approvalRemarks}
                        onChange={(e) => setApprovalRemarks(e.target.value)}
                        placeholder="e.g. Approved by Central HR Committee."
                      />
                    </div>
                  </div>

                  <div className="olc-modal-footer">
                    <button type="button" className="cms-btn cms-btn-secondary" onClick={() => setActiveApproveRequest(null)}>
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="cms-btn cms-btn-primary"
                      onClick={handleConfirmApprove}
                      disabled={isSubmittingDecision}
                      style={{ background: "#16a34a", color: "#ffffff", display: "inline-flex", alignItems: "center", gap: "6px" }}
                    >
                      {isSubmittingDecision ? <RefreshCw size={14} className="spin" /> : <Check size={14} />} Confirm Approval &amp; Release Offer Letter
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* REJECT MODAL (3 Scenarios) */}
            {activeRejectRequest && (
              <div className="olc-modal-backdrop" onClick={() => setActiveRejectRequest(null)}>
                <div className="olc-modal-sheet" style={{ maxWidth: "600px" }} onClick={(e) => e.stopPropagation()}>
                  <div className="olc-modal-header">
                    <div className="olc-modal-title-group">
                      <div className="olc-header-icon-wrap" style={{ width: 36, height: 36, background: "#fff1f2", color: "#e11d48" }}>
                        <AlertTriangle size={18} />
                      </div>
                      <div>
                        <h4 className="olc-modal-title">Reject Onboarding / Request Corrections</h4>
                        <span style={{ fontSize: "12px", color: "#64748b" }}>
                          Applicant: {activeRejectRequest.staffName} ({activeRejectRequest.employeeId})
                        </span>
                      </div>
                    </div>
                    <button type="button" className="olc-modal-close-btn" onClick={() => setActiveRejectRequest(null)}>
                      <X size={18} />
                    </button>
                  </div>

                  <div className="olc-modal-body" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    {/* Scenario Radio Tabs */}
                    <div>
                      <label style={{ display: "block", fontSize: "12.5px", fontWeight: 700, color: "#334155", marginBottom: "8px" }}>
                        Select Rejection Scenario *
                      </label>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
                        {[
                          { key: "Correction", label: "Details Correction", sub: "Staff can edit & resubmit" },
                          { key: "DateChange", label: "Date Changed", sub: "Reschedule joining date" },
                          { key: "Discontinue", label: "Discontinue", sub: "Permanent cancellation" },
                        ].map((sc) => (
                          <div
                            key={sc.key}
                            onClick={() => setRejectionScenario(sc.key)}
                            style={{
                              border: `1.5px solid ${rejectionScenario === sc.key ? "#e11d48" : "#e2e8f0"}`,
                              background: rejectionScenario === sc.key ? "#fff1f2" : "#ffffff",
                              borderRadius: "8px",
                              padding: "10px",
                              cursor: "pointer",
                              textAlign: "center"
                            }}
                          >
                            <div style={{ fontWeight: 700, fontSize: "12px", color: rejectionScenario === sc.key ? "#9f1239" : "#334155" }}>
                              {sc.label}
                            </div>
                            <div style={{ fontSize: "10.5px", color: "#64748b", marginTop: "2px" }}>
                              {sc.sub}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Scenario 1: Date Changed Fields */}
                    {rejectionScenario === "DateChange" && (
                      <div className="olc-form-group">
                        <label>Revised Onboarding / Joining Date *</label>
                        <input
                          type="date"
                          className="olc-input"
                          value={revisedDate}
                          onChange={(e) => setRevisedDate(e.target.value)}
                        />
                      </div>
                    )}

                    {/* Mandatory Reason Field */}
                    <div className="olc-form-group">
                      <label>
                        Reason for Rejection / Modification *
                        <span style={{ color: "#e11d48", marginLeft: "4px" }}>(Mandatory)</span>
                      </label>
                      <textarea
                        className="olc-textarea"
                        rows={4}
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        placeholder={
                          rejectionScenario === "DateChange"
                            ? "Explain why the onboarding date has been rescheduled..."
                            : rejectionScenario === "Discontinue"
                            ? "Provide official explanation for discontinuation of onboarding..."
                            : "Specify exactly which fields or documents the staff member must correct..."
                        }
                      />
                      <small style={{ color: "#64748b", fontSize: "11px" }}>
                        This explanation will be included in the email and Staff Portal notification dispatched to the employee.
                      </small>
                    </div>
                  </div>

                  <div className="olc-modal-footer">
                    <button type="button" className="cms-btn cms-btn-secondary" onClick={() => setActiveRejectRequest(null)}>
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="cms-btn cms-btn-primary"
                      onClick={handleConfirmReject}
                      disabled={isSubmittingDecision}
                      style={{ background: "#e11d48", color: "#ffffff", display: "inline-flex", alignItems: "center", gap: "6px" }}
                    >
                      {isSubmittingDecision ? <RefreshCw size={14} className="spin" /> : <X size={14} />} Confirm Decision &amp; Dispatch Notice
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ADD CUSTOM TOKEN MODAL */}
        {showAddTokenModal && (
          <div className="olc-modal-backdrop" onClick={() => setShowAddTokenModal(false)}>
            <div className="olc-modal-sheet" style={{ maxWidth: "460px" }} onClick={(e) => e.stopPropagation()}>
              <div className="olc-modal-header">
                <div className="olc-modal-title-group">
                  <div className="olc-header-icon-wrap" style={{ width: 34, height: 34 }}>
                    <Sparkles size={16} />
                  </div>
                  <div>
                    <h4 className="olc-modal-title">Create Custom Dynamic Token</h4>
                    <span style={{ fontSize: "11.5px", color: "#64748b" }}>
                      Define a new token tag to insert into offer letters.
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  className="olc-modal-close-btn"
                  onClick={() => setShowAddTokenModal(false)}
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleAddCustomToken} style={{ padding: "18px 22px" }}>
                <div className="olc-form-row">
                  <div className="olc-form-group" style={{ flex: 1 }}>
                    <label>Token Key <span style={{ color: "#dc2626" }}>*</span></label>
                    <input
                      type="text"
                      className="olc-input"
                      placeholder="e.g. ReportingTime, ProbationTarget"
                      value={newTokenKey}
                      onChange={(e) => setNewTokenKey(e.target.value)}
                      required
                    />
                    <span style={{ fontSize: "11px", color: "#64748b", marginTop: "3px" }}>
                      Previews as: <strong style={{ color: "var(--cms-primary, #355e3b)" }}>&#123;&#123;{newTokenKey.replace(/[^a-zA-Z0-9]/g, "") || "YourToken"}&#125;&#125;</strong>
                    </span>
                  </div>
                </div>

                <div className="olc-form-row">
                  <div className="olc-form-group" style={{ flex: 1 }}>
                    <label>Display Label</label>
                    <input
                      type="text"
                      className="olc-input"
                      placeholder="e.g. Daily Reporting Time"
                      value={newTokenLabel}
                      onChange={(e) => setNewTokenLabel(e.target.value)}
                    />
                  </div>
                </div>

                <div className="olc-form-row">
                  <div className="olc-form-group" style={{ flex: 1 }}>
                    <label>Sample Fallback Preview</label>
                    <input
                      type="text"
                      className="olc-input"
                      placeholder="e.g. 08:30 AM"
                      value={newTokenFallback}
                      onChange={(e) => setNewTokenFallback(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "18px" }}>
                  <button
                    type="button"
                    className="cms-btn cms-btn-ghost"
                    onClick={() => setShowAddTokenModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="cms-btn cms-btn-primary"
                    style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                  >
                    <Plus size={14} /> Add Token to Shelf
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
