import { useState, useMemo } from "react";
import { Plus, Trash2, X, Edit3, Search, StickyNote, AlertCircle } from "lucide-react";
import { useLifeGrid } from "./context/LifeGridContext";
import EmptyState from "./components/EmptyState";

export default function Notes() {
  const { notes, addNote, updateNote, deleteNote } = useLifeGrid();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [formError, setFormError] = useState("");

  const [form, setForm] = useState({
    title: "",
    content: "",
    category: "Ideas",
  });

  const categories = ["all", "Ideas", "Academic", "Personal", "Work"];

  const filteredNotes = useMemo(() => {
    return notes.filter((note) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        (note.title || "").toLowerCase().includes(q) ||
        (note.content || "").toLowerCase().includes(q);
      const matchesCat = categoryFilter === "all" ? true : note.category === categoryFilter;
      return matchesSearch && matchesCat;
    });
  }, [notes, searchQuery, categoryFilter]);

  function handleOpenAdd() {
    setEditingId(null);
    setForm({ title: "", content: "", category: "Ideas" });
    setFormError("");
    setShowForm(true);
  }

  function handleOpenEdit(note) {
    setEditingId(note.id);
    setForm({
      title: note.title,
      content: note.content,
      category: note.category || "Ideas",
    });
    setFormError("");
    setShowForm(true);
  }

  async function handleSaveNote(e) {
    e.preventDefault();
    if (!form.title.trim()) {
      setFormError("Note title is required.");
      return;
    }

    try {
      if (editingId) {
        await updateNote(editingId, { title: form.title.trim(), content: form.content.trim(), category: form.category });
      } else {
        await addNote({ title: form.title.trim(), content: form.content.trim(), category: form.category });
      }
    } catch (err) {
      setFormError(err.message || "Could not save this note. Please try again.");
      return;
    }

    setForm({ title: "", content: "", category: "Ideas" });
    setEditingId(null);
    setShowForm(false);
    setFormError("");
  }

  return (
    <div className="module-page">
      <div className="module-header">
        <div>
          <h2>Notes</h2>
          <p>Capture ideas, research summaries, and reference material.</p>
        </div>

        <button className="add-button" onClick={handleOpenAdd}>
          <Plus size={18} />
          New Note
        </button>
      </div>

      {/* FILTER & SEARCH */}
      <div className="filter-bar">
        <div className="search-input-wrapper">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Search notes by title or content..."
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
              {cat === "all" ? "All Notes" : cat}
            </button>
          ))}
        </div>
      </div>

      {/* FORM */}
      {showForm && (
        <form className="module-form" onSubmit={handleSaveNote}>
          <div className="form-header">
            <h3>{editingId ? "Edit Note" : "New Note"}</h3>
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
              <label>Title *</label>
              <input
                type="text"
                placeholder="Note title..."
                value={form.title}
                onChange={(e) => {
                  setForm({ ...form, title: e.target.value });
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
                <option value="Ideas">Ideas</option>
                <option value="Academic">Academic</option>
                <option value="Personal">Personal</option>
                <option value="Work">Work</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Note Content</label>
            <textarea
              placeholder="Write your note, code snippets, or thoughts..."
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              rows={5}
            />
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
              {editingId ? "Update Note" : "Save Note"}
            </button>
          </div>
        </form>
      )}

      {/* NOTES GRID OR EMPTY STATE */}
      {filteredNotes.length === 0 ? (
        <EmptyState
          icon={StickyNote}
          title={searchQuery || categoryFilter !== "all" ? "No notes found matching your filter" : "No notes created yet"}
          message={
            searchQuery || categoryFilter !== "all"
              ? "Try adjusting your search terms or selecting another category."
              : "Capture your ideas, study notes, and research in one place."
          }
          actionText={!searchQuery && categoryFilter === "all" ? "+ Create First Note" : null}
          onAction={handleOpenAdd}
        />
      ) : (
        <div className="notes-grid">
          {filteredNotes.map((note) => (
            <div className="note-card" key={note.id}>
              <div className="note-card-top">
                <div>
                  <span className="category-tag lavender">{note.category || "Ideas"}</span>
                  <h3>{note.title}</h3>
                </div>

                <div className="note-card-actions">
                  <button
                    type="button"
                    className="icon-button"
                    onClick={() => handleOpenEdit(note)}
                    title="Edit note"
                  >
                    <Edit3 size={16} />
                  </button>

                  <button
                    type="button"
                    className="icon-button delete-icon"
                    onClick={() => deleteNote(note.id)}
                    title="Delete note"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <p className="note-card-content">{note.content || <em>No additional content.</em>}</p>

              {note.updatedAt && (
                <div className="note-card-footer">
                  <small>Updated: {new Date(note.updatedAt).toLocaleDateString()}</small>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
