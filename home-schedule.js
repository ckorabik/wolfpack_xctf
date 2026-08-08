const upcomingEventsList = document.querySelector("#upcoming-events-list");
const upcomingEventsStatus = document.querySelector("#upcoming-events-status");

function startOfToday() {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), today.getDate());
}

function parseLocalDate(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function eventMarkup(event) {
  const month = new Intl.DateTimeFormat("en-US", { month: "short" }).format(event.date);
  const details = event.details
    ? `<p class="upcoming-event-details">${event.details}</p>`
    : "";

  return `
    <li>
      <div class="date-block"><strong>${event.date.getDate()}</strong><span>${month}</span></div>
      <div class="upcoming-event-copy"><h2 class="upcoming-event-title">${event.title}</h2>${details}</div>
    </li>
  `;
}

async function loadUpcomingEvents() {
  if (!upcomingEventsList) return;

  try {
    const response = await fetch(`schedule.html?v=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) throw new Error("Schedule unavailable");

    const scheduleDocument = new DOMParser().parseFromString(await response.text(), "text/html");
    const events = [...scheduleDocument.querySelectorAll(".schedule-item, .other-events-grid article")]
      .map((item) => {
        const time = item.querySelector("time[datetime]");
        if (!time) return null;

        return {
          date: parseLocalDate(time.dateTime),
          title: item.querySelector("h3")?.textContent.trim() || "Team event",
          details: item.querySelector("p")?.textContent.trim() || "",
        };
      })
      .filter((event) => event && event.date >= startOfToday())
      .sort((a, b) => a.date - b.date)
      .slice(0, 4);

    if (!events.length) {
      upcomingEventsStatus.textContent = "No more dated events are currently listed for this season.";
      return;
    }

    upcomingEventsList.innerHTML = events.map(eventMarkup).join("");
    upcomingEventsList.hidden = false;
    upcomingEventsStatus.hidden = true;
  } catch (error) {
    upcomingEventsStatus.innerHTML = 'Upcoming events could not be loaded. <a href="schedule.html">View the full season schedule.</a>';
  }
}

loadUpcomingEvents();
