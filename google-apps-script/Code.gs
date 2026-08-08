const SHEET_NAME = "Mileage Log";
const BUS_SHEET_NAME = "Sheet1";
const SPREADSHEET_ID = "1cL0OWH-aiRr1MuKQYq3Dfm9AqWar37THlSbWoJDgnws";
const BUS_SPREADSHEET_ID = "1zsWKNcIsKxRdjNmGhGsO_Nx9v3OPcwqJzn8v79Mojb4";
const ATTENDANCE_SPREADSHEET_ID = "1NqXh-ZTTKSjP0RnBgNUT_kCvh4PrbVRxxAMSPGPcxPY";
const ATTENDANCE_SHEET_NAME = "XC 2026 Attendance";
const TIME_ZONE = "America/Chicago";
const ALLOWED_ATHLETES = new Set(
  "Alrik S.|Brendan H.|Charlie M. (O'Hara)|Michael G.|Joseph H.|John H.|Edward L.|Devlin B.|Edward M.|Julien D.|Clark H.|Samuel J.|Jameson M.|Joseph R.|Jack S.|Ari T.|Dylan W.|Zachary H.|Beau C.|Nathan B.|William D.|Nicholas S.|Liam G.|Alex P.|Riley A.|Emmett H.|Hank P.|Geonathan M.|Charlie M. (Keelan)|Philip Z.|Sam J.|Brendan S.|Lucas S.|Charles B.|James H.|Liam F.|Adriel A.|Jackson C.|Henry M.|Benny R.|Connor M.|Brian F.|JP H.|Connor N.|Chris Korabik (Coach)|David Cooke (Coach)|Aaron Harris (Coach)|Tony Sacco (Coach)|Heraldo Morrison (Coach)|Logan B.|Luca B.|Matthew E.|Jonathan F.|Joshua G.|Clayton H.|Theodoros H.|Gavin H.|Xavier L.|Charles M.|Jacob O.|John P.|Julian R.|Jonathan S.|Nathan T.|Robert W.|Andrew Z.".split("|"),
);
const ATTENDANCE_NAME_MAP = {
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

function doPost(event) {
  const lock = LockService.getScriptLock();

  try {
    lock.waitLock(10000);

    const data = JSON.parse(event.postData.contents);
    if (data.submissionType === "attendance") {
      saveAttendance_(data);
    } else if (data.submissionType === "busReservation") {
      saveBusReservation_(data);
    } else {
      saveMileageSubmission_(data);
    }

    return jsonResponse_({ status: "success" });
  } catch (error) {
    return jsonResponse_({
      status: "error",
      message: error.message || "Unable to save submission.",
    });
  } finally {
    lock.releaseLock();
  }
}

function saveMileageSubmission_(data) {
  validateSubmission_(data);
  const sheet = getMileageSheet_();
  sheet.appendRow([
    new Date(),
    clean_(data.athleteName),
    clean_(data.weekEnding),
    Number(data.weeklyMiles),
    Number(data.crossTrainMinutes),
    clean_(data.trainingFeel),
    clean_(data.notes || ""),
  ]);
}

function saveBusReservation_(data) {
  validateBusReservation_(data);
  const sheet = getBusReservationSheet_();
  sheet.appendRow([
    clean_(data.event),
    clean_(data.riderName),
    clean_(data.takingBus),
  ]);
}

function saveAttendance_(data) {
  validateAttendance_(data);
  const spreadsheet = SpreadsheetApp.openById(ATTENDANCE_SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName(ATTENDANCE_SHEET_NAME);
  if (!sheet) throw new Error("The attendance sheet could not be found.");

  const eventHeader = attendanceEventHeader_(data.event);
  const lastColumn = Math.max(sheet.getLastColumn(), 1);
  const headers = sheet.getRange(1, 1, 1, lastColumn).getDisplayValues()[0];
  let eventColumn = headers.indexOf(eventHeader) + 1;
  if (!eventColumn) {
    eventColumn = lastColumn + 1;
    sheet.getRange(1, eventColumn).setValue(eventHeader).setFontWeight("bold");
  }

  const lastRow = Math.max(sheet.getLastRow(), 1);
  const existingNames = lastRow > 1
    ? sheet.getRange(2, 1, lastRow - 1, 1).getDisplayValues().flat()
    : [];
  const rowByName = {};
  existingNames.forEach((name, index) => {
    if (name) rowByName[name] = index + 2;
  });

  data.records.forEach((record) => {
    const fullName = ATTENDANCE_NAME_MAP[record.athleteKey];
    let athleteRow = rowByName[fullName];
    if (!athleteRow) {
      athleteRow = sheet.getLastRow() + 1;
      sheet.getRange(athleteRow, 1).setValue(fullName);
      rowByName[fullName] = athleteRow;
    }
    const cell = sheet.getRange(athleteRow, eventColumn);
    cell.setValue(record.status);
    cell.setBackground(record.status === "Present" ? "#b7e1cd" : "#f4c7c3");
  });

  sheet.setFrozenRows(1);
  sheet.setFrozenColumns(1);
  sheet.autoResizeColumn(eventColumn);
}

function getMileageSheet_() {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
    sheet.appendRow([
      "Submitted At",
      "Athlete Name",
      "Week Ending",
      "Weekly Miles",
      "Cross Train Minutes",
      "Training Feel",
      "Notes",
    ]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, 7).setFontWeight("bold");
    sheet.autoResizeColumns(1, 7);
  } else if (sheet.getRange("E1").getValue() !== "Cross Train Minutes") {
    // Preserve existing entries by shifting Training Feel and Notes to the right.
    sheet.insertColumnBefore(5);
    sheet.getRange("E1").setValue("Cross Train Minutes").setFontWeight("bold");
    sheet.autoResizeColumn(5);
  }

  return sheet;
}

function getBusReservationSheet_() {
  const spreadsheet = SpreadsheetApp.openById(BUS_SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName(BUS_SHEET_NAME);
  if (!sheet) throw new Error("The bus reservations sheet could not be found.");
  return sheet;
}

function validateSubmission_(data) {
  if (!data || typeof data !== "object") {
    throw new Error("Invalid submission.");
  }

  if (!ALLOWED_ATHLETES.has(String(data.athleteName || "").trim())) {
    throw new Error("Choose an athlete from the current roster.");
  }

  if (!getAllowedWeekEndings_().includes(String(data.weekEnding || ""))) {
    throw new Error("Choose one of the four available training weeks.");
  }

  const miles = Number(data.weeklyMiles);
  if (!Number.isFinite(miles) || miles < 0 || miles > 200) {
    throw new Error("Weekly mileage must be between 0 and 200.");
  }

  const crossTrainMinutes = Number(data.crossTrainMinutes);
  if (
    !Number.isInteger(crossTrainMinutes) ||
    crossTrainMinutes < 0 ||
    crossTrainMinutes > 3000
  ) {
    throw new Error("Cross-training minutes must be a whole number between 0 and 3,000.");
  }

  const allowedFeelings = ["Great", "Good", "Okay", "Hard", "Injured"];
  if (!allowedFeelings.includes(data.trainingFeel)) {
    throw new Error("Choose a valid training feeling.");
  }
}

function validateBusReservation_(data) {
  if (!data || typeof data !== "object") {
    throw new Error("Invalid bus reservation.");
  }

  if (!ALLOWED_ATHLETES.has(String(data.riderName || "").trim())) {
    throw new Error("Choose a rider from the current roster.");
  }

  const eventName = String(data.event || "").trim();
  if (!/^\d{4}-\d{2}-\d{2} \| .{1,100}$/.test(eventName)) {
    throw new Error("Choose a valid upcoming event.");
  }

  if (!["Yes", "No"].includes(data.takingBus)) {
    throw new Error("Choose yes or no for bus transportation.");
  }
}

function validateAttendance_(data) {
  if (!data || typeof data !== "object") throw new Error("Invalid attendance submission.");
  if (!/^\d{4}-\d{2}-\d{2}( \| .{1,100})?$/.test(String(data.event || ""))) {
    throw new Error("Choose a valid event or attendance date.");
  }
  if (!Array.isArray(data.records) || data.records.length < 1 || data.records.length > 61) {
    throw new Error("Mark at least one rostered athlete.");
  }

  const submittedKeys = new Set();
  data.records.forEach((record) => {
    if (!record || !ATTENDANCE_NAME_MAP[record.athleteKey]) {
      throw new Error("Attendance includes an athlete who is not on the roster.");
    }
    if (submittedKeys.has(record.athleteKey)) throw new Error("An athlete was submitted more than once.");
    submittedKeys.add(record.athleteKey);
    if (!["Present", "Absent"].includes(record.status)) throw new Error("Choose Present or Absent for each athlete.");
  });
}

function attendanceEventHeader_(eventValue) {
  const [dateValue, title] = String(eventValue).split(" | ");
  const [year, month, day] = dateValue.split("-");
  const shortDate = `${Number(month)}/${Number(day)}/${year.slice(-2)}`;
  return title || shortDate;
}

function getAllowedWeekEndings_() {
  const [year, month, day] = Utilities.formatDate(new Date(), TIME_ZONE, "yyyy-MM-dd")
    .split("-")
    .map(Number);
  const today = new Date(year, month - 1, day, 12);
  const daysSinceMonday = today.getDay() === 0 ? 6 : today.getDay() - 1;
  const currentMonday = new Date(today);
  currentMonday.setDate(today.getDate() - daysSinceMonday);

  return Array.from({ length: 4 }, (_, index) => {
    const sunday = new Date(currentMonday);
    sunday.setDate(currentMonday.getDate() - index * 7 + 6);
    return Utilities.formatDate(sunday, TIME_ZONE, "yyyy-MM-dd");
  });
}

function clean_(value) {
  const text = String(value).trim();
  // Prevent spreadsheet formulas from being submitted through text fields.
  return /^[=+\-@]/.test(text) ? `'${text}` : text;
}

function jsonResponse_(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(
    ContentService.MimeType.JSON,
  );
}
