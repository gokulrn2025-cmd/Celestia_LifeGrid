import { useState, useMemo } from "react";
import { Plus, Trash2, X, Edit3, Search, CreditCard, AlertCircle } from "lucide-react";
import { useLifeGrid } from "./context/LifeGridContext";
import EmptyState from "./components/EmptyState";

export default function Subscriptions() {
  const {
    subscriptions,
    addSubscription,
    updateSubscription,
    toggleSubscription,
    deleteSubscription,
  } = useLifeGrid();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // 'all', 'active', 'inactive'
  const [formError, setFormError] = useState("");

  const [form, setForm] = useState({
    name: "",
    amount: "",
    billingCycle: "Monthly",
    renewal: "",
    category: "Entertainment",
  });

  const metrics = useMemo(() => {
    const active = subscriptions.filter((s) => s.active);
    const monthlyTotal = active.reduce((acc, curr) => {
      const amt = Number(curr.amount || 0);
      return acc + (curr.billingCycle === "Yearly" ? Math.round(amt / 12) : amt);
    }, 0);

    return {
      activeCount: active.length,
      monthlyTotal,
      annualTotal: monthlyTotal * 12,
    };
  }, [subscriptions]);

  const filteredSubs = useMemo(() => {
    return subscriptions.filter((sub) => {
      const matchesSearch = (sub.name || "").toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus =
        statusFilter === "all"
          ? true
          : statusFilter === "active"
          ? sub.active
          : !sub.active;
      return matchesSearch && matchesStatus;
    });
  }, [subscriptions, searchQuery, statusFilter]);

  function handleOpenAdd() {
    setEditingId(null);
    setForm({
      name: "",
      amount: "",
      billingCycle: "Monthly",
      renewal: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      category: "Entertainment",
    });
    setFormError("");
    setShowForm(true);
  }

  function handleOpenEdit(sub) {
    setEditingId(sub.id);
    setForm({
      name: sub.name,
      amount: sub.amount,
      billingCycle: sub.billingCycle || "Monthly",
      renewal: sub.renewal && sub.renewal !== "No date" ? sub.renewal : "",
      category: sub.category || "Entertainment",
    });
    setFormError("");
    setShowForm(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) {
      setFormError("Subscription name is required.");
      return;
    }
    const amt = Number(form.amount);
    if (isNaN(amt) || amt <= 0) {
      setFormError("Please enter a valid amount.");
      return;
    }

    try {
      if (editingId) {
        await updateSubscription(editingId, { name: form.name.trim(), amount: amt, billingCycle: form.billingCycle, renewal: form.renewal || "No date", category: form.category });
      } else {
        await addSubscription({ name: form.name.trim(), amount: amt, billingCycle: form.billingCycle, renewal: form.renewal || "No date", category: form.category });
      }
    } catch (err) {
      setFormError(err.message || "Could not save this subscription. Please try again.");
      return;
    }

    setShowForm(false);
    setEditingId(null);
    setFormError("");
  }

  return (
    <div className="module-page">
      <div className="module-header">
        <div>
          <h2>Subscriptions</h2>
          <p>Monitor recurring SaaS memberships, software licenses, and entertainment.</p>
        </div>

        <button className="add-button" onClick={handleOpenAdd}>
          <Plus size={18} />
          Add Subscription
        </button>
      </div>

      {/* METRIC PILLS */}
      <div className="module-stats-row">
        <div className="module-stat-pill lime-pill">
          <span>Active Subscriptions</span>
          <strong>{metrics.activeCount} services</strong>
        </div>
        <div className="module-stat-pill">
          <span>Monthly Spend</span>
          <strong>₹{metrics.monthlyTotal.toLocaleString("en-IN")}/mo</strong>
        </div>
        <div className="module-stat-pill lavender-pill">
          <span>Projected Annual</span>
          <strong>₹{metrics.annualTotal.toLocaleString("en-IN")}/yr</strong>
        </div>
      </div>

      {/* FILTER & SEARCH */}
      <div className="filter-bar">
        <div className="search-input-wrapper">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Search subscriptions..."
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
            { id: "all", label: "All" },
            { id: "active", label: "Active" },
            { id: "inactive", label: "Inactive" },
          ].map((st) => (
            <button
              key={st.id}
              className={`filter-pill ${statusFilter === st.id ? "active" : ""}`}
              onClick={() => setStatusFilter(st.id)}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* FORM */}
      {showForm && (
        <form className="module-form" onSubmit={handleSubmit}>
          <div className="form-header">
            <h3>{editingId ? "Edit Subscription" : "New Subscription"}</h3>
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
              <label>Service Name *</label>
              <input
                type="text"
                placeholder="e.g., Spotify, Netflix, GitHub Copilot"
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
                placeholder="119"
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
              <label>Billing Cycle</label>
              <select
                value={form.billingCycle}
                onChange={(e) => setForm({ ...form, billingCycle: e.target.value })}
              >
                <option value="Monthly">Monthly</option>
                <option value="Yearly">Yearly</option>
              </select>
            </div>

            <div className="form-group">
              <label>Next Renewal Date</label>
              <input
                type="date"
                value={form.renewal}
                onChange={(e) => setForm({ ...form, renewal: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                <option value="Entertainment">Entertainment</option>
                <option value="Tools">Developer Tools</option>
                <option value="Productivity">Productivity</option>
                <option value="Health">Health & Fitness</option>
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
            <button type="submit" className="save-task">
              {editingId ? "Update Subscription" : "Save Subscription"}
            </button>
          </div>
        </form>
      )}

      {/* SUBSCRIPTION GRID OR EMPTY STATE */}
      {filteredSubs.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title={searchQuery || statusFilter !== "all" ? "No subscriptions matched your filters" : "No subscriptions added"}
          message={
            searchQuery || statusFilter !== "all"
              ? "Try clearing your search terms or filter."
              : "Track software subscriptions and streaming plans to manage recurring burn."
          }
          actionText={!searchQuery && statusFilter === "all" ? "+ Add First Subscription" : null}
          onAction={handleOpenAdd}
        />
      ) : (
        <div className="subscription-grid">
          {filteredSubs.map((sub) => (
            <div className={`subscription-card ${!sub.active ? "sub-inactive" : ""}`} key={sub.id}>
              <div className="subscription-top">
                <div className="subscription-logo">
                  {(sub.name || "S").charAt(0).toUpperCase()}
                </div>

                <div className="sub-top-badges">
                  {sub.category && <span className="category-tag">{sub.category}</span>}
                  <span
                    className={`subscription-status ${
                      sub.active ? "active" : "inactive"
                    }`}
                  >
                    {sub.active ? "Active" : "Paused"}
                  </span>
                </div>
              </div>

              <h3>{sub.name}</h3>

              <strong>
                ₹{Number(sub.amount || 0).toLocaleString("en-IN")}
                <small> / {sub.billingCycle === "Yearly" ? "yr" : "mo"}</small>
              </strong>

              <p>Renews: {sub.renewal || "No date set"}</p>

              <div className="subscription-actions">
                <button
                  type="button"
                  className={`neo-toggle-btn ${sub.active ? "btn-active" : ""}`}
                  onClick={() => toggleSubscription(sub.id)}
                >
                  {sub.active ? "Deactivate" : "Activate"}
                </button>

                <button
                  type="button"
                  className="icon-button"
                  onClick={() => handleOpenEdit(sub)}
                  title="Edit subscription"
                >
                  <Edit3 size={16} />
                </button>

                <button
                  type="button"
                  className="icon-button delete-icon"
                  onClick={() => deleteSubscription(sub.id)}
                  title="Delete subscription"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
