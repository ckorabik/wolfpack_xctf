# Wolfpack Weekly Mileage

A small, mobile-friendly website where Wolfpack athletes submit weekly mileage.
Submissions are written to a private Google Sheet through Google Apps Script.

Production domain: `https://wolfpack-xctf.com/`

## Connect the form to Google Sheets

The spreadsheet is already created in Google Drive:
[Wolfpack Weekly Mileage](https://docs.google.com/spreadsheets/d/1cL0OWH-aiRr1MuKQYq3Dfm9AqWar37THlSbWoJDgnws/edit).

History and Records currently use reviewed static snapshots from the
`SICP XC History` spreadsheet. See `TODO.md` for the planned coach-triggered
bulk synchronization workflow.

1. Open the spreadsheet and choose **Extensions → Apps Script**.
2. Delete the starter code and paste in `google-apps-script/Code.gs`.
3. Click **Save**, then **Deploy → New deployment**.
4. Click the gear beside **Select type** and choose **Web app**.
5. Set **Execute as** to **Me**.
6. Set **Who has access** to **Anyone**.
7. Click **Deploy** and approve Google's permission prompt.
8. Copy the Web App URL.
9. Paste that URL into `config.js`:

   ```js
   window.WOLFPACK_CONFIG = {
     googleScriptUrl: "YOUR_WEB_APP_URL",
   };
   ```

The first successful submission automatically creates a tab called `Mileage Log`
with the correct column headers.

Important: after changing `Code.gs`, create a new Apps Script deployment version
for the live form to use the update.

## Test locally

From this folder, run:

```powershell
python -m http.server 8000
```

Then visit `http://localhost:8000`.

Without an Apps Script URL, the form validates normally and shows a configuration
message instead of sending data.

## Sheet columns

| Column | Value |
| --- | --- |
| Submitted At | Server timestamp |
| Athlete Name | Athlete's submitted name |
| Week Ending | Selected date |
| Weekly Miles | Number from 0–200 |
| Training Feel | Great, Good, Okay, Hard, or Injured |
| Notes | Optional coach note |

## Privacy note

The Google Sheet itself stays private. The Apps Script deployment accepts form
submissions without giving athletes access to view or edit the spreadsheet.
