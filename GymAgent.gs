// ============================================================
//  GymAgent — Google Apps Script Backend (v4)
//  ✅ תיקון CORS — כל קריאות ה-AI עוברות דרך הסקריפט
//  ✅ מוכן לציוד חדר כושר (להוסיף ב-EQUIPMENT למטה)
//
//  חשוב: שמור את מפתח Anthropic ב-Script Properties:
//  Project Settings → Script Properties → Add:
//    Key:   ANTHROPIC_KEY
//    Value: sk-ant-api03-...
// ============================================================

// ══════════════════════════════════════════════════════════════
//  ציוד חדר הכושר — מלא כאן אחרי שתעלה את הרשימה
//  פורמט: { id: "מספר", name: "שם", muscles: "שרירים", desc: "תיאור" }
// ══════════════════════════════════════════════════════════════
const EQUIPMENT = [
  // { id: "1",  name: "סמית' מאשין",    muscles: "חזה, כתפיים, רגליים", desc: "לחיצת חזה / סקוואט מודרך" },
  // { id: "2",  name: "לג פרס",          muscles: "רגליים, ישבן",         desc: "לחיצת רגליים בישיבה" },
  // { id: "3",  name: "כבלים עמוד",      muscles: "גב, כתפיים, ידיים",   desc: "תרגילי כבל חופשיים" },
  // הוסף כאן אחרי שתעלה את הרשימה...
];

function equipmentContext() {
  if (!EQUIPMENT.length) return "";
  return "\n\nציוד זמין בחדר הכושר:\n" +
    EQUIPMENT.map(e => `מספר ${e.id}: ${e.name} (${e.muscles}) — ${e.desc}`).join("\n");
}

// ══════════════════════════════════════════════════════════════
//  Sheet config
// ══════════════════════════════════════════════════════════════
const SHEETS = { USERS: "משתמשים", HISTORY: "היסטוריה", SUMMARY: "סיכום" };
const HEADERS = {
  USERS:   ["משתמש", "תאריך הצטרפות"],
  HISTORY: ["משתמש", "תאריך", "יום בשבוע", "משך (דק')", "תרגיל", "ציוד מס'", "סט", "חזרות", "משקל (ק\"ג)"],
  SUMMARY: ["משתמש", "תרגיל", "ציוד מס'", "סטים סה\"כ", "משקל מקסימום (ק\"ג)", "חזרות מקסימום", "אימון אחרון"],
};
const COLORS = { USERS: "#e63946", HISTORY: "#2a9d8f", SUMMARY: "#f4a261" };

// ── Sheet helpers ─────────────────────────────────────────────
function getSheet(ss, name)              { return ss.getSheetByName(name); }
function getOrCreate(ss, name, hdr, col) { return getSheet(ss, name) || createSheet(ss, name, hdr, col); }

function createSheet(ss, name, headers, color) {
  const s = ss.insertSheet(name);
  s.getRange(1, 1, 1, headers.length)
   .setValues([headers]).setFontWeight("bold")
   .setFontColor("#fff").setBackground("#1a1a2e").setHorizontalAlignment("center");
  s.setFrozenRows(1);
  s.setTabColor(color);
  return s;
}
function stripeRow(s, n) {
  s.getRange(n, 1, 1, s.getLastColumn() || 1).setBackground(n % 2 === 0 ? "#f2f2fb" : "#fff");
}
function hebrewDay(d) {
  return ["ראשון","שני","שלישי","רביעי","חמישי","שישי","שבת"][new Date(d).getDay()];
}

// ══════════════════════════════════════════════════════════════
//  GET
// ══════════════════════════════════════════════════════════════
function doGet(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  try {
    if (e.parameter.action === "getUsers") {
      const s    = getOrCreate(ss, SHEETS.USERS, HEADERS.USERS, COLORS.USERS);
      const last = s.getLastRow();
      const users = last > 1 ? s.getRange(2,1,last-1,1).getValues().flat().filter(Boolean) : [];
      return ok({ users });
    }

    if (e.parameter.action === "getHistory") {
      const username = e.parameter.username;
      const s = getSheet(ss, SHEETS.HISTORY);
      if (!s || s.getLastRow() < 2) return ok({ history: [] });

      const rows = s.getRange(2,1,s.getLastRow()-1,9).getValues()
                    .filter(r => r[0] === username && r[1]);
      const map  = {};
      rows.forEach(r => {
        const key = String(r[1]);
        if (!map[key]) map[key] = { date: key, duration: Number(r[3]), exMap: {} };
        const exName = r[4];
        if (!map[key].exMap[exName]) map[key].exMap[exName] = { name: exName, equipId: r[5], sets: [] };
        map[key].exMap[exName].sets.push({ reps: Number(r[7]), weight: Number(r[8]) });
      });
      const history = Object.values(map)
        .map(s => ({ date: s.date, duration: s.duration, exercises: Object.values(s.exMap) }))
        .sort((a, b) => new Date(a.date) - new Date(b.date));
      return ok({ history });
    }

    if (e.parameter.action === "getEquipment") {
      return ok({ equipment: EQUIPMENT });
    }

    return err("Unknown action");
  } catch(ex) { return err(ex.message); }
}

// ══════════════════════════════════════════════════════════════
//  POST
// ══════════════════════════════════════════════════════════════
function doPost(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  try {
    const body   = JSON.parse(e.postData.contents);
    const action = body.action;

    // ── addUser ───────────────────────────────────────────
    if (action === "addUser") {
      const s    = getOrCreate(ss, SHEETS.USERS, HEADERS.USERS, COLORS.USERS);
      const last = s.getLastRow();
      const ex   = last > 1 ? s.getRange(2,1,last-1,1).getValues().flat() : [];
      if (!ex.includes(body.username)) {
        s.appendRow([body.username, new Date().toLocaleString("he-IL")]);
        stripeRow(s, s.getLastRow());
        s.autoResizeColumns(1, 2);
      }
      return ok({ success: true });
    }

    // ── saveWorkout ───────────────────────────────────────
    if (action === "saveWorkout") {
      const hist = getOrCreate(ss, SHEETS.HISTORY, HEADERS.HISTORY, COLORS.HISTORY);
      const day  = hebrewDay(body.date);

      body.exercises.forEach(ex => {
        ex.sets.forEach((set, idx) => {
          hist.appendRow([body.username, body.date, day, body.duration,
                          ex.name, ex.equipId || "", idx+1, set.reps, set.weight]);
          stripeRow(hist, hist.getLastRow());
        });
      });
      hist.autoResizeColumns(1, 9);
      updateSummary(ss, body.username, body.exercises, body.date);
      return ok({ success: true });
    }

    // ── chat ─── proxy ל-Claude (פותר CORS) ──────────────
    if (action === "chat") {
      const apiKey = PropertiesService.getScriptProperties().getProperty("ANTHROPIC_KEY");
      if (!apiKey) return err("ANTHROPIC_KEY חסר ב-Script Properties");

      const payload = {
        model:      "claude-sonnet-4-20250514",
        max_tokens: 1000,
        system:     body.system,
        messages:   body.messages,
      };

      const response = UrlFetchApp.fetch("https://api.anthropic.com/v1/messages", {
        method:  "post",
        headers: {
          "Content-Type":      "application/json",
          "x-api-key":         apiKey,
          "anthropic-version": "2023-06-01",
        },
        payload: JSON.stringify(payload),
        muteHttpExceptions: true,
      });

      const result = JSON.parse(response.getContentText());
      if (result.error) return err(result.error.message);
      return ok({ reply: result.content?.[0]?.text || "" });
    }

    return err("Unknown action");
  } catch(ex) { return err(ex.message); }
}

// ── Summary ───────────────────────────────────────────────────
function updateSummary(ss, username, exercises, dateStr) {
  const s = getOrCreate(ss, SHEETS.SUMMARY, HEADERS.SUMMARY, COLORS.SUMMARY);
  exercises.forEach(ex => {
    const maxW = Math.max(...ex.sets.map(s => s.weight));
    const maxR = Math.max(...ex.sets.map(s => s.reps));
    const last = s.getLastRow();
    let   row  = -1;
    if (last > 1) {
      const data = s.getRange(2,1,last-1,2).getValues();
      row = data.findIndex(r => r[0] === username && r[1] === ex.name);
    }
    if (row >= 0) {
      const r = row + 2;
      s.getRange(r,4).setValue((s.getRange(r,4).getValue()||0) + ex.sets.length);
      s.getRange(r,5).setValue(Math.max(s.getRange(r,5).getValue()||0, maxW));
      s.getRange(r,6).setValue(Math.max(s.getRange(r,6).getValue()||0, maxR));
      s.getRange(r,7).setValue(dateStr);
    } else {
      s.appendRow([username, ex.name, ex.equipId||"", ex.sets.length, maxW, maxR, dateStr]);
      stripeRow(s, s.getLastRow());
    }
  });
  s.autoResizeColumns(1, 7);
}

function ok(d)    { return ContentService.createTextOutput(JSON.stringify({ok:true,...d})).setMimeType(ContentService.MimeType.JSON); }
function err(msg) { return ContentService.createTextOutput(JSON.stringify({ok:false,error:msg})).setMimeType(ContentService.MimeType.JSON); }
