"use client";

import { Info, Loader2, Search, Sparkles } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { displayNameMatchesSite } from "@/lib/url";

interface GBPLocation {
  locationId: string;
  displayName: string;
}

interface GBPLocationSelectorProps {
  value: string;
  onChange: (locationId: string) => void;
  // The property's Website URL field. Used only to *suggest* (never force) a
  // likely Business Profile location, e.g. "Acme Plumbing" for acme.com.au.
  websiteUrl?: string;
}

// Below this many locations, a search box is just extra clutter — most
// businesses have a handful. Agencies/multi-location chains are the ones who
// actually need to filter.
const SEARCH_THRESHOLD = 6;

export function GBPLocationSelector({ value, onChange, websiteUrl }: GBPLocationSelectorProps) {
  const [locations, setLocations] = useState<GBPLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  // Read inside the fetch effect without retriggering it on every keystroke
  // the parent form makes elsewhere (e.g. typing the website URL).
  const valueRef = useRef(value);
  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  // Intentionally runs once on mount: `onChange`/`websiteUrl` are read via
  // refs/closure at fetch-completion time, not re-run per keystroke.
  // biome-ignore lint/correctness/useExhaustiveDependencies: fetch-once-on-mount by design
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch("/api/gbp/locations");

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to fetch locations");
        }

        const data: GBPLocation[] = await response.json();
        setLocations(data);

        // Nothing to decide between (only one location) or the account is
        // clearly for this site (name matches the website URL) — pick it
        // automatically instead of making the client hunt for the obvious
        // answer. Never overrides a value the client (or a saved config)
        // already has.
        if (!valueRef.current) {
          if (data.length === 1) {
            onChange(data[0].locationId);
          } else if (websiteUrl) {
            const matches = data.filter((l) => displayNameMatchesSite(l.displayName, websiteUrl));
            if (matches.length === 1) {
              onChange(matches[0].locationId);
            }
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchLocations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isSuggested = (location: GBPLocation) =>
    !!websiteUrl && displayNameMatchesSite(location.displayName, websiteUrl);

  const visibleLocations = useMemo(() => {
    const filtered = query.trim()
      ? locations.filter(
          (l) =>
            l.displayName.toLowerCase().includes(query.trim().toLowerCase()) ||
            l.locationId.includes(query.trim()),
        )
      : locations;
    // Suggested match(es) float to the top so they're the first thing the
    // client sees, not buried in an alphabetical/API-ordered list. Matches
    // `websiteUrl` directly (rather than calling `isSuggested`) so this hook's
    // only real dependency is the primitive it reads.
    return [...filtered].sort(
      (a, b) =>
        Number(!!websiteUrl && displayNameMatchesSite(b.displayName, websiteUrl)) -
        Number(!!websiteUrl && displayNameMatchesSite(a.displayName, websiteUrl)),
    );
  }, [locations, query, websiteUrl]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
        Loading your Business Profile locations...
      </div>
    );
  }

  // The Business Profile APIs ship with a near-zero default quota that each
  // Google Cloud project must apply for, so quota/permission failures are the
  // expected case for most accounts — not a real error. Render those as a calm
  // info note that points to the manual field, and reserve a louder treatment
  // for genuinely unexpected failures.
  if (error) {
    const isExpected = /quota|permission|disabled|not been used|SERVICE_DISABLED|403|429/i.test(
      error,
    );
    return (
      <div
        className={`rounded-lg border p-4 flex gap-3 ${
          isExpected ? "bg-muted/40 border-border" : "bg-red-50 border-red-200"
        }`}
      >
        <Info
          className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
            isExpected ? "text-muted-foreground" : "text-red-600"
          }`}
        />
        <div>
          <p className={`font-medium ${isExpected ? "text-foreground" : "text-red-800"}`}>
            {isExpected
              ? "Automatic location lookup isn't available yet"
              : "Unable to load locations"}
          </p>
          <p className={`text-sm ${isExpected ? "text-muted-foreground" : "text-red-700"}`}>
            {isExpected
              ? "This needs Google Business Profile API access approved for this app. Until then, enter your location resource name manually below."
              : error}
          </p>
        </div>
      </div>
    );
  }

  if (locations.length === 0) {
    return (
      <div className="rounded-lg bg-muted/40 border border-border p-4">
        <p className="text-sm text-muted-foreground">
          No Business Profile locations found for your Google account. Leave this blank or enter a
          location ID manually below.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {locations.length > SEARCH_THRESHOLD && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search locations..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-input text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      )}

      {visibleLocations.length === 0 ? (
        <p className="text-sm text-muted-foreground py-2">
          No locations match &quot;{query}&quot;.
        </p>
      ) : (
        visibleLocations.map((location) => (
          <button
            type="button"
            key={location.locationId}
            onClick={() => onChange(value === location.locationId ? "" : location.locationId)}
            className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
              value === location.locationId
                ? "border-brand bg-brand/5"
                : "border-border bg-card hover:border-brand/50"
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                  value === location.locationId ? "border-brand bg-brand" : "border-border"
                }`}
              >
                {value === location.locationId && (
                  <svg
                    className="w-3 h-3 text-white"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium text-foreground">{location.displayName}</p>
                  {isSuggested(location) && value !== location.locationId && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-brand/10 px-2 py-0.5 text-[11px] font-medium text-brand">
                      <Sparkles className="w-3 h-3" aria-hidden="true" />
                      Likely match
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground font-mono mt-1">
                  {location.locationId}
                </p>
              </div>
            </div>
          </button>
        ))
      )}
    </div>
  );
}
