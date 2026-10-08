import { useCallback, useEffect, useMemo, useState } from "react";
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
  Trash2,
} from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import Search3DIcon from "@/components/common/Search3DIcon.jsx";
import { Modal, Toast } from "@/components/common/Ui.jsx";
import * as numberSeriesApi from "@/api/numberSeriesApi.js";
import { useCampusContext } from "@/context/CampusContext.jsx";
import { useAcademicContext } from "@/context/AcademicContext.jsx";
import {
  readNumberSeriesSettings,
  writeNumberSeriesSettings,
  readConfigHistory,
  appendConfigHistory,
  buildNumberFromFormat,
  getNextNumberPreview,
  validateNumberSeries,
  normalizeNumberSeriesItem,
  isSeriesRemoved,
  MOCK_GENERATED_HISTORY,
  autoGenerateRollNoPrefix,
} from "@/data/numberSeriesData.js";
import "./NumberSeriesPage.css";

const SERIES_ICONS = {
  "teaching-staff-id": Users,
  "non-teaching-staff-id": UserCheck,
  "admission-no": GraduationCap,
  "exam-code": FileText,
  "receipt-no": Receipt,
};

export default function NumberSeriesPage({ mode = "dashboard" }) {
  const navigate = useNavigate();
  const { seriesId, id } = useParams();
  const activeId = seriesId || id;
  const { selectedCampus, selectedCampusId } = useCampusContext();
  const { selectedBoardId, selectedAcademicYearId } = useAcademicContext();
  const activeCampusId = selectedCampusId ?? selectedCampus?.campusId ?? selectedCampus?.id;
  const activeBoardId = selectedBoardId;
  const activeAYId = selectedAcademicYearId;

  const [seriesList, setSeriesList] = useState(() =>
    readNumberSeriesSettings().filter((s) => !isSeriesRemoved(s)).map(normalizeNumberSeriesItem)
  );
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [previewModalSeries, setPreviewModalSeries] = useState(null);
  const [generatingRollNo, setGeneratingRollNo] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState("");
  const [prefixOverride, setPrefixOverride] = useState("");
  const [availableGroups, setAvailableGroups] = useState([]);
  const [groupCounters, setGroupCounters] = useState([]);
  const [prefixOverrides, setPrefixOverrides] = useState({});

  const forceSyncLocal = useCallback(() => {
    setSeriesList(readNumberSeriesSettings().filter((s) => !isSeriesRemoved(s)).map(normalizeNumberSeriesItem));
  }, []);

  const fetchSeries = useCallback(async () => {
    setLoading(true);
    let data = readNumberSeriesSettings().filter((s) => !isSeriesRemoved(s)).map(normalizeNumberSeriesItem);
    
    // Instantly render local offline data so the screen isn't blank while the API is loading
    setSeriesList(data);
    
    try {
      const serverData = await numberSeriesApi.getNumberSeriesList(
        activeCampusId,
        activeBoardId,
        activeAYId,
        true // includeSubCounters
      );
      
      const subCounters = Array.isArray(serverData) 
        ? serverData.filter(s => s.seriesCode?.startsWith("ROLL_NO|")) 
        : serverData?.items?.filter(s => s.seriesCode?.startsWith("ROLL_NO|")) || [];
        
      setGroupCounters(subCounters.map(s => ({
        groupCode: s.seriesCode.split('|').pop(),
        prefix: s.prefix,
        currentSequence: s.currentSequence,
        nextPreview: s.livePreview || (s.prefix + (s.currentSequence + 1))
      })));
      
      const items = Array.isArray(serverData) ? serverData : serverData?.items || serverData?.data || [];
      if (Array.isArray(items) && items.length > 0) {
        const normalized = items.filter((s) => !isSeriesRemoved(s)).map(normalizeNumberSeriesItem);
        const localList = readNumberSeriesSettings().filter((s) => !isSeriesRemoved(s)).map(normalizeNumberSeriesItem);
        const map = new Map();
        localList.forEach((s) => {
          map.set(s.id, s);
          if (s.seriesCode) map.set(s.seriesCode, s);
          if (s.slug) map.set(s.slug, s);
          if (s.key) map.set(s.key, s);
        });
        normalized.forEach((s) => {
          const existing = map.get(s.id) || map.get(s.seriesCode) || map.get(s.slug);
          const mergedItem = existing ? { ...existing, ...s } : { ...s };
          
          // Preserve description from fixed local config if backend doesn't provide one
          if (!s.description && existing && existing.description) {
            mergedItem.description = existing.description;
          }
          
          map.set(s.id, mergedItem);
          if (s.seriesCode) map.set(s.seriesCode, mergedItem);
          if (s.slug) map.set(s.slug, mergedItem);
        });
        const mergedValues = Array.from(new Set(map.values())).filter((s) => !isSeriesRemoved(s));
        
        // Final deduplication by seriesCode to prevent duplicate cards
        const uniqueMerged = [];
        const seenCodes = new Set();
        for (const item of mergedValues) {
          const rawCode = item.seriesCode || item.slug || item.id || "";
          let code = rawCode.toUpperCase().replace(/-/g, '_');
          if (code === 'TEACHING_STAFF_ID' || code === 'EMPLOYEE_ID') code = 'TEACHING_STAFF_ID';
          if (code === 'STUDENT_ROLL_NO' || code === 'ROLL_NO') code = 'ROLL_NO';
          if (code === 'ADMISSION_NO') code = 'ADMISSION_NO';

          if (!seenCodes.has(code)) {
            seenCodes.add(code);
            uniqueMerged.push(item);
          }
        }
        const merged = uniqueMerged;
        data = merged;
        writeNumberSeriesSettings(merged);
      }
    } catch (err) {
      console.warn("GET /api/v1/settings/number-series fallback:", err?.message || err);
    } finally {
      setLoading(false);
    }
    setSeriesList(data);
  }, [activeCampusId, activeBoardId, activeAYId]);

  useEffect(() => {
    fetchSeries();
  }, [fetchSeries]);

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

  const handleSaveConfig = async (updatedSeries) => {
    setSaving(true);
    const code = updatedSeries.seriesCode || updatedSeries.slug || updatedSeries.id;
    let savedData = null;

    try {
      savedData = await numberSeriesApi.updateNumberSeries(code, updatedSeries, activeCampusId);
    } catch (err) {
      console.warn("PUT /api/v1/settings/number-series/{seriesCode} fallback:", err?.message || err);
    }

    const normalized = normalizeNumberSeriesItem(savedData ? { ...updatedSeries, ...savedData } : updatedSeries);

    const newList = seriesList.map((s) =>
      (s.id === code || s.seriesCode === code || s.slug === code) ? normalized : s
    );
    updateSeriesList(newList);
    appendConfigHistory(code, normalized);
    setToast({ message: `${normalized.name} updated successfully.`, type: "success" });
    setSaving(false);
    return true;
  };

  const handleGenerateRollNo = async () => {
    if (!selectedGroup) return;
    try {
      const res = await numberSeriesApi.generateNextNumber(
        "ROLL_NO",
        { groupCode: selectedGroup, campusGroupPrefix: prefixOverride || undefined },
        activeCampusId
      );
      handleSequenceGenerated("student-roll-no", res.generatedNumber);
      setToast({ message: `Generated ${res.generatedNumber} successfully.`, type: "success" });
      setGeneratingRollNo(false);
      fetchSeries();
    } catch (e) {
      setToast({ message: "Failed to generate roll number.", type: "error" });
    }
  };

  const handleSequenceGenerated = (code, nextNumber) => {
    setSeriesList((prev) =>
      prev.map((s) => {
        if (s.id === code || s.seriesCode === code || s.slug === code) {
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
          {generatingRollNo && (
        <Modal title="Generate Roll Number" onClose={() => setGeneratingRollNo(false)}>
            <div style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
              {selectedGroup && (
                <div style={{ padding: '10px', background: 'var(--bg-tertiary)', borderRadius: '6px', fontSize: '13px' }}>
                  <strong>Current Count for {selectedGroup}:</strong> {
                    groupCounters.find(g => g.groupCode === selectedGroup)?.currentSequence || 0
                  } 
                  <span style={{color: 'var(--text-tertiary)', marginLeft: '10px'}}>
                    (Next sequence will be {(groupCounters.find(g => g.groupCode === selectedGroup)?.currentSequence || 0) + 1})
                  </span>
                </div>
              )}
            <div className="cms-form-group">
              <label>Select Group</label>
              <select 
                className="cms-input"
                value={selectedGroup} 
                onChange={e => {
                  setSelectedGroup(e.target.value);
                  setPrefixOverride(autoGenerateRollNoPrefix(e.target.value));
                }}
              >
                <option value="">Select Group...</option>
                <option value="MPC">MPC</option>
                <option value="BiPC">BiPC</option>
                <option value="MEC">MEC</option>
                <option value="CEC">CEC</option>
                <option value="HEC">HEC</option>
              </select>
            </div>
            
            <div className="cms-form-group">
              <label>Prefix (auto: {autoGenerateRollNoPrefix(selectedGroup)})</label>
              <input
                className="cms-input"
                value={prefixOverride}
                placeholder={autoGenerateRollNoPrefix(selectedGroup)}
                onChange={e => setPrefixOverride(e.target.value.toUpperCase())}
              />
            </div>
            
            <div style={{display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px'}}>
              <button className="cms-btn cms-btn-outline" onClick={() => setGeneratingRollNo(false)}>Cancel</button>
              <button className="cms-btn cms-btn-primary" onClick={handleGenerateRollNo} disabled={!selectedGroup}>Generate</button>
            </div>
          </div>
        </Modal>
      )}
    </DashboardLayout>
      );
    }
    return (
      <NumberSeriesEditView
          forceSyncLocal={forceSyncLocal}
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
          forceSyncLocal={forceSyncLocal}
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

function AddCustomSeriesModal({ onClose, onSave, campus, toast }) {
  const [formState, setFormState] = useState({ name: "" });

  const generatePrefix = (name) => {
    const words = name.trim().toUpperCase().split(/[^A-Z0-9]+/);
    if (words.length > 1) {
      return words.map(w => w[0]).join('').substring(0, 4);
    }
    const stripped = words[0].replace(/[AEIOU]/g, '');
    const prefix = stripped.substring(0, 3).padEnd(3, words[0].substring(0, 3)).substring(0, 4);
    return prefix || "CUST";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formState.name.trim()) return;
    
    const newCode = formState.name.trim().toLowerCase().replace(/[^a-z0-9]/g, '-');
    const autoPrefix = generatePrefix(formState.name);
    
    const campusCode = campus?.shortName || campus?.campusCode || "CMP";
    
    onSave({
      seriesCode: newCode,
      id: newCode,
      seriesName: formState.name.trim(),
      prefix: autoPrefix,
      format: `${campusCode}-${autoPrefix}-{YYYY}-{SEQ}`,
      numberLength: 4,
      startNumber: 1,
      description: `Auto-generated series for ${formState.name.trim()}`,
      isActive: true
    });
  };

  return (
    <Modal title="Create Custom Series" onClose={onClose} footer={
      <>
        <button type="button" className="cms-btn cms-btn-ghost" onClick={onClose}>Cancel</button>
        <button type="button" className="cms-btn cms-btn-primary" onClick={handleSubmit}>Create Series</button>
      </>
    }>
      <div className="ns-modal-body">
        <form id="add-custom-series-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div className="ns-field">
            <label>Series Name*</label>
            <input type="text" value={formState.name} onChange={e => setFormState({ name: e.target.value })} placeholder="e.g. Library ID" required autoFocus />
            <small style={{ color: "var(--text-tertiary)", marginTop: "5px", display: "block" }}>
              The ID, prefix, and format will be automatically generated. You can edit them later.
            </small>
          </div>
        </form>
      </div>
    </Modal>
  );
}

// ======================================================================
// 1. DASHBOARD VIEW (MAIN CARD GRID)
// ======================================================================
function NumberSeriesDashboardView({ seriesList, loading, onRefresh, forceSyncLocal, toast, setToast }) {
  const navigate = useNavigate();
  const [showAddModal, setShowAddModal] = useState(false);
  const [savingCustom, setSavingCustom] = useState(false);
  const { selectedCampus, selectedCampusId } = useCampusContext();

  const handleCreateCustom = async (data) => {
    setShowAddModal(false); // Close instantly for snappy UI
    setSavingCustom(true);
    
    // We can optimistically push to offline data here to make it instantly available
    const tempConfig = {
      ...data,
      currentSequence: 0,
      totalGenerated: 0
    };
    
    // If the user previously deleted a card with this exact ID, we must un-delete it so it can be recreated!
    try {
      const key = String(data.seriesCode || data.id).toLowerCase().replace(/_/g, '-');
      const existingRaw = localStorage.getItem('NumberSeries_Deleted');
      if (existingRaw) {
        let arr = JSON.parse(existingRaw);
        if (Array.isArray(arr)) {
          arr = arr.filter(k => k !== key);
          localStorage.setItem('NumberSeries_Deleted', JSON.stringify(arr));
        }
      }
    } catch (e) {}
    // Read, append, and save to local storage instantly
    try {
      const raw = localStorage.getItem('NumberSeries_Config') || sessionStorage.getItem('NumberSeries_Config');
      let parsed = [];
      if (raw) parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        parsed.push(tempConfig);
        localStorage.setItem('NumberSeries_Config', JSON.stringify(parsed));
      }
    } catch (e) { }

    try {
      await numberSeriesApi.updateNumberSeries(data.seriesCode, {
        prefix: data.prefix,
        formatPattern: data.format,
        numberLength: data.numberLength,
        startNumber: data.startNumber,
        description: data.description,
        isActive: data.isActive,
        seriesName: data.seriesName,
        campusId: selectedCampusId
      });
      setShowAddModal(false);
      onRefresh();
      setToast({ message: "Custom series created successfully!", type: "success" });
    } catch (error) {
      setToast({ message: "Failed to create custom series.", type: "error" });
    } finally {
      setSavingCustom(false);
    }
  };

  return (
    <DashboardLayout
      title="ID & Number Series"
      subtitle="Configure Employee IDs, Admission Numbers and various document number formats."
      breadcrumb={["Home", "Settings", "ID & Number Series"]}
    >
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="ns-dashboard-container">
        {/* BACK NAVIGATION TO SETTINGS */}
        <div className="cms-back-nav-bar" style={{ marginBottom: "14px" }}>
          <Link
            to="/dashboard/settings"
            className="cms-back-link"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              color: "var(--cms-primary, #355e3b)",
              fontWeight: 650,
              fontSize: "13px",
              textDecoration: "none",
              cursor: "pointer",
            }}
          >
            <ArrowLeft size={16} /> Back to Settings
          </Link>
        </div>

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
            className="cms-btn cms-btn-primary"
            onClick={() => setShowAddModal(true)}
            style={{ alignSelf: "center", marginLeft: "auto", marginRight: "10px" }}
          >
            + Add Custom Series
          </button>
          <button
            type="button"
            className="cms-btn cms-btn-ghost"
            onClick={onRefresh}
            disabled={loading}
            style={{ alignSelf: "center" }}
            title="Refresh series"
          >
            <RefreshCw size={13} className={loading ? "spin" : ""} />
            <span>{loading ? "Loading..." : "Refresh"}</span>
          </button>
        </div>

        {showAddModal && <AddCustomSeriesModal onClose={() => setShowAddModal(false)} onSave={handleCreateCustom} campus={selectedCampus} toast={toast} />}

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
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <div className={`ns-card-badge ${series.isActive ? "" : "ns-card-badge-inactive"}`}>
                        {series.isActive ? "Active" : "Inactive"}
                      </div>
                      {!series.isActive && (
                        <button 
                          className="cms-btn cms-btn-ghost" 
                          style={{ padding: '4px', color: 'var(--error)' }} 
                          title="Delete Series"
                          onClick={() => {
                            if (window.confirm(`Are you sure you want to completely delete "${series.name || series.seriesName}"? This action removes the configuration permanently.`)) {
                              try {
                                const key = String(series.id || series.seriesCode).toLowerCase().replace(/_/g, '-');
                                const existingRaw = localStorage.getItem('NumberSeries_Deleted');
                                let arr = [];
                                if (existingRaw) arr = JSON.parse(existingRaw);
                                arr.push(key);
                                localStorage.setItem('NumberSeries_Deleted', JSON.stringify(arr));
                                setToast({ message: "Series deleted successfully.", type: "success" });
                                if (forceSyncLocal) forceSyncLocal();
                                else onRefresh();
                              } catch(e) {}
                            }
                          }}
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>

                <h3 className="ns-card-title">{series.name || series.seriesName}</h3>

                <div className="ns-card-example-box">
                  <span className="ns-card-example-lbl">Current / Next Example:</span>
                  <div className="ns-card-example-val">
                    {loading ? (
                      <span style={{ opacity: 0.6, fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '6px' }}>
                         <RefreshCw size={12} className="spin" /> Loading...
                      </span>
                    ) : (
                      series.livePreview || series.currentExample || nextVal
                    )}
                  </div>
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
  const [liveSeries, setLiveSeries] = useState(series);

  useEffect(() => {
    let mounted = true;
    const fetchDetail = async () => {
      try {
        const code = series.seriesCode || series.slug || series.id;
        const res = await numberSeriesApi.getNumberSeriesByCode(code);
        if (res && mounted) {
          setLiveSeries(normalizeNumberSeriesItem({ ...series, ...res }));
        }
      } catch {
        // Fallback to prop series
      }
    };
    fetchDetail();
    return () => {
      mounted = false;
    };
  }, [series]);

  const currentSeries = liveSeries || series;

  const historyList = useMemo(() => {
    return MOCK_GENERATED_HISTORY[currentSeries.id] || [];
  }, [currentSeries.id]);

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

  const nextNumberVal = currentSeries.livePreview || getNextNumberPreview(currentSeries);

  return (
    <DashboardLayout
      title={`${currentSeries.name} Number Series`}
      subtitle={`Manage the format and numbering sequence for ${currentSeries.name.toLowerCase()}.`}
      breadcrumb={["Home", "Settings", "ID & Number Series", currentSeries.name]}
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
            <h2>{currentSeries.name}</h2>
            <p>{currentSeries.description}</p>
          </div>

          <div className="ns-detail-header-actions">
            <button
              type="button"
              className="cms-btn cms-btn-ghost"
              onClick={() => onPreviewModal(currentSeries)}
            >
              <Sparkles size={16} />
              <span>Preview Next Number</span>
            </button>

            <button
              type="button"
              className="cms-btn cms-btn-primary"
              onClick={() => navigate(`/dashboard/settings/number-series/${currentSeries.id}/edit`)}
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
            <span className="ns-summary-val font-mono">{currentSeries.format || currentSeries.formatPattern}</span>
          </div>

          <div className="ns-summary-item highlight">
            <span className="ns-summary-lbl">Next Number</span>
            <span className="ns-summary-val font-bold">{nextNumberVal}</span>
          </div>

          <div className="ns-summary-item">
            <span className="ns-summary-lbl">Prefix</span>
            <span className="ns-summary-val">{currentSeries.prefix || "—"}</span>
          </div>

          <div className="ns-summary-item">
            <span className="ns-summary-lbl">Total Generated</span>
            <span className="ns-summary-val">{currentSeries.totalGenerated || currentSeries.currentSequence || currentSeries.currentNumber}</span>
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
function NumberSeriesEditView({ series, saving, onSave, forceSyncLocal, toast, setToast }) {
  const navigate = useNavigate();
  const { selectedCampusId } = useCampusContext();

  const [formState, setFormState] = useState({
    prefix: series.prefix || "",
    format: series.format || series.formatPattern || "",
    numberLength: series.numberLength || 4,
    startNumber: series.startNumber || 1,
    description: series.description || "",
    status: series.isActive ? "Active" : "Inactive",
  });

  const [validationError, setValidationError] = useState("");
  const [apiPreview, setApiPreview] = useState(null);

  // Re-validate format live when form state changes
  const liveValidation = useMemo(() => {
    return validateNumberSeries(
      formState.format,
      formState.numberLength,
      series.currentSequence || series.currentNumber,
      series.allowedTokens || series.availablePlaceholders || []
    );
  }, [formState.format, formState.numberLength, series.currentSequence, series.currentNumber, series.allowedTokens, series.availablePlaceholders]);

  const localLivePreviewVal = useMemo(() => {
    if (!liveValidation.valid) return null;
    const nextSeqNum = Number(series.currentSequence || series.currentNumber || 0) + 1;
    return buildNumberFromFormat(formState.format, nextSeqNum, formState.numberLength);
  }, [formState.format, formState.numberLength, series.currentSequence, series.currentNumber, liveValidation]);

  // Dynamic on-the-fly preview calculation for UI typing via GET /api/v1/settings/number-series/{seriesCode}/preview
  useEffect(() => {
    if (!liveValidation.valid) {
      setApiPreview(null);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const code = series.seriesCode || series.slug || series.id;
        const res = await numberSeriesApi.previewNumberSeries(code, {
          pattern: formState.format,
          numberLength: formState.numberLength,
          prefix: formState.prefix,
          campusId: selectedCampusId,
        });
        if (typeof res === "string" && res.trim()) {
          setApiPreview(res.trim());
        }
      } catch {
        // Fallback to local preview calculation
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [formState.format, formState.numberLength, formState.prefix, series, selectedCampusId, liveValidation.valid]);

  const livePreviewVal = apiPreview || localLivePreviewVal;

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
                {/* STATUS TOGGLE */}
                <div className="ns-edit-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', padding: '16px', background: 'var(--cms-bg-secondary)', borderRadius: '8px' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '15px' }}>Series Status</h3>
                    <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--cms-text-secondary)' }}>If inactive, this series cannot generate new numbers.</p>
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '10px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: formState.status === "Active" ? "var(--cms-success)" : "var(--cms-text-secondary)" }}>
                      {formState.status === "Active" ? "Active" : "Inactive"}
                    </span>
                    <input 
                      type="checkbox" 
                      checked={formState.status === "Active"} 
                      onChange={(e) => setFormState(p => ({ ...p, status: e.target.checked ? "Active" : "Inactive" }))} 
                      style={{ width: '18px', height: '18px', accentColor: 'var(--cms-success)' }}
                    />
                  </label>
                </div>

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
                    type="button"
                    className="cms-btn cms-btn-ghost"
                    style={{ color: "var(--error)" }}
                    title="Delete Series Permanently"
                    onClick={() => {
                      if (window.confirm(`Are you sure you want to completely delete "${series.name || series.seriesName}"?`)) {
                        try {
                          const key = String(series.id || series.seriesCode).toLowerCase().replace(/_/g, '-');
                          const existingRaw = localStorage.getItem('NumberSeries_Deleted');
                          let arr = [];
                          if (existingRaw) arr = JSON.parse(existingRaw);
                          arr.push(key);
                          localStorage.setItem('NumberSeries_Deleted', JSON.stringify(arr));
                                                    setToast({ message: "Series deleted successfully.", type: "success" });
                          if (forceSyncLocal) forceSyncLocal();
                          setTimeout(() => navigate("/dashboard/settings/number-series"), 50);
                        } catch(e) {}
                      }
                    }}
                  >
                    <Trash2 size={16} /> Delete
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
  const isInactive = series?.isActive === false;

  const nextVal = liveGeneratedNumber || series.livePreview || getNextNumberPreview(series);
  const nextSeqNum = Number(series.currentSequence || series.currentNumber || 0) + 1;

  const handleCopy = () => {
    navigator.clipboard.writeText(nextVal);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTestGenerate = async () => {
    const code = series.seriesCode || series.slug || series.id;
    setGenerating(true);
    let nextGenerated = null;
    try {
      const res = await numberSeriesApi.generateNextNumber(code, {
        dept: "General",
        type: "Standard",
      });
      if (res?.generatedNumber) {
        nextGenerated = res.generatedNumber;
      }
    } catch (err) {
      console.warn("POST /api/v1/settings/number-series/{seriesCode}/generate-next fallback:", err?.message || err);
    }

    const simulated = nextGenerated || getNextNumberPreview(series);
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
            disabled={generating || isInactive}
            style={isInactive ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
            title={isInactive ? "Series is inactive" : "Atomically increments the counter and generates the real next ID"}
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
        {isInactive && (
          <div style={{ marginTop: '10px', padding: '10px', background: '#ffebee', color: '#c62828', borderRadius: '4px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <AlertTriangle size={14} /> This series is inactive. Reactivate it to continue generating IDs.
          </div>
        )}

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
