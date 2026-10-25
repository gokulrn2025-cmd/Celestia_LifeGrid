import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowUp, Check, Plus, Sparkles, WandSparkles } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { api } from "../services/api";
import { useLifeGrid } from "../context/LifeGridContext";
import "./AiAssistantPage.css";

const suggestions = [
  { icon: "✦", title: "Plan my study week", prompt: "Help me make a simple study plan for the week." },
  { icon: "☼", title: "Break down a big task", prompt: "How can I break a big assignment into smaller steps?" },
  { icon: "♡", title: "Add a task", prompt: "Add a task: finish my DBMS seminar tomorrow, high priority." },
  { icon: "✎", title: "Save a note", prompt: "Create a note: project ideas — keep the interface clear and easy to use." },
];

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function AiAssistantPage({ profile, onNavigate }) {
  const { refreshAll } = useLifeGrid();
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function sendMessage(message = draft) {
    const text = message.trim();
    if (!text || loading) return;
    const history = messages.slice(-8).map(({ role, content }) => ({ role, content }));
    const userMessage = { id: makeId(), role: "user", content: text };
    setMessages((current) => [...current, userMessage]);
    setDraft("");
    setLoading(true);

    try {
      const result = await api.sendAiChat(text, history);
      setMessages((current) => [...current, {
        id: makeId(),
        role: "assistant",
        content: result.reply,
        created: result.created,
      }]);
      if (result.created) await refreshAll();
    } catch (err) {
      const detail = err.message || "Please try again in a moment.";
      setMessages((current) => [...current, {
        id: makeId(),
        role: "assistant",
        content: detail,
        isError: true,
      }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  function startNewChat() {
    setMessages([]);
    setDraft("");
    inputRef.current?.focus();
  }

  const hasMessages = messages.length > 0;

  return (
    <motion.div
      className="assistant-page"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
    >
      <section className="assistant-chat-shell">
        <header className="assistant-chat-header">
          <div className="assistant-brand-lockup">
            <motion.div
              className="assistant-brand-icon"
              animate={{ rotate: [0, -7, 7, 0], scale: [1, 1.05, 1] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            >
              <Sparkles size={20} />
            </motion.div>
            <div>
              <div className="assistant-title-line">
                <h1>LifeGrid AI</h1>
                <span className="assistant-live-pill"><i /> AI chat</span>
              </div>
              <p>Your friendly planning sidekick</p>
            </div>
          </div>
          <div className="assistant-header-actions">
            <button type="button" className="assistant-new-chat" onClick={startNewChat}>
              <Plus size={16} /> <span>New chat</span>
            </button>
            <button type="button" className="assistant-back-link" onClick={() => onNavigate("dashboard")}>
              <ArrowLeft size={16} /> <span>Dashboard</span>
            </button>
          </div>
        </header>

        <div className={`assistant-conversation ${hasMessages ? "has-messages" : "is-empty"}`} ref={scrollRef}>
          {!hasMessages ? (
            <motion.div
              className="assistant-welcome"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.1 }}
            >
              <motion.div
                className="assistant-welcome-orbit"
                animate={{ rotate: 360 }}
                transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
                aria-hidden="true"
              >
                <span className="orbit-dot orbit-dot-one">✦</span>
                <span className="orbit-dot orbit-dot-two">♡</span>
                <span className="orbit-dot orbit-dot-three">✿</span>
              </motion.div>
              <div className="assistant-welcome-icon"><WandSparkles size={28} /></div>
              <span className="assistant-kicker">A little help goes a long way</span>
              <h2>Hey{profile?.name ? `, ${profile.name}` : " there"} <span className="assistant-wave">👋</span></h2>
              <p>What would make today feel easier? Ask for ideas, a plan, or tell me to save something in LifeGrid.</p>
              <div className="assistant-suggestion-grid">
                {suggestions.map((suggestion, index) => (
                  <motion.button
                    type="button"
                    key={suggestion.title}
                    className="assistant-suggestion-card"
                    onClick={() => sendMessage(suggestion.prompt)}
                    whileHover={{ y: -4, rotate: index % 2 ? 0.4 : -0.4 }}
                    whileTap={{ scale: 0.97 }}
                    transition={{ type: "spring", stiffness: 350, damping: 22 }}
                  >
                    <span className={`suggestion-icon suggestion-icon-${index}`}>{suggestion.icon}</span>
                    <span>{suggestion.title}</span>
                    <ArrowUp size={15} />
                  </motion.button>
                ))}
              </div>
            </motion.div>
          ) : (
            <div className="assistant-message-list">
              <AnimatePresence initial={false}>
                {messages.map((message) => (
                  <motion.article
                    className={`assistant-message assistant-message-${message.role} ${message.isError ? "assistant-message-error" : ""}`}
                    key={message.id}
                    initial={{ opacity: 0, y: 12, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ type: "spring", stiffness: 280, damping: 24 }}
                    layout
                  >
                    {message.role === "assistant" && <div className="assistant-message-avatar"><Sparkles size={15} /></div>}
                    <div className="assistant-message-content">
                      <span className="assistant-message-name">{message.role === "assistant" ? "LifeGrid AI" : "You"}</span>
                      <p>{message.content}</p>
                      {message.created && (
                        <div className="assistant-created-card">
                          <span className="assistant-created-check"><Check size={14} /></span>
                          <div>
                            <small>Added to {message.created.module}</small>
                            <strong>{message.created.item.title || message.created.item.name}</strong>
                          </div>
                          <button type="button" onClick={() => onNavigate(message.created.module)}>Open <ArrowUp size={13} /></button>
                        </div>
                      )}
                    </div>
                    {message.role === "user" && <div className="assistant-user-avatar">{profile?.avatarLetter || "Y"}</div>}
                  </motion.article>
                ))}
              </AnimatePresence>
              {loading && (
                <motion.div
                  className="assistant-thinking-row"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="assistant-message-avatar"><Sparkles size={15} /></div>
                  <div className="assistant-thinking-bubble" aria-label="LifeGrid AI is thinking">
                    <span /><span /><span />
                  </div>
                  <span>thinking up something helpful</span>
                </motion.div>
              )}
              <div className="assistant-scroll-anchor" />
            </div>
          )}
        </div>

        <footer className="assistant-composer-area">
          <form
            className="assistant-composer"
            onSubmit={(event) => {
              event.preventDefault();
              sendMessage();
            }}
          >
            <textarea
              ref={inputRef}
              value={draft}
              maxLength={2000}
              rows={1}
              placeholder="Ask me anything, or tell me what to add…"
              aria-label="Message LifeGrid AI"
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  sendMessage();
                }
              }}
              disabled={loading}
            />
            <motion.button
              className="assistant-send-button"
              type="submit"
              aria-label="Send message"
              disabled={loading || !draft.trim()}
              whileHover={!loading && draft.trim() ? { scale: 1.06, rotate: -4 } : undefined}
              whileTap={!loading && draft.trim() ? { scale: 0.92 } : undefined}
            >
              <ArrowUp size={19} />
            </motion.button>
          </form>
          <div className="assistant-composer-footnote">
            <span><Sparkles size={12} /> Powered by Gemini</span>
            <span>Your saved organiser data and vault aren’t sent with chat messages.</span>
          </div>
        </footer>
      </section>
    </motion.div>
  );
}
