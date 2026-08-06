const form = document.querySelector("#mileage-form");
const formHeading = document.querySelector(".form-heading");
const statusBox = document.querySelector("#form-status");
const submitButton = document.querySelector("#submit-button");
const successCard = document.querySelector("#success-card");
const submitAnotherButton = document.querySelector("#submit-another");

const fields = {
  athleteName: document.querySelector("#athlete-name"),
  weekEnding: document.querySelector("#week-ending"),
  weeklyMiles: document.querySelector("#weekly-miles"),
  crossTrainMinutes: document.querySelector("#cross-train-minutes"),
  trainingFeel: document.querySelector("#training-feel"),
};

function toLocalIsoDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getRecentWeeks() {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const daysSinceMonday = today.getDay() === 0 ? 6 : today.getDay() - 1;
  const currentMonday = new Date(today);
  currentMonday.setDate(today.getDate() - daysSinceMonday);

  return Array.from({ length: 4 }, (_, index) => {
    const monday = new Date(currentMonday);
    monday.setDate(currentMonday.getDate() - index * 7);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const startLabel = new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
    }).format(monday);
    const endLabel = new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(sunday);

    return { value: toLocalIsoDate(sunday), label: `${startLabel} – ${endLabel}` };
  });
}

function populateAthletes() {
  const rosterPeople = window.WOLFPACK_ROSTER || [];
  const nameCounts = rosterPeople.reduce((counts, person) => {
    const name = `${person.firstName} ${person.lastName}`;
    counts[name] = (counts[name] || 0) + 1;
    return counts;
  }, {});
  const athletes = rosterPeople
    .map((person) => {
      const name = `${person.firstName} ${person.lastName}`;
      if (person.group === "Coach") return `${name} (Coach)`;
      return nameCounts[name] > 1 ? `${name} (${person.group})` : name;
    })
    .sort((first, second) => first.localeCompare(second));

  athletes.forEach((name) => fields.athleteName.add(new Option(name, name)));
}

function populateWeeks() {
  getRecentWeeks().forEach((week) => fields.weekEnding.add(new Option(week.label, week.value)));
}

function clearErrors() {
  Object.entries(fields).forEach(([name, input]) => {
    input.removeAttribute("aria-invalid");
    document.querySelector(`[data-error-for="${name}"]`).textContent = "";
  });
  statusBox.classList.remove("visible");
  statusBox.textContent = "";
}

function showFieldError(name, message) {
  fields[name].setAttribute("aria-invalid", "true");
  document.querySelector(`[data-error-for="${name}"]`).textContent = message;
}

function validate(data) {
  let valid = true;
  const allowedAthletes = new Set([...fields.athleteName.options].map((option) => option.value).filter(Boolean));
  const allowedWeeks = new Set([...fields.weekEnding.options].map((option) => option.value).filter(Boolean));

  if (!allowedAthletes.has(data.athleteName)) {
    showFieldError("athleteName", "Choose an athlete from the roster.");
    valid = false;
  }

  if (!allowedWeeks.has(data.weekEnding)) {
    showFieldError("weekEnding", "Choose one of the four available training weeks.");
    valid = false;
  }

  const miles = Number(data.weeklyMiles);
  if (data.weeklyMiles === "" || Number.isNaN(miles) || miles < 0 || miles > 200) {
    showFieldError("weeklyMiles", "Enter mileage between 0 and 200.");
    valid = false;
  }

  const crossTrainMinutes = Number(data.crossTrainMinutes);
  if (
    data.crossTrainMinutes === "" ||
    !Number.isInteger(crossTrainMinutes) ||
    crossTrainMinutes < 0 ||
    crossTrainMinutes > 3000
  ) {
    showFieldError("crossTrainMinutes", "Enter whole minutes between 0 and 3,000.");
    valid = false;
  }

  if (!data.trainingFeel) {
    showFieldError("trainingFeel", "Choose how training felt.");
    valid = false;
  }

  return valid;
}

function setLoading(isLoading) {
  submitButton.disabled = isLoading;
  submitButton.querySelector("span").textContent = isLoading
    ? "Submitting..."
    : "Submit weekly mileage";
}

function showStatus(message) {
  statusBox.textContent = message;
  statusBox.classList.add("visible");
}

function showSuccess() {
  form.hidden = true;
  formHeading.hidden = true;
  successCard.hidden = false;
  successCard.focus();
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearErrors();

  const data = Object.fromEntries(new FormData(form).entries());
  if (!validate(data)) {
    fields[Object.keys(fields).find((name) => fields[name].hasAttribute("aria-invalid"))].focus();
    return;
  }

  const endpoint = window.WOLFPACK_CONFIG?.googleScriptUrl?.trim();
  if (!endpoint) {
    showStatus("The Google Sheet connection has not been configured yet. Add the Apps Script Web App URL to config.js.");
    return;
  }

  setLoading(true);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(data),
    });

    const result = await response.json();
    if (!response.ok || result.status !== "success") {
      throw new Error(result.message || "The submission could not be saved.");
    }

    showSuccess();
  } catch (error) {
    showStatus(`${error.message} Please check your connection and try again. If this continues, contact your coach.`);
  } finally {
    setLoading(false);
  }
});

submitAnotherButton.addEventListener("click", () => {
  form.reset();
  clearErrors();
  successCard.hidden = true;
  formHeading.hidden = false;
  form.hidden = false;
  fields.athleteName.focus();
});

populateAthletes();
populateWeeks();
