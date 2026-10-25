/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { api } from "../services/api";
import { useAuth } from "./AuthContext";

export const LifeGridContext = createContext(null);

export function LifeGridProvider({ children }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [backendConnected, setBackendConnected] = useState(false);
  const [profile, setProfile] = useState({ name: "LifeGrid user", role: "Personal", bio: "", theme: "light", avatarLetter: "L" });

  useEffect(() => {
    document.documentElement.dataset.theme = user && profile.theme === "dark" ? "dark" : "light";
  }, [profile.theme, user]);

  const [tasks, setTasks] = useState([]);
  const [notes, setNotes] = useState([]);
  const [bills, setBills] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [passwords, setPasswords] = useState([]);
  const [aiInsights, setAiInsights] = useState([]);
  const [stats, setStats] = useState({
    pendingTasksCount: 0,
    tasksDueTodayCount: 0,
    activeNotesCount: 0,
    upcomingBillsAmount: 0,
    unpaidBillsCount: 0,
    activeSubscriptionsCount: 0,
    monthlySubscriptionCost: 0,
    documentsCount: 0,
    passwordsCount: 0,
  });

  const recalculateStats = useCallback((tList, nList, bList, sList, dList, pList) => {
    const today = new Date().toISOString().split("T")[0];
    const pendingTasks = (tList || []).filter((t) => !t.completed);
    const tasksDueToday = pendingTasks.filter((t) => t.dueDate === "Today" || t.dueDate === today);

    const unpaidBills = (bList || []).filter((b) => !b.paid);
    const upcomingTotal = unpaidBills.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);

    const activeSubs = (sList || []).filter((s) => s.active);
    const monthlySubCost = activeSubs.reduce((acc, curr) => {
      const amt = Number(curr.amount || 0);
      return acc + (curr.billingCycle === "Yearly" ? Math.round(amt / 12) : amt);
    }, 0);

    setStats({
      pendingTasksCount: pendingTasks.length,
      tasksDueTodayCount: tasksDueToday.length,
      activeNotesCount: (nList || []).length,
      upcomingBillsAmount: upcomingTotal,
      unpaidBillsCount: unpaidBills.length,
      activeSubscriptionsCount: activeSubs.length,
      monthlySubscriptionCost: monthlySubCost,
      documentsCount: (dList || []).length,
      passwordsCount: (pList || []).length,
    });
  }, []);

  const refreshAll = useCallback(async () => {
    if (!user) {
      setTasks([]); setNotes([]); setBills([]); setSubscriptions([]); setDocuments([]); setPasswords([]); setAiInsights([]);
      setBackendConnected(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const health = await api.getHealth();
      setBackendConnected(health?.status === "ok");

      const [tData, nData, bData, sData, dData, pData, insightsData, settingsData] = await Promise.all([
        api.getTasks(),
        api.getNotes(),
        api.getBills(),
        api.getSubscriptions(),
        api.getDocuments(),
        api.getVault(),
        api.getAiInsights(),
        api.getSettings(),
      ]);

      setTasks(tData || []);
      setNotes(nData || []);
      setBills(bData || []);
      setSubscriptions(sData || []);
      setDocuments(dData || []);
      setPasswords(pData || []);
      setAiInsights(insightsData || []);

      if (settingsData?.profile) {
        setProfile((prev) => ({
          ...prev,
          ...settingsData.profile,
          avatarLetter: (settingsData.profile.name || "G").charAt(0).toUpperCase(),
        }));
      }

      recalculateStats(tData, nData, bData, sData, dData, pData);
    } catch (err) {
      console.warn("Error refreshing LifeGrid data:", err);
    } finally {
      setLoading(false);
    }
  }, [recalculateStats, user]);

  useEffect(() => {
    const timer = setTimeout(refreshAll, 0);
    return () => clearTimeout(timer);
  }, [refreshAll]);

  // Tasks actions
  const addTask = async (taskData) => {
    const created = await api.createTask(taskData);
    const updated = [created, ...tasks];
    setTasks(updated);
    recalculateStats(updated, notes, bills, subscriptions, documents, passwords);
    return created;
  };

  const updateTask = async (id, taskData) => {
    const updatedItem = await api.updateTask(id, taskData);
    const updated = tasks.map((t) => (t.id === id ? { ...t, ...updatedItem } : t));
    setTasks(updated);
    recalculateStats(updated, notes, bills, subscriptions, documents, passwords);
    return updatedItem;
  };

  const toggleTask = async (id) => {
    const target = tasks.find((t) => t.id === id);
    if (!target) return;
    const toggled = await api.updateTask(id, { completed: !target.completed });
    const updated = tasks.map((t) => (t.id === id ? { ...t, completed: !target.completed } : t));
    setTasks(updated);
    recalculateStats(updated, notes, bills, subscriptions, documents, passwords);
    return toggled;
  };

  const deleteTask = async (id) => {
    await api.deleteTask(id);
    const updated = tasks.filter((t) => t.id !== id);
    setTasks(updated);
    recalculateStats(updated, notes, bills, subscriptions, documents, passwords);
  };

  // Notes actions
  const addNote = async (noteData) => {
    const created = await api.createNote(noteData);
    const updated = [created, ...notes];
    setNotes(updated);
    recalculateStats(tasks, updated, bills, subscriptions, documents, passwords);
    return created;
  };

  const updateNote = async (id, noteData) => {
    const updatedItem = await api.updateNote(id, noteData);
    const updated = notes.map((n) => (n.id === id ? { ...n, ...updatedItem } : n));
    setNotes(updated);
    return updatedItem;
  };

  const deleteNote = async (id) => {
    await api.deleteNote(id);
    const updated = notes.filter((n) => n.id !== id);
    setNotes(updated);
    recalculateStats(tasks, updated, bills, subscriptions, documents, passwords);
  };

  // Bills actions
  const addBill = async (billData) => {
    const created = await api.createBill(billData);
    const updated = [created, ...bills];
    setBills(updated);
    recalculateStats(tasks, notes, updated, subscriptions, documents, passwords);
    return created;
  };

  const updateBill = async (id, billData) => {
    const updatedItem = await api.updateBill(id, billData);
    const updated = bills.map((b) => (b.id === id ? { ...b, ...updatedItem } : b));
    setBills(updated);
    recalculateStats(tasks, notes, updated, subscriptions, documents, passwords);
    return updatedItem;
  };

  const toggleBillPaid = async (id) => {
    const target = bills.find((b) => b.id === id);
    if (!target) return;
    const updatedItem = await api.updateBill(id, { paid: !target.paid });
    const updated = bills.map((b) => (b.id === id ? { ...b, paid: !target.paid } : b));
    setBills(updated);
    recalculateStats(tasks, notes, updated, subscriptions, documents, passwords);
    return updatedItem;
  };

  const deleteBill = async (id) => {
    await api.deleteBill(id);
    const updated = bills.filter((b) => b.id !== id);
    setBills(updated);
    recalculateStats(tasks, notes, updated, subscriptions, documents, passwords);
  };

  // Subscriptions actions
  const addSubscription = async (subData) => {
    const created = await api.createSubscription(subData);
    const updated = [created, ...subscriptions];
    setSubscriptions(updated);
    recalculateStats(tasks, notes, bills, updated, documents, passwords);
    return created;
  };

  const updateSubscription = async (id, subData) => {
    const updatedItem = await api.updateSubscription(id, subData);
    const updated = subscriptions.map((s) => (s.id === id ? { ...s, ...updatedItem } : s));
    setSubscriptions(updated);
    recalculateStats(tasks, notes, bills, updated, documents, passwords);
    return updatedItem;
  };

  const toggleSubscription = async (id) => {
    const target = subscriptions.find((s) => s.id === id);
    if (!target) return;
    const updatedItem = await api.updateSubscription(id, { active: !target.active });
    const updated = subscriptions.map((s) => (s.id === id ? { ...s, active: !target.active } : s));
    setSubscriptions(updated);
    recalculateStats(tasks, notes, bills, updated, documents, passwords);
    return updatedItem;
  };

  const deleteSubscription = async (id) => {
    await api.deleteSubscription(id);
    const updated = subscriptions.filter((s) => s.id !== id);
    setSubscriptions(updated);
    recalculateStats(tasks, notes, bills, updated, documents, passwords);
  };

  // Documents actions
  const addDocument = async (docData) => {
    const created = await api.createDocument(docData);
    const updated = [created, ...documents];
    setDocuments(updated);
    recalculateStats(tasks, notes, bills, subscriptions, updated, passwords);
    return created;
  };

  const updateDocument = async (id, docData) => {
    const updatedItem = await api.updateDocument(id, docData);
    const updated = documents.map((doc) => (doc.id === id ? { ...doc, ...updatedItem } : doc));
    setDocuments(updated);
    return updatedItem;
  };

  const deleteDocument = async (id) => {
    await api.deleteDocument(id);
    const updated = documents.filter((d) => d.id !== id);
    setDocuments(updated);
    recalculateStats(tasks, notes, bills, subscriptions, updated, passwords);
  };

  // Passwords actions
  const addPassword = async (passData) => {
    const created = await api.createVault(passData);
    const updated = [created, ...passwords];
    setPasswords(updated);
    recalculateStats(tasks, notes, bills, subscriptions, documents, updated);
    return created;
  };

  const updatePassword = async (id, passData) => {
    const updatedItem = await api.updateVault(id, passData);
    const updated = passwords.map((p) => (p.id === id ? { ...p, ...updatedItem } : p));
    setPasswords(updated);
    return updatedItem;
  };

  const deletePassword = async (id) => {
    await api.deleteVault(id);
    const updated = passwords.filter((p) => p.id !== id);
    setPasswords(updated);
    recalculateStats(tasks, notes, bills, subscriptions, documents, updated);
  };

  // AI Quick Capture
  const quickCapture = async (prompt) => {
    const res = await api.parseAiNaturalLanguage(prompt);
    await refreshAll();
    return res;
  };

  const updateProfile = async (newProfile) => {
    const result = await api.updateSettings({ profile: newProfile });
    const savedProfile = result?.profile || newProfile;
    setProfile((prev) => ({
      ...prev,
      ...savedProfile,
      avatarLetter: (savedProfile.name || prev.name).charAt(0).toUpperCase(),
    }));
  };

  const value = {
    loading,
    backendConnected,
    profile,
    updateProfile,
    stats,
    tasks,
    addTask,
    updateTask,
    toggleTask,
    deleteTask,
    notes,
    addNote,
    updateNote,
    deleteNote,
    bills,
    addBill,
    updateBill,
    toggleBillPaid,
    deleteBill,
    subscriptions,
    addSubscription,
    updateSubscription,
    toggleSubscription,
    deleteSubscription,
    documents,
    addDocument,
    updateDocument,
    deleteDocument,
    passwords,
    addPassword,
    updatePassword,
    deletePassword,
    aiInsights,
    refreshAll,
    quickCapture,
  };

  return <LifeGridContext.Provider value={value}>{children}</LifeGridContext.Provider>;
}

export function useLifeGrid() {
  const context = useContext(LifeGridContext);
  if (!context) {
    throw new Error("useLifeGrid must be used within a LifeGridProvider");
  }
  return context;
}
