"""Generate the public schedule and roster snapshots from Google Sheets."""

from __future__ import annotations

import html
import json
import os
import re
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Iterable

from google.oauth2 import service_account
from googleapiclient.discovery import build


ROOT = Path(__file__).resolve().parents[1]
SCOPES = ["https://www.googleapis.com/auth/spreadsheets.readonly"]
SCHEDULE_TABS = ("Meets", "Other Events")
ROSTER_TAB = "Full Team Roster"
PACE_TAB = "Pace Table"
RECORDS_TAB = "Peoria Top 50"
HISTORY_TAB = "Team Timeline"
MILEAGE_TAB = "Mileage Log"
BUS_TAB = "Sheet1"


def google_sheets_service():
    raw_credentials = os.environ.get("GOOGLE_SERVICE_ACCOUNT_JSON", "").strip()
    if not raw_credentials:
        raise RuntimeError(
            "GOOGLE_SERVICE_ACCOUNT_JSON is missing. Add the service-account JSON "
            "as a GitHub Actions repository secret."
        )
    try:
        credentials_info = json.loads(raw_credentials)
    except json.JSONDecodeError as error:
        raise RuntimeError("GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON.") from error
    credentials = service_account.Credentials.from_service_account_info(
        credentials_info, scopes=SCOPES
    )
    return build("sheets", "v4", credentials=credentials, cache_discovery=False)


def read_tab(
    service, spreadsheet_id: str, tab_name: str, *, formatted: bool = False
) -> list[list[object]]:
    result = (
        service.spreadsheets()
        .values()
        .get(
            spreadsheetId=spreadsheet_id,
            range=f"'{tab_name}'!A1:Z1000",
            valueRenderOption="FORMATTED_VALUE" if formatted else "UNFORMATTED_VALUE",
            dateTimeRenderOption="SERIAL_NUMBER",
        )
        .execute()
    )
    return result.get("values", [])


def normalized(value: object) -> str:
    return re.sub(r"[^a-z0-9]+", " ", str(value or "").lower()).strip()


def find_table(rows: list[list[object]], expected: Iterable[str]) -> tuple[list[str], list[list[object]]]:
    expected_words = tuple(expected)
    best_index = -1
    best_score = 0
    for index, row in enumerate(rows[:25]):
        headers = [normalized(value) for value in row]
        score = sum(any(word in header for header in headers) for word in expected_words)
        if score > best_score:
            best_index, best_score = index, score
    if best_index < 0 or best_score < 2:
        raise RuntimeError(f"Could not identify a header row containing {', '.join(expected_words)}.")
    headers = [normalized(value) for value in rows[best_index]]
    width = len(headers)
    data = [row + [""] * (width - len(row)) for row in rows[best_index + 1 :] if any(row)]
    return headers, data


def cell(headers: list[str], row: list[object], *aliases: str) -> object:
    for alias in aliases:
        alias = normalized(alias)
        for index, header in enumerate(headers):
            if header == alias or alias in header:
                return row[index] if index < len(row) else ""
    return ""


def text(value: object) -> str:
    if isinstance(value, float) and value.is_integer():
        return str(int(value))
    return str(value or "").strip()


def iso_date(value: object) -> str:
    if isinstance(value, (int, float)):
        return (date(1899, 12, 30) + timedelta(days=int(value))).isoformat()
    raw = text(value)
    if not raw:
        return ""
    for pattern in ("%Y-%m-%d", "%m/%d/%Y", "%m/%d/%y", "%b %d, %Y", "%B %d, %Y"):
        try:
            return datetime.strptime(raw, pattern).date().isoformat()
        except ValueError:
            pass
    return ""


def escape(value: object) -> str:
    return html.escape(text(value), quote=True)


def event_class(name: str, category: str) -> str:
    haystack = f"{name} {category}".lower()
    classes = ["schedule-item"]
    if "first day" in haystack or "season start" in haystack:
        classes.append("season-start")
    if "championship" in haystack or " ccl" in f" {haystack}":
        classes.append("championship")
    if any(word in haystack for word in ("regional", "sectional", "state meet", "postseason")):
        classes.append("postseason")
    return " ".join(classes)


def render_meets(rows: list[list[object]]) -> str:
    headers, data = find_table(rows, ("date", "event", "meet", "location"))
    output = []
    for row in data:
        event_date = iso_date(cell(headers, row, "date"))
        name = text(cell(headers, row, "event", "meet", "name"))
        if not event_date or not name:
            continue
        parsed = date.fromisoformat(event_date)
        level = text(cell(headers, row, "level", "group", "participants")) or "All"
        location = text(cell(headers, row, "location", "site", "venue"))
        details = text(cell(headers, row, "details", "notes", "description"))
        description = details or location
        category = text(cell(headers, row, "type", "category"))
        paragraph = f"<p>{escape(description)}</p>" if description else ""
        output.append(
            f'          <article class="{event_class(name, category)}">'
            f'<time datetime="{event_date}"><strong>{parsed.day:02d}</strong>'
            f'<span>{parsed.strftime("%b")}</span></time><div>'
            f'<span class="level-badge">{escape(level)}</span><h3>{escape(name)}</h3>'
            f'{paragraph}</div></article>'
        )
    if not output:
        raise RuntimeError("The Meets tab did not contain any dated events.")
    return "\n".join(output)


def render_other_events(rows: list[list[object]]) -> str:
    headers, data = find_table(rows, ("date", "event", "host", "location"))
    output = []
    for row in data:
        name = text(cell(headers, row, "event", "name", "activity"))
        if not name:
            continue
        raw_date = cell(headers, row, "date")
        event_date = iso_date(raw_date)
        if event_date:
            parsed = date.fromisoformat(event_date)
            date_markup = f'<time class="event-date" datetime="{event_date}">{parsed.strftime("%b")} {parsed.day}</time>'
        else:
            date_label = text(raw_date) or text(cell(headers, row, "date tbd", "timing")) or "TBD"
            date_markup = f'<span class="event-date">{escape(date_label)}</span>'
        family = text(cell(headers, row, "family", "host", "host family"))
        run_location = text(cell(headers, row, "run location", "location", "site"))
        details = text(cell(headers, row, "details", "notes", "description"))
        summary = " · ".join(part for part in (family, run_location) if part) or details
        paragraph = f"<p>{escape(summary)}</p>" if summary else ""
        output.append(f"          <article>{date_markup}<h3>{escape(name)}</h3>{paragraph}</article>")
    if not output:
        raise RuntimeError("The Other Events tab did not contain any events.")
    return "\n".join(output)


def replace_between(source: str, start_pattern: str, end_pattern: str, replacement: str) -> str:
    pattern = re.compile(f"({start_pattern})(.*?)(\n\\s*{end_pattern})", re.DOTALL)
    updated, count = pattern.subn(lambda match: f"{match.group(1)}\n{replacement}{match.group(3)}", source, count=1)
    if count != 1:
        raise RuntimeError(f"Could not find the generated section beginning with {start_pattern!r}.")
    return updated


def update_schedule(service, spreadsheet_id: str) -> None:
    meets = render_meets(read_tab(service, spreadsheet_id, SCHEDULE_TABS[0]))
    other_events = render_other_events(read_tab(service, spreadsheet_id, SCHEDULE_TABS[1]))
    path = ROOT / "schedule.html"
    source = path.read_text(encoding="utf-8")
    source = replace_between(source, r'<div class="schedule-list">', r"</div>\n\s*</section>", meets)
    source = replace_between(source, r'<div class="other-events-grid">', r"</div>\n\s*<p class=", other_events)
    path.write_text(source, encoding="utf-8", newline="\n")


def render_roster(rows: list[list[object]]) -> str:
    headers, data = find_table(rows, ("first", "last", "grade", "group"))
    output = []
    for row in data:
        first = text(cell(headers, row, "first name", "first"))
        last = text(cell(headers, row, "last name", "last"))
        if not first or not last:
            continue
        grade = text(cell(headers, row, "grade"))
        group = text(cell(headers, row, "workout group", "training group", "group", "role"))
        top = text(cell(headers, row, "uniform top", "singlet", "top"))
        bottom = text(cell(headers, row, "uniform bottom", "shorts", "bottom"))
        # The generated JavaScript is public. Keep full coach names, but preserve
        # the site's existing last-initial treatment for athletes.
        if normalized(group) != "coach":
            last = f"{last[0].upper()}."
        fields = (last, first, grade, group, top, bottom)
        output.append(
            "|".join(
                value.replace("|", "/")
                .replace("\n", " ")
                .replace("`", "'")
                .replace("${", "$\u200b{")
                for value in fields
            )
        )
    if not output:
        raise RuntimeError("The Full Team Roster tab did not contain any roster entries.")
    return "\n".join(output)


def update_roster(service, spreadsheet_id: str) -> None:
    roster = render_roster(read_tab(service, spreadsheet_id, ROSTER_TAB))
    path = ROOT / "roster.js"
    source = path.read_text(encoding="utf-8")
    updated, count = re.subn(
        r"const rosterData = `.*?`;",
        f"const rosterData = `\n{roster}\n`;",
        source,
        count=1,
        flags=re.DOTALL,
    )
    if count != 1:
        raise RuntimeError("Could not locate rosterData in roster.js.")
    path.write_text(updated, encoding="utf-8", newline="\n")


def update_pace_table(service, spreadsheet_id: str) -> None:
    rows = read_tab(service, spreadsheet_id, PACE_TAB, formatted=True)
    if len(rows) < 4:
        raise RuntimeError("The Pace Table tab does not contain its header and pace rows.")
    pace_rows = []
    for source_row in rows[2:]:
        row = [text(value) for value in (source_row + [""] * 10)[:10]]
        if not row[0] or not row[1]:
            continue
        pace_rows.append(row)
    if not pace_rows:
        raise RuntimeError("The Pace Table tab did not contain any usable pace rows.")
    payload = {
        "source": "Pace Table",
        "spreadsheetId": spreadsheet_id,
        "rows": pace_rows,
    }
    javascript = "window.WOLFPACK_PACE_TABLE = " + json.dumps(
        payload, ensure_ascii=False, indent=2
    ) + ";\n"
    (ROOT / "pace-table-data.js").write_text(javascript, encoding="utf-8", newline="\n")


def update_records(service, spreadsheet_id: str) -> None:
    rows = read_tab(service, spreadsheet_id, RECORDS_TAB, formatted=True)
    categories = {"varsity": [], "sophomores": [], "freshmen": []}
    for row in rows[4:]:
        values = [text(value) for value in (row + [""] * 12)[:12]]
        for category, start in (("varsity", 0), ("sophomores", 4), ("freshmen", 8)):
            rank, name, pace, year = values[start : start + 4]
            if rank and name and pace:
                categories[category].append("|".join((rank, name.replace("|", "/"), pace, year)))
    if any(not values for values in categories.values()):
        raise RuntimeError("The Peoria Top 50 tab is missing a record category.")
    blocks = ",\n".join(
        f"  {category}: `\n" + "\n".join(values) + "`"
        for category, values in categories.items()
    )
    path = ROOT / "records.js"
    source = path.read_text(encoding="utf-8")
    updated, count = re.subn(
        r"const recordData = \{.*?\n\};", f"const recordData = {{\n{blocks},\n}};",
        source, count=1, flags=re.DOTALL,
    )
    if count != 1:
        raise RuntimeError("Could not locate recordData in records.js.")
    path.write_text(updated, encoding="utf-8", newline="\n")


def update_history(service, spreadsheet_id: str) -> None:
    rows = read_tab(service, spreadsheet_id, HISTORY_TAB, formatted=True)
    output = []
    milestone_words = ("champion", "trophy", "world record", "break 4:00", "qualif")
    for row in rows[1:]:
        year = text(row[0] if row else "")
        event = text(row[1] if len(row) > 1 else "")
        if not year or not event:
            continue
        classes = "timeline-item milestone" if any(word in event.lower() for word in milestone_words) else "timeline-item"
        output.append(
            f'            <article class="{classes}"><div class="timeline-year">'
            f'{escape(year.replace("-", "–"))}</div><div class="timeline-dot"></div>'
            f'<div class="timeline-card"><p>{escape(event)}</p></div></article>'
        )
    if not output:
        raise RuntimeError("The Team Timeline tab did not contain usable entries.")
    path = ROOT / "history.html"
    source = path.read_text(encoding="utf-8")
    source = replace_between(source, r'<div id="team-timeline" class="timeline">', r"</div>\n\s*</div>", "\n".join(output))
    path.write_text(source, encoding="utf-8", newline="\n")


def update_public_insights(service, mileage_id: str, bus_id: str) -> None:
    mileage = read_tab(service, mileage_id, MILEAGE_TAB, formatted=True)
    bus = read_tab(service, bus_id, BUS_TAB, formatted=True)
    if not mileage or not bus:
        raise RuntimeError("Mileage or bus reservation headers could not be read.")
    payload = {"mileage": mileage, "busReservations": bus}
    javascript = "window.WOLFPACK_TEAM_INSIGHTS = " + json.dumps(
        payload, ensure_ascii=False, indent=2
    ) + ";\n"
    (ROOT / "team-insights-data.js").write_text(javascript, encoding="utf-8", newline="\n")


def required_environment(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if not value:
        raise RuntimeError(f"{name} is missing.")
    return value


def main() -> None:
    service = google_sheets_service()
    update_schedule(service, required_environment("SCHEDULE_SPREADSHEET_ID"))
    update_roster(service, required_environment("ROSTER_SPREADSHEET_ID"))
    update_pace_table(service, required_environment("PACE_SPREADSHEET_ID"))
    history_id = required_environment("HISTORY_SPREADSHEET_ID")
    update_records(service, history_id)
    update_history(service, history_id)
    update_public_insights(
        service,
        required_environment("MILEAGE_SPREADSHEET_ID"),
        required_environment("BUS_SPREADSHEET_ID"),
    )
    print("Updated all seven website tables from Google Sheets.")


if __name__ == "__main__":
    main()
