const API_BASE = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");

async function request(path, options = {}) {
  const headers = { ...(options.body ? { "Content-Type": "application/json" } : {}), ...options.headers };
  const response = await fetch(`${API_BASE}${path}`, { credentials: "include", ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (response.status === 401 && !path.startsWith("/auth/")) {
    window.dispatchEvent(new Event("lifegrid:session-expired"));
  }
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data;
}

const json = (method, body) => ({ method, body: JSON.stringify(body) });
const crud = (resource) => {
  const singular = resource.endsWith("s") ? resource.slice(0, -1) : resource;
  return {
  [`get${resource[0].toUpperCase()}${resource.slice(1)}`]: () => request(`/${resource}`),
  [`create${singular[0].toUpperCase()}${singular.slice(1)}`]: (item) => request(`/${resource}`, json("POST", item)),
  [`update${singular[0].toUpperCase()}${singular.slice(1)}`]: (id, item) => request(`/${resource}/${id}`, json("PUT", item)),
  [`delete${singular[0].toUpperCase()}${singular.slice(1)}`]: (id) => request(`/${resource}/${id}`, { method: "DELETE" }),
  };
};

export const api = {
  request,
  async getHealth() {
    try { return await request("/health"); }
    catch { return { status: "offline", app: "LifeGrid" }; }
  },
  getCurrentUser: () => request("/auth/me"),
  signup: (email, password) => request("/auth/signup", json("POST", { email, password })),
  login: (email, password) => request("/auth/login", json("POST", { email, password })),
  logout: () => request("/auth/logout", { method: "POST" }),
  getStats: () => request("/stats"),
  getAiInsights: () => request("/ai/insights"),
  parseAiNaturalLanguage: (prompt) => request("/ai/parse", json("POST", { prompt })),
  sendAiChat: (message, history = []) => request("/ai/chat", json("POST", { message, history })),
  ...crud("tasks"),
  ...crud("notes"),
  ...crud("bills"),
  ...crud("subscriptions"),
  ...crud("documents"),
  ...crud("vault"),
  getSettings: () => request("/settings"),
  updateSettings: (data) => request("/settings", json("POST", data)),
};
