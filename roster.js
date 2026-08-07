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
Morrison|Heraldo||Coach||
Cooke|David||Coach||
Harris|Aaron||Coach||
Sacco|Tony||Coach||
B.|Luca|9|TBD||
E.|Matthew|9|TBD||
F.|Jonathan|9|TBD||
G.|Joshua|9|TBD||
H.|Clayton|9|TBD||
H.|Theodoros|9|TBD||
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
const groupMileageGoals = {
  Conroy: "25-30",
  Keelan: "25-30",
  Santino: "25-30",
  TBD: "TBD",
};
const weeklyGoalOverrides = {
  "O'Hara|Alrik S.": "40-45",
  "O'Hara|Brendan H.": "40-45",
  "O'Hara|Charlie M.": "50-55",
  "O'Hara|Michael G.": "45-50",
  "O'Hara|Joseph H.": "40-45",
  "O'Hara|John H.": "30-35",
  "O'Hara|Edward L.": "45-50",
  "O'Hara|Devlin B.": "40-45",
  "Patton|Edward M.": "25-30",
  "Patton|Julien D.": "TBD",
  "Patton|Clark H.": "TBD",
  "Patton|Samuel J.": "25-30",
  "Patton|Jameson M.": "TBD",
  "Patton|Joseph R.": "TBD",
  "Patton|Jack S.": "TBD",
  "Patton|Ari T.": "TBD",
  "Patton|Dylan W.": "TBD",
  "Patton|Zachary H.": "25-30",
  "Patton|Beau C.": "25-30",
  "Patton|Nathan B.": "30-35",
  "Patton|William D.": "40-45",
  "Patton|Nicholas S.": "TBD",
};

function parseRoster(text) {
  return text
    .trim()
    .split("\n")
    .map((line) => {
      const [lastName, firstName, grade, group, uniformTop, uniformBottom] = line.split("|");
      const displayName = `${firstName} ${lastName}`;
      return {
        lastName,
        firstName,
        grade,
        group,
        weeklyMileageGoal:
          weeklyGoalOverrides[`${group}|${displayName}`] || groupMileageGoals[group] || "",
        uniformTop,
        uniformBottom,
      };
    });
}

function displayValue(value) {
  return value?.trim() || "—";
}

function createCell(tag, value, scope, label) {
  const cell = document.createElement(tag);
  if (scope) cell.scope = scope;
  if (label) cell.dataset.label = label;
  cell.textContent = displayValue(value);
  return cell;
}

function createGroupSection(group, members) {
  const section = document.createElement("section");
  section.className = `roster-group${group === "Coach" ? " coach-group" : ""}`;

  const heading = document.createElement("div");
  heading.className = "roster-group-heading";
  const title = document.createElement("h3");
  title.textContent = group === "TBD" ? "Group TBD" : group === "Coach" ? "Coaches" : group;
  const count = document.createElement("span");
  count.textContent = `${members.length} ${group === "Coach" ? "coaches" : "athletes"}`;
  heading.append(title, count);

  const wrapper = document.createElement("div");
  wrapper.className = "roster-table-wrap";
  const table = document.createElement("table");
  const body = document.createElement("tbody");

  if (group === "Coach") {
    table.className = "coaches-table";
    table.innerHTML = "<thead><tr><th>Name</th><th>Role</th></tr></thead>";
    const coachRoles = {
      "Chris Korabik": "Head Cross Country Coach",
      "Heraldo Morrison": "Head Track & Field Coach",
    };

    const coachOrder = ["Chris Korabik", "Heraldo Morrison", "David Cooke", "Aaron Harris", "Tony Sacco"];
    members.sort(
      (first, second) =>
        coachOrder.indexOf(`${first.firstName} ${first.lastName}`) -
        coachOrder.indexOf(`${second.firstName} ${second.lastName}`),
    );

    members.forEach((member) => {
      const fullName = `${member.firstName} ${member.lastName}`;
      const row = document.createElement("tr");
      row.append(
        createCell("th", fullName, "row", "Name"),
        createCell("td", coachRoles[fullName] || "Assistant Coach", undefined, "Role"),
      );
      body.append(row);
    });
  } else {
    table.innerHTML = "<thead><tr><th>Name</th><th>Grade</th><th>Weekly Mileage Goal</th><th>Issued Uniform Top</th><th>Issued Uniform Bottom</th></tr></thead>";

    members.forEach((member) => {
      const displayName = `${member.firstName} ${member.lastName}`;
      const row = document.createElement("tr");
      row.append(
        createCell("th", displayName, "row", "Name"),
        createCell("td", member.grade, undefined, "Grade"),
        createCell("td", member.weeklyMileageGoal, undefined, "Mileage goal"),
        createCell("td", member.uniformTop, undefined, "Uniform top"),
        createCell("td", member.uniformBottom, undefined, "Uniform bottom"),
      );
      body.append(row);
    });
  }

  table.append(body);
  wrapper.append(table);
  section.append(heading, wrapper);
  return section;
}

const roster = parseRoster(rosterData);
window.WOLFPACK_ROSTER = roster;
const container = document.querySelector("#roster-groups");

if (container) {
  const fragment = document.createDocumentFragment();

  groupOrder.forEach((group) => {
    const members = roster.filter((person) => person.group === group);
    if (members.length) fragment.append(createGroupSection(group, members));
  });

  container.append(fragment);
  document.querySelector("#athlete-count").textContent = roster.filter((person) => person.group !== "Coach").length;
  document.querySelector("#coach-count").textContent = roster.filter((person) => person.group === "Coach").length;
}
