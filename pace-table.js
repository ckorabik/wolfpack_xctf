const paceForm = document.querySelector("#pace-lookup-form");
const timeInput = document.querySelector("#pace-time");
const inputHint = document.querySelector("#pace-input-hint");
const errorElement = document.querySelector("#pace-error");
const fullTableBody = document.querySelector("#pace-full-table-body");
const tableHighlightNote = document.querySelector("#pace-table-highlight-note");

function secondsFromTime(value) {
  const match = value.trim().match(/^(\d{1,2}):([0-5]\d)(?:\.(\d))?$/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]) + Number(`0.${match[3] || 0}`);
}

function benchmarkSeconds(value, fallback) {
  return value.endsWith("+") ? fallback : secondsFromTime(value);
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

function bracketingRowIndexes(inputSeconds, distance) {
  const rows = tableRows();
  const key = distance === "1600" ? "sixteen" : "threeMile";
  const fallback = distance === "1600" ? 420 : 1440;
  const slowerIndex = rows.findIndex((row) => benchmarkSeconds(row[key], fallback) >= inputSeconds);
  const boundedSlowerIndex = slowerIndex === -1 ? rows.length - 1 : slowerIndex;

  if (boundedSlowerIndex === 0) return [0, Math.min(1, rows.length - 1)];
  return [boundedSlowerIndex - 1, boundedSlowerIndex];
}

function renderFullTable() {
  fullTableBody.replaceChildren(...tableRows().map((row, index) => {
    const tableRow = document.createElement("tr");
    tableRow.dataset.rowIndex = String(index);
    [row.threeMile, row.sixteen, row.vdot, row.mile200, row.mile300, row.pace3200, row.pace3mile, row.critical, row.threshold, row.marathon]
      .forEach((value, columnIndex) => {
        const cell = document.createElement(columnIndex === 0 ? "th" : "td");
        if (columnIndex === 0) cell.scope = "row";
        cell.textContent = value || "—";
        tableRow.append(cell);
      });
    return tableRow;
  }));
}

function highlightBracketingRows(enteredSeconds, distance) {
  const indexes = bracketingRowIndexes(enteredSeconds, distance);
  const rows = tableRows();
  fullTableBody.querySelectorAll("tr").forEach((row) => {
    const rowIndex = Number(row.dataset.rowIndex);
    row.classList.toggle("pace-row-faster", rowIndex === indexes[0]);
    row.classList.toggle("pace-row-slower", rowIndex === indexes[1]);
  });
  const labels = indexes.map((index) => distance === "1600" ? rows[index].sixteen : rows[index].threeMile);
  tableHighlightNote.textContent = `Highlighted fitness range: ${labels[0]} to ${labels[1]} (${distance === "1600" ? "1600 meters" : "3 miles"}).`;
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
    timeInput.focus();
    return;
  }
  const distance = selectedDistance();
  highlightBracketingRows(enteredSeconds, distance);
  fullTableBody.querySelector(".pace-row-faster")?.scrollIntoView({ behavior: "smooth", block: "center" });
});

renderFullTable();
updateInputCopy();
