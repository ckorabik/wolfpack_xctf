function renderTable(table, rows) {
  table.replaceChildren();
  if (!rows?.length) {
    const caption = document.createElement("caption");
    caption.textContent = "No submissions yet.";
    table.append(caption);
    return;
  }
  const [headers, ...data] = rows;
  const head = table.createTHead().insertRow();
  headers.forEach((value) => {
    const cell = document.createElement("th");
    cell.scope = "col";
    cell.textContent = value;
    head.append(cell);
  });
  const body = table.createTBody();
  data.slice().reverse().forEach((row) => {
    const output = body.insertRow();
    headers.forEach((_, index) => { output.insertCell().textContent = row[index] || ""; });
  });
}

const insights = window.WOLFPACK_TEAM_INSIGHTS || {};
renderTable(document.querySelector("#mileage-insights"), insights.mileage);
renderTable(document.querySelector("#bus-insights"), insights.busReservations);
