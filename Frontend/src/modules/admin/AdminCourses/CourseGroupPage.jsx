import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { AlertTriangle, ArrowLeft, Plus } from "lucide-react";
import apiClient, { getApiErrorMessage } from "@/api/axios.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import DashboardLayout from "@/shared/layouts/DashboardLayout/DashboardLayout.jsx";
import DataTable from "@/shared/components/DataTable.jsx";
import {
  Field,
  Modal,
  SkeletonPage,
  StatusBadge,
  Toast,
  useForm,
} from "@/shared/components/Ui.jsx";
import { useAcademicContext } from "@/context/AcademicContext.jsx";
import "./CourseGroupPage.css";

const STATUS_OPTIONS = ["Active", "Inactive"];
const validId = (value) => Number.isInteger(Number(value)) && Number(value) > 0;
const read = (item, ...keys) => {
  const key = keys.find(
    (candidate) => item?.[candidate] !== undefined && item?.[candidate] !== null,
  );
  return key ? item[key] : undefined;
};
const responseData = (response) => response?.data?.data ?? response?.data?.Data ?? response?.data;
const requireSuccess = (response) => {
  if (response?.data?.success === false)
    throw new Error(response.data.message || "The request failed.");
  return response;
};
const getCollection = (payload) => {
  if (Array.isArray(payload)) return payload;
  for (const value of [
    payload?.data,
    payload?.Data,
    payload?.items,
    payload?.Items,
    payload?.$values,
    payload?.data?.items,
    payload?.data?.$values,
  ]) {
    if (Array.isArray(value)) return value;
  }
  throw new Error("The API returned an invalid list response.");
};
const normalizeBoardOption = (item) => ({
  value: String(read(item, "boardId", "BoardId", "id", "Id") || ""),
  label: String(read(item, "boardName", "BoardName", "name", "Name") || "Board"),
});
const uniqueByValue = (options) =>
  Array.from(
    new Map(
      options.filter((item) => validId(item.value)).map((item) => [item.value, item]),
    ).values(),
  );
const normalizeProgram = (item) => {
  const programId = read(item, "programId", "ProgramId");
  if (!validId(programId))
    throw new Error("The API returned a program without a valid program ID.");
  return {
    programId: String(programId),
    programName: String(read(item, "programName", "ProgramName") || "Program"),
    programCode: String(read(item, "programCode", "ProgramCode") || ""),
    status: read(item, "isActive", "IsActive") === false ? "Inactive" : "Active",
  };
};
const normalizeSelectedProgramIds = (ids = []) => Array.from(new Set(ids.map(String)));
const normalizeLevels = (levels) => {
  if (!Array.isArray(levels)) throw new Error("The API did not return academic-level eligibility.");
  return levels
    .map((level) => ({
      id: read(level, "academicLevelId", "AcademicLevelId"),
      name: read(level, "academicLevelName", "AcademicLevelName", "levelName", "LevelName") || "",
      order: read(level, "levelOrder", "LevelOrder") ?? 0,
    }))
    .sort((a, b) => a.order - b.order)
    .map((level) => level.name)
    .filter(Boolean)
    .join(", ");
};
const normalizeGroup = (item) => {
  // Master identity must never fall back to a contextual GroupId.
  if (!validId(item?.masterGroupId))
    throw new Error("The API returned a record without a valid MasterGroupId.");
  return {
    id: item.masterGroupId,
    boardId: String(item.boardId),
    board: item.boardName || "-",
    name: item.groupName || "-",
    code: item.groupCode || "-",
    description: item.description ?? "",
    availableLevels: normalizeLevels(item.eligibleAcademicLevels),
    status: item.isActive ? "Active" : "Inactive",
  };
};
const groupFormFields = [
  { name: "board", label: "Board", type: "select", options: [], required: true },
  { name: "name", label: "Group Name", required: true },
  { name: "code", label: "Group Code", required: true },
  { name: "status", label: "Status", type: "select", options: STATUS_OPTIONS, required: true },
  { name: "description", label: "Description", type: "textarea" },
];
const toPayload = (values, programIds, masterGroupId) => ({
  ...(!masterGroupId ? { boardId: Number(values.board) } : {}),
  groupName: values.name.trim(),
  groupCode: values.code.trim(),
  description: values.description?.trim() || null,
  isActive: values.status === "Active",
  programIds: normalizeSelectedProgramIds(programIds).map((id) => {
    if (!validId(id)) throw new Error("Select programs with valid backend IDs.");
    return Number(id);
  }),
});
const loadBoards = async () =>
  getCollection(requireSuccess(await apiClient.get(apiEndpoints.boards.getAll)).data).map(
    normalizeBoardOption,
  );
const loadProgramMaster = async () =>
  getCollection(requireSuccess(await apiClient.get(apiEndpoints.programs.list)).data).map(
    normalizeProgram,
  );
const groupApi = {
  fetchRows: async ({ search = "", boardId = "" } = {}) => {
    if (!validId(boardId)) return [];
    const response = requireSuccess(
      await apiClient.get(apiEndpoints.masterGroups.list, {
        params: { boardId: Number(boardId), search: search.trim() || undefined },
      }),
    );
    return getCollection(response.data).map(normalizeGroup);
  },
  fetchRow: async (id) => {
    if (!validId(id)) throw new Error("Invalid MasterGroupId.");
    const item = responseData(
      requireSuccess(await apiClient.get(apiEndpoints.masterGroups.getById(id))),
    );
    const group = normalizeGroup(item);
    if (Number(group.id) !== Number(id))
      throw new Error("The API returned a different master group.");
    if (!Array.isArray(item.programs))
      throw new Error("The API did not return the saved default programs.");
    return { group, programs: item.programs.map(normalizeProgram) };
  },
  saveRow: async (values, id, programIds) => {
    const payload = toPayload(values, programIds, id);
    const response = requireSuccess(
      id
        ? await apiClient.put(apiEndpoints.masterGroups.update(id), payload)
        : await apiClient.post(apiEndpoints.masterGroups.create, payload),
    );
    if (!validId(responseData(response)?.masterGroupId))
      throw new Error(
        "The save response did not confirm a MasterGroupId. Reload the list before retrying.",
      );
    return response;
  },
  deleteRow: async (id) =>
    requireSuccess(await apiClient.delete(apiEndpoints.masterGroups.delete(id))),
  deactivateRow: async (id) =>
    requireSuccess(
      await apiClient.patch(apiEndpoints.masterGroups.status(id), null, {
        params: { isActive: false },
      }),
    ),
};

export const pageConfig = {
  title: "Group Management",
  subtitle: "Create reusable groups for all board levels and academic years.",
  breadcrumb: ["Academics"],
  addLabel: "Add Group",
  rows: [],
  pagination: { currentOnly: true },
  api: groupApi,
  columns: [
    { key: "name", label: "Group Name", strong: true },
    { key: "code", label: "Group Code" },
    {
      key: "board",
      label: "Board",
      render: (row) => (
        <>
          {row.board}
          <small className="group-available-levels">
            Available Levels: {row.availableLevels || "None configured"}
          </small>
        </>
      ),
    },
    { key: "status", label: "Status", badge: true },
  ],
  fields: groupFormFields,
};

function AddProgramModal({ onCancel, onAdd, saving = false }) {
  const fields = [
    { name: "programName", label: "Program Name", required: true },
    { name: "status", label: "Status", type: "select", options: STATUS_OPTIONS, required: true },
  ];
  const { values, errors, setValue, validate } = useForm(fields, { status: "Active" });

  const submit = () => {
    if (!validate()) return;
    onAdd(values);
  };

  return (
    <Modal
      title="Add Program"
      onClose={onCancel}
      size="sm"
      footer={
        <>
          <button type="button" className="cms-btn cms-btn-ghost" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="cms-btn cms-btn-primary"
            onClick={submit}
            disabled={saving}
          >
            {saving ? "Adding..." : "Add Program"}
          </button>
        </>
      }
    >
      <div className="cms-form-grid">
        {fields.map((field) => (
          <Field
            key={field.name}
            field={field}
            value={values[field.name]}
            error={errors[field.name]}
            onChange={setValue}
          />
        ))}
      </div>
    </Modal>
  );
}

function ProgramsPanel({
  programs,
  onProgramsChange,
  groupCode,
  groupName,
  selectedProgramIds,
  onChange,
  onError,
  disabled,
}) {
  const [adding, setAdding] = useState(false);
  const [savingProgram, setSavingProgram] = useState(false);
  const selected = new Set(selectedProgramIds.map(String));
  const headingName = String(groupCode || groupName || "this Group").trim();
  const addProgram = async (values) => {
    if (savingProgram) return;
    const name = String(values.programName || "").trim();
    const existing = programs.find(
      (program) => program.programName.toLowerCase() === name.toLowerCase(),
    );
    if (existing) {
      if (existing.status === "Inactive") return onError("This program is inactive.");
      onChange(normalizeSelectedProgramIds([...selectedProgramIds, existing.programId]));
      setAdding(false);
      return;
    }
    setSavingProgram(true);
    try {
      // Program creation is independent of master and contextual group identities.
      const response = requireSuccess(
        await apiClient.post(apiEndpoints.programs.create, {
          programName: name,
          isActive: values.status !== "Inactive",
        }),
      );
      const program = normalizeProgram(responseData(response));
      onProgramsChange([...programs, program]);
      onChange(normalizeSelectedProgramIds([...selectedProgramIds, program.programId]));
      setAdding(false);
    } catch (error) {
      onError(getApiErrorMessage(error));
    } finally {
      setSavingProgram(false);
    }
  };
  return (
    <section className="course-programs-panel">
      <div className="course-programs-head">
        <div>
          <h3>Programs for {headingName}</h3>
          <p>Selected Programs: {selected.size}</p>
        </div>
        <button
          type="button"
          className="cms-btn cms-btn-ghost course-add-program-btn"
          disabled={disabled}
          onClick={() => setAdding(true)}
        >
          <Plus size={14} /> Add Program
        </button>
      </div>
      <div className="course-program-grid">
        {programs.map((program) => (
          <label key={program.programId} className="course-program-option">
            <input
              type="checkbox"
              checked={selected.has(program.programId)}
              disabled={disabled || program.status === "Inactive"}
              onChange={(event) =>
                onChange(
                  event.target.checked
                    ? normalizeSelectedProgramIds([...selectedProgramIds, program.programId])
                    : selectedProgramIds.filter((id) => String(id) !== program.programId),
                )
              }
            />
            <span>
              <strong>{program.programName}</strong>
              <small>{program.programCode}</small>
            </span>
          </label>
        ))}
        {!programs.length ? <p>No programs available. Add a program to get started.</p> : null}
      </div>
      {adding ? (
        <AddProgramModal
          onCancel={() => {
            if (!savingProgram) setAdding(false);
          }}
          onAdd={addProgram}
          saving={savingProgram}
        />
      ) : null}
    </section>
  );
}

function CourseGroupFormPage() {
  // The existing route's :id now identifies a master group on this screen only.
  const { id } = useParams();
  const navigate = useNavigate();
  const { selectedBoard, selectedBoardId } = useAcademicContext();
  const [boards, setBoards] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [availableLevels, setAvailableLevels] = useState("");
  const [selectedProgramIds, setSelectedProgramIds] = useState([]);
  const [toast, setToast] = useState("");
  const [toastType, setToastType] = useState("success");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const { values, errors, setValue, validate, setValues, setErrors } = useForm(groupFormFields, {
    status: "Active",
  });
  const mode = id ? "Edit" : "Add";
  const listPath = "/dashboard/courses";
  const showProgramError = useCallback((message) => {
    setToastType("error");
    setToast(message);
  }, []);
  useEffect(() => {
    let ignore = false;
    const load = async () => {
      setLoading(true);
      setLoadError("");
      try {
        const [boardOptions, catalog, detail] = await Promise.all([
          loadBoards(),
          loadProgramMaster(),
          id ? groupApi.fetchRow(id) : null,
        ]);
        const boardId = detail ? detail.group.boardId : selectedBoardId;
        const levels = detail
          ? detail.group.availableLevels
          : validId(boardId)
            ? normalizeLevels(
                getCollection(
                  requireSuccess(
                    await apiClient.get(apiEndpoints.boards.getAcademicLevels, {
                      params: { boardId: Number(boardId) },
                    }),
                  ).data,
                ),
              )
            : "";
        if (ignore) return;
        setBoards(
          uniqueByValue([
            ...boardOptions,
            ...(detail
              ? [{ value: detail.group.boardId, label: detail.group.board }]
              : validId(selectedBoardId)
                ? [
                    {
                      value: String(selectedBoardId),
                      label:
                        read(selectedBoard, "boardName", "BoardName", "name", "Name") ||
                        String(selectedBoardId),
                    },
                  ]
                : []),
          ]),
        );
        setPrograms(
          Array.from(
            new Map(
              [...catalog, ...(detail?.programs || [])].map((program) => [
                program.programId,
                program,
              ]),
            ).values(),
          ),
        );
        setAvailableLevels(levels);
        setSelectedProgramIds(detail ? detail.programs.map((program) => program.programId) : []);
        setValues(
          detail
            ? {
                board: detail.group.boardId,
                name: detail.group.name,
                code: detail.group.code,
                status: detail.group.status,
                description: detail.group.description,
              }
            : {
                board: validId(selectedBoardId) ? String(selectedBoardId) : "",
                name: "",
                code: "",
                description: "",
                status: "Active",
              },
        );
      } catch (error) {
        if (!ignore) setLoadError(getApiErrorMessage(error));
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    load();
    return () => {
      ignore = true;
    };
  }, [id, selectedBoardId, selectedBoard, setValues]);
  const fields = groupFormFields.map((field) =>
    field.name === "board" ? { ...field, options: boards, disabled: true } : field,
  );
  const submit = async (event) => {
    event.preventDefault();
    if (saving || loading || loadError || !validate()) return;
    const nextErrors = {};
    if (!validId(values.board))
      nextErrors.board = "Select a Board in the top navbar before saving a group.";
    if (values.name.trim().length > 100)
      nextErrors.name = "Group Name must be at most 100 characters.";
    if (values.code.trim().length > 30)
      nextErrors.code = "Group Code must be at most 30 characters.";
    if (!availableLevels) nextErrors.board = "No academic levels are configured for this board.";
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }
    setSaving(true);
    try {
      await groupApi.saveRow(values, id, selectedProgramIds);
      navigate(listPath, {
        state: { groupMessage: `Master group ${id ? "updated" : "created"} successfully.` },
      });
    } catch (error) {
      showProgramError(getApiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };
  return (
    <DashboardLayout
      title={`${mode} Group`}
      subtitle="Configure a reusable master group and its default programs."
      breadcrumb={["Group Management"]}
    >
      <div className="cms-form-page course-group-form-page">
        <Link to={listPath} className="cms-back-link">
          <ArrowLeft size={15} /> Back to Group Management
        </Link>
        <form className="cms-card" onSubmit={submit} noValidate>
          <div className="cms-card-body">
            {loading ? (
              <SkeletonPage variant="form" rows={5} />
            ) : loadError ? (
              <div className="cms-empty" role="alert">
                {loadError}
              </div>
            ) : (
              <>
                <div className="cms-form-grid">
                  {fields.map((field) => (
                    <Field
                      key={field.name}
                      field={{ ...field, disabled: field.disabled || saving }}
                      value={values[field.name]}
                      error={errors[field.name]}
                      onChange={(name, value) => {
                        if (name !== "board") setValue(name, value);
                      }}
                    />
                  ))}
                </div>
                <p>
                  Available Levels: {availableLevels || "None configured"}. Reusable across current
                  and future academic years.
                </p>
                <ProgramsPanel
                  programs={programs}
                  onProgramsChange={setPrograms}
                  groupCode={values.code}
                  groupName={values.name}
                  selectedProgramIds={selectedProgramIds}
                  onChange={setSelectedProgramIds}
                  onError={showProgramError}
                  disabled={saving}
                />
              </>
            )}
            <div className="cms-form-actions">
              <button
                type="button"
                className="cms-btn cms-btn-ghost"
                onClick={() => navigate(listPath)}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="cms-btn cms-btn-primary"
                disabled={saving || loading || Boolean(loadError)}
              >
                {saving ? "Saving..." : `${id ? "Update" : "Save"} Group`}
              </button>
            </div>
          </div>
        </form>
      </div>
      <Toast message={toast} type={toastType} onClose={() => setToast("")} />
    </DashboardLayout>
  );
}

function CourseGroupListPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedBoardId } = useAcademicContext();
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(location.state?.groupMessage || "");
  const [toastType, setToastType] = useState("success");
  const [error, setError] = useState("");
  const requestId = useRef(0);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deletingId, setDeletingId] = useState("");
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    if (location.state?.groupMessage) navigate(location.pathname, { replace: true, state: null });
  }, [location, navigate]);

  const closeDeleteModal = () => {
    setDeleteTarget(null);
    setDeleteError("");
  };

  const loadRows = useCallback(
    async (nextSearch = search) => {
      const currentRequest = requestId.current + 1;
      requestId.current = currentRequest;
      setLoading(true);
      setError("");
      try {
        const loadedRows = await groupApi.fetchRows({
          search: nextSearch,
          boardId: selectedBoardId,
        });
        if (requestId.current === currentRequest) setRows(loadedRows);
      } catch (err) {
        if (requestId.current === currentRequest) {
          setRows([]);
          setError(getApiErrorMessage(err));
        }
      } finally {
        if (requestId.current === currentRequest) setLoading(false);
      }
    },
    [search, selectedBoardId],
  );

  useEffect(() => {
    loadRows(search);
  }, [loadRows, search]);

  const handleSearch = (value) => {
    if (value === search) return;
    setSearch(value);
  };

  const requestDeleteGroup = (row) => {
    if (deletingId) return;
    setDeleteError("");
    setDeleteTarget(row);
  };

  const deleteGroup = async () => {
    if (!deleteTarget?.id || deletingId || deleteError) return;
    setDeletingId(deleteTarget.id);
    try {
      await groupApi.deleteRow(deleteTarget.id);
      setToastType("success");
      setToast("Group deleted successfully");
      closeDeleteModal();
      await loadRows(search);
    } catch (err) {
      const message = getApiErrorMessage(err);
      const normalizedMessage = message.toLowerCase();
      if (
        normalizedMessage.includes("cannot delete") ||
        normalizedMessage.includes("currently in use")
      ) {
        setDeleteError(message);
      } else {
        setToastType("error");
        setToast(message);
      }
    } finally {
      setDeletingId("");
    }
  };

  const deactivateGroup = async () => {
    if (!deleteTarget?.id || deletingId) return;
    setDeletingId(deleteTarget.id);
    try {
      await groupApi.deactivateRow(deleteTarget.id);
      setToastType("success");
      setToast("Master group deactivated successfully.");
      closeDeleteModal();
      await loadRows(search);
    } catch (err) {
      setDeleteError(getApiErrorMessage(err));
    } finally {
      setDeletingId("");
    }
  };

  const addGroup = () => {
    navigate("/dashboard/courses/add");
  };

  const columns = useMemo(
    () =>
      pageConfig.columns.map((column) =>
        column.badge
          ? { ...column, render: (row) => <StatusBadge value={row[column.key]} /> }
          : column,
      ),
    [],
  );

  return (
    <DashboardLayout
      title={pageConfig.title}
      subtitle={pageConfig.subtitle}
      breadcrumb={pageConfig.breadcrumb}
    >
      <div className="group-management">
        {!validId(selectedBoardId) ? (
          <p>Select a Board in the top navbar to view master groups.</p>
        ) : null}
        {error ? (
          <div className="cms-card" style={{ marginBottom: 16 }}>
            <div className="cms-card-body">
              <div className="cms-empty">{error}</div>
              <button className="cms-btn cms-btn-ghost" onClick={() => loadRows(search)}>
                Retry
              </button>
            </div>
          </div>
        ) : null}
        <DataTable
          title={pageConfig.title}
          columns={columns}
          rows={rows}
          loading={loading}
          addLabel={pageConfig.addLabel}
          searchPlaceholder="Search by group name or code..."
          onSearchChange={handleSearch}
          onAdd={addGroup}
          enableExport={false}
          onEdit={(row) => navigate(`/dashboard/courses/${row.id}/edit`)}
          onDelete={requestDeleteGroup}
        />
      </div>
      {deleteTarget ? (
        <Modal
          title="Delete Master Group"
          size="sm"
          onClose={deletingId ? () => {} : closeDeleteModal}
          footer={
            <>
              <button
                type="button"
                className="cms-btn cms-btn-ghost"
                onClick={closeDeleteModal}
                disabled={Boolean(deletingId)}
              >
                Cancel
              </button>
              {!deleteError ? (
                <button
                  type="button"
                  className="cms-btn cms-btn-danger"
                  onClick={deleteGroup}
                  disabled={Boolean(deletingId)}
                >
                  {deletingId ? "Deleting..." : "Delete"}
                </button>
              ) : deleteTarget.status === "Active" ? (
                <button
                  type="button"
                  className="cms-btn cms-btn-primary"
                  onClick={deactivateGroup}
                  disabled={Boolean(deletingId)}
                >
                  {deletingId ? "Deactivating..." : "Deactivate"}
                </button>
              ) : null}
            </>
          }
        >
          {deleteError ? (
            <div
              role="alert"
              style={{
                display: "flex",
                gap: 12,
                alignItems: "flex-start",
                padding: "14px 16px",
                borderRadius: 12,
                border: "1px solid #fecaca",
                background: "#fef2f2",
                color: "#991b1b",
                lineHeight: 1.55,
                overflowWrap: "anywhere",
              }}
            >
              <AlertTriangle size={20} style={{ flex: "0 0 auto", marginTop: 2 }} />
              <span>{deleteError}</span>
            </div>
          ) : (
            <p>
              Are you sure you want to delete this master group? Referenced groups may require
              deactivation instead.
            </p>
          )}
        </Modal>
      ) : null}
      <Toast message={toast} type={toastType} onClose={() => setToast("")} />
    </DashboardLayout>
  );
}

export function CourseGroupFormRoute() {
  return <CourseGroupFormPage />;
}

export default function CourseGroupPage({ form = false }) {
  return form ? <CourseGroupFormPage /> : <CourseGroupListPage />;
}
