---
name: terence-london-stats
description: >-
  Pull Google Analytics stats for the Terence London salon website
  (terencelondon.com) directly from the GA4 Data API and produce the monthly
  website brief one-pager plus an owner email. Use this skill whenever the user
  asks for Terence London website stats, salon analytics, the "monthly brief",
  booking numbers, traffic/visitor figures for terencelondon.com, or wants to
  send the salon owner an update on website performance — even if they don't
  name the template explicitly. Also trigger on phrases like "run the Terence
  London numbers", "this month's salon report", or "how did the website do".
---

# Terence London — Website Stats & Monthly Brief

This skill produces the recurring website-performance brief for **Terence
London**, a hair salon in Templestowe, Melbourne (terencelondon.com). It pulls
data **directly from the Google Analytics 4 Data API** (no third-party
aggregator), frames it around bookings (the metric the owner cares about), and
outputs a polished one-page HTML brief plus a short owner email.

The audience is a **non-technical salon owner**. Lead with outcomes (booking
clicks, calls), keep traffic as supporting context, and avoid jargon.

## Fixed account details

- GA4 property ID: **537938382** (the API addresses it as `properties/537938382`)
- Analytics owner Google account: **koutsovt@gmail.com**

The stats live in Google Analytics, not in the public website — never try to
scrape numbers from terencelondon.com itself.

## One-time setup (auth)

The GA4 Data API needs Google credentials. Set this up once:

1. In Google Cloud Console, create (or reuse) a project and **enable the
   "Google Analytics Data API"**.
2. Create a **service account** and download its JSON key file.
3. In GA4 → Admin → **Property Access Management** for property 537938382, add
   the service account's email with at least **Viewer** access.
4. Point the environment at the key before running the script:
   `export GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json`

A user OAuth token works too, but the service account is the simplest for a
repeatable monthly run. If credentials are missing or access is denied, stop
and tell the user exactly which of the four steps above to check — don't fall
back to scraping or to Supermetrics.

## Workflow

1. **Confirm the period.** Default to last 30 days. From the second edition
   onward, also fetch the prior period so the brief can show month-on-month
   change.

2. **Fetch the data.** Run the bundled script, which calls the GA4 Data API
   `runReport` method for the full standard report set and prints structured
   JSON:

   ```bash
   pip install google-analytics-data --break-system-packages   # first run only
   python scripts/fetch_ga4_stats.py --property 537938382 --start 2026-05-04 --end 2026-06-02
   ```

   Use `--compare-start`/`--compare-end` to add a prior period. The script
   returns six blocks: `overview`, `events`, `conversions`, `sources`,
   `daily`, `device`. See "What the script returns" below.

   If you prefer to call the API by hand, the request shape is documented in
   `scripts/fetch_ga4_stats.py` (it's a thin, readable wrapper) — the metric
   and dimension names are the standard GA4 ones (`totalUsers`, `sessions`,
   `screenPageViews`, `engagedSessions`, `engagementRate`,
   `averageSessionDuration`, `bounceRate`, `eventCount`; dimensions `date`,
   `sessionSourceMedium`, `deviceCategory`, `eventName`).

3. **Compute the headline conversion figure.** The booking button fires a
   `click_book` event. Report it as **unique visitors who clicked Book ÷ total
   visitors** (e.g. 37 / 104 = 36%). The raw event count is higher because
   people click several times comparing slots — mention total clicks as colour,
   but the *rate* must use unique users so it isn't inflated. Do the same for
   `click_phone` (calls) and `click_address` (directions). The `conversions`
   block already gives unique `totalUsers` per event for this.

   **Always caveat:** a booking click is *intent*, not a confirmed appointment.
   If the user can supply booking-system data, fold confirmed bookings into the
   funnel as the final step and report those instead.

4. **Build the one-pager** from `assets/monthly-brief-template.html` (see
   "Editing the template"). Save to the outputs directory and present it.

5. **Draft the owner email** (see "Owner email") using the message-composing
   tool if available, otherwise as plain text.

6. **State data caveats** honestly: short history means no reliable trend in
   early editions; Facebook traffic often appears under long `fbclid` tracking
   URLs so can look lower than it is in the source list.

## What the script returns

JSON with these blocks (numbers are illustrative):

- `overview`: totalUsers, newUsers, sessions, screenPageViews, engagedSessions,
  engagementRate, averageSessionDuration (seconds), bounceRate.
- `events`: every eventName with its eventCount.
- `conversions`: for click_book / click_phone / click_address / click_social,
  the unique `totalUsers` and `eventCount`. Use `totalUsers` for the rate.
- `sources`: rows of sessionSourceMedium with sessions, totalUsers,
  engagedSessions, engagementRate.
- `daily`: rows of date with sessions and totalUsers.
- `device`: rows of deviceCategory with sessions and totalUsers.

If a `compare` period was requested, a parallel `*_compare` set is included for
the month-on-month deltas.

## Editing the template

`assets/monthly-brief-template.html` is the current edition, fully styled. To
produce a new month, edit these in place (search for the value):

- Period line in the masthead and the footer date.
- Hero block: unique bookers (`37`), booking-intent rate (`36%`), and the
  funnel rows (visited / clicked Book / clicked to call / got directions).
- KPI strip: visitors, visits, avg time on site, mobile share.
- Source bars: each source's session count *and* its bar `width:` percentage,
  set relative to the top source (top source = 100%).
- Device donut: the `stroke-dasharray` first number = mobile% × 2.89 (circle
  circumference ≈ 289), and the two legend counts.
- Daily-trend chart: see the coordinate formula below.
- From the second edition, fill the `.delta` cells under each KPI with the
  month-on-month change instead of the first-month placeholders.

### Daily-trend chart coordinates

The line/area chart uses a 760×200 viewBox. For a series of N daily values:

- **x** for point i (0-indexed): `50 + i * (694.8 / (N - 1))`
- **y** for value v: `149 - (v / YMAX) * 129`, where `YMAX` is the y-axis top
  label (24 in the current edition; raise it and the axis labels if any day
  exceeds it).

Update both the `<polyline>` points and the `<polygon>` (area) points — the
polygon repeats the polyline points then closes with two baseline points at
`y=149`. Move the peak marker `<circle>`/`<text>` to the busiest day and adjust
the x-axis date labels.

## Owner email

Keep it short, warm, and outcome-first. Lead with the booking number, name the
one growth area, and tee up the next step. Template:

> **Subject:** Your website — [month] in one page
>
> Hi Terence,
>
> Quick update on how the website did over the last month — full one-pager
> attached, but the headline is a good one:
>
> Of the [N] people who visited the site, [B] clicked "Book Now" — about [X]%.
> On top of that, [P] tapped to call. In short, the site isn't just getting
> found, it's actively sending people toward an appointment.
>
> Most visitors come from Google search and are on their phones, so the mobile
> booking button is doing the heavy lifting. Social is the main area we can
> grow.
>
> [Optional next step — e.g. linking the booking system for confirmed numbers.]
>
> I'll send one of these each month so you can see the trend build.
>
> Best,
> Tas

## Reference: known event names on the site

`page_view`, `session_start`, `first_visit`, `user_engagement`, `scroll`,
`engaged_session`, `click` — standard GA4 events.
`click_book`, `click_phone`, `click_address`, `click_social`,
`scroll_to_gallery` — custom events configured on the site. `click_book` is the
booking-intent signal and the headline of every brief.
