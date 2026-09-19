import { useEffect, useState } from "react";
import { Plus, Trash2, X, Edit3 } from "lucide-react";

function Notes() {
  const [notes, setNotes] = useState(() => {
    const saved = localStorage.getItem("organiser_notes");
    return saved
      ? JSON.parse(saved)
      : [
          {
            id: 1,
            title: "Project Ideas",
            content: "Add AI powered organisation and smart reminders.",
          },
          {
            id: 2,
            title: "DBMS Topics",
            content: "Table creation, functions, group functions and subqueries.",
          },
        ];
  });

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState({
    title: "",
    content: "",
  });

  useEffect(() => {
    localStorage.setItem("organiser_notes", JSON.stringify(notes));
  }, [notes]);

  function saveNote() {
    if (!form.title.trim()) return;

    if (editingId) {
      setNotes(
        notes.map((note) =>
          note.id === editingId ? { ...note, ...form } : note
        )
      );
    } else {
      setNotes([
        ...notes,
        {
          id: Date.now(),
          title: form.title,
          content: form.content,
        },
      ]);
    }

    setForm({ title: "", content: "" });
    setEditingId(null);
    setShowForm(false);
  }

  function editNote(note) {
    setForm({
      title: note.title,
      content: note.content,
    });

    setEditingId(note.id);
    setShowForm(true);
  }

  function deleteNote(id) {
    setNotes(notes.filter((note) => note.id !== id));
  }

  return (
    <div className="module-page">
      <div className="module-header">
        <div>
          <h2>Notes</h2>
          <p>Keep your ideas, information and important notes organised.</p>
        </div>

        <button className="add-button" onClick={() => setShowForm(true)}>
          <Plus size={17} />
          New Note
        </button>
      </div>

      {showForm && (
        <div className="module-form">
          <div className="form-header">
            <h3>{editingId ? "Edit Note" : "New Note"}</h3>

            <button
              className="close-button"
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
                setForm({ title: "", content: "" });
              }}
            >
              <X size={18} />
            </button>
          </div>

          <input
            type="text"
            placeholder="Note title"
            value={form.title}
            onChange={(e) =>
              setForm({ ...form, title: e.target.value })
            }
          />

          <textarea
            placeholder="Write your note..."
            value={form.content}
            onChange={(e) =>
              setForm({ ...form, content: e.target.value })
            }
          />

          <button className="save-task" onClick={saveNote}>
            {editingId ? "Update Note" : "Save Note"}
          </button>
        </div>
      )}

      <div className="notes-grid">
        {notes.map((note) => (
          <div className="note-card" key={note.id}>
            <div className="note-card-top">
              <h3>{note.title}</h3>

              <div>
                <button
                  className="icon-button"
                  onClick={() => editNote(note)}
                >
                  <Edit3 size={16} />
                </button>

                <button
                  className="icon-button delete-icon"
                  onClick={() => deleteNote(note.id)}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <p>{note.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Notes;