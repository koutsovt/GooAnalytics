"use client";

import { AlertCircle, Loader2, Search, Sparkles } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { displayNameMatchesSite } from "@/lib/url";

interface GA4Property {
  propertyId: string;
  displayName: string;
}

interface GA4PropertySelectorProps {
  value: string;
  onChange: (propertyId: string) => void;
  // The property's Website URL field. Used only to *suggest* (never force) a
  // likely GA4 property, e.g. "Acme Plumbing" for acme-plumbing.com.au.
  websiteUrl?: string;
}

// Below this many properties, a search box is just extra clutter — most
// accounts have a handful. Agencies managing dozens of client sites are the
// ones who actually need to filter.
const SEARCH_THRESHOLD = 6;

export function GA4PropertySelector({ value, onChange, websiteUrl }: GA4PropertySelectorProps) {
  const [properties, setProperties] = useState<GA4Property[]>([]);
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
    const fetchProperties = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch("/api/ga4/properties");

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to fetch properties");
        }

        const data: GA4Property[] = await response.json();
        setProperties(data);

        // Nothing to decide between (only one property) or the account is
        // clearly for this site (name matches the website URL) — pick it
        // automatically instead of making the client hunt for the obvious
        // answer. Never overrides a value the client (or a saved config)
        // already has.
        if (!valueRef.current) {
          if (data.length === 1) {
            onChange(data[0].propertyId);
          } else if (websiteUrl) {
            const matches = data.filter((p) => displayNameMatchesSite(p.displayName, websiteUrl));
            if (matches.length === 1) {
              onChange(matches[0].propertyId);
            }
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchProperties();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isSuggested = (property: GA4Property) =>
    !!websiteUrl && displayNameMatchesSite(property.displayName, websiteUrl);

  const visibleProperties = useMemo(() => {
    const filtered = query.trim()
      ? properties.filter(
          (p) =>
            p.displayName.toLowerCase().includes(query.trim().toLowerCase()) ||
            p.propertyId.includes(query.trim()),
        )
      : properties;
    // Suggested match(es) float to the top so they're the first thing the
    // client sees, not buried in an alphabetical/API-ordered list. Matches
    // `websiteUrl` directly (rather than calling `isSuggested`) so this hook's
    // only real dependency is the primitive it reads.
    return [...filtered].sort(
      (a, b) =>
        Number(!!websiteUrl && displayNameMatchesSite(b.displayName, websiteUrl)) -
        Number(!!websiteUrl && displayNameMatchesSite(a.displayName, websiteUrl)),
    );
  }, [properties, query, websiteUrl]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
        Loading your GA4 properties...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 border border-red-200 p-4 flex gap-3">
        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-medium text-red-800">Unable to load properties</p>
          <p className="text-sm text-red-700">{error}</p>
          <p className="text-xs text-red-600 mt-2">
            Make sure you&apos;ve authenticated with Google and have access to GA4 properties.
          </p>
        </div>
      </div>
    );
  }

  if (properties.length === 0) {
    return (
      <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
        <p className="text-sm text-amber-800">
          No GA4 properties found. Create a property in Google Analytics and try again.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {properties.length > SEARCH_THRESHOLD && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search properties..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-input text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      )}

      {visibleProperties.length === 0 ? (
        <p className="text-sm text-muted-foreground py-2">
          No properties match &quot;{query}&quot;.
        </p>
      ) : (
        visibleProperties.map((property) => (
          <button
            key={property.propertyId}
            type="button"
            onClick={() => onChange(value === property.propertyId ? "" : property.propertyId)}
            className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
              value === property.propertyId
                ? "border-brand bg-brand/5"
                : "border-border bg-card hover:border-brand/50"
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                  value === property.propertyId ? "border-brand bg-brand" : "border-border"
                }`}
              >
                {value === property.propertyId && (
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
                  <p className="font-medium text-foreground">{property.displayName}</p>
                  {isSuggested(property) && value !== property.propertyId && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-brand/10 px-2 py-0.5 text-[11px] font-medium text-brand">
                      <Sparkles className="w-3 h-3" aria-hidden="true" />
                      Likely match
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground font-mono mt-1">
                  ID: {property.propertyId}
                </p>
              </div>
            </div>
          </button>
        ))
      )}
    </div>
  );
}
