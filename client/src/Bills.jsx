import { useEffect, useState } from "react";
import { Plus, Trash2, Check, X } from "lucide-react";

function Bills() {
  const [bills, setBills] = useState(() => {
    const saved = localStorage.getItem("organiser_bills");

    return saved
      ? JSON.parse(saved)
      : [
          {
            id: 1,
            name: "Electricity Bill",
            amount: 1450,
            dueDate: "2026-09-20",
            paid: false,
          },
          {
            id: 2,
            name: "Internet Bill",
            amount: 899,
            dueDate: "2026-09-25",
            paid: true,
          },
        ];
  });

  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({
    name: "",
    amount: "",
    dueDate: "",
  });

  useEffect(() => {
    localStorage.setItem("organiser_bills", JSON.stringify(bills));
  }, [bills]);

  function addBill() {
    if (!form.name.trim() || !form.amount) return;

    setBills([
      ...bills,
      {
        id: Date.now(),
        name: form.name,
        amount: Number(form.amount),
        dueDate: form.dueDate || "No date",
        paid: false,
      },
    ]);

    setForm({
      name: "",
      amount: "",
      dueDate: "",
    });

    setShowForm(false);
  }

  function togglePaid(id) {
    setBills(
      bills.map((bill) =>
        bill.id === id
          ? { ...bill, paid: !bill.paid }
          : bill
      )
    );
  }

  function deleteBill(id) {
    setBills(bills.filter((bill) => bill.id !== id));
  }

  return (
    <div className="module-page">
      <div className="module-header">
        <div>
          <h2>Bills</h2>
          <p>Track recurring bills and payment deadlines.</p>
        </div>

        <button className="add-button" onClick={() => setShowForm(true)}>
          <Plus size={17} />
          Add Bill
        </button>
      </div>

      {showForm && (
        <div className="module-form">
          <div className="form-header">
            <h3>New Bill</h3>

            <button
              className="close-button"
              onClick={() => setShowForm(false)}
            >
              <X size={18} />
            </button>
          </div>

          <input
            type="text"
            placeholder="Bill name"
            value={form.name}
            onChange={(e) =>
              setForm({ ...form, name: e.target.value })
            }
          />

          <input
            type="number"
            placeholder="Amount"
            value={form.amount}
            onChange={(e) =>
              setForm({ ...form, amount: e.target.value })
            }
          />

          <input
            type="date"
            value={form.dueDate}
            onChange={(e) =>
              setForm({ ...form, dueDate: e.target.value })
            }
          />

          <button className="save-task" onClick={addBill}>
            Add Bill
          </button>
        </div>
      )}

      <div className="bill-list">
        {bills.map((bill) => (
          <div className="bill-card" key={bill.id}>
            <div className="bill-icon">₹</div>

            <div className="bill-info">
              <strong>{bill.name}</strong>
              <span>Due: {bill.dueDate}</span>
            </div>

            <strong className="bill-amount">
              ₹{bill.amount}
            </strong>

            <span
              className={`bill-status ${
                bill.paid ? "paid" : "pending"
              }`}
            >
              {bill.paid ? "Paid" : "Pending"}
            </span>

            <button
              className="icon-button"
              onClick={() => togglePaid(bill.id)}
              title="Mark as paid"
            >
              <Check size={16} />
            </button>

            <button
              className="icon-button delete-icon"
              onClick={() => deleteBill(bill.id)}
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Bills;