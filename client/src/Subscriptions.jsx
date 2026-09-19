import { useEffect, useState } from "react";
import { Plus, Trash2, X } from "lucide-react";

function Subscriptions() {
  const [subscriptions, setSubscriptions] = useState(() => {
    const saved = localStorage.getItem("organiser_subscriptions");

    return saved
      ? JSON.parse(saved)
      : [
          {
            id: 1,
            name: "Spotify",
            amount: 119,
            renewal: "2026-09-28",
            active: true,
          },
          {
            id: 2,
            name: "Cloud Storage",
            amount: 130,
            renewal: "2026-10-02",
            active: true,
          },
        ];
  });

  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({
    name: "",
    amount: "",
    renewal: "",
  });

  useEffect(() => {
    localStorage.setItem(
      "organiser_subscriptions",
      JSON.stringify(subscriptions)
    );
  }, [subscriptions]);

  function addSubscription() {
    if (!form.name.trim() || !form.amount) return;

    setSubscriptions([
      ...subscriptions,
      {
        id: Date.now(),
        name: form.name,
        amount: Number(form.amount),
        renewal: form.renewal || "No date",
        active: true,
      },
    ]);

    setForm({
      name: "",
      amount: "",
      renewal: "",
    });

    setShowForm(false);
  }

  function toggleSubscription(id) {
    setSubscriptions(
      subscriptions.map((sub) =>
        sub.id === id
          ? { ...sub, active: !sub.active }
          : sub
      )
    );
  }

  function deleteSubscription(id) {
    setSubscriptions(
      subscriptions.filter((sub) => sub.id !== id)
    );
  }

  return (
    <div className="module-page">
      <div className="module-header">
        <div>
          <h2>Subscriptions</h2>
          <p>Manage recurring subscriptions and renewals.</p>
        </div>

        <button className="add-button" onClick={() => setShowForm(true)}>
          <Plus size={17} />
          Add Subscription
        </button>
      </div>

      {showForm && (
        <div className="module-form">
          <div className="form-header">
            <h3>New Subscription</h3>

            <button
              className="close-button"
              onClick={() => setShowForm(false)}
            >
              <X size={18} />
            </button>
          </div>

          <input
            type="text"
            placeholder="Subscription name"
            value={form.name}
            onChange={(e) =>
              setForm({ ...form, name: e.target.value })
            }
          />

          <input
            type="number"
            placeholder="Monthly amount"
            value={form.amount}
            onChange={(e) =>
              setForm({ ...form, amount: e.target.value })
            }
          />

          <input
            type="date"
            value={form.renewal}
            onChange={(e) =>
              setForm({ ...form, renewal: e.target.value })
            }
          />

          <button className="save-task" onClick={addSubscription}>
            Add Subscription
          </button>
        </div>
      )}

      <div className="subscription-grid">
        {subscriptions.map((sub) => (
          <div className="subscription-card" key={sub.id}>
            <div className="subscription-top">
              <div className="subscription-logo">
                {sub.name.charAt(0).toUpperCase()}
              </div>

              <span
                className={`subscription-status ${
                  sub.active ? "active" : "inactive"
                }`}
              >
                {sub.active ? "Active" : "Inactive"}
              </span>
            </div>

            <h3>{sub.name}</h3>

            <strong>₹{sub.amount}/month</strong>

            <p>Renews: {sub.renewal}</p>

            <div className="subscription-actions">
              <button
                className="secondary-button"
                onClick={() => toggleSubscription(sub.id)}
              >
                {sub.active ? "Deactivate" : "Activate"}
              </button>

              <button
                className="icon-button delete-icon"
                onClick={() => deleteSubscription(sub.id)}
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Subscriptions;