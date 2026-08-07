const form = document.querySelector("#workout-log-form");
const weekInput = document.querySelector("#workout-week");
const weekRange = document.querySelector("#workout-week-range");
const daysContainer = document.querySelector("#weekly-workout-days");
const clearButton = document.querySelector("#clear-workout-draft");
const saveStatus = document.querySelector("#workout-save-status");
const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const storagePrefix = "wolfpack-workout-week:";

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

function storageKey() {
  return `${storagePrefix}${weekInput.value}`;
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
      <div class="field"><label for="${dayKey}-focus">Session focus</label><input id="${dayKey}-focus" name="${dayKey}-focus" type="text" placeholder="Easy run, intervals, race, recovery…" /></div>
      <div class="workout-prompt-grid">
        <div class="field"><label for="${dayKey}-warmup">Warmup</label><textarea id="${dayKey}-warmup" name="${dayKey}-warmup" rows="4" placeholder="Running, drills, strides, mobility…"></textarea></div>
        <div class="field"><label for="${dayKey}-workout">Workout</label><textarea id="${dayKey}-workout" name="${dayKey}-workout" rows="5" placeholder="Main set, pace, recovery, volume, group modifications…"></textarea></div>
        <div class="field"><label for="${dayKey}-supplemental">Supplemental work</label><textarea id="${dayKey}-supplemental" name="${dayKey}-supplemental" rows="4" placeholder="Strength, core, mobility, cooldown…"></textarea></div>
      </div>
    </fieldset>`;
  }).join("");
  loadDraft();
}

function selectWeek() {
  weekInput.value = localDateValue(mondayFor(parseLocalDate(weekInput.value)));
  renderWeek();
}

function loadDraft() {
  let draft = null;
  try {
    draft = JSON.parse(localStorage.getItem(storageKey()));
  } catch {}
  if (!draft?.sessions) return;
  Object.entries(draft.sessions).forEach(([name, value]) => {
    const field = form.elements.namedItem(name);
    if (field) field.value = value;
  });
  saveStatus.textContent = "Saved draft loaded.";
}

function saveDraft(event) {
  event.preventDefault();
  const sessions = {};
  new FormData(form).forEach((value, name) => {
    if (name !== "weekStart") sessions[name] = String(value).trim();
  });
  try {
    localStorage.setItem(storageKey(), JSON.stringify({ weekStart: weekInput.value, sessions, savedAt: new Date().toISOString() }));
    saveStatus.textContent = "Weekly draft saved on this device.";
  } catch {
    saveStatus.textContent = "This browser could not save the draft.";
  }
}

function clearDraft() {
  if (!window.confirm("Clear every workout entry for this week?")) return;
  localStorage.removeItem(storageKey());
  renderWeek();
  saveStatus.textContent = "Weekly draft cleared.";
}

weekInput.value = localDateValue(mondayFor(new Date()));
weekInput.addEventListener("change", selectWeek);
form.addEventListener("submit", saveDraft);
clearButton.addEventListener("click", clearDraft);
renderWeek();
