import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { login, register, BACKEND_URL } from "../services/api";

export default function AuthPage() {
  const { signIn } = useAuth();
  const [tab,      setTab]      = useState("login");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [success,  setSuccess]  = useState("");
  const [showPass, setShowPass] = useState(false);
  const [lf, setLf] = useState({ username:"", password:"" });
  const [rf, setRf] = useState({ username:"", password:"", fullName:"" });

  const switchTab = (t) => { setTab(t); setError(""); setSuccess(""); };

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
    if (!rf.fullName.trim() || !rf.username.trim() || !rf.password) { setError("Please fill in all fields"); return; }
    if (rf.password.length < 6) { setError("Password must be at least 6 characters"); return; }
    setLoading(true); setError(""); setSuccess("");
    try {
      await register(rf.username.trim(), rf.password, rf.fullName.trim());
      setSuccess("Account created! Sign in now ✨");
      setLf({ username: rf.username.trim(), password: "" });
      setTimeout(() => switchTab("login"), 800);
    } catch (err) { setError(err.friendlyMessage || "Registration failed"); }
    finally { setLoading(false); }
  };

  return (
    <div className="auth-bg min-h-screen h-full flex flex-col items-center justify-center px-5 py-8 relative overflow-hidden">
      <div className="absolute -top-32 -left-32 w-80 h-80 rounded-full bg-crisp-accent/8 blur-[80px] pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-64 h-64 rounded-full bg-crisp-teal/6 blur-[60px] pointer-events-none" />

      <div className="w-full max-w-sm relative z-10 animate-slideUp">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3 mb-10">
          <div className="w-16 h-16 bg-crisp-accent rounded-3xl flex items-center justify-center shadow-accent-md">
            <span className="font-mono font-bold text-white text-2xl">C</span>
          </div>
          <div className="text-center">
            <h1 className="font-display font-bold text-3xl text-gradient tracking-tight">Crisp</h1>
            <p className="text-crisp-muted text-sm mt-1 font-body">Real-time messaging</p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-crisp-surface border border-crisp-border rounded-3xl overflow-hidden shadow-card">
          {/* Tabs */}
          <div className="flex border-b border-crisp-border">
            {["login","register"].map((t) => (
              <button key={t} onClick={() => switchTab(t)}
                className={`flex-1 py-4 font-display font-semibold text-sm transition-all duration-200 relative
                  ${tab===t ? "text-crisp-text" : "text-crisp-muted"}`}>
                {t === "login" ? "Sign In" : "Register"}
                {tab===t && <span className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-crisp-accent rounded-full" />}
              </button>
            ))}
          </div>

          <div className="p-6">
            {error && (
              <div className="mb-5 flex items-start gap-3 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-2xl animate-slideDown">
                <span className="text-red-400 text-lg flex-shrink-0">⚠</span>
                <p className="text-red-300 text-sm font-body leading-snug">{error}</p>
              </div>
            )}
            {success && (
              <div className="mb-5 flex items-center gap-3 px-4 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl animate-slideDown">
                <span className="text-emerald-400">✓</span>
                <p className="text-emerald-300 text-sm font-body">{success}</p>
              </div>
            )}

            {tab === "login" && (
              <form onSubmit={handleLogin} className="space-y-4">
                <Field label="Username" icon="👤">
                  <input className="input-field" placeholder="your_username"
                    autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck="false"
                    value={lf.username} onChange={(e) => setLf({...lf, username: e.target.value})} />
                </Field>
                <Field label="Password" icon="🔒">
                  <div className="relative">
                    <input className="input-field pr-12" type={showPass?"text":"password"}
                      placeholder="••••••••" autoComplete="current-password"
                      value={lf.password} onChange={(e) => setLf({...lf, password: e.target.value})} />
                    <button type="button" onClick={() => setShowPass(!showPass)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-crisp-muted hover:text-crisp-sub transition-colors">
                      {showPass ? <EyeOff /> : <Eye />}
                    </button>
                  </div>
                </Field>
                <button type="submit" disabled={loading} className="btn-primary w-full">
                  {loading ? <Spinner text="Signing in…" /> : "Sign In →"}
                </button>
              </form>
            )}

            {tab === "register" && (
              <form onSubmit={handleRegister} className="space-y-4">
                <Field label="Full Name" icon="✨">
                  <input className="input-field" placeholder="Alex Johnson"
                    autoComplete="name" autoCapitalize="words"
                    value={rf.fullName} onChange={(e) => setRf({...rf, fullName: e.target.value})} />
                </Field>
                <Field label="Username" icon="@">
                  <input className="input-field" placeholder="alex_j"
                    autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck="false"
                    value={rf.username} onChange={(e) => setRf({...rf, username: e.target.value.toLowerCase().replace(/\s+/g,"_")})} />
                </Field>
                <Field label="Password" icon="🔒">
                  <div className="relative">
                    <input className="input-field pr-12" type={showPass?"text":"password"}
                      placeholder="Min 6 characters" autoComplete="new-password"
                      value={rf.password} onChange={(e) => setRf({...rf, password: e.target.value})} />
                    <button type="button" onClick={() => setShowPass(!showPass)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-crisp-muted hover:text-crisp-sub transition-colors">
                      {showPass ? <EyeOff /> : <Eye />}
                    </button>
                  </div>
                  {rf.password && (
                    <div className="flex gap-1 mt-2">
                      {[1,2,3,4].map(i => (
                        <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300
                          ${rf.password.length>=i*3 ? i<=1?"bg-red-500":i<=2?"bg-amber-500":i<=3?"bg-yellow-400":"bg-green-500" : "bg-crisp-border"}`} />
                      ))}
                    </div>
                  )}
                </Field>
                <button type="submit" disabled={loading} className="btn-primary w-full">
                  {loading ? <Spinner text="Creating account…" /> : "Create Account →"}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Debug bar */}
        <div className="mt-4 px-4 py-2.5 bg-crisp-surface/60 border border-crisp-border/50 rounded-2xl flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-crisp-accent flex-shrink-0" />
          <p className="text-crisp-muted text-[11px] font-mono truncate">Backend: {BACKEND_URL}</p>
        </div>
      </div>
    </div>
  );
}

function Field({ label, icon, children }) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-xs font-display font-semibold text-crisp-sub uppercase tracking-widest mb-2.5">
        {icon && <span className="text-sm">{icon}</span>}{label}
      </label>
      {children}
    </div>
  );
}
function Spinner({ text }) {
  return (
    <span className="flex items-center justify-center gap-2">
      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
      </svg>{text}
    </span>
  );
}
const Eye    = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;
const EyeOff = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>;
