import { useState, useEffect, useRef } from "react";

// ─── Config ───────────────────────────────────────────────────
const SCRIPT_URL = "https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec";

const C = {
  bg: "#080810", card: "#0f0f1a", card2: "#13131f", border: "#1e1e30",
  primary: "#e63946", secondary: "#f4a261", accent: "#2a9d8f",
  text: "#f0f0f0", muted: "#666",
};
const font = "'Segoe UI', Tahoma, sans-serif";
const SCREENS = { LOADING: "loading", LOGIN: "login", HOME: "home", WORKOUT: "workout", HISTORY: "history" };
const LS_USER    = "gym_user";
const LS_HISTORY = "gym_history_cache";
const LS_EQUIP   = "gym_equipment_cache";
const LS_USERS   = "gym_users_cache";

// ─── LocalStorage ─────────────────────────────────────────────
const LS = {
  get:  k => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch { return null; } },
  set:  (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  del:  k => { try { localStorage.removeItem(k); } catch {} },
};

// ─── API ──────────────────────────────────────────────────────
async function sheetGet(params) {
  const qs = new URLSearchParams(params).toString();
  return (await fetch(`${SCRIPT_URL}?${qs}`)).json();
}
async function sheetPost(body) {
  return (await fetch(SCRIPT_URL, { method: "POST", body: JSON.stringify(body) })).json();
}

// ─── AI ───────────────────────────────────────────────────────
function buildSystemPrompt(username, history, equipment) {
  // Keep prompt SHORT to avoid Apps Script 30s timeout
  const recent = [...history].reverse().slice(0, 3); // only last 3 sessions
  const fmt = recent.length === 0
    ? "אימון ראשון."
    : recent.map((s, i) => {
        const d = new Date(s.date).toLocaleDateString("he-IL", { day: "numeric", month: "numeric" });
        const exs = s.exercises.map(e =>
          `${e.name}${e.equipId ? `(${e.equipId})` : ""}: ${e.sets.map(st => `${st.reps}×${st.weight}`).join(",")}`
        ).join(" | ");
        return `${d}: ${exs}`;
      }).join("\n");
  const eq = equipment.length
    ? "\nציוד: " + equipment.map(e => `${e.id}=${e.name}`).join(", ")
    : "";
  return `מאמן כושר. משתמש: ${username}.
היסטוריה (3 אחרונים):
${fmt}${eq}
כללים: שאל יום (A/B/C) ואנרגיה (1-5). A=רגליים, B=דחיפה, C=משיכה. ציין מס' מכשיר. עומס: +2.5-5ק"ג אם שיפור. עברית, קצר.`;
}

async function callClaude(messages, sys) {
  // Try once, on timeout/error retry with even shorter context
  try {
    const d = await sheetPost({ action: "chat", system: sys, messages });
    if (d.ok) return d.reply;
    // If server busy, wait 2s and retry once
    if (d.error && (d.error.includes("עמוס") || d.error.includes("529") || d.error.includes("503"))) {
      await new Promise(r => setTimeout(r, 2000));
      const d2 = await sheetPost({ action: "chat", system: sys, messages: messages.slice(-2) }); // only last 2 messages
      return d2.ok ? d2.reply : `שגיאה: ${d2.error}`;
    }
    return `שגיאה: ${d.error}`;
  } catch {
    // Retry once on network error
    try {
      await new Promise(r => setTimeout(r, 1500));
      const d = await sheetPost({ action: "chat", system: sys, messages: messages.slice(-2) });
      return d.ok ? d.reply : "בעיית תקשורת — נסה שוב.";
    } catch { return "בעיית תקשורת — בדוק חיבור."; }
  }
}

// ─── Components ──────────────────────────────────────────────
function Btn({ children, onClick, color = C.primary, style = {}, disabled = false }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      background: color, border: "none", borderRadius: 12,
      padding: "12px 18px", color: "#fff", fontWeight: 700, fontSize: 15,
      cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1,
      WebkitTapHighlightColor: "transparent", flexShrink: 0, ...style,
    }}>{children}</button>
  );
}
function Inp({ value, onChange, placeholder, type = "text", style = {}, onKeyDown, autoFocus }) {
  return <input value={value} onChange={onChange} onKeyDown={onKeyDown} placeholder={placeholder}
    type={type} autoFocus={autoFocus}
    style={{ background: "#15151f", border: `1px solid ${C.border}`, borderRadius: 12,
      padding: "12px 15px", color: "#fff", fontSize: 15, outline: "none",
      WebkitAppearance: "none", width: "100%", boxSizing: "border-box", ...style }} />;
}

// Spinner with message
function LoadingSpinner({ message, sub }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
      <div style={{
        width: 48, height: 48, border: `3px solid ${C.border}`,
        borderTop: `3px solid ${C.primary}`, borderRadius: "50%",
        animation: "spin 0.9s linear infinite",
      }} />
      <div style={{ color: "#fff", fontWeight: 700, fontSize: 15 }}>{message}</div>
      {sub && <div style={{ color: C.muted, fontSize: 12 }}>{sub}</div>}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ─── App ─────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen]             = useState(SCREENS.LOADING);
  const [loadMsg, setLoadMsg]           = useState("מאתחל...");
  const [loadSub, setLoadSub]           = useState("");

  const [users, setUsers]               = useState([]);
  const [equipment, setEquipment]       = useState([]);
  const [currentUser, setCurrentUser]   = useState(null);
  const [userHistory, setUserHistory]   = useState([]);

  // Login
  const [nameInput, setNameInput]       = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError]     = useState("");
  const [confirmNew, setConfirmNew]     = useState(false);

  // Workout
  const [messages, setMessages]         = useState([]);
  const [input, setInput]               = useState("");
  const [loading, setLoading]           = useState(false);
  const [logged, setLogged]             = useState([]);
  const [showModal, setShowModal]       = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [newEx, setNewEx]               = useState({ name: "", sets: [{ reps: "", weight: "" }] });
  const [startTime, setStartTime]       = useState(null);
  const [saving, setSaving]             = useState(false);
  const chatRef = useRef(null);

  // ── Boot: load everything ──────────────────────────────────
  useEffect(() => { bootApp(); }, []);

  const bootApp = async () => {
    setScreen(SCREENS.LOADING);
    setLoadMsg("טוען ציוד ומשתמשים...");
    setLoadSub("מתחבר ל-Google Sheets");

    // Load users + equipment in parallel (with cache fallback)
    const [usersData, equipData] = await Promise.all([
      sheetGet({ action: "getUsers" }).catch(() => null),
      sheetGet({ action: "getEquipment" }).catch(() => null),
    ]);

    const userList = usersData?.ok ? usersData.users : (LS.get(LS_USERS) || []);
    const equipList = equipData?.ok ? equipData.equipment : (LS.get(LS_EQUIP) || []);
    if (usersData?.ok) LS.set(LS_USERS, userList);
    if (equipData?.ok) LS.set(LS_EQUIP, equipList);
    setUsers(userList);
    setEquipment(equipList);

    // Restore logged-in user
    const savedUser = LS.get(LS_USER);
    if (savedUser) {
      setLoadMsg(`טוען היסטוריה של ${savedUser}...`);
      setLoadSub("זה עלול לקחת כמה שניות");
      await loadUserHistory(savedUser);
      setCurrentUser(savedUser);
      setScreen(SCREENS.HOME);
    } else {
      setScreen(SCREENS.LOGIN);
    }
  };

  const loadUserHistory = async (name) => {
    // Use cache immediately, then refresh in background
    const cached = LS.get(LS_HISTORY + "_" + name);
    if (cached) setUserHistory(cached);
    try {
      const d = await sheetGet({ action: "getHistory", username: name });
      if (d.ok) {
        setUserHistory(d.history);
        LS.set(LS_HISTORY + "_" + name, d.history);
      }
    } catch {}
  };

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages, loading]);

  // ── Login ──────────────────────────────────────────────────
  const loginDirect = async (name) => {
    setLoginLoading(true);
    setLoadMsg(`טוען היסטוריה של ${name}...`);
    setLoadSub("");
    const cached = LS.get(LS_HISTORY + "_" + name);
    if (!cached) setScreen(SCREENS.LOADING); // show loading if no cache
    LS.set(LS_USER, name);
    setCurrentUser(name);
    await loadUserHistory(name);
    setLoginLoading(false);
    setNameInput("");
    setConfirmNew(false);
    setLoginError("");
    setScreen(SCREENS.HOME);
  };

  const logout = () => {
    LS.del(LS_USER);
    setCurrentUser(null);
    setUserHistory([]);
    setNameInput("");
    setLoginError("");
    setConfirmNew(false);
    setScreen(SCREENS.LOGIN);
  };

  const handleNameSubmit = async () => {
    const name = nameInput.trim();
    if (!name) return;
    setLoginLoading(true);
    setLoginError("");
    try {
      const cachedUsers = LS.get(LS_USERS) || [];
      const fresh = await sheetGet({ action: "getUsers" }).catch(() => null);
      const list = fresh?.ok ? fresh.users : cachedUsers;
      if (fresh?.ok) { setUsers(list); LS.set(LS_USERS, list); }
      const match = list.find(u => u.toLowerCase() === name.toLowerCase());
      if (match) {
        await loginDirect(match);
      } else {
        setConfirmNew(true);
        setLoginLoading(false);
      }
    } catch {
      setLoginError("בעיית חיבור. נסה שוב.");
      setLoginLoading(false);
    }
  };

  const createNewUser = async () => {
    const name = nameInput.trim();
    if (!name) return;
    setLoginLoading(true);
    try {
      await sheetPost({ action: "addUser", username: name });
      await loginDirect(name);
    } catch {
      setLoginError("שגיאה ביצירת משתמש.");
      setLoginLoading(false);
    }
  };

  // ── Workout ────────────────────────────────────────────────
  const startWorkout = async () => {
    setMessages([]); setLogged([]); setStartTime(Date.now());
    setScreen(SCREENS.WORKOUT); setLoading(true);
    const sys = buildSystemPrompt(currentUser, userHistory, equipment);
    const reply = await callClaude([{ role: "user", content: "הגעתי לחדר כושר!" }], sys);
    setMessages([{ role: "user", content: "הגעתי לחדר כושר! 🏋️" }, { role: "assistant", content: reply }]);
    setLoading(false);
  };

  const send = async () => {
    if (!input.trim() || loading) return;
    const txt = input.trim(); setInput("");
    const next = [...messages, { role: "user", content: txt }];
    setMessages(next); setLoading(true);
    const reply = await callClaude(
      next.map(m => ({ role: m.role, content: m.content })),
      buildSystemPrompt(currentUser, userHistory, equipment)
    );
    setMessages([...next, { role: "assistant", content: reply }]);
    setLoading(false);
  };

  const saveEx = () => {
    const ex = {
      name: newEx.name.trim(),
      sets: newEx.sets.filter(s => s.reps && s.weight).map(s => ({ reps: parseInt(s.reps), weight: parseFloat(s.weight) })),
    };
    if (!ex.name || !ex.sets.length) return;
    setLogged(prev => [...prev, ex]);
    setShowModal(false);
    setNewEx({ name: "", sets: [{ reps: "", weight: "" }] });
    const notif = `✅ רשמתי: ${ex.name} — ${ex.sets.map(s => `${s.reps}×${s.weight}ק"ג`).join(", ")}`;
    const next = [...messages, { role: "user", content: notif }];
    setMessages(next); setLoading(true);
    callClaude(
      next.map(m => ({ role: m.role, content: m.content })),
      buildSystemPrompt(currentUser, userHistory, equipment)
    ).then(r => { setMessages([...next, { role: "assistant", content: r }]); setLoading(false); });
  };

  // Save workout to Sheets (only at end)
  const endWorkout = async () => {
    setSaving(true);
    const session = {
      date: new Date(startTime).toISOString(),
      duration: Math.round((Date.now() - startTime) / 60000),
      exercises: logged,
    };
    try {
      setLoadMsg("שומר אימון ל-Google Sheets...");
      setLoadSub(`${logged.length} תרגילים · ${session.duration} דק'`);
      setScreen(SCREENS.LOADING);
      await sheetPost({ action: "saveWorkout", username: currentUser, ...session });
      // Refresh history from Sheets
      setLoadMsg("מרענן היסטוריה...");
      setLoadSub("");
      const d = await sheetGet({ action: "getHistory", username: currentUser });
      if (d.ok) {
        setUserHistory(d.history);
        LS.set(LS_HISTORY + "_" + currentUser, d.history);
      }
    } catch {
      // Even if sync fails, update local history optimistically
      const updated = [...userHistory, session];
      setUserHistory(updated);
      LS.set(LS_HISTORY + "_" + currentUser, updated);
    }
    setSaving(false);
    setScreen(SCREENS.HOME);
  };

  // Exit without saving
  const exitWithoutSave = () => {
    setShowExitDialog(false);
    setScreen(SCREENS.HOME);
  };

  const totalSets = logged.reduce((a, e) => a + e.sets.length, 0);

  // ══════════════════════════════════════════════════════════════
  // SCREENS
  // ══════════════════════════════════════════════════════════════

  // ── LOADING ──────────────────────────────────────────────────
  if (screen === SCREENS.LOADING) return (
    <div style={{ minHeight: "100dvh", background: C.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: font, direction: "rtl", padding: 24 }}>
      <div style={{ fontSize: 44, marginBottom: 20 }}>🏋️</div>
      <LoadingSpinner message={loadMsg} sub={loadSub} />
    </div>
  );

  // ── LOGIN ────────────────────────────────────────────────────
  if (screen === SCREENS.LOGIN) return (
    <div style={{ minHeight: "100dvh", background: C.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "clamp(16px,4vw,32px) 20px", direction: "rtl", fontFamily: font }}>
      <div style={{ fontSize: "clamp(40px,10vw,56px)", marginBottom: 8 }}>🏋️</div>
      <h1 style={{ color: "#fff", fontWeight: 900, fontSize: "clamp(22px,5vw,28px)", margin: "0 0 4px" }}>GymAgent</h1>
      <p style={{ color: C.muted, fontSize: 12, margin: "0 0 clamp(20px,5vw,36px)", display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ width: 6, height: 6, background: "#22c55e", borderRadius: "50%", display: "inline-block" }} />
        מאמן אישי חכם
      </p>

      <div style={{ width: "100%", maxWidth: 360 }}>
        {!confirmNew ? (
          <>
            <div style={{ color: "#555", fontSize: 11, fontWeight: 700, letterSpacing: 2, marginBottom: 10 }}>הכנס שם משתמש</div>
            <div style={{ display: "flex", gap: 8 }}>
              <Inp value={nameInput} onChange={e => { setNameInput(e.target.value); setLoginError(""); }}
                onKeyDown={e => e.key === "Enter" && !loginLoading && handleNameSubmit()}
                placeholder="השם שלך..." autoFocus style={{ flex: 1 }} />
              <Btn onClick={handleNameSubmit} disabled={loginLoading || !nameInput.trim()} style={{ padding: "12px 18px" }}>
                {loginLoading ? "⟳" : "→"}
              </Btn>
            </div>
            {loginError && <div style={{ color: C.primary, fontSize: 12, marginTop: 8 }}>⚠️ {loginError}</div>}
          </>
        ) : (
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 22 }}>
            <div style={{ color: "#fff", fontWeight: 800, fontSize: 16, marginBottom: 6 }}>"{nameInput}" לא נמצא</div>
            <div style={{ color: C.muted, fontSize: 13, marginBottom: 20, lineHeight: 1.5 }}>האם אתה משתמש חדש, או אולי שגית בשם?</div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => { setConfirmNew(false); setNameInput(""); }}
                style={{ flex: 1, background: "#15151f", border: `1px solid ${C.border}`, borderRadius: 12, padding: 13, color: "#aaa", fontSize: 14, cursor: "pointer" }}>
                ← תקן שם
              </button>
              <Btn onClick={createNewUser} disabled={loginLoading} color={C.accent} style={{ flex: 2, borderRadius: 12 }}>
                {loginLoading ? "יוצר..." : "משתמש חדש ✓"}
              </Btn>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // ── HOME ─────────────────────────────────────────────────────
  if (screen === SCREENS.HOME) {
    const thisWeek = userHistory.filter(h => Date.now() - new Date(h.date) < 7 * 86400000).length;
    const last = userHistory[userHistory.length - 1];
    return (
      <div style={{ minHeight: "100dvh", background: C.bg, direction: "rtl", fontFamily: font, padding: "clamp(16px,5vw,32px) clamp(14px,4vw,24px) 24px", maxWidth: 560, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "clamp(16px,4vw,28px)" }}>
          <div>
            <div style={{ color: C.muted, fontSize: 12 }}>שלום,</div>
            <div style={{ color: "#fff", fontSize: "clamp(18px,4vw,24px)", fontWeight: 900 }}>{currentUser} 👋</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setScreen(SCREENS.HISTORY)} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "8px 14px", color: "#aaa", fontSize: 13, cursor: "pointer" }}>📋</button>
            <button onClick={logout} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "8px 14px", color: "#aaa", fontSize: 13, cursor: "pointer" }}>יציאה</button>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "clamp(6px,2vw,12px)", marginBottom: "clamp(14px,3vw,22px)" }}>
          {[
            { label: "סה\"כ", val: userHistory.length, icon: "📅", color: C.primary },
            { label: "השבוע",  val: thisWeek, icon: "🔥", color: C.secondary },
            { label: "תרגילים", val: new Set(userHistory.flatMap(h => h.exercises.map(e => e.name))).size, icon: "💪", color: C.accent },
          ].map((s, i) => (
            <div key={i} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "clamp(10px,2vw,16px) 8px", textAlign: "center" }}>
              <div style={{ fontSize: "clamp(16px,4vw,22px)", marginBottom: 3 }}>{s.icon}</div>
              <div style={{ color: s.color, fontSize: "clamp(18px,5vw,24px)", fontWeight: 900 }}>{s.val}</div>
              <div style={{ color: C.muted, fontSize: "clamp(9px,2vw,11px)", marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {last && (
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: "clamp(12px,3vw,18px)", marginBottom: "clamp(14px,3vw,22px)" }}>
            <div style={{ color: C.muted, fontSize: 11, fontWeight: 700, letterSpacing: 1, marginBottom: 8 }}>אימון אחרון</div>
            <div style={{ color: "#ddd", fontSize: "clamp(11px,2.5vw,13px)", marginBottom: 8, display: "flex", gap: 12, flexWrap: "wrap" }}>
              <span>📅 {new Date(last.date).toLocaleDateString("he-IL", { weekday: "short", day: "numeric", month: "short" })}</span>
              <span>⏱ {last.duration} דק'</span>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              {last.exercises.map((ex, i) => (
                <span key={i} style={{ background: `${C.primary}15`, border: `1px solid ${C.primary}30`, borderRadius: 8, padding: "3px 9px", color: C.primary, fontSize: "clamp(10px,2vw,12px)", fontWeight: 600 }}>{ex.name}</span>
              ))}
            </div>
          </div>
        )}

        <button onClick={startWorkout} style={{
          width: "100%", background: `linear-gradient(135deg, ${C.primary}, #b91c2c)`,
          border: "none", borderRadius: 18, padding: "clamp(16px,4vw,22px) 24px",
          color: "#fff", cursor: "pointer", boxShadow: `0 10px 36px ${C.primary}40`,
          display: "flex", alignItems: "center", gap: 14, WebkitTapHighlightColor: "transparent",
        }}>
          <span style={{ fontSize: "clamp(28px,7vw,38px)" }}>🏋️</span>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontWeight: 900, fontSize: "clamp(16px,4vw,20px)" }}>הגעתי לחדר כושר!</div>
            <div style={{ fontSize: "clamp(11px,2.5vw,13px)", opacity: 0.75, marginTop: 3 }}>הסוכן יבנה אימון מותאם אישית</div>
          </div>
        </button>
      </div>
    );
  }

  // ── WORKOUT ───────────────────────────────────────────────────
  if (screen === SCREENS.WORKOUT) return (
    <div style={{ height: "100dvh", background: C.bg, direction: "rtl", fontFamily: font, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Top bar */}
      <div style={{ background: C.card, borderBottom: `1px solid ${C.border}`, padding: "10px 14px", paddingTop: "max(10px,env(safe-area-inset-top))", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, flex: 1 }}>
          <span style={{ width: 8, height: 8, background: "#22c55e", borderRadius: "50%", flexShrink: 0, boxShadow: "0 0 8px #22c55e" }} />
          <span style={{ color: "#fff", fontWeight: 800, fontSize: "clamp(12px,3vw,14px)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{currentUser}</span>
          {totalSets > 0 && <span style={{ background: `${C.accent}20`, color: C.accent, borderRadius: 6, padding: "2px 7px", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{totalSets} סטים</span>}
        </div>
        <div style={{ display: "flex", gap: 7, flexShrink: 0 }}>
          <button onClick={() => setShowExitDialog(true)}
            style={{ background: "#15151f", border: `1px solid ${C.border}`, borderRadius: 9, padding: "7px 12px", color: "#888", fontSize: 12, cursor: "pointer" }}>
            יציאה
          </button>
          <Btn onClick={logged.length > 0 ? endWorkout : () => setShowExitDialog(true)}
            color={C.accent} disabled={saving} style={{ padding: "7px 12px", fontSize: 12, borderRadius: 9 }}>
            {saving ? "שומר..." : "סיים ✓"}
          </Btn>
        </div>
      </div>

      {/* Chat */}
      <div ref={chatRef} style={{ flex: 1, overflowY: "auto", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-start" : "flex-end" }}>
            <div style={{
              maxWidth: "88%",
              background: m.role === "user" ? "#15151f" : "linear-gradient(135deg,#1a1a2e,#12122a)",
              border: `1px solid ${m.role === "user" ? C.border : "#252540"}`,
              borderRadius: m.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
              padding: "11px 14px", color: "#eee", fontSize: "clamp(13px,3vw,15px)", lineHeight: 1.6, whiteSpace: "pre-wrap",
            }}>
              {m.role === "assistant" && <div style={{ fontSize: 9, color: "#44449a", fontWeight: 800, marginBottom: 4, letterSpacing: 1 }}>🤖 GYMBOT</div>}
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <div style={{ background: "#1a1a2e", border: "1px solid #252540", borderRadius: "16px 16px 16px 4px", padding: "11px 16px", color: "#555", fontSize: 13 }}>⟳ חושב...</div>
          </div>
        )}
      </div>

      {/* Logged strip */}
      {logged.length > 0 && (
        <div style={{ borderTop: `1px solid ${C.border}`, padding: "6px 14px", display: "flex", gap: 7, overflowX: "auto", flexShrink: 0, background: C.card }}>
          {logged.map((ex, i) => (
            <span key={i} style={{ background: `${C.accent}15`, border: `1px solid ${C.accent}40`, borderRadius: 8, padding: "4px 10px", whiteSpace: "nowrap", color: C.accent, fontSize: 11, fontWeight: 700 }}>
              ✓ {ex.name} ({ex.sets.length}×)
            </span>
          ))}
        </div>
      )}

      {/* Input bar */}
      <div style={{ padding: "8px 10px", paddingBottom: "max(8px,env(safe-area-inset-bottom))", borderTop: `1px solid ${C.border}`, background: C.card, display: "flex", gap: 7, alignItems: "center", flexShrink: 0 }}>
        <button onClick={() => setShowModal(true)} style={{ background: `${C.secondary}18`, border: `1px solid ${C.secondary}44`, borderRadius: 12, padding: "9px 12px", color: C.secondary, fontSize: 20, cursor: "pointer", flexShrink: 0, lineHeight: 1 }}>＋</button>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && send()}
          placeholder="שאל את הסוכן..."
          style={{ flex: 1, background: "#15151f", border: `1px solid ${C.border}`, borderRadius: 12, padding: "10px 13px", color: "#fff", fontSize: "clamp(13px,3vw,15px)", outline: "none", minWidth: 0 }} />
        <Btn onClick={send} disabled={loading} style={{ padding: "10px 14px", borderRadius: 12 }}>שלח</Btn>
      </div>

      {/* Exit dialog */}
      {showExitDialog && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300, padding: 24 }}>
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 20, padding: 28, width: "100%", maxWidth: 340, direction: "rtl" }}>
            <div style={{ fontSize: 32, textAlign: "center", marginBottom: 10 }}>🚪</div>
            <div style={{ color: "#fff", fontWeight: 900, fontSize: 17, textAlign: "center", marginBottom: 8 }}>לצאת מהאימון?</div>
            <div style={{ color: C.muted, fontSize: 13, textAlign: "center", marginBottom: 24, lineHeight: 1.5 }}>
              {logged.length > 0
                ? `יש ${logged.length} תרגילים שלא נשמרו. אפשר לשמור לפני היציאה.`
                : "אין תרגילים מוקלטים. היציאה לא תשמור שום דבר."}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {logged.length > 0 && (
                <Btn onClick={() => { setShowExitDialog(false); endWorkout(); }} color={C.accent} style={{ width: "100%", borderRadius: 12 }}>
                  💾 שמור וצא
                </Btn>
              )}
              <Btn onClick={exitWithoutSave} color="#333" style={{ width: "100%", borderRadius: 12, border: `1px solid ${C.border}` }}>
                🚪 צא בלי לשמור
              </Btn>
              <button onClick={() => setShowExitDialog(false)}
                style={{ width: "100%", background: "none", border: "none", color: "#555", fontSize: 14, cursor: "pointer", padding: "8px 0" }}>
                המשך אימון ←
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Log exercise modal */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.88)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 200 }}
          onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div style={{ background: "#0f0f1a", border: `1px solid ${C.border}`, borderRadius: "20px 20px 0 0", width: "100%", maxWidth: 500, padding: "20px 18px", paddingBottom: "max(20px,env(safe-area-inset-bottom))", direction: "rtl" }}>
            <div style={{ color: "#fff", fontWeight: 900, fontSize: 16, marginBottom: 14 }}>📝 רשום תרגיל</div>
            <Inp value={newEx.name} onChange={e => setNewEx(x => ({ ...x, name: e.target.value }))} placeholder="שם התרגיל..." style={{ marginBottom: 12 }} />
            <div style={{ color: C.muted, fontSize: 11, fontWeight: 700, letterSpacing: 1, marginBottom: 7 }}>סטים</div>
            {newEx.sets.map((s, i) => (
              <div key={i} style={{ display: "flex", gap: 7, marginBottom: 7, alignItems: "center" }}>
                <span style={{ color: "#444", fontSize: 11, minWidth: 20 }}>S{i + 1}</span>
                <input value={s.reps} type="number"
                  onChange={e => { const sets = [...newEx.sets]; sets[i] = { ...sets[i], reps: e.target.value }; setNewEx(x => ({ ...x, sets })); }}
                  placeholder="חזרות" style={{ flex: 1, background: "#15151f", border: `1px solid ${C.border}`, borderRadius: 9, padding: "9px 10px", color: "#fff", fontSize: 14, outline: "none" }} />
                <input value={s.weight} type="number"
                  onChange={e => { const sets = [...newEx.sets]; sets[i] = { ...sets[i], weight: e.target.value }; setNewEx(x => ({ ...x, sets })); }}
                  placeholder='ק"ג' style={{ flex: 1, background: "#15151f", border: `1px solid ${C.border}`, borderRadius: 9, padding: "9px 10px", color: "#fff", fontSize: 14, outline: "none" }} />
              </div>
            ))}
            <button onClick={() => setNewEx(x => ({ ...x, sets: [...x.sets, { reps: "", weight: "" }] }))}
              style={{ background: "none", border: `1px dashed ${C.border}`, borderRadius: 9, padding: "7px", color: C.muted, fontSize: 12, cursor: "pointer", width: "100%", marginBottom: 14 }}>
              + סט נוסף
            </button>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setShowModal(false)} style={{ flex: 1, background: "#15151f", border: `1px solid ${C.border}`, borderRadius: 12, padding: 12, color: "#aaa", fontSize: 14, cursor: "pointer" }}>ביטול</button>
              <Btn onClick={saveEx} color={C.accent} style={{ flex: 2, borderRadius: 12 }}>שמור ✓</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // ── HISTORY ───────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100dvh", background: C.bg, direction: "rtl", fontFamily: font, padding: "clamp(16px,4vw,28px) clamp(14px,4vw,20px)", maxWidth: 560, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
        <button onClick={() => setScreen(SCREENS.HOME)} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "8px 14px", color: "#aaa", fontSize: 13, cursor: "pointer" }}>← חזרה</button>
        <h2 style={{ color: "#fff", margin: 0, fontSize: "clamp(14px,3.5vw,17px)", fontWeight: 900 }}>היסטוריה — {currentUser}</h2>
      </div>
      {userHistory.length === 0
        ? <div style={{ textAlign: "center", color: C.muted, marginTop: 80 }}><div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>עדיין אין אימונים.</div>
        : [...userHistory].reverse().map((s, i) => {
            const ts = s.exercises.reduce((a, e) => a + e.sets.length, 0);
            return (
              <div key={i} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "clamp(12px,3vw,18px)", marginBottom: 10 }}>
                <div style={{ color: "#fff", fontWeight: 800, fontSize: "clamp(12px,3vw,14px)" }}>
                  {new Date(s.date).toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "long" })}
                </div>
                <div style={{ color: C.muted, fontSize: "clamp(10px,2.5vw,12px)", margin: "4px 0 10px" }}>
                  ⏱ {s.duration} דק' · 🏋️ {s.exercises.length} תרגילים · 🔄 {ts} סטים
                </div>
                {s.exercises.map((ex, j) => (
                  <div key={j} style={{ marginBottom: 8 }}>
                    <div style={{ color: "#ccc", fontWeight: 700, fontSize: "clamp(11px,2.5vw,13px)", marginBottom: 4 }}>{ex.name}</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                      {ex.sets.map((st, k) => (
                        <span key={k} style={{ background: "#1a1a28", border: `1px solid ${C.border}`, borderRadius: 6, padding: "2px 8px", color: "#888", fontSize: "clamp(10px,2vw,11px)" }}>
                          S{k + 1}: {st.reps}×{st.weight}ק"ג
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            );
          })
      }
    </div>
  );
}
