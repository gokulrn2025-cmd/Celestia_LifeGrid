export function generateSmartInsights(db) {
  const insights = [];
  const today = new Date().toISOString().split("T")[0];

  // 1. Bill Insights
  const pendingBills = (db.bills || []).filter((b) => !b.paid);
  const urgentBills = pendingBills.filter((b) => {
    if (!b.dueDate || b.dueDate === "No date") return false;
    const diffDays = Math.ceil((new Date(b.dueDate) - new Date(today)) / (1000 * 60 * 60 * 24));
    return diffDays <= 7;
  });

  if (urgentBills.length > 0) {
    const totalUrgent = urgentBills.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
    insights.push({
      id: "insight-bill-urgent",
      type: "warning",
      number: "01",
      title: "Upcoming Bill Due",
      description: `${urgentBills[0].name} (₹${urgentBills[0].amount}) is due ${urgentBills[0].dueDate === today ? "today" : `on ${urgentBills[0].dueDate}`}. Total pending this week: ₹${totalUrgent.toLocaleString("en-IN")}.`,
      action: "bills",
    });
  } else if (pendingBills.length > 0) {
    const totalPending = pendingBills.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
    insights.push({
      id: "insight-bill-all",
      type: "info",
      number: "01",
      title: "Bill Overview",
      description: `You have ${pendingBills.length} unpaid bill(s) totaling ₹${totalPending.toLocaleString("en-IN")}. All clear for the immediate 48 hours.`,
      action: "bills",
    });
  } else {
    insights.push({
      id: "insight-bill-clean",
      type: "success",
      number: "01",
      title: "Bills Clear",
      description: "Great financial discipline! All current bills are marked as paid.",
      action: "bills",
    });
  }

  // 2. Task Insights
  const pendingTasks = (db.tasks || []).filter((t) => !t.completed);
  const highPriority = pendingTasks.filter((t) => t.priority === "High");

  if (highPriority.length > 0) {
    insights.push({
      id: "insight-task-priority",
      type: "alert",
      number: "02",
      title: "High Priority Focus",
      description: `You have ${highPriority.length} high-priority task(s) awaiting completion: "${highPriority[0].title}". Prioritise tackling this first.`,
      action: "tasks",
    });
  } else if (pendingTasks.length > 0) {
    insights.push({
      id: "insight-task-pace",
      type: "info",
      number: "02",
      title: "Tasks On Track",
      description: `You have ${pendingTasks.length} pending task(s) with manageable priority. Steady progress today will clear your backlog.`,
      action: "tasks",
    });
  } else {
    insights.push({
      id: "insight-task-done",
      type: "success",
      number: "02",
      title: "Inbox Zero",
      description: "All tasks are complete! Add new goals to keep your momentum going.",
      action: "tasks",
    });
  }

  // 3. Subscription & Budget Insights
  const activeSubs = (db.subscriptions || []).filter((s) => s.active);
  const monthlySubCost = activeSubs.reduce((acc, s) => {
    const amt = Number(s.amount || 0);
    return acc + (s.billingCycle === "Yearly" ? Math.round(amt / 12) : amt);
  }, 0);

  if (activeSubs.length > 0) {
    insights.push({
      id: "insight-sub-spend",
      type: "tip",
      number: "03",
      title: "Subscription Burn Rate",
      description: `Active subscriptions total ₹${monthlySubCost.toLocaleString("en-IN")}/month across ${activeSubs.length} services. Review under-utilised tools to trim monthly expenses.`,
      action: "subscriptions",
    });
  }

  return insights;
}

export function parseNaturalLanguage(input) {
  const text = (input || "").trim();
  const lower = text.toLowerCase();
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  // Detect Bill
  if (lower.includes("bill") || lower.includes("electricity") || lower.includes("water") || lower.includes("wifi") || lower.includes("internet fee")) {
    const amountMatch = text.match(/(?:₹|rs\.?|inr)?\s*(\d+(?:,\d+)*(?:\.\d+)?)/i);
    const amount = amountMatch ? Number(amountMatch[1].replace(/,/g, "")) : 500;

    // Clean name
    let name = text.replace(/(?:add|create|new|pay)\s+(?:a\s+)?/i, "")
                   .replace(/(?:due|amount|of|for|rs\.?|inr|₹)\s*\d+/ig, "")
                   .replace(/(?:today|tomorrow|on\s+\S+)/ig, "")
                   .trim();
    if (!name || name.length < 3) name = "Monthly Utility Bill";

    return {
      module: "bills",
      item: {
        name: name.charAt(0).toUpperCase() + name.slice(1),
        amount: amount,
        dueDate: lower.includes("tomorrow") ? tomorrow : todayStr,
        category: lower.includes("wifi") || lower.includes("internet") ? "Internet" : "Utilities",
        paid: false,
      },
      message: `Identified Bill: "${name}" for ₹${amount}`,
    };
  }

  // Detect Subscription
  if (lower.includes("subscription") || lower.includes("spotify") || lower.includes("netflix") || lower.includes("prime") || lower.includes("per month") || lower.includes("/month")) {
    const amountMatch = text.match(/(?:₹|rs\.?|inr)?\s*(\d+(?:,\d+)*(?:\.\d+)?)/i);
    const amount = amountMatch ? Number(amountMatch[1].replace(/,/g, "")) : 199;

    let name = text.replace(/(?:add|create|new|subscription)\s+/ig, "")
                   .replace(/(?:amount|of|for|rs\.?|inr|₹|\/month|per\s+month)\s*\d*/ig, "")
                   .trim();
    if (!name || name.length < 3) name = "Digital Subscription";

    return {
      module: "subscriptions",
      item: {
        name: name.charAt(0).toUpperCase() + name.slice(1),
        amount: amount,
        billingCycle: "Monthly",
        renewal: tomorrow,
        category: "Entertainment",
        active: true,
      },
      message: `Identified Subscription: "${name}" at ₹${amount}/month`,
    };
  }

  // Detect Note
  if (lower.startsWith("note:") || lower.startsWith("note ") || lower.includes("write note") || lower.includes("remember that") || lower.includes("take note")) {
    const cleanContent = text.replace(/^(?:note:\s*|note\s+|take\s+note\s+|write\s+note\s+)/i, "").trim();
    const parts = cleanContent.split(/[-–—:]/);
    const title = parts.length > 1 ? parts[0].trim() : cleanContent.slice(0, 30);
    const content = parts.length > 1 ? parts.slice(1).join(" - ").trim() : cleanContent;

    return {
      module: "notes",
      item: {
        title: title || "Quick Note",
        content: content || cleanContent,
        category: "Ideas",
        updatedAt: new Date().toISOString(),
      },
      message: `Identified Note: "${title}"`,
    };
  }

  // Default: Task
  let priority = "Medium";
  if (lower.includes("high priority") || lower.includes("urgent") || lower.includes("asap") || lower.includes("important")) {
    priority = "High";
  } else if (lower.includes("low priority") || lower.includes("someday") || lower.includes("whenever")) {
    priority = "Low";
  }

  let dueDate = "Today";
  if (lower.includes("tomorrow")) {
    dueDate = tomorrow;
  } else if (lower.includes("today")) {
    dueDate = todayStr;
  } else {
    const dateMatch = text.match(/\b\d{4}-\d{2}-\d{2}\b/);
    if (dateMatch) dueDate = dateMatch[0];
  }

  let title = text.replace(/(?:add|create|new|schedule)\s+(?:task\s+)?/i, "")
                  .replace(/(?:high|medium|low)\s+priority/ig, "")
                  .replace(/(?:due\s+)?(?:today|tomorrow|\d{4}-\d{2}-\d{2})/ig, "")
                  .replace(/(?:urgent|asap|important)/ig, "")
                  .trim();
  if (!title) title = text;

  return {
    module: "tasks",
    item: {
      title: title.charAt(0).toUpperCase() + title.slice(1),
      dueDate: dueDate,
      priority: priority,
      category: "Personal",
      completed: false,
      createdAt: new Date().toISOString(),
    },
    message: `Identified Task: "${title}" (${priority} priority)`,
  };
}
