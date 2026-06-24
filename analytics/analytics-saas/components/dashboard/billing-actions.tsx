"use client";

import { useState } from "react";
import { Button, type ButtonProps } from "@/components/ui/button";

type BillingMode = "active" | "checkout" | "upgrade";

interface BillingActionsProps {
  mode: BillingMode;
  plan?: "starter" | "pro";
  label?: string;
  variant?: ButtonProps["variant"];
}

export function BillingActions({ mode, plan, label, variant }: BillingActionsProps) {
  const [loading, setLoading] = useState(false);

  const post = async (path: string, body?: unknown) => {
    setLoading(true);
    try {
      const response = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        alert(`Error: ${error.error ?? "Something went wrong"}`);
        return;
      }
      const data = await response.json().catch(() => ({}));
      // A plan change applied server-side returns { updated: true } with no URL;
      // just refresh so the billing card shows the new tier. New checkouts and
      // the portal return a Stripe { url } to redirect to.
      if (data.url) {
        window.location.href = data.url;
      } else {
        window.location.reload();
      }
    } catch (error) {
      alert(`Failed: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  if (mode === "active") {
    return (
      <Button onClick={() => post("/api/billing/portal")} disabled={loading} variant={variant}>
        {loading ? "Loading..." : label ?? "Manage billing"}
      </Button>
    );
  }

  // checkout + upgrade both start a Stripe Checkout session for the chosen plan.
  return (
    <Button
      onClick={() => post("/api/billing/checkout", { plan })}
      disabled={loading}
      variant={variant}
    >
      {loading ? "Loading..." : label ?? "Start plan"}
    </Button>
  );
}
