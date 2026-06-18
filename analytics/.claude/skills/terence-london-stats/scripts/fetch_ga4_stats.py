#!/usr/bin/env python3
"""
Fetch the standard Terence London report set directly from the GA4 Data API.

Auth: uses Application Default Credentials. Set the environment variable
    GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json
before running, and grant that service account Viewer access to the GA4
property in Admin -> Property Access Management.

Install (first run only):
    pip install google-analytics-data --break-system-packages

Usage:
    python fetch_ga4_stats.py --property 537938382 --start 2026-05-04 --end 2026-06-02
    # optional prior period for month-on-month:
    python fetch_ga4_stats.py --property 537938382 --start 2026-05-04 --end 2026-06-02 \
        --compare-start 2026-04-04 --compare-end 2026-05-03

Output: a single JSON object on stdout with blocks:
    overview, events, conversions, sources, daily, device
(and *_compare equivalents when a compare period is given).
"""

import argparse
import json
import sys

try:
    from google.analytics.data_v1beta import BetaAnalyticsDataClient
    from google.analytics.data_v1beta.types import (
        DateRange, Dimension, Metric, RunReportRequest,
        Filter, FilterExpression, FilterExpressionList,
    )
except ImportError:
    sys.exit(
        "Missing dependency. Run:\n"
        "    pip install google-analytics-data --break-system-packages"
    )

CONVERSION_EVENTS = ["click_book", "click_phone", "click_address", "click_social"]


def run_report(client, prop, start, end, dimensions, metrics, dim_filter=None):
    req = RunReportRequest(
        property=f"properties/{prop}",
        date_ranges=[DateRange(start_date=start, end_date=end)],
        dimensions=[Dimension(name=d) for d in dimensions],
        metrics=[Metric(name=m) for m in metrics],
        dimension_filter=dim_filter,
        limit=100000,
    )
    resp = client.run_report(req)
    rows = []
    for r in resp.rows:
        row = {}
        for i, d in enumerate(dimensions):
            row[d] = r.dimension_values[i].value
        for i, m in enumerate(metrics):
            row[m] = r.metric_values[i].value
        rows.append(row)
    return rows


def fetch_period(client, prop, start, end):
    overview_metrics = [
        "totalUsers", "newUsers", "sessions", "screenPageViews",
        "engagedSessions", "engagementRate", "averageSessionDuration",
        "bounceRate",
    ]
    overview_rows = run_report(client, prop, start, end, [], overview_metrics)
    overview = overview_rows[0] if overview_rows else {m: "0" for m in overview_metrics}

    events = run_report(client, prop, start, end, ["eventName"], ["eventCount"])

    conv_filter = FilterExpression(
        filter=Filter(
            field_name="eventName",
            in_list_filter=Filter.InListFilter(values=CONVERSION_EVENTS),
        )
    )
    conversions = run_report(
        client, prop, start, end,
        ["eventName"], ["totalUsers", "eventCount"], dim_filter=conv_filter,
    )

    sources = run_report(
        client, prop, start, end,
        ["sessionSourceMedium"],
        ["sessions", "totalUsers", "engagedSessions", "engagementRate"],
    )
    sources.sort(key=lambda r: int(r["sessions"]), reverse=True)

    daily = run_report(client, prop, start, end, ["date"], ["sessions", "totalUsers"])
    daily.sort(key=lambda r: r["date"])

    device = run_report(client, prop, start, end, ["deviceCategory"], ["sessions", "totalUsers"])

    return {
        "period": {"start": start, "end": end},
        "overview": overview,
        "events": events,
        "conversions": conversions,
        "sources": sources,
        "daily": daily,
        "device": device,
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--property", required=True, help="GA4 property ID, e.g. 537938382")
    ap.add_argument("--start", required=True, help="YYYY-MM-DD")
    ap.add_argument("--end", required=True, help="YYYY-MM-DD")
    ap.add_argument("--compare-start", help="YYYY-MM-DD (optional prior period)")
    ap.add_argument("--compare-end", help="YYYY-MM-DD")
    args = ap.parse_args()

    client = BetaAnalyticsDataClient()  # picks up GOOGLE_APPLICATION_CREDENTIALS

    out = fetch_period(client, args.property, args.start, args.end)

    if args.compare_start and args.compare_end:
        cmp = fetch_period(client, args.property, args.compare_start, args.compare_end)
        for key in ("overview", "events", "conversions", "sources", "daily", "device", "period"):
            out[f"{key}_compare"] = cmp[key]

    json.dump(out, sys.stdout, indent=2)
    sys.stdout.write("\n")


if __name__ == "__main__":
    main()
