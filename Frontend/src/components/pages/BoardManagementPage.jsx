import { useMemo, useState } from "react";
import { Download, Edit3, Eye, Landmark, Plus, Save, Trash2, UsersRound } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import Search3DIcon from "@/components/common/Search3DIcon.jsx";
import { ConfirmDialog, Toast } from "@/components/common/Ui.jsx";
import "./BoardManagementPage.css";

const PAGE_SIZE = 5;
const initialBoards = [
  { id: 1, name: "Board of Intermediate Education, Andhra Pradesh", code: "BIEAP", type: "State Board", state: "Andhra Pradesh", level: "Intermediate / 10+2", duration: "2 Years", status: "Active", description: "Intermediate education board for Andhra Pradesh." },
  { id: 2, name: "Andhra Pradesh Open School Society (APOSS)", code: "APOSS", type: "State Board", state: "Andhra Pradesh", level: "Secondary / 10th", duration: "1 Year", status: "Active", description: "Open schooling board for Andhra Pradesh." },
  { id: 3, name: "Central Board of Secondary Education (CBSE)", code: "CBSE", type: "Central Board", state: "All India", level: "Secondary / 10th", duration: "2 Years", status: "Active", description: "National-level secondary education board." },
  { id: 4, name: "National Institute of Open Schooling (NIOS)", code: "NIOS", type: "Open Board", state: "All India", level: "Secondary / 10th", duration: "Flexible", status: "Active", description: "Flexible open-school education board." },
  { id: 5, name: "Telangana State Board of Intermediate Education", code: "TSBIE", type: "State Board", state: "Telangana", level: "Intermediate / 10+2", duration: "2 Years", status: "Active", description: "Intermediate education board for Telangana." },
  { id: 6, name: "Council for the Indian School Certificate Examinations", code: "CISCE", type: "Central Board", state: "All India", level: "Secondary / 10th", duration: "2 Years", status: "Active", description: "National private school examination board." },
  { id: 7, name: "Maharashtra State Board", code: "MSBSHSE", type: "State Board", state: "Maharashtra", level: "Intermediate / 10+2", duration: "2 Years", status: "Inactive", description: "Secondary and higher secondary board for Maharashtra." },
  { id: 8, name: "International Baccalaureate", code: "IB", type: "International Board", state: "All India", level: "Diploma / 10+2", duration: "2 Years", status: "Active", description: "International diploma programme." },
];

const emptyForm = { name: "", code: "", type: "", state: "", level: "", duration: "", status: "Active", effectiveFrom: "", effectiveTo: "", admissionStartDate: "", admissionEndDate: "", description: "" };

export const pageConfig = {
  title: "Board Management",
  subtitle: "Manage education boards and academic settings.",
  breadcrumb: ["Academics"],
  rows: initialBoards,
  columns: [
    { key: "name", label: "Board Name" }, { key: "code", label: "Board Code" }, { key: "type", label: "Board Type" },
    { key: "state", label: "State" }, { key: "level", label: "Level" }, { key: "duration", label: "Duration" }, { key: "status", label: "Status", badge: true },
  ],
  fields: [],
  allowAdd: false,
};

function BoardForm({ mode, value, onCancel, onSave }) {
  const [form, setForm] = useState({ ...emptyForm, ...(value || {}) });
  const [errors, setErrors] = useState({});
  const setValue = (name, next) => { setForm((current) => ({ ...current, [name]: next })); setErrors((current) => ({ ...current, [name]: "" })); };
  const submit = (event) => {
    event.preventDefault();
    const required = ["name", "code", "type", "state", "level", "duration", "status"];
    const nextErrors = Object.fromEntries(required.filter((key) => !String(form[key] || "").trim()).map((key) => [key, "This field is required"]));
    if (form.effectiveFrom && form.effectiveTo && form.effectiveFrom > form.effectiveTo) nextErrors.effectiveTo = "Effective To must be on or after Effective From";
    if (form.admissionStartDate && form.admissionEndDate && form.admissionStartDate > form.admissionEndDate) nextErrors.admissionEndDate = "Admission End Date must be on or after Admission Start Date";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    onSave(form);
  };
  const field = (name, label, options, className = "") => <label className={`board-field ${className}${errors[name] ? " has-error" : ""}`}><span>{label} <b>*</b></span>{options ? <select value={form[name]} onChange={(e) => setValue(name, e.target.value)}><option value="">Select {label}</option>{options.map((option) => <option key={option}>{option}</option>)}</select> : <input value={form[name]} onChange={(e) => setValue(name, e.target.value)} />}{errors[name] ? <small>{errors[name]}</small> : null}</label>;
  return <section className="board-panel board-form-card">
    <header className="board-edit-header"><span className="board-edit-icon"><UsersRound size={18} /></span><div><h2>{mode === "edit" ? "Edit Board" : "Add Board"}</h2><p>{mode === "edit" ? "Update board information and academic settings." : "Create a board and configure its academic settings."}</p></div></header>
    <form className="board-form-grid board-form-grid--reference" onSubmit={submit} noValidate>
      {field("name", "Board Name")}{field("code", "Board Code")}
      {field("type", "Board Type", ["State Board", "Central Board", "Open Board", "International Board"])}{field("state", "State", ["Andhra Pradesh", "Telangana", "Maharashtra", "All India"])}{field("level", "Level", ["Secondary / 10th", "Intermediate / 10+2", "Diploma / 10+2"])}{field("duration", "Duration", ["1 Year", "2 Years", "Flexible"])}
      <label className="board-field board-status-field"><span>Status <b>*</b></span><select value={form.status} onChange={(e) => setValue("status", e.target.value)}><option>Active</option><option>Inactive</option></select></label>
      <label className={`board-field${errors.effectiveFrom ? " has-error" : ""}`}><span>Effective From</span><input type="date" value={form.effectiveFrom} onChange={(e) => setValue("effectiveFrom", e.target.value)} />{errors.effectiveFrom ? <small>{errors.effectiveFrom}</small> : null}</label>
      <label className={`board-field${errors.effectiveTo ? " has-error" : ""}`}><span>Effective To</span><input type="date" value={form.effectiveTo} onChange={(e) => setValue("effectiveTo", e.target.value)} />{errors.effectiveTo ? <small>{errors.effectiveTo}</small> : null}</label>
      <label className={`board-field${errors.admissionStartDate ? " has-error" : ""}`}><span>Admission Start Date</span><input type="date" value={form.admissionStartDate} onChange={(e) => setValue("admissionStartDate", e.target.value)} />{errors.admissionStartDate ? <small>{errors.admissionStartDate}</small> : null}</label>
      <label className={`board-field${errors.admissionEndDate ? " has-error" : ""}`}><span>Admission End Date</span><input type="date" value={form.admissionEndDate} onChange={(e) => setValue("admissionEndDate", e.target.value)} />{errors.admissionEndDate ? <small>{errors.admissionEndDate}</small> : null}</label>
      <label className="board-field board-field--full"><span>Description / Notes</span><textarea rows="4" value={form.description} placeholder="Enter Description / Notes" onChange={(e) => setValue("description", e.target.value)} /></label>
      <div className="board-form-actions board-field--full"><button type="submit" className="cms-btn cms-btn-primary"><Save size={16} /> {mode === "edit" ? "Save Changes" : "Save Board"}</button><button type="button" className="cms-btn cms-btn-ghost" onClick={onCancel}>Cancel</button></div>
    </form>
  </section>;
}

export default function BoardManagementPage() {
  const [boards, setBoards] = useState(initialBoards), [mode, setMode] = useState("list"), [selected, setSelected] = useState(null), [deleting, setDeleting] = useState(null);
  const [search, setSearch] = useState(""), [page, setPage] = useState(1);
  const [toast, setToast] = useState("");
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return boards.filter((board) => !query || [board.name, board.code, board.state, board.type, board.level].some((value) => value.toLowerCase().includes(query)));
  }, [boards, search]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const changeSearch = (value) => { setSearch(value); setPage(1); };
  const save = (form) => {
    if (mode === "edit") setBoards((current) => current.map((board) => board.id === selected.id ? { ...form, id: selected.id } : board));
    else {
      setBoards((current) => [...current, { ...form, id: Math.max(0, ...current.map((board) => board.id)) + 1 }]);
      setPage(Math.ceil((boards.length + 1) / PAGE_SIZE));
    }
    setToast(mode === "edit" ? "Board updated successfully" : "Board added successfully"); setSelected(null); setMode("list");
  };
  const remove = () => { setBoards((current) => current.filter((board) => board.id !== deleting.id)); setDeleting(null); setPage(1); setToast("Board deleted successfully"); };
  const exportRows = () => {
    const csv = [["Board Name", "Board Code", "Board Type", "State", "Level", "Duration", "Status"], ...filtered.map((board) => [board.name, board.code, board.type, board.state, board.level, board.duration, board.status])].map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); const link = document.createElement("a"); link.href = url; link.download = "boards-mock-data.csv"; link.click(); URL.revokeObjectURL(url);
  };
  if (mode === "add" || mode === "edit") return <DashboardLayout title={mode === "edit" ? "Edit Board" : "Add Board"} subtitle={mode === "edit" ? "Update board information and academic settings." : "Create a board and configure its academic settings."} breadcrumb={["Academics"]}><main className="board-page board-form-view"><BoardForm key={`${mode}-${selected?.id || "new"}`} mode={mode} value={mode === "edit" ? selected : emptyForm} onCancel={() => { setSelected(null); setMode("list"); }} onSave={save} /></main><Toast message={toast} onClose={() => setToast("")} /></DashboardLayout>;
  if (mode === "details") {
    const detailRows = [
      ["Board Name", selected.name], ["Board Code", selected.code], ["Board Type", selected.type], ["State", selected.state], ["Level", selected.level], ["Duration", selected.duration],
    ];
    return <DashboardLayout title="Board Details" subtitle="View complete board information and academic settings." breadcrumb={["Academics"]}><main className="board-page board-details-view"><section className="board-panel board-details-card">
      <header style={{ background: "linear-gradient(90deg, #f5f8ff, #ffffff)", minHeight: 58 }}><div style={{ display: "flex", alignItems: "center", gap: 10 }}><span className="board-edit-icon"><Landmark size={18} /></span><h2 style={{ margin: 0 }}>Board Details</h2></div><button className="cms-btn cms-btn-ghost" onClick={() => setMode("edit")}><Edit3 size={16} /> Edit Board</button></header>
      <div style={{ padding: "16px 20px 22px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "150px minmax(0, 1fr)", gap: "13px 14px", alignItems: "start", fontSize: 13 }}>
          {detailRows.map(([label, value]) => <div style={{ display: "contents" }} key={label}><strong>{label}</strong><span>{value || "—"}</span></div>)}
          <strong>Status</strong><span><span className={`board-status board-status--${selected.status.toLowerCase()}`}>{selected.status}</span></span>
          <strong>Description / Notes</strong><span style={{ maxWidth: 620, lineHeight: 1.55 }}>{selected.description || "—"}</span>
          <strong>Effective From</strong><span>{selected.effectiveFrom || "Not provided"}</span>
          <strong>Effective To</strong><span>{selected.effectiveTo || "Not provided"}</span>
          <strong>Admission Start Date</strong><span>{selected.admissionStartDate || "Not provided"}</span>
          <strong>Admission End Date</strong><span>{selected.admissionEndDate || "Not provided"}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 22 }}><button className="cms-btn cms-btn-ghost" onClick={() => setMode("list")}>Back to Board History</button></div>
      </div>
    </section></main></DashboardLayout>;
  }
  return <DashboardLayout title="Board Management" subtitle="Manage education boards and academic settings." breadcrumb={["Academics"]}><main className="board-page board-list-view"><section className="board-panel"><header className="board-list-header"><div><h2>Board History</h2><p>View and manage configured education boards.</p></div></header><div className="board-toolbar board-toolbar--simple"><div className="board-search"><Search3DIcon size={18} /><input value={search} onChange={(e) => changeSearch(e.target.value)} placeholder="Search board name, code, state..." /></div><div className="board-toolbar-actions"><button className="cms-btn cms-btn-ghost" onClick={exportRows}><Download size={16} /> Export</button><button className="cms-btn cms-btn-primary board-add-button" onClick={() => { setSelected(null); setMode("add"); }}><Plus size={17} /> Add Board</button></div></div>
    <div className="board-table-wrap"><table className="board-table"><thead><tr><th>Board Name</th><th>Board Code</th><th>Board Type</th><th>State</th><th>Level</th><th>Duration</th><th>Status</th><th>Actions</th></tr></thead><tbody>{visible.map((board) => <tr key={board.id}><td><strong>{board.name}</strong></td><td>{board.code}</td><td>{board.type}</td><td>{board.state}</td><td>{board.level}</td><td>{board.duration}</td><td><span className={`board-status board-status--${board.status.toLowerCase()}`}>{board.status}</span></td><td><div className="board-row-actions"><button className="board-action-view" title="View" aria-label={`View ${board.name}`} onClick={() => { setSelected(board); setMode("details"); }}><Eye size={17} /></button><button className="board-action-edit" title="Edit" aria-label={`Edit ${board.name}`} onClick={() => { setSelected(board); setMode("edit"); }}><Edit3 size={17} /></button><button className="board-action-delete" title="Delete" aria-label={`Delete ${board.name}`} onClick={() => setDeleting(board)}><Trash2 size={17} /></button></div></td></tr>)}</tbody></table></div>
    <footer className="board-history-footer"><span>Showing {(currentPage - 1) * PAGE_SIZE + (visible.length ? 1 : 0)}–{(currentPage - 1) * PAGE_SIZE + visible.length} of {filtered.length} records</span><nav aria-label="Board history pages"><button disabled={currentPage === 1} onClick={() => setPage((value) => value - 1)}>Prev</button>{Array.from({ length: pageCount }, (_, index) => index + 1).map((number) => <button className={currentPage === number ? "is-active" : ""} key={number} onClick={() => setPage(number)}>{number}</button>)}<button disabled={currentPage === pageCount} onClick={() => setPage((value) => value + 1)}>Next</button></nav></footer></section></main>{deleting ? <ConfirmDialog title="Delete board" message={`Delete “${deleting.name}”?`} onCancel={() => setDeleting(null)} onConfirm={remove} /> : null}<Toast message={toast} onClose={() => setToast("")} /></DashboardLayout>;
}
