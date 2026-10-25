import { useState, useMemo } from "react";
import { Plus, Trash2, Check, X, Edit3, Search, Receipt, AlertCircle, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useLifeGrid } from "./context/LifeGridContext";
import EmptyState from "./components/EmptyState";

export default function Bills() {
  const { bills, addBill, updateBill, toggleBillPaid, deleteBill } = useLifeGrid();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // 'all', 'pending', 'paid', 'overdue'
  const [formError, setFormError] = useState("");

  const [form, setForm] = useState({
    name: "",
    amount: "",
    dueDate: "",
    category: "Utilities",
  });

  const todayStr = new Date().toISOString().split("T")[0];

  // Financial Summaries
  const summaries = useMemo(() => {
    let pendingSum = 0;
    let paidSum = 0;
    let overdueCount = 0;

    bills.forEach((b) => {
      const amt = Number(b.amount || 0);
      if (b.paid) {
        paidSum += amt;
      } else {
        pendingSum += amt;
        if (b.dueDate && b.dueDate !== "No date" && b.dueDate < todayStr) {
          overdueCount++;
        }
      }
    });

    return { pendingSum, paidSum, overdueCount };
  }, [bills, todayStr]);

  const filteredBills = useMemo(() => {
    return bills.filter((b) => {
      const matchesSearch = (b.name || "").toLowerCase().includes(searchQuery.toLowerCase());
      let matchesStatus = true;
      if (statusFilter === "pending") matchesStatus = !b.paid;
      else if (statusFilter === "paid") matchesStatus = b.paid;
      else if (statusFilter === "overdue") {
        matchesStatus = !b.paid && b.dueDate && b.dueDate !== "No date" && b.dueDate < todayStr;
      }

      return matchesSearch && matchesStatus;
    });
  }, [bills, searchQuery, statusFilter, todayStr]);

  function handleOpenAdd() {
    setEditingId(null);
    setForm({
      name: "",
      amount: "",
      dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      category: "Utilities",
    });
    setFormError("");
    setShowForm(true);
  }

  function handleOpenEdit(bill) {
    setEditingId(bill.id);
    setForm({
      name: bill.name,
      amount: bill.amount,
      dueDate: bill.dueDate && bill.dueDate !== "No date" ? bill.dueDate : "",
      category: bill.category || "Utilities",
    });
    setFormError("");
    setShowForm(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) {
      setFormError("Bill name is required.");
      return;
    }
    const amt = Number(form.amount);
    if (isNaN(amt) || amt <= 0) {
      setFormError("Please enter a valid positive amount.");
      return;
    }

    try {
      if (editingId) {
        await updateBill(editingId, { name: form.name.trim(), amount: amt, dueDate: form.dueDate || "No date", category: form.category });
      } else {
        await addBill({ name: form.name.trim(), amount: amt, dueDate: form.dueDate || "No date", category: form.category });
      }
    } catch (err) {
      setFormError(err.message || "Could not save this bill. Please try again.");
      return;
    }

    setEditingId(null);
    setShowForm(false);
    setFormError("");
  }

  return (
    <div className="module-page">
      <div className="module-header">
        <div>
          <h2>Bills & Payments</h2>
          <p>Track recurring utilities, subscriptions, and payment deadlines.</p>
        </div>

        <motion.button
          className="add-button"
          onClick={handleOpenAdd}
          whileHover={{ y: -1 }}
          whileTap={{ scale: 0.97 }}
        >
          <Plus size={18} />
          Add Bill
        </motion.button>
      </div>

      {/* SUMMARY BANNER */}
      <motion.div
        className="module-stats-row"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="module-stat-pill">
          <span>Pending Due</span>
          <strong>₹{summaries.pendingSum.toLocaleString("en-IN")}</strong>
        </div>
        <div className="module-stat-pill paid-pill">
          <span>Total Settled</span>
          <strong>₹{summaries.paidSum.toLocaleString("en-IN")}</strong>
        </div>
        {summaries.overdueCount > 0 && (
          <div className="module-stat-pill overdue-pill">
            <AlertTriangle size={15} />
            <span>{summaries.overdueCount} Overdue</span>
          </div>
        )}
      </motion.div>

      {/* FILTER & SEARCH */}
      <div className="filter-bar">
        <div className="search-input-wrapper">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Search bills..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="clear-search" onClick={() => setSearchQuery("")}>
              <X size={14} />
            </button>
          )}
        </div>

        <div className="pill-selector">
          {[
            { id: "all", label: "All Bills" },
            { id: "pending", label: "Pending" },
            { id: "paid", label: "Paid" },
            { id: "overdue", label: "Overdue" },
          ].map((st) => (
            <motion.button
              key={st.id}
              className={`filter-pill ${statusFilter === st.id ? "active" : ""}`}
              onClick={() => setStatusFilter(st.id)}
              whileTap={{ scale: 0.95 }}
            >
              {st.label}
            </motion.button>
          ))}
        </div>
      </div>

      {/* FORM */}
      <AnimatePresence>
        {showForm && (
          <motion.form
            className="module-form"
            onSubmit={handleSubmit}
            initial={{ opacity: 0, height: 0, scale: 0.98 }}
            animate={{ opacity: 1, height: "auto", scale: 1 }}
            exit={{ opacity: 0, height: 0, scale: 0.98 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
          >
            <div className="form-header">
              <h3>{editingId ? "Edit Bill" : "New Bill"}</h3>
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

            <div className="form-row">
              <div className="form-group" style={{ flex: 2 }}>
                <label>Bill Name *</label>
                <input
                  type="text"
                  placeholder="e.g., Electricity Bill"
                  value={form.name}
                  onChange={(e) => {
                    setForm({ ...form, name: e.target.value });
                    if (formError) setFormError("");
                  }}
                  autoFocus
                />
              </div>

              <div className="form-group" style={{ flex: 1 }}>
                <label>Amount (₹) *</label>
                <input
                  type="number"
                  placeholder="1450"
                  value={form.amount}
                  onChange={(e) => {
                    setForm({ ...form, amount: e.target.value });
                    if (formError) setFormError("");
                  }}
                />
              </div>
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
                <label>Category</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                >
                  <option value="Utilities">Utilities</option>
                  <option value="Internet">Internet & Telecom</option>
                  <option value="Rent">Rent & Housing</option>
                  <option value="Education">Education & Fees</option>
                  <option value="Other">Other</option>
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
                {editingId ? "Update Bill" : "Save Bill"}
              </motion.button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* BILL LIST OR EMPTY STATE */}
      {filteredBills.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title={searchQuery || statusFilter !== "all" ? "No bills match your current filters" : "No bills recorded"}
          message={
            searchQuery || statusFilter !== "all"
              ? "Try resetting the search bar or changing status filter."
              : "Keep track of electricity, wifi, and rent so you never miss a deadline."
          }
          actionText={!searchQuery && statusFilter === "all" ? "+ Add First Bill" : null}
          onAction={handleOpenAdd}
        />
      ) : (
        <motion.div className="bill-list" layout>
          <AnimatePresence>
            {filteredBills.map((bill) => {
              const isOverdue = !bill.paid && bill.dueDate && bill.dueDate !== "No date" && bill.dueDate < todayStr;

              return (
                <motion.div
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className={`bill-card ${bill.paid ? "bill-card-paid" : ""}`}
                  key={bill.id}
                >
                  <div className={`bill-icon ${bill.paid ? "paid-icon" : isOverdue ? "overdue-icon" : ""}`}>
                    ₹
                  </div>

                  <div className="bill-info">
                    <div className="bill-title-row">
                      <strong>{bill.name}</strong>
                      {bill.category && <span className="category-tag">{bill.category}</span>}
                    </div>
                    <span>
                      Due: {bill.dueDate || "No date"}{" "}
                      {isOverdue && <span className="overdue-tag">Overdue</span>}
                    </span>
                  </div>

                  <strong className="bill-amount">
                    ₹{Number(bill.amount || 0).toLocaleString("en-IN")}
                  </strong>

                  <span className={`bill-status ${bill.paid ? "paid" : "pending"}`}>
                    {bill.paid ? "Paid" : "Pending"}
                  </span>

                  <div className="bill-actions">
                    <motion.button
                      type="button"
                      className={`icon-button ${bill.paid ? "active-check" : ""}`}
                      onClick={() => toggleBillPaid(bill.id)}
                      title={bill.paid ? "Mark as pending" : "Mark as paid"}
                      whileTap={{ scale: 0.8 }}
                    >
                      <Check size={16} />
                    </motion.button>

                    <motion.button
                      type="button"
                      className="icon-button"
                      onClick={() => handleOpenEdit(bill)}
                      title="Edit bill"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <Edit3 size={16} />
                    </motion.button>

                    <motion.button
                      type="button"
                      className="icon-button delete-icon"
                      onClick={() => deleteBill(bill.id)}
                      title="Delete bill"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <Trash2 size={16} />
                    </motion.button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}
