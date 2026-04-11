// ============================================================
//  GymAgent – Google Apps Script Backend
//  פרסום: Extensions > Apps Script > Deploy > New Deployment
//  Type: Web App | Execute as: Me | Who has access: Anyone
// ============================================================

const USERS_SHEET = "Users";

function getOrCreateSheet(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#222222").setFontColor("#ffffff");
  }
  return sheet;
}

// ── GET ──────────────────────────────────────────────────────
function doGet(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const action = e.parameter.action;

  try {
    if (action === "getUsers") {
      const sheet = getOrCreateSheet(ss, USERS_SHEET, ["Name", "Created"]);
      const rows = sheet.getLastRow() > 1
        ? sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues()
        : [];
      const users = rows.map(r => r[0]).filter(Boolean);
      return ok({ users });
    }

    if (action === "getHistory") {
      const username = e.parameter.username;
      const sheetName = "History_" + username;
      const sheet = ss.getSheetByName(sheetName);
      if (!sheet || sheet.getLastRow() < 2) return ok({ history: [] });
      const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, 3).getValues();
      const history = rows
        .filter(r => r[0])
        .map(r => ({
          date: r[0],
          duration: r[1],
          exercises: JSON.parse(r[2] || "[]"),
        }));
      return ok({ history });
    }

    return err("Unknown action");
  } catch (ex) {
    return err(ex.message);
  }
}

// ── POST ─────────────────────────────────────────────────────
function doPost(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  try {
    const body = JSON.parse(e.postData.contents);
    const action = body.action;

    if (action === "addUser") {
      const sheet = getOrCreateSheet(ss, USERS_SHEET, ["Name", "Created"]);
      // Check duplicate
      const existing = sheet.getLastRow() > 1
        ? sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues().flat()
        : [];
      if (existing.includes(body.username)) return ok({ success: true, exists: true });
      sheet.appendRow([body.username, new Date().toISOString()]);
      return ok({ success: true });
    }

    if (action === "saveWorkout") {
      const sheetName = "History_" + body.username;
      const sheet = getOrCreateSheet(ss, sheetName, ["Date", "Duration (min)", "Exercises (JSON)"]);
      sheet.appendRow([
        body.date,
        body.duration,
        JSON.stringify(body.exercises),
      ]);
      // Auto-resize columns
      sheet.autoResizeColumns(1, 3);
      return ok({ success: true });
    }

    return err("Unknown action");
  } catch (ex) {
    return err(ex.message);
  }
}

// ── Helpers ──────────────────────────────────────────────────
function ok(data) {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, ...data }))
    .setMimeType(ContentService.MimeType.JSON);
}
function err(msg) {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: false, error: msg }))
    .setMimeType(ContentService.MimeType.JSON);
}
