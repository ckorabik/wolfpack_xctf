const form = document.querySelector("#mileage-form");
const formHeading = document.querySelector(".form-heading");
const statusBox = document.querySelector("#form-status");
const submitButton = document.querySelector("#submit-button");
const successCard = document.querySelector("#success-card");
const submitAnotherButton = document.querySelector("#submit-another");
const weekEndingInput = document.querySelector("#week-ending");

const fields = {
  athleteName: document.querySelector("#athlete-name"),
  weekEnding: weekEndingInput,
  weeklyMiles: document.querySelector("#weekly-miles"),
  trainingFeel: document.querySelector("#training-feel"),
};

function getMostRecentSunday() {
  const date = new Date();
  date.setDate(date.getDate() - date.getDay());
  return date.toISOString().slice(0, 10);
}

weekEndingInput.value = getMostRecentSunday();
weekEndingInput.max = new Date().toISOString().slice(0, 10);

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

  if (!data.athleteName.trim()) {
    showFieldError("athleteName", "Please enter your name.");
    valid = false;
  }

  if (!data.weekEnding) {
    showFieldError("weekEnding", "Choose the week-ending date.");
    valid = false;
  }

  const miles = Number(data.weeklyMiles);
  if (data.weeklyMiles === "" || Number.isNaN(miles) || miles < 0 || miles > 200) {
    showFieldError("weeklyMiles", "Enter mileage between 0 and 200.");
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
    showStatus(
      "The Google Sheet connection has not been configured yet. Add the Apps Script Web App URL to config.js.",
    );
    return;
  }

  setLoading(true);

  try {
    // text/plain avoids a browser CORS preflight for Google Apps Script.
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
    showStatus(
      `${error.message} Please check your connection and try again. If this continues, contact your coach.`,
    );
  } finally {
    setLoading(false);
  }
});

submitAnotherButton.addEventListener("click", () => {
  form.reset();
  weekEndingInput.value = getMostRecentSunday();
  clearErrors();
  successCard.hidden = true;
  formHeading.hidden = false;
  form.hidden = false;
  fields.athleteName.focus();
});
