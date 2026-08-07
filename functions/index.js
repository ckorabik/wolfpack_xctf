const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { defineSecret } = require("firebase-functions/params");
const { HttpsError, onCall } = require("firebase-functions/v2/https");
const { google } = require("googleapis");
const crypto = require("node:crypto");

initializeApp();

const coachEmailAllowlist = defineSecret("COACH_EMAIL_ALLOWLIST");
const siteAccessCode = defineSecret("SITE_ACCESS_CODE");
const REGION = "us-central1";
const ATTENDANCE_SPREADSHEET_ID = "1NqXh-ZTTKSjP0RnBgNUT_kCvh4PrbVRxxAMSPGPcxPY";
const ATTENDANCE_SHEET_NAME = "XC 2026 Attendance";

const attendanceNameMap = {
  "O'Hara|Alrik S.": "Alrik Swan",
  "O'Hara|Brendan H.": "Brendan Houlihan",
  "O'Hara|Charlie M.": "Charlie Maida",
  "O'Hara|Michael G.": "Michael Gaffey",
  "O'Hara|Joseph H.": "Joseph Horos",
  "O'Hara|John H.": "John Hlavin",
  "O'Hara|Edward L.": "Edward Lynch",
  "O'Hara|Devlin B.": "Devlin Burns",
  "Patton|Edward M.": "Edward Maley",
  "Patton|Julien D.": "Julien Duque",
  "Patton|Clark H.": "Clark Holland",
  "Patton|Samuel J.": "Samuel Jakola",
  "Patton|Jameson M.": "Jameson McCusker",
  "Patton|Joseph R.": "Joseph Rodriguez",
  "Patton|Jack S.": "Jack Sheaffer",
  "Patton|Ari T.": "Ari Thompkins",
  "Patton|Dylan W.": "Dylan Wood",
  "Patton|Zachary H.": "Zachary Hamer",
  "Patton|Beau C.": "Beau Cunningham",
  "Patton|Nathan B.": "Nathan Barrett",
  "Patton|William D.": "William Devaney",
  "Patton|Nicholas S.": "Nicholas Schuler",
  "Keelan|Liam G.": "Liam Goodman",
  "Keelan|Alex P.": "Alex Pensinger",
  "Keelan|Riley A.": "Riley Aguilar",
  "Keelan|Emmett H.": "Emmett Hourihane",
  "Keelan|Hank P.": "Hank Pensinger",
  "Keelan|Geonathan M.": "Geonathan Mocha",
  "Keelan|Charlie M.": "Charlie Merok",
  "Keelan|Philip Z.": "Philip Ziarno",
  "Santino|Sam J.": "Sam Jacobson",
  "Santino|Brendan S.": "Brendan Stoiber",
  "Santino|Lucas S.": "Lucas Sawyer",
  "Santino|Charles B.": "Charles Braasch",
  "Santino|James H.": "James Hering",
  "Santino|Liam F.": "Liam Fekrat",
  "Santino|Adriel A.": "Adriel Anele",
  "Santino|Jackson C.": "Jackson Cortese",
  "Conroy|Henry M.": "Henry McMahon",
  "Conroy|Benny R.": "Benny Rivera",
  "Conroy|Connor M.": "Connor McMahon",
  "Conroy|Brian F.": "Brian Fitzgerald",
  "Conroy|JP H.": "JP Hansen",
  "Conroy|Connor N.": "Connor Ng",
  "TBD|Logan B.": "Logan Bloomquist",
  "TBD|Luca B.": "Luca Buzachero",
  "TBD|Matthew E.": "Matthew Escuadro",
  "TBD|Jonathan F.": "Jonathan Farkasch",
  "TBD|Joshua G.": "Joshua Golem",
  "TBD|Clayton H.": "Clayton Harris",
  "TBD|Theodoros H.": "Theodoros Hiotis",
  "TBD|Gavin H.": "Gavin Hoey",
  "TBD|Xavier L.": "Xavier Lassus",
  "TBD|Charles M.": "Charles Martin",
  "TBD|Jacob O.": "Jacob Olson",
  "TBD|John P.": "John Phelan",
  "TBD|Julian R.": "Julian Rodriguez",
  "TBD|Jonathan S.": "Jonathan Salazar",
  "TBD|Nathan T.": "Nathan Tydus",
  "TBD|Robert W.": "Robert Weiland",
  "TBD|Andrew Z.": "Andrew Zamora",
};

function allowedCoachEmails() {
  const raw = coachEmailAllowlist.value();
  return new Set(
    raw
      .split(/[\n,;]+/)
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

function requireApprovedCoach(request) {
  if (!request.auth) throw new HttpsError("unauthenticated", "Sign in with Google to continue.");
  const email = String(request.auth.token.email || "").trim().toLowerCase();
  if (!request.auth.token.email_verified || !allowedCoachEmails().has(email)) {
    throw new HttpsError("permission-denied", "This Google account is not approved for Coach Utilities.");
  }
  return email;
}

function accessCodesMatch(submittedCode) {
  const expected = Buffer.from(siteAccessCode.value().trim());
  const submitted = Buffer.from(String(submittedCode || "").trim());
  return expected.length === submitted.length && crypto.timingSafeEqual(expected, submitted);
}

function validateAttendance(data) {
  if (!data || typeof data !== "object") throw new HttpsError("invalid-argument", "Invalid attendance submission.");
  const event = String(data.event || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}( \| .{1,100})?$/.test(event)) {
    throw new HttpsError("invalid-argument", "Choose a valid event or attendance date.");
  }
  if (!Array.isArray(data.records) || data.records.length < 1 || data.records.length > 70) {
    throw new HttpsError("invalid-argument", "Mark at least one rostered athlete.");
  }

  const submittedKeys = new Set();
  const records = data.records.map((record) => {
    const athleteKey = String(record?.athleteKey || "");
    const status = String(record?.status || "");
    if (!attendanceNameMap[athleteKey]) {
      throw new HttpsError("invalid-argument", "Attendance includes an athlete who is not on the roster.");
    }
    if (submittedKeys.has(athleteKey)) {
      throw new HttpsError("invalid-argument", "An athlete was submitted more than once.");
    }
    if (!new Set(["Present", "Absent"]).has(status)) {
      throw new HttpsError("invalid-argument", "Choose Present or Absent for each athlete.");
    }
    submittedKeys.add(athleteKey);
    return { athleteKey, fullName: attendanceNameMap[athleteKey], status };
  });
  return { event, records };
}

function attendanceEventHeader(eventValue) {
  const [dateValue, title] = eventValue.split(" | ");
  const [year, month, day] = dateValue.split("-");
  return title || `${Number(month)}/${Number(day)}/${year.slice(-2)}`;
}

function columnName(columnNumber) {
  let result = "";
  for (let number = columnNumber; number > 0; number = Math.floor((number - 1) / 26)) {
    result = String.fromCharCode(((number - 1) % 26) + 65) + result;
  }
  return result;
}

function quoteSheetName(name) {
  return `'${name.replaceAll("'", "''")}'`;
}

async function saveAttendance(data) {
  const auth = new google.auth.GoogleAuth({ scopes: ["https://www.googleapis.com/auth/spreadsheets"] });
  const sheets = google.sheets({ version: "v4", auth });
  const sheetName = quoteSheetName(ATTENDANCE_SHEET_NAME);
  const metadata = await sheets.spreadsheets.get({
    spreadsheetId: ATTENDANCE_SPREADSHEET_ID,
    fields: "sheets.properties",
  });
  const sheetProperties = metadata.data.sheets
    .map((sheet) => sheet.properties)
    .find((properties) => properties.title === ATTENDANCE_SHEET_NAME);
  if (!sheetProperties) throw new HttpsError("failed-precondition", "The attendance sheet could not be found.");

  const valuesResult = await sheets.spreadsheets.values.batchGet({
    spreadsheetId: ATTENDANCE_SPREADSHEET_ID,
    ranges: [`${sheetName}!1:1`, `${sheetName}!A:A`],
  });
  const headers = valuesResult.data.valueRanges?.[0]?.values?.[0] || [];
  const existingNames = (valuesResult.data.valueRanges?.[1]?.values || []).map((row) => row[0] || "");
  const eventHeader = attendanceEventHeader(data.event);
  let eventColumn = headers.indexOf(eventHeader) + 1;
  if (!eventColumn) eventColumn = Math.max(headers.length, 1) + 1;

  const rowByName = new Map();
  existingNames.forEach((name, index) => {
    if (name) rowByName.set(name, index + 1);
  });
  let nextRow = Math.max(existingNames.length + 1, 2);
  const valueUpdates = [];
  if (!headers.includes(eventHeader)) {
    valueUpdates.push({ range: `${sheetName}!${columnName(eventColumn)}1`, values: [[eventHeader]] });
  }
  const formatRequests = [];
  for (const record of data.records) {
    let row = rowByName.get(record.fullName);
    if (!row) {
      row = nextRow++;
      rowByName.set(record.fullName, row);
      valueUpdates.push({ range: `${sheetName}!A${row}`, values: [[record.fullName]] });
    }
    valueUpdates.push({ range: `${sheetName}!${columnName(eventColumn)}${row}`, values: [[record.status]] });
    formatRequests.push({
      repeatCell: {
        range: {
          sheetId: sheetProperties.sheetId,
          startRowIndex: row - 1,
          endRowIndex: row,
          startColumnIndex: eventColumn - 1,
          endColumnIndex: eventColumn,
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: record.status === "Present"
              ? { red: 0.718, green: 0.882, blue: 0.804 }
              : { red: 0.957, green: 0.78, blue: 0.765 },
          },
        },
        fields: "userEnteredFormat.backgroundColor",
      },
    });
  }

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: ATTENDANCE_SPREADSHEET_ID,
    requestBody: { valueInputOption: "RAW", data: valueUpdates },
  });
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: ATTENDANCE_SPREADSHEET_ID,
    requestBody: {
      requests: [
        ...formatRequests,
        {
          updateSheetProperties: {
            properties: { sheetId: sheetProperties.sheetId, gridProperties: { frozenRowCount: 1, frozenColumnCount: 1 } },
            fields: "gridProperties.frozenRowCount,gridProperties.frozenColumnCount",
          },
        },
        {
          autoResizeDimensions: {
            dimensions: { sheetId: sheetProperties.sheetId, dimension: "COLUMNS", startIndex: eventColumn - 1, endIndex: eventColumn },
          },
        },
      ],
    },
  });
  return { eventHeader, updated: data.records.length };
}

exports.getCoachAccess = onCall(
  { region: REGION, secrets: [coachEmailAllowlist], enforceAppCheck: false, invoker: "public" },
  (request) => {
    const email = requireApprovedCoach(request);
    return { authorized: true, email };
  },
);

exports.getSiteAccess = onCall(
  { region: REGION, secrets: [siteAccessCode], enforceAppCheck: false, invoker: "public" },
  async (request) => {
    if (!request.auth || request.auth.token.firebase?.sign_in_provider !== "anonymous") {
      throw new HttpsError("unauthenticated", "Start a standard access session before entering the team code.");
    }
    if (!accessCodesMatch(request.data?.accessCode)) {
      throw new HttpsError("permission-denied", "That access code is not valid.");
    }
    await getAuth().setCustomUserClaims(request.auth.uid, { siteAccess: true, role: "standard" });
    return { authorized: true };
  },
);

exports.recordAttendance = onCall(
  { region: REGION, secrets: [coachEmailAllowlist], enforceAppCheck: false, invoker: "public", timeoutSeconds: 60 },
  async (request) => {
    requireApprovedCoach(request);
    const attendance = validateAttendance(request.data);
    try {
      return await saveAttendance(attendance);
    } catch (error) {
      console.error("Attendance write failed", error);
      if (error instanceof HttpsError) throw error;
      throw new HttpsError("internal", "Attendance could not be saved. Try again or contact the site administrator.");
    }
  },
);
