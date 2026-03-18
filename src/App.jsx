import { useState, useEffect, useCallback } from "react";
import './storagePolyfill';

// ─── Theme ──────────────────────────────────────────────────────────────────────
const T = {
  primary:   "#c0392b",
  primaryDk: "#96231a",
  primaryLt: "#f9e6e4",
  accent:    "#e86c1a",
  accentLt:  "#fef3e8",
  dark:      "#1c0a08",
  sidebar:   "#1a0604",
  sidebarBd: "#2e0d09",
};
const GRD = `linear-gradient(135deg, ${T.primary}, ${T.accent})`;

// ─── Storage ─────────────────────────────────────────────────────────────────────
const KEYS = {
  items:       "spmo_items",
  requests:    "spmo_requests",
  logs:        "spmo_logs",
  accounts:    "spmo_accounts",
  currentUser: "spmo_currentUser",
};
const loadData = async (key, fallback) => {
  try { const r = await window.storage.get(key); return r ? JSON.parse(r.value) : fallback; }
  catch { return fallback; }
};
const saveData = async (key, value) => {
  try { await window.storage.set(key, JSON.stringify(value)); }
  catch (e) { console.error("Storage error", e); }
};

// ─── Constants ───────────────────────────────────────────────────────────────────
const COLLEGES = [
  "College of Health Care Education",
  "College of Information and Business Management",
  "College of Engineering and Architecture",
  "College of Teacher Education",
  "College of Criminal Justice Education",
  "College of Maritime Education",
  "College of Liberal Arts",
];
const CATEGORIES = ["Office Supplies", "Printer Supplies", "Sanitation", "Electrical", "Janitorial", "Other"];
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// Roles:
//  "mis"   — MIS Admin: manages accounts + activity logs
//  "clerk" — Inventory Clerk: manages inventory, requests, monthly report
//  "dept"  — Department: view inventory, submit/view requests

const SEED_ACCOUNTS = [
  { id: "a1", name: "MIS Admin",  email: "admin@usant.edu.ph", password: "mis2026",  role: "mis",   dept: "MIS",  active: true },
  { id: "a2", name: "SPMO Clerk", email: "clerk@usant.edu.ph", password: "spmo2026", role: "clerk", dept: "SPMO", active: true },
];

const STATUS_COLORS = {
  pending:  { bg: "#fff7ed", text: "#c2610a", border: "#f5c98a", dot: "#f59e0b" },
  approved: { bg: "#eff6ff", text: "#1d4ed8", border: "#93c5fd", dot: "#3b82f6" },
  released: { bg: "#f0fdf4", text: "#166534", border: "#86efac", dot: "#22c55e" },
  denied:   { bg: "#fef2f2", text: "#991b1b", border: "#fca5a5", dot: "#ef4444" },
};

// ─── Icons ────────────────────────────────────────────────────────────────────────
const Icon = ({ path, size = 20, className = "", style = {} }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
    <path d={path} />
  </svg>
);
const ICONS = {
  dashboard: "M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z",
  inventory: "M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2zM16 3H8L6 7h12l-2-4z",
  request:   "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
  log:       "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
  logout:    "M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9",
  plus:      "M12 5v14M5 12h14",
  check:     "M20 6L9 17l-5-5",
  x:         "M18 6L6 18M6 6l12 12",
  edit:      "M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z",
  trash:     "M3 6h18M8 6V4h8v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6",
  warning:   "M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01",
  box:       "M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z",
  search:    "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
  release:   "M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4",
  eye:       "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 9a3 3 0 100 6 3 3 0 000-6z",
  eyeoff:    "M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22",
  lock:      "M19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2zM7 11V7a5 5 0 0110 0v4",
  mail:      "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zM22 6l-10 7L2 6",
  user:      "M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 3a4 4 0 100 8 4 4 0 000-8z",
  users:     "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75",
  report:    "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8",
  download:  "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3",
  shield:    "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
};

// ─── App ──────────────────────────────────────────────────────────────────────────
export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [items,    setItems]    = useState([]);
  const [requests, setRequests] = useState([]);
  const [logs,     setLogs]     = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [page,     setPage]     = useState("dashboard");
  const [loaded,   setLoaded]   = useState(false);
  const [toast,    setToast]    = useState(null);

  useEffect(() => {
    (async () => {
      const [i, r, l, a, u] = await Promise.all([
        loadData(KEYS.items,       []),
        loadData(KEYS.requests,    []),
        loadData(KEYS.logs,        []),
        loadData(KEYS.accounts,    SEED_ACCOUNTS),
        loadData(KEYS.currentUser, null),
      ]);
      setItems(i); setRequests(r); setLogs(l); setAccounts(a);
      if (u) setCurrentUser(u);
      setLoaded(true);
    })();
  }, []);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  };

  const addLog = useCallback(async (action, details, passedLogs) => {
    const entry = {
      id: `log${Date.now()}`, action, details,
      user: currentUser?.name, dept: currentUser?.dept, role: currentUser?.role,
      date: new Date().toISOString().split("T")[0],
      time: new Date().toLocaleTimeString(),
    };
    const updated = [entry, ...(passedLogs || logs)].slice(0, 500);
    setLogs(updated);
    await saveData(KEYS.logs, updated);
    return updated;
  }, [currentUser, logs]);

  const login  = async (user) => { setCurrentUser(user); await saveData(KEYS.currentUser, user); setPage("dashboard"); };
  const logout = async ()     => { setCurrentUser(null); await saveData(KEYS.currentUser, null); setPage("dashboard"); };

  if (!loaded) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: T.sidebar }}>
      <div className="text-center">
        <div className="w-14 h-14 rounded-full border-4 animate-spin mx-auto mb-4"
          style={{ borderColor: T.accent, borderTopColor: "transparent" }} />
        <p className="text-white font-bold tracking-widest text-xs">LOADING SPMO...</p>
      </div>
    </div>
  );

  if (!currentUser) return <LoginScreen accounts={accounts} onLogin={login} />;

  const titles = {
    dashboard:    "Dashboard",
    inventory:    "Inventory",
    requests:     currentUser.role === "clerk" ? "Manage Requests" : "My Requests", "new-request":"New Request",
    logs:         "Activity Log",
    accounts:     "Manage Accounts",
    report:       "Monthly Report",
  };
  const roleLabel = { mis: "MIS Administrator", clerk: "Inventory Clerk", dept: currentUser.dept }[currentUser.role];

  return (
    <div className="h-screen flex overflow-hidden" style={{ background: "#faf8f7", fontFamily: "'Georgia', serif" }}>
      <Sidebar currentUser={currentUser} page={page} setPage={setPage} logout={logout} requests={requests} />

      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <div className="flex-shrink-0 flex items-center justify-between px-8 py-4 bg-white border-b shadow-sm" style={{ borderColor: "#f0e0de" }}>
          <div>
            <h1 className="text-xl font-bold tracking-tight" style={{ color: T.dark }}>{titles[page] || "Dashboard"}</h1>
            <p className="text-xs tracking-wider mt-0.5" style={{ color: T.primary }}>UNIVERSITY OF SAINT ANTHONY · SPMO</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-bold" style={{ color: T.dark }}>{currentUser.name}</p>
              <p className="text-xs" style={{ color: "#888" }}>{roleLabel}</p>
            </div>
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold capitalize" style={{ background: GRD }}>
              {currentUser.name[0]}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8">
          {page === "dashboard"    && <Dashboard items={items} requests={requests} currentUser={currentUser} setPage={setPage} />}
          {page === "inventory"    && <Inventory items={items} setItems={setItems} currentUser={currentUser} showToast={showToast} addLog={addLog} logs={logs} />}
          {page === "requests"     && <Requests items={items} setItems={setItems} requests={requests} setRequests={setRequests} currentUser={currentUser} showToast={showToast} addLog={addLog} logs={logs} setPage={setPage} />}
          {page === "new-request"  && <NewRequest items={items} requests={requests} setRequests={setRequests} currentUser={currentUser} showToast={showToast} addLog={addLog} logs={logs} setPage={setPage} />}
          {page === "logs"         && <ActivityLog logs={logs} />}
          {page === "accounts"     && <Accounts accounts={accounts} setAccounts={setAccounts} currentUser={currentUser} showToast={showToast} addLog={addLog} logs={logs} />}
          {page === "report"       && <Report items={items} requests={requests} />}
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-6 right-6 px-5 py-3 rounded-xl shadow-2xl text-white text-sm font-semibold flex items-center gap-2 z-50"
          style={{ background: toast.type === "success" ? "#16a34a" : toast.type === "error" ? T.primary : T.accent }}>
          <Icon path={toast.type === "success" ? ICONS.check : ICONS.warning} size={15} />
          {toast.msg}
        </div>
      )}
    </div>
  );
}

// ─── Login ────────────────────────────────────────────────────────────────────────
// All users (MIS, Clerk, Dept) must have a registered account to log in.
// Email typed → if found in accounts list, show password field + role hint.
// If email not found → show "no access" message instead of a free-form form.
function LoginScreen({ accounts, onLogin }) {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error,    setError]    = useState("");

  // Match against ALL accounts (any role) by email
  const matched     = accounts.find(a => a.email.toLowerCase() === email.trim().toLowerCase());
  const isInactive  = matched && !matched.active;
  const isActive    = matched &&  matched.active;
  const noAccount   = email.includes("@") && email.includes(".") && !matched;

  const roleHints = {
    mis:   "MIS Administrator",
    clerk: "Inventory Clerk",
    dept:  matched?.dept || "Department",
  };

  const handleLogin = () => {
    setError("");
    if (!email.trim()) return setError("Please enter your email address.");
    if (!matched)      return setError("No account found for this email. Contact your MIS Admin.");
    if (isInactive)    return setError("This account has been deactivated. Contact your MIS Admin.");
    if (!password)     return setError("Please enter your password.");
    if (matched.password !== password) return setError("Incorrect password.");
    onLogin({ role: matched.role, name: matched.name, dept: matched.dept, email: matched.email });
  };

  return (
    <div className="min-h-screen flex" style={{ fontFamily: "'Georgia', serif" }}>
      {/* Branding */}
      <div className="hidden lg:flex w-2/5 flex-col items-center justify-center p-12 relative overflow-hidden"
        style={{ background: `linear-gradient(160deg,${T.sidebar} 0%,${T.primary} 60%,${T.accent} 100%)` }}>
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: "repeating-linear-gradient(45deg,#fff 0,#fff 1px,transparent 0,transparent 50%)", backgroundSize: "20px 20px" }} />
        <div className="relative z-10 text-center">
          <div className="w-24 h-24 rounded-3xl mx-auto mb-6 flex items-center justify-center shadow-2xl"
            style={{ background: "rgba(255,255,255,0.15)", border: "2px solid rgba(255,255,255,0.3)" }}>
            <Icon path={ICONS.box} size={44} className="text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white tracking-tight">SPMO</h1>
          <p className="text-orange-200 text-sm mt-1 font-semibold tracking-widest">SUPPLIES & PROPERTY MANAGEMENT</p>
          <div className="mt-6 h-0.5 w-24 mx-auto rounded-full" style={{ background: "rgba(255,255,255,0.3)" }} />
          <p className="text-white/70 text-xs mt-4 leading-relaxed">University of Saint Anthony<br/>Consumables Inventory Management System</p>
          <div className="mt-8 space-y-2 text-left">
            {["MIS manages accounts & audit logs","Clerk manages inventory & reports","Departments request consumables","Monthly release & CSV export"].map(f => (
              <div key={f} className="flex items-center gap-2 text-white/80 text-xs">
                <Icon path={ICONS.check} size={13} className="text-orange-300" />{f}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8 lg:hidden">
            <div className="w-16 h-16 rounded-2xl mx-auto mb-3 flex items-center justify-center" style={{ background: GRD }}>
              <Icon path={ICONS.box} size={30} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold" style={{ color: T.dark }}>SPMO</h1>
            <p className="text-xs" style={{ color: T.primary }}>University of Saint Anthony</p>
          </div>

          <h2 className="text-2xl font-bold mb-1" style={{ color: T.dark }}>Sign In</h2>
          <p className="text-sm text-gray-400 mb-6">Access the SPMO Inventory System</p>

          <div className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: T.dark }}>Email Address</label>
              <div className="relative">
                <Icon path={ICONS.mail} size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="email" value={email}
                  onChange={e => { setEmail(e.target.value); setError(""); setPassword(""); }}
                  placeholder="you@usant.edu.ph"
                  className="w-full pl-9 pr-4 py-3 rounded-xl border text-sm focus:outline-none"
                  style={{ borderColor: error ? T.primary : "#e5e7eb" }}
                  onKeyDown={e => e.key === "Enter" && handleLogin()} />
              </div>
            </div>

            {/* No account found hint */}
            {noAccount && (
              <div className="rounded-xl p-3 border flex items-start gap-2"
                style={{ background: T.primaryLt, borderColor: "#f5c6c2" }}>
                <Icon path={ICONS.warning} size={15} style={{ color: T.primary }} className="flex-shrink-0 mt-0.5" />
                <p className="text-xs font-semibold" style={{ color: T.primary }}>
                  No account found for this email. Please contact your MIS Administrator to request access.
                </p>
              </div>
            )}

            {/* Inactive account hint */}
            {isInactive && (
              <div className="rounded-xl p-3 border flex items-start gap-2"
                style={{ background: "#fef3c7", borderColor: "#fde68a" }}>
                <Icon path={ICONS.warning} size={15} className="text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs font-semibold text-amber-700">
                  This account has been deactivated. Contact your MIS Administrator.
                </p>
              </div>
            )}

            {/* Password — shown only when active account matched */}
            {isActive && (
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: T.dark }}>Password</label>
                <div className="relative">
                  <Icon path={ICONS.lock} size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type={showPass ? "text" : "password"} value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-10 py-3 rounded-xl border text-sm focus:outline-none"
                    style={{ borderColor: error ? T.primary : "#e5e7eb" }}
                    onKeyDown={e => e.key === "Enter" && handleLogin()} />
                  <button onClick={() => setShowPass(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <Icon path={showPass ? ICONS.eyeoff : ICONS.eye} size={16} />
                  </button>
                </div>
                <div className="flex items-center gap-2 mt-1.5 px-1">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: T.accent }} />
                  <p className="text-xs font-semibold" style={{ color: T.accent }}>
                    {roleHints[matched.role]}
                    {matched.role === "dept" ? ` · ${matched.dept}` : ""}
                  </p>
                </div>
              </div>
            )}

            {error && <p className="text-xs font-semibold" style={{ color: T.primary }}>⚠ {error}</p>}

            <button onClick={handleLogin}
              className="w-full py-3 rounded-xl text-white font-bold text-sm tracking-wider transition-opacity hover:opacity-90 active:scale-95"
              style={{ background: GRD }}>
              SIGN IN
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────────
function Sidebar({ currentUser, page, setPage, logout, requests }) {
  const pendingCount = requests.filter(r => r.status === "pending").length;
  const role = currentUser.role;

  const navItems = [
    { id: "dashboard",    label: "Dashboard",       icon: ICONS.dashboard, roles: ["mis","clerk","dept"] },
    { id: "inventory",    label: "Inventory",        icon: ICONS.inventory, roles: ["clerk","dept"] },
    { id: "requests",     label: role === "clerk" ? "Manage Requests" : "My Requests", icon: ICONS.request, roles: ["clerk","dept"], badge: role === "clerk" ? pendingCount : null },
    { id: "new-request",  label: "New Request",      icon: ICONS.plus,      roles: ["dept"] },
    { id: "report",       label: "Monthly Report",   icon: ICONS.report,    roles: ["clerk"] },
    { id: "accounts",     label: "Manage Accounts",  icon: ICONS.users,     roles: ["mis"] },
    { id: "logs",         label: "Activity Log",     icon: ICONS.log,       roles: ["mis"] },
  ].filter(n => n.roles.includes(role));

  return (
    <div className="w-64 flex-shrink-0 flex flex-col h-screen overflow-hidden" style={{ background: T.sidebar }}>
      <div className="px-5 py-6 border-b" style={{ borderColor: T.sidebarBd }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: GRD }}>
            <Icon path={ICONS.box} size={20} className="text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm tracking-wide">SPMO</p>
            <p className="text-xs" style={{ color: T.accent }}>Univ. of Saint Anthony</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(item => {
          const active = page === item.id;
          return (
            <button key={item.id} onClick={() => setPage(item.id)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left"
              style={active ? { background: `linear-gradient(135deg,${T.primary}cc,${T.accent}cc)`, color:"#fff" } : { color:"rgba(255,255,255,0.5)" }}>
              <Icon path={item.icon} size={17} />
              <span className="flex-1">{item.label}</span>
              {item.badge > 0 && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ background: T.accent }}>{item.badge}</span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="px-3 pb-5 border-t pt-4" style={{ borderColor: T.sidebarBd }}>
        <div className="px-3 py-2 mb-2">
          <p className="text-white text-xs font-semibold truncate">{currentUser.name}</p>
          <p className="text-xs truncate" style={{ color:"rgba(255,255,255,0.4)", fontSize:"10px" }}>
            {{ mis:"MIS Administrator", clerk:"Inventory Clerk", dept: currentUser.dept }[currentUser.role]}
          </p>
        </div>
        <button onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
          style={{ color:"rgba(255,255,255,0.4)" }}
          onMouseEnter={e => e.currentTarget.style.color = "#fca5a5"}
          onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.4)"}>
          <Icon path={ICONS.logout} size={17} /> Sign Out
        </button>
      </div>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────────
function Dashboard({ items, requests, currentUser, setPage }) {
  const role = currentUser.role;
  const total    = items.length;
  const lowStock = items.filter(i => (i.remaining ?? i.quantity) <= i.minStock).length;
  const pending  = requests.filter(r => r.status === "pending").length;
  const released = requests.filter(r => r.status === "released").length;
  const myReqs   = role === "dept" ? requests.filter(r => r.department === currentUser.dept) : requests;
  const lowItems = items.filter(i => (i.remaining ?? i.quantity) <= i.minStock);

  const stats = [
    { label:"Total Items",      value:total,    icon:ICONS.box,     color:T.primary, sub:"consumable types" },
    { label:"Low Stock Alert",  value:lowStock, icon:ICONS.warning, color:"#dc2626", sub:"need restocking"  },
    { label:"Pending Requests", value:pending,  icon:ICONS.request, color:T.accent,  sub:"awaiting action"  },
    { label:"Released",         value:released, icon:ICONS.release, color:"#16a34a", sub:"fulfilled"        },
  ];

  if (role === "mis") return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-10 text-center border" style={{ borderColor:"#f0e0de" }}>
        <Icon path={ICONS.shield} size={48} style={{ color:T.primary }} className="mx-auto mb-4" />
        <h3 className="font-bold text-xl mb-2" style={{ color:T.dark }}>MIS Administrator Dashboard</h3>
        <p className="text-gray-400 text-sm max-w-sm mx-auto">Manage staff accounts and monitor all system activity from the sidebar.</p>
        <div className="flex gap-4 justify-center mt-6">
          <button onClick={() => setPage("accounts")} className="px-5 py-2.5 rounded-xl text-white text-sm font-semibold" style={{ background:GRD }}>
            Manage Accounts
          </button>
          <button onClick={() => setPage("logs")} className="px-5 py-2.5 rounded-xl text-sm font-semibold border" style={{ color:T.primary, borderColor:T.primary }}>
            View Activity Log
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border" style={{ borderColor:"#f0e0de" }}>
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background:s.color+"18" }}>
                <Icon path={s.icon} size={20} style={{ color:s.color }} />
              </div>
              <span className="text-3xl font-bold" style={{ color:T.dark }}>{s.value}</span>
            </div>
            <p className="font-bold text-sm" style={{ color:T.dark }}>{s.label}</p>
            <p className="text-xs text-gray-400 mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden" style={{ borderColor:"#f0e0de" }}>
          <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor:"#f9f0ef" }}>
            <h3 className="font-bold text-sm" style={{ color:T.dark }}>Recent Requests</h3>
            <button onClick={() => setPage("requests")} className="text-xs font-bold" style={{ color:T.primary }}>View All →</button>
          </div>
          <div>
            {myReqs.length === 0 && <p className="text-center text-gray-400 text-sm py-10">No requests yet.</p>}
            {myReqs.slice(0,6).map(r => {
              const sc = STATUS_COLORS[r.status];
              const label = Array.isArray(r.items) ? r.items.map(x=>x.itemName).join(", ") : (r.itemName || "");
              return (
                <div key={r.id} className="flex items-center gap-3 px-6 py-3 border-b last:border-0" style={{ borderColor:"#fdf5f4" }}>
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background:sc.dot }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color:T.dark }}>{label}</p>
                    <p className="text-xs text-gray-400 truncate">{r.department?.replace("College of ","")}{r.date ? ` · ${r.date}` : ""}</p>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full font-semibold border flex-shrink-0"
                    style={{ background:sc.bg, color:sc.text, borderColor:sc.border }}>{r.status}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden" style={{ borderColor:"#f0e0de" }}>
          <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor:"#f9f0ef" }}>
            <h3 className="font-bold text-sm" style={{ color:T.dark }}>⚠ Low Stock Items</h3>
            <button onClick={() => setPage("inventory")} className="text-xs font-bold" style={{ color:T.primary }}>
              {role === "clerk" ? "Manage →" : "View →"}
            </button>
          </div>
          <div>
            {lowItems.length === 0 && <p className="text-center text-gray-400 text-sm py-10">All stock levels healthy ✓</p>}
            {lowItems.map(item => (
              <div key={item.id} className="flex items-center gap-3 px-6 py-3 border-b last:border-0" style={{ borderColor:"#fdf5f4" }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background:T.primaryLt }}>
                  <Icon path={ICONS.warning} size={15} style={{ color:T.primary }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color:T.dark }}>{item.name}</p>
                  <p className="text-xs text-gray-400">{item.category}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold" style={{ color:T.primary }}>{item.remaining ?? item.quantity}</p>
                  <p className="text-xs text-gray-400">min:{item.minStock}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Inventory ────────────────────────────────────────────────────────────────────
// QTY = base stock (set by clerk, never auto-changed).
// Released = cumulative units released. Remaining = QTY - Released (decrements on release).
function Inventory({ items, setItems, currentUser, showToast, addLog, logs }) {
  const [search,    setSearch]    = useState("");
  const [filterCat, setFilterCat] = useState("All");
  const [showModal, setShowModal] = useState(false);
  const [editing,   setEditing]   = useState(null);
  const [form, setForm] = useState({ name:"", category:"Office Supplies", unit:"", quantity:"", minStock:"", description:"" });

  const isClerk = currentUser.role === "clerk";
  const filtered = items.filter(i =>
    (filterCat === "All" || i.category === filterCat) &&
    (i.name.toLowerCase().includes(search.toLowerCase()) || i.category.toLowerCase().includes(search.toLowerCase()))
  );

  const openAdd  = () => { setEditing(null); setForm({ name:"", category:"Office Supplies", unit:"", quantity:"", minStock:"", description:"" }); setShowModal(true); };
  const openEdit = (item) => { setEditing(item); setForm({ ...item, quantity:String(item.quantity), minStock:String(item.minStock) }); setShowModal(true); };

  const save = async () => {
    if (!form.name || !form.unit || form.quantity === "" || form.minStock === "") return showToast("Fill all required fields.", "error");
    const qty = parseInt(form.quantity), min = parseInt(form.minStock);
    if (isNaN(qty) || isNaN(min) || qty < 0 || min < 0) return showToast("Invalid quantity.", "error");
    let updated;
    if (editing) {
      // Keep released intact; recalculate remaining from new base qty
      updated = items.map(i => {
        if (i.id !== editing.id) return i;
        const rel = i.released ?? 0;
        return { ...i, ...form, quantity:qty, minStock:min, released:rel, remaining:Math.max(0, qty - rel) };
      });
      showToast("Item updated.");
    } else {
      updated = [...items, { ...form, id:`i${Date.now()}`, quantity:qty, minStock:min, released:0, remaining:qty }];
      showToast("Item added.");
    }
    setItems(updated); await saveData(KEYS.items, updated);
    await addLog(editing ? "EDIT ITEM" : "ADD ITEM", `${form.name} (Base Qty:${qty})`, logs);
    setShowModal(false);
  };

  const deleteItem = async (item) => {
    if (!confirm(`Delete "${item.name}"?`)) return;
    const updated = items.filter(i => i.id !== item.id);
    setItems(updated); await saveData(KEYS.items, updated);
    await addLog("DELETE ITEM", item.name, logs);
    showToast("Item deleted.", "error");
  };

  const cols = ["Item Name","Category","Unit","Base Qty","Released","Remaining","Status",...(isClerk?["Actions"]:[])];

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Icon path={ICONS.search} size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search items…"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none" />
        </div>
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
          className="px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none">
          <option>All</option>
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
        {isClerk && (
          <button onClick={openAdd} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold" style={{ background:GRD }}>
            <Icon path={ICONS.plus} size={16} /> Add Item
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden" style={{ borderColor:"#f0e0de" }}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b" style={{ borderColor:"#faeae8", background:"#fdf6f5" }}>
              {cols.map(h => <th key={h} className="text-left px-4 py-3.5 text-xs font-bold uppercase tracking-wider" style={{ color:T.primary }}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {filtered.map(item => {
              const remaining = item.remaining ?? item.quantity;
              const released  = item.released  ?? 0;
              const low = remaining <= item.minStock;
              return (
                <tr key={item.id} className="border-b last:border-0 hover:bg-red-50/20 transition-colors" style={{ borderColor:"#fdf5f4" }}>
                  <td className="px-4 py-3.5">
                    <p className="font-semibold" style={{ color:T.dark }}>{item.name}</p>
                    {item.description && <p className="text-xs text-gray-400 mt-0.5">{item.description}</p>}
                  </td>
                  <td className="px-4 py-3.5 text-gray-500 text-sm">{item.category}</td>
                  <td className="px-4 py-3.5 text-gray-500 text-sm">{item.unit}</td>
                  <td className="px-4 py-3.5 font-bold text-gray-700 text-sm">{item.quantity}</td>
                  <td className="px-4 py-3.5 font-semibold text-sm" style={{ color:"#7c3aed" }}>{released}</td>
                  <td className="px-4 py-3.5 font-bold text-sm" style={{ color: low ? T.primary : "#16a34a" }}>{remaining}</td>
                  <td className="px-4 py-3.5">
                    {low
                      ? <span className="text-xs px-2.5 py-1 rounded-full font-semibold" style={{ background:T.primaryLt, color:T.primary, border:`1px solid #f5c6c2` }}>Low Stock</span>
                      : <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-green-50 text-green-700 border border-green-200">In Stock</span>
                    }
                  </td>
                  {isClerk && (
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEdit(item)} className="p-1.5 rounded-lg" style={{ color:T.accent }}
                          onMouseEnter={e=>e.currentTarget.style.background=T.accentLt}
                          onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                          <Icon path={ICONS.edit} size={15} />
                        </button>
                        <button onClick={() => deleteItem(item)} className="p-1.5 rounded-lg" style={{ color:T.primary }}
                          onMouseEnter={e=>e.currentTarget.style.background=T.primaryLt}
                          onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                          <Icon path={ICONS.trash} size={15} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
            {filtered.length === 0 && <tr><td colSpan={cols.length} className="text-center text-gray-400 py-14">No items found.</td></tr>}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="font-bold text-lg mb-5" style={{ color:T.dark }}>{editing ? "Edit Item" : "Add New Item"}</h3>
            <div className="space-y-3">
              {[["Item Name *","name"],["Unit *","unit"],["Description","description"]].map(([label,field]) => (
                <div key={field}>
                  <label className="block text-xs font-semibold mb-1 text-gray-500">{label}</label>
                  <input value={form[field]||""} onChange={e => setForm(f=>({...f,[field]:e.target.value}))}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none" />
                </div>
              ))}
              <div>
                <label className="block text-xs font-semibold mb-1 text-gray-500">Category</label>
                <select value={form.category} onChange={e => setForm(f=>({...f,category:e.target.value}))}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none bg-white">
                  {CATEGORIES.map(c=><option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[["Base Qty (Stock) *","quantity"],["Min Stock *","minStock"]].map(([label,field]) => (
                  <div key={field}>
                    <label className="block text-xs font-semibold mb-1 text-gray-500">{label}</label>
                    <input type="number" min="0" value={form[field]||""} onChange={e => setForm(f=>({...f,[field]:e.target.value}))}
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none" />
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400 px-1">Base Qty is the reference stock. Released & Remaining update automatically when requests are released.</p>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={()=>setShowModal(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={save} className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold" style={{ background:GRD }}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Requests ─────────────────────────────────────────────────────────────────────
function Requests({ items, setItems, requests, setRequests, currentUser, showToast, addLog, logs, setPage }) {
  const [filter,    setFilter]    = useState("all");
  const [search,    setSearch]    = useState("");
  const [noteModal, setNoteModal] = useState(null);
  const [note,      setNote]      = useState("");

  const isClerk = currentUser.role === "clerk";
  const visible = requests.filter(r => {
    if (!isClerk && r.department !== currentUser.dept) return false;
    if (filter !== "all" && r.status !== filter) return false;
    if (search) {
      const needle = search.toLowerCase();
      const names  = Array.isArray(r.items) ? r.items.map(x=>x.itemName).join(" ") : (r.itemName||"");
      if (!names.toLowerCase().includes(needle) && !(r.department||"").toLowerCase().includes(needle)) return false;
    }
    return true;
  });

  const updateRequest = async (id, newStatus, adminNote = "") => {
    const req = requests.find(r => r.id === id);
    let updatedItems = items;

    if (newStatus === "released" && req) {
      const lineItems = Array.isArray(req.items)
        ? req.items
        : [{ itemId:req.itemId, itemName:req.itemName, quantity:req.quantity, unit:req.unit }];

      let ok = true;
      for (const li of lineItems) {
        const inv = items.find(i => i.id === li.itemId);
        if (!inv) { showToast(`"${li.itemName}" not found.`, "error"); ok=false; break; }
        const rem = inv.remaining ?? inv.quantity;
        if (rem < li.quantity) { showToast(`Insufficient remaining stock for "${li.itemName}".`, "error"); ok=false; break; }
      }
      if (!ok) return;

      // Decrement remaining only — base qty stays intact
      updatedItems = items.map(inv => {
        const li = lineItems.find(x => x.itemId === inv.id);
        if (!li) return inv;
        const prevRel = inv.released  ?? 0;
        const prevRem = inv.remaining ?? inv.quantity;
        return { ...inv, released: prevRel + li.quantity, remaining: prevRem - li.quantity };
      });
      setItems(updatedItems); await saveData(KEYS.items, updatedItems);
    }

    const updated = requests.map(r => r.id === id ? { ...r, status:newStatus, adminNote:adminNote||r.adminNote } : r);
    setRequests(updated); await saveData(KEYS.requests, updated);

    const summary = Array.isArray(req?.items)
      ? req.items.map(x=>`${x.itemName}`).join(", ")
      : (req?.itemName || "");
    await addLog(`REQUEST ${newStatus.toUpperCase()}`, `${summary} — ${req?.department}`, logs);
    showToast(`Request ${newStatus}.`);
    setNoteModal(null);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Icon path={ICONS.search} size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search requests…"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none" />
        </div>
        <div className="flex gap-1 bg-white rounded-xl border border-gray-200 p-1">
          {["all","pending","approved","released","denied"].map(f => (
            <button key={f} onClick={()=>setFilter(f)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all"
              style={filter===f ? { background:GRD, color:"#fff" } : { color:"#888" }}>{f}</button>
          ))}
        </div>
        {!isClerk && (
          <button onClick={()=>setPage("new-request")} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold" style={{ background:GRD }}>
            <Icon path={ICONS.plus} size={16} /> New Request
          </button>
        )}
      </div>

      <div className="space-y-3">
        {visible.length === 0 && <div className="bg-white rounded-2xl p-12 text-center text-gray-400 border" style={{ borderColor:"#f0e0de" }}>No requests found.</div>}
        {visible.map(r => {
          const sc = STATUS_COLORS[r.status];
          const lineItems = Array.isArray(r.items) ? r.items : [{ itemName:r.itemName, quantity:r.quantity, unit:r.unit }];
          return (
            <div key={r.id} className="bg-white rounded-2xl border shadow-sm p-5" style={{ borderColor:"#f0e0de" }}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold border"
                      style={{ background:sc.bg, color:sc.text, borderColor:sc.border }}>{r.status}</span>
                    <span className="text-xs text-gray-400">🏫 {r.department}</span>
                    <span className="text-xs text-gray-400">👤 {r.requestedBy}</span>
                    <span className="text-xs text-gray-400">📅 {r.date}</span>
                  </div>
                  <div className="space-y-1 mb-2">
                    {lineItems.map((li, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm">
                        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background:T.accent }} />
                        <span className="font-semibold" style={{ color:T.dark }}>{li.itemName}</span>
                        <span className="text-gray-400">— {li.quantity} {li.unit}</span>
                      </div>
                    ))}
                  </div>
                  {r.purpose   && <p className="text-xs text-gray-500">Purpose: {r.purpose}</p>}
                  {r.adminNote && <p className="text-xs mt-1 font-semibold" style={{ color:T.accent }}>Note: {r.adminNote}</p>}
                </div>
                {isClerk && (
                  <div className="flex gap-2 flex-shrink-0 flex-wrap justify-end">
                    {r.status === "pending" && (
                      <>
                        <button onClick={()=>{ setNoteModal({req:r,action:"approved"}); setNote(""); }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border"
                          style={{ background:"#eff6ff", color:"#1d4ed8", borderColor:"#93c5fd" }}>
                          <Icon path={ICONS.check} size={13}/> Approve
                        </button>
                        <button onClick={()=>{ setNoteModal({req:r,action:"denied"}); setNote(""); }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border"
                          style={{ background:T.primaryLt, color:T.primary, borderColor:"#f5c6c2" }}>
                          <Icon path={ICONS.x} size={13}/> Deny
                        </button>
                      </>
                    )}
                    {r.status === "approved" && (
                      <button onClick={()=>{ setNoteModal({req:r,action:"released"}); setNote(""); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border"
                        style={{ background:"#f0fdf4", color:"#166534", borderColor:"#86efac" }}>
                        <Icon path={ICONS.release} size={13}/> Release
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {noteModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="font-bold text-base mb-1 capitalize" style={{ color:T.dark }}>{noteModal.action} Request</h3>
            <p className="text-sm text-gray-500 mb-4">{noteModal.req.department}</p>
            <label className="block text-xs font-semibold mb-1 text-gray-500">Note (optional)</label>
            <textarea value={note} onChange={e=>setNote(e.target.value)} rows={3} placeholder="Add a note…"
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none resize-none" />
            <div className="flex gap-3 mt-4">
              <button onClick={()=>setNoteModal(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={()=>updateRequest(noteModal.req.id, noteModal.action, note)}
                className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold capitalize"
                style={{ background: noteModal.action==="denied" ? T.primary : GRD }}>
                Confirm {noteModal.action}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── New Request (multi-item cart) ────────────────────────────────────────────────
function NewRequest({ items, requests, setRequests, currentUser, showToast, addLog, logs, setPage }) {
  const [purpose, setPurpose] = useState("");
  const [cart,    setCart]    = useState([{ itemId:"", quantity:"" }]);

  const addRow    = ()        => setCart(c => [...c, { itemId:"", quantity:"" }]);
  const removeRow = (idx)     => setCart(c => c.filter((_,i)=>i!==idx));
  const updateRow = (idx,f,v) => setCart(c => c.map((r,i)=>i===idx ? {...r,[f]:v} : r));

  const chosenIds = cart.map(r=>r.itemId).filter(Boolean);

  const submit = async () => {
    if (!purpose.trim()) return showToast("Please enter a purpose.", "error");
    const valid = cart.filter(r=>r.itemId && r.quantity);
    if (valid.length === 0) return showToast("Add at least one item with quantity.", "error");

    const lineItems = [];
    for (const row of valid) {
      const qty = parseInt(row.quantity);
      if (isNaN(qty) || qty < 1) return showToast("Invalid quantity.", "error");
      const inv = items.find(i=>i.id===row.itemId);
      lineItems.push({ itemId:inv.id, itemName:inv.name, quantity:qty, unit:inv.unit });
    }

    const newReq = {
      id:          `r${Date.now()}`,
      items:       lineItems,
      itemId:      lineItems[0].itemId,
      itemName:    lineItems.map(l=>l.itemName).join(", "),
      quantity:    lineItems[0].quantity,
      unit:        lineItems[0].unit,
      department:  currentUser.dept,
      requestedBy: currentUser.name,
      purpose, status:"pending",
      date:        new Date().toISOString().split("T")[0],
      adminNote:   "",
    };
    const updated = [newReq, ...requests];
    setRequests(updated); await saveData(KEYS.requests, updated);
    const summary = lineItems.map(l=>`${l.itemName} x${l.quantity}`).join(", ");
    await addLog("NEW REQUEST", `${summary} — ${currentUser.dept}`, logs);
    showToast("Request submitted!");
    setPage("requests");
  };

  return (
    <div className="w-full">
      <div className="bg-white rounded-2xl shadow-sm border p-6 space-y-5" style={{ borderColor:"#f0e0de" }}>
        <h3 className="font-bold text-base" style={{ color:T.dark }}>Request Consumables</h3>

        <div className="space-y-3">
          {cart.map((row, idx) => {
            const inv = items.find(i=>i.id===row.itemId);
            return (
              <div key={idx} className="rounded-xl border border-gray-100 bg-gray-50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Item {idx+1}</span>
                  {cart.length > 1 && (
                    <button onClick={()=>removeRow(idx)} className="text-xs font-semibold flex items-center gap-1" style={{ color:T.primary }}>
                      <Icon path={ICONS.x} size={12}/> Remove
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold mb-1 text-gray-500">Consumable *</label>
                    <select value={row.itemId} onChange={e=>updateRow(idx,"itemId",e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none bg-white">
                      <option value="">-- Select item --</option>
                      {items.map(i => (
                        <option key={i.id} value={i.id} disabled={chosenIds.includes(i.id) && i.id!==row.itemId}>
                          {i.name} ({i.remaining ?? i.quantity} {i.unit} avail.)
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1 text-gray-500">Quantity *</label>
                    <input type="number" min="1" value={row.quantity} onChange={e=>updateRow(idx,"quantity",e.target.value)}
                      placeholder="0" className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none" />
                  </div>
                </div>
                {inv && (
                  <div className="flex gap-4 text-xs px-1" style={{ color:T.primaryDk }}>
                    <span>Category: {inv.category}</span>
                    <span>Unit: {inv.unit}</span>
                    <span>Remaining: <strong>{inv.remaining ?? inv.quantity}</strong></span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <button onClick={addRow}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-semibold transition-colors"
          style={{ borderColor:T.primary, color:T.primary }}
          onMouseEnter={e=>e.currentTarget.style.background=T.primaryLt}
          onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
          <Icon path={ICONS.plus} size={15}/> Add Another Item
        </button>

        <div>
          <label className="block text-xs font-semibold mb-1.5 text-gray-500">Purpose / Justification *</label>
          <textarea rows={3} value={purpose} onChange={e=>setPurpose(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none resize-none"
            placeholder="Describe the purpose of this request…" />
        </div>

        <div className="rounded-xl p-4 bg-gray-50 border border-gray-100 text-xs text-gray-500 space-y-1">
          <p><span className="font-semibold">College:</span> {currentUser.dept}</p>
          <p><span className="font-semibold">Requested by:</span> {currentUser.name}</p>
          <p><span className="font-semibold">Date:</span> {new Date().toISOString().split("T")[0]}</p>
          <p><span className="font-semibold">Items selected:</span> {cart.filter(r=>r.itemId).length}</p>
        </div>

        <div className="flex gap-3">
          <button onClick={()=>setPage("requests")} className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={submit} className="flex-1 py-3 rounded-xl text-white text-sm font-semibold" style={{ background:GRD }}>Submit Request</button>
        </div>
      </div>
    </div>
  );
}

// ─── Report (clerk only) ──────────────────────────────────────────────────────────
function Report({ items, requests }) {
  const now = new Date();
  const [year,  setYear]  = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  const releasedReqs = requests.filter(r => {
    if (r.status !== "released") return false;
    const [ry, rm] = (r.date||"").split("-").map(Number);
    return ry === year && (rm-1) === month;
  });

  // Per-item summary for selected month
  const summary = {};
  for (const req of releasedReqs) {
    const lineItems = Array.isArray(req.items) ? req.items : [{ itemId:req.itemId, itemName:req.itemName, quantity:req.quantity, unit:req.unit }];
    for (const li of lineItems) {
      if (!summary[li.itemId]) {
        const inv = items.find(i=>i.id===li.itemId);
        summary[li.itemId] = { name:li.itemName, unit:li.unit, category:inv?.category||"—", baseQty:inv?.quantity??0, releasedQty:0, remaining:inv?.remaining??0 };
      }
      summary[li.itemId].releasedQty += li.quantity;
    }
  }
  const rows = Object.values(summary);

  // Yearly bar data
  const yearlyData = MONTHS.map((m,mi) => {
    const monthReqs = requests.filter(r => {
      if (r.status !== "released") return false;
      const [ry,rm] = (r.date||"").split("-").map(Number);
      return ry===year && (rm-1)===mi;
    });
    let count=0;
    for (const req of monthReqs) {
      const lineItems = Array.isArray(req.items) ? req.items : [{ quantity:req.quantity||0 }];
      count += lineItems.reduce((s,l)=>s+(l.quantity||0),0);
    }
    return { month:m, count, reqCount:monthReqs.length };
  });
  const maxCount = Math.max(...yearlyData.map(d=>d.count),1);

  const exportCSV = () => {
    const lines = [
      `USANT SPMO Monthly Inventory Summary Report`,
      `Month: ${MONTHS[month]} ${year}`,
      `Generated: ${new Date().toLocaleString()}`,
      ``,
      `Monthly Release`,
      `Item Name,Category,Unit,Base Qty,Released This Month,Remaining`,
      ...rows.map(r=>`"${r.name}","${r.category}","${r.unit}",${r.baseQty},${r.releasedQty},${r.remaining}`),
      ``,
      `Yearly Overview (${year})`,
      `Month,Total Units Released,Requests`,
      ...yearlyData.map(d=>`${d.month},${d.count},${d.reqCount}`),
    ];
    const blob = new Blob([lines.join("\n")], { type:"text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href=url; a.download=`SPMO_Report_${MONTHS[month]}_${year}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const years = Array.from({length:5},(_,i)=>now.getFullYear()-2+i);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <select value={month} onChange={e=>setMonth(Number(e.target.value))}
          className="px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none">
          {MONTHS.map((m,i)=><option key={m} value={i}>{m}</option>)}
        </select>
        <select value={year} onChange={e=>setYear(Number(e.target.value))}
          className="px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none">
          {years.map(y=><option key={y}>{y}</option>)}
        </select>
        <button onClick={exportCSV}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold ml-auto" style={{ background:GRD }}>
          <Icon path={ICONS.download} size={16}/> Export CSV
        </button>
      </div>

      {/* Monthly table */}
      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden" style={{ borderColor:"#f0e0de" }}>
        <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor:"#f9f0ef" }}>
          <h3 className="font-bold text-sm" style={{ color:T.dark }}>Monthly Release — {MONTHS[month]} {year}</h3>
          <span className="text-xs text-gray-400">{releasedReqs.length} release(s)</span>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b" style={{ borderColor:"#faeae8", background:"#fdf6f5" }}>
              {["Item Name","Category","Unit","Base Qty","Released This Month","Remaining"].map(h=>(
                <th key={h} className="text-left px-5 py-3.5 text-xs font-bold uppercase tracking-wider" style={{ color:T.primary }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length===0 && <tr><td colSpan={6} className="text-center text-gray-400 py-12">No releases for {MONTHS[month]} {year}.</td></tr>}
            {rows.map((r,i)=>(
              <tr key={i} className="border-b last:border-0 hover:bg-red-50/20" style={{ borderColor:"#fdf5f4" }}>
                <td className="px-5 py-3 font-semibold" style={{ color:T.dark }}>{r.name}</td>
                <td className="px-5 py-3 text-gray-500 text-xs">{r.category}</td>
                <td className="px-5 py-3 text-gray-500 text-xs">{r.unit}</td>
                <td className="px-5 py-3 font-semibold text-gray-700">{r.baseQty}</td>
                <td className="px-5 py-3 font-bold" style={{ color:"#7c3aed" }}>{r.releasedQty}</td>
                <td className="px-5 py-3 font-bold" style={{ color:r.remaining<=5?T.primary:"#16a34a" }}>{r.remaining}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Yearly bar chart */}
      <div className="bg-white rounded-2xl shadow-sm border p-6" style={{ borderColor:"#f0e0de" }}>
        <h3 className="font-bold text-sm mb-6" style={{ color:T.dark }}>Yearly Overview — {year} (Units Released Per Month)</h3>
        <div className="flex items-end gap-2" style={{ height:"140px" }}>
          {yearlyData.map((d,i) => (
            <div key={d.month} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-xs font-bold" style={{ color:i===month?T.primary:"#9ca3af" }}>{d.count||""}</span>
              <div className="w-full rounded-t-lg transition-all"
                style={{ height:`${(d.count/maxCount)*100}px`, background:i===month?GRD:"#f0e0de", minHeight:d.count>0?"4px":"0" }} />
              <span className="text-xs" style={{ color:i===month?T.primary:"#9ca3af", fontWeight:i===month?"bold":"normal" }}>{d.month}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Activity Log (MIS only) ──────────────────────────────────────────────────────
function ActivityLog({ logs }) {
  const [search, setSearch] = useState("");
  const filtered = logs.filter(l =>
    l.action?.toLowerCase().includes(search.toLowerCase()) ||
    l.details?.toLowerCase().includes(search.toLowerCase()) ||
    l.user?.toLowerCase().includes(search.toLowerCase())
  );
  const actionStyle = (action) => {
    if (action.includes("ADD")||action.includes("NEW")||action.includes("CREATE")) return { background:"#f0fdf4", color:"#166534" };
    if (action.includes("DELETE")||action.includes("DENIED")||action.includes("DEACTIVATE")) return { background:T.primaryLt, color:T.primary };
    if (action.includes("EDIT")||action.includes("ACTIVATE")) return { background:T.accentLt, color:T.accent };
    if (action.includes("RELEASE")) return { background:"#faf5ff", color:"#7e22ce" };
    return { background:"#eff6ff", color:"#1d4ed8" };
  };
  return (
    <div className="space-y-5">
      <div className="relative max-w-sm">
        <Icon path={ICONS.search} size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search logs…"
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none" />
      </div>
      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden" style={{ borderColor:"#f0e0de" }}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b" style={{ borderColor:"#faeae8", background:"#fdf6f5" }}>
              {["Action","Consumable — Department","User","Date","Time"].map(h=>(
                <th key={h} className="text-left px-5 py-3.5 text-xs font-bold uppercase tracking-wider" style={{ color:T.primary }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length===0 && <tr><td colSpan={5} className="text-center text-gray-400 py-14">No logs found.</td></tr>}
            {filtered.map(l => {
              let detail = (l.details||"").replace(/ x\d+/g,"").replace(/ \(Base Qty:\d+\)/g,"").replace(/ \(Qty: \d+\)/g,"");
              return (
                <tr key={l.id} className="border-b last:border-0 hover:bg-red-50/20 transition-colors" style={{ borderColor:"#fdf5f4" }}>
                  <td className="px-5 py-3"><span className="text-xs px-2.5 py-1 rounded-full font-semibold" style={actionStyle(l.action)}>{l.action}</span></td>
                  <td className="px-5 py-3 text-xs font-semibold" style={{ color:T.dark }}>{detail}</td>
                  <td className="px-5 py-3 font-semibold text-sm" style={{ color:T.dark }}>{l.user}</td>
                  <td className="px-5 py-3 text-gray-400 text-xs">{l.date}</td>
                  <td className="px-5 py-3 text-gray-400 text-xs">{l.time}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Accounts (MIS only) ──────────────────────────────────────────────────────────
function Accounts({ accounts, setAccounts, currentUser, showToast, addLog, logs }) {
  const [showModal, setShowModal] = useState(false);
  const [editing,   setEditing]   = useState(null);
  const [showPass,  setShowPass]  = useState(false);
  const [filterRole, setFilterRole] = useState("all");
  const [form, setForm] = useState({ name:"", email:"", password:"", role:"dept", dept: COLLEGES[0], active:true });

  const openAdd  = () => { setEditing(null); setForm({ name:"", email:"", password:"", role:"dept", dept:COLLEGES[0], active:true }); setShowPass(false); setShowModal(true); };
  const openEdit = (a) => { setEditing(a); setForm({...a}); setShowPass(false); setShowModal(true); };

  // When role changes, auto-set dept to sensible default
  const handleRoleChange = (role) => {
    const defaultDept = role === "mis" ? "MIS" : role === "clerk" ? "SPMO" : COLLEGES[0];
    setForm(f => ({ ...f, role, dept: defaultDept }));
  };

  const save = async () => {
    if (!form.name || !form.email || (!editing && !form.password)) return showToast("Fill all required fields.", "error");
    if (!form.dept) return showToast("Please assign a department/college.", "error");
    let updated;
    if (editing) {
      const patch = { ...form };
      if (!patch.password) patch.password = editing.password;
      updated = accounts.map(a => a.id===editing.id ? {...a,...patch} : a);
      showToast("Account updated.");
    } else {
      if (accounts.find(a=>a.email.toLowerCase()===form.email.toLowerCase())) return showToast("Email already exists.", "error");
      updated = [...accounts, {...form, id:`a${Date.now()}`}];
      showToast("Account created.");
    }
    setAccounts(updated); await saveData(KEYS.accounts, updated);
    await addLog(editing?"EDIT ACCOUNT":"CREATE ACCOUNT", `${form.name} (${form.role} · ${form.dept})`, logs);
    setShowModal(false);
  };

  const toggleActive = async (acc) => {
    const updated = accounts.map(a=>a.id===acc.id ? {...a,active:!a.active} : a);
    setAccounts(updated); await saveData(KEYS.accounts, updated);
    await addLog(acc.active?"DEACTIVATE ACCOUNT":"ACTIVATE ACCOUNT", `${acc.name} (${acc.dept})`, logs);
    showToast(`Account ${acc.active?"deactivated":"activated"}.`);
  };

  const deleteAccount = async (acc) => {
    if (!confirm(`Delete account for "${acc.name}"? This cannot be undone.`)) return;
    const updated = accounts.filter(a => a.id !== acc.id);
    setAccounts(updated); await saveData(KEYS.accounts, updated);
    await addLog("DELETE ACCOUNT", `${acc.name} (${acc.dept})`, logs);
    showToast("Account deleted.", "error");
  };

  const roleLabel = { mis:"MIS Administrator", clerk:"Inventory Clerk", dept:"Department" };
  const roleBadgeStyle = {
    mis:   { background: T.primaryLt,  color: T.primary },
    clerk: { background: T.accentLt,   color: T.accent  },
    dept:  { background: "#f0f9ff",     color: "#0369a1" },
  };

  const filtered = filterRole === "all" ? accounts : accounts.filter(a => a.role === filterRole);

  // Summary counts
  const counts = { all: accounts.length, mis: accounts.filter(a=>a.role==="mis").length, clerk: accounts.filter(a=>a.role==="clerk").length, dept: accounts.filter(a=>a.role==="dept").length };

  return (
    <div className="space-y-5">
      {/* Header row */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        {/* Filter tabs */}
        <div className="flex gap-1 bg-white rounded-xl border border-gray-200 p-1">
          {[["all","All"], ["mis","MIS Admin"], ["clerk","Inventory Clerk"], ["dept","Department"]].map(([val, label]) => (
            <button key={val} onClick={() => setFilterRole(val)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5"
              style={filterRole === val ? { background: GRD, color: "#fff" } : { color: "#888" }}>
              {label}
              <span className="text-xs px-1.5 py-0.5 rounded-full font-bold"
                style={filterRole === val ? { background:"rgba(255,255,255,0.25)", color:"#fff" } : { background:"#f0e0de", color: T.primary }}>
                {counts[val]}
              </span>
            </button>
          ))}
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold" style={{ background:GRD }}>
          <Icon path={ICONS.plus} size={16}/> Add Account
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden" style={{ borderColor:"#f0e0de" }}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b" style={{ borderColor:"#faeae8", background:"#fdf6f5" }}>
              {["Name","Email","Role","College / Department","Status","Actions"].map(h=>(
                <th key={h} className="text-left px-5 py-3.5 text-xs font-bold uppercase tracking-wider" style={{ color:T.primary }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(a=>(
              <tr key={a.id} className="border-b last:border-0 hover:bg-red-50/20 transition-colors" style={{ borderColor:"#fdf5f4" }}>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ background:GRD }}>{a.name[0]}</div>
                    <span className="font-semibold" style={{ color:T.dark }}>{a.name}</span>
                  </div>
                </td>
                <td className="px-5 py-3.5 text-gray-500 text-sm">{a.email}</td>
                <td className="px-5 py-3.5">
                  <span className="text-xs px-2.5 py-1 rounded-full font-semibold" style={roleBadgeStyle[a.role] || roleBadgeStyle.dept}>
                    {roleLabel[a.role] || a.role}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-gray-500 text-sm max-w-xs">
                  <span className="truncate block" title={a.dept}>{a.dept}</span>
                </td>
                <td className="px-5 py-3.5">
                  {a.active
                    ? <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-green-50 text-green-700 border border-green-200">Active</span>
                    : <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-gray-100 text-gray-500 border border-gray-200">Inactive</span>
                  }
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-2">
                    <button onClick={()=>openEdit(a)} className="p-1.5 rounded-lg" style={{ color:T.accent }}
                      onMouseEnter={e=>e.currentTarget.style.background=T.accentLt}
                      onMouseLeave={e=>e.currentTarget.style.background="transparent"}
                      title="Edit">
                      <Icon path={ICONS.edit} size={15}/>
                    </button>
                    {a.email !== currentUser.email && (
                      <button onClick={()=>toggleActive(a)} className="p-1.5 rounded-lg" style={{ color:a.active?T.primary:"#16a34a" }}
                        onMouseEnter={e=>e.currentTarget.style.background=T.primaryLt}
                        onMouseLeave={e=>e.currentTarget.style.background="transparent"}
                        title={a.active?"Deactivate":"Activate"}>
                        <Icon path={a.active?ICONS.x:ICONS.check} size={15}/>
                      </button>
                    )}
                    {a.email !== currentUser.email && (
                      <button onClick={()=>deleteAccount(a)} className="p-1.5 rounded-lg" style={{ color:"#9ca3af" }}
                        onMouseEnter={e=>{ e.currentTarget.style.background=T.primaryLt; e.currentTarget.style.color=T.primary; }}
                        onMouseLeave={e=>{ e.currentTarget.style.background="transparent"; e.currentTarget.style.color="#9ca3af"; }}
                        title="Delete">
                        <Icon path={ICONS.trash} size={15}/>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length===0 && <tr><td colSpan={6} className="text-center text-gray-400 py-12">No accounts found.</td></tr>}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="font-bold text-lg mb-5" style={{ color:T.dark }}>{editing?"Edit Account":"Create Account"}</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold mb-1 text-gray-500">Full Name *</label>
                <input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1 text-gray-500">Email *</label>
                <input type="email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1 text-gray-500">{editing?"New Password (blank = keep current)":"Password *"}</label>
                <div className="relative">
                  <input type={showPass?"text":"password"} value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))}
                    className="w-full pl-3 pr-10 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none" />
                  <button onClick={()=>setShowPass(s=>!s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <Icon path={showPass?ICONS.eyeoff:ICONS.eye} size={15}/>
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1 text-gray-500">Role *</label>
                <select value={form.role} onChange={e=>handleRoleChange(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none bg-white">
                  <option value="mis">MIS Administrator</option>
                  <option value="clerk">Inventory Clerk</option>
                  <option value="dept">Department</option>
                </select>
              </div>
              {/* Department field — conditional on role */}
              {form.role === "dept" ? (
                <div>
                  <label className="block text-xs font-semibold mb-1 text-gray-500">College / Department *</label>
                  <select value={form.dept} onChange={e=>setForm(f=>({...f,dept:e.target.value}))}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none bg-white">
                    {COLLEGES.map(c=><option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold mb-1 text-gray-500">Office / Unit</label>
                  <input value={form.dept} onChange={e=>setForm(f=>({...f,dept:e.target.value}))}
                    placeholder={form.role === "mis" ? "MIS" : "SPMO"}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none" />
                </div>
              )}
              <div className="flex items-center gap-3 pt-1">
                <label className="text-xs font-semibold text-gray-500">Account Active</label>
                <button onClick={()=>setForm(f=>({...f,active:!f.active}))}
                  className="w-10 h-5 rounded-full transition-all relative flex-shrink-0"
                  style={{ background: form.active ? T.primary : "#d1d5db" }}>
                  <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all"
                    style={{ left: form.active ? "22px" : "2px" }} />
                </button>
                <span className="text-xs text-gray-400">{form.active ? "Active" : "Inactive"}</span>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={()=>setShowModal(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={save} className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold" style={{ background:GRD }}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
