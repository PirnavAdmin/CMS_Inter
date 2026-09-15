import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Users,
  GraduationCap,
  Hash,
  Award,
  Receipt,
  Search,
  ArrowLeft,
  Edit3,
  Eye,
  Copy,
  Check,
  Sparkles,
  Info,
  AlertTriangle,
  X,
  ChevronRight,
  RefreshCw,
  Play,
  UserRound,
  BookOpen,
  FileText,
  UserCheck,
} from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import Search3DIcon from "@/components/common/Search3DIcon.jsx";
import { Modal, Toast } from "@/components/common/Ui.jsx";
import {
  readNumberSeriesSettings,
  writeNumberSeriesSettings,
  readConfigHistory,
  appendConfigHistory,
  buildNumberFromFormat,
  getNextNumberPreview,
  validateNumberSeries,
  normalizeNumberSeriesItem,
  MOCK_GENERATED_HISTORY,
} from "@/data/numberSeriesData.js";
import "./NumberSeriesPage.css";

const SERIES_ICONS = {
  "teaching-staff-id": Users,
  "employee-id": Users,
  "non-teaching-staff-id": UserCheck,
  "admission-no": GraduationCap,
  "roll-no": Hash,
  "student-id": UserRound,
  "section-name": BookOpen,
  "exam-code": FileText,
  "certificate-number": Award,
  "receipt-no": Receipt,
};

export default function NumberSeriesPage({ mode = "dashboard" }) {
  const navigate = useNavigate();
  const { seriesId, id } = useParams();
  const activeId = seriesId || id;

  const [seriesList, setSeriesList] = useState(() =>
    readNumberSeriesSettings().map(normalizeNumberSeriesItem)
  );
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [previewModalSeries, setPreviewModalSeries] = useState(null);

  const fetchSeries = () => {
    setLoading(true);
    try {
      const data = readNumberSeriesSettings().map(normalizeNumberSeriesItem);
      setSeriesList(data);
    } catch (err) {
      console.warn("Using local settings fallback:", err?.message || err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSeries();
  }, []);

  const activeSeries = useMemo(() => {
    if (!activeId) return null;
    return (
      seriesList.find(
        (s) =>
          s.id === activeId ||
          s.seriesCode === activeId ||
          s.slug === activeId ||
          s.key === activeId
      ) || null
    );
  }, [activeId, seriesList]);

  const updateSeriesList = (newList) => {
    setSeriesList(newList);
    writeNumberSeriesSettings(newList);
  };

  const handleSaveConfig = (updatedSeries) => {
    setSaving(true);
    const code = updatedSeries.seriesCode || updatedSeries.slug || updatedSeries.id;
    const normalized = normalizeNumberSeriesItem(updatedSeries);

    const newList = seriesList.map((s) =>
      (s.id === code || s.seriesCode === code) ? normalized : s
    );
    updateSeriesList(newList);
    appendConfigHistory(code, normalized);
    setToast({ message: `${normalized.name} updated successfully.`, type: "success" });
    setSaving(false);
    return true;
  };

  const handleSequenceGenerated = (code, nextNumber) => {
    setSeriesList((prev) =>
      prev.map((s) => {
        if (s.id === code || s.seriesCode === code) {
          const nextSeq = (s.currentSequence || s.currentNumber || 0) + 1;
          return {
            ...s,
            currentSequence: nextSeq,
            currentNumber: nextSeq,
            totalGenerated: nextSeq,
            currentExample: nextNumber || s.currentExample,
            livePreview: nextNumber || s.livePreview,
          };
        }
        return s;
      })
    );
  };

  if (mode === "edit") {
    if (!activeSeries) {
      return (
        <DashboardLayout
          title="ID & Number Series"
          subtitle="Configure Employee IDs, Admission Numbers and various document number formats."
        >
          <div className="ns-not-found">
            <h3>Series Not Found</h3>
            <p>The requested number series configuration does not exist.</p>
            <Link to="/dashboard/settings/number-series" className="cms-btn cms-btn-primary">
              <ArrowLeft size={16} /> Back to ID & Number Series
            </Link>
          </div>
        </DashboardLayout>
      );
    }
    return (
      <NumberSeriesEditView
        series={activeSeries}
        saving={saving}
        onSave={async (updated) => {
          const ok = await handleSaveConfig(updated);
          if (ok) {
            setTimeout(() => navigate(`/dashboard/settings/number-series/${updated.id}`), 400);
          }
        }}
        onPreviewModal={(s) => setPreviewModalSeries(s)}
        toast={toast}
        setToast={setToast}
      />
    );
  }

  if (mode === "detail" || mode === "view") {
    if (!activeSeries) {
      return (
        <DashboardLayout
          title="ID & Number Series"
          subtitle="Configure Employee IDs, Admission Numbers and various document number formats."
        >
          <div className="ns-not-found">
            <h3>Series Not Found</h3>
            <p>The requested number series configuration does not exist.</p>
            <Link to="/dashboard/settings/number-series" className="cms-btn cms-btn-primary">
              <ArrowLeft size={16} /> Back to ID & Number Series
            </Link>
          </div>
        </DashboardLayout>
      );
    }
    return (
      <>
        <NumberSeriesDetailView
          series={activeSeries}
          onPreviewModal={(s) => setPreviewModalSeries(s)}
          toast={toast}
          setToast={setToast}
        />
        {previewModalSeries && (
          <PreviewNextModal
            series={previewModalSeries}
            onClose={() => setPreviewModalSeries(null)}
            onSequenceGenerated={handleSequenceGenerated}
            setToast={setToast}
          />
        )}
      </>
    );
  }

  return (
    <>
      <NumberSeriesDashboardView
        seriesList={seriesList}
        loading={loading}
        onRefresh={fetchSeries}
        onPreviewModal={(s) => setPreviewModalSeries(s)}
        toast={toast}
        setToast={setToast}
      />
      {previewModalSeries && (
        <PreviewNextModal
          series={previewModalSeries}
          onClose={() => setPreviewModalSeries(null)}
          onSequenceGenerated={handleSequenceGenerated}
          setToast={setToast}
        />
      )}
    </>
  );
}

// ======================================================================
// 1. DASHBOARD VIEW (MAIN CARD GRID)
// ======================================================================
function NumberSeriesDashboardView({ seriesList, loading, onRefresh, toast, setToast }) {
  const navigate = useNavigate();

  return (
    <DashboardLayout
      title="ID & Number Series"
      subtitle="Configure Employee IDs, Admission Numbers and various document number formats."
      breadcrumb={["Home", "Settings", "ID & Number Series"]}
    >
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="ns-dashboard-container">
        {/* TOP NOTICE BANNER */}
        <div className="ns-info-banner">
          <Info size={15} className="ns-info-icon" />
          <div style={{ flex: 1 }}>
            <strong>Fixed System Series</strong>
            <p>
              Numbering categories are fixed system configurations. You can edit formats, preview next sequence values, and view generation logs.
            </p>
          </div>
          <button
            type="button"
            className="cms-btn cms-btn-ghost"
            onClick={onRefresh}
            disabled={loading}
            style={{ alignSelf: "center", marginLeft: "auto" }}
            title="Refresh series"
          >
            <RefreshCw size={13} className={loading ? "spin" : ""} />
            <span>{loading ? "Loading..." : "Refresh"}</span>
          </button>
        </div>

        {/* 4 FIXED CARDS GRID */}
        <div className="ns-card-grid">
          {seriesList.map((series) => {
            const IconComponent = SERIES_ICONS[series.id] || Hash;
            const nextVal = series.livePreview || getNextNumberPreview(series);

            return (
              <div key={series.id} className="ns-card">
                <div className="ns-card-top">
                  <div className="ns-card-icon-box">
                    <IconComponent size={22} />
                  </div>
                  <div className={`ns-card-badge ${series.isActive ? "" : "ns-card-badge-inactive"}`}>
                    {series.isActive ? "Active" : "Inactive"}
                  </div>
                </div>

                <h3 className="ns-card-title">{series.name || series.seriesName}</h3>

                <div className="ns-card-example-box">
                  <span className="ns-card-example-lbl">Current / Next Example:</span>
                  <div className="ns-card-example-val">{series.currentExample || nextVal}</div>
                </div>

                <p className="ns-card-desc">{series.description}</p>

                <div className="ns-card-actions">
                  <button
                    type="button"
                    className="ns-card-edit-btn"
                    onClick={() => navigate(`/dashboard/settings/number-series/${series.id}/edit`)}
                    aria-label={`Edit ${series.name} number series`}
                  >
                    <span>Edit</span>
                    <ChevronRight size={15} />
                  </button>

                  <button
                    type="button"
                    className="ns-card-view-btn"
                    onClick={() => navigate(`/dashboard/settings/number-series/${series.id}`)}
                    title="View details and generated history"
                  >
                    <Eye size={15} />
                    <span>Details</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
}

// ======================================================================
// 2. DETAIL VIEW (GENERATED IDS & CONFIGURATION HISTORY)
// ======================================================================
function NumberSeriesDetailView({ series, onPreviewModal, toast, setToast }) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [pageSize, setPageSize] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);

  const historyList = useMemo(() => {
    return MOCK_GENERATED_HISTORY[series.id] || [];
  }, [series.id]);

  // Filter history rows by search query
  const filteredHistory = useMemo(() => {
    if (!searchQuery.trim()) return historyList;
    const q = searchQuery.toLowerCase();
    return historyList.filter((row) => {
      return Object.values(row).some((val) => String(val).toLowerCase().includes(q));
    });
  }, [historyList, searchQuery]);

  // Pagination logic
  const totalPages = Math.max(1, Math.ceil(filteredHistory.length / pageSize));
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredHistory.slice(start, start + pageSize);
  }, [filteredHistory, currentPage, pageSize]);

  const nextNumberVal = series.livePreview || getNextNumberPreview(series);

  return (
    <DashboardLayout
      title={`${series.name} Number Series`}
      subtitle={`Manage the format and numbering sequence for ${series.name.toLowerCase()}.`}
      breadcrumb={["Home", "Settings", "ID & Number Series", series.name]}
    >
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="ns-detail-container">
        {/* BACK NAVIGATION */}
        <div className="ns-back-bar">
          <button
            type="button"
            className="ns-back-btn"
            onClick={() => navigate("/dashboard/settings/number-series")}
          >
            <ArrowLeft size={16} />
            <span>Back to ID & Number Series</span>
          </button>
        </div>

        {/* HEADER & ACTION STRIP */}
        <div className="ns-detail-header-card">
          <div className="ns-detail-header-left">
            <h2>{series.name}</h2>
            <p>{series.description}</p>
          </div>

          <div className="ns-detail-header-actions">
            <button
              type="button"
              className="cms-btn cms-btn-ghost"
              onClick={() => onPreviewModal(series)}
            >
              <Sparkles size={16} />
              <span>Preview Next Number</span>
            </button>

            <button
              type="button"
              className="cms-btn cms-btn-primary"
              onClick={() => navigate(`/dashboard/settings/number-series/${series.id}/edit`)}
            >
              <Edit3 size={16} />
              <span>Edit Series</span>
            </button>
          </div>
        </div>

        {/* SUMMARY STRIP */}
        <div className="ns-summary-strip">
          <div className="ns-summary-item">
            <span className="ns-summary-lbl">Current Format</span>
            <span className="ns-summary-val font-mono">{series.format || series.formatPattern}</span>
          </div>

          <div className="ns-summary-item highlight">
            <span className="ns-summary-lbl">Next Number</span>
            <span className="ns-summary-val font-bold">{nextNumberVal}</span>
          </div>

          <div className="ns-summary-item">
            <span className="ns-summary-lbl">Prefix</span>
            <span className="ns-summary-val">{series.prefix || "—"}</span>
          </div>

          <div className="ns-summary-item">
            <span className="ns-summary-lbl">Total Generated</span>
            <span className="ns-summary-val">{series.totalGenerated || series.currentSequence || series.currentNumber}</span>
          </div>
        </div>

        {/* GENERATED IDS CARD */}
        <div className="ns-tabs-card">
          <div className="ns-tabs-bar">
            <h3 className="ns-table-card-title">Generated IDs ({historyList.length})</h3>
          </div>

          <div className="ns-tab-body">
            {/* SEARCH & PAGE SIZE BAR */}
            <div className="ns-table-tools">
              <div className="ns-search-box">
                <Search3DIcon size={16} className="ns-search-icon" />
                <input
                  type="text"
                  placeholder={`Search generated ${series.name.toLowerCase()} history...`}
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                />
                {searchQuery && (
                  <button
                    className="ns-search-clear"
                    onClick={() => setSearchQuery("")}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <div className="ns-table-page-size">
                <span>Show</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                >
                  <option value={5}>5 rows</option>
                  <option value={10}>10 rows</option>
                  <option value={25}>25 rows</option>
                  <option value={50}>50 rows</option>
                </select>
              </div>
            </div>

            {/* GENERATED IDS TABLE */}
            <div className="ns-table-responsive">
              <table className="ns-data-table">
                <thead>
                  <RenderTableHead seriesId={series.id} />
                </thead>
                <tbody>
                  {paginatedRows.length > 0 ? (
                    paginatedRows.map((row, idx) => (
                      <RenderTableRow
                        key={row.id || idx}
                        seriesId={series.id}
                        row={row}
                        index={(currentPage - 1) * pageSize + idx + 1}
                      />
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="ns-empty-cell">
                        No records found matching "{searchQuery}".
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* PAGINATION FOOTER */}
            <div className="ns-pagination-bar">
              <span className="ns-page-info">
                Showing {filteredHistory.length ? (currentPage - 1) * pageSize + 1 : 0} to{" "}
                {Math.min(currentPage * pageSize, filteredHistory.length)} of {filteredHistory.length} entries
              </span>

              <div className="ns-page-btns">
                <button
                  className="cms-btn cms-btn-ghost"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </button>
                <span className="ns-page-num">Page {currentPage} of {totalPages}</span>
                <button
                  className="cms-btn cms-btn-ghost"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

// Helper: Custom Table Headers per Series Type
function RenderTableHead({ seriesId }) {
  switch (seriesId) {
    case "teaching-staff-id":
    case "employee-id":
      return (
        <tr>
          <th>#</th>
          <th>Teaching Staff ID</th>
          <th>Employee Name</th>
          <th>Staff Type</th>
          <th>Department</th>
          <th>Designation</th>
          <th>Created On</th>
        </tr>
      );
    case "non-teaching-staff-id":
      return (
        <tr>
          <th>#</th>
          <th>Non-Teaching Staff ID</th>
          <th>Employee Name</th>
          <th>Staff Type</th>
          <th>Department</th>
          <th>Designation</th>
          <th>Created On</th>
        </tr>
      );
    case "admission-no":
      return (
        <tr>
          <th>#</th>
          <th>Admission No.</th>
          <th>Student Name</th>
          <th>Academic Year</th>
          <th>Board</th>
          <th>Group</th>
          <th>Created On</th>
        </tr>
      );
    case "roll-no":
      return (
        <tr>
          <th>#</th>
          <th>Roll No.</th>
          <th>Student Name</th>
          <th>Admission No.</th>
          <th>Academic Level</th>
          <th>Group</th>
          <th>Section</th>
          <th>Created On</th>
        </tr>
      );
    case "student-id":
      return (
        <tr>
          <th>#</th>
          <th>Student ID</th>
          <th>Student Name</th>
          <th>Admission No.</th>
          <th>Academic Year</th>
          <th>Status</th>
          <th>Created On</th>
        </tr>
      );
    case "section-name":
      return (
        <tr>
          <th>#</th>
          <th>Section Name</th>
          <th>Board</th>
          <th>Academic Year</th>
          <th>Academic Level</th>
          <th>Group</th>
          <th>Status</th>
          <th>Created On</th>
        </tr>
      );
    case "exam-code":
      return (
        <tr>
          <th>#</th>
          <th>Exam Code</th>
          <th>Exam Name</th>
          <th>Academic Year</th>
          <th>Board</th>
          <th>Exam Type</th>
          <th>Created On</th>
        </tr>
      );
    case "certificate-number":
      return (
        <tr>
          <th>#</th>
          <th>Certificate Number</th>
          <th>Certificate Type</th>
          <th>Student</th>
          <th>Admission No.</th>
          <th>Generated On</th>
          <th>Status</th>
        </tr>
      );
    case "receipt-no":
      return (
        <tr>
          <th>#</th>
          <th>Receipt No.</th>
          <th>Student</th>
          <th>Admission No.</th>
          <th>Payment Type</th>
          <th>Amount</th>
          <th>Generated On</th>
        </tr>
      );
    default:
      return (
        <tr>
          <th>#</th>
          <th>Identifier</th>
          <th>Details</th>
          <th>Created On</th>
        </tr>
      );
  }
}

// Helper: Custom Table Row per Series Type
function RenderTableRow({ seriesId, row, index }) {
  switch (seriesId) {
    case "teaching-staff-id":
    case "employee-id":
      return (
        <tr>
          <td>{index}</td>
          <td><span className="ns-code-badge font-bold">{row.val}</span></td>
          <td><strong>{row.name}</strong></td>
          <td>{row.staffType}</td>
          <td>{row.dept}</td>
          <td>{row.desig}</td>
          <td>{row.date}</td>
        </tr>
      );
    case "non-teaching-staff-id":
      return (
        <tr>
          <td>{index}</td>
          <td><span className="ns-code-badge font-bold">{row.val}</span></td>
          <td><strong>{row.name}</strong></td>
          <td>{row.staffType}</td>
          <td>{row.dept}</td>
          <td>{row.desig}</td>
          <td>{row.date}</td>
        </tr>
      );
    case "admission-no":
      return (
        <tr>
          <td>{index}</td>
          <td><span className="ns-code-badge font-bold">{row.val}</span></td>
          <td><strong>{row.name}</strong></td>
          <td>{row.year}</td>
          <td>{row.board}</td>
          <td>{row.group}</td>
          <td>{row.date}</td>
        </tr>
      );
    case "roll-no":
      return (
        <tr>
          <td>{index}</td>
          <td>
            {row.val === "Pending" ? (
              <span className="cms-badge cms-badge-warn">Pending</span>
            ) : (
              <span className="ns-code-badge font-bold">{row.val}</span>
            )}
          </td>
          <td><strong>{row.name}</strong></td>
          <td>{row.admNo}</td>
          <td>{row.level}</td>
          <td>{row.group}</td>
          <td>{row.section}</td>
          <td>{row.date}</td>
        </tr>
      );
    case "student-id":
      return (
        <tr>
          <td>{index}</td>
          <td><span className="ns-code-badge font-bold">{row.val}</span></td>
          <td><strong>{row.name}</strong></td>
          <td>{row.admNo}</td>
          <td>{row.year}</td>
          <td><span className="cms-badge cms-badge-active">{row.status}</span></td>
          <td>{row.date}</td>
        </tr>
      );
    case "section-name":
      return (
        <tr>
          <td>{index}</td>
          <td><span className="ns-code-badge font-bold">{row.val}</span></td>
          <td>{row.board}</td>
          <td>{row.year}</td>
          <td>{row.level}</td>
          <td>{row.group}</td>
          <td><span className="cms-badge cms-badge-active">{row.status}</span></td>
          <td>{row.date}</td>
        </tr>
      );
    case "exam-code":
      return (
        <tr>
          <td>{index}</td>
          <td><span className="ns-code-badge font-bold">{row.val}</span></td>
          <td><strong>{row.examName}</strong></td>
          <td>{row.year}</td>
          <td>{row.board}</td>
          <td>{row.type}</td>
          <td>{row.date}</td>
        </tr>
      );
    case "certificate-number":
      return (
        <tr>
          <td>{index}</td>
          <td><span className="ns-code-badge font-bold">{row.val}</span></td>
          <td>{row.certType}</td>
          <td><strong>{row.student}</strong></td>
          <td>{row.admNo}</td>
          <td>{row.date}</td>
          <td><span className="cms-badge cms-badge-active">{row.status}</span></td>
        </tr>
      );
    case "receipt-no":
      return (
        <tr>
          <td>{index}</td>
          <td><span className="ns-code-badge font-bold">{row.val}</span></td>
          <td><strong>{row.student}</strong></td>
          <td>{row.admNo}</td>
          <td>{row.type}</td>
          <td><strong>{row.amount}</strong></td>
          <td>{row.date}</td>
        </tr>
      );
    default:
      return (
        <tr>
          <td>{index}</td>
          <td><span className="ns-code-badge">{row.val || "—"}</span></td>
          <td>{row.name || "—"}</td>
          <td>{row.date || "—"}</td>
        </tr>
      );
  }
}

// ======================================================================
// 3. EDIT VIEW (2-COLUMN CONFIGURATION FORM)
// ======================================================================
function NumberSeriesEditView({ series, saving, onSave, toast, setToast }) {
  const navigate = useNavigate();

  const [formState, setFormState] = useState({
    prefix: series.prefix || "",
    format: series.format || series.formatPattern || "",
    numberLength: series.numberLength || 4,
    startNumber: series.startNumber || 1,
    description: series.description || "",
    status: series.isActive ? "Active" : "Inactive",
  });

  const [validationError, setValidationError] = useState("");

  // Re-validate format live when form state changes
  const liveValidation = useMemo(() => {
    return validateNumberSeries(
      formState.format,
      formState.numberLength,
      series.currentSequence || series.currentNumber,
      series.allowedTokens || series.availablePlaceholders || []
    );
  }, [formState.format, formState.numberLength, series.currentSequence, series.currentNumber, series.allowedTokens, series.availablePlaceholders]);

  const livePreviewVal = useMemo(() => {
    if (!liveValidation.valid) return null;
    const nextSeqNum = Number(series.currentSequence || series.currentNumber || 0) + 1;
    return buildNumberFromFormat(formState.format, nextSeqNum, formState.numberLength);
  }, [formState.format, formState.numberLength, series.currentSequence, series.currentNumber, liveValidation]);

  const handleTokenClick = (token) => {
    setFormState((prev) => ({
      ...prev,
      format: prev.format + token,
    }));
  };

  const handleApplySample = (sampleFormat) => {
    setFormState((prev) => ({
      ...prev,
      format: sampleFormat,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!liveValidation.valid) {
      setValidationError(liveValidation.message);
      return;
    }

    const updated = {
      ...series,
      prefix: formState.prefix,
      format: formState.format,
      formatPattern: formState.format,
      numberLength: Number(formState.numberLength),
      startNumber: Number(formState.startNumber),
      description: formState.description,
      status: formState.status,
      isActive: formState.status === "Active",
      currentExample: livePreviewVal || series.currentExample,
      livePreview: livePreviewVal || series.livePreview,
    };

    onSave(updated);
  };

  return (
    <DashboardLayout
      title={`Edit ${series.name} Number Series`}
      subtitle="Update the format and settings for number generation."
      breadcrumb={["Home", "Settings", "ID & Number Series", series.name, "Edit"]}
    >
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="ns-edit-container">
        {/* BACK NAVIGATION */}
        <div className="ns-back-bar">
          <button
            type="button"
            className="ns-back-btn"
            onClick={() => navigate(`/dashboard/settings/number-series/${series.id}`)}
          >
            <ArrowLeft size={16} />
            <span>Back to {series.name} Details</span>
          </button>
        </div>

        {/* 2-COLUMN LAYOUT */}
        <div className="ns-edit-grid">
          {/* LEFT COLUMN: CONFIGURATION FORM */}
          <div className="ns-edit-left">
            <div className="ns-form-card">
              <div className="ns-form-header">
                <h3>Configuration Form</h3>
                <p>Modify prefix, tokens, sequence length, and start number.</p>
              </div>

              <form onSubmit={handleSubmit} className="ns-form-body">
                {/* ROW 1: READ ONLY SERIES NAME & PREFIX */}
                <div className="ns-field-row-2">
                  <div className="ns-field">
                    <label>Series Name (Read Only)</label>
                    <input
                      type="text"
                      value={series.name || series.seriesName}
                      disabled
                      className="ns-input-readonly"
                    />
                  </div>

                  <div className="ns-field">
                    <label>Prefix *</label>
                    <input
                      type="text"
                      value={formState.prefix}
                      onChange={(e) => setFormState({ ...formState, prefix: e.target.value })}
                      placeholder="e.g. PCTCH, ADM, FEE"
                    />
                  </div>
                </div>

                {/* ROW 2: FORMAT PATTERN */}
                <div className="ns-field">
                  <label>Format Pattern *</label>
                  <input
                    type="text"
                    value={formState.format}
                    onChange={(e) => {
                      setFormState({ ...formState, format: e.target.value });
                      setValidationError("");
                    }}
                    placeholder="e.g. PCTCH{SEQ}"
                  />
                  <small>Combine prefix, fixed strings, and placeholders like {"{SEQ}"}, {"{YYYY}"}.</small>
                </div>

                {/* ROW 3: NUMBER LENGTH & START NUMBER */}
                <div className="ns-field-row-2">
                  <div className="ns-field">
                    <label>Number Length *</label>
                    <select
                      value={formState.numberLength}
                      onChange={(e) => setFormState({ ...formState, numberLength: Number(e.target.value) })}
                    >
                      <option value={1}>1 (e.g. 1)</option>
                      <option value={2}>2 (e.g. 01)</option>
                      <option value={3}>3 (e.g. 001)</option>
                      <option value={4}>4 (e.g. 0001)</option>
                      <option value={5}>5 (e.g. 00001)</option>
                      <option value={6}>6 (e.g. 000001)</option>
                    </select>
                  </div>

                  <div className="ns-field">
                    <label>Start Number *</label>
                    <input
                      type="number"
                      min={1}
                      value={formState.startNumber}
                      onChange={(e) => setFormState({ ...formState, startNumber: Number(e.target.value) })}
                    />
                  </div>
                </div>

                {/* ROW 4: DESCRIPTION */}
                <div className="ns-field">
                  <label>Description</label>
                  <input
                    type="text"
                    value={formState.description}
                    onChange={(e) => setFormState({ ...formState, description: e.target.value })}
                    placeholder="Enter series description..."
                  />
                </div>

                {/* LIVE FORMAT PREVIEW CARD */}
                <div className="ns-preview-box">
                  <span className="ns-preview-lbl">LIVE PREVIEW (NEXT NUMBER)</span>
                  {liveValidation.valid ? (
                    <div className="ns-preview-val font-mono">{livePreviewVal}</div>
                  ) : (
                    <div className="ns-preview-err">
                      <AlertTriangle size={15} />
                      <span>{liveValidation.message || "Unable to generate preview."}</span>
                    </div>
                  )}
                </div>

                {/* FORM ACTION BUTTONS */}
                <div className="ns-form-actions">
                  <button
                    type="button"
                    className="cms-btn cms-btn-ghost"
                    onClick={() => navigate(`/dashboard/settings/number-series/${series.id}`)}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="cms-btn cms-btn-primary"
                    disabled={!liveValidation.valid || saving}
                  >
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* RIGHT COLUMN: PLACEHOLDERS, SAMPLES, IMPORTANT NOTES */}
          <div className="ns-edit-right">
            {/* AVAILABLE PLACEHOLDERS */}
            <div className="ns-side-panel">
              <h4>Available Placeholders</h4>
              <p>Click any token below to insert it into your format string:</p>
              <div className="ns-token-grid">
                {(series.allowedTokens || series.availablePlaceholders || ["{SEQ}", "{YYYY}", "{YY}", "{MM}", "{DD}"]).map((token) => (
                  <button
                    key={token}
                    type="button"
                    className="ns-token-pill"
                    onClick={() => handleTokenClick(token)}
                    title={`Click to insert ${token}`}
                  >
                    <code>{token}</code>
                  </button>
                ))}
              </div>
            </div>

            {/* SAMPLE FORMATS */}
            {series.sampleFormats && series.sampleFormats.length > 0 && (
              <div className="ns-side-panel">
                <h4>Sample Formats</h4>
                <p>Click a sample to apply it directly to your format field:</p>
                <div className="ns-sample-list">
                  {series.sampleFormats.map((sample, i) => (
                    <div
                      key={i}
                      className="ns-sample-card"
                      onClick={() => handleApplySample(sample.pattern || sample.format)}
                    >
                      <code className="ns-sample-code">{sample.pattern || sample.format}</code>
                      <span className="ns-sample-arrow">→</span>
                      <span className="ns-sample-ex">{sample.example}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* IMPORTANT NOTES PANEL */}
            <div className="ns-side-panel notes-panel">
              <h4>Important Notes</h4>
              <ul>
                <li>Changing the format must NOT alter already-generated IDs.</li>
                <li>The new format applies only to future records.</li>
                <li>The next number is calculated from the last committed number.</li>
                <li>Previewing must NOT consume the next number.</li>
                <li>Editing a record must NOT regenerate its identifier.</li>
                <li>Deleted records must NOT cause old identifiers to be reused.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

// ======================================================================
// 4. PREVIEW NEXT NUMBER MODAL (NON-MUTATING & TEST GENERATE)
// ======================================================================
function PreviewNextModal({ series, onClose, onSequenceGenerated, setToast }) {
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [liveGeneratedNumber, setLiveGeneratedNumber] = useState(null);

  const nextVal = liveGeneratedNumber || series.livePreview || getNextNumberPreview(series);
  const nextSeqNum = Number(series.currentSequence || series.currentNumber || 0) + 1;

  const handleCopy = () => {
    navigator.clipboard.writeText(nextVal);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTestGenerate = () => {
    const code = series.seriesCode || series.slug || series.id;
    setGenerating(true);
    const simulated = getNextNumberPreview(series);
    setLiveGeneratedNumber(simulated);
    if (onSequenceGenerated) {
      onSequenceGenerated(code, simulated);
    }
    if (setToast) {
      setToast({ message: `Successfully generated: ${simulated}`, type: "success" });
    }
    setGenerating(false);
  };

  return (
    <Modal
      title={`Preview Next ${series.name}`}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="cms-btn cms-btn-ghost" onClick={handleCopy}>
            {copied ? <Check size={16} /> : <Copy size={16} />}
            <span>{copied ? "Copied to Clipboard!" : "Copy Preview"}</span>
          </button>
          <button
            type="button"
            className="cms-btn cms-btn-ghost"
            onClick={handleTestGenerate}
            disabled={generating}
            title="Atomically increments the counter and generates the real next ID"
          >
            <Play size={15} />
            <span>{generating ? "Generating..." : "Generate Next (Live)"}</span>
          </button>
          <button type="button" className="cms-btn cms-btn-primary" onClick={onClose}>
            Close
          </button>
        </>
      }
    >
      <div className="ns-modal-body">
        <p className="ns-modal-sub">
          Preview how the next {series.name.toLowerCase()} will be generated by the system.
        </p>

        {/* LARGE HIGHLIGHTED PREVIEW VALUE */}
        <div className="ns-modal-highlight-box">
          <span className="ns-modal-hl-label">NEXT GENERATED VALUE</span>
          <div className="ns-modal-hl-val font-mono">{nextVal}</div>
        </div>

        {/* SEQUENCE BREAKDOWN TABLE */}
        <div className="ns-modal-detail-grid">
          <div className="ns-modal-row">
            <span>Series Name:</span>
            <strong>{series.name}</strong>
          </div>
          <div className="ns-modal-row">
            <span>Format Pattern:</span>
            <code>{series.format || series.formatPattern}</code>
          </div>
          <div className="ns-modal-row">
            <span>Prefix:</span>
            <strong>{series.prefix || "—"}</strong>
          </div>
          <div className="ns-modal-row">
            <span>Current Last Sequence:</span>
            <strong>{String(series.currentSequence || series.currentNumber || 0).padStart(series.numberLength, "0")}</strong>
          </div>
          <div className="ns-modal-row">
            <span>Next Sequence Number:</span>
            <strong>{String(nextSeqNum).padStart(series.numberLength, "0")}</strong>
          </div>
          <div className="ns-modal-row">
            <span>Generated ID:</span>
            <strong className="ns-accent-text">{nextVal}</strong>
          </div>
        </div>

        <div className="ns-modal-note">
          <Info size={14} />
          <span>Previewing is read-only. Clicking "Generate Next (Live)" will increment the sequence counter in the database.</span>
        </div>
      </div>
    </Modal>
  );
}
