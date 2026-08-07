const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const weekHeading = document.querySelector("#athlete-workout-week");
const updatedLabel = document.querySelector("#athlete-workout-updated");
const statusLabel = document.querySelector("#athlete-workout-status");
const daysContainer = document.querySelector("#athlete-workout-days");

function parseLocalDate(value) {
  const [year, month, day] = String(value || "").split("-").map(Number);
  return year && month && day ? new Date(year, month - 1, day) : null;
}

function addDays(date, amount) {
  const result = new Date(date);
  result.setDate(result.getDate() + amount);
  return result;
}

function sameCalendarDay(left, right) {
  return left.getFullYear() === right.getFullYear()
    && left.getMonth() === right.getMonth()
    && left.getDate() === right.getDate();
}

function formatWeek(start) {
  const end = addDays(start, 6);
  const startText = start.toLocaleDateString("en-US", { month: "long", day: "numeric" });
  const endText = end.toLocaleDateString("en-US", {
    month: start.getMonth() === end.getMonth() ? undefined : "long",
    day: "numeric",
    year: "numeric",
  });
  return `${startText} – ${endText}`;
}

function supplementalItems(session) {
  return [...new Set([
    ...(Array.isArray(session?.supplementalItems) ? session.supplementalItems : []),
    ...(Array.isArray(session?.preRun) ? session.preRun : []),
    ...(Array.isArray(session?.postRun) ? session.postRun : []),
  ].map((item) => String(item).trim()).filter(Boolean))];
}

function makeText(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  element.textContent = text;
  return element;
}

function renderDay(session, date, index) {
  const card = document.createElement("article");
  card.className = "athlete-workout-day";
  if (sameCalendarDay(date, new Date())) card.classList.add("is-today");

  const heading = document.createElement("header");
  heading.append(makeText("p", "athlete-workout-day-name", DAYS[index]));
  heading.append(makeText("time", "athlete-workout-date", date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })));
  card.append(heading);

  const focus = String(session?.focus || "").trim();
  if (focus) card.append(makeText("h3", "athlete-workout-focus", focus));

  const workout = String(session?.workout || "").trim();
  card.append(makeText("p", `athlete-workout-details${workout ? "" : " is-empty"}`, workout || "No workout details posted."));

  const items = supplementalItems(session);
  if (items.length) {
    const supplemental = document.createElement("div");
    supplemental.className = "athlete-workout-supplemental";
    supplemental.append(makeText("p", "", "Supplemental work"));
    const list = document.createElement("ul");
    items.forEach((item) => list.append(makeText("li", "", item)));
    supplemental.append(list);
    card.append(supplemental);
  }
  return card;
}

function renderPlan(plan) {
  const start = parseLocalDate(plan?.weekStart);
  if (!start) throw new Error("The latest workout plan does not have a valid week date.");

  weekHeading.textContent = formatWeek(start);
  if (plan.updatedAt) {
    const updated = new Date(plan.updatedAt);
    if (!Number.isNaN(updated.getTime())) {
      updatedLabel.textContent = `Last updated ${updated.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}`;
    }
  }
  statusLabel.hidden = true;
  daysContainer.replaceChildren(...DAYS.map((day, index) => {
    const session = (plan.sessions || []).find((entry) => String(entry?.day || "").toLowerCase() === day.toLowerCase())
      || plan.sessions?.[index]
      || {};
    return renderDay(session, addDays(start, index), index);
  }));
}

function waitForSiteAccess() {
  if (window.WOLFPACK_AUTH && (document.body.classList.contains("site-standard") || document.body.classList.contains("site-coach"))) {
    return Promise.resolve(window.WOLFPACK_AUTH);
  }
  return new Promise((resolve) => {
    document.addEventListener("wolfpack-site-ready", () => resolve(window.WOLFPACK_AUTH), { once: true });
  });
}

async function loadLatestPlan() {
  try {
    const api = await waitForSiteAccess();
    const { plan } = await api.getLatestWorkoutPlan();
    if (!plan) {
      weekHeading.textContent = "No workout plan published yet";
      statusLabel.textContent = "The coaching staff has not uploaded a weekly plan yet.";
      return;
    }
    renderPlan(plan);
  } catch (error) {
    weekHeading.textContent = "Workout plan unavailable";
    statusLabel.textContent = error?.message || "The latest workout plan could not be loaded. Please try again.";
  }
}

loadLatestPlan();
