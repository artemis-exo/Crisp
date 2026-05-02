import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { login, register, BACKEND_URL } from "../services/api";

// ─── Animated Crisp Logo ──────────────────────────────────────────────────────
function CrispLogo({ tab }) {
  const [hovered, setHovered] = useState(false);
  const isLogin = tab === "login";

  return (
    <div className="flex flex-col items-center gap-4 mb-8 select-none"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}>

      {/* Logo mark — animated rings + icon */}
      <div className="relative flex items-center justify-center">
        {/* Outer pulse ring */}
        <div className={`absolute w-24 h-24 rounded-full border transition-all duration-700
          ${hovered ? "border-crisp-accent/40 scale-110" : "border-crisp-accent/10 scale-100"}`} />
        {/* Middle ring */}
        <div className={`absolute w-20 h-20 rounded-full border transition-all duration-500
          ${hovered ? "border-crisp-teal/30 scale-105" : "border-crisp-accent/15 scale-100"}`} />

        {/* Main icon container */}
        <div className={`relative w-16 h-16 rounded-3xl flex items-center justify-center
          transition-all duration-500 cursor-pointer
          ${hovered ? "scale-110 rotate-6" : "scale-100 rotate-0"}
          ${isLogin
            ? "bg-gradient-to-br from-crisp-accent to-crisp-accentDk shadow-accent-md"
            : "bg-gradient-to-br from-crisp-teal to-crisp-accent shadow-[0_4px_20px_rgba(34,211,200,0.3)]"
          }`}>

          {/* Animated chat bubble icon */}
          <svg className={`transition-all duration-500 ${hovered ? "scale-90" : "scale-100"}`}
            width="28" height="28" viewBox="0 0 24 24" fill="none">
            {isLogin ? (
              // Login: single chat bubble with lightning bolt
              <>
                <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8
                  a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3
                  13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </>
            ) : (
              // Register: two overlapping bubbles
              <>
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"
                  stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </>
            )}
          </svg>

          {/* Shimmer overlay */}
          <div className={`absolute inset-0 rounded-3xl bg-gradient-to-tr from-white/20 to-transparent
            transition-opacity duration-500 ${hovered ? "opacity-100" : "opacity-0"}`} />
        </div>

        {/* Floating dots */}
        {[0,1,2].map((i) => (
          <div key={i}
            className={`absolute w-1.5 h-1.5 rounded-full transition-all duration-700
              ${isLogin ? "bg-crisp-accent" : "bg-crisp-teal"}
              ${hovered ? "opacity-80" : "opacity-30"}`}
            style={{
              top:  `${[2, 70, 50][i]}%`,
              left: `${[70, 15, 85][i]}%`,
              transform: hovered
                ? `translate(${[8,-8,6][i]}px, ${[-8,6,-4][i]}px) scale(1.5)`
                : "translate(0,0) scale(1)",
              transitionDelay: `${i * 80}ms`,
            }} />
        ))}
      </div>

      {/* App name */}
      <div className="text-center">
        <h1 className={`font-display font-bold text-3xl tracking-tight transition-all duration-500
          ${isLogin ? "text-gradient" : "bg-gradient-to-r from-crisp-teal to-crisp-accent2 bg-clip-text"}`}
          style={{ WebkitTextFillColor: "transparent", WebkitBackgroundClip: "text" }}>
          Crisp
        </h1>
        <p className={`text-sm mt-1 font-body transition-all duration-500
          ${hovered ? "text-crisp-sub" : "text-crisp-muted"}`}>
          {isLogin ? "Welcome back 👋" : "Join the conversation ✨"}
        </p>
      </div>
    </div>
  );
}

// ─── Main Auth Page ───────────────────────────────────────────────────────────
export default function AuthPage() {
  const { signIn } = useAuth();
  const [tab,      setTab]      = useState("login");
  const [sliding,  setSliding]  = useState(false);
  const [direction,setDirection]= useState(""); // "left" | "right"
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [success,  setSuccess]  = useState("");
  const [showPass, setShowPass] = useState(false);
  const [lf, setLf] = useState({ username: "", password: "" });
  const [rf, setRf] = useState({ username: "", password: "", fullName: "" });

  // Touch/swipe state
  const touchStartX = useRef(null);
  const cardRef     = useRef(null);

  const switchTab = (newTab) => {
    if (newTab === tab || sliding) return;
    const dir = newTab === "register" ? "left" : "right";
    setDirection(dir);
    setSliding(true);
    setError(""); setSuccess("");
    setTimeout(() => { setTab(newTab); setSliding(false); }, 320);
  };

  // Touch swipe handlers
  const onTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; };
  const onTouchEnd   = (e) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0 && tab === "login")    switchTab("register");
      if (diff < 0 && tab === "register") switchTab("login");
    }
    touchStartX.current = null;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!lf.username.trim() || !lf.password) { setError("Please fill in all fields"); return; }
    setLoading(true); setError("");
    try {
      const { data } = await login(lf.username.trim(), lf.password);
      signIn(data.token, data.username);
    } catch (err) { setError(err.friendlyMessage || "Login failed"); }
    finally { setLoading(false); }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!rf.fullName.trim() || !rf.username.trim() || !rf.password)
      { setError("Please fill in all fields"); return; }
    if (rf.password.length < 6)
      { setError("Password must be at least 6 characters"); return; }
    setLoading(true); setError(""); setSuccess("");
    try {
      await register(rf.username.trim(), rf.password, rf.fullName.trim());
      setSuccess("Account created! Signing you in…");
      setLf({ username: rf.username.trim(), password: "" });
      setTimeout(() => switchTab("login"), 900);
    } catch (err) { setError(err.friendlyMessage || "Registration failed"); }
    finally { setLoading(false); }
  };

  const slideClass = sliding
    ? direction === "left"
      ? "translate-x-[-8%] opacity-0"
      : "translate-x-[8%] opacity-0"
    : "translate-x-0 opacity-100";

  return (
    <div className="auth-bg min-h-screen h-full flex flex-col items-center justify-center
      px-5 py-6 relative overflow-hidden">

      {/* Ambient orbs */}
      <div className={`absolute w-96 h-96 rounded-full blur-[100px] pointer-events-none
        transition-all duration-1000 top-[-120px] left-[-120px]
        ${tab === "login" ? "bg-crisp-accent/10" : "bg-crisp-teal/8"}`} />
      <div className={`absolute w-72 h-72 rounded-full blur-[80px] pointer-events-none
        transition-all duration-1000 bottom-[-80px] right-[-80px]
        ${tab === "login" ? "bg-crisp-teal/6" : "bg-crisp-accent/10"}`} />

      {/* Floating particles */}
      {[...Array(8)].map((_, i) => (
        <div key={i}
          className={`absolute rounded-full pointer-events-none transition-all duration-1000
            ${tab === "login" ? "bg-crisp-accent/20" : "bg-crisp-teal/20"}`}
          style={{
            width:  `${[4,3,5,3,4,6,3,4][i]}px`,
            height: `${[4,3,5,3,4,6,3,4][i]}px`,
            left:   `${[10,80,25,70,45,15,90,55][i]}%`,
            top:    `${[15,20,75,65,35,50,45,85][i]}%`,
            animation: `float ${2.5 + i * 0.4}s ease-in-out ${i * 0.3}s infinite`,
          }} />
      ))}

      <div className="w-full max-w-sm relative z-10 animate-slideUp">

        {/* Logo */}
        <CrispLogo tab={tab} />

        {/* ── Tab switcher ──────────────────────────────────────────────── */}
        <div className="flex bg-crisp-card border border-crisp-border rounded-2xl p-1 mb-4 relative">
          {/* Sliding indicator pill */}
          <div className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-xl
            transition-all duration-300 ease-out
            ${tab === "login"
              ? "left-1 bg-crisp-accent shadow-accent-sm"
              : "left-[calc(50%+3px)] bg-gradient-to-r from-crisp-accent to-crisp-teal shadow-[0_2px_8px_rgba(34,211,200,0.25)]"
            }`} />
          {[["login","Sign In"],["register","Register"]].map(([t, label]) => (
            <button key={t} onClick={() => switchTab(t)}
              className={`flex-1 py-3 rounded-xl font-display font-semibold text-sm
                relative z-10 transition-all duration-300 touch-manipulation
                ${tab === t ? "text-white" : "text-crisp-muted hover:text-crisp-sub"}`}>
              {label}
            </button>
          ))}
        </div>

        {/* Swipe hint — shown once */}
        <p className="text-center text-crisp-muted/40 text-[10px] font-mono mb-3 tracking-wider">
          ← swipe to switch →
        </p>

        {/* ── Card with slide animation ─────────────────────────────────── */}
        <div
          ref={cardRef}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          className={`bg-crisp-surface border rounded-3xl overflow-hidden shadow-card
            transition-all duration-300 ease-out
            ${tab === "login" ? "border-crisp-border" : "border-crisp-teal/20"}
            ${slideClass}`}>

          {/* Top accent bar */}
          <div className={`h-0.5 w-full transition-all duration-500
            ${tab === "login"
              ? "bg-gradient-to-r from-crisp-accent via-crisp-accent2 to-transparent"
              : "bg-gradient-to-r from-crisp-teal via-crisp-accent to-transparent"}`} />

          <div className="p-6">

            {/* Alerts */}
            {error && (
              <div className="mb-5 flex items-start gap-3 px-4 py-3 bg-red-500/10
                border border-red-500/20 rounded-2xl animate-slideDown">
                <span className="text-red-400 text-base flex-shrink-0 mt-0.5">⚠</span>
                <p className="text-red-300 text-sm font-body leading-snug">{error}</p>
              </div>
            )}
            {success && (
              <div className="mb-5 flex items-center gap-3 px-4 py-3 bg-emerald-500/10
                border border-emerald-500/20 rounded-2xl animate-slideDown">
                <span className="text-emerald-400 text-base">✓</span>
                <p className="text-emerald-300 text-sm font-body">{success}</p>
              </div>
            )}

            {/* ── LOGIN FORM ─────────────────────────────────────────────── */}
            {tab === "login" && (
              <form onSubmit={handleLogin} className="space-y-4">
                <Field label="Username" icon="👤">
                  <input className="input-field" placeholder="your_username"
                    autoComplete="username" autoCapitalize="none"
                    autoCorrect="off" spellCheck="false"
                    value={lf.username}
                    onChange={(e) => setLf({ ...lf, username: e.target.value })} />
                </Field>
                <Field label="Password" icon="🔒">
                  <PasswordInput
                    value={lf.password}
                    onChange={(v) => setLf({ ...lf, password: v })}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    show={showPass}
                    onToggle={() => setShowPass(!showPass)} />
                </Field>
                <button type="submit" disabled={loading}
                  className={`btn-primary w-full mt-2 transition-all duration-300
                    ${loading ? "" : "hover:shadow-accent-md hover:-translate-y-0.5"}`}>
                  {loading ? <Spinner text="Signing in…" /> : (
                    <span className="flex items-center justify-center gap-2">
                      Sign In
                      <svg className="w-4 h-4 transition-transform group-hover:translate-x-1"
                        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path d="M5 12h14M12 5l7 7-7 7"/>
                      </svg>
                    </span>
                  )}
                </button>

                {/* Switch to register */}
                <p className="text-center text-xs text-crisp-muted font-body pt-1">
                  Don't have an account?{" "}
                  <button type="button" onClick={() => switchTab("register")}
                    className="text-crisp-accent2 font-semibold hover:text-crisp-accent transition-colors">
                    Register
                  </button>
                </p>
              </form>
            )}

            {/* ── REGISTER FORM ──────────────────────────────────────────── */}
            {tab === "register" && (
              <form onSubmit={handleRegister} className="space-y-4">
                <Field label="Full Name" icon="✨">
                  <input className="input-field" placeholder="Alex Johnson"
                    autoComplete="name" autoCapitalize="words"
                    value={rf.fullName}
                    onChange={(e) => setRf({ ...rf, fullName: e.target.value })} />
                </Field>
                <Field label="Username" icon="@">
                  <input className="input-field" placeholder="alex_j"
                    autoComplete="username" autoCapitalize="none"
                    autoCorrect="off" spellCheck="false"
                    value={rf.username}
                    onChange={(e) => setRf({ ...rf, username: e.target.value.toLowerCase().replace(/\s+/g, "_") })} />
                </Field>
                <Field label="Password" icon="🔒">
                  <PasswordInput
                    value={rf.password}
                    onChange={(v) => setRf({ ...rf, password: v })}
                    placeholder="Min 6 characters"
                    autoComplete="new-password"
                    show={showPass}
                    onToggle={() => setShowPass(!showPass)} />
                  {/* Password strength */}
                  {rf.password && (
                    <div className="mt-2">
                      <div className="flex gap-1">
                        {[1,2,3,4].map(i => (
                          <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300
                            ${rf.password.length >= i*3
                              ? i<=1?"bg-red-500":i<=2?"bg-amber-500":i<=3?"bg-yellow-400":"bg-green-500"
                              : "bg-crisp-border"}`} />
                        ))}
                      </div>
                      <p className={`text-[10px] font-mono mt-1 transition-colors
                        ${rf.password.length < 6 ? "text-red-400"
                          : rf.password.length < 9 ? "text-amber-400"
                          : "text-green-400"}`}>
                        {rf.password.length < 6 ? "Too short"
                          : rf.password.length < 9 ? "Fair"
                          : rf.password.length < 12 ? "Good"
                          : "Strong 💪"}
                      </p>
                    </div>
                  )}
                </Field>
                <button type="submit" disabled={loading}
                  className={`w-full py-3.5 rounded-2xl font-display font-semibold text-sm
                    text-white transition-all duration-300 active:scale-95
                    disabled:opacity-40 disabled:cursor-not-allowed
                    ${loading ? "bg-crisp-accent" : "bg-gradient-to-r from-crisp-accent to-crisp-teal hover:shadow-[0_4px_20px_rgba(34,211,200,0.3)] hover:-translate-y-0.5"}`}>
                  {loading ? <Spinner text="Creating account…" /> : (
                    <span className="flex items-center justify-center gap-2">
                      Create Account
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24"
                        stroke="currentColor" strokeWidth={2.5}>
                        <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/>
                        <circle cx="9" cy="7" r="4"/>
                        <line x1="19" y1="8" x2="19" y2="14"/>
                        <line x1="22" y1="11" x2="16" y2="11"/>
                      </svg>
                    </span>
                  )}
                </button>

                {/* Switch to login */}
                <p className="text-center text-xs text-crisp-muted font-body pt-1">
                  Already have an account?{" "}
                  <button type="button" onClick={() => switchTab("login")}
                    className="text-crisp-teal font-semibold hover:text-crisp-accent transition-colors">
                    Sign In
                  </button>
                </p>
              </form>
            )}
          </div>
        </div>

        {/* Debug bar */}
        <div className="mt-4 px-4 py-2.5 bg-crisp-surface/60 border border-crisp-border/50
          rounded-2xl flex items-center gap-2">
          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 transition-colors duration-500
            ${tab === "login" ? "bg-crisp-accent" : "bg-crisp-teal"}`} />
          <p className="text-crisp-muted text-[11px] font-mono truncate">Backend: {BACKEND_URL}</p>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────
function Field({ label, icon, children }) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-xs font-display font-semibold
        text-crisp-sub uppercase tracking-widest mb-2.5">
        {icon && <span className="text-sm">{icon}</span>}
        {label}
      </label>
      {children}
    </div>
  );
}

function PasswordInput({ value, onChange, placeholder, autoComplete, show, onToggle }) {
  return (
    <div className="relative">
      <input
        className="input-field pr-12"
        type={show ? "text" : "password"}
        placeholder={placeholder}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)} />
      <button type="button" onClick={onToggle}
        className="absolute right-4 top-1/2 -translate-y-1/2 text-crisp-muted
          hover:text-crisp-sub transition-colors p-1">
        {show ? <EyeOff /> : <Eye />}
      </button>
    </div>
  );
}

function Spinner({ text }) {
  return (
    <span className="flex items-center justify-center gap-2">
      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
      </svg>
      {text}
    </span>
  );
}

const Eye = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);
const EyeOff = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0
      0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0
      0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);
