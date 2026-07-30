"use client";

import { AlertCircle, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { GA4PropertySelector } from "@/components/dashboard/ga4-property-selector";
import { GBPLocationSelector } from "@/components/dashboard/gbp-location-selector";
import { Button } from "@/components/ui/button";
import type { reportConfigs } from "@/lib/db/schema";
import { cn } from "@/lib/utils";
import { createConfigSchema } from "@/lib/validation";

interface ConfigFormProps {
  config?: typeof reportConfigs.$inferSelect;
  defaultEmail?: string;
  onClose?: () => void;
  onSuccess?: () => void | Promise<void>;
}

type RequiredField = "gscSiteUrl" | "recipientEmail";

// Validated against the exact schema the API enforces (lib/validation.ts), so
// a field never shows "looks fine" here and then fails on submit.
function fieldError(field: RequiredField, value: string): string | null {
  if (!value.trim()) {
    return field === "gscSiteUrl" ? "Website URL is required" : "Recipient email is required";
  }
  const result = createConfigSchema.shape[field].safeParse(value);
  if (!result.success) {
    return field === "gscSiteUrl"
      ? "Enter a full URL, including https://"
      : "Enter a valid email address";
  }
  return null;
}

// A phone number that doesn't look like E.164 still saves fine (the API only
// caps length), so this is a non-blocking style hint, not an error.
function phoneHint(value: string): string | null {
  if (!value.trim()) return null;
  return /^\+[1-9]\d{6,14}$/.test(value.trim())
    ? null
    : "Looks unusual — E.164 format starts with + and the country code, e.g. +61412345678";
}

function inputClasses(hasError: boolean, extra?: string) {
  return cn(
    "w-full px-3 py-2 rounded-lg border bg-input text-foreground transition-colors",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    hasError ? "border-danger focus-visible:ring-danger" : "border-border focus-visible:ring-ring",
    extra,
  );
}

function RequiredMark() {
  return (
    <>
      <span aria-hidden="true" className="text-danger">
        *
      </span>
      <span className="sr-only"> required</span>
    </>
  );
}

function FieldError({ id, message }: { id: string; message: string | null }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="mt-1.5 flex items-center gap-1.5 text-xs text-danger">
      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
      {message}
    </p>
  );
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
  // These schedule fields have no editable control in this form yet (the UI
  // only exposes property/recipient fields below); kept as fixed values pulled
  // from the existing config so an edit doesn't silently reset the schedule.
  const scheduleFrequency = config?.scheduleFrequency ?? "monthly";
  const scheduleDayOfMonth = config?.scheduleDayOfMonth ?? 1;
  const scheduleDayOfWeek = config?.scheduleDayOfWeek ?? 1;
  const scheduleTime = config?.scheduleTime ?? "09:00";
  const scheduleTimezone = config?.scheduleTimezone ?? "Australia/Sydney";
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // A field's error only surfaces once the user has left it (or tried to
  // submit) — not on every keystroke, which would flag "required" before
  // they've had a chance to type anything.
  const [touched, setTouched] = useState<Record<RequiredField, boolean>>({
    gscSiteUrl: false,
    recipientEmail: false,
  });
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [phoneTouched, setPhoneTouched] = useState(false);
  const markTouched = (field: RequiredField) => setTouched((t) => ({ ...t, [field]: true }));

  const gscSiteUrlError = fieldError("gscSiteUrl", gscSiteUrl);
  const recipientEmailError = fieldError("recipientEmail", recipientEmail);
  const showGscSiteUrlError = (touched.gscSiteUrl || submitAttempted) && gscSiteUrlError;
  const showRecipientEmailError =
    (touched.recipientEmail || submitAttempted) && recipientEmailError;
  const phoneWarning = phoneTouched ? phoneHint(recipientPhone) : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitAttempted(true);
    setTouched({ gscSiteUrl: true, recipientEmail: true });

    if (gscSiteUrlError || recipientEmailError) {
      const firstInvalidId = gscSiteUrlError ? "gscSiteUrl" : "recipientEmail";
      document.getElementById(firstInvalidId)?.focus();
      return;
    }

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
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      <p className="text-xs text-muted-foreground -mt-1">
        <span className="text-danger" aria-hidden="true">
          *
        </span>{" "}
        Required field
      </p>

      <div>
        <label htmlFor="gscSiteUrl" className="block text-sm font-medium text-foreground mb-1">
          Website URL <RequiredMark />
        </label>
        <p className="text-xs text-muted-foreground mb-2">
          Powers Search Console data in every report — keyword rankings, search clicks, and
          impressions. This is the only source every report needs.
        </p>
        <div className="relative">
          <input
            id="gscSiteUrl"
            type="text"
            value={gscSiteUrl}
            onChange={(e) => setGscSiteUrl(e.target.value)}
            onBlur={() => markTouched("gscSiteUrl")}
            required
            aria-required="true"
            aria-invalid={!!showGscSiteUrlError}
            aria-describedby={showGscSiteUrlError ? "gscSiteUrl-error" : undefined}
            className={inputClasses(!!showGscSiteUrlError, "pr-9")}
            placeholder="e.g., https://example.com"
          />
          {!showGscSiteUrlError && touched.gscSiteUrl && gscSiteUrl.trim() && (
            <CheckCircle2
              className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-success pointer-events-none"
              aria-hidden="true"
            />
          )}
        </div>
        <FieldError id="gscSiteUrl-error" message={showGscSiteUrlError ? gscSiteUrlError : null} />
      </div>

      <div>
        <label htmlFor="recipientEmail" className="block text-sm font-medium text-foreground mb-1">
          Recipient Email <RequiredMark />
        </label>
        <p className="text-xs text-muted-foreground mb-2">Where to send your analytics reports</p>
        <div className="relative">
          <input
            id="recipientEmail"
            type="email"
            value={recipientEmail}
            onChange={(e) => setRecipientEmail(e.target.value)}
            onBlur={() => markTouched("recipientEmail")}
            required
            aria-required="true"
            aria-invalid={!!showRecipientEmailError}
            aria-describedby={showRecipientEmailError ? "recipientEmail-error" : undefined}
            className={inputClasses(!!showRecipientEmailError, "pr-9")}
            placeholder="e.g., reports@example.com"
          />
          {!showRecipientEmailError && touched.recipientEmail && recipientEmail.trim() && (
            <CheckCircle2
              className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-success pointer-events-none"
              aria-hidden="true"
            />
          )}
        </div>
        <FieldError
          id="recipientEmail-error"
          message={showRecipientEmailError ? recipientEmailError : null}
        />
      </div>

      <div className="pt-4 border-t border-border">
        <h3 className="text-sm font-semibold text-foreground mb-1">
          Extra Data Sources (Optional)
        </h3>
        <p className="text-xs text-muted-foreground mb-4">
          Connect these to add more to every report. Neither is required — the Website URL above
          already covers search performance. We’ll suggest a match once you’ve entered a matching
          account, and pick it automatically when there’s only one obvious choice.
        </p>

        <div className="mb-4">
          <span className="block text-sm font-medium text-foreground mb-1">GA4 Property</span>
          <p className="text-xs text-muted-foreground mb-3">
            Adds website traffic to the report: sessions, top pages, traffic sources, and device
            breakdown. Pick the Google Analytics 4 property tied to this website.
          </p>
          <GA4PropertySelector
            value={ga4PropertyId}
            onChange={setGa4PropertyId}
            websiteUrl={gscSiteUrl}
          />
        </div>

        <div>
          <label htmlFor="gbpLocationId" className="block text-sm font-medium text-foreground mb-1">
            Google Business Profile Location
          </label>
          <p className="text-xs text-muted-foreground mb-3">
            Adds local performance to the report: customer reviews, star rating, calls, and
            direction requests. Pick the location for this business. If none appear, enter the
            location resource name manually below.
          </p>
          <GBPLocationSelector
            value={gbpLocationId}
            onChange={setGbpLocationId}
            websiteUrl={gscSiteUrl}
          />
          <input
            id="gbpLocationId"
            type="text"
            value={gbpLocationId}
            onChange={(e) => setGbpLocationId(e.target.value)}
            className={inputClasses(false, "mt-3")}
            placeholder="e.g., accounts/123456789/locations/987654321"
          />
        </div>
      </div>

      <div className="pt-4 border-t border-border">
        <h3 className="text-sm font-semibold text-foreground mb-4">
          Additional Delivery (Optional)
        </h3>

        <div>
          <label
            htmlFor="recipientPhone"
            className="block text-sm font-medium text-foreground mb-1"
          >
            Recipient Phone
          </label>
          <p
            className={cn("text-xs mb-2", phoneWarning ? "text-warning" : "text-muted-foreground")}
          >
            {phoneWarning ??
              "Receive reports via SMS or WhatsApp (E.164 format, e.g., +61412345678)"}
          </p>
          <input
            id="recipientPhone"
            type="tel"
            value={recipientPhone}
            onChange={(e) => setRecipientPhone(e.target.value)}
            onBlur={() => setPhoneTouched(true)}
            className={inputClasses(false)}
            placeholder="e.g., +1234567890"
          />
        </div>
      </div>

      {submitAttempted && (gscSiteUrlError || recipientEmailError) && (
        <p role="alert" className="text-sm text-danger flex items-center gap-1.5">
          <AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
          Please fix the highlighted field{gscSiteUrlError && recipientEmailError ? "s" : ""} above.
        </p>
      )}

      {error && (
        <div className="p-3 bg-danger/10 border border-danger/30 rounded text-sm text-danger">
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
