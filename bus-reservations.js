const busForm = document.querySelector("#bus-reservation-form");
const busFormHeading = document.querySelector(".form-heading");
const busStatusBox = document.querySelector("#bus-form-status");
const busSubmitButton = document.querySelector("#bus-submit-button");
const busSuccessCard = document.querySelector("#bus-success-card");
const busSubmitAnotherButton = document.querySelector("#bus-submit-another");

const busFields = {
  riderName: document.querySelector("#rider-name"),
  event: document.querySelector("#bus-event"),
  takingBus: document.querySelector("#taking-bus"),
};

function busStartOfToday() {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), today.getDate());
}

function parseBusEventDate(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function populateRiders() {
  const people = window.WOLFPACK_ROSTER || [];
  const nameCounts = people.reduce((counts, person) => {
    const name = `${person.firstName} ${person.lastName}`;
    counts[name] = (counts[name] || 0) + 1;
    return counts;
  }, {});

  people
    .map((person) => {
      const name = `${person.firstName} ${person.lastName}`;
      if (person.group === "Coach") return `${name} (Coach)`;
      return nameCounts[name] > 1 ? `${name} (${person.group})` : name;
    })
    .sort((first, second) => first.localeCompare(second))
    .forEach((name) => busFields.riderName.add(new Option(name, name)));
}

async function populateBusEvents() {
  try {
    const response = await fetch(`schedule.html?v=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) throw new Error("Schedule unavailable");

    const scheduleDocument = new DOMParser().parseFromString(await response.text(), "text/html");
    const events = [...scheduleDocument.querySelectorAll(".schedule-item")]
      .map((item) => {
        const time = item.querySelector("time[datetime]");
        if (!time) return null;
        return {
          date: parseBusEventDate(time.dateTime),
          dateValue: time.dateTime,
          title: item.querySelector("h3")?.textContent.trim() || "Team event",
        };
      })
      .filter((event) => event && event.date >= busStartOfToday())
      .sort((first, second) => first.date - second.date)
      .slice(0, 5);

    busFields.event.innerHTML = '<option value="">Choose an upcoming event</option>';
    const formatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });
    events.forEach((event) => {
      const value = `${event.dateValue} | ${event.title}`;
      busFields.event.add(new Option(`${formatter.format(event.date)} — ${event.title}`, value));
    });
    busFields.event.disabled = events.length === 0;

    if (!events.length) showBusStatus("No upcoming dated meets are currently listed.");
  } catch (error) {
    busFields.event.innerHTML = '<option value="">Upcoming events unavailable</option>';
    showBusStatus("The meet schedule could not be loaded. Try refreshing the page.");
  }
}

function clearBusErrors() {
  Object.entries(busFields).forEach(([name, input]) => {
    input.removeAttribute("aria-invalid");
    document.querySelector(`[data-error-for="${name}"]`).textContent = "";
  });
  busStatusBox.classList.remove("visible");
  busStatusBox.textContent = "";
}

function showBusFieldError(name, message) {
  busFields[name].setAttribute("aria-invalid", "true");
  document.querySelector(`[data-error-for="${name}"]`).textContent = message;
}

function validateBusResponse(data) {
  let valid = true;
  const allowedRiders = new Set([...busFields.riderName.options].map((option) => option.value).filter(Boolean));
  const allowedEvents = new Set([...busFields.event.options].map((option) => option.value).filter(Boolean));

  if (!allowedRiders.has(data.riderName)) {
    showBusFieldError("riderName", "Choose a person from the roster.");
    valid = false;
  }
  if (!allowedEvents.has(data.event)) {
    showBusFieldError("event", "Choose one of the five upcoming events.");
    valid = false;
  }
  if (!["Yes", "No"].includes(data.takingBus)) {
    showBusFieldError("takingBus", "Choose yes or no.");
    valid = false;
  }
  return valid;
}

function setBusLoading(isLoading) {
  busSubmitButton.disabled = isLoading;
  busSubmitButton.querySelector("span").textContent = isLoading ? "Submitting..." : "Submit bus response";
}

function showBusStatus(message) {
  busStatusBox.textContent = message;
  busStatusBox.classList.add("visible");
}

busForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearBusErrors();
  const data = Object.fromEntries(new FormData(busForm).entries());

  if (!validateBusResponse(data)) {
    busFields[Object.keys(busFields).find((name) => busFields[name].hasAttribute("aria-invalid"))].focus();
    return;
  }

  const endpoint = window.WOLFPACK_CONFIG?.googleScriptUrl?.trim();
  if (!endpoint) {
    showBusStatus("The Google Sheet connection has not been configured.");
    return;
  }

  setBusLoading(true);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ ...data, submissionType: "busReservation" }),
    });
    const result = await response.json();
    if (!response.ok || result.status !== "success") {
      throw new Error(result.message || "The response could not be saved.");
    }

    busForm.hidden = true;
    busFormHeading.hidden = true;
    busSuccessCard.hidden = false;
    busSuccessCard.focus();
  } catch (error) {
    showBusStatus(`${error.message} Please check your connection and try again.`);
  } finally {
    setBusLoading(false);
  }
});

busSubmitAnotherButton.addEventListener("click", () => {
  busForm.reset();
  clearBusErrors();
  busSuccessCard.hidden = true;
  busFormHeading.hidden = false;
  busForm.hidden = false;
  busFields.riderName.focus();
});

populateRiders();
populateBusEvents();
