import { useState } from "react";
import { Sparkles, X, ArrowRight, CheckCircle2, AlertCircle, Bot } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useLifeGrid } from "../context/LifeGridContext";

export default function AiAssistantModal({ isOpen, onClose, onNavigate }) {
  const { quickCapture } = useLifeGrid();
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const samplePrompts = [
    "Finish DBMS project review tomorrow high priority",
    "Pay electricity bill 1450 due on 2026-10-28",
    "Add Netflix subscription 499 per month",
    "Note: Operating systems round-robin scheduling algorithms",
  ];

  async function handleCapture(textToUse) {
    const text = textToUse || prompt;
    if (!text.trim()) {
      setError("Please type a command or prompt.");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await quickCapture(text);
      setResult(res);
      setPrompt("");
    } catch (err) {
      setError(err.message || "The AI request failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="modal-overlay"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            className="ai-modal-box"
            onClick={(e) => e.stopPropagation()}
            initial={{ scale: 0.94, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            transition={{ type: "spring", damping: 25, stiffness: 350 }}
          >
            <div className="ai-modal-header">
              <div className="ai-title-wrap">
                <div className="ai-bot-avatar">
                  <Bot size={22} />
                </div>
                <div>
                  <h3>LifeGrid AI Assistant</h3>
                  <p>Natural Language Quick-Capture & Task Automation</p>
                </div>
              </div>

              <motion.button
                className="close-button"
                onClick={onClose}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <X size={18} />
              </motion.button>
            </div>

            <div className="ai-modal-body">
              <p className="ai-intro-text">
                Type anything naturally. LifeGrid AI detects your intent and automatically creates tasks, notes, bills, or subscriptions.
              </p>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleCapture();
                }}
                className="ai-input-form"
              >
                <div className="ai-input-wrap">
                  <Sparkles size={18} className="ai-sparkle-icon" />
                  <input
                    type="text"
                    placeholder="e.g., Pay wifi bill 899 tomorrow, or finish DBMS report high priority"
                    value={prompt}
                    onChange={(e) => {
                      setPrompt(e.target.value);
                      if (error) setError("");
                    }}
                    autoFocus
                    disabled={loading}
                  />
                  <motion.button
                    type="submit"
                    className="ai-submit-btn"
                    disabled={loading || !prompt.trim()}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    {loading ? "Processing..." : <ArrowRight size={16} />}
                  </motion.button>
                </div>
              </form>

              {error && (
                <div className="form-error-banner">
                  <AlertCircle size={16} />
                  <span>{error}</span>
                </div>
              )}

              {result && (
                <motion.div
                  className="ai-success-card"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                >
                  <CheckCircle2 size={20} className="ai-check-icon" />
                  <div className="ai-success-details">
                    <strong>{result.item ? "Organised Successfully!" : "A little more detail needed"}</strong>
                    <p>{result.message}</p>
                    {result.item && (
                      <motion.button
                        className="ai-view-btn"
                        onClick={() => {
                          onClose();
                          if (onNavigate && result.module) {
                            onNavigate(result.module);
                          }
                        }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        View in {result.module?.toUpperCase()} &rarr;
                      </motion.button>
                    )}
                  </div>
                </motion.div>
              )}

              <div className="sample-prompts-section">
                <span className="sample-prompts-title">Try one-click demo commands:</span>
                <div className="sample-chips">
                  {samplePrompts.map((s, idx) => (
                    <motion.button
                      key={idx}
                      type="button"
                      className="sample-chip"
                      onClick={() => {
                        setPrompt(s);
                        handleCapture(s);
                      }}
                      whileHover={{ x: 3 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      &ldquo;{s}&rdquo;
                    </motion.button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
