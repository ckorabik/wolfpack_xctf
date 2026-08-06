const attendanceForm = document.querySelector("#attendance-form");
const attendanceEventSelect = document.querySelector("#attendance-event");
const attendanceDateInput = document.querySelector("#attendance-date");
const attendanceGroupFilter = document.querySelector("#attendance-group-filter");
const attendanceGradeFilter = document.querySelector("#attendance-grade-filter");
const attendanceRosterElement = document.querySelector("#attendance-roster");
const attendanceProgress = document.querySelector("#attendance-progress");
const attendanceStatus = document.querySelector("#attendance-status");
const attendanceSubmit = document.querySelector("#attendance-submit");
const attendanceSuccess = document.querySelector("#attendance-success");
const attendanceAnother = document.querySelector("#attendance-another");

const attendanceSelections = new Map();
const attendanceAthletes = (window.WOLFPACK_ROSTER || [])
  .filter((person) => person.group !== "Coach")
  .map((person) => ({
    ...person,
    displayName: `${person.firstName} ${person.lastName}`,
    athleteKey: `${person.group}|${person.firstName} ${person.lastName}`,
  }));

function attendanceStartOfToday() {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), today.getDate());
}

function parseAttendanceDate(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function populateAttendanceFilters() {
  [...new Set(attendanceAthletes.map((person) => person.group))]
    .sort()
    .forEach((group) => attendanceGroupFilter.add(new Option(group === "TBD" ? "Group TBD" : group, group)));
  [...new Set(attendanceAthletes.map((person) => person.grade))]
    .sort((first, second) => Number(first) - Number(second))
    .forEach((grade) => attendanceGradeFilter.add(new Option(`Grade ${grade}`, grade)));
}

async function populateAttendanceEvents() {
  try {
    const response = await fetch(`schedule.html?v=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) throw new Error("Schedule unavailable");
    const scheduleDocument = new DOMParser().parseFromString(await response.text(), "text/html");
    const events = [...scheduleDocument.querySelectorAll(".schedule-item, .other-events-grid article")]
      .map((item) => {
        const time = item.querySelector("time[datetime]");
        if (!time) return null;
        return {
          date: parseAttendanceDate(time.dateTime),
          dateValue: time.dateTime,
          title: item.querySelector("h3")?.textContent.trim() || "Team event",
        };
      })
      .filter((event) => event && event.date >= attendanceStartOfToday())
      .sort((first, second) => first.date - second.date);

    attendanceEventSelect.innerHTML = '<option value="">Choose an upcoming event</option>';
    const formatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });
    events.forEach((event) => {
      const value = `${event.dateValue} | ${event.title}`;
      attendanceEventSelect.add(new Option(`${formatter.format(event.date)} — ${event.title}`, value));
    });
    attendanceEventSelect.disabled = false;
  } catch (error) {
    attendanceEventSelect.innerHTML = '<option value="">Upcoming events unavailable</option>';
    attendanceEventSelect.disabled = false;
    showAttendanceStatus("The schedule could not be loaded. Enter the attendance date manually.");
  }
}

function renderAttendanceRoster() {
  const selectedGroup = attendanceGroupFilter.value;
  const selectedGrade = attendanceGradeFilter.value;
  const visibleAthletes = attendanceAthletes.filter(
    (person) => (!selectedGroup || person.group === selectedGroup) && (!selectedGrade || person.grade === selectedGrade),
  );

  attendanceRosterElement.innerHTML = "";
  const fragment = document.createDocumentFragment();
  visibleAthletes.forEach((person) => {
    const row = document.createElement("article");
    row.className = "attendance-athlete";
    row.dataset.athleteKey = person.athleteKey;
    const selection = attendanceSelections.get(person.athleteKey) || "";
    row.innerHTML = `
      <div class="attendance-athlete-info"><strong>${person.displayName}</strong><span>Grade ${person.grade} · ${person.group === "TBD" ? "Group TBD" : person.group}</span></div>
      <div class="attendance-choice" role="group" aria-label="Attendance for ${person.displayName}">
        <button type="button" class="present${selection === "Present" ? " selected" : ""}" data-status="Present" aria-pressed="${selection === "Present"}">Present</button>
        <button type="button" class="absent${selection === "Absent" ? " selected" : ""}" data-status="Absent" aria-pressed="${selection === "Absent"}">Absent</button>
      </div>`;
    fragment.append(row);
  });
  attendanceRosterElement.append(fragment);
}

function updateAttendanceProgress() {
  const count = attendanceSelections.size;
  attendanceProgress.textContent = `${count} athlete${count === 1 ? "" : "s"} marked`;
}

function showAttendanceStatus(message) {
  attendanceStatus.textContent = message;
  attendanceStatus.classList.add("visible");
}

attendanceRosterElement.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-status]");
  if (!button) return;
  const row = button.closest(".attendance-athlete");
  attendanceSelections.set(row.dataset.athleteKey, button.dataset.status);
  row.querySelectorAll("button[data-status]").forEach((choice) => {
    const selected = choice === button;
    choice.classList.toggle("selected", selected);
    choice.setAttribute("aria-pressed", String(selected));
  });
  updateAttendanceProgress();
});

[attendanceGroupFilter, attendanceGradeFilter].forEach((filter) => filter.addEventListener("change", renderAttendanceRoster));

attendanceForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  attendanceStatus.classList.remove("visible");
  const selectedEvent = attendanceEventSelect.value;
  const selectedDate = attendanceDateInput.value;
  const eventLabel = selectedEvent || selectedDate;

  if (!eventLabel) {
    showAttendanceStatus("Choose an upcoming event or enter a date.");
    attendanceEventSelect.focus();
    return;
  }
  if (!attendanceSelections.size) {
    showAttendanceStatus("Mark at least one athlete Present or Absent.");
    return;
  }

  if (!window.WOLFPACK_AUTH?.recordAttendance) {
    showAttendanceStatus("Coach authentication is still loading. Wait a moment and try again.");
    return;
  }

  attendanceSubmit.disabled = true;
  attendanceSubmit.querySelector("span").textContent = "Recording...";
  try {
    const result = await window.WOLFPACK_AUTH.recordAttendance({
      event: eventLabel,
      records: [...attendanceSelections].map(([athleteKey, status]) => ({ athleteKey, status })),
    });
    if (!result?.updated) throw new Error("Attendance could not be saved.");
    attendanceForm.hidden = true;
    attendanceSuccess.hidden = false;
    attendanceSuccess.focus();
  } catch (error) {
    showAttendanceStatus(`${error.message} Please check your connection and try again.`);
  } finally {
    attendanceSubmit.disabled = false;
    attendanceSubmit.querySelector("span").textContent = "Record attendance";
  }
});

attendanceAnother.addEventListener("click", () => {
  attendanceSelections.clear();
  updateAttendanceProgress();
  renderAttendanceRoster();
  attendanceSuccess.hidden = true;
  attendanceForm.hidden = false;
  attendanceEventSelect.focus();
});

populateAttendanceFilters();
renderAttendanceRoster();
populateAttendanceEvents();
