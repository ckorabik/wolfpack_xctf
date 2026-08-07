const form = document.querySelector("#workout-log-form");
const weekInput = document.querySelector("#workout-week");
const weekRange = document.querySelector("#workout-week-range");
const daysContainer = document.querySelector("#weekly-workout-days");
const clearButton = document.querySelector("#clear-workout-draft");
const saveButton = form.querySelector("button[type='submit']");
const saveStatus = document.querySelector("#workout-save-status");
const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const supplementalOptions = [
  "Mini Band Work",
  "Core Day 1",
  "Matthew Core",
  "Pick-7 Core",
  "Stretch routine",
  "Dynamic Drills",
  "4x Strides",
  "Gambetta Leg Circuit",
  "Myrtle Hip Routine",
  "Ankle Circuit",
  "Weight Room",
];
let loadSequence = 0;

function localDateValue(date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function parseLocalDate(value) {
  return new Date(`${value}T12:00:00`);
}

function mondayFor(date) {
  const monday = new Date(date);
  const day = monday.getDay();
  monday.setDate(monday.getDate() - (day === 0 ? 6 : day - 1));
  return monday;
}

function formatDate(date) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date);
}

function checklistMarkup(dayKey) {
  return `<fieldset class="daily-supplement-checklist">
    <legend>Supplemental work</legend>
    <p>Select every routine to include in this day's supplemental section.</p>
    ${supplementalOptions.map((option) => `<div class="checklist-row">
      <label><input type="checkbox" name="${dayKey}-supplemental-item" value="${option}" /><span>${option}</span></label>
    </div>`).join("")}
  </fieldset>`;
}

function renderWeek() {
  saveStatus.textContent = "";
  const monday = parseLocalDate(weekInput.value);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  weekRange.textContent = `${formatDate(monday)} – ${formatDate(sunday)}`;
  daysContainer.innerHTML = dayNames.map((dayName, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    const dayKey = dayName.toLowerCase();
    return `<fieldset class="weekly-workout-day" data-day="${dayKey}">
      <legend><span>${dayName}</span><time datetime="${localDateValue(date)}">${formatDate(date)}</time></legend>
      <div class="field"><label for="${dayKey}-focus">Session focus</label><input id="${dayKey}-focus" name="${dayKey}-focus" type="text" maxlength="200" placeholder="Easy run, intervals, race, recovery…" /></div>
      <div class="daily-workout-layout">
        <div class="field"><label for="${dayKey}-workout">Workout</label><textarea id="${dayKey}-workout" name="${dayKey}-workout" rows="5" maxlength="4000" placeholder="Main set, pace, recovery, volume, group modifications…"></textarea></div>
        ${checklistMarkup(dayKey)}
      </div>
    </fieldset>`;
  }).join("");
}

function coachApi() {
  if (window.WOLFPACK_AUTH?.coach) return Promise.resolve(window.WOLFPACK_AUTH);
  return new Promise((resolve) => {
    document.addEventListener("wolfpack-coach-ready", () => resolve(window.WOLFPACK_AUTH), { once: true });
  });
}

function sessionValue(dayKey, field) {
  return String(form.elements.namedItem(`${dayKey}-${field}`)?.value || "").trim();
}

function selectedSupplementalItems(dayKey) {
  return [...form.querySelectorAll(`input[name="${dayKey}-supplemental-item"]:checked`)].map((input) => input.value);
}

function collectPlan() {
  return {
    weekStart: weekInput.value,
    sessions: dayNames.map((dayName) => {
      const day = dayName.toLowerCase();
      return {
        day,
        focus: sessionValue(day, "focus"),
        workout: sessionValue(day, "workout"),
        supplementalItems: selectedSupplementalItems(day),
      };
    }),
  };
}

function populatePlan(sessions) {
  if (!Array.isArray(sessions)) return;
  sessions.forEach((session) => {
    const day = String(session.day || "").toLowerCase();
    ["focus", "workout"].forEach((fieldName) => {
      const field = form.elements.namedItem(`${day}-${fieldName}`);
      if (field) field.value = session[fieldName] || "";
    });
    const selected = new Set([
      ...(Array.isArray(session.supplementalItems) ? session.supplementalItems : []),
      ...(Array.isArray(session.preRun) ? session.preRun : []),
      ...(Array.isArray(session.postRun) ? session.postRun : []),
    ]);
    form.querySelectorAll(`input[name="${day}-supplemental-item"]`).forEach((input) => {
      input.checked = selected.has(input.value);
    });
  });
}

async function loadPlan() {
  const sequence = ++loadSequence;
  saveStatus.textContent = "Loading this week from Firebase…";
  saveButton.disabled = true;
  clearButton.disabled = true;
  try {
    const api = await coachApi();
    const plan = await api.getWorkoutPlan(weekInput.value);
    if (sequence !== loadSequence) return;
    populatePlan(plan.sessions);
    if (plan.sessions) {
      const updated = plan.updatedAt ? new Date(plan.updatedAt).toLocaleString() : "an earlier session";
      saveStatus.textContent = `Shared plan loaded. Last saved ${updated}${plan.updatedBy ? ` by ${plan.updatedBy}` : ""}.`;
    } else {
      saveStatus.textContent = "No shared plan has been saved for this week yet.";
    }
  } catch (error) {
    if (sequence === loadSequence) saveStatus.textContent = error?.message || "This workout plan could not be loaded.";
  } finally {
    if (sequence === loadSequence) {
      saveButton.disabled = false;
      clearButton.disabled = false;
    }
  }
}

async function selectWeek() {
  weekInput.value = localDateValue(mondayFor(parseLocalDate(weekInput.value)));
  renderWeek();
  await loadPlan();
}

async function savePlan(event) {
  event?.preventDefault();
  saveButton.disabled = true;
  clearButton.disabled = true;
  saveStatus.textContent = "Saving the shared plan to Firebase…";
  try {
    const api = await coachApi();
    await api.saveWorkoutPlan(collectPlan());
    saveStatus.textContent = "Weekly workout plan saved to Firebase for the coaching staff.";
    return true;
  } catch (error) {
    saveStatus.textContent = error?.message || "The workout plan could not be saved.";
    return false;
  } finally {
    saveButton.disabled = false;
    clearButton.disabled = false;
  }
}

async function clearPlan() {
  if (!window.confirm("Clear every workout and checklist selection for this shared week?")) return;
  renderWeek();
  if (await savePlan()) saveStatus.textContent = "The shared workout plan for this week was cleared.";
}

weekInput.value = localDateValue(mondayFor(new Date()));
weekInput.addEventListener("change", selectWeek);
form.addEventListener("submit", savePlan);
clearButton.addEventListener("click", clearPlan);
renderWeek();
loadPlan();
