# Warsaw Sunset

Live site: https://yeromin.github.io/warsaw-sunset/

A self-contained sunrise, sunset and twilight tracker for Warsaw, Poland. Migrated from the original ChatGPT Site, preserving its sky visualization, live countdowns, seven interactive timeline milestones, hover/focus/tap tooltips and responsive layout.

## Run locally

Open `index.html` directly, or serve this directory:

```sh
python3 -m http.server 8000
```

No build, external scripts, API keys, backend or scheduled job is needed. Solar events are calculated in the browser for 52.2297° N, 21.0122° E. Dates and times use `Europe/Warsaw`, including daylight saving changes, regardless of the visitor's timezone. The page refreshes every second and recalculates when the Warsaw date changes.

Civil twilight uses −6°, nautical twilight −12°, astronomical darkness −18°, and sunrise/sunset −0.833°. The original reference schedules for November 9–10, 2026 are preserved; other dates use the original approximate solar algorithm. Observed brightness varies with weather and local conditions. In summer, when the Sun never reaches −18°, the page displays “No full darkness” and ends its timeline at nautical dusk.

## Verify

Requires Node.js 18 or later, without installing packages:

```sh
node --test tests/countdown.test.cjs
```

Checks cover live updates, all seven milestones, Warsaw midnight rollover, daylight saving transitions, summer dawn across UTC midnight, summer twilight without astronomical night, and every date in 2026–2028.

## GitHub Pages

In **Settings → Pages**, choose **Deploy from a branch**, the publishing branch and **/(root)**, then save. `.nojekyll` keeps deployment as plain HTML. All page resources are inline, so project subpaths work without configuration.

Make future changes on a separate working branch and use a pull request into the publishing branch.
