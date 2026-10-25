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
  Plus,
  ArrowUpRight,
  Sparkles,
  Check,
  RefreshCw,
  Download,
  User,
  ShieldCheck,
  Wifi,
  WifiOff,
  Sun,
  Moon,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

import { useLifeGrid } from "./context/LifeGridContext";
import TaskManager from "./TaskManager";
import Notes from "./Notes";
import Bills from "./Bills";
import Subscriptions from "./Subscriptions";
import Documents from "./Documents";
import PasswordVault from "./PasswordVault";
import AiAssistantPage from "./components/AiAssistantPage";
import AuthScreen from "./AuthScreen";
import { useAuth } from "./context/AuthContext";
import LifeGridMark from "./components/LifeGridMark";
import { useAmbientInteraction } from "./hooks/useAmbientInteraction";

function App() {
  const { user, loading: authLoading, signOut } = useAuth();
  const [page, setPage] = useState("dashboard");
  const { backdropRef, onPointerMove, onPointerDown, onPointerLeave } = useAmbientInteraction();

  const {
    profile,
    updateProfile,
    stats,
    tasks,
    notes,
    subscriptions,
    documents,
    toggleTask,
    bills,
    aiInsights,
    refreshAll,
    backendConnected,
    loading,
  } = useLifeGrid();

  function navigate(target) {
    setPage(target);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Determine Greeting based on current time
  function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }

  // Today's Tasks
  const pendingTasks = tasks.filter((t) => !t.completed);
  const displayTasks = pendingTasks.slice(0, 4);
  const completedTasksCount = tasks.filter((task) => task.completed).length;

  function Dashboard() {
    return (
      <div className="dashboard">
        {/* WELCOME BANNER */}
        <motion.div
          className="welcome-section"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div>
            <h1>
              {getGreeting()}, {profile.name || "LifeGrid user"}
            </h1>
            <p>{new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long" }).format(new Date())} · Your day, gathered in one place.</p>
          </div>

          <div className="welcome-actions">
            <motion.button
              className="neo-button ai-trigger-btn"
              onClick={() => navigate("assistant")}
              title="Open LifeGrid AI"
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.97 }}
            >
              <Sparkles size={17} />
              LifeGrid AI
            </motion.button>

            <motion.button
              className="add-button"
              onClick={() => navigate("tasks")}
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.97 }}
            >
              <Plus size={17} />
              New Task
            </motion.button>
          </div>
        </motion.div>

        {/* 4 DYNAMIC STAT CARDS */}
        <motion.div
          className="stats-grid"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.05 }}
        >
          <motion.div
            className="stat-card"
            onClick={() => navigate("tasks")}
            whileHover={{ y: -3 }}
            whileTap={{ scale: 0.98 }}
          >
            <span>Pending Tasks</span>
            <strong>{stats.pendingTasksCount}</strong>
            <small>{stats.tasksDueTodayCount} due today or urgent</small>
          </motion.div>

          <motion.div
            className="stat-card lavender-surface"
            onClick={() => navigate("notes")}
            whileHover={{ y: -3 }}
            whileTap={{ scale: 0.98 }}
          >
            <span>Active Notes</span>
            <strong>{stats.activeNotesCount}</strong>
            <small>Knowledge & references</small>
          </motion.div>

          <motion.div
            className="stat-card orange-surface"
            onClick={() => navigate("bills")}
            whileHover={{ y: -3 }}
            whileTap={{ scale: 0.98 }}
          >
            <span>Upcoming Bills</span>
            <strong>₹{stats.upcomingBillsAmount.toLocaleString("en-IN")}</strong>
            <small>{stats.unpaidBillsCount} unpaid payments</small>
          </motion.div>

          <motion.div
            className="stat-card lime-surface"
            onClick={() => navigate("subscriptions")}
            whileHover={{ y: -3 }}
            whileTap={{ scale: 0.98 }}
          >
            <span>Subscriptions</span>
            <strong>{stats.activeSubscriptionsCount}</strong>
            <small>₹{stats.monthlySubscriptionCost.toLocaleString("en-IN")}/mo active burn</small>
          </motion.div>
        </motion.div>

        {/* 2-COLUMN DASHBOARD GRID */}
        <div className="dashboard-grid">
          {/* TODAY'S TASKS */}
          <motion.div
            className="dashboard-card"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.1 }}
          >
            <div className="card-heading">
              <div>
                <h2>Active Priorities</h2>
                <p>{completedTasksCount} completed · {pendingTasks.length} still to do.</p>
              </div>

              <button
                className="text-button"
                onClick={() => navigate("tasks")}
              >
                View all ({tasks.length})
                <ArrowUpRight size={15} />
              </button>
            </div>

            <div className="dashboard-task-list">
              {displayTasks.length === 0 ? (
                <div className="dashboard-empty-note">
                  <Check size={20} />
                  <span>{tasks.length ? "No pending tasks right now. Great job!" : "Your task list is clear. Add a task whenever you’re ready."}</span>
                </div>
              ) : (
                displayTasks.map((task) => (
                  <motion.div
                    className="dashboard-task"
                    key={task.id}
                    whileHover={{ x: 2 }}
                    transition={{ duration: 0.1 }}
                  >
                    <motion.button
                      type="button"
                      className="task-circle"
                      onClick={() => toggleTask(task.id)}
                      title="Mark complete"
                      whileTap={{ scale: 0.8 }}
                    >
                      {task.completed && <Check size={14} />}
                    </motion.button>

                    <div className="dash-task-details">
                      <strong>{task.title}</strong>
                      <span>Due: {task.dueDate || "No date"}</span>
                    </div>

                    <span className={`task-priority ${(task.priority || "medium").toLowerCase()}`}>
                      {task.priority || "Medium"}
                    </span>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>

          {/* DYNAMIC SMART INSIGHTS */}
          <motion.div
            className="dashboard-card"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.15 }}
          >
            <div className="card-heading">
              <div>
                <h2>Smart Insights</h2>
                <p>Actionable intelligence derived from your data.</p>
              </div>

              <motion.button
                type="button"
                className="icon-button"
                onClick={refreshAll}
                title="Refresh Smart Insights"
                whileHover={{ rotate: 180 }}
                transition={{ duration: 0.3 }}
              >
                <RefreshCw size={15} />
              </motion.button>
            </div>

            <div className="insights-container">
              {aiInsights && aiInsights.length > 0 ? (
                aiInsights.map((insight, idx) => (
                  <motion.div
                    className={`insight-box ${insight.type || "info"}`}
                    key={insight.id || idx}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.08 }}
                  >
                    <div className="insight-number">{insight.number || `0${idx + 1}`}</div>
                    <div>
                      <strong>{insight.title}</strong>
                      <p>{insight.description}</p>
                      {insight.action && (
                        <button
                          type="button"
                          className="insight-action-link"
                          onClick={() => navigate(insight.action)}
                        >
                          Open {insight.action} &rarr;
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="insight-box">
                  <div className="insight-number">01</div>
                  <div>
                    <strong>System Ready</strong>
                    <p>Add a few tasks, notes, or plans and your personal insights will show up here.</p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* QUICK ACCESS BAR */}
        <motion.div
          className="dashboard-card"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.2 }}
        >
          <div className="card-heading">
            <div>
              <h2>Quick Access</h2>
              <p>Jump to your primary modules.</p>
            </div>
          </div>

          <div className="quick-actions">
            <motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.96 }} onClick={() => navigate("tasks")}>
              <CheckSquare size={20} />
              <span>Tasks</span>
            </motion.button>

            <motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.96 }} onClick={() => navigate("notes")}>
              <StickyNote size={20} />
              <span>Notes</span>
            </motion.button>

            <motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.96 }} onClick={() => navigate("bills")}>
              <Receipt size={20} />
              <span>Bills</span>
            </motion.button>

            <motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.96 }} onClick={() => navigate("subscriptions")}>
              <CreditCard size={20} />
              <span>Subscriptions</span>
            </motion.button>

            <motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.96 }} onClick={() => navigate("documents")}>
              <FileText size={20} />
              <span>Documents</span>
            </motion.button>

            <motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.96 }} onClick={() => navigate("passwords")}>
              <Lock size={20} />
              <span>Password Vault</span>
            </motion.button>

          </div>
        </motion.div>

        <div className="dashboard-grid dashboard-recent-grid">
          <div className="dashboard-card recent-items-card">
            <div className="card-heading">
              <div><h2>Recent Notes</h2><p>Your latest thoughts and references.</p></div>
              <button className="text-button" onClick={() => navigate("notes")}>View all <ArrowUpRight size={15} /></button>
            </div>
            {notes.slice(0, 3).length ? notes.slice(0, 3).map((note) => (
              <button className="recent-item" key={note.id} onClick={() => navigate("notes")}>
                <StickyNote size={17} /><span><strong>{note.title}</strong><small>{note.category || "Note"}</small></span>
              </button>
            )) : <p className="recent-empty">Your saved notes will appear here.</p>}
          </div>
          <div className="dashboard-card recent-items-card">
            <div className="card-heading">
              <div><h2>Recent Documents</h2><p>Keep useful files close at hand.</p></div>
              <button className="text-button" onClick={() => navigate("documents")}>View all <ArrowUpRight size={15} /></button>
            </div>
            {documents.slice(0, 3).length ? documents.slice(0, 3).map((document) => (
              <button className="recent-item" key={document.id} onClick={() => navigate("documents")}>
                <FileText size={17} /><span><strong>{document.name}</strong><small>{document.category || "Document"}</small></span>
              </button>
            )) : <p className="recent-empty">Uploaded documents will appear here.</p>}
          </div>
        </div>
      </div>
    );
  }

  function SettingsPage() {
    const [nameInput, setNameInput] = useState(profile.name || "LifeGrid user");
    const [roleInput, setRoleInput] = useState(profile.role || "Personal");
    const [bioInput, setBioInput] = useState(profile.bio || "");
    const [savedMsg, setSavedMsg] = useState("");
    const [saveError, setSaveError] = useState("");

    async function handleSaveProfile(e) {
      e.preventDefault();
      setSaveError("");
      try {
        await updateProfile({ name: nameInput.trim(), role: roleInput.trim(), bio: bioInput.trim() });
        setSavedMsg("Profile updated successfully.");
        setTimeout(() => setSavedMsg(""), 3000);
      } catch (err) {
        setSaveError(err.message || "Could not update your profile. Please try again.");
      }
    }

    async function handleThemeChange() {
      setSaveError("");
      setSavedMsg("");
      try {
        await updateProfile({ theme: profile.theme === "dark" ? "light" : "dark" });
        setSavedMsg(`Switched to ${profile.theme === "dark" ? "light" : "dark"} mode.`);
        setTimeout(() => setSavedMsg(""), 3000);
      } catch (err) {
        setSaveError(err.message || "Could not update your appearance setting.");
      }
    }

    function handleExportJson() {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(
        JSON.stringify({ profile, tasks, notes, bills, subscriptions, documents }, null, 2)
      );
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `lifegrid-backup-${new Date().toISOString().split("T")[0]}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    }

    return (
      <div className="module-page">
        <div className="module-header">
          <div>
            <h2>Profile & Preferences</h2>
            <p>Make LifeGrid yours and manage your account and data.</p>
          </div>
        </div>

        <section className="profile-overview" aria-label="Account overview">
          <div className="profile-overview-person">
            <div className="profile-overview-avatar">{profile.avatarLetter || "L"}</div>
            <div>
              <span className="profile-overline">YOUR LIFEGRID PROFILE</span>
              <h3>{profile.name || "LifeGrid user"}</h3>
              <p>{user?.email}</p>
            </div>
          </div>
          <div className="profile-overview-stats">
            <div><strong>{tasks.length}</strong><span>Tasks</span></div>
            <div><strong>{notes.length}</strong><span>Notes</span></div>
            <div><strong>{bills.length}</strong><span>Bills</span></div>
            <div><strong>{documents.length}</strong><span>Documents</span></div>
          </div>
        </section>

        <div className="settings-grid-layout">
          {/* USER PROFILE */}
          <div className="settings-card">
            <h3>
              <User size={18} /> User Profile
            </h3>

            <form onSubmit={handleSaveProfile}>
              <div className="form-group">
                <label>Display Name</label>
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="Your name"
                  required
                  maxLength={60}
                />
              </div>

              <div className="form-group">
                <label>Role or occupation</label>
                <input
                  type="text"
                  value={roleInput}
                  onChange={(e) => setRoleInput(e.target.value)}
                  placeholder="e.g., Student, Designer, Parent"
                  required
                  maxLength={60}
                />
              </div>

              <div className="form-group">
                <label htmlFor="profile-about">A little about you</label>
                <textarea
                  id="profile-about"
                  value={bioInput}
                  onChange={(e) => setBioInput(e.target.value)}
                  placeholder="What are you focusing on lately?"
                  rows={3}
                  maxLength={280}
                />
                <span className="profile-field-hint">{bioInput.length}/280 characters</span>
              </div>

              <motion.button
                type="submit"
                className="save-task"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Save Profile
              </motion.button>

              {savedMsg && <span className="settings-saved-note">{savedMsg}</span>}
              {saveError && <span className="form-error-banner" role="alert">{saveError}</span>}
            </form>
          </div>

          <div className="settings-card appearance-card">
            <h3>{profile.theme === "dark" ? <Moon size={18} /> : <Sun size={18} />} Appearance</h3>
            <p className="settings-desc">Choose the look that feels comfortable. Your choice follows your account across devices.</p>
            <div className="theme-choice-row">
              <div className="theme-choice-copy">
                <strong>{profile.theme === "dark" ? "Dark theme" : "Light theme"}</strong>
                <span>{profile.theme === "dark" ? "Easy on the eyes in low light." : "Bright, clear and ready for the day."}</span>
              </div>
              <button type="button" className="theme-toggle" role="switch" aria-checked={profile.theme === "dark"} aria-label="Toggle dark theme" onClick={handleThemeChange}>
                <span />
              </button>
            </div>
          </div>

          {/* DATA & BACKUP */}
          <div className="settings-card">
            <h3>
              <ShieldCheck size={18} /> Data Management & Backups
            </h3>
            <p className="settings-desc">
              Download a copy of your organiser data for your records. Password vault entries are excluded.
            </p>

            <div className="settings-action-stack">
              <motion.button
                type="button"
                className="neo-button full-width"
                onClick={handleExportJson}
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.98 }}
              >
                <Download size={16} /> Export JSON Backup
              </motion.button>

            </div>
          </div>

          <div className="settings-card">
            <h3><ShieldCheck size={18} /> Account & privacy</h3>
            <p className="settings-desc">Signed in as <strong>{user?.email}</strong>. Your workspace data is scoped to your account.</p>
            <div className="account-detail-row"><span>Workspace</span><strong>Private to you</strong></div>
            <div className="account-detail-row"><span>Vault security</span><strong>Encrypted at rest</strong></div>
            <button type="button" className="neo-button danger-outline full-width" onClick={async () => { await signOut(); }}>
              Sign out
            </button>
          </div>
        </div>
      </div>
    );
  }

  function renderPage() {
    let content;
    switch (page) {
      case "tasks":
        content = <TaskManager />;
        break;
      case "notes":
        content = <Notes />;
        break;
      case "bills":
        content = <Bills />;
        break;
      case "subscriptions":
        content = <Subscriptions />;
        break;
      case "documents":
        content = <Documents />;
        break;
      case "passwords":
        content = <PasswordVault />;
        break;
      case "settings":
        content = <SettingsPage />;
        break;
      case "assistant":
        content = <AiAssistantPage profile={profile} onNavigate={navigate} />;
        break;
      default:
        content = <Dashboard />;
        break;
    }

    return (
      <motion.div
        key={page}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      >
        {content}
      </motion.div>
    );
  }

  if (authLoading) return <main className="auth-loading" aria-live="polite">Opening your LifeGrid…</main>;
  if (!user) return <AuthScreen />;
  if (loading) return <main className="auth-loading" aria-live="polite">Loading your organiser…</main>;

  return (
    <div className="app-layout" onPointerMove={onPointerMove} onPointerDown={onPointerDown} onPointerLeave={onPointerLeave}>
      <div className="ambient-backdrop" aria-hidden="true" ref={backdropRef}>
        <span className="ambient-orb ambient-orb-indigo" />
        <span className="ambient-orb ambient-orb-mint" />
        <span className="ambient-orb ambient-orb-lilac" />
        <span className="ambient-orb-interaction" />
        <span className="ambient-touch-ripple" />
      </div>
      {/* SIDEBAR NAVIGATION */}
      <aside className="sidebar">
        <div className="logo" onClick={() => navigate("dashboard")}>
          <div className="logo-mark"><LifeGridMark /></div>
          <div>
            <strong>LifeGrid</strong>
            <span>Personal Organiser</span>
          </div>
        </div>

        <nav>
          <motion.button
            type="button"
            className={page === "dashboard" ? "active" : ""}
            onClick={() => navigate("dashboard")}
            whileTap={{ scale: 0.98 }}
          >
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
          </motion.button>

          <motion.button
            type="button"
            className={page === "tasks" ? "active" : ""}
            onClick={() => navigate("tasks")}
            whileTap={{ scale: 0.98 }}
          >
            <CheckSquare size={18} />
            <span>Tasks</span>
          </motion.button>

          <motion.button
            type="button"
            className={page === "notes" ? "active" : ""}
            onClick={() => navigate("notes")}
            whileTap={{ scale: 0.98 }}
          >
            <StickyNote size={18} />
            <span>Notes</span>
          </motion.button>

          <motion.button
            type="button"
            className={page === "documents" ? "active" : ""}
            onClick={() => navigate("documents")}
            whileTap={{ scale: 0.98 }}
          >
            <FileText size={18} />
            <span>Documents</span>
          </motion.button>

          <motion.button
            type="button"
            className={page === "passwords" ? "active" : ""}
            onClick={() => navigate("passwords")}
            whileTap={{ scale: 0.98 }}
          >
            <Lock size={18} />
            <span>Password Vault</span>
          </motion.button>

          <motion.button
            type="button"
            className={page === "bills" ? "active" : ""}
            onClick={() => navigate("bills")}
            whileTap={{ scale: 0.98 }}
          >
            <Receipt size={18} />
            <span>Bills</span>
          </motion.button>

          <motion.button
            type="button"
            className={page === "subscriptions" ? "active" : ""}
            onClick={() => navigate("subscriptions")}
            whileTap={{ scale: 0.98 }}
          >
            <CreditCard size={18} />
            <span>Subscriptions</span>
          </motion.button>

          <motion.button
            type="button"
            className={page === "assistant" ? "active" : ""}
            onClick={() => navigate("assistant")}
            whileTap={{ scale: 0.98 }}
          >
            <Sparkles size={18} />
            <span>AI Assistant</span>
          </motion.button>

        </nav>

        <div className="sidebar-bottom">
          <motion.button
            type="button"
            className={page === "settings" ? "active" : ""}
            onClick={() => navigate("settings")}
            whileTap={{ scale: 0.98 }}
          >
            <User size={18} />
            <span>Profile</span>
          </motion.button>
        </div>
      </aside>

      {/* MAIN VIEWPORT */}
      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumb">
            <strong>LifeGrid</strong>
            <span>/</span>
            {page === "settings" ? "Profile" : page === "assistant" ? "AI Assistant" : page.charAt(0).toUpperCase() + page.slice(1)}
          </div>

          <div className="topbar-right">
            {/* BACKEND STATUS INDICATOR */}
            <div className={`backend-indicator ${backendConnected ? "connected" : "fallback"}`}>
              {backendConnected ? <Wifi size={14} /> : <WifiOff size={14} />}
              <span>{backendConnected ? "API Connected" : "API Offline"}</span>
            </div>

            {/* USER PROFILE BADGE */}
            <motion.div
              className="profile"
              onClick={() => navigate("settings")}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="profile-avatar">{profile.avatarLetter || "L"}</div>
              <div>
                <strong>{profile.name || "LifeGrid user"}</strong>
                <span>{profile.role || "Personal"}</span>
              </div>
            </motion.div>
          </div>
        </header>

        <section className="page-content">
          <AnimatePresence mode="wait">
            {renderPage()}
          </AnimatePresence>
        </section>
      </main>

    </div>
  );
}

export default App;
