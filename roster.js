const rosterData = `
S.|Alrik|10|O'Hara||
H.|Brendan|12|O'Hara||
M.|Charlie|12|O'Hara||
G.|Michael|12|O'Hara||
H.|Joseph|10|O'Hara||
H.|John|10|O'Hara||
L.|Edward|10|O'Hara||
B.|Devlin|11|O'Hara||
M.|Edward|10|Patton||
D.|Julien|9|Patton||
H.|Clark|9|Patton||
J.|Samuel|10|Patton||
M.|Jameson|9|Patton||
R.|Joseph|9|Patton||
S.|Jack|9|Patton||
T.|Ari|9|Patton||
W.|Dylan|9|Patton||
H.|Zachary|10|Patton||
C.|Beau|12|Patton||
B.|Nathan|12|Patton||
D.|William|10|Patton||
S.|Nicholas|10|Patton||
G.|Liam|10|Keelan||
P.|Alex|11|Keelan||
A.|Riley|12|Keelan||
H.|Emmett|11|Keelan||
P.|Hank|11|Keelan||
M.|Geonathan|10|Keelan||
M.|Charlie|11|Keelan||
Z.|Philip|10|Keelan||
J.|Sam|11|Santino||
S.|Brendan|10|Santino||
S.|Lucas|11|Santino||
B.|Charles|10|Santino||
H.|James|11|Santino||
F.|Liam|12|Santino||
A.|Adriel|11|Santino||
C.|Jackson|12|Santino||
M.|Henry|12|Conroy||
R.|Benny|11|Conroy||
M.|Connor|10|Conroy||
F.|Brian|10|Conroy||
H.|JP|11|Conroy||
N.|Connor|11|Conroy||
Korabik|Chris||Coach||
Cooke|David||Coach||
Harris|Aaron||Coach||
Sacco|Tony||Coach||
Morrison|Heraldo||Coach||
B.|Logan|9|TBD||
B.|Luca|9|TBD||
E.|Matthew|9|TBD||
F.|Jonathan|9|TBD||
G.|Joshua|9|TBD||
H.|Clayton|9|TBD||
H.|Theodoros|9|TBD||
H.|Gavin|9|TBD||
L.|Xavier|9|TBD||
M.|Charles|9|TBD||
O.|Jacob|9|TBD||
P.|John|10|TBD||
R.|Julian|9|TBD||
S.|Jonathan|9|TBD||
T.|Nathan|9|TBD||
W.|Robert|9|TBD||
Z.|Andrew|9|TBD||
`;

const groupOrder = ["O'Hara", "Patton", "Keelan", "Santino", "Conroy", "TBD", "Coach"];

function parseRoster(text) {
  return text
    .trim()
    .split("\n")
    .map((line) => {
      const [lastName, firstName, grade, group, uniformTop, uniformBottom] = line.split("|");
      return { lastName, firstName, grade, group, uniformTop, uniformBottom };
    });
}

function displayValue(value) {
  return value?.trim() || "—";
}

function createCell(tag, value, scope) {
  const cell = document.createElement(tag);
  if (scope) cell.scope = scope;
  cell.textContent = displayValue(value);
  return cell;
}

function createGroupSection(group, members) {
  const section = document.createElement("section");
  section.className = `roster-group${group === "Coach" ? " coach-group" : ""}`;

  const heading = document.createElement("div");
  heading.className = "roster-group-heading";
  const title = document.createElement("h3");
  title.textContent = group === "TBD" ? "Group TBD" : group;
  const count = document.createElement("span");
  count.textContent = `${members.length} ${group === "Coach" ? "coaches" : "athletes"}`;
  heading.append(title, count);

  const wrapper = document.createElement("div");
  wrapper.className = "roster-table-wrap";
  const table = document.createElement("table");
  table.innerHTML = "<thead><tr><th>Last</th><th>First</th><th>Grade</th><th>Group</th><th>Uniform Top</th><th>Uniform Bottom</th></tr></thead>";
  const body = document.createElement("tbody");

  members.forEach((member) => {
    const row = document.createElement("tr");
    row.append(
      createCell("td", member.lastName),
      createCell("th", member.firstName, "row"),
      createCell("td", member.grade),
      createCell("td", member.group),
      createCell("td", member.uniformTop),
      createCell("td", member.uniformBottom),
    );
    body.append(row);
  });

  table.append(body);
  wrapper.append(table);
  section.append(heading, wrapper);
  return section;
}

const roster = parseRoster(rosterData);
const container = document.querySelector("#roster-groups");
const fragment = document.createDocumentFragment();

groupOrder.forEach((group) => {
  const members = roster.filter((person) => person.group === group);
  if (members.length) fragment.append(createGroupSection(group, members));
});

container.append(fragment);
document.querySelector("#athlete-count").textContent = roster.filter((person) => person.group !== "Coach").length;
document.querySelector("#coach-count").textContent = roster.filter((person) => person.group === "Coach").length;
