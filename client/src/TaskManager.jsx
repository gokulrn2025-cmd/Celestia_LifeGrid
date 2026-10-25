import { useState, useMemo } from "react";
import { Plus, Check, Trash2, X, Edit3, Search, Filter, AlertCircle, CheckSquare } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useLifeGrid } from "./context/LifeGridContext";
import EmptyState from "./components/EmptyState";

export default function TaskManager() {
  const { tasks, addTask, updateTask, toggleTask, deleteTask } = useLifeGrid();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // 'all', 'active', 'completed'
  const [priorityFilter, setPriorityFilter] = useState("all"); // 'all', 'High', 'Medium', 'Low'
  const [formError, setFormError] = useState("");

  const [form, setForm] = useState({
    title: "",
    dueDate: "",
    priority: "Medium",
    category: "Academic",
  });

  const completedCount = useMemo(() => tasks.filter((t) => t.completed).length, [tasks]);
  const totalCount = tasks.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchesSearch = (task.title || "").toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus =
        statusFilter === "all"
          ? true
          : statusFilter === "completed"
          ? task.completed
          : !task.completed;
      const matchesPriority =
        priorityFilter === "all" ? true : task.priority === priorityFilter;

      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [tasks, searchQuery, statusFilter, priorityFilter]);

  function handleOpenAdd() {
    setEditingId(null);
    setForm({
      title: "",
      dueDate: new Date().toISOString().split("T")[0],
      priority: "Medium",
      category: "Academic",
    });
    setFormError("");
    setShowForm(true);
  }

  function handleOpenEdit(task) {
    setEditingId(task.id);
    setForm({
      title: task.title,
      dueDate: task.dueDate && task.dueDate !== "No date" ? task.dueDate : "",
      priority: task.priority || "Medium",
      category: task.category || "Academic",
    });
    setFormError("");
    setShowForm(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim()) {
      setFormError("Task title cannot be blank.");
      return;
    }

    try {
      if (editingId) {
        await updateTask(editingId, { title: form.title.trim(), dueDate: form.dueDate || "No date", priority: form.priority, category: form.category });
      } else {
        await addTask({ title: form.title.trim(), dueDate: form.dueDate || "No date", priority: form.priority, category: form.category });
      }
    } catch (err) {
      setFormError(err.message || "Could not save this task. Please try again.");
      return;
    }

    setShowForm(false);
    setEditingId(null);
    setFormError("");
  }

  return (
    <div className="task-manager">
      <div className="task-page-header">
        <div>
          <h2>Tasks</h2>
          <p>Organise daily priorities and deadlines.</p>
        </div>

        <motion.button
          className="add-button"
          onClick={handleOpenAdd}
          whileHover={{ y: -1 }}
          whileTap={{ scale: 0.97 }}
        >
          <Plus size={18} />
          New Task
        </motion.button>
      </div>

      {/* ANIMATED PROGRESS BAR */}
      <motion.div
        className="task-progress-card"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="task-progress-label">
          <span>Task Completion Rate</span>
          <strong>{completedCount} of {totalCount} completed ({progressPercent}%)</strong>
        </div>
        <div className="task-progress-track">
          <motion.div
            className="task-progress-fill"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        </div>
      </motion.div>

      {/* SEARCH & FILTERS BAR */}
      <div className="filter-bar">
        <div className="search-input-wrapper">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="clear-search" onClick={() => setSearchQuery("")}>
              <X size={14} />
            </button>
          )}
        </div>

        <div className="filter-group">
          <span className="filter-label">
            <Filter size={15} /> Status:
          </span>
          <div className="pill-selector">
            {["all", "active", "completed"].map((st) => (
              <motion.button
                key={st}
                className={`filter-pill ${statusFilter === st ? "active" : ""}`}
                onClick={() => setStatusFilter(st)}
                whileTap={{ scale: 0.95 }}
              >
                {st.charAt(0).toUpperCase() + st.slice(1)}
              </motion.button>
            ))}
          </div>

          <div className="pill-selector">
            {["all", "High", "Medium", "Low"].map((pr) => (
              <motion.button
                key={pr}
                className={`filter-pill ${priorityFilter === pr ? "active" : ""}`}
                onClick={() => setPriorityFilter(pr)}
                whileTap={{ scale: 0.95 }}
              >
                {pr === "all" ? "All Priorities" : pr}
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      {/* ANIMATED FORM MODAL / PANEL */}
      <AnimatePresence>
        {showForm && (
          <motion.form
            className="task-form"
            onSubmit={handleSubmit}
            initial={{ opacity: 0, height: 0, scale: 0.98 }}
            animate={{ opacity: 1, height: "auto", scale: 1 }}
            exit={{ opacity: 0, height: 0, scale: 0.98 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
          >
            <div className="form-header">
              <h3>{editingId ? "Edit Task" : "New Task"}</h3>
              <button
                type="button"
                className="close-button"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                }}
              >
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div className="form-error-banner">
                <AlertCircle size={16} />
                <span>{formError}</span>
              </div>
            )}

            <div className="form-group">
              <label>Title *</label>
              <input
                type="text"
                placeholder="e.g., Complete project review"
                value={form.title}
                onChange={(e) => {
                  setForm({ ...form, title: e.target.value });
                  if (formError) setFormError("");
                }}
                autoFocus
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Due Date</label>
                <input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Priority</label>
                <select
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value })}
                >
                  <option value="High">High Priority</option>
                  <option value="Medium">Medium Priority</option>
                  <option value="Low">Low Priority</option>
                </select>
              </div>

              <div className="form-group">
                <label>Category</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                >
                  <option value="Academic">Academic</option>
                  <option value="Personal">Personal</option>
                  <option value="Work">Work</option>
                  <option value="General">General</option>
                </select>
              </div>
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                }}
              >
                Cancel
              </button>
              <motion.button
                type="submit"
                className="save-task"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {editingId ? "Update Task" : "Save Task"}
              </motion.button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* TASK LIST OR EMPTY STATE */}
      {filteredTasks.length === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title={searchQuery || statusFilter !== "all" || priorityFilter !== "all" ? "No matching tasks found" : "No tasks added yet"}
          message={
            searchQuery || statusFilter !== "all" || priorityFilter !== "all"
              ? "Try adjusting your search query or status filter."
              : "Keep your daily schedule organised. Create your first task now."
          }
          actionText={!searchQuery && statusFilter === "all" ? "+ Add Your First Task" : null}
          onAction={handleOpenAdd}
        />
      ) : (
        <motion.div className="task-manager-list" layout>
          <AnimatePresence>
            {filteredTasks.map((task) => (
              <motion.div
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className={`task-card ${task.completed ? "task-done" : ""}`}
                key={task.id}
              >
                <motion.button
                  type="button"
                  className={`task-circle ${task.completed ? "task-circle-done" : ""}`}
                  onClick={() => toggleTask(task.id)}
                  title={task.completed ? "Mark incomplete" : "Mark complete"}
                  whileTap={{ scale: 0.8 }}
                >
                  {task.completed && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 500, damping: 25 }}
                    >
                      <Check size={14} />
                    </motion.div>
                  )}
                </motion.button>

                <div className="task-card-info">
                  <strong>{task.title}</strong>
                  <div className="task-meta-line">
                    <span>Due: {task.dueDate || "No date"}</span>
                    {task.category && <span className="category-tag">{task.category}</span>}
                  </div>
                </div>

                <span className={`task-priority ${(task.priority || "medium").toLowerCase()}`}>
                  {task.priority || "Medium"}
                </span>

                <div className="task-card-actions">
                  <motion.button
                    type="button"
                    className="icon-button"
                    onClick={() => handleOpenEdit(task)}
                    title="Edit task"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <Edit3 size={16} />
                  </motion.button>

                  <motion.button
                    type="button"
                    className="delete-task"
                    onClick={() => deleteTask(task.id)}
                    title="Delete task"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <Trash2 size={16} />
                  </motion.button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}
