"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";

interface GA4Property {
  propertyId: string;
  displayName: string;
}

interface GA4PropertySelectorProps {
  value: string;
  onChange: (propertyId: string) => void;
}

export function GA4PropertySelector({ value, onChange }: GA4PropertySelectorProps) {
  const [properties, setProperties] = useState<GA4Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

        const data = await response.json();
        setProperties(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchProperties();
  }, []);

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
            Make sure you've authenticated with Google and have access to GA4 properties.
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
      {properties.map((property) => (
        <button
          key={property.propertyId}
          onClick={() => onChange(property.propertyId)}
          className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
            value === property.propertyId
              ? "border-brand bg-brand/5"
              : "border-border bg-card hover:border-brand/50"
          }`}
        >
          <div className="flex items-start gap-3">
            <div
              className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                value === property.propertyId
                  ? "border-brand bg-brand"
                  : "border-border"
              }`}
            >
              {value === property.propertyId && (
                <svg
                  className="w-3 h-3 text-white"
                  fill="currentColor"
                  viewBox="0 0 20 20"
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
              <p className="font-medium text-foreground">{property.displayName}</p>
              <p className="text-xs text-muted-foreground font-mono mt-1">
                ID: {property.propertyId}
              </p>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
