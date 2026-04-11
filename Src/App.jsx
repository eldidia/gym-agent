import { useState, useEffect, useRef } from "react";

// ─── Design Tokens ───────────────────────────────────────────
const C = {
  bg: "#080810", card: "#0f0f1a", card2: "#13131f", border: "#1e1e30",
  primary: "#e63946", secondary: "#f4a261", accent: "#2a9d8f",
  text: "#f0f0f0", muted: "#666",
};
const font = "'Segoe UI', Tahoma, sans-serif";
const SCREENS = { SETUP: "setup", LOGIN: "login", HOME: "home", WORKOUT: "workout", HISTORY: "history" };

// ─── Local Storage ───────────────────────────────────────────
const LS = {
  get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch {} },
};

// ─── Google Sheets API ───────────────────────────────────────
async function sheetGet(url, params) {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${url}?${qs}`);
  return res.json();
}
async function sheetPost(url, body) {
  const res = await fetch(url, { method: "POST", body: JSON.stringify(body) });
  return res.json();
}

// ─── AI ──────────────────────────────────────────────────────
function buildSystemPrompt(username, history) {
  const fmt = history.length === 0
    ? "אין היסטוריה — זה האימון הראשון."
    : [...history].reverse().slice(0, 5).map((s, i) => {
        const d = new Date(s.date).toLocaleDateString("he-IL");
        const exs = s.exercises.map(e =>
          `  • ${e.name}: ${e.sets.map(st => `${st.reps}×${st.weight}ק"ג`).join(", ")}`
        ).join("\n");
        return `אימון ${i + 1} (${d}):\n${exs}`;
      }).join("\n\n");
  return `אתה מאמן כושר אישי חכם. המשתמש: ${username}.

היסטוריית אימונים:
${fmt}

כללי עבודה:
• שאל שאלה קצרה (1–2): איזה יום תוכנית (A/B/C), ציוד זמין, אנרגיה (1–5).
• תוכנית 3 ימים: A=רגליים+ליבה, B=דחיפה עליונה, C=משיכה+ליבה.
• המלץ תרגילים ועומסים ספציפיים בהתבסס על ההיסטוריה. שיפור → +2.5–5 ק"ג.
• כשהמשתמש מציין שרשם תרגיל — אמת ועדכן המלצה.
• קצר, מקצועי, עברית בלבד.`;
}

async function callClaude(messages, systemPrompt, apiKey) {
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1000, system: systemPrompt, messages }),
    });
    const data = await res.json();
    if (data.error) return `שגיאה: ${data.error.message}`;
    return data.content?.[0]?.text || "שגיאה — נסה שוב.";
  } catch { return "בעיית תקשורת עם הסוכן."; }
}

// ─── Components ───────────────────────────────────────────────
function Btn({ children, onClick, color = C.primary, style = {}, disabled = false }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      background: color, border: "none", borderRadius: 12,
      padding: "13px 20px", color: "#fff", fontWeight: 700, fontSize: 15,
      cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1,
      WebkitTapHighlightColor: "transparent", ...style,
    }}>{children}</button>
  );
}
function Inp({ value, onChange, placeholder, type = "text", style = {}, onKeyDown }) {
  return <input value={value} onChange={onChange} onKeyDown={onKeyDown} placeholder={placeholder} type={type}
    style={{ background: "#15151f", border: `1px solid ${C.border}`, borderRadius: 12, padding: "13px 16px", color: "#fff", fontSize: 15, outline: "none", WebkitAppearance: "none", ...style }} />;
}

// ─── App ─────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState(SCREENS.SETUP);
  const [scriptUrl, setScriptUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [apiInput, setApiInput] = useState("");
  const [urlError, setUrlError] = useState("");
  const [urlTesting, setUrlTesting] = useState(false);
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [userHistory, setUserHistory] = useState([]);
  const [newName, setNewName] = useState("");
  const [addingUser, setAddingUser] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [logged, setLogged] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [newEx, setNewEx] = useState({ name: "", sets: [{ reps: "", weight: "" }] });
  const [startTime, setStartTime] = useState(null);
  const [saving, setSaving] = useState(false);
  const chatRef = useRef(null);

  // Load saved config on mount
  useEffect(() => {
    const savedUrl = LS.get("gym_script_url");
    const savedKey = LS.get("gym_api_key");
    if (savedUrl && savedKey) {
      setScriptUrl(savedUrl);
      setApiKey(savedKey);
      fetchUsers(savedUrl).then(() => setScreen(SCREENS.LOGIN));
    }
  }, []);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages, loading]);

  const fetchUsers = async (url) => {
    try {
      const d = await sheetGet(url, { action: "getUsers" });
      if (d.ok) setUsers(d.users || []);
    } catch {}
  };

  const testAndSave = async () => {
    const url = urlInput.trim();
    const key = apiInput.trim();
    if (!url || !key) { setUrlError("מלא את שני השדות."); return; }
    setUrlTesting(true); setUrlError("");
    try {
      const d = await sheetGet(url, { action: "getUsers" });
      if (d.ok) {
        setScriptUrl(url); setApiKey(key);
        LS.set("gym_script_url", url); LS.set("gym_api_key", key);
        setUsers(d.users || []);
        setScreen(SCREENS.LOGIN);
      } else { setUrlError("שגיאת סקריפט: " + d.error); }
    } catch { setUrlError("לא ניתן להתחבר. בדוק URL ופרסום."); }
    setUrlTesting(false);
  };

  const login = async (name) => {
    setCurrentUser(name);
    try {
      const d = await sheetGet(scriptUrl, { action: "getHistory", username: name });
      setUserHistory(d.ok ? d.history : []);
    } catch { setUserHistory([]); }
    setScreen(SCREENS.HOME);
  };

  const addUser = async () => {
    const name = newName.trim();
    if (!name) return;
    setAddingUser(true);
    try {
      await sheetPost(scriptUrl, { action: "addUser", username: name });
      await fetchUsers(scriptUrl);
      setNewName("");
      login(name);
    } catch {}
    setAddingUser(false);
  };

  const startWorkout = async () => {
    setMessages([]); setLogged([]); setStartTime(Date.now()); setScreen(SCREENS.WORKOUT); setLoading(true);
    const sys = buildSystemPrompt(currentUser, userHistory);
    const first = [{ role: "user", content: "הגעתי לחדר כושר!" }];
    const reply = await callClaude(first, sys, apiKey);
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
      buildSystemPrompt(currentUser, userHistory),
      apiKey
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
      buildSystemPrompt(currentUser, userHistory),
      apiKey
    ).then(r => { setMessages([...next, { role: "assistant", content: r }]); setLoading(false); });
  };

  const endWorkout = async () => {
    if (!logged.length) return alert("לא נרשמו תרגילים.");
    setSaving(true);
    const session = {
      date: new Date(startTime).toISOString(),
      duration: Math.round((Date.now() - startTime) / 60000),
      exercises: logged,
    };
    try {
      await sheetPost(scriptUrl, { action: "saveWorkout", username: currentUser, ...session });
      const d = await sheetGet(scriptUrl, { action: "getHistory", username: currentUser });
      if (d.ok) setUserHistory(d.history);
    } catch {}
    setSaving(false);
    setScreen(SCREENS.HOME);
  };

  const totalSets = logged.reduce((a, e) => a + e.sets.length, 0);

  // ── SETUP ──────────────────────────────────────────────────
  if (screen === SCREENS.SETUP) return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "28px 20px", direction: "rtl", fontFamily: font }}>
      <div style={{ fontSize: 48, marginBottom: 10 }}>⚙️</div>
      <h1 style={{ color: "#fff", fontWeight: 900, fontSize: 22, margin: "0 0 6px" }}>הגדרת GymAgent</h1>
      <p style={{ color: C.muted, fontSize: 12, textAlign: "center", maxWidth: 320, margin: "0 0 28px", lineHeight: 1.6 }}>
        הגדרה חד-פעמית. הנתונים יישמרו על המכשיר.
      </p>

      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 20, width: "100%", maxWidth: 380, marginBottom: 20 }}>
        <div style={{ color: C.secondary, fontWeight: 700, fontSize: 12, marginBottom: 14 }}>📊 Google Apps Script URL</div>
        <Inp value={urlInput} onChange={e => setUrlInput(e.target.value)}
          placeholder="https://script.google.com/macros/s/.../exec"
          style={{ width: "100%", boxSizing: "border-box", marginBottom: 16, fontSize: 12 }} />

        <div style={{ color: C.secondary, fontWeight: 700, fontSize: 12, marginBottom: 14 }}>🔑 Anthropic API Key</div>
        <Inp value={apiInput} onChange={e => setApiInput(e.target.value)}
          type="password" placeholder="sk-ant-api03-..."
          style={{ width: "100%", boxSizing: "border-box", marginBottom: 6, fontSize: 12 }} />
        <div style={{ color: C.muted, fontSize: 11, marginBottom: 16, lineHeight: 1.5 }}>
          ניתן לקבל ב-console.anthropic.com → API Keys
        </div>

        {urlError && <div style={{ color: C.primary, fontSize: 12, marginBottom: 12 }}>⚠️ {urlError}</div>}
        <Btn onClick={testAndSave} disabled={urlTesting} style={{ width: "100%" }}>
          {urlTesting ? "מתחבר..." : "שמור והתחבר ✓"}
        </Btn>
      </div>

      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16, width: "100%", maxWidth: 380 }}>
        <div style={{ color: "#555", fontSize: 11, fontWeight: 700, letterSpacing: 1, marginBottom: 10 }}>פרסום Apps Script</div>
        {["פתח Google Sheet → Extensions → Apps Script", "הדבק את קוד GymAgent.gs", "Deploy → New Deployment → Web App", "Execute as: Me | Access: Anyone", "העתק את ה-Web App URL"].map((s, i) => (
          <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6, alignItems: "flex-start" }}>
            <span style={{ background: C.primary, color: "#fff", borderRadius: "50%", width: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800, flexShrink: 0, marginTop: 1 }}>{i + 1}</span>
            <span style={{ color: "#bbb", fontSize: 11, lineHeight: 1.4 }}>{s}</span>
          </div>
        ))}
      </div>
    </div>
  );

  // ── LOGIN ──────────────────────────────────────────────────
  if (screen === SCREENS.LOGIN) return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "28px 20px", direction: "rtl", fontFamily: font }}>
      <div style={{ fontSize: 52, marginBottom: 6 }}>🏋️</div>
      <h1 style={{ color: "#fff", fontWeight: 900, fontSize: 26, margin: "0 0 4px" }}>GymAgent</h1>
      <p style={{ color: C.muted, fontSize: 12, margin: "0 0 32px", display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ width: 6, height: 6, background: "#22c55e", borderRadius: "50%", display: "inline-block" }} />
        מחובר ל-Google Sheets
      </p>

      {users.length > 0 && (
        <div style={{ width: "100%", maxWidth: 340, marginBottom: 24 }}>
          <div style={{ color: "#555", fontSize: 11, fontWeight: 700, letterSpacing: 2, marginBottom: 10 }}>בחר משתמש</div>
          {users.map(u => (
            <button key={u} onClick={() => login(u)} style={{
              width: "100%", background: C.card, border: `1px solid ${C.border}`,
              borderRadius: 14, padding: "15px 20px", color: "#fff", fontSize: 15, fontWeight: 600,
              cursor: "pointer", marginBottom: 8, display: "flex", alignItems: "center", gap: 14,
              WebkitTapHighlightColor: "transparent",
            }}>
              <span style={{ background: C.card2, borderRadius: 10, padding: "7px 10px", fontSize: 22 }}>👤</span>
              <div style={{ textAlign: "right" }}>
                <div>{u}</div>
                <div style={{ color: C.muted, fontSize: 11, fontWeight: 400, marginTop: 2 }}>לחץ להתחברות</div>
              </div>
            </button>
          ))}
        </div>
      )}

      <div style={{ width: "100%", maxWidth: 340, marginBottom: 20 }}>
        <div style={{ color: "#555", fontSize: 11, fontWeight: 700, letterSpacing: 2, marginBottom: 10 }}>משתמש חדש</div>
        <div style={{ display: "flex", gap: 8 }}>
          <Inp value={newName} onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addUser()}
            placeholder="הכנס שם..." style={{ flex: 1 }} />
          <Btn onClick={addUser} disabled={addingUser} style={{ padding: "13px 18px", fontSize: 18 }}>
            {addingUser ? "⟳" : "+"}
          </Btn>
        </div>
      </div>

      <button onClick={() => setScreen(SCREENS.SETUP)} style={{ background: "none", border: "none", color: "#444", fontSize: 12, cursor: "pointer", padding: "8px 0" }}>
        ⚙️ שנה הגדרות
      </button>
    </div>
  );

  // ── HOME ───────────────────────────────────────────────────
  if (screen === SCREENS.HOME) {
    const thisWeek = userHistory.filter(h => Date.now() - new Date(h.date) < 7 * 86400000).length;
    const last = userHistory[userHistory.length - 1];
    return (
      <div style={{ minHeight: "100vh", background: C.bg, direction: "rtl", fontFamily: font, padding: "40px 20px 28px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
          <div>
            <div style={{ color: C.muted, fontSize: 13 }}>שלום,</div>
            <div style={{ color: "#fff", fontSize: 24, fontWeight: 900 }}>{currentUser} 👋</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setScreen(SCREENS.HISTORY)} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "9px 14px", color: "#aaa", fontSize: 13, cursor: "pointer" }}>📋</button>
            <button onClick={() => setScreen(SCREENS.LOGIN)} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "9px 14px", color: "#aaa", fontSize: 13, cursor: "pointer" }}>🔄</button>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 22 }}>
          {[
            { label: "סה\"כ", val: userHistory.length, icon: "📅", color: C.primary },
            { label: "השבוע", val: thisWeek, icon: "🔥", color: C.secondary },
            { label: "תרגילים", val: new Set(userHistory.flatMap(h => h.exercises.map(e => e.name))).size, icon: "💪", color: C.accent },
          ].map((s, i) => (
            <div key={i} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "16px 10px", textAlign: "center" }}>
              <div style={{ fontSize: 22, marginBottom: 4 }}>{s.icon}</div>
              <div style={{ color: s.color, fontSize: 24, fontWeight: 900 }}>{s.val}</div>
              <div style={{ color: C.muted, fontSize: 11, marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {last && (
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 18, marginBottom: 22 }}>
            <div style={{ color: C.muted, fontSize: 11, fontWeight: 700, letterSpacing: 1, marginBottom: 10 }}>אימון אחרון</div>
            <div style={{ color: "#ddd", fontSize: 13, marginBottom: 10, display: "flex", gap: 14, flexWrap: "wrap" }}>
              <span>📅 {new Date(last.date).toLocaleDateString("he-IL", { weekday: "short", day: "numeric", month: "short" })}</span>
              <span>⏱ {last.duration} דק'</span>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {last.exercises.map((ex, i) => (
                <span key={i} style={{ background: `${C.primary}15`, border: `1px solid ${C.primary}30`, borderRadius: 8, padding: "4px 10px", color: C.primary, fontSize: 12, fontWeight: 600 }}>{ex.name}</span>
              ))}
            </div>
          </div>
        )}

        <button onClick={startWorkout} style={{
          width: "100%", background: `linear-gradient(135deg, ${C.primary}, #b91c2c)`,
          border: "none", borderRadius: 18, padding: "22px 24px", color: "#fff", cursor: "pointer",
          boxShadow: `0 12px 40px ${C.primary}40`, display: "flex", alignItems: "center", gap: 14,
          WebkitTapHighlightColor: "transparent",
        }}>
          <span style={{ fontSize: 38 }}>🏋️</span>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontWeight: 900, fontSize: 20 }}>הגעתי לחדר כושר!</div>
            <div style={{ fontSize: 13, opacity: 0.75, marginTop: 3 }}>הסוכן יבנה אימון מותאם אישית</div>
          </div>
        </button>
      </div>
    );
  }

  // ── WORKOUT ────────────────────────────────────────────────
  if (screen === SCREENS.WORKOUT) return (
    <div style={{ height: "100vh", background: C.bg, direction: "rtl", fontFamily: font, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ background: C.card, borderBottom: `1px solid ${C.border}`, padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, paddingTop: "env(safe-area-inset-top, 14px)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ width: 9, height: 9, background: "#22c55e", borderRadius: "50%", display: "inline-block", boxShadow: "0 0 8px #22c55e" }} />
          <span style={{ color: "#fff", fontWeight: 800, fontSize: 14 }}>אימון פעיל — {currentUser}</span>
          {totalSets > 0 && <span style={{ background: `${C.accent}20`, color: C.accent, borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>{totalSets} סטים</span>}
        </div>
        <Btn onClick={endWorkout} color={C.accent} disabled={saving} style={{ padding: "8px 14px", fontSize: 12, borderRadius: 9 }}>
          {saving ? "שומר..." : "סיים ✓"}
        </Btn>
      </div>

      <div ref={chatRef} style={{ flex: 1, overflowY: "auto", padding: "16px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-start" : "flex-end" }}>
            <div style={{
              maxWidth: "88%",
              background: m.role === "user" ? "#15151f" : "linear-gradient(135deg, #1a1a2e, #12122a)",
              border: `1px solid ${m.role === "user" ? C.border : "#252540"}`,
              borderRadius: m.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
              padding: "12px 15px", color: "#eee", fontSize: 14, lineHeight: 1.65, whiteSpace: "pre-wrap",
            }}>
              {m.role === "assistant" && <div style={{ fontSize: 9, color: "#44449a", fontWeight: 800, marginBottom: 5, letterSpacing: 1 }}>🤖 GYMBOT</div>}
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <div style={{ background: "#1a1a2e", border: "1px solid #252540", borderRadius: "18px 18px 18px 4px", padding: "12px 16px", color: "#555", fontSize: 14 }}>⟳ חושב...</div>
          </div>
        )}
      </div>

      {logged.length > 0 && (
        <div style={{ borderTop: `1px solid ${C.border}`, padding: "8px 16px", display: "flex", gap: 8, overflowX: "auto", flexShrink: 0, background: C.card }}>
          {logged.map((ex, i) => (
            <span key={i} style={{ background: `${C.accent}15`, border: `1px solid ${C.accent}40`, borderRadius: 8, padding: "5px 10px", whiteSpace: "nowrap", color: C.accent, fontSize: 12, fontWeight: 700 }}>
              ✓ {ex.name} ({ex.sets.length}×)
            </span>
          ))}
        </div>
      )}

      <div style={{ padding: "10px 12px", borderTop: `1px solid ${C.border}`, background: C.card, display: "flex", gap: 8, alignItems: "center", flexShrink: 0, paddingBottom: "max(10px, env(safe-area-inset-bottom))" }}>
        <button onClick={() => setShowModal(true)} style={{ background: `${C.secondary}18`, border: `1px solid ${C.secondary}44`, borderRadius: 12, padding: "10px 13px", color: C.secondary, fontSize: 22, cursor: "pointer", flexShrink: 0, lineHeight: 1 }}>＋</button>
        <Inp value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && send()}
          placeholder="שאל את הסוכן..."
          style={{ flex: 1, borderRadius: 12, padding: "11px 14px", fontSize: 14 }} />
        <Btn onClick={send} disabled={loading} style={{ padding: "11px 14px", borderRadius: 12, flexShrink: 0, fontSize: 14 }}>שלח</Btn>
      </div>

      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 200 }}
          onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div style={{ background: "#0f0f1a", border: `1px solid ${C.border}`, borderRadius: "22px 22px 0 0", width: "100%", maxWidth: 500, padding: 24, direction: "rtl", paddingBottom: "max(24px, env(safe-area-inset-bottom))" }}>
            <div style={{ color: "#fff", fontWeight: 900, fontSize: 17, marginBottom: 18 }}>📝 רשום תרגיל</div>
            <Inp value={newEx.name} onChange={e => setNewEx(x => ({ ...x, name: e.target.value }))}
              placeholder="שם התרגיל..." style={{ width: "100%", boxSizing: "border-box", marginBottom: 16 }} />
            <div style={{ color: C.muted, fontSize: 11, fontWeight: 700, letterSpacing: 1, marginBottom: 8 }}>סטים</div>
            {newEx.sets.map((s, i) => (
              <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
                <span style={{ color: "#444", fontSize: 12, minWidth: 22, textAlign: "center" }}>S{i + 1}</span>
                <Inp value={s.reps} type="number"
                  onChange={e => { const sets = [...newEx.sets]; sets[i] = { ...sets[i], reps: e.target.value }; setNewEx(x => ({ ...x, sets })); }}
                  placeholder="חזרות" style={{ flex: 1, borderRadius: 9, padding: "10px 12px" }} />
                <Inp value={s.weight} type="number"
                  onChange={e => { const sets = [...newEx.sets]; sets[i] = { ...sets[i], weight: e.target.value }; setNewEx(x => ({ ...x, sets })); }}
                  placeholder='ק"ג' style={{ flex: 1, borderRadius: 9, padding: "10px 12px" }} />
              </div>
            ))}
            <button onClick={() => setNewEx(x => ({ ...x, sets: [...x.sets, { reps: "", weight: "" }] }))}
              style={{ background: "none", border: `1px dashed ${C.border}`, borderRadius: 9, padding: "9px", color: C.muted, fontSize: 13, cursor: "pointer", width: "100%", marginBottom: 18 }}>
              + סט נוסף
            </button>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setShowModal(false)} style={{ flex: 1, background: "#15151f", border: `1px solid ${C.border}`, borderRadius: 12, padding: 13, color: "#aaa", fontSize: 14, cursor: "pointer" }}>ביטול</button>
              <Btn onClick={saveEx} color={C.accent} style={{ flex: 2, borderRadius: 12 }}>שמור ✓</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // ── HISTORY ────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: C.bg, direction: "rtl", fontFamily: font, padding: "40px 20px 28px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <button onClick={() => setScreen(SCREENS.HOME)} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "9px 14px", color: "#aaa", fontSize: 14, cursor: "pointer" }}>← חזרה</button>
        <h2 style={{ color: "#fff", margin: 0, fontSize: 17, fontWeight: 900 }}>היסטוריה — {currentUser}</h2>
      </div>
      {userHistory.length === 0
        ? <div style={{ textAlign: "center", color: C.muted, marginTop: 80 }}><div style={{ fontSize: 42, marginBottom: 12 }}>📭</div>עדיין אין אימונים.</div>
        : [...userHistory].reverse().map((s, i) => {
            const ts = s.exercises.reduce((a, e) => a + e.sets.length, 0);
            return (
              <div key={i} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 18, marginBottom: 12 }}>
                <div style={{ color: "#fff", fontWeight: 800, fontSize: 14 }}>
                  {new Date(s.date).toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "long" })}
                </div>
                <div style={{ color: C.muted, fontSize: 12, margin: "4px 0 12px" }}>⏱ {s.duration} דק' · 🏋️ {s.exercises.length} תרגילים · 🔄 {ts} סטים</div>
                {s.exercises.map((ex, j) => (
                  <div key={j} style={{ marginBottom: 10 }}>
                    <div style={{ color: "#ccc", fontWeight: 700, fontSize: 13, marginBottom: 5 }}>{ex.name}</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                      {ex.sets.map((st, k) => (
                        <span key={k} style={{ background: "#1a1a28", border: `1px solid ${C.border}`, borderRadius: 7, padding: "3px 9px", color: "#888", fontSize: 11 }}>
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
