# Warsaw Sunset

Live site: https://yeromin.github.io/warsaw-sunset/

A self-contained sunrise, sunset and twilight tracker, with Warsaw as the default city. It fills the browser window with a live sky, countdowns and seven interactive timeline milestones. Evening and morning details sit side by side on desktop so they remain visible without scrolling; smaller screens use a stacked layout.

Choose a city in the top-left corner: Warsaw, Kraków, Kyiv, Lviv, Berlin, London, Paris, Lisbon, New York, Los Angeles, Tokyo or Sydney. Your choice is remembered locally. Every time, date, countdown and solar calculation uses the selected city's coordinates and timezone.

Use the expand button in the top-right corner for a full-screen display. Press Escape or click the button again to leave full screen. The button is available when the browser supports full-screen mode.

## Run locally

Open `index.html` directly, or serve this directory:

```sh
python3 -m http.server 8000
```

No build, external scripts, API keys, backend or scheduled job is needed. Solar events are calculated in the browser for the selected city. Dates and times include local daylight saving changes, regardless of the visitor's timezone. The page refreshes every second and recalculates when the city's local date changes.

Civil twilight uses −6°, nautical twilight −12°, astronomical darkness −18°, and sunrise/sunset −0.833°. The original reference schedules for November 9–10, 2026 are preserved; other dates use the original approximate solar algorithm. Observed brightness varies with weather and local conditions. In summer, when the Sun never reaches −18°, the page displays “No full darkness” and ends its timeline at nautical dusk.

## Verify

Requires Node.js 18 or later, without installing packages:

```sh
node --test tests/countdown.test.cjs
```

Checks cover city switching, remembered selections, unavailable storage, local date rollover, daylight saving transitions, all seven milestones, summer dawn across UTC midnight and summer twilight without astronomical night. They also exercise every city throughout 2027 and every Warsaw date in 2026–2028.

## GitHub Pages

The publishing branch is `migration/github-pages`. In **Settings → Pages**, choose **Deploy from a branch**, this branch and **/(root)**, then save. `.nojekyll` keeps deployment as plain HTML. All page resources are inline, so project subpaths work without configuration.

Make future changes on a separate working branch and use a pull request into the publishing branch.

## Evening display

The large Warsaw clock and all countdowns display hours and minutes, without seconds. Solar countdowns use the selected city: dawn means civil dawn (Sun at −6°), and both dawn and sunset roll forward to tomorrow immediately after today's event. The solar timeline still describes today.

The rest card always follows Europe/Warsaw: Normal before 22:30, Wind-down at 22:30, Sleep now at 23:00. Sleep now stays active until 06:00; the bedtime countdown stays at zero during that overnight period. The progress bar covers the evening from 18:00 to 23:00. These are the user's routine reminders, not a personalized medical recommendation.
