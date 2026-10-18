import React, { useState, useMemo } from "react";
import {
  ListTodo,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  Calendar,
  Tag,
  X,
  Send,
  UserCheck,
} from "lucide-react";
import { nonTeachingService } from "../services/nonTeachingService.js";

export default function NonTeachingTasks() {
  const [tasks, setTasks] = useState(() => nonTeachingService.getTasks());
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    category: "Office Administration",
    priority: "Medium",
    dueDate: new Date(Date.now() + 86400000 * 2).toISOString().split("T")[0],
  });
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (text) => {
    setToastMessage(text);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      const matchStatus =
        statusFilter === "all" ||
        t.status.toLowerCase().replace(/\s+/g, "") === statusFilter.toLowerCase().replace(/\s+/g, "");
      const matchPriority =
        priorityFilter === "all" || t.priority.toLowerCase() === priorityFilter.toLowerCase();
      const matchSearch =
        !searchQuery ||
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.category.toLowerCase().includes(searchQuery.toLowerCase());
      return matchStatus && matchPriority && matchSearch;
    });
  }, [tasks, statusFilter, priorityFilter, searchQuery]);

  const handleUpdateStatus = (taskId, newStatus) => {
    const updated = nonTeachingService.updateTaskStatus(taskId, newStatus);
    setTasks(updated);
    showToast(`Task status updated to ${newStatus}.`);
  };

  const handleCreateTask = (e) => {
    e.preventDefault();
    if (!newTask.title.trim()) {
      showToast("Please provide a task title.");
      return;
    }
    nonTeachingService.addTask(newTask);
    setTasks(nonTeachingService.getTasks());
    setShowAddModal(false);
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
        <div className="cms-toast-banner cms-toast-success" role="alert" style={{ position: "fixed", top: 16, right: 16, zIndex: 9999 }}>
          <CheckCircle2 size={16} /> {toastMessage}
        </div>
      )}

      {/* KPI Counts Strip */}
      <section className="nts-kpi-grid" style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}>
        <div className="nts-kpi nts-kpi-purple">
          <div className="nts-kpi-top">
            <div className="nts-kpi-icon"><ListTodo size={18} /></div>
            <div className="nts-kpi-meta">
              <span className="nts-kpi-label">Total Assigned</span>
              <span className="nts-kpi-val">{tasks.length} Tasks</span>
            </div>
          </div>
          <span className="nts-kpi-sub">All active & finished</span>
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
          <span className="nts-kpi-sub">Verified & closed</span>
        </div>
      </section>

      {/* Filter & Search Bar */}
      <section className="nts-filter-bar">
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div className="nts-tabs-strip">
            {["all", "pending", "inprogress", "completed"].map((tab) => (
              <button
                key={tab}
                type="button"
                className={`nts-tab-btn ${statusFilter === tab ? "active" : ""}`}
                onClick={() => setStatusFilter(tab)}
              >
                {tab === "inprogress" ? "In Progress" : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          <div className="nts-search-box">
            <Search size={14} style={{ color: "var(--nts-muted)" }} />
            <input
              type="text"
              placeholder="Search tasks by title, category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <select
            className="nts-form-control"
            style={{ padding: "6px 10px", fontSize: 12 }}
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
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
          onClick={() => setShowAddModal(true)}
        >
          <Plus size={14} /> Add Task / Reminder
        </button>
      </section>

      {/* Tasks List Card */}
      <section className="nts-card">
        <div className="nts-card-head">
          <h3>
            <ListTodo size={16} style={{ color: "var(--nts-primary)" }} /> Assigned Duties & Work Orders ({filteredTasks.length})
          </h3>
        </div>
        <div className="nts-card-body" style={{ gap: 10 }}>
          {filteredTasks.map((task) => (
            <div key={task.id} className={`nts-task-item ${task.status === "Completed" ? "completed" : ""}`}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                  <span className={`nts-pill-priority ${task.priority.toLowerCase()}`}>
                    {task.priority}
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "var(--nts-muted)" }}>#{task.id}</span>
                  <span style={{ fontSize: 11, color: "var(--nts-muted)" }}>• Category: <strong>{task.category}</strong></span>
                </div>
                <div className="nts-task-title">{task.title}</div>
                <div className="nts-task-desc">{task.description}</div>
                <div className="nts-task-meta">
                  <span>Assigned By: <strong>{task.assignedBy}</strong></span>
                  <span>Assigned: <strong>{task.assignedDate}</strong></span>
                  <span>Due: <strong>{task.dueDate}</strong></span>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
                <select
                  className="nts-form-control"
                  style={{ fontSize: 12, padding: "4px 8px", fontWeight: 700 }}
                  value={task.status}
                  onChange={(e) => handleUpdateStatus(task.id, e.target.value)}
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

      {/* Add Task Modal */}
      {showAddModal && (
        <div className="nts-modal-backdrop">
          <div className="nts-modal-container">
            <div className="nts-modal-head">
              <h3><Plus size={16} /> Create Task / Action Item</h3>
              <button
                type="button"
                className="nts-modal-close"
                onClick={() => setShowAddModal(false)}
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
                      <option value="Documentation">Documentation & Records</option>
                      <option value="Student Support">Student Support</option>
                      <option value="Facility & Maintenance">Facility & Maintenance</option>
                      <option value="Stores & Inventory">Stores & Inventory</option>
                    </select>
                  </div>
                  <div className="nts-form-group">
                    <label>Priority Level</label>
                    <select
                      className="nts-form-control"
                      value={newTask.priority}
                      onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                    >
                      <option value="Urgent">Urgent (Immediate)</option>
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
                  onClick={() => setShowAddModal(false)}
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
