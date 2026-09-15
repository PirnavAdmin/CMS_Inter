import { useState, useMemo, useCallback, useEffect } from "react";
import { Link, useNavigate, useParams, useLocation } from "react-router-dom";
import {
  FileText,
  Search,
  Filter,
  Plus,
  Edit,
  Eye,
  Download,
  Copy,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Layers,
  Layout,
  SlidersHorizontal,
  Image as ImageIcon,
  QrCode as QrCodeIcon,
  PenTool,
  Square,
  Palette,
  Settings2,
  Type,
  ChevronRight,
  ChevronLeft,
  ArrowUp,
  ArrowDown,
  UploadCloud,
  FileSpreadsheet,
  FileCode,
  Check,
  X,
  HelpCircle,
  Clock,
  Printer,
  ShieldCheck,
  RefreshCw,
  FolderKanban,
  Award,
  Lock,
} from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import Search3DIcon from "@/components/common/Search3DIcon.jsx";
import { Toast } from "@/components/common/Ui.jsx";
import "./TemplatesPage.css";

// Dynamic demo student details used for live real-time preview rendering
export const DEMO_STUDENT = {
  student_name: "Rahul Kumar",
  admission_no: "ADM-2026-0017",
  student_id: "518",
  roll_no: "2601518",
  father_name: "Suresh Kumar",
  mother_name: "Anita Devi",
  academic_year: "2026-2027",
  academic_level: "I / II Year",
  group_name: "MPC",
  section: "A",
  board_name: "Board of Intermediate Education, Andhra Pradesh (BIEAP)",
  course_name: "Intermediate (MPC)",
  certificate_number: "BC/2026/001",
  issue_date: "05 Sep 2026",
  place: "Vijayawada",
  purpose: "Higher Education",
  principal_name: "Dr. S. K. Rao",
  study_from: "June 2025",
  study_to: "May 2027",
  conduct_rating: "Good",
  amount_paid: "45,000",
  amount_in_words: "Forty Five Thousand Only",
  medium: "English",
  dob: "14 August 2008",
  date_of_admission: "10 June 2025",
  reason_for_leaving: "Completed Course",
  dues_cleared: "YES",
  tuition_dues: "CLEARED",
  lib_dues: "CLEARED",
  hostel_dues: "NO DUES",
  transport_dues: "NO DUES",
  overall_dues_status: "CLEARED",
  fee_type: "Tuition & Examination Fees",
  payment_date: "01 Sep 2026",
  receipt_number: "REC-2026-992",
  custom_body: "has actively participated in the College Annual Sports Meet 2026 and won First Place in the 100m Athletic Sprint",
};

// Helper: Interpolate dynamic token placeholders with demo student values
export function renderWithDemoData(text, template = {}, overrideDemo = {}) {
  if (!text) return "";
  const refNo = `${template.refPrefix || "CERT"}/2026/001`;
  const merged = {
    ...DEMO_STUDENT,
    certificate_number: refNo,
    ...overrideDemo,
  };
  return text.replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (match, key) => {
    return merged[key] !== undefined ? merged[key] : `[${key}]`;
  });
}

// 5 DEFAULT BUILT-IN CERTIFICATE TEMPLATES (Matching Certificate Types)
export const DEFAULT_CERTIFICATE_TEMPLATES = [
  {
    id: "certificate-bonafide",
    name: "Bonafide Certificate",
    type: "Certificate",
    category: "Student Certificate",
    status: "Active",
    format: "PDF",
    version: "1.0",
    lastModified: "05 Sep 2026",
    description: "Official certificate confirming student enrollment and bonafide status.",
    orientation: "Landscape",
    pageSize: "A4",
    borderStyle: "Navy Ornate",
    borderColor: "#1e3a8a",
    badgeBgColor: "#1e3a8a",
    badgeTextColor: "#ffffff",
    seal: "Principal Seal",
    sealColor: "#1e3a8a",
    qrEnabled: true,
    signatureType: "Principal",
    builtIn: true,
    accent: "navy",
    refPrefix: "BC",
    content: "This is to certify that Mr./Ms. {{student_name}} (S/o / D/o {{father_name}}) bearing Student ID {{student_id}} is a bonafide student of Pirnav College (Intermediate / Junior College), Vijayawada. He/She is studying in {{group_name}} Group, {{academic_level}} during the academic year {{academic_year}}.",
    purpose: "Higher Studies / Passport / Bank Loan",
    dynamicFields: [
      "{{student_name}}", "{{student_id}}", "{{admission_no}}", "{{father_name}}",
      "{{group_name}}", "{{academic_level}}", "{{academic_year}}", "{{purpose}}",
      "{{certificate_number}}", "{{issue_date}}", "{{place}}"
    ],
  },
  {
    id: "certificate-study",
    name: "Study Certificate",
    type: "Certificate",
    category: "Student Certificate",
    status: "Active",
    format: "PDF",
    version: "1.0",
    lastModified: "05 Sep 2026",
    description: "Proof of study duration and academic level completion.",
    orientation: "Landscape",
    pageSize: "A4",
    borderStyle: "Emerald Ornate",
    borderColor: "#15803d",
    badgeBgColor: "#15803d",
    badgeTextColor: "#ffffff",
    seal: "Principal Seal",
    sealColor: "#15803d",
    qrEnabled: true,
    signatureType: "Principal",
    builtIn: true,
    accent: "green",
    refPrefix: "SC",
    content: "This is to certify that Mr./Ms. {{student_name}} (S/o / D/o {{father_name}}) bearing Student ID {{student_id}} has studied in this college during the period from {{study_from}} to {{study_to}} in {{group_name}} Group and appeared for the Intermediate Public Examination conducted by the {{board_name}}.",
    purpose: "General Verification",
    dynamicFields: [
      "{{student_name}}", "{{student_id}}", "{{admission_no}}", "{{father_name}}",
      "{{study_from}}", "{{study_to}}", "{{group_name}}", "{{board_name}}",
      "{{certificate_number}}", "{{issue_date}}", "{{place}}"
    ],
  },
  {
    id: "certificate-conduct",
    name: "Conduct Certificate",
    type: "Certificate",
    category: "Student Certificate",
    status: "Active",
    format: "PDF",
    version: "1.0",
    lastModified: "05 Sep 2026",
    description: "Certificate attesting to student character and conduct during study.",
    orientation: "Landscape",
    pageSize: "A4",
    borderStyle: "Maroon Ornate",
    borderColor: "#991b1b",
    badgeBgColor: "#991b1b",
    badgeTextColor: "#ffffff",
    seal: "Principal Seal",
    sealColor: "#991b1b",
    qrEnabled: true,
    signatureType: "Principal",
    builtIn: true,
    accent: "maroon",
    refPrefix: "CC",
    content: "This is to certify that Mr./Ms. {{student_name}} (S/o / D/o {{father_name}}) bearing Student ID {{student_id}} has been a student of this college during the academic year(s) {{academic_year}}.\nTo the best of our knowledge and records, his/her conduct and character have been {{conduct_rating}}.",
    purpose: "Employment / Higher Education",
    dynamicFields: [
      "{{student_name}}", "{{student_id}}", "{{admission_no}}", "{{father_name}}",
      "{{academic_year}}", "{{conduct_rating}}", "{{certificate_number}}",
      "{{issue_date}}", "{{place}}"
    ],
  },
  {
    id: "certificate-transfer",
    name: "Transfer Certificate",
    type: "Certificate",
    category: "Student Certificate",
    status: "Active",
    format: "PDF",
    version: "1.0",
    lastModified: "05 Sep 2026",
    description: "Official Transfer Certificate issued upon relieving or leaving the institution.",
    orientation: "Landscape",
    pageSize: "A4",
    borderStyle: "Gold Ornate",
    borderColor: "#b45309",
    badgeBgColor: "#b45309",
    badgeTextColor: "#ffffff",
    seal: "Principal Seal",
    sealColor: "#b45309",
    qrEnabled: true,
    signatureType: "Principal",
    builtIn: true,
    accent: "gold",
    refPrefix: "TC",
    content: "This is to certify that Mr./Ms. {{student_name}} (S/o / D/o {{father_name}}) bearing Student ID {{student_id}} has studied in this college from {{study_from}} to {{study_to}}.\nHe/She is hereby relieved from this institution as he/she is seeking admission elsewhere. There are no dues towards the college.\nWe wish him/her all the best for his/her future endeavours.",
    purpose: "Institution Transfer",
    dynamicFields: [
      "{{student_name}}", "{{student_id}}", "{{admission_no}}", "{{father_name}}",
      "{{mother_name}}", "{{dob}}", "{{date_of_admission}}", "{{study_from}}",
      "{{study_to}}", "{{reason_for_leaving}}", "{{dues_cleared}}",
      "{{certificate_number}}", "{{issue_date}}", "{{place}}"
    ],
  },
  {
    id: "certificate-custom",
    name: "Others",
    type: "Certificate",
    category: "Student Certificate",
    status: "Draft",
    format: "PDF",
    version: "1.0",
    lastModified: "05 Sep 2026",
    description: "Configurable generic certificate template for custom college requirements.",
    orientation: "Landscape",
    pageSize: "A4",
    borderStyle: "Teal Ornate",
    borderColor: "#0f766e",
    badgeBgColor: "#0f766e",
    badgeTextColor: "#ffffff",
    seal: "College Seal",
    sealColor: "#0f766e",
    qrEnabled: true,
    signatureType: "Principal",
    builtIn: true,
    accent: "teal",
    refPrefix: "OC",
    content: "This is to certify that Mr./Ms. {{student_name}} (S/o / D/o {{father_name}}) bearing Student ID {{student_id}}.\nThis is to certify that {{custom_body}}.",
    purpose: "General Purpose / Custom Event",
    dynamicFields: [
      "{{student_name}}", "{{student_id}}", "{{admission_no}}", "{{father_name}}",
      "{{custom_body}}", "{{purpose}}", "{{certificate_number}}",
      "{{issue_date}}", "{{place}}"
    ],
  },
];

export const TEMPLATES_STORAGE_KEY = "cms_certificate_templates_v1";

export function getStoredCertificateTemplates() {
  try {
    const raw = localStorage.getItem(TEMPLATES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return DEFAULT_CERTIFICATE_TEMPLATES;
}

export function saveCertificateTemplates(templatesList) {
  try {
    localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(templatesList));
  } catch {}
}

const INITIAL_TEMPLATES = [
  ...DEFAULT_CERTIFICATE_TEMPLATES,
];

const DYNAMIC_FIELD_TOKENS = [
  "{{student_name}}",
  "{{student_id}}",
  "{{admission_no}}",
  "{{roll_no}}",
  "{{father_name}}",
  "{{mother_name}}",
  "{{academic_year}}",
  "{{academic_level}}",
  "{{group_name}}",
  "{{section}}",
  "{{board_name}}",
  "{{course_name}}",
  "{{certificate_number}}",
  "{{issue_date}}",
  "{{place}}",
  "{{purpose}}",
  "{{principal_name}}",
  "{{study_from}}",
  "{{study_to}}",
  "{{conduct_rating}}",
  "{{medium}}",
  "{{amount_paid}}",
  "{{amount_in_words}}",
  "{{fee_type}}",
];

export default function TemplatesPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();

  // Primary templates state loaded from localStorage or built-in defaults
  const [templates, setTemplates] = useState(() => getStoredCertificateTemplates());
  const [toastMessage, setToastMessage] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  // Sync templates to localStorage whenever modified
  useEffect(() => {
    saveCertificateTemplates(templates);
  }, [templates]);

  // Active Main Tab: "certificates" | "upload"
  const [activeTab, setActiveTab] = useState(() => {
    if (location.pathname.includes("/upload")) return "upload";
    return "certificates";
  });

  // Common filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All Categories");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [selectedCertType, setSelectedCertType] = useState("All Certificate Types");
  const [sortBy, setSortBy] = useState("Default Order");

  // Determine current route screen view mode
  const viewMode = useMemo(() => {
    const path = location.pathname;
    if (path.includes("/certificates/") && path.includes("/edit")) return "edit-certificate";
    if (path.includes("/reports/") && path.includes("/edit")) return "edit-report";
    if (path.includes("/letters/") && path.includes("/edit")) return "edit-letter";
    if (path.includes("/preview")) return "preview";
    if (path.endsWith("/upload")) return "upload-route";
    if (path.endsWith("/add")) return "add-template";
    return "dashboard";
  }, [location.pathname]);

  // Current active template target for editor or preview
  const currentTemplate = useMemo(() => {
    if (!id) return templates[0] || INITIAL_TEMPLATES[0];
    return templates.find((t) => t.id === id) || INITIAL_TEMPLATES[0];
  }, [id, templates]);

  // Helper toast notification
  const notify = useCallback((msg) => {
    setToastMessage(msg);
  }, []);

  // Handler: Mock download template
  const handleDownloadTemplate = useCallback(
    (template) => {
      const target = template || currentTemplate;
      const renderedBody = renderWithDemoData(target.content || target.description, target);
      const content = `PIRNAV COLLEGE MANAGEMENT SYSTEM\n=========================================\n${target.name.toUpperCase()}\nRef No: ${target.refPrefix || 'CERT'}/2026/001 | Date: 05 Sep 2026\nCategory: ${target.category}\nVersion: ${target.version}\nStatus: ${target.status}\n=========================================\n\n${renderedBody}\n\nPurpose: ${target.purpose || 'Official Use'}\nPlace: Vijayawada\nSignature: ${target.signatureType || 'Principal'}, Pirnav College\n`;
      const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${target.name.toLowerCase().replace(/[^a-z0-9]+/g, "_")}_template.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      notify(`Downloaded demo file for "${target.name}".`);
    },
    [currentTemplate, notify]
  );

  // Handler: Duplicate template
  const handleDuplicateTemplate = useCallback(
    (template) => {
      const copy = {
        ...template,
        id: `custom-copy-${Date.now()}`,
        name: `Copy of ${template.name}`,
        status: "Draft",
        version: "1.0",
        builtIn: false, // Duplicated template is Admin-created
        lastModified: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
      };
      setTemplates((prev) => [copy, ...prev]);
      notify(`Duplicated template "${template.name}" as custom draft.`);
    },
    [notify]
  );

  // Handler: Reset built-in template to default design
  const handleResetToDefault = useCallback(
    (templateId) => {
      const defaultVersion = DEFAULT_CERTIFICATE_TEMPLATES.find((t) => t.id === templateId);
      if (!defaultVersion) {
        notify("Only built-in default templates can be reset to default.");
        return;
      }
      if (window.confirm(`Reset "${defaultVersion.name}" to its original built-in design? This will overwrite your custom changes for this template.`)) {
        setTemplates((prev) => prev.map((t) => (t.id === templateId ? { ...defaultVersion } : t)));
        notify(`Reset "${defaultVersion.name}" to original default design.`);
      }
    },
    [notify]
  );

  // Handler: Delete template (Admin-created only)
  const handleDeleteTemplate = useCallback(
    (templateId) => {
      const target = templates.find((t) => t.id === templateId);
      if (target?.builtIn) {
        notify("Default system certificate templates cannot be deleted.");
        setDeleteConfirmId(null);
        return;
      }
      setTemplates((prev) => prev.filter((t) => t.id !== templateId));
      setDeleteConfirmId(null);
      notify("Template deleted successfully.");
    },
    [templates, notify]
  );

  // Filtered Templates calculation
  const filteredTemplates = useMemo(() => {
    return templates
      .filter((t) => {
        // Tab filter
        if (activeTab === "certificates" && t.type !== "Certificate") return false;
        if (activeTab === "reports" && t.type !== "Report") return false;
        if (activeTab === "letters" && t.type !== "Letter") return false;

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchesName = t.name.toLowerCase().includes(q);
          const matchesCat = t.category.toLowerCase().includes(q);
          const matchesType = t.type.toLowerCase().includes(q);
          if (!matchesName && !matchesCat && !matchesType) return false;
        }

        // Category filter
        if (selectedCategory !== "All Categories" && t.category !== selectedCategory) return false;

        // Status filter
        if (selectedStatus !== "All" && t.status !== selectedStatus) return false;

        // Cert type filter
        if (selectedCertType !== "All Certificate Types" && selectedCertType !== "All Types") {
          if (!t.name.toLowerCase().includes(selectedCertType.toLowerCase())) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "Name A-Z") return a.name.localeCompare(b.name);
        if (sortBy === "Name Z-A") return b.name.localeCompare(a.name);
        if (sortBy === "Category") return a.category.localeCompare(b.category);
        if (sortBy === "Status") return a.status.localeCompare(b.status);
        return 0; // Default Order preserves initial 1-9 built-in sequence
      });
  }, [templates, activeTab, searchQuery, selectedCategory, selectedStatus, selectedCertType, sortBy]);

  // Render sub-screens depending on viewMode
  if (viewMode === "edit-certificate") {
    return (
      <CertificateEditorScreen
        template={currentTemplate}
        onSave={(updated) => {
          setTemplates((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
          notify(`Template "${updated.name}" saved successfully.`);
        }}
        onResetDefault={() => handleResetToDefault(currentTemplate.id)}
        onDownload={handleDownloadTemplate}
        notify={notify}
      />
    );
  }

  if (viewMode === "edit-report") {
    return (
      <ReportEditorScreen
        template={currentTemplate}
        onSave={(updated) => {
          setTemplates((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
          notify(`Report template "${updated.name}" saved.`);
        }}
        notify={notify}
      />
    );
  }

  if (viewMode === "edit-letter") {
    return (
      <LetterEditorScreen
        template={currentTemplate}
        onSave={(updated) => {
          setTemplates((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
          notify(`Letter template "${updated.name}" saved.`);
        }}
        notify={notify}
      />
    );
  }

  if (viewMode === "preview") {
    return (
      <TemplatePreviewScreen
        template={currentTemplate}
        onDownload={handleDownloadTemplate}
        notify={notify}
      />
    );
  }

  if (viewMode === "add-template") {
    return (
      <AddTemplateWizardScreen
        onAdd={(newTemp) => {
          setTemplates((prev) => [...prev, newTemp]);
          notify(`New template "${newTemp.name}" created!`);
          navigate("/dashboard/settings/templates");
        }}
      />
    );
  }

  return (
    <DashboardLayout
      title="Document & Certificate Templates"
      subtitle="Download, customize and manage templates for various documents and certificates."
      breadcrumb={["Home", "Settings", "Templates"]}
    >
      <main className="templates-main-container">
        {/* Main Tabs Navigation */}
        <nav className="templates-tabs-bar" aria-label="Template Categories">
          <button
            type="button"
            className={`templates-tab-btn ${activeTab === "certificates" ? "active" : ""}`}
            onClick={() => setActiveTab("certificates")}
          >
            <Award size={15} /> Certificates
          </button>
          <button
            type="button"
            className={`templates-tab-btn ${activeTab === "upload" ? "active" : ""}`}
            onClick={() => setActiveTab("upload")}
          >
            <UploadCloud size={15} /> Upload Templates
          </button>
        </nav>

        {/* Upload Templates Screen when activeTab is upload */}
        {activeTab === "upload" ? (
          <UploadTemplateTabSection
            onUploaded={(newTemp) => {
              setTemplates((prev) => [...prev, newTemp]);
              notify(`Uploaded new template "${newTemp.name}".`);
              setActiveTab("certificates");
            }}
            notify={notify}
          />
        ) : (
          <>
            {/* Common Top Toolbar */}
            <div className="templates-toolbar">
              <div className="templates-search-box">
                <Search3DIcon size={15} className="templates-search-icon" />
                <input
                  type="text"
                  placeholder="Search templates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button type="button" className="templates-clear-search" onClick={() => setSearchQuery("")}>
                    <X size={14} />
                  </button>
                )}
              </div>

              <div className="templates-filter-group">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="templates-select-filter"
                >
                  <option value="All Categories">All Categories</option>
                  <option value="Student Certificate">Student Certificate</option>
                  <option value="Academic">Academic</option>
                  <option value="HR">HR</option>
                  <option value="Finance">Finance</option>
                  <option value="Admission">Admission</option>
                </select>

                {activeTab === "certificates" && (
                  <select
                    value={selectedCertType}
                    onChange={(e) => setSelectedCertType(e.target.value)}
                    className="templates-select-filter"
                  >
                    <option value="All Certificate Types">All Certificate Types</option>
                    <option value="Bonafide">Bonafide</option>
                    <option value="Study">Study</option>
                    <option value="Conduct">Conduct</option>
                    <option value="Transfer">Transfer</option>
                    <option value="Others">Others</option>
                  </select>
                )}

                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="templates-select-filter"
                >
                  <option value="All">All Status</option>
                  <option value="Active">Active</option>
                  <option value="Draft">Draft</option>
                  <option value="Inactive">Inactive</option>
                </select>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="templates-select-filter"
                >
                  <option value="Default Order">Default Order (1-9)</option>
                  <option value="Recently Updated">Recently Updated</option>
                  <option value="Name A-Z">Name A-Z</option>
                  <option value="Name Z-A">Name Z-A</option>
                  <option value="Category">Category</option>
                  <option value="Status">Status</option>
                </select>

                <button
                  type="button"
                  className="cms-btn cms-btn-primary templates-add-btn"
                  onClick={() => navigate("/dashboard/settings/templates/add")}
                >
                  <Plus size={15} /> Add New Template
                </button>
              </div>
            </div>

            {/* TAB 3: REPORTS TABLE VIEW */}
            {activeTab === "reports" ? (
              <ReportsTableView
                templates={filteredTemplates}
                onEdit={(item) => navigate(`/dashboard/settings/templates/reports/${item.id}/edit`)}
                onPreview={(item) => navigate(`/dashboard/settings/templates/${item.id}/preview`)}
                onDownload={handleDownloadTemplate}
                onDuplicate={handleDuplicateTemplate}
                onDelete={(item) => setDeleteConfirmId(item.id)}
              />
            ) : (
              /* CARDS GRID FOR ALL / CERTIFICATES / LETTERS */
              <div className="templates-cards-grid">
                {/* Always include "+ Add New Template" dashed card */}
                <article
                  className="templates-card add-new-dashed-card"
                  onClick={() => navigate("/dashboard/settings/templates/add")}
                >
                  <div className="add-dashed-content">
                    <span className="add-dashed-icon"><Plus size={24} /></span>
                    <h3>Add New Template</h3>
                    <p>Create a custom certificate, report or document template.</p>
                  </div>
                </article>

                {filteredTemplates.length === 0 ? (
                  <div className="templates-empty-state">
                    <FileText size={40} className="empty-state-icon" />
                    <h4>No templates available</h4>
                    <p>Try adjusting your search query or active filter options.</p>
                  </div>
                ) : (
                  filteredTemplates.map((item) => (
                    <TemplateCard
                      key={item.id}
                      template={item}
                      onEdit={() => {
                        if (item.type === "Certificate") navigate(`/dashboard/settings/templates/certificates/${item.id}/edit`);
                        else if (item.type === "Report") navigate(`/dashboard/settings/templates/reports/${item.id}/edit`);
                        else navigate(`/dashboard/settings/templates/letters/${item.id}/edit`);
                      }}
                      onPreview={() => navigate(`/dashboard/settings/templates/${item.id}/preview`)}
                      onDownload={() => handleDownloadTemplate(item)}
                      onDuplicate={() => handleDuplicateTemplate(item)}
                      onResetDefault={() => handleResetToDefault(item.id)}
                      onDelete={() => setDeleteConfirmId(item.id)}
                    />
                  ))
                )}
              </div>
            )}
          </>
        )}

        {/* Delete Confirmation Dialog */}
        {deleteConfirmId && (
          <div className="cms-overlay">
            <div className="cms-modal sm">
              <div className="cms-modal-head">
                <h3>Confirm Delete</h3>
              </div>
              <div className="cms-modal-body">
                <p>Are you sure you want to delete this custom template? This action cannot be undone.</p>
              </div>
              <div className="cms-modal-foot">
                <button type="button" className="cms-btn cms-btn-ghost" onClick={() => setDeleteConfirmId(null)}>
                  Cancel
                </button>
                <button type="button" className="cms-btn cms-btn-danger" onClick={() => handleDeleteTemplate(deleteConfirmId)}>
                  Delete Template
                </button>
              </div>
            </div>
          </div>
        )}

        <Toast message={toastMessage} onClose={() => setToastMessage("")} />
      </main>
    </DashboardLayout>
  );
}

// Sub-Component: Individual Template Card
function TemplateCard({ template, onEdit, onPreview, onDownload, onDuplicate, onResetDefault, onDelete }) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <article className={`templates-card accent-${template.accent || 'default'}`}>
      <div className="templates-card-thumb">
        <div
          className={`mock-thumb-bg ${template.type.toLowerCase()}`}
          style={{
            borderColor: template.borderColor || '#1e3a8a',
            borderStyle: 'double',
            borderWidth: '2px',
          }}
        >
          <div className="thumb-watermark-logo">PIRNAV</div>

          {/* Mini College Header */}
          <div className="thumb-header-area">
            <div className="thumb-college-title" style={{ color: template.borderColor || '#1e3a8a' }}>
              PIRNAV COLLEGE
            </div>
            <div className="thumb-college-sub">
              (Intermediate / Junior College)
            </div>
            <div className="thumb-ref-line">
              <span>Ref: {template.refPrefix || "BC"}/2026/001</span>
              <span>05 Sep 2026</span>
            </div>
          </div>

          {/* Mini Title Badge */}
          <div className="thumb-title-badge-wrap">
            <span
              className="thumb-title-badge"
              style={{
                backgroundColor: template.badgeBgColor || template.borderColor || '#1e3a8a',
                color: template.badgeTextColor || '#ffffff',
              }}
            >
              {template.name.toUpperCase()}
            </span>
          </div>

          {/* Mini Document Content Body */}
          <div className="thumb-mini-body-text">
            This is to certify that <strong>Rahul Kumar</strong> (ADM-2026-0017) is a bonafide student of Pirnav College.
          </div>

          {/* Mini Footer: Place, QR, Seal, Signature */}
          <div className="thumb-mini-footer">
            <div className="thumb-footer-left">
              <div className="thumb-mini-place">Vijayawada</div>
              {template.qrEnabled !== false && <span className="thumb-mini-qr">QR</span>}
            </div>
            <div className="thumb-footer-center">
              <div className="thumb-mini-seal" style={{ borderColor: template.borderColor || '#1e3a8a', color: template.borderColor || '#1e3a8a' }}>
                <span>SEAL</span>
              </div>
            </div>
            <div className="thumb-footer-right">
              <span className="thumb-mini-sig-script">{template.signatureType || "Principal"}</span>
              <span className="thumb-mini-sig-label">Pirnav College</span>
            </div>
          </div>
        </div>

        <div className="thumb-badges-wrap">
          {template.builtIn && <span className="templates-builtin-badge">Default</span>}
          <span className={`templates-status-badge status-${template.status.toLowerCase()}`}>
            {template.status}
          </span>
        </div>
      </div>

      <div className="templates-card-body">
        <h3 className="templates-card-title">{template.name}</h3>
        <div className="templates-card-meta">
          <span className="templates-cat-tag">{template.category}</span>
          <span className="templates-date">Updated: {template.lastModified}</span>
        </div>
      </div>

      <div className="templates-card-actions">
        <button type="button" className="cms-btn cms-btn-ghost action-btn" onClick={onEdit} title="Edit Template">
          <Edit size={13} /> Edit
        </button>
        <button type="button" className="cms-btn cms-btn-ghost action-btn" onClick={onPreview} title="Preview Template">
          <Eye size={13} /> Preview
        </button>
        <button type="button" className="cms-btn cms-btn-primary action-btn" onClick={onDownload} title="Download Template Demo">
          <Download size={13} /> Download
        </button>
        <div className="more-menu-wrap">
          <button type="button" className="more-menu-trigger" onClick={() => setShowMenu(!showMenu)}>
            •••
          </button>
          {showMenu && (
            <div className="more-menu-dropdown" onMouseLeave={() => setShowMenu(false)}>
              <button type="button" onClick={() => { setShowMenu(false); onDuplicate(); }}>
                <Copy size={13} /> Duplicate
              </button>
              {template.builtIn ? (
                <>
                  <button type="button" onClick={() => { setShowMenu(false); onResetDefault(); }}>
                    <RotateCcw size={13} /> Reset to Default
                  </button>
                  <button
                    type="button"
                    className="disabled-menu-btn"
                    title="Default system certificate templates cannot be deleted."
                    disabled
                  >
                    <Lock size={13} /> Delete (Protected)
                  </button>
                </>
              ) : (
                <button type="button" onClick={() => { setShowMenu(false); onDelete(); }} className="danger-text">
                  <Trash2 size={13} /> Delete
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

// Sub-Component: Reports Table View (Tab 3)
function ReportsTableView({ templates, onEdit, onPreview, onDownload, onDuplicate, onDelete }) {
  return (
    <div className="templates-table-wrapper">
      <table className="templates-table">
        <thead>
          <tr>
            <th>Template Name</th>
            <th>Category</th>
            <th>Format</th>
            <th>Last Modified</th>
            <th>Status</th>
            <th className="text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {templates.map((item) => (
            <tr key={item.id}>
              <td className="font-semibold">{item.name}</td>
              <td><span className="templates-cat-tag">{item.category}</span></td>
              <td><span className={`format-badge format-${item.format.toLowerCase()}`}>{item.format}</span></td>
              <td>{item.lastModified}</td>
              <td><span className={`templates-status-badge status-${item.status.toLowerCase()}`}>{item.status}</span></td>
              <td className="text-right">
                <div className="table-actions-row">
                  <button type="button" className="cms-btn cms-btn-ghost sm-btn" onClick={() => onPreview(item)}>
                    <Eye size={13} /> Preview
                  </button>
                  <button type="button" className="cms-btn cms-btn-ghost sm-btn" onClick={() => onEdit(item)}>
                    <Edit size={13} /> Edit
                  </button>
                  <button type="button" className="cms-btn cms-btn-primary sm-btn" onClick={() => onDownload(item)}>
                    <Download size={13} /> Download
                  </button>
                  <button type="button" className="cms-btn cms-btn-ghost sm-icon-btn" onClick={() => onDuplicate(item)} title="Duplicate">
                    <Copy size={13} />
                  </button>
                  {!item.builtIn && (
                    <button type="button" className="cms-btn cms-btn-ghost sm-icon-btn danger-btn" onClick={() => onDelete(item)} title="Delete">
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Sub-Component: Certificate Editor Screen (3-Column Layout with Real-Time Live Preview)
function CertificateEditorScreen({ template, onSave, onResetDefault, onDownload, notify }) {
  const navigate = useNavigate();

  // Active Tool navigation: Fields | Text | Images | QR Code | Signature | Shapes | Background | Settings
  const [activeTool, setActiveTool] = useState("Fields");

  // Metadata & Properties State
  const [templateName, setTemplateName] = useState(template.name || "Bonafide Certificate");
  const [certType, setCertType] = useState(template.category || "Student Certificate");
  const [status, setStatus] = useState(template.status || "Active");
  const [version, setVersion] = useState(template.version || "1.0");

  // Content Live States
  const [institutionName, setInstitutionName] = useState("PIRNAV COLLEGE");
  const [tagline, setTagline] = useState("(Intermediate / Junior College)");
  const [addressText, setAddressText] = useState("D.No. 12-3-45, College Road, Vijayawada - 520 001, Andhra Pradesh");
  const [bodyText, setBodyText] = useState(
    template.content ||
      "This is to certify that Mr./Ms. {{student_name}} (S/o / D/o {{father_name}}) bearing Student ID {{student_id}} is a bonafide student of Pirnav College (Intermediate / Junior College), Vijayawada."
  );
  const [purposeText, setPurposeText] = useState(template.purpose || "Higher Education");

  // Text Styling Live States
  const [fontFamily, setFontFamily] = useState("Georgia, serif");
  const [fontSize, setFontSize] = useState("14px");
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [textAlign, setTextAlign] = useState("center");
  const [textColor, setTextColor] = useState("#1e293b");
  const [badgeBgColor, setBadgeBgColor] = useState(template.badgeBgColor || template.borderColor || "#1e3a8a");
  const [badgeTextColor, setBadgeTextColor] = useState("#ffffff");

  // Background & Border Live States
  const [borderStyle, setBorderStyle] = useState(template.borderStyle || "Navy Ornate");
  const [borderColor, setBorderColor] = useState(template.borderColor || "#1e3a8a");
  const [bgCanvasColor, setBgCanvasColor] = useState("#ffffff");
  const [watermarkText, setWatermarkText] = useState("PIRNAV COLLEGE");
  const [watermarkOpacity, setWatermarkOpacity] = useState(0.04);

  // Logo & Seal Live States
  const [customLogoUrl, setCustomLogoUrl] = useState(null);
  const [logoSize, setLogoSize] = useState(42);
  const [seal, setSeal] = useState(template.seal || "Principal Seal");
  const [sealColor, setSealColor] = useState(template.sealColor || template.borderColor || "#1e3a8a");

  // QR Code Live States
  const [qrEnabled, setQrEnabled] = useState(template.qrEnabled ?? true);
  const [qrPosition, setQrPosition] = useState("Bottom Left");
  const [qrSize, setQrSize] = useState(44);
  const [qrLabel, setQrLabel] = useState("Scan to verify");

  // Signature Live States
  const [signatureType, setSignatureType] = useState(template.signatureType || "Principal");
  const [signaturePos, setSignaturePos] = useState("Bottom Right");
  const [signatureStyle, setSignatureStyle] = useState("Cursive Hand");

  // Layout & Visibility Live States
  const [orientation, setOrientation] = useState(template.orientation || "Landscape");
  const [pageSize, setPageSize] = useState(template.pageSize || "A4");
  const [showLogo, setShowLogo] = useState(true);
  const [showSeal, setShowSeal] = useState(true);
  const [showSignature, setShowSignature] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(100);

  // Demo interpolation toggle
  const [useDemoDataInPreview, setUseDemoDataInPreview] = useState(true);

  // Handle Logo Upload
  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (customLogoUrl) URL.revokeObjectURL(customLogoUrl);
      const url = URL.createObjectURL(file);
      setCustomLogoUrl(url);
      notify("Logo uploaded successfully.");
    }
  };

  useEffect(() => {
    return () => {
      if (customLogoUrl) URL.revokeObjectURL(customLogoUrl);
    };
  }, [customLogoUrl]);

  // Insert Dynamic Token into Body
  const handleInsertField = (fieldToken) => {
    setBodyText((prev) => `${prev} ${fieldToken}`);
    notify(`Inserted ${fieldToken}`);
  };

  // Live interpolated body text for preview canvas
  const displayBody = useMemo(() => {
    if (useDemoDataInPreview) return renderWithDemoData(bodyText, template);
    return bodyText;
  }, [bodyText, template, useDemoDataInPreview]);

  const displayPurpose = useMemo(() => {
    if (useDemoDataInPreview) return renderWithDemoData(purposeText, template);
    return purposeText;
  }, [purposeText, template, useDemoDataInPreview]);

  // Actions
  const handleSaveDraft = () => {
    setStatus("Draft");
    onSave({
      ...template,
      name: templateName,
      status: "Draft",
      orientation,
      pageSize,
      borderStyle,
      borderColor,
      badgeBgColor,
      seal,
      qrEnabled,
      signatureType,
      content: bodyText,
      purpose: purposeText,
      version,
    });
  };

  const handlePublish = () => {
    setStatus("Active");
    const nextVer = (parseFloat(version) + 0.1).toFixed(1);
    setVersion(nextVer);
    onSave({
      ...template,
      name: templateName,
      status: "Active",
      orientation,
      pageSize,
      borderStyle,
      borderColor,
      badgeBgColor,
      seal,
      qrEnabled,
      signatureType,
      content: bodyText,
      purpose: purposeText,
      version: nextVer,
      lastModified: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
    });
    notify(`Template published as v${nextVer}!`);
  };

  return (
    <DashboardLayout title="Edit Certificate Template" subtitle="Customize the certificate layout, text, logo, signature and dynamic field placeholders in real-time." breadcrumb={["Home", "Settings", "Templates", "Edit"]}>
      <div className="cert-editor-page">
        {/* Top Action Header */}
        <header className="cert-editor-topbar">
          <button type="button" className="cms-btn cms-btn-ghost back-btn" onClick={() => navigate("/dashboard/settings/templates")}>
            <ChevronLeft size={16} /> Back to Templates
          </button>
          <div className="topbar-title-wrap">
            <h2>{templateName}</h2>
            {template.builtIn && <span className="templates-builtin-badge">Default</span>}
            <span className={`templates-status-badge status-${status.toLowerCase()}`}>{status} (v{version})</span>
          </div>
          <div className="topbar-actions">
            <button type="button" className="cms-btn cms-btn-ghost" onClick={() => navigate(`/dashboard/settings/templates/${template.id}/preview`)}>
              <Eye size={14} /> Full Preview
            </button>
            {template.builtIn && (
              <button type="button" className="cms-btn cms-btn-ghost" onClick={onResetDefault} title="Reset to original default design">
                <RotateCcw size={14} /> Reset to Default
              </button>
            )}
            <button type="button" className="cms-btn cms-btn-primary" onClick={handlePublish}>
              <CheckCircle2 size={14} /> Save Template
            </button>
          </div>
        </header>

        {/* 3-COLUMN EDITOR GRID */}
        <div className="cert-editor-grid">
          {/* COLUMN 1: LEFT EDITOR TOOLBAR */}
          <aside className="editor-left-sidebar">
            <nav className="editor-tools-nav">
              {[
                { id: "Fields", label: "Fields", icon: SlidersHorizontal },
                { id: "Text", label: "Text", icon: Type },
                { id: "Images", label: "Images", icon: ImageIcon },
                { id: "QR Code", label: "QR Code", icon: QrCodeIcon },
                { id: "Signature", label: "Signature", icon: PenTool },
                { id: "Shapes", label: "Shapes", icon: Square },
                { id: "Background", label: "Background", icon: Palette },
                { id: "Settings", label: "Settings", icon: Settings2 },
              ].map((tool) => {
                const Icon = tool.icon;
                return (
                  <button key={tool.id} type="button" className={`tool-nav-btn ${activeTool === tool.id ? "active" : ""}`} onClick={() => setActiveTool(tool.id)}>
                    <Icon size={16} />
                    <span>{tool.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* TOOL CONTENT PANEL */}
            <div className="editor-tool-panel">
              {activeTool === "Fields" && (
                <div className="tool-section">
                  <h3>Dynamic Fields</h3>
                  <p className="tool-sub">Click any token to insert into body text:</p>
                  <div className="fields-tokens-list">
                    {DYNAMIC_FIELD_TOKENS.map((token) => (
                      <button key={token} type="button" className="token-chip" onClick={() => handleInsertField(token)}>
                        {token}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {activeTool === "Text" && (
                <div className="tool-section">
                  <h3>Live Text Controls</h3>
                  <div className="form-group">
                    <label>Institution Name</label>
                    <input type="text" value={institutionName} onChange={(e) => setInstitutionName(e.target.value)} className="cms-input" />
                  </div>
                  <div className="form-group">
                    <label>Sub-Header Tagline</label>
                    <input type="text" value={tagline} onChange={(e) => setTagline(e.target.value)} className="cms-input" />
                  </div>
                  <div className="form-group">
                    <label>Body Content Text</label>
                    <textarea rows={5} value={bodyText} onChange={(e) => setBodyText(e.target.value)} className="cms-input" />
                  </div>
                  <div className="form-group">
                    <label>Purpose Text</label>
                    <input type="text" value={purposeText} onChange={(e) => setPurposeText(e.target.value)} className="cms-input" />
                  </div>
                  <div className="form-group">
                    <label>Font Family</label>
                    <select value={fontFamily} onChange={(e) => setFontFamily(e.target.value)} className="cms-input">
                      <option value="Georgia, serif">Georgia Serif</option>
                      <option value="'Cinzel', serif">Cinzel Classic</option>
                      <option value="Arial, sans-serif">Arial Sans</option>
                      <option value="'Times New Roman', serif">Times New Roman</option>
                      <option value="'Playfair Display', serif">Playfair Display</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Font Size</label>
                    <select value={fontSize} onChange={(e) => setFontSize(e.target.value)} className="cms-input">
                      <option value="12px">12px Extra Small</option>
                      <option value="13.5px">13.5px Standard</option>
                      <option value="15px">15px Large</option>
                      <option value="17px">17px Extra Large</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Format & Align</label>
                    <div className="text-toolbar-row">
                      <button type="button" className={`fmt-btn ${isBold ? "active" : ""}`} onClick={() => setIsBold(!isBold)}>B</button>
                      <button type="button" className={`fmt-btn ${isItalic ? "active" : ""}`} onClick={() => setIsItalic(!isItalic)}>I</button>
                      <button type="button" className={`fmt-btn ${isUnderline ? "active" : ""}`} onClick={() => setIsUnderline(!isUnderline)}>U</button>
                      <button type="button" className={`fmt-btn ${textAlign === "left" ? "active" : ""}`} onClick={() => setTextAlign("left")}>L</button>
                      <button type="button" className={`fmt-btn ${textAlign === "center" ? "active" : ""}`} onClick={() => setTextAlign("center")}>C</button>
                      <button type="button" className={`fmt-btn ${textAlign === "right" ? "active" : ""}`} onClick={() => setTextAlign("right")}>R</button>
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Text Color</label>
                    <input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} className="color-picker-input" />
                  </div>
                </div>
              )}

              {activeTool === "Images" && (
                <div className="tool-section">
                  <h3>Logo & Seal</h3>
                  <div className="form-group">
                    <label>Upload Custom Logo</label>
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="cms-file-input" />
                  </div>
                  {customLogoUrl && (
                    <div className="logo-preview-box">
                      <img src={customLogoUrl} alt="Uploaded logo" style={{ width: logoSize }} />
                      <button type="button" onClick={() => setCustomLogoUrl(null)} className="remove-logo-btn">Remove</button>
                    </div>
                  )}
                  <div className="form-group margin-top">
                    <label>Logo Size ({logoSize}px)</label>
                    <input type="range" min={28} max={90} value={logoSize} onChange={(e) => setLogoSize(Number(e.target.value))} className="cms-range" />
                  </div>
                  <div className="form-group">
                    <label>Seal Stamp Type</label>
                    <select value={seal} onChange={(e) => setSeal(e.target.value)} className="cms-input">
                      <option value="Principal Seal">Principal Seal</option>
                      <option value="College Seal">College Seal</option>
                      <option value="Board Seal">Board Seal</option>
                      <option value="Accounts Seal">Accounts Seal</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Seal Stamp Color</label>
                    <input type="color" value={sealColor} onChange={(e) => setSealColor(e.target.value)} className="color-picker-input" />
                  </div>
                </div>
              )}

              {activeTool === "QR Code" && (
                <div className="tool-section">
                  <h3>QR Code Verification</h3>
                  <label className="toggle-label">
                    <input type="checkbox" checked={qrEnabled} onChange={(e) => setQrEnabled(e.target.checked)} />
                    Show Verification QR Code
                  </label>
                  <div className="form-group margin-top">
                    <label>QR Placement</label>
                    <select value={qrPosition} onChange={(e) => setQrPosition(e.target.value)} className="cms-input">
                      <option value="Bottom Left">Bottom Left</option>
                      <option value="Bottom Right">Bottom Right</option>
                      <option value="Top Right">Top Right</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>QR Size ({qrSize}px)</label>
                    <input type="range" min={32} max={80} value={qrSize} onChange={(e) => setQrSize(Number(e.target.value))} className="cms-range" />
                  </div>
                </div>
              )}

              {activeTool === "Signature" && (
                <div className="tool-section">
                  <h3>Signature Authority</h3>
                  <div className="form-group">
                    <label>Signatory Title</label>
                    <input type="text" value={signatureType} onChange={(e) => setSignatureType(e.target.value)} className="cms-input" />
                  </div>
                  <div className="form-group">
                    <label>Signature Position</label>
                    <select value={signaturePos} onChange={(e) => setSignaturePos(e.target.value)} className="cms-input">
                      <option value="Bottom Right">Bottom Right</option>
                      <option value="Bottom Left">Bottom Left</option>
                      <option value="Bottom Center">Bottom Center</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Signature Style</label>
                    <select value={signatureStyle} onChange={(e) => setSignatureStyle(e.target.value)} className="cms-input">
                      <option value="Cursive Hand">Cursive Handwriting</option>
                      <option value="Calligraphy Script">Calligraphy Script</option>
                      <option value="Formal Sans">Formal Sans</option>
                    </select>
                  </div>
                </div>
              )}

              {activeTool === "Shapes" && (
                <div className="tool-section">
                  <h3>Shapes & Accents</h3>
                  <div className="form-group">
                    <label>Title Badge Background</label>
                    <input type="color" value={badgeBgColor} onChange={(e) => setBadgeBgColor(e.target.value)} className="color-picker-input" />
                  </div>
                  <div className="form-group">
                    <label>Title Badge Text Color</label>
                    <input type="color" value={badgeTextColor} onChange={(e) => setBadgeTextColor(e.target.value)} className="color-picker-input" />
                  </div>
                </div>
              )}

              {activeTool === "Background" && (
                <div className="tool-section">
                  <h3>Border & Background</h3>
                  <div className="form-group">
                    <label>Border Style</label>
                    <input type="text" value={borderStyle} onChange={(e) => setBorderStyle(e.target.value)} className="cms-input" />
                  </div>
                  <div className="form-group">
                    <label>Border Color</label>
                    <input type="color" value={borderColor} onChange={(e) => setBorderColor(e.target.value)} className="color-picker-input" />
                  </div>
                  <div className="form-group">
                    <label>Canvas Background Color</label>
                    <input type="color" value={bgCanvasColor} onChange={(e) => setBgCanvasColor(e.target.value)} className="color-picker-input" />
                  </div>
                  <div className="form-group">
                    <label>Watermark Text</label>
                    <input type="text" value={watermarkText} onChange={(e) => setWatermarkText(e.target.value)} className="cms-input" />
                  </div>
                  <div className="form-group">
                    <label>Watermark Opacity ({Math.round(watermarkOpacity * 100)}%)</label>
                    <input type="range" min={0} max={0.25} step={0.01} value={watermarkOpacity} onChange={(e) => setWatermarkOpacity(Number(e.target.value))} className="cms-range" />
                  </div>
                </div>
              )}

              {activeTool === "Settings" && (
                <div className="tool-section">
                  <h3>Layout & Toggles</h3>
                  <div className="form-group">
                    <label>Orientation</label>
                    <select value={orientation} onChange={(e) => setOrientation(e.target.value)} className="cms-input">
                      <option value="Landscape">Landscape</option>
                      <option value="Portrait">Portrait</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Page Size</label>
                    <select value={pageSize} onChange={(e) => setPageSize(e.target.value)} className="cms-input">
                      <option value="A4">A4 Standard</option>
                      <option value="A5">A5 Compact</option>
                      <option value="Letter">Letter</option>
                    </select>
                  </div>
                  <div className="toggles-column margin-top">
                    <label className="toggle-label">
                      <input type="checkbox" checked={useDemoDataInPreview} onChange={(e) => setUseDemoDataInPreview(e.target.checked)} /> Show Demo Student Data in Canvas
                    </label>
                    <label className="toggle-label">
                      <input type="checkbox" checked={showLogo} onChange={(e) => setShowLogo(e.target.checked)} /> Show Logo
                    </label>
                    <label className="toggle-label">
                      <input type="checkbox" checked={showSeal} onChange={(e) => setShowSeal(e.target.checked)} /> Show Seal
                    </label>
                    <label className="toggle-label">
                      <input type="checkbox" checked={showSignature} onChange={(e) => setShowSignature(e.target.checked)} /> Show Signature
                    </label>
                  </div>
                </div>
              )}
            </div>
          </aside>

          {/* COLUMN 2: CENTER CERTIFICATE CANVAS WITH REAL-TIME DEMO RENDERING */}
          <main className="editor-center-canvas">
            <div className="canvas-wrapper" style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: "top center" }}>
              <div
                className={`visual-certificate-canvas ${orientation.toLowerCase()}`}
                style={{ backgroundColor: bgCanvasColor }}
              >
                {/* Watermark overlay */}
                {watermarkText && (
                  <div className="canvas-watermark-overlay" style={{ opacity: watermarkOpacity }}>
                    {watermarkText}
                  </div>
                )}

                {/* Certificate Decorative Border */}
                <div
                  className="cert-inner-border"
                  style={{
                    borderColor: borderColor,
                    borderStyle: "double",
                    borderWidth: "4px",
                  }}
                >
                  {/* Header Branding */}
                  <header className="cert-header">
                    <div className="cert-header-grid">
                      <div className="cert-header-left">
                        {showLogo && (
                          customLogoUrl ? (
                            <img src={customLogoUrl} alt="Logo" className="cert-college-logo" style={{ width: logoSize, height: logoSize }} />
                          ) : (
                            <div className="cert-default-logo" style={{ width: logoSize, height: logoSize, fontSize: logoSize * 0.5, backgroundColor: borderColor }}>P</div>
                          )
                        )}
                      </div>
                      <div className="cert-header-center">
                        <h1 className="cert-institution-name" style={{ color: borderColor }}>{institutionName}</h1>
                        <p className="cert-tagline" style={{ color: borderColor }}>{tagline}</p>
                        <p className="cert-address">{addressText}</p>
                      </div>
                      <div className="cert-header-right">
                        <small>Affiliated to</small>
                        <strong>Board of Intermediate Education</strong>
                        <small>Andhra Pradesh (BIEAP)</small>
                        <small>College Code: 12345</small>
                      </div>
                    </div>

                    <div className="cert-ref-row">
                      <span>Ref No: <strong>{template.refPrefix || "BC"}/2026/001</strong></span>
                      <span>Date: <strong>05 Sep 2026</strong></span>
                    </div>
                  </header>

                  {/* Certificate Title Badge */}
                  <div className="cert-title-badge">
                    <h2 style={{ backgroundColor: badgeBgColor, color: badgeTextColor }}>
                      {templateName.toUpperCase()}
                    </h2>
                  </div>

                  {/* Certificate Main Body Content */}
                  <div
                    className="cert-body-area"
                    style={{
                      fontFamily,
                      fontSize,
                      color: textColor,
                      fontWeight: isBold ? "bold" : "normal",
                      fontStyle: isItalic ? "italic" : "normal",
                      textDecoration: isUnderline ? "underline" : "none",
                      textAlign,
                    }}
                  >
                    <p className="cert-content-text">{displayBody}</p>
                    {displayPurpose && (
                      <p className="cert-purpose-text">This certificate is issued for the purpose of <strong>{displayPurpose}</strong>.</p>
                    )}
                  </div>

                  {/* Footer Section: Date, QR, Seal & Signature */}
                  <footer className={`cert-footer-area sig-pos-${signaturePos.toLowerCase().replace(/\s+/g, "-")}`}>
                    <div className="cert-footer-col left">
                      <p>Place: <strong>Vijayawada</strong></p>
                      <p>Date: <strong>05 Sep 2026</strong></p>
                      {qrEnabled && (
                        <div className="cert-qr-placeholder">
                          <div className="qr-box" style={{ width: qrSize, height: qrSize }}>QR</div>
                          <span>{qrLabel}</span>
                        </div>
                      )}
                    </div>

                    <div className="cert-footer-col center">
                      {showSeal && (
                        <div className="cert-seal-stamp" style={{ borderColor: sealColor, color: sealColor }}>
                          <span>{seal}</span>
                        </div>
                      )}
                    </div>

                    <div className="cert-footer-col right">
                      {showSignature && (
                        <div className="cert-sig-line">
                          <span className={`sig-handwritten style-${signatureStyle.toLowerCase().replace(/\s+/g, "-")}`}>
                            {signatureType} Signature
                          </span>
                          <strong className="sig-title">{signatureType}</strong>
                          <small>Pirnav College</small>
                        </div>
                      )}
                    </div>
                  </footer>
                </div>
              </div>
            </div>

            {/* Bottom Canvas Zoom Controls */}
            <div className="canvas-zoom-toolbar">
              <button type="button" onClick={() => setZoomLevel((z) => Math.max(50, z - 10))}>-</button>
              <span>{zoomLevel}%</span>
              <button type="button" onClick={() => setZoomLevel((z) => Math.min(150, z + 10))}>+</button>
              <button type="button" onClick={() => setZoomLevel(100)}>Fit Width</button>
              <button type="button" onClick={() => setZoomLevel(85)}>Fit Page</button>
            </div>
          </main>

          {/* COLUMN 3: RIGHT PROPERTIES PANEL */}
          <aside className="editor-right-sidebar">
            <div className="panel-box">
              <h3>Template Properties</h3>
              <div className="form-group">
                <label>Template Name</label>
                <input type="text" value={templateName} onChange={(e) => setTemplateName(e.target.value)} className="cms-input" />
              </div>
              <div className="form-group">
                <label>Category</label>
                <select value={certType} onChange={(e) => setCertType(e.target.value)} className="cms-input">
                  <option value="Student Certificate">Student Certificate</option>
                  <option value="Academic">Academic</option>
                  <option value="HR">HR</option>
                </select>
              </div>
              <div className="form-group">
                <label>Page Size</label>
                <select value={pageSize} onChange={(e) => setPageSize(e.target.value)} className="cms-input">
                  <option value="A4">A4 (Portrait / Landscape)</option>
                  <option value="A5">A5</option>
                </select>
              </div>
              <div className="form-group">
                <label>Institution Seal</label>
                <select value={seal} onChange={(e) => setSeal(e.target.value)} className="cms-input">
                  <option value="Principal Seal">Principal Seal</option>
                  <option value="College Seal">College Seal</option>
                  <option value="Board Seal">Board Seal</option>
                  <option value="Accounts Seal">Accounts Seal</option>
                </select>
              </div>
            </div>

            {/* Version History Box */}
            <div className="panel-box version-box">
              <h3>Version History</h3>
              <ul className="version-list">
                <li>
                  <div>
                    <strong>v{version} (Current)</strong>
                    <small>05 Sep 2026 by Admin</small>
                  </div>
                  <span className="status-tag active">{status}</span>
                </li>
                <li>
                  <div>
                    <strong>v1.0</strong>
                    <small>System Default</small>
                  </div>
                  {template.builtIn && (
                    <button type="button" className="restore-link" onClick={onResetDefault}>Reset</button>
                  )}
                </li>
              </ul>
            </div>

            {/* Preview & Action Buttons Box */}
            <div className="panel-box actions-panel-box">
              <h3>Actions</h3>
              <div className="actions-stack">
                <button type="button" className="cms-btn cms-btn-ghost w-full" onClick={handleSaveDraft}>
                  Save Draft
                </button>
                <button type="button" className="cms-btn cms-btn-primary w-full" onClick={handlePublish}>
                  Publish Template
                </button>
                <button type="button" className="cms-btn cms-btn-ghost w-full" onClick={() => onDownload(template)}>
                  <Download size={14} /> Download Demo
                </button>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </DashboardLayout>
  );
}

// Sub-Component: Report Editor Screen
function ReportEditorScreen({ template, onSave, notify }) {
  const navigate = useNavigate();
  const [name, setName] = useState(template.name);
  const [format, setFormat] = useState(template.format || "Excel");
  const [columns, setColumns] = useState(
    template.columns || ["Admission No", "Student Name", "Academic Year", "Board", "Group", "Section", "Gender", "Status"]
  );

  const moveColumn = (index, direction) => {
    const updated = [...columns];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= updated.length) return;
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    setColumns(updated);
  };

  return (
    <DashboardLayout title="Edit Report Template" subtitle="Configure report columns, format export settings and header parameters." breadcrumb={["Home", "Settings", "Templates", "Report Edit"]}>
      <div className="report-editor-page">
        <div className="report-editor-header">
          <button type="button" className="cms-btn cms-btn-ghost" onClick={() => navigate("/dashboard/settings/templates")}>
            <ChevronLeft size={16} /> Back to Templates
          </button>
          <h2>Edit Report Template: {name}</h2>
          <button type="button" className="cms-btn cms-btn-primary" onClick={() => { onSave({ ...template, name, format, columns }); navigate("/dashboard/settings/templates"); }}>
            Save Changes
          </button>
        </div>

        <div className="report-editor-grid">
          <div className="report-settings-panel">
            <h3>Report Settings</h3>
            <div className="form-group">
              <label>Report Name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="cms-input" />
            </div>
            <div className="form-group">
              <label>Export Format</label>
              <select value={format} onChange={(e) => setFormat(e.target.value)} className="cms-input">
                <option value="Excel">Excel Spreadsheet (.xlsx)</option>
                <option value="PDF">PDF Document (.pdf)</option>
                <option value="Word">Word Document (.docx)</option>
              </select>
            </div>

            <h4>Column Selection & Order</h4>
            <ul className="columns-order-list">
              {columns.map((col, idx) => (
                <li key={col}>
                  <span>{col}</span>
                  <div className="move-btns">
                    <button type="button" onClick={() => moveColumn(idx, -1)} disabled={idx === 0}><ArrowUp size={13} /></button>
                    <button type="button" onClick={() => moveColumn(idx, 1)} disabled={idx === columns.length - 1}><ArrowDown size={13} /></button>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="report-preview-panel">
            <h3>Live Report Data Preview ({format})</h3>
            <div className="mock-report-table-wrap">
              <table className="mock-report-table">
                <thead>
                  <tr>
                    {columns.map((c) => (
                      <th key={c}>{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    {columns.map((c, i) => (
                      <td key={i}>Sample Data {i + 1}</td>
                    ))}
                  </tr>
                  <tr>
                    {columns.map((c, i) => (
                      <td key={i}>Sample Data {i + 1}</td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

// Sub-Component: Letter Editor Screen
function LetterEditorScreen({ template, onSave, notify }) {
  const navigate = useNavigate();
  const [name, setName] = useState(template.name);
  const [subject, setSubject] = useState(template.subject || "Subject Placeholder");
  const [greeting, setGreeting] = useState(template.greeting || "Respected Sir / Madam,");
  const [body, setBody] = useState(template.body || "Letter body content text...");

  return (
    <DashboardLayout title="Edit Letter Template" subtitle="Customize formal letter layouts, dynamic tokens and closing signatures." breadcrumb={["Home", "Settings", "Templates", "Letter Edit"]}>
      <div className="letter-editor-page">
        <div className="letter-editor-header">
          <button type="button" className="cms-btn cms-btn-ghost" onClick={() => navigate("/dashboard/settings/templates")}>
            <ChevronLeft size={16} /> Back to Templates
          </button>
          <h2>Edit Letter: {name}</h2>
          <button type="button" className="cms-btn cms-btn-primary" onClick={() => { onSave({ ...template, name, subject, greeting, body }); navigate("/dashboard/settings/templates"); }}>
            Save Letter Template
          </button>
        </div>

        <div className="letter-editor-grid">
          <div className="letter-form-panel">
            <h3>Letter Fields</h3>
            <div className="form-group">
              <label>Letter Name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="cms-input" />
            </div>
            <div className="form-group">
              <label>Subject Line</label>
              <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} className="cms-input" />
            </div>
            <div className="form-group">
              <label>Greeting</label>
              <input type="text" value={greeting} onChange={(e) => setGreeting(e.target.value)} className="cms-input" />
            </div>
            <div className="form-group">
              <label>Letter Body Content</label>
              <textarea rows={8} value={body} onChange={(e) => setBody(e.target.value)} className="cms-input" />
            </div>
          </div>

          <div className="letter-preview-panel">
            <h3>Document Preview</h3>
            <div className="word-paper-preview">
              <div className="paper-header">
                <strong>PIRNAV COLLEGE</strong>
                <small>Official Letterhead</small>
              </div>
              <p className="paper-date">Date: {"{{date}}"}</p>
              <p className="paper-subject"><strong>SUB:</strong> {subject}</p>
              <p className="paper-greeting">{greeting}</p>
              <p className="paper-body">{body}</p>
              <div className="paper-footer">
                <p>Yours faithfully,</p>
                <strong>Principal / Administrative Authority</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

// Sub-Component: Upload Templates Tab & Screen (Tab 5)
function UploadTemplateTabSection({ onUploaded, notify }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [templateName, setTemplateName] = useState("");
  const [templateType, setTemplateType] = useState("Certificate");
  const [category, setCategory] = useState("Student Certificate");
  const [version, setVersion] = useState("1.0");
  const [applicableModule, setApplicableModule] = useState("Certificates");
  const [description, setDescription] = useState("");

  const [watermark, setWatermark] = useState(true);
  const [signatureBlock, setSignatureBlock] = useState(true);
  const [qrVerification, setQrVerification] = useState(true);
  const [branding, setBranding] = useState(true);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 20 * 1024 * 1024) {
        notify("File exceeds maximum size of 20MB.");
        return;
      }
      setSelectedFile(file);
      if (!templateName) setTemplateName(file.name.replace(/\.[^/.]+$/, ""));
    }
  };

  const handleUploadSubmit = (e) => {
    e.preventDefault();
    if (!selectedFile) {
      notify("Please select a file to upload.");
      return;
    }
    if (!templateName.trim()) {
      notify("Please enter a template name.");
      return;
    }
    const newTemp = {
      id: `upload-${Date.now()}`,
      name: templateName,
      type: templateType,
      category,
      status: "Active",
      format: selectedFile.name.endsWith(".xlsx") ? "Excel" : selectedFile.name.endsWith(".docx") ? "Word" : "PDF",
      version,
      builtIn: false,
      lastModified: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
      description,
      orientation: "Landscape",
    };
    onUploaded(newTemp);
  };

  return (
    <div className="upload-template-container">
      <div className="upload-template-grid">
        <div className="upload-left-box">
          <h3>Upload Certificate / Document Template</h3>
          <p className="upload-sub">Upload a customized template file (PDF, DOCX, XLSX, PPTX) to make it available in the system.</p>

          <label className="upload-drag-zone">
            <input type="file" accept=".pdf,.docx,.xlsx,.pptx" onChange={handleFileChange} />
            <div className="upload-zone-content">
              <UploadCloud size={44} className="upload-cloud-icon" />
              <strong>Drag and drop your file here</strong>
              <span>Support: PDF, DOCX, XLSX, PPTX (Max 20 MB)</span>
              <button type="button" className="cms-btn cms-btn-primary choose-file-btn">Choose File</button>
            </div>
          </label>

          {selectedFile && (
            <div className="file-info-badge">
              <FileCode size={20} />
              <div className="file-info-meta">
                <strong>{selectedFile.name}</strong>
                <small>{(selectedFile.size / (1024 * 1024)).toFixed(1)} MB • Ready to upload</small>
              </div>
              <button type="button" className="remove-file-btn" onClick={() => setSelectedFile(null)}><X size={15} /></button>
            </div>
          )}

          <div className="download-sample-wrap">
            <button type="button" className="cms-btn cms-btn-ghost sample-btn" onClick={() => notify("Downloaded sample template.")}>
              <Download size={14} /> Download Sample Template
            </button>
          </div>
        </div>

        <form className="upload-center-box" onSubmit={handleUploadSubmit}>
          <h3>Template Details</h3>
          <div className="form-group">
            <label>Template Name *</label>
            <input type="text" placeholder="Enter template name" value={templateName} onChange={(e) => setTemplateName(e.target.value)} className="cms-input" required />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Template Type *</label>
              <select value={templateType} onChange={(e) => setTemplateType(e.target.value)} className="cms-input">
                <option value="Certificate">Certificate</option>
                <option value="Report">Report</option>
                <option value="Letter">Letter</option>
                <option value="Bulk Upload">Bulk Upload</option>
              </select>
            </div>
            <div className="form-group">
              <label>Category *</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="cms-input">
                <option value="Student Certificate">Student Certificate</option>
                <option value="Academic">Academic</option>
                <option value="Report">Report</option>
                <option value="HR">HR</option>
                <option value="Finance">Finance</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Version *</label>
              <input type="text" value={version} onChange={(e) => setVersion(e.target.value)} className="cms-input" />
            </div>
            <div className="form-group">
              <label>Applicable Module *</label>
              <select value={applicableModule} onChange={(e) => setApplicableModule(e.target.value)} className="cms-input">
                <option value="Certificates">Certificates</option>
                <option value="Reports">Reports</option>
                <option value="Staff Management">Staff Management</option>
                <option value="Student Management">Student Management</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea rows={3} placeholder="Enter description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} className="cms-input" />
          </div>

          <div className="upload-submit-row">
            <button type="submit" className="cms-btn cms-btn-primary submit-upload-btn">
              Upload Template
            </button>
          </div>
        </form>

        <div className="upload-right-box">
          <h3>Template Preview Settings</h3>
          <div className="toggle-setting-row">
            <div>
              <strong>Watermark</strong>
              <small>Apply background watermark logo</small>
            </div>
            <input type="checkbox" checked={watermark} onChange={(e) => setWatermark(e.target.checked)} />
          </div>
          <div className="toggle-setting-row">
            <div>
              <strong>Signature Block</strong>
              <small>Show digital signature area</small>
            </div>
            <input type="checkbox" checked={signatureBlock} onChange={(e) => setSignatureBlock(e.target.checked)} />
          </div>
          <div className="toggle-setting-row">
            <div>
              <strong>QR Verification</strong>
              <small>Enable verification QR placeholder</small>
            </div>
            <input type="checkbox" checked={qrVerification} onChange={(e) => setQrVerification(e.target.checked)} />
          </div>
          <div className="toggle-setting-row">
            <div>
              <strong>Header/Footer Branding</strong>
              <small>Include institutional header</small>
            </div>
            <input type="checkbox" checked={branding} onChange={(e) => setBranding(e.target.checked)} />
          </div>
        </div>
      </div>
    </div>
  );
}

// Sub-Component: Add New Template Wizard Screen
function AddTemplateWizardScreen({ onAdd }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [type, setType] = useState("Certificate");
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Student Certificate");
  const [description, setDescription] = useState("");
  const [duplicateFrom, setDuplicateFrom] = useState("none");

  const handleSubmit = () => {
    let baseTemplate = {};
    if (type === "Certificate" && duplicateFrom !== "none") {
      const found = DEFAULT_CERTIFICATE_TEMPLATES.find((t) => t.id === duplicateFrom);
      if (found) baseTemplate = { ...found };
    }

    onAdd({
      ...baseTemplate,
      id: `custom-${Date.now()}`,
      name: name || baseTemplate.name || "Custom Template",
      type,
      category,
      status: "Active",
      format: "PDF",
      version: "1.0",
      builtIn: false, // Custom templates are Admin-created
      lastModified: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
      description: description || baseTemplate.description || "",
      orientation: baseTemplate.orientation || "Landscape",
    });
  };

  return (
    <DashboardLayout title="Add New Template" subtitle="Follow the wizard steps to configure a new document or certificate template." breadcrumb={["Home", "Settings", "Templates", "Add"]}>
      <div className="wizard-container">
        <div className="wizard-steps-header">
          <div className={`step-item ${step >= 1 ? "active" : ""}`}>1. Choose Type</div>
          <div className={`step-item ${step >= 2 ? "active" : ""}`}>2. Basic Details</div>
          <div className={`step-item ${step >= 3 ? "active" : ""}`}>3. Confirm</div>
        </div>

        <div className="wizard-body">
          {step === 1 && (
            <div className="wizard-step-content">
              <h3>Select Template Type</h3>
              <div className="type-options-grid">
                {[
                  { id: "Certificate", label: "Certificate", desc: "Bonafide, Conduct, Transfer, Study & Academic Certificates" },
                  { id: "Report", label: "Report", desc: "Excel & PDF tabular performance reports" },
                  { id: "Letter", label: "Letter", desc: "Formal notice, reminder & request letters" },
                ].map((opt) => (
                  <div key={opt.id} className={`type-card ${type === opt.id ? "selected" : ""}`} onClick={() => setType(opt.id)}>
                    <h4>{opt.label}</h4>
                    <p>{opt.desc}</p>
                  </div>
                ))}
              </div>
              <div className="wizard-foot">
                <button type="button" className="cms-btn cms-btn-ghost" onClick={() => navigate("/dashboard/settings/templates")}>Cancel</button>
                <button type="button" className="cms-btn cms-btn-primary" onClick={() => setStep(2)}>Next Step <ChevronRight size={14} /></button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="wizard-step-content">
              <h3>Template Details</h3>
              <div className="form-group">
                <label>Template Name *</label>
                <input type="text" placeholder="e.g. Character & Merit Certificate 2026" value={name} onChange={(e) => setName(e.target.value)} className="cms-input" />
              </div>
              {type === "Certificate" && (
                <div className="form-group">
                  <label>Base Template / Duplicate From</label>
                  <select value={duplicateFrom} onChange={(e) => setDuplicateFrom(e.target.value)} className="cms-input">
                    <option value="none">Blank Certificate Template</option>
                    {DEFAULT_CERTIFICATE_TEMPLATES.map((t) => (
                      <option key={t.id} value={t.id}>Duplicate {t.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="form-group">
                <label>Category</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)} className="cms-input">
                  <option value="Student Certificate">Student Certificate</option>
                  <option value="Academic">Academic</option>
                  <option value="Report">Report</option>
                  <option value="HR">HR</option>
                </select>
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} className="cms-input" />
              </div>
              <div className="wizard-foot">
                <button type="button" className="cms-btn cms-btn-ghost" onClick={() => setStep(1)}><ChevronLeft size={14} /> Back</button>
                <button type="button" className="cms-btn cms-btn-primary" onClick={() => setStep(3)}>Next Step <ChevronRight size={14} /></button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="wizard-step-content">
              <h3>Confirm & Create</h3>
              <p>Ready to create <strong>{name || "New Template"}</strong> ({type})?</p>
              <div className="wizard-foot">
                <button type="button" className="cms-btn cms-btn-ghost" onClick={() => setStep(2)}><ChevronLeft size={14} /> Back</button>
                <button type="button" className="cms-btn cms-btn-primary" onClick={handleSubmit}>Create Template</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

// Sub-Component: Template Preview Screen (Full Read-Only Visual Preview with Demo Student Data)
function TemplatePreviewScreen({ template, onDownload, notify }) {
  const navigate = useNavigate();
  const renderedContent = useMemo(() => renderWithDemoData(template.content, template), [template]);
  const renderedPurpose = useMemo(() => renderWithDemoData(template.purpose, template), [template]);

  return (
    <DashboardLayout
      title="Certificate Template Preview"
      subtitle="Full-page visual preview of template layout, institutional branding and demo student data."
      breadcrumb={["Home", "Settings", "Templates", "Preview"]}
    >
      <div className="preview-screen-container">
        <header className="preview-topbar">
          <button type="button" className="cms-btn cms-btn-ghost" onClick={() => navigate("/dashboard/settings/templates")}>
            <ChevronLeft size={16} /> Back to Templates
          </button>
          <div className="topbar-title-wrap">
            <h2>{template.name}</h2>
            {template.builtIn && <span className="templates-builtin-badge">Default</span>}
            <span className={`templates-status-badge status-${template.status.toLowerCase()}`}>{template.status}</span>
          </div>
          <div className="topbar-actions">
            <button type="button" className="cms-btn cms-btn-ghost" onClick={() => window.print()}>
              <Printer size={14} /> Print Preview
            </button>
            <button type="button" className="cms-btn cms-btn-primary" onClick={() => onDownload(template)}>
              <Download size={14} /> Download Demo PDF
            </button>
          </div>
        </header>

        <main className="preview-canvas-box">
          <div
            className={`visual-certificate-canvas ${template.orientation?.toLowerCase() || 'landscape'}`}
            style={{ backgroundColor: template.bgCanvasColor || "#ffffff" }}
          >
            {/* Inner Decorative Border */}
            <div
              className="cert-inner-border"
              style={{
                borderColor: template.borderColor || "#1e3a8a",
                borderStyle: "double",
                borderWidth: "4px",
              }}
            >
              {/* Header Branding */}
              <header className="cert-header">
                <div className="cert-header-grid">
                  <div className="cert-header-left">
                    <div className="cert-default-logo" style={{ backgroundColor: template.borderColor || "#1e3a8a" }}>P</div>
                  </div>
                  <div className="cert-header-center">
                    <h1 className="cert-institution-name" style={{ color: template.borderColor || "#1e3a8a" }}>
                      PIRNAV COLLEGE
                    </h1>
                    <p className="cert-tagline" style={{ color: template.borderColor || "#b45309" }}>
                      (Intermediate / Junior College)
                    </p>
                    <p className="cert-address">
                      D.No. 12-3-45, College Road, Vijayawada - 520 001, Andhra Pradesh
                    </p>
                  </div>
                  <div className="cert-header-right">
                    <small>Affiliated to</small>
                    <strong>Board of Intermediate Education</strong>
                    <small>Andhra Pradesh (BIEAP)</small>
                    <small>College Code: 12345</small>
                  </div>
                </div>

                <div className="cert-ref-row">
                  <span>Ref No: <strong>{template.refPrefix || "BC"}/2026/001</strong></span>
                  <span>Date: <strong>05 Sep 2026</strong></span>
                </div>
              </header>

              {/* Title Badge */}
              <div className="cert-title-badge">
                <h2 style={{ backgroundColor: template.badgeBgColor || template.borderColor || "#1e3a8a", color: "#ffffff" }}>
                  {template.name.toUpperCase()}
                </h2>
              </div>

              {/* Body Text Area */}
              <div className="cert-body-area">
                <p className="cert-content-text">{renderedContent}</p>
                {renderedPurpose && (
                  <p className="cert-purpose-text">This certificate is issued for the purpose of <strong>{renderedPurpose}</strong>.</p>
                )}
              </div>

              {/* Footer Section */}
              <footer className="cert-footer-area">
                <div className="cert-footer-col left">
                  <p>Place: <strong>Vijayawada</strong></p>
                  <p>Date: <strong>05 Sep 2026</strong></p>
                  {template.qrEnabled && (
                    <div className="cert-qr-placeholder">
                      <div className="qr-box">QR</div>
                      <span>Scan to verify</span>
                    </div>
                  )}
                </div>

                <div className="cert-footer-col center">
                  <div className="cert-seal-stamp" style={{ borderColor: template.borderColor || "#1e3a8a", color: template.borderColor || "#1e3a8a" }}>
                    <span>PIRNAV COLLEGE<br/>VIJAYAWADA</span>
                  </div>
                </div>

                <div className="cert-footer-col right">
                  <div className="cert-sig-line">
                    <span className="sig-handwritten style-cursive-hand">
                      {template.signatureType || "Principal"} Signature
                    </span>
                    <strong className="sig-title">{template.signatureType || "Principal"}</strong>
                    <small>Pirnav College</small>
                  </div>
                </div>
              </footer>
            </div>
          </div>
        </main>
      </div>
    </DashboardLayout>
  );
}
