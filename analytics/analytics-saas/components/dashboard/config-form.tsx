"use client";

import { useState } from "react";
import { GA4PropertySelector } from "@/components/dashboard/ga4-property-selector";
import { GBPLocationSelector } from "@/components/dashboard/gbp-location-selector";
import { Button } from "@/components/ui/button";
import type { reportConfigs } from "@/lib/db/schema";

interface ConfigFormProps {
  config?: typeof reportConfigs.$inferSelect;
  defaultEmail?: string;
  onClose?: () => void;
  onSuccess?: () => void | Promise<void>;
}

export function ConfigForm({ config, defaultEmail, onClose, onSuccess }: ConfigFormProps) {
  const [ga4PropertyId, setGa4PropertyId] = useState(config?.ga4PropertyId ?? "");
  const [gscSiteUrl, setGscSiteUrl] = useState(config?.gscSiteUrl ?? "");
  const [gbpLocationId, setGbpLocationId] = useState(config?.gbpLocationId ?? "");
  // Default a new property's recipient to the logged-in user's email; an
  // existing config keeps its saved value.
  const [recipientEmail, setRecipientEmail] = useState(
    config?.recipientEmail ?? defaultEmail ?? "",
  );
  const [recipientPhone, setRecipientPhone] = useState(config?.recipientPhone ?? "");
  const [scheduleFrequency, setScheduleFrequency] = useState(
    config?.scheduleFrequency ?? "monthly",
  );
  const [scheduleDayOfMonth, setScheduleDayOfMonth] = useState(config?.scheduleDayOfMonth ?? 1);
  const [scheduleDayOfWeek, setScheduleDayOfWeek] = useState(config?.scheduleDayOfWeek ?? 1);
  const [scheduleTime, setScheduleTime] = useState(config?.scheduleTime ?? "09:00");
  const [scheduleTimezone, setScheduleTimezone] = useState(
    config?.scheduleTimezone ?? "Australia/Sydney",
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const method = config ? "PUT" : "POST";
      const endpoint = config ? `/api/configs/${config.id}` : "/api/configs";

      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ga4PropertyId,
          gscSiteUrl,
          gbpLocationId,
          recipientEmail,
          recipientPhone,
          scheduleFrequency,
          scheduleDayOfMonth,
          scheduleDayOfWeek,
          scheduleTime,
          scheduleTimezone,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save config");
      }

      await onSuccess?.();
      onClose?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">
          Website URL *
        </label>
        <p className="text-xs text-muted-foreground mb-2">
          Your website domain (required for search data and analytics)
        </p>
        <input
          type="text"
          value={gscSiteUrl}
          onChange={(e) => setGscSiteUrl(e.target.value)}
          required
          className="w-full px-3 py-2 rounded-lg border border-border bg-input text-foreground"
          placeholder="e.g., https://example.com"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1">
          Recipient Email *
        </label>
        <p className="text-xs text-muted-foreground mb-2">
          Where to send your analytics reports
        </p>
        <input
          type="email"
          value={recipientEmail}
          onChange={(e) => setRecipientEmail(e.target.value)}
          required
          className="w-full px-3 py-2 rounded-lg border border-border bg-input text-foreground"
          placeholder="e.g., reports@example.com"
        />
      </div>

      <div className="pt-4 border-t border-border">
        <h3 className="text-sm font-semibold text-foreground mb-4">
          Data Sources (Optional)
        </h3>

        <div className="mb-4">
          <label className="block text-sm font-medium text-foreground mb-1">
            GA4 Property
          </label>
          <p className="text-xs text-muted-foreground mb-3">
            Select your Google Analytics 4 property to pull visitor and event data
          </p>
          <GA4PropertySelector value={ga4PropertyId} onChange={setGa4PropertyId} />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Google Business Profile Location
          </label>
          <p className="text-xs text-muted-foreground mb-3">
            Select the location to pull reviews from. If none appear, enter the location resource
            name manually below.
          </p>
          <GBPLocationSelector value={gbpLocationId} onChange={setGbpLocationId} />
          <input
            type="text"
            value={gbpLocationId}
            onChange={(e) => setGbpLocationId(e.target.value)}
            className="w-full mt-3 px-3 py-2 rounded-lg border border-border bg-input text-foreground"
            placeholder="e.g., accounts/123456789/locations/987654321"
          />
        </div>
      </div>

      <div className="pt-4 border-t border-border">
        <h3 className="text-sm font-semibold text-foreground mb-4">
          Additional Delivery (Optional)
        </h3>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Recipient Phone
          </label>
          <p className="text-xs text-muted-foreground mb-2">
            Receive reports via SMS or WhatsApp (E.164 format, e.g., +61412345678)
          </p>
          <input
            type="tel"
            value={recipientPhone}
            onChange={(e) => setRecipientPhone(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-border bg-input text-foreground"
            placeholder="e.g., +1234567890"
          />
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="flex gap-2 pt-8 border-t border-border mt-8">
        <Button type="submit" size="lg" disabled={loading} className="flex-1">
          {loading ? "Saving..." : config ? "Update" : "Create"}
        </Button>
        {onClose && (
          <Button type="button" variant="outline" size="lg" onClick={onClose} className="flex-1">
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
