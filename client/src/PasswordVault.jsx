import { useEffect, useState } from "react";
import { Plus, Trash2, Eye, EyeOff, X } from "lucide-react";

function PasswordVault() {
  const [passwords, setPasswords] = useState(() => {
    const saved = localStorage.getItem("organiser_passwords");

    return saved
      ? JSON.parse(saved)
      : [
          {
            id: 1,
            service: "Demo Account",
            username: "student@example.com",
            password: "demo123",
          },
        ];
  });

  const [showForm, setShowForm] = useState(false);
  const [visible, setVisible] = useState({});

  const [form, setForm] = useState({
    service: "",
    username: "",
    password: "",
  });

  useEffect(() => {
    localStorage.setItem(
      "organiser_passwords",
      JSON.stringify(passwords)
    );
  }, [passwords]);

  function addPassword() {
    if (
      !form.service.trim() ||
      !form.username.trim() ||
      !form.password.trim()
    ) {
      return;
    }

    setPasswords([
      ...passwords,
      {
        id: Date.now(),
        service: form.service,
        username: form.username,
        password: form.password,
      },
    ]);

    setForm({
      service: "",
      username: "",
      password: "",
    });

    setShowForm(false);
  }

  function deletePassword(id) {
    setPasswords(
      passwords.filter((item) => item.id !== id)
    );
  }

  function toggleVisible(id) {
    setVisible({
      ...visible,
      [id]: !visible[id],
    });
  }

  return (
    <div className="module-page">
      <div className="module-header">
        <div>
          <h2>Password Vault</h2>
          <p>Store account credentials securely.</p>
        </div>

        <button className="add-button" onClick={() => setShowForm(true)}>
          <Plus size={17} />
          Add Credential
        </button>
      </div>

      <div className="vault-warning">
        Demo vault only — real credentials should not be stored here yet.
      </div>

      {showForm && (
        <div className="module-form">
          <div className="form-header">
            <h3>New Credential</h3>

            <button
              className="close-button"
              onClick={() => setShowForm(false)}
            >
              <X size={18} />
            </button>
          </div>

          <input
            type="text"
            placeholder="Service name"
            value={form.service}
            onChange={(e) =>
              setForm({ ...form, service: e.target.value })
            }
          />

          <input
            type="text"
            placeholder="Username / Email"
            value={form.username}
            onChange={(e) =>
              setForm({ ...form, username: e.target.value })
            }
          />

          <input
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={(e) =>
              setForm({ ...form, password: e.target.value })
            }
          />

          <button className="save-task" onClick={addPassword}>
            Add Credential
          </button>
        </div>
      )}

      <div className="vault-list">
        {passwords.map((item) => (
          <div className="vault-card" key={item.id}>
            <div className="vault-avatar">
              {item.service.charAt(0).toUpperCase()}
            </div>

            <div className="vault-info">
              <strong>{item.service}</strong>
              <span>{item.username}</span>

              <div className="password-value">
                {visible[item.id]
                  ? item.password
                  : "••••••••••"}
              </div>
            </div>

            <button
              className="icon-button"
              onClick={() => toggleVisible(item.id)}
            >
              {visible[item.id] ? (
                <EyeOff size={17} />
              ) : (
                <Eye size={17} />
              )}
            </button>

            <button
              className="icon-button delete-icon"
              onClick={() => deletePassword(item.id)}
            >
              <Trash2 size={17} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default PasswordVault;