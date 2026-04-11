# 🏋️ GymAgent

מאמן כושר אישי חכם מבוסס AI — אפליקציית Android.

## ארכיטקטורה

```
React (Vite) → Capacitor → Android APK
      ↓
Google Apps Script → Google Sheets
      ↓
Anthropic Claude API
```

## הגדרה ראשונה

### 1. Google Apps Script
1. פתח [Google Sheet חדש](https://sheets.new)
2. **Extensions → Apps Script**
3. מחק קוד קיים, הדבק את `GymAgent.gs`
4. **Deploy → New Deployment → Web App**
   - Execute as: `Me`
   - Who has access: `Anyone`
5. שמור את ה-**Web App URL**

### 2. Anthropic API Key
1. היכנס ל-[console.anthropic.com](https://console.anthropic.com)
2. **API Keys → Create Key**
3. שמור את המפתח

### 3. הרץ את האפליקציה
בפעם הראשונה, האפליקציה תבקש:
- Apps Script URL
- Anthropic API Key

שניהם נשמרים **מקומית על המכשיר** בלבד.

## בניית APK

### אוטומטית (GitHub Actions)
כל push ל-`main` בונה APK אוטומטית:
1. לך ל-**Actions** ב-GitHub
2. בחר את ה-workflow האחרון
3. **Artifacts → GymAgent-debug-X** → הורד

### גרסת Release
```bash
git tag v1.0.0
git push origin v1.0.0
```
האפליקציה תופיע תחת **Releases** ב-GitHub.

### ידנית (מקומית)
```bash
npm install
npm run build
npx cap add android
npx cap sync android
cd android && ./gradlew assembleDebug
# APK: android/app/build/outputs/apk/debug/app-debug.apk
```

## מבנה ה-Sheets

| שם טאב | תוכן |
|--------|------|
| `Users` | רשימת משתמשים + תאריך הצטרפות |
| `History_שם` | כל האימונים של המשתמש |

## תכונות
- 👤 מספר משתמשים (כל אחד עם היסטוריה נפרדת)
- 🤖 המלצות AI מבוססות היסטוריה
- 📊 סנכרון ל-Google Sheets בזמן אמת
- 📈 מעקב עומסים אוטומטי (+ 2.5–5 ק"ג בהתאם לביצועים)
- 💾 נתונים נשמרים גם אם מאבדים את הטלפון
