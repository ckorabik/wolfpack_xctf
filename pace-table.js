const paceForm = document.querySelector("#pace-lookup-form");
const timeInput = document.querySelector("#pace-time");
const inputHint = document.querySelector("#pace-input-hint");
const resultSection = document.querySelector("#pace-result");
const resultGrid = document.querySelector("#pace-result-grid");
const resultHeading = document.querySelector("#pace-result-heading");
const resultNote = document.querySelector("#pace-rounding-note");
const errorElement = document.querySelector("#pace-error");

const columns = [
  { key: "mile200", label: "Mile pace", detail: "Per 200m", kind: "seconds" },
  { key: "mile300", label: "Mile pace", detail: "Per 300m", kind: "seconds" },
  { key: "pace3200", label: "3200 pace", detail: "Per 400m", kind: "seconds" },
  { key: "pace3mile", label: "3-mile pace", detail: "Per 400m", kind: "seconds" },
  { key: "critical", label: "Critical velocity", detail: "Per 800m" },
  { key: "threshold", label: "Threshold", detail: "Per mile" },
  { key: "marathon", label: "Marathon pace", detail: "Per mile" },
];

function secondsFromTime(value) {
  const match = value.trim().match(/^(\d{1,2}):([0-5]\d)(?:\.(\d))?$/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]) + Number(`0.${match[3] || 0}`);
}

function benchmarkSeconds(value, fallback) {
  return value.endsWith("+") ? fallback : secondsFromTime(value);
}

function paceFromSeconds(value) {
  const suffix = value.endsWith("+") ? "+" : "";
  const seconds = Number.parseFloat(value);
  if (!Number.isFinite(seconds)) return value;
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds - minutes * 60;
  const display = Number.isInteger(remainder) ? String(remainder).padStart(2, "0") : remainder.toFixed(1).padStart(4, "0");
  return minutes ? `${minutes}:${display}${suffix}` : `${display}${suffix} sec`;
}

function tableRows() {
  return (window.WOLFPACK_PACE_TABLE?.rows || []).map((row) => ({
    threeMile: row[0], sixteen: row[1], vdot: row[2], mile200: row[3], mile300: row[4],
    pace3200: row[5], pace3mile: row[6], critical: row[7], threshold: row[8], marathon: row[9],
  }));
}

function selectedDistance() {
  return paceForm.elements.distance.value;
}

function updateInputCopy() {
  const is1600 = selectedDistance() === "1600";
  timeInput.placeholder = is1600 ? "5:12" : "18:05";
  inputHint.textContent = is1600 ? "Enter a track 1600 time, such as 5:12." : "Enter a 3-mile time, such as 18:05.";
  timeInput.setAttribute("aria-label", is1600 ? "Estimated 1600 meter time" : "Estimated 3-mile time");
  errorElement.textContent = "";
}

function chooseSlowerRow(inputSeconds, distance) {
  const rows = tableRows();
  const key = distance === "1600" ? "sixteen" : "threeMile";
  const fallback = distance === "1600" ? 420 : 1440;
  return rows.find((row) => benchmarkSeconds(row[key], fallback) >= inputSeconds) || rows.at(-1);
}

function createResultCard(column, row) {
  const card = document.createElement("article");
  card.className = "pace-result-card";
  const raw = row[column.key];
  const value = raw ? (column.kind === "seconds" ? paceFromSeconds(raw) : raw) : "Not prescribed";
  const label = document.createElement("p");
  const strong = document.createElement("strong");
  const detail = document.createElement("span");
  label.textContent = column.label;
  strong.textContent = value;
  detail.textContent = column.detail;
  card.append(label, strong, detail);
  if (!raw) card.classList.add("pace-result-unavailable");
  return card;
}

function renderResult(row, enteredSeconds, distance) {
  const benchmark = distance === "1600" ? row.sixteen : row.threeMile;
  const benchmarkValue = benchmarkSeconds(benchmark, distance === "1600" ? 420 : 1440);
  resultHeading.textContent = `${row.threeMile} 3-mile · ${row.sixteen} 1600 · VDOT ${row.vdot}`;
  resultNote.textContent = benchmarkValue > enteredSeconds
    ? `For safety, your entry was rounded to the next slower table row (${benchmark}).`
    : `Your entry matches the ${benchmark} table row.`;
  resultGrid.replaceChildren(...columns.map((column) => createResultCard(column, row)));
  resultSection.hidden = false;
  resultSection.scrollIntoView({ behavior: "smooth", block: "start" });
}

paceForm?.addEventListener("change", (event) => {
  if (event.target.name === "distance") updateInputCopy();
});

paceForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  errorElement.textContent = "";
  const enteredSeconds = secondsFromTime(timeInput.value);
  if (enteredSeconds === null) {
    errorElement.textContent = "Enter minutes:seconds, such as 5:12 or 18:05.";
    resultSection.hidden = true;
    timeInput.focus();
    return;
  }
  const distance = selectedDistance();
  renderResult(chooseSlowerRow(enteredSeconds, distance), enteredSeconds, distance);
});

updateInputCopy();
