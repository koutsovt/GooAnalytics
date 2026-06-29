"use client";

import { Info, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

interface GBPLocation {
  locationId: string;
  displayName: string;
}

interface GBPLocationSelectorProps {
  value: string;
  onChange: (locationId: string) => void;
}

export function GBPLocationSelector({ value, onChange }: GBPLocationSelectorProps) {
  const [locations, setLocations] = useState<GBPLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

        const data = await response.json();
        setLocations(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchLocations();
  }, []);

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
          isExpected
            ? "bg-muted/40 border-border"
            : "bg-red-50 border-red-200"
        }`}
      >
        <Info
          className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
            isExpected ? "text-muted-foreground" : "text-red-600"
          }`}
        />
        <div>
          <p
            className={`font-medium ${
              isExpected ? "text-foreground" : "text-red-800"
            }`}
          >
            {isExpected
              ? "Automatic location lookup isn't available yet"
              : "Unable to load locations"}
          </p>
          <p
            className={`text-sm ${
              isExpected ? "text-muted-foreground" : "text-red-700"
            }`}
          >
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
      {locations.map((location) => (
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
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </div>
            <div>
              <p className="font-medium text-foreground">{location.displayName}</p>
              <p className="text-xs text-muted-foreground font-mono mt-1">{location.locationId}</p>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
