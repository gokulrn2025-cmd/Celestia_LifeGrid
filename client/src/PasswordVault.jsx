import { useState, useMemo } from "react";
import { Plus, Trash2, Eye, EyeOff, X, Copy, Check, Key, Shield, Search, Edit3, AlertCircle } from "lucide-react";
import { useLifeGrid } from "./context/LifeGridContext";
import EmptyState from "./components/EmptyState";

export default function PasswordVault() {
  const { passwords, addPassword, updatePassword, deletePassword } = useLifeGrid();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [visible, setVisible] = useState({});
  const [copiedId, setCopiedId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [formError, setFormError] = useState("");

  const [form, setForm] = useState({
    service: "",
    username: "",
    password: "",
    category: "Development",
  });

  const filteredPasswords = useMemo(() => {
    return passwords.filter((item) => {
      const q = searchQuery.toLowerCase();
      return (
        (item.service || "").toLowerCase().includes(q) ||
        (item.username || "").toLowerCase().includes(q)
      );
    });
  }, [passwords, searchQuery]);

  function generateSecurePassword() {
    const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%^&*()_+~";
    let pwd = "";
    for (let i = 0; i < 16; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setForm((prev) => ({ ...prev, password: pwd }));
    if (formError) setFormError("");
  }

  function handleOpenAdd() {
    setEditingId(null);
    setForm({
      service: "",
      username: "",
      password: "",
      category: "Development",
    });
    setFormError("");
    setShowForm(true);
  }

  function handleOpenEdit(cred) {
    setEditingId(cred.id);
    setForm({
      service: cred.service,
      username: cred.username,
      password: cred.password,
      category: cred.category || "General",
    });
    setFormError("");
    setShowForm(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.service.trim() || !form.username.trim() || !form.password.trim()) {
      setFormError("All fields (Service, Username, and Password) are required.");
      return;
    }

    try {
      if (editingId) {
        await updatePassword(editingId, { service: form.service.trim(), username: form.username.trim(), password: form.password.trim(), category: form.category });
      } else {
        await addPassword({ service: form.service.trim(), username: form.username.trim(), password: form.password.trim(), category: form.category });
      }
    } catch (err) {
      setFormError(err.message || "Could not save this vault entry. Please try again.");
      return;
    }

    setShowForm(false);
    setEditingId(null);
    setFormError("");
  }

  function toggleVisible(id) {
    setVisible((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  async function handleCopyPassword(id, passwordText) {
    try {
      await navigator.clipboard.writeText(passwordText);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Fallback
      const ta = document.createElement("textarea");
      ta.value = passwordText;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  }

  function getStrengthLabel(pwd) {
    if (!pwd || pwd.length < 8) return { label: "Weak", colorClass: "strength-weak" };
    if (pwd.length < 12) return { label: "Good", colorClass: "strength-good" };
    return { label: "Strong", colorClass: "strength-strong" };
  }

  return (
    <div className="module-page">
      <div className="module-header">
        <div>
          <h2>Password Vault</h2>
          <p>Store encrypted student accounts, API tokens, and credentials securely.</p>
        </div>

        <button className="add-button" onClick={handleOpenAdd}>
          <Plus size={18} />
          Add Credential
        </button>
      </div>

      <div className="vault-banner">
        <Shield size={18} />
        <div>
          <strong>AES Client-Storage & Local Protection</strong>
          <p>Credentials are kept private within your LifeGrid secure workspace.</p>
        </div>
      </div>

      {/* FILTER & SEARCH */}
      <div className="filter-bar">
        <div className="search-input-wrapper">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Search credentials by service or username..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="clear-search" onClick={() => setSearchQuery("")}>
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* FORM */}
      {showForm && (
        <form className="module-form" onSubmit={handleSubmit}>
          <div className="form-header">
            <h3>{editingId ? "Edit Credential" : "New Credential"}</h3>
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
            <div className="form-group" style={{ flex: 1.5 }}>
              <label>Service / Site Name *</label>
              <input
                type="text"
                placeholder="e.g., GitHub, VIT Portal, Google"
                value={form.service}
                onChange={(e) => {
                  setForm({ ...form, service: e.target.value });
                  if (formError) setFormError("");
                }}
                autoFocus
              />
            </div>

            <div className="form-group" style={{ flex: 1 }}>
              <label>Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                <option value="Development">Development</option>
                <option value="Academic">Academic</option>
                <option value="Social">Social</option>
                <option value="Finance">Finance</option>
                <option value="General">General</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Username / Email *</label>
            <input
              type="text"
              placeholder="e.g., student@vitstudent.ac.in"
              value={form.username}
              onChange={(e) => {
                setForm({ ...form, username: e.target.value });
                if (formError) setFormError("");
              }}
            />
          </div>

          <div className="form-group">
            <div className="label-with-action">
              <label>Password *</label>
              <button
                type="button"
                className="generator-action-link"
                onClick={generateSecurePassword}
              >
                <Key size={14} /> Generate 16-Char Password
              </button>
            </div>

            <input
              type="text"
              placeholder="Enter or generate password..."
              value={form.password}
              onChange={(e) => {
                setForm({ ...form, password: e.target.value });
                if (formError) setFormError("");
              }}
            />

            {form.password && (
              <div className="strength-bar-row">
                <span className="strength-indicator-label">Strength:</span>
                <span className={`strength-badge ${getStrengthLabel(form.password).colorClass}`}>
                  {getStrengthLabel(form.password).label}
                </span>
              </div>
            )}
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
              {editingId ? "Update Credential" : "Save Credential"}
            </button>
          </div>
        </form>
      )}

      {/* VAULT LIST OR EMPTY STATE */}
      {filteredPasswords.length === 0 ? (
        <EmptyState
          icon={Key}
          title={searchQuery ? "No credentials match your search" : "Vault is empty"}
          message={
            searchQuery
              ? "Check spelling or clear the search query."
              : "Store your passwords and developer tokens with quick 1-click clipboard copy."
          }
          actionText={!searchQuery ? "+ Add First Credential" : null}
          onAction={handleOpenAdd}
        />
      ) : (
        <div className="vault-list">
          {filteredPasswords.map((item) => {
            const isShown = visible[item.id];
            const isCopied = copiedId === item.id;
            const strength = getStrengthLabel(item.password);

            return (
              <div className="vault-card" key={item.id}>
                <div className="vault-avatar">
                  {(item.service || "P").charAt(0).toUpperCase()}
                </div>

                <div className="vault-info">
                  <div className="vault-title-row">
                    <strong>{item.service}</strong>
                    <span className="category-tag lavender">{item.category || "General"}</span>
                    <span className={`strength-badge ${strength.colorClass}`}>
                      {strength.label}
                    </span>
                  </div>

                  <span className="vault-username">{item.username}</span>

                  <div className="password-display-row">
                    <span className="password-mono">
                      {isShown ? item.password : "••••••••••••••••"}
                    </span>
                  </div>
                </div>

                <div className="vault-actions">
                  <button
                    type="button"
                    className={`icon-button ${isCopied ? "copied-btn" : ""}`}
                    onClick={() => handleCopyPassword(item.id, item.password)}
                    title="Copy password to clipboard"
                  >
                    {isCopied ? <Check size={16} /> : <Copy size={16} />}
                  </button>

                  <button
                    type="button"
                    className="icon-button"
                    onClick={() => toggleVisible(item.id)}
                    title={isShown ? "Hide password" : "Show password"}
                  >
                    {isShown ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>

                  <button
                    type="button"
                    className="icon-button"
                    onClick={() => handleOpenEdit(item)}
                    title="Edit credential"
                  >
                    <Edit3 size={16} />
                  </button>

                  <button
                    type="button"
                    className="icon-button delete-icon"
                    onClick={() => deletePassword(item.id)}
                    title="Delete credential"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
