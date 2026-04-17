import { useState, useEffect, useRef } from "react";
import { App as CapApp } from "@capacitor/app";

// ─── Config ──────────────────────────────────────────────────
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzUqUuBrf6fqDWeNXIOiELm9f92eLW26ZeawOShed1Qr61oH6NnvzMW-r3FVaImZ4oCyw/exec";

// ─── Design System ───────────────────────────────────────────
const C = {
  bg:      "#0a0a12",
  surface: "#12121e",
  card:    "#1a1a2a",
  border:  "#252538",
  primary: "#6c63ff",
  red:     "#e63946",
  green:   "#22c55e",
  orange:  "#f4a261",
  teal:    "#2dd4bf",
  text:    "#f0f0ff",
  sub:     "#8888aa",
  muted:   "#44445a",
};
const font = "'Segoe UI', system-ui, sans-serif";

const SCREENS = {
  LOADING: "loading", LOGIN: "login", HOME: "home",
  WORKOUT: "workout", HISTORY: "history", EQUIPMENT: "equipment",
};

const LS_USER    = "gym_user";
const LS_HISTORY = "gym_history_";
const LS_EQUIP   = "gym_equip";
const LS_USERS   = "gym_users";

// ─── LocalStorage ────────────────────────────────────────────
const LS = {
  get:  k => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch { return null; } },
  set:  (k,v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  del:  k => { try { localStorage.removeItem(k); } catch {} },
};

// ─── API ─────────────────────────────────────────────────────
async function sheetGet(params) {
  const r = await fetch(`${SCRIPT_URL}?${new URLSearchParams(params)}`);
  return r.json();
}
async function sheetPost(body) {
  const r = await fetch(SCRIPT_URL, { method:"POST", body: JSON.stringify(body) });
  return r.json();
}

// ─── AI ──────────────────────────────────────────────────────
function buildPrompt(username, history, equipment) {
  const recent = [...history].reverse().slice(0,3);
  const hist = recent.length === 0 ? "ראשון." : recent.map(s => {
    const d = new Date(s.date).toLocaleDateString("he-IL",{day:"numeric",month:"numeric"});
    return `${d}: ${s.exercises.map(e=>`${e.name}${e.equipId?`(${e.equipId})`:""}: ${e.sets.map(st=>`${st.reps}×${st.weight}`).join(",")}`).join(" | ")}`;
  }).join("\n");
  const eq = equipment.length ? "\nציוד: "+equipment.map(e=>`${e.id}=${e.name}`).join(", ") : "";
  return `מאמן כושר. משתמש: ${username}.\nהיסטוריה:\n${hist}${eq}\nכללים: שאל יום (A/B/C) ואנרגיה (1-5). A=רגליים, B=דחיפה, C=משיכה. ציין מס' מכשיר. עברית, קצר.`;
}

async function callClaude(messages, sys) {
  const call = async (msgs) => {
    const d = await sheetPost({ action:"chat", system:sys, messages:msgs });
    return d.ok ? d.reply : Promise.reject(d.error);
  };
  try { return await call(messages); }
  catch {
    await new Promise(r => setTimeout(r, 1500));
    try { return await call(messages.slice(-2)); }
    catch { return "בעיית תקשורת — נסה שוב."; }
  }
}

// ─── Atoms ───────────────────────────────────────────────────
const ss = (base) => ({ fontSize: `clamp(${base*0.85}px, ${base/4}vw, ${base}px)` });

function Btn({ label, icon, onClick, color=C.primary, outline=false, full=false, sm=false, disabled=false, style={} }) {
  const bg = outline ? "transparent" : color;
  const border = outline ? `1.5px solid ${color}` : "none";
  const textCol = outline ? color : "#fff";
  return (
    <button disabled={disabled} onClick={onClick} style={{
      display:"flex", alignItems:"center", justifyContent:"center", gap:6,
      background:bg, border, borderRadius:14,
      padding: sm ? "9px 16px" : "13px 22px",
      color:textCol, fontWeight:700,
      fontSize: sm ? 13 : 15,
      width: full ? "100%" : "auto",
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.45 : 1,
      WebkitTapHighlightColor:"transparent",
      transition:"opacity 0.15s, transform 0.1s",
      ...style
    }}
      onTouchStart={e => { if(!disabled) e.currentTarget.style.opacity="0.7"; }}
      onTouchEnd={e => { e.currentTarget.style.opacity="1"; }}
    >
      {icon && <span style={{fontSize:sm?16:18}}>{icon}</span>}
      {label}
    </button>
  );
}

function Input({ value, onChange, placeholder, type="text", onKeyDown, autoFocus, style={} }) {
  return (
    <input value={value} onChange={onChange} onKeyDown={onKeyDown}
      placeholder={placeholder} type={type} autoFocus={autoFocus}
      style={{
        background:C.card, border:`1.5px solid ${C.border}`,
        borderRadius:14, padding:"13px 16px", color:C.text,
        fontSize:15, outline:"none", width:"100%", boxSizing:"border-box",
        WebkitAppearance:"none", fontFamily:font, ...style,
      }}
      onFocus={e => e.target.style.borderColor=C.primary}
      onBlur={e => e.target.style.borderColor=C.border}
    />
  );
}

function Card({ children, style={} }) {
  return <div style={{ background:C.card, border:`1.5px solid ${C.border}`, borderRadius:20, ...style }}>{children}</div>;
}

function Tag({ label, color=C.primary }) {
  return <span style={{ background:`${color}18`, border:`1px solid ${color}44`, borderRadius:8, padding:"3px 10px", color, fontSize:11, fontWeight:700 }}>{label}</span>;
}

function Spinner({ size=36, color=C.primary }) {
  return (
    <>
      <style>{`@keyframes _spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ width:size, height:size, border:`3px solid ${C.muted}`, borderTop:`3px solid ${color}`, borderRadius:"50%", animation:"_spin 0.8s linear infinite" }} />
    </>
  );
}

function LoadScreen({ msg, sub }) {
  return (
    <div style={{ minHeight:"100dvh", background:C.bg, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:20, fontFamily:font }}>
      <span style={{fontSize:48}}>🏋️</span>
      <Spinner size={44} />
      <div style={{ textAlign:"center" }}>
        <div style={{ color:C.text, fontWeight:700, fontSize:16 }}>{msg}</div>
        {sub && <div style={{ color:C.sub, fontSize:12, marginTop:6 }}>{sub}</div>}
      </div>
    </div>
  );
}

// Equipment data with Wikipedia image keys and YouTube search terms
const EQUIPMENT_DATA = [
  { key:"squat_rack",   name:"מסגרת סקוואט",      muscles:"ירכיים, ישבן, גב",     wiki:"Power_rack",              yt:"how to use squat rack beginners" },
  { key:"smith",        name:"סמית' מאשין",         muscles:"חזה, כתפיים, ירכיים",  wiki:"Smith_machine",           yt:"how to use smith machine" },
  { key:"leg_press",    name:"לג פרס",              muscles:"ירכיים, ישבן, שוקיים", wiki:"Leg_press",               yt:"how to use leg press machine" },
  { key:"leg_ext",      name:"לג אקסטנשן",          muscles:"ארבע-ראשי",            wiki:"Leg_extension_(exercise)",yt:"how to use leg extension machine" },
  { key:"leg_curl",     name:"לג קרל",              muscles:"המסטרינג",             wiki:"Leg_curl",                yt:"how to use leg curl machine" },
  { key:"hack_squat",   name:"האק סקוואט",          muscles:"ירכיים, ישבן",         wiki:"Hack_squat",              yt:"how to use hack squat machine" },
  { key:"abductor",     name:"אדקטור / אבדקטור",    muscles:"מפשעה, ירך חיצונית",   wiki:"Hip_abduction",           yt:"how to use abductor adductor machine" },
  { key:"calf_raise",   name:"עליית קרסול",         muscles:"שוקיים",               wiki:"Calf_raise",              yt:"how to use calf raise machine" },
  { key:"bench_flat",   name:"ספסל לחיצה שטוח",    muscles:"חזה, תלת-ראשי, כתפיים",wiki:"Bench_press",             yt:"how to use flat bench press" },
  { key:"bench_incline",name:"ספסל משופע",          muscles:"חזה עליון, כתפיים",    wiki:"Incline_press",           yt:"how to use incline bench press" },
  { key:"pec_deck",     name:"פק דק / פרפר",        muscles:"חזה פנימי",            wiki:"Pec_deck",                yt:"how to use pec deck machine" },
  { key:"cable_cross",  name:"עמוד כבל",            muscles:"חזה, כתפיים",          wiki:"Cable_machine",           yt:"how to use cable crossover machine" },
  { key:"lat_pulldown", name:"לט פולדאון",          muscles:"גב רחב, כפיפות",       wiki:"Lat_pulldown",            yt:"how to use lat pulldown machine" },
  { key:"seated_row",   name:"חתירה בישיבה",        muscles:"גב אמצעי, כפיפות",     wiki:"Seated_row",              yt:"how to use seated cable row machine" },
  { key:"back_ext",     name:"היפר אקסטנשן",        muscles:"גב תחתון, ישבן",       wiki:"Hyperextension_(exercise)",yt:"how to use hyperextension machine" },
  { key:"pullup_bar",   name:"מתח",                 muscles:"גב רחב, כפיפות",       wiki:"Pull-up_(exercise)",      yt:"how to do pull ups for beginners" },
  { key:"shoulder_press",name:"לחיצת כתפיים",      muscles:"דלתא, תלת-ראשי",       wiki:"Overhead_press",          yt:"how to use shoulder press machine" },
  { key:"rear_delt",    name:"כתף אחורית",          muscles:"דלתא אחורי",           wiki:"Reverse_fly",             yt:"how to use rear delt machine" },
  { key:"preacher_curl",name:"Preacher קרל",        muscles:"דו-ראשי",              wiki:"Preacher_curl",           yt:"how to use preacher curl machine" },
  { key:"tricep_push",  name:"פשיטת מרפק",         muscles:"תלת-ראשי",             wiki:"Triceps_pushdown",        yt:"how to do tricep pushdown cable" },
  { key:"treadmill",    name:"הליכון",              muscles:"רגליים, לב-ריאה",      wiki:"Treadmill",               yt:"how to use treadmill gym" },
  { key:"elliptical",   name:"אליפטיקל",            muscles:"כל הגוף",              wiki:"Elliptical_trainer",      yt:"how to use elliptical machine" },
  { key:"bike",         name:"אופני כושר",          muscles:"ירכיים, לב-ריאה",      wiki:"Stationary_bicycle",      yt:"how to use stationary bike gym" },
  { key:"rowing_m",     name:"מכונת חתירה",         muscles:"גב, רגליים, ידיים",    wiki:"Rowing_machine",          yt:"how to use rowing machine" },
  { key:"ab_machine",   name:"מכונת בטן",           muscles:"בטן",                  wiki:"Abdominal_exercise",      yt:"how to use ab crunch machine" },
  { key:"dip_station",  name:"תחנת Dips",           muscles:"תלת-ראשי, חזה תחתון",  wiki:"Dip_(exercise)",          yt:"how to do dips proper form" },
  { key:"dumbbell_rack",name:"משקולות יד",          muscles:"כל הגוף",              wiki:"Dumbbell",                yt:"dumbbell exercises for beginners gym" },
];

function EquipmentCard({ item }) {
  const [imgSrc, setImgSrc] = useState(null);
  const ytUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(item.yt)}`;

  useEffect(() => {
    fetch(`https://en.wikipedia.org/w/api.php?action=query&titles=${item.wiki}&prop=pageimages&format=json&pithumbsize=500&origin=*`)
      .then(r=>r.json())
      .then(d => {
        const src = Object.values(d.query.pages)[0]?.thumbnail?.source;
        if (src) setImgSrc(src);
      }).catch(()=>{});
  }, [item.wiki]);

  return (
    <Card style={{ overflow:"hidden", marginBottom:12 }}>
      {/* Image */}
      <div style={{ height:160, background:C.surface, position:"relative", overflow:"hidden", borderRadius:"18px 18px 0 0" }}>
        {imgSrc
          ? <img src={imgSrc} alt={item.name} style={{ width:"100%", height:"100%", objectFit:"cover" }} />
          : <div style={{ width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:52 }}>🏋️</div>
        }
        {/* Number badge if assigned */}
        {item.id && (
          <div style={{ position:"absolute", top:10, right:10, background:C.primary, color:"#fff", borderRadius:10, padding:"4px 12px", fontWeight:900, fontSize:14 }}>
            #{item.id}
          </div>
        )}
      </div>
      {/* Info */}
      <div style={{ padding:"14px 16px 16px" }}>
        <div style={{ color:C.text, fontWeight:800, fontSize:16, marginBottom:4 }}>{item.name}</div>
        <div style={{ color:C.sub, fontSize:12, marginBottom:12 }}>💪 {item.muscles}</div>
        {/* YouTube button */}
        <a href={ytUrl} target="_blank" rel="noreferrer" style={{
          display:"flex", alignItems:"center", gap:8, background:"#ff000018",
          border:"1.5px solid #ff000040", borderRadius:12, padding:"10px 16px",
          color:"#ff4444", textDecoration:"none", fontSize:13, fontWeight:700,
        }}>
          <span style={{fontSize:16}}>▶</span>
          סרטון הדרכה — {item.name}
        </a>
      </div>
    </Card>
  );
}

// ─── Main App ─────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen]             = useState(SCREENS.LOADING);
  const [loadMsg, setLoadMsg]           = useState("מאתחל...");
  const [loadSub, setLoadSub]           = useState("");
  const [equipment, setEquipment]       = useState([]);
  const [currentUser, setCurrentUser]   = useState(null);
  const [userHistory, setUserHistory]   = useState([]);
  const [nameInput, setNameInput]       = useState("");
  const [users, setUsers]               = useState(() => LS.get(LS_USERS) || []);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError]     = useState("");
  const [confirmNew, setConfirmNew]     = useState(false);
  const [messages, setMessages]         = useState([]);
  const [chatInput, setChatInput]       = useState("");
  const [aiLoading, setAiLoading]       = useState(false);
  const [logged, setLogged]             = useState([]);
  const [showLogModal, setShowLogModal] = useState(false);
  const [showExitDlg, setShowExitDlg]   = useState(false);
  const [newEx, setNewEx]               = useState({ name:"", sets:[{reps:"",weight:""}] });
  const [startTime, setStartTime]       = useState(null);
  const [saving, setSaving]             = useState(false);
  const [screenHistory, setScreenHistory] = useState([]);
  const chatRef = useRef(null);

  // ── Back button (Android) ──────────────────────────────────
  useEffect(() => {
    let handler;
    CapApp.addListener("backButton", () => {
      if (showLogModal)   { setShowLogModal(false); return; }
      if (showExitDlg)    { setShowExitDlg(false); return; }
      if (confirmNew)     { setConfirmNew(false); setNameInput(""); return; }
      if (screen === SCREENS.WORKOUT)   { setShowExitDlg(true); return; }
      if (screen === SCREENS.HISTORY || screen === SCREENS.EQUIPMENT) {
        setScreen(SCREENS.HOME); return;
      }
      if (screen === SCREENS.HOME)  { CapApp.exitApp(); return; }
      if (screen === SCREENS.LOGIN) { CapApp.exitApp(); return; }
    }).then(h => handler = h);
    return () => handler?.remove();
  }, [screen, showLogModal, showExitDlg, confirmNew]);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages, aiLoading]);

  // ── Boot ──────────────────────────────────────────────────
  useEffect(() => { boot(); }, []);

  const boot = async () => {
    setScreen(SCREENS.LOADING); setLoadMsg("טוען נתונים..."); setLoadSub("מתחבר לשרת");
    const [ud, ed] = await Promise.all([
      sheetGet({ action:"getUsers" }).catch(()=>null),
      sheetGet({ action:"getEquipment" }).catch(()=>null),
    ]);
    const userList = ud?.ok ? ud.users : (LS.get(LS_USERS) || []);
    if (ud?.ok) LS.set(LS_USERS, userList);
    setUsers(userList);
    const eqList = ed?.ok ? ed.equipment : (LS.get(LS_EQUIP) || []);
    if (ed?.ok) LS.set(LS_EQUIP, eqList);
    setEquipment(eqList);
    const savedUser = LS.get(LS_USER);
    if (savedUser) {
      setLoadMsg(`טוען היסטוריה של ${savedUser}...`); setLoadSub("זה לוקח כמה שניות");
      await loadHistory(savedUser);
      setCurrentUser(savedUser); setScreen(SCREENS.HOME);
    } else {
      setScreen(SCREENS.LOGIN);
    }
  };

  const loadHistory = async (name) => {
    const cached = LS.get(LS_HISTORY + name);
    if (cached) setUserHistory(cached);
    try {
      const d = await sheetGet({ action:"getHistory", username:name });
      if (d.ok) { setUserHistory(d.history); LS.set(LS_HISTORY+name, d.history); }
    } catch {}
  };

  // ── Auth ─────────────────────────────────────────────────
  const loginAs = async (name) => {
    LS.set(LS_USER, name); setCurrentUser(name);
    const cached = LS.get(LS_HISTORY + name);
    if (!cached) { setLoadMsg(`טוען היסטוריה של ${name}...`); setLoadSub(""); setScreen(SCREENS.LOADING); }
    await loadHistory(name);
    setNameInput(""); setConfirmNew(false); setLoginError(""); setLoginLoading(false);
    setScreen(SCREENS.HOME);
  };

  const logout = () => {
    LS.del(LS_USER); setCurrentUser(null); setUserHistory([]);
    setNameInput(""); setLoginError(""); setConfirmNew(false);
    setScreen(SCREENS.LOGIN);
  };

  const submitName = async () => {
    const name = nameInput.trim(); if (!name) return;
    setLoginLoading(true); setLoginError("");
    try {
      const d = await sheetGet({ action:"getUsers" }).catch(()=>({ ok:false, users: LS.get(LS_USERS)||[] }));
      const list = d.ok ? d.users : (LS.get(LS_USERS)||[]);
      if (d.ok) LS.set(LS_USERS, list);
      const match = list.find(u => u.toLowerCase()===name.toLowerCase());
      if (match) { await loginAs(match); }
      else { setConfirmNew(true); setLoginLoading(false); }
    } catch { setLoginError("בעיית חיבור."); setLoginLoading(false); }
  };

  const createUser = async () => {
    const name = nameInput.trim(); if(!name) return;
    setLoginLoading(true);
    try { await sheetPost({ action:"addUser", username:name }); await loginAs(name); }
    catch { setLoginError("שגיאה."); setLoginLoading(false); }
  };

  // ── Workout ──────────────────────────────────────────────
  const startWorkout = async () => {
    setMessages([]); setLogged([]); setStartTime(Date.now());
    setScreen(SCREENS.WORKOUT); setAiLoading(true);
    const reply = await callClaude([{ role:"user", content:"הגעתי לחדר כושר!" }], buildPrompt(currentUser, userHistory, equipment));
    setMessages([{ role:"user", content:"הגעתי לחדר כושר! 🏋️" }, { role:"assistant", content:reply }]);
    setAiLoading(false);
  };

  const sendChat = async () => {
    const txt = chatInput.trim(); if(!txt || aiLoading) return;
    setChatInput("");
    const next = [...messages, { role:"user", content:txt }];
    setMessages(next); setAiLoading(true);
    const reply = await callClaude(next.map(m=>({role:m.role,content:m.content})), buildPrompt(currentUser,userHistory,equipment));
    setMessages([...next, { role:"assistant", content:reply }]); setAiLoading(false);
  };

  const logEx = () => {
    const ex = { name:newEx.name.trim(), sets: newEx.sets.filter(s=>s.reps&&s.weight).map(s=>({reps:parseInt(s.reps),weight:parseFloat(s.weight)})) };
    if (!ex.name || !ex.sets.length) return;
    setLogged(p=>[...p,ex]); setShowLogModal(false); setNewEx({name:"",sets:[{reps:"",weight:""}]});
    const notif = `✅ ${ex.name}: ${ex.sets.map(s=>`${s.reps}×${s.weight}ק"ג`).join(", ")}`;
    const next = [...messages, { role:"user", content:notif }];
    setMessages(next); setAiLoading(true);
    callClaude(next.map(m=>({role:m.role,content:m.content})), buildPrompt(currentUser,userHistory,equipment))
      .then(r => { setMessages([...next,{role:"assistant",content:r}]); setAiLoading(false); });
  };

  const endWorkout = async (save=true) => {
    setShowExitDlg(false);
    if (!save || !logged.length) { setScreen(SCREENS.HOME); return; }
    const session = { date: new Date(startTime).toISOString(), duration: Math.round((Date.now()-startTime)/60000), exercises:logged };
    setSaving(true); setLoadMsg("שומר אימון..."); setLoadSub(`${logged.length} תרגילים`); setScreen(SCREENS.LOADING);
    try {
      await sheetPost({ action:"saveWorkout", username:currentUser, ...session });
      setLoadMsg("מרענן היסטוריה..."); setLoadSub("");
      const d = await sheetGet({ action:"getHistory", username:currentUser });
      if (d.ok) { setUserHistory(d.history); LS.set(LS_HISTORY+currentUser, d.history); }
    } catch {
      const updated = [...userHistory, session];
      setUserHistory(updated); LS.set(LS_HISTORY+currentUser, updated);
    }
    setSaving(false); setScreen(SCREENS.HOME);
  };

  const totalSets = logged.reduce((a,e)=>a+e.sets.length,0);

  // ══════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════
  const wrap = (children, padded=true) => (
    <div style={{ minHeight:"100dvh", background:C.bg, fontFamily:font, direction:"rtl",
      padding: padded ? "clamp(16px,4vw,28px) clamp(14px,4vw,20px) 24px" : "0",
      maxWidth:520, margin:"0 auto" }}>
      {children}
    </div>
  );

  if (screen===SCREENS.LOADING) return <LoadScreen msg={loadMsg} sub={loadSub} />;

  // ── LOGIN ──────────────────────────────────────────────────
  if (screen===SCREENS.LOGIN) return wrap(
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:"100dvh", padding:"24px 20px", gap:0 }}>
      <div style={{ fontSize:"clamp(52px,12vw,72px)", marginBottom:12, lineHeight:1 }}>🏋️</div>
      <h1 style={{ color:C.text, fontWeight:900, fontSize:"clamp(26px,6vw,36px)", margin:"0 0 6px", letterSpacing:-1 }}>GymAgent</h1>
      <p style={{ color:C.sub, fontSize:13, margin:"0 0 28px" }}>מאמן אישי חכם מבוסס AI</p>

      <div style={{ width:"100%", maxWidth:360 }}>
        {!confirmNew ? (
          <>
            {/* Existing users */}
            {users.length > 0 && (
              <div style={{ marginBottom:20 }}>
                <div style={{ color:C.sub, fontSize:11, fontWeight:700, letterSpacing:2, marginBottom:10 }}>בחר משתמש</div>
                {users.map(u => (
                  <button key={u} onClick={() => loginAs(u)} disabled={loginLoading}
                    style={{
                      width:"100%", background:C.card, border:`1.5px solid ${C.border}`,
                      borderRadius:16, padding:"14px 18px", color:C.text,
                      display:"flex", alignItems:"center", gap:14, cursor:"pointer",
                      marginBottom:8, WebkitTapHighlightColor:"transparent",
                      textAlign:"right", fontFamily:font,
                    }}
                    onTouchStart={e => e.currentTarget.style.background=C.surface}
                    onTouchEnd={e => e.currentTarget.style.background=C.card}
                  >
                    <div style={{ background:C.surface, borderRadius:12, width:42, height:42, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>
                      👤
                    </div>
                    <div>
                      <div style={{ fontWeight:700, fontSize:16 }}>{u}</div>
                      <div style={{ color:C.sub, fontSize:11, marginTop:2 }}>לחץ להתחברות</div>
                    </div>
                    <div style={{ marginRight:"auto", color:C.muted, fontSize:18 }}>›</div>
                  </button>
                ))}
                <div style={{ display:"flex", alignItems:"center", gap:10, margin:"16px 0" }}>
                  <div style={{ flex:1, height:1, background:C.border }} />
                  <span style={{ color:C.muted, fontSize:11 }}>או</span>
                  <div style={{ flex:1, height:1, background:C.border }} />
                </div>
              </div>
            )}

            {/* New / manual name input */}
            <div style={{ color:C.sub, fontSize:11, fontWeight:700, letterSpacing:2, marginBottom:10 }}>
              {users.length > 0 ? "כניסה עם שם אחר" : "הכנס שם משתמש"}
            </div>
            <div style={{ display:"flex", gap:10, marginBottom:12 }}>
              <Input value={nameInput} onChange={e=>{setNameInput(e.target.value);setLoginError("");}}
                onKeyDown={e=>e.key==="Enter"&&!loginLoading&&submitName()}
                placeholder="הקלד שם..." autoFocus={users.length===0} style={{ flex:1 }} />
              <Btn label={loginLoading?"⟳":"→"} onClick={submitName} disabled={loginLoading||!nameInput.trim()} style={{ borderRadius:14, padding:"13px 18px" }} />
            </div>
            {loginError && <div style={{ color:C.red, fontSize:12, textAlign:"center" }}>⚠️ {loginError}</div>}
          </>
        ) : (
          <Card style={{ padding:24 }}>
            <div style={{ textAlign:"center", fontSize:32, marginBottom:10 }}>🤔</div>
            <div style={{ color:C.text, fontWeight:800, fontSize:17, textAlign:"center", marginBottom:8 }}>"{nameInput}" לא נמצא</div>
            <div style={{ color:C.sub, fontSize:13, textAlign:"center", marginBottom:22, lineHeight:1.6 }}>אתה משתמש חדש, או אולי שגית בשם?</div>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              <Btn label="← תקן שם" onClick={()=>{setConfirmNew(false);setNameInput("");}} outline color={C.sub} full />
              <Btn label={loginLoading?"יוצר...":"✓ משתמש חדש"} onClick={createUser} disabled={loginLoading} color={C.primary} full />
            </div>
          </Card>
        )}
      </div>
    </div>
  , false);

  // ── HOME ───────────────────────────────────────────────────
  if (screen===SCREENS.HOME) {
    const thisWeek = userHistory.filter(h=>Date.now()-new Date(h.date)<7*86400000).length;
    const last = userHistory[userHistory.length-1];
    return wrap(
      <>
        {/* Header */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:24 }}>
          <div>
            <div style={{ color:C.sub, fontSize:12, marginBottom:2 }}>שלום,</div>
            <div style={{ color:C.text, fontSize:"clamp(20px,5vw,26px)", fontWeight:900, letterSpacing:-0.5 }}>{currentUser} 👋</div>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <Btn icon="🏋️" onClick={()=>setScreen(SCREENS.EQUIPMENT)} sm outline color={C.teal} />
            <Btn icon="📋" onClick={()=>setScreen(SCREENS.HISTORY)} sm outline color={C.sub} />
            <Btn label="יציאה" onClick={logout} sm outline color={C.red} />
          </div>
        </div>

        {/* Stats */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:20 }}>
          {[
            { label:"אימונים", val:userHistory.length, color:C.primary, icon:"📅" },
            { label:"השבוע",   val:thisWeek,            color:C.orange,  icon:"🔥" },
            { label:"תרגילים", val:new Set(userHistory.flatMap(h=>h.exercises.map(e=>e.name))).size, color:C.teal, icon:"💪" },
          ].map((s,i)=>(
            <Card key={i} style={{ padding:"clamp(12px,3vw,18px) 10px", textAlign:"center" }}>
              <div style={{ fontSize:"clamp(18px,4vw,24px)", marginBottom:4 }}>{s.icon}</div>
              <div style={{ color:s.color, fontSize:"clamp(20px,5vw,28px)", fontWeight:900 }}>{s.val}</div>
              <div style={{ color:C.sub, fontSize:"clamp(9px,2vw,11px)", marginTop:2 }}>{s.label}</div>
            </Card>
          ))}
        </div>

        {/* Last workout */}
        {last && (
          <Card style={{ padding:"clamp(14px,3vw,18px)", marginBottom:20 }}>
            <div style={{ color:C.sub, fontSize:10, fontWeight:800, letterSpacing:2, marginBottom:10 }}>אימון אחרון</div>
            <div style={{ display:"flex", gap:12, flexWrap:"wrap", marginBottom:10 }}>
              <span style={{ color:C.sub, fontSize:12 }}>📅 {new Date(last.date).toLocaleDateString("he-IL",{weekday:"short",day:"numeric",month:"short"})}</span>
              <span style={{ color:C.sub, fontSize:12 }}>⏱ {last.duration} דק'</span>
            </div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
              {last.exercises.map((ex,i)=><Tag key={i} label={ex.name} color={C.primary} />)}
            </div>
          </Card>
        )}

        {/* CTA */}
        <button onClick={startWorkout} style={{
          width:"100%", background:`linear-gradient(135deg, ${C.primary}, #4f46e5)`,
          border:"none", borderRadius:22, padding:"clamp(18px,4vw,24px)",
          color:"#fff", cursor:"pointer", boxShadow:`0 12px 40px ${C.primary}50`,
          display:"flex", alignItems:"center", gap:16, WebkitTapHighlightColor:"transparent",
          marginBottom:14,
        }}>
          <span style={{ fontSize:"clamp(32px,8vw,44px)" }}>🏋️</span>
          <div style={{ textAlign:"right" }}>
            <div style={{ fontWeight:900, fontSize:"clamp(18px,4vw,22px)", letterSpacing:-0.3 }}>הגעתי לחדר כושר!</div>
            <div style={{ fontSize:"clamp(11px,2.5vw,13px)", opacity:0.75, marginTop:4 }}>הסוכן יבנה אימון מותאם אישית</div>
          </div>
        </button>
      </>
    );
  }

  // ── EQUIPMENT ──────────────────────────────────────────────
  if (screen===SCREENS.EQUIPMENT) return wrap(
    <>
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
        <button onClick={()=>setScreen(SCREENS.HOME)} style={{ background:C.card, border:`1.5px solid ${C.border}`, borderRadius:12, padding:"9px 14px", color:C.sub, fontSize:13, cursor:"pointer" }}>←</button>
        <h2 style={{ color:C.text, margin:0, fontSize:"clamp(16px,4vw,20px)", fontWeight:900 }}>ציוד חדר הכושר</h2>
      </div>
      <div style={{ color:C.sub, fontSize:12, marginBottom:16 }}>לחץ על "סרטון הדרכה" לצפייה בשימוש נכון</div>
      {EQUIPMENT_DATA.map(item => {
        const eq = equipment.find(e=>e.name===item.name);
        return <EquipmentCard key={item.key} item={{ ...item, id: eq?.id }} />;
      })}
    </>
  );

  // ── WORKOUT ────────────────────────────────────────────────
  if (screen===SCREENS.WORKOUT) return (
    <div style={{ height:"100dvh", background:C.bg, fontFamily:font, direction:"rtl", display:"flex", flexDirection:"column", overflow:"hidden" }}>
      {/* Bar */}
      <div style={{ background:C.surface, borderBottom:`1.5px solid ${C.border}`, padding:"10px 14px", paddingTop:"max(10px,env(safe-area-inset-top))", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ width:8, height:8, background:C.green, borderRadius:"50%", boxShadow:`0 0 8px ${C.green}` }} />
          <span style={{ color:C.text, fontWeight:800, fontSize:14 }}>{currentUser}</span>
          {totalSets>0 && <Tag label={`${totalSets} סטים`} color={C.teal} />}
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <Btn label="יציאה" onClick={()=>setShowExitDlg(true)} sm outline color={C.sub} />
          <Btn label={saving?"שומר...":"סיים ✓"} onClick={()=>logged.length>0?endWorkout(true):setShowExitDlg(true)} color={C.green} sm disabled={saving} />
        </div>
      </div>

      {/* Chat */}
      <div ref={chatRef} style={{ flex:1, overflowY:"auto", padding:"14px 14px 8px", display:"flex", flexDirection:"column", gap:10 }}>
        {messages.map((m,i)=>(
          <div key={i} style={{ display:"flex", justifyContent: m.role==="user"?"flex-start":"flex-end" }}>
            <div style={{
              maxWidth:"88%",
              background: m.role==="user" ? C.card : `linear-gradient(135deg,#1e1b4b,#1a1a2e)`,
              border:`1.5px solid ${m.role==="user"?C.border:"#3730a3"}`,
              borderRadius: m.role==="user"?"18px 18px 4px 18px":"18px 18px 18px 4px",
              padding:"12px 15px", color:C.text, fontSize:"clamp(13px,3vw,15px)", lineHeight:1.65, whiteSpace:"pre-wrap",
            }}>
              {m.role==="assistant" && <div style={{ fontSize:9, color:"#6366f1", fontWeight:800, marginBottom:5, letterSpacing:2 }}>GYMBOT AI</div>}
              {m.content}
            </div>
          </div>
        ))}
        {aiLoading && (
          <div style={{ display:"flex", justifyContent:"flex-end" }}>
            <div style={{ background:"linear-gradient(135deg,#1e1b4b,#1a1a2e)", border:"1.5px solid #3730a3", borderRadius:"18px 18px 18px 4px", padding:"12px 18px", display:"flex", gap:8, alignItems:"center" }}>
              <Spinner size={16} color="#6366f1" />
              <span style={{ color:C.sub, fontSize:13 }}>חושב...</span>
            </div>
          </div>
        )}
      </div>

      {/* Logged strip */}
      {logged.length>0 && (
        <div style={{ borderTop:`1.5px solid ${C.border}`, padding:"7px 14px", display:"flex", gap:7, overflowX:"auto", flexShrink:0, background:C.surface }}>
          {logged.map((ex,i)=><Tag key={i} label={`✓ ${ex.name} (${ex.sets.length}×)`} color={C.teal} />)}
        </div>
      )}

      {/* Input */}
      <div style={{ padding:"10px 12px", paddingBottom:"max(10px,env(safe-area-inset-bottom))", borderTop:`1.5px solid ${C.border}`, background:C.surface, display:"flex", gap:8, alignItems:"center", flexShrink:0 }}>
        <button onClick={()=>setShowLogModal(true)} style={{ background:`${C.orange}18`, border:`1.5px solid ${C.orange}44`, borderRadius:12, padding:"10px 13px", color:C.orange, fontSize:22, cursor:"pointer", lineHeight:1, flexShrink:0 }}>＋</button>
        <input value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendChat()}
          placeholder="שאל את הסוכן..."
          style={{ flex:1, background:C.card, border:`1.5px solid ${C.border}`, borderRadius:12, padding:"11px 14px", color:C.text, fontSize:"clamp(13px,3vw,15px)", outline:"none", minWidth:0, fontFamily:font }} />
        <Btn label="שלח" onClick={sendChat} disabled={aiLoading} sm style={{ borderRadius:12 }} />
      </div>

      {/* Exit Dialog */}
      {showExitDlg && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.88)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:300, padding:24 }}>
          <Card style={{ padding:28, width:"100%", maxWidth:340, direction:"rtl" }}>
            <div style={{ textAlign:"center", fontSize:36, marginBottom:12 }}>🚪</div>
            <div style={{ color:C.text, fontWeight:900, fontSize:18, textAlign:"center", marginBottom:8 }}>לצאת מהאימון?</div>
            <div style={{ color:C.sub, fontSize:13, textAlign:"center", marginBottom:24, lineHeight:1.6 }}>
              {logged.length>0 ? `יש ${logged.length} תרגילים שלא נשמרו.` : "אין תרגילים מוקלטים."}
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {logged.length>0 && <Btn label="💾 שמור וצא" onClick={()=>endWorkout(true)} color={C.green} full />}
              <Btn label="🚪 צא בלי לשמור" onClick={()=>endWorkout(false)} outline color={C.red} full />
              <Btn label="← המשך אימון" onClick={()=>setShowExitDlg(false)} outline color={C.sub} full />
            </div>
          </Card>
        </div>
      )}

      {/* Log Exercise Modal */}
      {showLogModal && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.88)", display:"flex", alignItems:"flex-end", justifyContent:"center", zIndex:200 }}
          onClick={e=>e.target===e.currentTarget&&setShowLogModal(false)}>
          <div style={{ background:C.surface, border:`1.5px solid ${C.border}`, borderRadius:"22px 22px 0 0", width:"100%", maxWidth:500, padding:"22px 18px", paddingBottom:"max(22px,env(safe-area-inset-bottom))", direction:"rtl" }}>
            <div style={{ color:C.text, fontWeight:900, fontSize:17, marginBottom:16 }}>📝 רשום תרגיל</div>
            <Input value={newEx.name} onChange={e=>setNewEx(x=>({...x,name:e.target.value}))} placeholder="שם התרגיל..." style={{ marginBottom:14 }} />
            <div style={{ color:C.sub, fontSize:11, fontWeight:700, letterSpacing:2, marginBottom:8 }}>סטים</div>
            {newEx.sets.map((s,i)=>(
              <div key={i} style={{ display:"flex", gap:8, marginBottom:8, alignItems:"center" }}>
                <span style={{ color:C.muted, fontSize:12, minWidth:22 }}>S{i+1}</span>
                <input value={s.reps} type="number"
                  onChange={e=>{const sets=[...newEx.sets];sets[i]={...sets[i],reps:e.target.value};setNewEx(x=>({...x,sets}));}}
                  placeholder="חזרות" style={{ flex:1, background:C.card, border:`1.5px solid ${C.border}`, borderRadius:10, padding:"10px 12px", color:C.text, fontSize:14, outline:"none" }} />
                <input value={s.weight} type="number"
                  onChange={e=>{const sets=[...newEx.sets];sets[i]={...sets[i],weight:e.target.value};setNewEx(x=>({...x,sets}));}}
                  placeholder='ק"ג' style={{ flex:1, background:C.card, border:`1.5px solid ${C.border}`, borderRadius:10, padding:"10px 12px", color:C.text, fontSize:14, outline:"none" }} />
              </div>
            ))}
            <button onClick={()=>setNewEx(x=>({...x,sets:[...x.sets,{reps:"",weight:""}]}))}
              style={{ background:"none", border:`1.5px dashed ${C.border}`, borderRadius:10, padding:"8px", color:C.muted, fontSize:12, cursor:"pointer", width:"100%", marginBottom:16 }}>
              + סט נוסף
            </button>
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={()=>setShowLogModal(false)} style={{ flex:1, background:C.card, border:`1.5px solid ${C.border}`, borderRadius:14, padding:13, color:C.sub, fontSize:14, cursor:"pointer" }}>ביטול</button>
              <Btn label="שמור ✓" onClick={logEx} color={C.teal} style={{ flex:2, borderRadius:14 }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // ── HISTORY ────────────────────────────────────────────────
  return wrap(
    <>
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
        <button onClick={()=>setScreen(SCREENS.HOME)} style={{ background:C.card, border:`1.5px solid ${C.border}`, borderRadius:12, padding:"9px 14px", color:C.sub, fontSize:13, cursor:"pointer" }}>←</button>
        <h2 style={{ color:C.text, margin:0, fontSize:"clamp(14px,3.5vw,18px)", fontWeight:900 }}>היסטוריה — {currentUser}</h2>
      </div>
      {userHistory.length===0
        ? <div style={{ textAlign:"center", color:C.sub, marginTop:80 }}><div style={{ fontSize:42, marginBottom:12 }}>📭</div>עדיין אין אימונים.</div>
        : [...userHistory].reverse().map((s,i)=>{
            const ts = s.exercises.reduce((a,e)=>a+e.sets.length,0);
            return (
              <Card key={i} style={{ padding:"clamp(12px,3vw,18px)", marginBottom:10 }}>
                <div style={{ color:C.text, fontWeight:800, fontSize:"clamp(12px,3vw,14px)" }}>
                  {new Date(s.date).toLocaleDateString("he-IL",{weekday:"long",day:"numeric",month:"long"})}
                </div>
                <div style={{ color:C.sub, fontSize:12, margin:"5px 0 12px" }}>⏱ {s.duration} דק' · 🏋️ {s.exercises.length} תרגילים · 🔄 {ts} סטים</div>
                {s.exercises.map((ex,j)=>(
                  <div key={j} style={{ marginBottom:8 }}>
                    <div style={{ color:"#ccc", fontWeight:700, fontSize:13, marginBottom:5 }}>{ex.name}</div>
                    <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
                      {ex.sets.map((st,k)=>(
                        <span key={k} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:7, padding:"3px 9px", color:C.sub, fontSize:11 }}>
                          S{k+1}: {st.reps}×{st.weight}ק"ג
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </Card>
            );
          })
      }
    </>
  );
}
