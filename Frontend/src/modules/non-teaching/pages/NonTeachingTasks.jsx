import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import {
  ListTodo,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  X,
  Send,
} from "lucide-react";
import { nonTeachingService } from "../services/nonTeachingService.js";

export default function NonTeachingTasks() {
  const [searchParams, setSearchParams] = useSearchParams();

  const statusParam = searchParams.get("status") || "all";
  const priorityParam = searchParams.get("priority") || "all";
  const searchParam = searchParams.get("search") || "";
  const cardParam = searchParams.get("card");

  const [tasks, setTasks] = useState(() => nonTeachingService.getTasks());
  const [statusFilter, setStatusFilter] = useState(statusParam);
  const [priorityFilter, setPriorityFilter] = useState(priorityParam);
  const [searchQuery, setSearchQuery] = useState(searchParam);
  const [showAddModal, setShowAddModal] = useState(() => cardParam === "add-task" || cardParam === "add");
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    category: "Office Administration",
    priority: "Medium",
    dueDate: new Date(Date.now() + 86400000 * 2).toISOString().split("T")[0],
  });
  const [toastMessage, setToastMessage] = useState(null);

  useEffect(() => {
    const st = searchParams.get("status") || "all";
    if (st !== statusFilter) setStatusFilter(st);

    const pr = searchParams.get("priority") || "all";
    if (pr !== priorityFilter) setPriorityFilter(pr);

    const q = searchParams.get("search") || "";
    if (q !== searchQuery) setSearchQuery(q);

    const card = searchParams.get("card");
    const shouldOpen = card === "add-task" || card === "add";
    if (shouldOpen !== showAddModal) setShowAddModal(shouldOpen);
  }, [searchParams]);

  const handleStatusFilterChange = (st) => {
    setStatusFilter(st);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (st && st !== "all") next.set("status", st);
      else next.delete("status");
      return next;
    });
  };

  const handlePriorityFilterChange = (pr) => {
    setPriorityFilter(pr);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (pr && pr !== "all") next.set("priority", pr);
      else next.delete("priority");
      return next;
    });
  };

  const handleSearchChange = (val) => {
    setSearchQuery(val);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (val) next.set("search", val);
      else next.delete("search");
      return next;
    });
  };

  const handleOpenAddModal = () => {
    setShowAddModal(true);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("card", "add-task");
      return next;
    });
  };

  const handleCloseAddModal = () => {
    setShowAddModal(false);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("card");
      return next;
    });
  };

  const showToast = (text) => {
    setToastMessage(text);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const loadTasks = useCallback(async () => {
    try {
      const data = await nonTeachingService.fetchTasks();
      if (Array.isArray(data)) {
        setTasks(data);
      }
    } catch {
      // Fallback to local
    }
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      const matchStatus =
        statusFilter === "all" ||
        t.status.toLowerCase().replace(/\s+/g, "") === statusFilter.toLowerCase().replace(/[-\s]+/g, "");
      const matchPriority =
        priorityFilter === "all" || t.priority.toLowerCase() === priorityFilter.toLowerCase();
      const matchSearch =
        !searchQuery ||
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (t.category && t.category.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchStatus && matchPriority && matchSearch;
    });
  }, [tasks, statusFilter, priorityFilter, searchQuery]);

  const handleUpdateStatus = async (taskId, newStatus) => {
    const updated = await nonTeachingService.updateTaskStatus(taskId, newStatus);
    setTasks(updated);
    showToast(`Task status updated to ${newStatus}.`);
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!newTask.title.trim()) {
      showToast("Please provide a task title.");
      return;
    }
    await nonTeachingService.addTask(newTask);
    setTasks(nonTeachingService.getTasks());
    handleCloseAddModal();
    setNewTask({
      title: "",
      description: "",
      category: "Office Administration",
      priority: "Medium",
      dueDate: new Date(Date.now() + 86400000 * 2).toISOString().split("T")[0],
    });
    showToast("New task created successfully.");
  };

  const pendingCount = tasks.filter((t) => t.status === "Pending").length;
  const inProgressCount = tasks.filter((t) => t.status === "In Progress").length;
  const completedCount = tasks.filter((t) => t.status === "Completed").length;

  return (
    <>
      {toastMessage && (
        <div
          className="cms-toast-banner cms-toast-success"
          role="alert"
          style={{ position: "fixed", top: 16, right: 16, zIndex: 9999 }}
        >
          <CheckCircle2 size={16} /> {toastMessage}
        </div>
      )}

      {/* KPI Counts Strip (Screens 6 & 8) */}
      <section className="nts-kpi-grid" style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}>
        <div className="nts-kpi nts-kpi-purple">
          <div className="nts-kpi-top">
            <div className="nts-kpi-icon"><ListTodo size={18} /></div>
            <div className="nts-kpi-meta">
              <span className="nts-kpi-label">Total Assigned</span>
              <span className="nts-kpi-val">{tasks.length} Tasks</span>
            </div>
          </div>
          <span className="nts-kpi-sub">All active &amp; finished</span>
        </div>

        <div className="nts-kpi nts-kpi-amber">
          <div className="nts-kpi-top">
            <div className="nts-kpi-icon"><AlertCircle size={18} /></div>
            <div className="nts-kpi-meta">
              <span className="nts-kpi-label">Pending</span>
              <span className="nts-kpi-val">{pendingCount} Tasks</span>
            </div>
          </div>
          <span className="nts-kpi-sub">Awaiting action</span>
        </div>

        <div className="nts-kpi nts-kpi-blue">
          <div className="nts-kpi-top">
            <div className="nts-kpi-icon"><Clock size={18} /></div>
            <div className="nts-kpi-meta">
              <span className="nts-kpi-label">In Progress</span>
              <span className="nts-kpi-val">{inProgressCount} Tasks</span>
            </div>
          </div>
          <span className="nts-kpi-sub">Under active execution</span>
        </div>

        <div className="nts-kpi nts-kpi-green">
          <div className="nts-kpi-top">
            <div className="nts-kpi-icon"><CheckCircle2 size={18} /></div>
            <div className="nts-kpi-meta">
              <span className="nts-kpi-label">Completed</span>
              <span className="nts-kpi-val">{completedCount} Tasks</span>
            </div>
          </div>
          <span className="nts-kpi-sub">Verified &amp; closed</span>
        </div>
      </section>

      {/* Filter and Action Bar */}
      <section className="nts-filter-bar">
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", flex: 1 }}>
          <div className="nts-tabs-strip">
            {["all", "pending", "in-progress", "completed"].map((st) => (
              <button
                key={st}
                type="button"
                className={`nts-tab-btn ${statusFilter === st ? "active" : ""}`}
                onClick={() => handleStatusFilterChange(st)}
              >
                {st === "all" ? "All" : st === "in-progress" ? "In Progress" : st.charAt(0).toUpperCase() + st.slice(1)}
              </button>
            ))}
          </div>

          <div className="nts-search-box">
            <Search size={14} style={{ color: "var(--nts-muted)" }} />
            <input
              type="text"
              placeholder="Search tasks by title, category..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
          </div>

          <select
            className="nts-action-btn"
            style={{
              backgroundColor: "var(--nts-surface)",
              color: "var(--nts-text)",
              border: "1px solid var(--nts-border)",
              padding: "7px 12px",
              borderRadius: 8,
              fontSize: 12.5,
            }}
            value={priorityFilter}
            onChange={(e) => handlePriorityFilterChange(e.target.value)}
          >
            <option value="all">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        <button
          type="button"
          className="nts-refresh-btn"
          onClick={handleOpenAddModal}
        >
          <Plus size={15} /> Add Task / Reminder
        </button>
      </section>

      {/* Tasks List / Empty State (Screen 8) */}
      <section className="nts-card">
        <div className="nts-card-head">
          <h3>
            <ListTodo size={16} style={{ color: "var(--nts-primary, #5c7c2f)" }} /> Assigned Duties &amp; Work Orders ({filteredTasks.length})
          </h3>
        </div>
        <div className="nts-card-body" style={{ gap: 10 }}>
          {filteredTasks.map((task) => (
            <div key={task.id} className={`nts-task-item ${task.status === "Completed" ? "completed" : ""}`}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="nts-task-title">{task.title}</div>
                {task.description && <div className="nts-task-desc">{task.description}</div>}
                <div className="nts-task-meta">
                  <span className={`nts-pill-priority ${(task.priority || "Medium").toLowerCase()}`}>
                    {task.priority || "Medium"}
                  </span>
                  <span>Category: <strong>{task.category || "General"}</strong></span>
                  <span>Due: <strong>{task.dueDate}</strong></span>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <select
                  className="nts-status-select"
                  value={task.status}
                  onChange={(e) => handleUpdateStatus(task.id, e.target.value)}
                  style={{
                    fontSize: 12,
                    padding: "4px 8px",
                    borderRadius: 6,
                    border: "1px solid var(--nts-border)",
                    background: "var(--nts-surface)",
                    color: "var(--nts-text)",
                  }}
                >
                  <option value="Pending">Pending</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>
            </div>
          ))}

          {filteredTasks.length === 0 && (
            <div style={{ textAlign: "center", padding: 32, color: "var(--nts-muted)" }}>
              <ListTodo size={32} style={{ margin: "0 auto 8px", opacity: 0.4 }} />
              <div>No assigned tasks match your search or filter.</div>
            </div>
          )}
        </div>
      </section>

      {/* Add Task Modal (Screen 6) */}
      {showAddModal && (
        <div className="nts-modal-backdrop">
          <div className="nts-modal-container">
            <div className="nts-modal-head">
              <h3><Plus size={16} /> Create Task / Action Item</h3>
              <button
                type="button"
                className="nts-modal-close"
                onClick={handleCloseAddModal}
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleCreateTask}>
              <div className="nts-modal-body">
                <div className="nts-form-group">
                  <label>Task Title *</label>
                  <input
                    type="text"
                    className="nts-form-control"
                    placeholder="e.g. Courier dispatch to University regional center"
                    value={newTask.title}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    required
                  />
                </div>

                <div className="nts-form-group">
                  <label>Description / Work Details</label>
                  <textarea
                    rows={3}
                    className="nts-form-control"
                    placeholder="Provide specific instructions or details..."
                    value={newTask.description}
                    onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div className="nts-form-group">
                    <label>Department Category</label>
                    <select
                      className="nts-form-control"
                      value={newTask.category}
                      onChange={(e) => setNewTask({ ...newTask, category: e.target.value })}
                    >
                      <option value="Office Administration">Office Administration</option>
                      <option value="Examination Support">Examination Support</option>
                      <option value="Documentation">Documentation &amp; Records</option>
                      <option value="Student Support">Student Support</option>
                      <option value="Facility & Maintenance">Facility &amp; Maintenance</option>
                      <option value="Stores & Inventory">Stores &amp; Inventory</option>
                    </select>
                  </div>
                  <div className="nts-form-group">
                    <label>Priority Level</label>
                    <select
                      className="nts-form-control"
                      value={newTask.priority}
                      onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                    >
                      <option value="Urgent">Urgent</option>
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                  </div>
                </div>

                <div className="nts-form-group">
                  <label>Due Date</label>
                  <input
                    type="date"
                    className="nts-form-control"
                    value={newTask.dueDate}
                    onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="nts-modal-foot">
                <button
                  type="button"
                  className="nts-action-btn"
                  onClick={handleCloseAddModal}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="nts-punch-btn in"
                >
                  <Send size={14} /> Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
