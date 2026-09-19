import { useEffect, useState } from "react";
import { Plus, Trash2, FileText, X } from "lucide-react";

function Documents() {
  const [documents, setDocuments] = useState(() => {
    const saved = localStorage.getItem("organiser_documents");

    return saved
      ? JSON.parse(saved)
      : [
          {
            id: 1,
            name: "Project Proposal.pdf",
            category: "Academic",
          },
          {
            id: 2,
            name: "DBMS Notes.pdf",
            category: "Academic",
          },
        ];
  });

  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({
    name: "",
    category: "Academic",
  });

  useEffect(() => {
    localStorage.setItem(
      "organiser_documents",
      JSON.stringify(documents)
    );
  }, [documents]);

  function addDocument() {
    if (!form.name.trim()) return;

    setDocuments([
      ...documents,
      {
        id: Date.now(),
        name: form.name,
        category: form.category,
      },
    ]);

    setForm({
      name: "",
      category: "Academic",
    });

    setShowForm(false);
  }

  function deleteDocument(id) {
    setDocuments(
      documents.filter((document) => document.id !== id)
    );
  }

  return (
    <div className="module-page">
      <div className="module-header">
        <div>
          <h2>Documents</h2>
          <p>Keep important documents organised in one place.</p>
        </div>

        <button className="add-button" onClick={() => setShowForm(true)}>
          <Plus size={17} />
          Add Document
        </button>
      </div>

      {showForm && (
        <div className="module-form">
          <div className="form-header">
            <h3>Add Document</h3>

            <button
              className="close-button"
              onClick={() => setShowForm(false)}
            >
              <X size={18} />
            </button>
          </div>

          <input
            type="text"
            placeholder="Document name"
            value={form.name}
            onChange={(e) =>
              setForm({ ...form, name: e.target.value })
            }
          />

          <select
            value={form.category}
            onChange={(e) =>
              setForm({ ...form, category: e.target.value })
            }
          >
            <option>Academic</option>
            <option>Personal</option>
            <option>Financial</option>
            <option>Other</option>
          </select>

          <button className="save-task" onClick={addDocument}>
            Add Document
          </button>
        </div>
      )}

      <div className="document-list">
        {documents.map((document) => (
          <div className="document-card" key={document.id}>
            <div className="document-icon">
              <FileText size={22} />
            </div>

            <div className="document-info">
              <strong>{document.name}</strong>
              <span>{document.category}</span>
            </div>

            <button
              className="icon-button delete-icon"
              onClick={() => deleteDocument(document.id)}
            >
              <Trash2 size={17} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Documents;