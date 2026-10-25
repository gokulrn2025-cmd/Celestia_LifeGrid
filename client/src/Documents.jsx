import { useState, useMemo } from "react";
import { Plus, Trash2, FileText, X, Search, Download, Upload, AlertCircle, Edit3 } from "lucide-react";
import { useLifeGrid } from "./context/LifeGridContext";
import EmptyState from "./components/EmptyState";

export default function Documents() {
  const { documents, addDocument, updateDocument, deleteDocument } = useLifeGrid();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [formError, setFormError] = useState("");

  const [form, setForm] = useState({
    name: "",
    category: "Academic",
    size: "150 KB",
    fileType: "application/pdf",
    dataUrl: null,
    contentSnippet: "",
  });

  const categories = ["all", "Academic", "Personal", "Financial", "Work", "Other"];

  const filteredDocs = useMemo(() => {
    return documents.filter((doc) => {
      const matchesSearch = (doc.name || "").toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory =
        categoryFilter === "all" ? true : doc.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [documents, searchQuery, categoryFilter]);

  function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedExtensions = /\.(pdf|docx?|txt|png|jpe?g)$/i;
    if (!allowedExtensions.test(file.name)) {
      setFormError("Choose a PDF, Word document, text file, PNG, or JPG.");
      e.target.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setFormError("Files must be 5 MB or smaller.");
      e.target.value = "";
      return;
    }
    setFormError("");

    const sizeInKB = Math.round(file.size / 1024);
    const sizeDisplay = sizeInKB > 1024 ? `${(sizeInKB / 1024).toFixed(1)} MB` : `${sizeInKB} KB`;

    // Read preview/dataUrl
    const reader = new FileReader();
    reader.onload = () => {
      setForm((prev) => ({
        ...prev,
        name: prev.name || file.name,
        size: sizeDisplay,
        fileType: file.type || "application/octet-stream",
        dataUrl: reader.result,
        contentSnippet: `File: ${file.name} (${sizeDisplay}) uploaded on ${new Date().toLocaleDateString()}`,
      }));
    };
    reader.readAsDataURL(file);
  }

  function handleOpenAdd() {
    setEditingId(null);
    setForm({
      name: "",
      category: "Academic",
      size: "150 KB",
      fileType: "application/pdf",
      dataUrl: null,
      contentSnippet: "",
    });
    setFormError("");
    setShowForm(true);
  }

  function handleOpenEdit(doc) {
    setEditingId(doc.id);
    setForm({ name: doc.name, category: doc.category || "Academic", size: doc.size || "", fileType: doc.fileType || "application/octet-stream", dataUrl: doc.dataUrl || null, contentSnippet: doc.contentSnippet || "" });
    setFormError("");
    setShowForm(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) {
      setFormError("Please enter a document name or attach a file.");
      return;
    }

    try {
      const data = {
        name: form.name.trim(),
        category: form.category,
        size: form.size,
        fileType: form.fileType,
        dataUrl: form.dataUrl,
        contentSnippet: form.contentSnippet || `${form.name} document record`,
      };
      if (editingId) await updateDocument(editingId, data);
      else await addDocument(data);
    } catch (err) {
      setFormError(err.message || "Could not save this document. Please try again.");
      return;
    }

    setShowForm(false);
    setFormError("");
  }

  function handleDownload(doc) {
    if (!doc.dataUrl) return;
    const a = document.createElement("a");
    a.href = doc.dataUrl;
    a.download = doc.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  return (
    <div className="module-page">
      <div className="module-header">
        <div>
          <h2>Documents</h2>
          <p>Organise study material, certificates, and critical personal files.</p>
        </div>

        <button className="add-button" onClick={handleOpenAdd}>
          <Plus size={18} />
          Add Document
        </button>
      </div>

      {/* FILTER & SEARCH */}
      <div className="filter-bar">
        <div className="search-input-wrapper">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Search documents by name..."
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
          {categories.map((cat) => (
            <button
              key={cat}
              className={`filter-pill ${categoryFilter === cat ? "active" : ""}`}
              onClick={() => setCategoryFilter(cat)}
            >
              {cat === "all" ? "All Documents" : cat}
            </button>
          ))}
        </div>
      </div>

      {/* FORM */}
      {showForm && (
        <form className="module-form" onSubmit={handleSubmit}>
          <div className="form-header">
            <h3>{editingId ? "Edit Document" : "Add Document"}</h3>
            <button
              type="button"
              className="close-button"
              onClick={() => setShowForm(false)}
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

          {/* DRAG / UPLOAD DROPZONE */}
          <div className="upload-dropzone">
            <input
              type="file"
              id="file-upload-input"
              className="file-hidden-input"
              accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
              onChange={handleFileSelect}
            />
            <label htmlFor="file-upload-input" className="upload-dropzone-label">
              <Upload size={24} />
              <strong>{form.dataUrl ? "Choose a different file" : "Attach a file (optional)"}</strong>
              <span>PDF, DOC, DOCX, TXT, PNG, or JPG · up to 5 MB</span>
            </label>
          </div>

          <div className="form-row">
            <div className="form-group" style={{ flex: 2 }}>
              <label>Document Name *</label>
              <input
                type="text"
                placeholder="e.g., DBMS Assignment 2.pdf"
                value={form.name}
                onChange={(e) => {
                  setForm({ ...form, name: e.target.value });
                  if (formError) setFormError("");
                }}
              />
            </div>

            <div className="form-group" style={{ flex: 1 }}>
              <label>Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                <option value="Academic">Academic</option>
                <option value="Personal">Personal</option>
                <option value="Financial">Financial</option>
                <option value="Work">Work</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={() => setShowForm(false)}
            >
              Cancel
            </button>
            <button type="submit" className="save-task">
              {editingId ? "Update Document" : "Save Document"}
            </button>
          </div>
        </form>
      )}

      {/* DOCUMENT LIST OR EMPTY STATE */}
      {filteredDocs.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={searchQuery || categoryFilter !== "all" ? "No matching documents found" : "No documents stored yet"}
          message={
            searchQuery || categoryFilter !== "all"
              ? "Try resetting the search bar or category filter."
              : "Add a document record or attach a small file to keep it with your organiser."
          }
          actionText={!searchQuery && categoryFilter === "all" ? "+ Add First Document" : null}
          onAction={handleOpenAdd}
        />
      ) : (
        <div className="document-list">
          {filteredDocs.map((document) => (
            <div className="document-card" key={document.id}>
              <div className="document-icon">
                <FileText size={22} />
              </div>

              <div className="document-info">
                <div className="document-title-row">
                  <strong>{document.name}</strong>
                  <span className="category-tag lavender">{document.category || "Academic"}</span>
                </div>
                <div className="doc-meta-row">
                  <span>{document.dataUrl ? `File attached · ${document.size}` : "Document record · no file attached"}</span>
                  <span>•</span>
                  <span>Uploaded: {document.uploadedAt || "Recent"}</span>
                </div>
              </div>

              <div className="document-actions">
                {document.dataUrl && <button
                  type="button"
                  className="icon-button"
                  onClick={() => handleDownload(document)}
                  title="Download / View document"
                >
                  <Download size={17} />
                </button>}

                <button type="button" className="icon-button" onClick={() => handleOpenEdit(document)} title="Edit document record">
                  <Edit3 size={17} />
                </button>

                <button
                  type="button"
                  className="icon-button delete-icon"
                  onClick={() => deleteDocument(document.id)}
                  title="Delete document"
                >
                  <Trash2 size={17} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
