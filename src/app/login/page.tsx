'use client';

import { useState, useEffect } from 'react';
import { login, registerUser } from '@/actions/auth';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck, ArrowRight, Lock, User, Loader2,
  Building2, CheckCircle2, Clock, Eye, EyeOff, Sparkles, Mail,
} from 'lucide-react';

type Tab = 'login' | 'signup';

const DEPARTMENTS = [
  'Front Desk / Reception',
  'Housekeeping',
  'Finance & Accounting',
  'Food & Beverage',
  'Management',
  'IT / Administration',
  'Other',
];

/* ─── Floating Particle ─── */
function Particle({ delay, x, size }: { delay: number; x: string; size: number }) {
  return (
    <motion.div
      className="absolute bottom-0 rounded-full pointer-events-none"
      style={{ left: x, width: size, height: size, background: 'rgba(99,102,241,0.35)' }}
      initial={{ y: 0, opacity: 0 }}
      animate={{ y: [0, -600], opacity: [0, 0.7, 0] }}
      transition={{ duration: 6 + Math.random() * 4, delay, repeat: Infinity, ease: 'easeOut' }}
    />
  );
}

export default function LoginPage() {
  const [tab, setTab] = useState<Tab>('login');

  // Login state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Signup state
  const [sFullName, setSFullName] = useState('');
  const [sEmail, setSEmail] = useState('');
  const [sPassword, setSPassword] = useState('');
  const [sConfirm, setSConfirm] = useState('');
  const [sDept, setSDept] = useState('');
  const [showSPass, setShowSPass] = useState(false);
  const [sLoading, setSLoading] = useState(false);
  const [sError, setSError] = useState<string | null>(null);
  const [sSuccess, setSSuccess] = useState(false);

  // Animated dots for "pending" status
  const [dots, setDots] = useState('');
  useEffect(() => {
    const i = setInterval(() => setDots(d => d.length >= 3 ? '' : d + '.'), 500);
    return () => clearInterval(i);
  }, []);

  /* ─── LOGIN ─── */
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await login(username.trim(), password);
      if (res.success) {
        window.location.href = '/';
      } else {
        setError(res.error || 'Authentication failed');
        setLoading(false);
      }
    } catch (err: any) {
      setError(err?.message || 'Connection error. Please retry.');
      setLoading(false);
    }
  };

  /* ─── SIGNUP ─── */
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSError(null);
    if (sPassword !== sConfirm) { setSError('Passwords do not match.'); return; }
    if (sPassword.length < 8) { setSError('Password must be at least 8 characters.'); return; }
    if (!sDept) { setSError('Please select your department.'); return; }
    setSLoading(true);
    const res = await registerUser({ fullName: sFullName, email: sEmail, password: sPassword, department: sDept });
    setSLoading(false);
    if (res.success) {
      setSSuccess(true);
    } else {
      setSError(res.error || 'Registration failed.');
    }
  };

  const switchTab = (t: Tab) => {
    setTab(t);
    setError(null);
    setSError(null);
  };

  const particles = Array.from({ length: 12 }, (_, i) => ({
    delay: i * 0.7,
    x: `${8 + i * 7}%`,
    size: 4 + (i % 4) * 3,
  }));

  return (
    <div className="login-page-root">
      {/* ── Animated Background ── */}
      <div className="login-bg-image" />
      <div className="login-orb login-orb-1" />
      <div className="login-orb login-orb-2" />
      <div className="login-orb login-orb-3" />

      {/* Floating particles */}
      {particles.map((p, i) => <Particle key={i} {...p} />)}

      {/* Grid overlay */}
      <div className="login-grid-overlay" />

      {/* ── Main Card ── */}
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="login-card-wrapper"
      >
        {/* Brand Header */}
        <div className="login-brand">
          <motion.div
            className="login-shield"
            animate={{ boxShadow: ['0 0 20px rgba(99,102,241,0.4)', '0 0 40px rgba(99,102,241,0.7)', '0 0 20px rgba(99,102,241,0.4)'] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <ShieldCheck size={28} className="text-white" />
          </motion.div>
          <div>
            <h1 className="login-brand-title">Luxury Vantage</h1>
            <p className="login-brand-sub">Property Management Suite</p>
          </div>
        </div>

        {/* Glass Card */}
        <div className="login-glass-card">
          {/* Top shimmer line */}
          <div className="login-shimmer-line" />

          {/* Tabs */}
          <div className="login-tabs">
            {(['login', 'signup'] as Tab[]).map(t => (
              <button
                key={t}
                onClick={() => switchTab(t)}
                className={`login-tab${tab === t ? ' active' : ''}`}
              >
                {t === 'login' ? 'Sign In' : 'Request Access'}
                {tab === t && (
                  <motion.div layoutId="tab-indicator" className="login-tab-indicator" />
                )}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {/* ────────────────── LOGIN PANEL ────────────────── */}
            {tab === 'login' && (
              <motion.div
                key="login"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
              >
                <form onSubmit={handleLogin} className="login-form">

                  {/* Username */}
                  <div className="lf-group">
                    <label className="lf-label">Username</label>
                    <div className="lf-input-wrap">
                      <User size={16} className="lf-icon" />
                      <input
                        id="login-username"
                        type="text"
                        value={username}
                        onChange={e => setUsername(e.target.value)}
                        required
                        className="lf-input"
                        placeholder="Enter your username"
                        autoComplete="username"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div className="lf-group">
                    <label className="lf-label">Password</label>
                    <div className="lf-input-wrap">
                      <Lock size={16} className="lf-icon" />
                      <input
                        id="login-password"
                        type={showPass ? 'text' : 'password'}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        required
                        className="lf-input"
                        placeholder="••••••••"
                        autoComplete="current-password"
                      />
                      <button type="button" onClick={() => setShowPass(p => !p)} className="lf-eye">
                        {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>

                  {/* Error / Status */}
                  <AnimatePresence>
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="lf-alert lf-alert-err"
                      >
                        <span>{error}</span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <motion.button
                    type="submit"
                    disabled={loading}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="lf-submit-btn"
                  >
                    {loading ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <>
                        <span>Sign In</span>
                        <ArrowRight size={16} />
                      </>
                    )}
                  </motion.button>

                </form>

                <p className="login-switch-hint">
                  Don&apos;t have an account?{' '}
                  <button onClick={() => switchTab('signup')} className="login-switch-link">
                    Request Access
                  </button>
                </p>
              </motion.div>
            )}

            {/* ────────────────── SIGNUP PANEL ────────────────── */}
            {tab === 'signup' && (
              <motion.div
                key="signup"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <AnimatePresence mode="wait">
                  {sSuccess ? (
                    <motion.div
                      key="success"
                      initial={{ opacity: 0, scale: 0.92 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="signup-success"
                    >
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.1 }}
                        className="signup-success-icon"
                      >
                        <CheckCircle2 size={40} />
                      </motion.div>
                      <h3 className="signup-success-title">Request Submitted!</h3>
                      <p className="signup-success-body">
                        Your access request has been sent. An administrator will review and approve your account.
                        You will be able to log in once approved.
                      </p>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => { setSSuccess(false); switchTab('login'); }}
                        className="lf-submit-btn mt-4"
                      >
                        <span>Back to Sign In</span>
                        <ArrowRight size={16} />
                      </motion.button>
                    </motion.div>
                  ) : (
                    <motion.form
                      key="form"
                      onSubmit={handleSignup}
                      className="login-form"
                      initial={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      {/* Full Name */}
                      <div className="lf-group">
                        <label className="lf-label">Full Name</label>
                        <div className="lf-input-wrap">
                          <User size={16} className="lf-icon" />
                          <input
                            id="signup-fullname"
                            type="text"
                            value={sFullName}
                            onChange={e => setSFullName(e.target.value)}
                            required
                            className="lf-input"
                            placeholder="John Doe"
                          />
                        </div>
                      </div>

                      {/* Email */}
                      <div className="lf-group">
                        <label className="lf-label">Work Email</label>
                        <div className="lf-input-wrap">
                          <Mail size={16} className="lf-icon" />
                          <input
                            id="signup-email"
                            type="email"
                            value={sEmail}
                            onChange={e => setSEmail(e.target.value)}
                            required
                            className="lf-input"
                            placeholder="you@hotel.com"
                            autoComplete="email"
                          />
                        </div>
                      </div>

                      {/* Department */}
                      <div className="lf-group">
                        <label className="lf-label">Department</label>
                        <div className="lf-input-wrap">
                          <Building2 size={16} className="lf-icon" />
                          <select
                            id="signup-dept"
                            value={sDept}
                            onChange={e => setSDept(e.target.value)}
                            className="lf-input lf-select"
                          >
                            <option value="" disabled>Select your department</option>
                            {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
                          </select>
                        </div>
                      </div>

                      {/* Two-column passwords */}
                      <div className="lf-row">
                        <div className="lf-group flex-1">
                          <label className="lf-label">Password</label>
                          <div className="lf-input-wrap">
                            <Lock size={16} className="lf-icon" />
                            <input
                              id="signup-password"
                              type={showSPass ? 'text' : 'password'}
                              value={sPassword}
                              onChange={e => setSPassword(e.target.value)}
                              required
                              className="lf-input"
                              placeholder="Min 8 chars"
                              autoComplete="new-password"
                            />
                            <button type="button" onClick={() => setShowSPass(p => !p)} className="lf-eye">
                              {showSPass ? <EyeOff size={14} /> : <Eye size={14} />}
                            </button>
                          </div>
                        </div>
                        <div className="lf-group flex-1">
                          <label className="lf-label">Confirm</label>
                          <div className="lf-input-wrap">
                            <Lock size={16} className="lf-icon" />
                            <input
                              id="signup-confirm"
                              type={showSPass ? 'text' : 'password'}
                              value={sConfirm}
                              onChange={e => setSConfirm(e.target.value)}
                              required
                              className="lf-input"
                              placeholder="Repeat"
                              autoComplete="new-password"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Password strength */}
                      {sPassword && (
                        <div className="lf-strength-row">
                          {[1, 2, 3, 4].map(lvl => (
                            <div
                              key={lvl}
                              className={`lf-strength-bar ${
                                sPassword.length >= lvl * 3
                                  ? lvl <= 1 ? 'lf-str-red' : lvl <= 2 ? 'lf-str-orange' : lvl <= 3 ? 'lf-str-yellow' : 'lf-str-green'
                                  : 'lf-str-empty'
                              }`}
                            />
                          ))}
                          <span className="lf-strength-label">
                            {sPassword.length < 4 ? 'Weak' : sPassword.length < 7 ? 'Fair' : sPassword.length < 10 ? 'Good' : 'Strong'}
                          </span>
                        </div>
                      )}

                      {/* Error */}
                      <AnimatePresence>
                        {sError && (
                          <motion.div
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="lf-alert lf-alert-err"
                          >
                            {sError}
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Notice */}
                      <div className="signup-notice">
                        <Sparkles size={13} className="text-indigo-400 shrink-0 mt-0.5" />
                        <span>Your account will be reviewed and activated by an administrator before you can log in.</span>
                      </div>

                      <motion.button
                        type="submit"
                        disabled={sLoading}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="lf-submit-btn"
                      >
                        {sLoading ? <Loader2 size={18} className="animate-spin" /> : (
                          <>
                            <span>Submit Request</span>
                            <ArrowRight size={16} />
                          </>
                        )}
                      </motion.button>

                    </motion.form>
                  )}
                </AnimatePresence>

                {!sSuccess && (
                  <p className="login-switch-hint">
                    Already have an account?{' '}
                    <button onClick={() => switchTab('login')} className="login-switch-link">
                      Sign In
                    </button>
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer status */}
        <div className="login-footer">
          <div className="login-footer-dot" />
          <span>System Online</span>
          <span className="login-footer-divider">·</span>
          <span>Argon2id Encryption</span>
          <span className="login-footer-divider">·</span>
          <span>TLS 1.3</span>
        </div>
      </motion.div>

      <style>{`
        .login-page-root {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1.5rem;
          position: relative;
          overflow: hidden;
          background: #080c1a;
          font-family: var(--font-sans, 'Inter', sans-serif);
        }

        /* BG image */
        .login-bg-image {
          position: absolute; inset: 0;
          background: url('/login-bg.png') center/cover no-repeat;
          opacity: 0.18;
          pointer-events: none;
        }

        /* Orbs */
        .login-orb {
          position: absolute;
          border-radius: 50%;
          pointer-events: none;
          filter: blur(90px);
          animation: orbFloat 8s ease-in-out infinite;
        }
        .login-orb-1 {
          width: 500px; height: 500px;
          background: radial-gradient(circle, rgba(99,102,241,0.35) 0%, transparent 70%);
          top: -120px; right: -100px;
          animation-delay: 0s;
        }
        .login-orb-2 {
          width: 400px; height: 400px;
          background: radial-gradient(circle, rgba(139,92,246,0.25) 0%, transparent 70%);
          bottom: -100px; left: -80px;
          animation-delay: 2s;
        }
        .login-orb-3 {
          width: 300px; height: 300px;
          background: radial-gradient(circle, rgba(251,191,36,0.12) 0%, transparent 70%);
          top: 40%; left: 30%;
          animation-delay: 4s;
        }
        @keyframes orbFloat {
          0%,100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-30px) scale(1.05); }
        }

        /* Grid overlay */
        .login-grid-overlay {
          position: absolute; inset: 0;
          background-image: linear-gradient(rgba(99,102,241,0.04) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(99,102,241,0.04) 1px, transparent 1px);
          background-size: 40px 40px;
          pointer-events: none;
        }

        /* Card wrapper */
        .login-card-wrapper {
          width: 100%;
          max-width: 460px;
          position: relative;
          z-index: 10;
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        /* Brand */
        .login-brand {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0 0.25rem;
        }
        .login-shield {
          width: 52px; height: 52px;
          border-radius: 14px;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 0 30px rgba(99,102,241,0.5);
          flex-shrink: 0;
        }
        .login-brand-title {
          font-size: 1.6rem;
          font-weight: 800;
          color: #fff;
          letter-spacing: -0.02em;
          line-height: 1.1;
          margin: 0;
        }
        .login-brand-sub {
          font-size: 0.8rem;
          font-weight: 600;
          color: rgba(148,163,184,0.8);
          letter-spacing: 0.08em;
          text-transform: uppercase;
          margin: 0;
        }

        /* Glass card */
        .login-glass-card {
          background: rgba(15, 20, 40, 0.72);
          backdrop-filter: blur(28px);
          -webkit-backdrop-filter: blur(28px);
          border: 1px solid rgba(99,102,241,0.25);
          border-radius: 20px;
          padding: 2rem;
          box-shadow: 0 32px 64px rgba(0,0,0,0.45),
                      inset 0 1px 0 rgba(255,255,255,0.06);
          position: relative;
          overflow: hidden;
        }

        .login-shimmer-line {
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent, #6366f1, #8b5cf6, transparent);
          opacity: 0.8;
        }

        /* Tabs */
        .login-tabs {
          display: flex;
          gap: 0.25rem;
          background: rgba(99,102,241,0.08);
          border-radius: 12px;
          padding: 4px;
          margin-bottom: 1.75rem;
        }
        .login-tab {
          flex: 1;
          padding: 0.6rem 1rem;
          border-radius: 9px;
          border: none;
          background: transparent;
          color: rgba(148,163,184,0.8);
          font-size: 0.9rem;
          font-weight: 700;
          letter-spacing: 0.02em;
          cursor: pointer;
          position: relative;
          transition: color 0.2s;
        }
        .login-tab.active { color: #fff; }
        .login-tab-indicator {
          position: absolute;
          inset: 0;
          border-radius: 9px;
          background: linear-gradient(135deg, rgba(99,102,241,0.55), rgba(139,92,246,0.35));
          border: 1px solid rgba(99,102,241,0.4);
          z-index: -1;
        }

        /* Form */
        .login-form {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .lf-row {
          display: flex;
          gap: 0.75rem;
        }
        .lf-group {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }
        .lf-label {
          font-size: 0.8rem;
          font-weight: 700;
          color: #000000;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }
        .lf-input-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }
        .lf-icon {
          position: absolute;
          left: 12px;
          color: rgba(99,102,241,0.7);
          pointer-events: none;
          flex-shrink: 0;
        }
        .lf-input {
          width: 100%;
          padding: 0.82rem 1rem 0.82rem 2.6rem;
          background: rgba(99,102,241,0.07);
          border: 1px solid rgba(99,102,241,0.2);
          border-radius: 10px;
          color: #fff;
          font-size: 0.95rem;
          font-weight: 500;
          font-family: inherit;
          outline: none;
          transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;
        }
        .lf-input::placeholder { color: rgba(100,116,139,0.7); }
        .lf-input:focus {
          border-color: #6366f1;
          background: rgba(99,102,241,0.12);
          box-shadow: 0 0 0 3px rgba(99,102,241,0.18);
        }
        .lf-select {
          appearance: none;
          -webkit-appearance: none;
          cursor: pointer;
        }
        .lf-select option {
          background: #0f172a;
          color: #fff;
        }
        .lf-eye {
          position: absolute;
          right: 12px;
          background: none;
          border: none;
          color: rgba(100,116,139,0.7);
          cursor: pointer;
          padding: 2px;
          transition: color 0.2s;
        }
        .lf-eye:hover { color: #6366f1; }

        /* Alerts */
        .lf-alert {
          padding: 0.75rem 1rem;
          border-radius: 10px;
          font-size: 0.85rem;
          font-weight: 500;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .lf-alert-err {
          background: rgba(239,68,68,0.1);
          border: 1px solid rgba(239,68,68,0.25);
          color: #fca5a5;
        }
        .lf-alert-warn {
          background: rgba(245,158,11,0.1);
          border: 1px solid rgba(245,158,11,0.25);
          color: #fcd34d;
        }
        .lf-resend-btn {
          background: rgba(239,68,68,0.2);
          border: 1px solid rgba(239,68,68,0.3);
          color: #fca5a5;
          padding: 0.4rem 0.75rem;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
          align-self: flex-start;
        }
        .lf-resend-btn:hover { background: rgba(239,68,68,0.3); }

        /* Submit button */
        .lf-submit-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          width: 100%;
          padding: 0.85rem 1.5rem;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          border: none;
          border-radius: 10px;
          color: #fff;
          font-size: 1rem;
          font-weight: 700;
          letter-spacing: 0.02em;
          cursor: pointer;
          box-shadow: 0 8px 24px rgba(99,102,241,0.35);
          transition: box-shadow 0.2s, opacity 0.2s;
          margin-top: 0.25rem;
        }
        .lf-submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .lf-submit-btn:hover:not(:disabled) { box-shadow: 0 12px 32px rgba(99,102,241,0.5); }

        /* Password strength */
        .lf-strength-row {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .lf-strength-bar {
          height: 3px;
          flex: 1;
          border-radius: 2px;
          transition: background 0.3s;
        }
        .lf-str-empty { background: rgba(255,255,255,0.1); }
        .lf-str-red { background: #ef4444; }
        .lf-str-orange { background: #f97316; }
        .lf-str-yellow { background: #eab308; }
        .lf-str-green { background: #22c55e; }
        .lf-strength-label {
          font-size: 0.75rem;
          font-weight: 700;
          color: rgba(148,163,184,0.7);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          width: 44px;
          text-align: right;
        }

        /* Signup notice */
        .signup-notice {
          font-size: 0.82rem;
          display: flex;
          align-items: flex-start;
          gap: 0.5rem;
          padding: 0.65rem 0.85rem;
          background: rgba(99,102,241,0.08);
          border: 1px solid rgba(99,102,241,0.2);
          border-radius: 8px;
          font-size: 0.75rem;
          color: rgba(148,163,184,0.85);
          line-height: 1.4;
        }

        /* Signup success */
        .signup-success {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 1rem 0;
          gap: 0.75rem;
        }
        .signup-success-icon {
          width: 76px; height: 76px;
          border-radius: 50%;
          background: linear-gradient(135deg, rgba(34,197,94,0.2), rgba(16,185,129,0.1));
          border: 2px solid rgba(34,197,94,0.35);
          display: flex; align-items: center; justify-content: center;
          color: #4ade80;
        }
        .signup-success-title {
          font-size: 1.4rem;
          font-weight: 800;
          color: #fff;
          margin: 0;
        }
        .signup-success-body {
          font-size: 0.9rem;
          color: rgba(148,163,184,0.85);
          line-height: 1.6;
          max-width: 300px;
          margin: 0;
        }

        /* Switch hint */
        .login-switch-hint {
          text-align: center;
          font-size: 0.88rem;
          color: rgba(100,116,139,0.8);
          margin-top: 1.25rem;
        }
        .login-switch-link {
          background: none;
          border: none;
          color: #818cf8;
          font-weight: 700;
          cursor: pointer;
          transition: color 0.2s;
        }
        .login-switch-link:hover { color: #a5b4fc; }

        /* Footer */
        .login-footer {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          font-size: 0.78rem;
          font-weight: 600;
          color: rgba(100,116,139,0.6);
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }
        .login-footer-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: #22c55e;
          box-shadow: 0 0 6px #22c55e;
          animation: pulse 2s ease-in-out infinite;
        }
        .login-footer-divider { color: rgba(100,116,139,0.3); }
        @keyframes pulse {
          0%,100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
