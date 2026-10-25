import { useState } from "react";
import { Eye, EyeOff, ArrowRight, CheckCircle2, CircleAlert } from "lucide-react";
import { useAuth } from "./context/AuthContext";
import "./auth.css";

export default function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const isSignup = mode === "signup";

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setNotice("");
    setBusy(true);
    try {
      if (isSignup) {
        await signUp(email.trim(), password);
        setNotice("Your account is ready. Welcome to LifeGrid!");
      } else {
        await signIn(email.trim(), password);
      }
    } catch (err) {
      setError(err.message || "We couldn’t complete that request. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  function switchMode(nextMode) {
    setMode(nextMode);
    setError("");
    setNotice("");
  }

  return (
    <main className="auth-shell">
      <section className="auth-art" aria-label="LifeGrid introduction">
        <a className="auth-brand" href="/" aria-label="LifeGrid home">
          <span className="auth-brand-mark">L</span>
          <span>LifeGrid</span>
        </a>
        <div className="auth-story">
          <div className="sprout-scene" aria-hidden="true">
            <span className="sprout-glow" />
            <svg className="sprout" viewBox="0 0 120 130" fill="none">
              <path d="M60 107V58" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
              <path d="M60 78C38 78 29 66 28 47C47 47 59 57 60 78Z" fill="#34D399" />
              <path d="M60 63C61 41 75 29 96 28C96 49 84 62 60 63Z" fill="#818CF8" />
              <path d="M42 108H79" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
              <circle cx="91" cy="82" r="4" fill="#FBBF24" />
              <circle cx="27" cy="95" r="3" fill="#A5B4FC" />
            </svg>
          </div>
          <p className="auth-eyebrow">A little more room to grow</p>
          <h1>Make space for what matters.</h1>
          <p className="auth-description">Bring your tasks, notes, plans, and everyday details together in one calm place.</p>
          <div className="auth-benefits">
            <span><CheckCircle2 size={17} /> A clear view of your day</span>
            <span><CheckCircle2 size={17} /> Your own private workspace</span>
          </div>
        </div>
        <p className="auth-art-footer">Small steps add up.</p>
      </section>

      <section className="auth-panel">
        <div className="auth-form-wrap">
          <p className="auth-mobile-brand">LifeGrid</p>
          <p className="auth-eyebrow">YOUR PERSONAL ORGANISER</p>
          <h2>{isSignup ? "Create your account" : "Welcome back"}</h2>
          <p className="auth-form-intro">{isSignup ? "Start with a fresh, private LifeGrid workspace." : "Sign in to pick up where you left off."}</p>

          <div className="auth-mode-tabs" role="tablist" aria-label="Account access">
            <button type="button" role="tab" aria-selected={!isSignup} className={!isSignup ? "selected" : ""} onClick={() => switchMode("login")}>Sign in</button>
            <button type="button" role="tab" aria-selected={isSignup} className={isSignup ? "selected" : ""} onClick={() => switchMode("signup")}>Create account</button>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            <label htmlFor="auth-email">Email address</label>
            <input id="auth-email" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} required maxLength={254} />

            <div className="auth-label-row">
              <label htmlFor="auth-password">Password</label>
              {isSignup && <span>12 characters minimum</span>}
            </div>
            <div className="auth-password-input">
              <input id="auth-password" type={showPassword ? "text" : "password"} autoComplete={isSignup ? "new-password" : "current-password"} placeholder={isSignup ? "Create a strong password" : "Enter your password"} value={password} onChange={(event) => setPassword(event.target.value)} required minLength={isSignup ? 12 : 1} maxLength={128} />
              <button type="button" className="password-visibility" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
            </div>

            {!isSignup && <p className="auth-reset-note">Password reset needs an email service, which has not been connected yet.</p>}

            {error && <div className="auth-message error" role="alert"><CircleAlert size={17} />{error}</div>}
            {notice && <div className="auth-message success" role="status"><CheckCircle2 size={17} />{notice}</div>}
            <button className="auth-submit" type="submit" disabled={busy}>
              {busy ? "Please wait…" : isSignup ? "Create my account" : "Sign in"}
              {!busy && <ArrowRight size={18} />}
            </button>
          </form>

          <p className="auth-privacy">Your account keeps your organiser data private to you.</p>
        </div>
      </section>
    </main>
  );
}
