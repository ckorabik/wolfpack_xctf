const recordData = {
  varsity: `
1|Jack Keelan* (1)|14:05|2012
2|Mike Patton* (1)|14:24|1980
3|Michael OBroin* (12)|14:39|2017
4|Matthew Conroy (4)|14:40|2023
5|Dan Santino* (24)|14:45|2015
6|Tim Smith (24)|14:46|1973
7|Andy Weber*|15:02|2014
8|Dwight Gilbert*|15:03|1983
9|Chris Korabik*|15:03|2013
10|Kallin Khan|15:09|2014
11|Manny Alvarez*|15:15|2024
12|Jacob Flynn|15:17|2018
13|Jack Cross*|15:19|2010
14|Paul McLone*|15:19|1982
15|Mike Zartman*|15:20|1982
16|Brendan Christian*(25)|15:21|2004
17|John Lennon*|15:22|2014
18|John Walls|15:22|2018
19|Hugh Lynch*|15:23|2024
20|Mark Floreani*|15:24|2000
21|Dave Wagner*|15:25|1982
22|Patrick Santino*|15:26|2010
23|Dan Hoffman*|15:27|1982
24|John Lenahan*|15:28|1996
25|Dave Walker*|15:29|1981
26|Taylor Dugas|15:30|2013
27|Vince Lewis|15:30|2015
28|John Driscoll*|15:33|1981
29|Jose Lamas*|15:39|1982
30|Brian Santino*|15:42|2014
31|Ethan Petrillo*|15:42|2024
32|Patrick Manglano*|15:43|2013
33|Harry Lesak*|15:43|2019
34|Zach Tan*|15:44|2024
35|Liam Linnen*|15:44|2019
36|Steve Darley|15:45|1972
37|Carlos Caso*|15:47|1981
38|Nick Lopez|15:49|2024
39|Tim Santine|15:51|1993
40|Chris Jeske|15:52|2015
41|Joe Amoruso|15:53|2015
42|Christian Coletta|15:53|2017
43|Patrick Hogan|15:54|2014
44|Luke Turner*|15:55|2022
45|Peter Devitt*|15:58|2010`,
  sophomores: `
1|Jack Keelan* (11)|14:36|2010
2|Dan Santino|15:00|2013
3|Liam Linnen|15:52|2018
4|Brendan Houlihan*|15:53|2024
5|Zach Kiley*|16:00|2019
6|Brian Moore*|16:03|2019
7|Jacob Flynn|16:04|2017
8|Theo Conroy*|16:05|2019
9|Michael Obroin|16:18|2015
10|Joe Amoruso|16:29|2014
11|John Walls|16:30|2016
12|Lyndon Vickrey|16:32|2014
13|Matthew Conroy|16:33|2021
14|Ethan Petrillo|16:34|2023
15|Colin Linnen|16:35|2018
16|Nick Kiley|16:39|2019
17|Chris Korabik|16:45|2011
18|Zach Tan|16:49|2023
19|Taylor Dugas|16:51|2011
20|Brandon Mendoza|16:51|2021
21|Paul Tonner|17:01|2014
22|Carlin Kyhl|17:10|2018
23|Connor Walls|17:17|2018
24|Trey Johnson|17:19|2015
25|Luke Abraham|17:20|2017
26|Brian Santino|17:21|2012
27|Al Kaleshi|17:25|2017
28|James Mangan|17:31|2015
29|Mick Magee|17:36|2015
30|Christian Colletta|17:36|2016
31|Andrius Blekys|17:40|2013
32|Joey Connelly|17:45|2012
33|Henry Fink|17:51|2021
34|Declan Glaysher|17:53|2019
35|Connor Fitzpatrick|17:56|2018
36|Alex Kepler|17:56|2023
37|Sean Goebelcker|17:57|2010
38|Xavier Guttierez|17:59|2016
39|AJ Meyers|18:01|2019
40|Kevin Freeman|18:04|2018
41|Aidan Tansor|18:06|2023
42|Harry Lesak|18:09|2017
43|Ted Schmiedeler|18:10|2019
44|Colin Hogan|18:20|2013
45|Will Payne|18:25|2015
46|John Rittereiser|18:26|2016
47|Liam Donnelly|18:29|2012
48|Gabe Castillo|18:34|2015
49|Charlie Archambault|18:36|2022
50|Cole Hougo|18:43|2018`,
  freshmen: `
1|Dan Santino|15:33|2012
2|Patrick Hogan|15:54|2014
3|Brendan Houlihan|16:07|2023
4|Brett Haffner|16:22|2014
5|Jack Rhyner|16:40|2019
6|Kyle McGovern|16:57|2017
7|Alrik Swan|17:08|2025
8|John Walls|17:09|2015
9|Colin Linnen|17:18|2017
10|Theo Conroy|17:20|2018
11|Andy Weber|17:20|2011
12|Liam Linnen|17:21|2017
13|Brian Moore|17:23|2018
14|Billy Taylor|17:33|2015
15|Kevin Hogan|17:37|2017
16|James Moore|17:44|2019
17|JP Hlavin|17:46|2025
18|Zach Tan|17:47|2022
19|Ethan Petrillo|17:49|2022
20|Henry Gilbert|17:50|2018
21|Sean Mooney|18:09|2014
22|Carlin Khyl|18:10|2017
23|James Mangan|18:12|2014
24|Xavier Guttierez|18:13|2015
25|Shane Hughes|18:13|2012
26|Teddy Lynch|18:17|2025
27|Edward Maley|18:19|2025
28|Joseph Horos|18:22|2025
29|Sam Hansen|18:26|2018
30|Trey Johnson|18:28|2014
31|Connor Walls|18:29|2017
32|Aidan Tansor|18:37|2022
33|Cam Shure|18:44|2022
34|Chris Korabik|18:48|2010
35|Duncan DeProfio|18:48|2019
36|Zach Kiley|18:50|2018
37|Tivas Gupta|18:51|2015
38|Ted Schmiedeler|18:51|2018
39|Christian Turner|18:57|2019
40|Alex Kepler|18:57|2022
41|Hugh Lynch|18:58|2021
42|Devlin Burns|19:02|2024
43|Jacob Flynn|19:03|2016
44|John Rittereiser|19:04|2015
45|Paul Tonner|19:07|2013
46|Alex Klincewicz|19:08|2015
47|Will Devaney|19:09|2025
48|Will Skalitzky|19:09|2014
49|Matas Blekys|19:10|2010
50|Luke Turner|19:10|2019`,
};

const categories = ["varsity", "sophomores", "freshmen"];
const tabButtons = [...document.querySelectorAll("[data-record-tab]")];

function parseRecords(text) {
  return text
    .trim()
    .split("\n")
    .map((line) => {
      const [rank, name, time, year] = line.split("|");
      return { rank, name, time, year };
    });
}

function selectTab(category) {
  tabButtons.forEach((button) => {
    const selected = button.dataset.recordTab === category;
    button.classList.toggle("active", selected);
    button.setAttribute("aria-selected", String(selected));
    document.querySelector(`#${button.dataset.recordTab}-panel`).hidden = !selected;
  });
}

function renderRecords(category, records) {
  const body = document.querySelector(`#${category}-records`);
  const fragment = document.createDocumentFragment();

  records.forEach((record) => {
    const row = document.createElement("tr");
    [record.rank, record.name, record.time, record.year].forEach((value, index) => {
      const cell = document.createElement(index === 1 ? "th" : "td");
      if (index === 1) cell.scope = "row";
      cell.textContent = value;
      row.append(cell);
    });
    fragment.append(row);
  });

  body.replaceChildren(fragment);
  document.querySelector(`#${category}-count`).textContent = records.length;
}

tabButtons.forEach((button) => {
  button.addEventListener("click", () => selectTab(button.dataset.recordTab));
});

categories.forEach((category) => renderRecords(category, parseRecords(recordData[category])));
