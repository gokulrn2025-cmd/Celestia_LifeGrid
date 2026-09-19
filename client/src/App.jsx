import { useState } from "react";
import "./App.css";
import {
  LayoutDashboard,
  CheckSquare,
  StickyNote,
  FileText,
  Lock,
  Receipt,
  CreditCard,
  Settings,
  Plus,
  ArrowUpRight,
} from "lucide-react";

import TaskManager from "./TaskManager";
import Notes from "./Notes";
import Bills from "./Bills";
import Subscriptions from "./Subscriptions";
import Documents from "./Documents";
import PasswordVault from "./PasswordVault";

function App() {
  const [page, setPage] = useState("dashboard");

  const tasks = [
    {
      title: "Complete project review",
      date: "Today",
      priority: "High",
    },
    {
      title: "Finish DBMS assignment",
      date: "Today",
      priority: "Medium",
    },
    {
      title: "Organise project files",
      date: "Tomorrow",
      priority: "Low",
    },
  ];

  function navigate(target) {
    setPage(target);
  }

  function Dashboard() {
    return (
      <div className="dashboard">
        <div className="welcome-section">
          <div>
            <h1>Good evening, Gokul</h1>
            <p>
              Here's an overview of your personal organiser.
            </p>
          </div>

          <button
            className="add-button"
            onClick={() => navigate("tasks")}
          >
            <Plus size={17} />
            New Task
          </button>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <span>Pending Tasks</span>
            <strong>3</strong>
            <small>2 due today</small>
          </div>

          <div className="stat-card">
            <span>Active Notes</span>
            <strong>2</strong>
            <small>Recently updated</small>
          </div>

          <div className="stat-card">
            <span>Upcoming Bills</span>
            <strong>₹2,349</strong>
            <small>Next 7 days</small>
          </div>

          <div className="stat-card">
            <span>Subscriptions</span>
            <strong>2</strong>
            <small>Active subscriptions</small>
          </div>
        </div>

        <div className="dashboard-grid">
          <div className="dashboard-card">
            <div className="card-heading">
              <div>
                <h2>Today's Tasks</h2>
                <p>Stay on top of your priorities.</p>
              </div>

              <button
                className="text-button"
                onClick={() => navigate("tasks")}
              >
                View all
                <ArrowUpRight size={15} />
              </button>
            </div>

            <div className="dashboard-task-list">
              {tasks.map((task, index) => (
                <div className="dashboard-task" key={index}>
                  <div className="task-dot"></div>

                  <div>
                    <strong>{task.title}</strong>
                    <span>{task.date}</span>
                  </div>

                  <span
                    className={`task-priority ${task.priority.toLowerCase()}`}
                  >
                    {task.priority}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="dashboard-card">
            <div className="card-heading">
              <div>
                <h2>Smart Insights</h2>
                <p>Helpful suggestions from your organiser.</p>
              </div>
            </div>

            <div className="insight-box">
              <div className="insight-number">01</div>

              <div>
                <strong>Upcoming payment</strong>
                <p>
                  Your electricity bill is due soon. Consider
                  paying it before the deadline.
                </p>
              </div>
            </div>

            <div className="insight-box">
              <div className="insight-number">02</div>

              <div>
                <strong>Task priority</strong>
                <p>
                  You have multiple high-priority tasks scheduled
                  for today.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="dashboard-card">
          <div className="card-heading">
            <div>
              <h2>Quick Access</h2>
              <p>Open the modules you use most.</p>
            </div>
          </div>

          <div className="quick-actions">
            <button onClick={() => navigate("tasks")}>
              <CheckSquare size={19} />
              <span>Tasks</span>
            </button>

            <button onClick={() => navigate("notes")}>
              <StickyNote size={19} />
              <span>Notes</span>
            </button>

            <button onClick={() => navigate("bills")}>
              <Receipt size={19} />
              <span>Bills</span>
            </button>

            <button onClick={() => navigate("subscriptions")}>
              <CreditCard size={19} />
              <span>Subscriptions</span>
            </button>

            <button onClick={() => navigate("documents")}>
              <FileText size={19} />
              <span>Documents</span>
            </button>

            <button onClick={() => navigate("passwords")}>
              <Lock size={19} />
              <span>Password Vault</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  function renderPage() {
    switch (page) {
      case "tasks":
        return <TaskManager />;

      case "notes":
        return <Notes />;

      case "bills":
        return <Bills />;

      case "subscriptions":
        return <Subscriptions />;

      case "documents":
        return <Documents />;

      case "passwords":
        return <PasswordVault />;

      case "settings":
        return (
          <div className="module-page">
            <div className="module-header">
              <div>
                <h2>Settings</h2>
                <p>Manage your organiser preferences.</p>
              </div>
            </div>

            <div className="settings-card">
              <h3>Application Settings</h3>

              <label>
                <span>Notifications</span>
                <input type="checkbox" defaultChecked />
              </label>

              <label>
                <span>Smart reminders</span>
                <input type="checkbox" defaultChecked />
              </label>

              <label>
                <span>Automatic organisation</span>
                <input type="checkbox" />
              </label>
            </div>
          </div>
        );

      default:
        return <Dashboard />;
    }
  }

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="logo">
          <div className="logo-mark">O</div>

          <div>
            <strong>Online</strong>
            <span>Organiser</span>
          </div>
        </div>

        <nav>
          <button
            className={page === "dashboard" ? "active" : ""}
            onClick={() => navigate("dashboard")}
          >
            <LayoutDashboard size={18} />
            Dashboard
          </button>

          <button
            className={page === "tasks" ? "active" : ""}
            onClick={() => navigate("tasks")}
          >
            <CheckSquare size={18} />
            Tasks
          </button>

          <button
            className={page === "notes" ? "active" : ""}
            onClick={() => navigate("notes")}
          >
            <StickyNote size={18} />
            Notes
          </button>

          <button
            className={page === "documents" ? "active" : ""}
            onClick={() => navigate("documents")}
          >
            <FileText size={18} />
            Documents
          </button>

          <button
            className={page === "passwords" ? "active" : ""}
            onClick={() => navigate("passwords")}
          >
            <Lock size={18} />
            Password Vault
          </button>

          <button
            className={page === "bills" ? "active" : ""}
            onClick={() => navigate("bills")}
          >
            <Receipt size={18} />
            Bills
          </button>

          <button
            className={
              page === "subscriptions" ? "active" : ""
            }
            onClick={() => navigate("subscriptions")}
          >
            <CreditCard size={18} />
            Subscriptions
          </button>
        </nav>

        <div className="sidebar-bottom">
          <button
            className={page === "settings" ? "active" : ""}
            onClick={() => navigate("settings")}
          >
            <Settings size={18} />
            Settings
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumb">
            Online Organiser
            <span>/</span>
            {page.charAt(0).toUpperCase() + page.slice(1)}
          </div>

          <div className="profile">
            <div className="profile-avatar">G</div>

            <div>
              <strong>Gokul</strong>
              <span>Student</span>
            </div>
          </div>
        </header>

        <section className="page-content">
          {renderPage()}
        </section>
      </main>
    </div>
  );
}

export default App;