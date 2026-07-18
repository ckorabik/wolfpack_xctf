const SHEET_NAME = "Mileage Log";
const SPREADSHEET_ID = "1cL0OWH-aiRr1MuKQYq3Dfm9AqWar37THlSbWoJDgnws";

function doPost(event) {
  const lock = LockService.getScriptLock();

  try {
    lock.waitLock(10000);

    const data = JSON.parse(event.postData.contents);
    validateSubmission_(data);

    const sheet = getMileageSheet_();
    sheet.appendRow([
      new Date(),
      clean_(data.athleteName),
      clean_(data.weekEnding),
      Number(data.weeklyMiles),
      clean_(data.trainingFeel),
      clean_(data.notes || ""),
    ]);

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
      "Training Feel",
      "Notes",
    ]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, 6).setFontWeight("bold");
    sheet.autoResizeColumns(1, 6);
  }

  return sheet;
}

function validateSubmission_(data) {
  if (!data || typeof data !== "object") {
    throw new Error("Invalid submission.");
  }

  if (!String(data.athleteName || "").trim()) {
    throw new Error("Athlete name is required.");
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(data.weekEnding || ""))) {
    throw new Error("A valid week-ending date is required.");
  }

  const miles = Number(data.weeklyMiles);
  if (!Number.isFinite(miles) || miles < 0 || miles > 200) {
    throw new Error("Weekly mileage must be between 0 and 200.");
  }

  const allowedFeelings = ["Great", "Good", "Okay", "Hard", "Injured"];
  if (!allowedFeelings.includes(data.trainingFeel)) {
    throw new Error("Choose a valid training feeling.");
  }
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
