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

Bus responses use the same Apps Script deployment and automatically create a
separate `Bus Reservations` tab.

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
| Cross Train Minutes | Whole minutes from elliptical, bike, or swim |
| Training Feel | Great, Good, Okay, Hard, or Injured |
| Notes | Optional coach note |

## Privacy note

The Google Sheet itself stays private. The Apps Script deployment accepts form
submissions without giving athletes access to view or edit the spreadsheet.

## Sync the public website from Google Drive

The Coach Utilities page links authorized repository collaborators to the
`Sync website with Google Drive` GitHub Actions workflow. The workflow regenerates
the public schedule and roster snapshots and commits changes to `main`; GitHub
Pages then publishes the commit normally.

Before the first run:

1. Create a Google Cloud service account and enable the Google Sheets API.
2. Share the schedule and roster spreadsheets with the service account's email as
   a viewer.
3. Add the complete service-account JSON as the repository Actions secret
   `GOOGLE_SERVICE_ACCOUNT_JSON`.
4. If the spreadsheet IDs ever change, add Actions variables named
   `SCHEDULE_SPREADSHEET_ID` and `ROSTER_SPREADSHEET_ID`. The current IDs are the
   workflow defaults.
5. In repository **Settings → Actions → General**, allow workflows read and write
   permissions.

Run the workflow with **Preview changes without publishing** enabled to download
a patch without changing the website. Disable preview to commit and publish the
generated snapshots.

## Coach authentication

Coach Utilities uses Google sign-in through the dedicated `wolfpack-xctf`
Firebase project. The approved email list is stored in the
`COACH_EMAIL_ALLOWLIST` Secret Manager secret and checked by callable functions;
it is not included in public site files or Firestore.

The following pages require approved coach access:

- `coach-tools.html`
- `attendance.html`
- `workout-log.html`

Attendance is written by the authenticated `recordAttendance` callable function
to the `XC 2026 Attendance` tab. The older Apps Script endpoint remains in use
for athlete mileage and bus-reservation submissions only.

Firebase project setup:

1. Enable Google as an Authentication provider.
2. Add `wolfpack-xctf.com`, `www.wolfpack-xctf.com` if used, and
   `ckorabik.github.io` to Authentication authorized domains.
3. Enable the Google Sheets API for project `wolfpack-xctf`.
4. Share the Attendance spreadsheet as Editor with the Functions runtime service
   account: `144270530422-compute@developer.gserviceaccount.com`.
5. Deploy with
   `npx firebase deploy --only functions,firestore:rules --project wolfpack-xctf`.

Firestore browser access is denied by default. All coach authorization and
attendance writes are performed by the callable backend.
